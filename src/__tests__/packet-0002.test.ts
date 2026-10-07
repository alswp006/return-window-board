import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  ReturnItem,
  DeadlineInfo,
  ArchiveReason,
  DeadlineRule,
} from '@/lib/types';
import {
  addDays,
  addMonthsClamped,
  diffDays,
  computeDeadline,
  ddayLabel,
  sortActive,
  sortArchive,
  archiveReason,
  summarizeActive,
  formatKoreanDate,
  formatNumber,
} from '@/lib/deadline';

describe('Core Logic — 마감일 계산·정렬·날짜 포맷', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T09:00:00+09:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // AC-1: computeDeadline 계산
  describe('AC-1: computeDeadline should calculate correct deadline', () => {
    it('should add 7 days for change_of_mind_7d rule', () => {
      const result = computeDeadline(
        {
          receivedDate: '2026-10-01',
          rule: 'change_of_mind_7d',
        } as Pick<
          ReturnItem,
          'receivedDate' | 'useStartDate' | 'rule' | 'storePolicyDays'
        >,
        '2026-10-08'
      );

      expect(result.deadline).toBe('2026-10-08');
      expect(result.dDay).toBe(0);
    });

    it('should add 3 months for mismatch_3m rule', () => {
      const result = computeDeadline(
        {
          receivedDate: '2026-10-01',
          rule: 'mismatch_3m',
        } as Pick<
          ReturnItem,
          'receivedDate' | 'useStartDate' | 'rule' | 'storePolicyDays'
        >,
        '2026-10-01'
      );

      expect(result.deadline).toBe('2027-01-01');
      expect(result.dDay).toBe(84);
    });

    it('should clamp to last day of month for 3-month deadline', () => {
      const result = computeDeadline(
        {
          receivedDate: '2026-11-30',
          rule: 'mismatch_3m',
        } as Pick<
          ReturnItem,
          'receivedDate' | 'useStartDate' | 'rule' | 'storePolicyDays'
        >,
        '2026-11-30'
      );

      expect(result.deadline).toBe('2027-02-28');
    });

    it('should handle leap year correctly (2027-11-30 + 3m)', () => {
      const result = computeDeadline(
        {
          receivedDate: '2027-11-30',
          rule: 'mismatch_3m',
        } as Pick<
          ReturnItem,
          'receivedDate' | 'useStartDate' | 'rule' | 'storePolicyDays'
        >,
        '2027-11-30'
      );

      expect(result.deadline).toBe('2028-02-29');
    });

    it('should add policy days for store_policy_days rule', () => {
      const result = computeDeadline(
        {
          receivedDate: '2026-10-01',
          rule: 'store_policy_days',
          storePolicyDays: 30,
        } as Pick<
          ReturnItem,
          'receivedDate' | 'useStartDate' | 'rule' | 'storePolicyDays'
        >,
        '2026-10-01'
      );

      expect(result.deadline).toBe('2026-10-31');
      expect(result.dDay).toBe(30);
    });
  });

  // AC-2: useStartDate 조합
  describe('AC-2: computeDeadline with useStartDate should calculate daysEarlier', () => {
    it('should calculate useStartBasedDeadline and daysEarlier correctly', () => {
      const result = computeDeadline(
        {
          receivedDate: '2026-10-01',
          useStartDate: '2026-10-04',
          rule: 'change_of_mind_7d',
        } as Pick<
          ReturnItem,
          'receivedDate' | 'useStartDate' | 'rule' | 'storePolicyDays'
        >,
        '2026-10-04'
      );

      expect(result.deadline).toBe('2026-10-08');
      expect(result.useStartBasedDeadline).toBe('2026-10-11');
      expect(result.daysEarlier).toBe(3);
    });

    it('should not set useStartBasedDeadline when useStartDate is missing', () => {
      const result = computeDeadline(
        {
          receivedDate: '2026-10-01',
          rule: 'change_of_mind_7d',
        } as Pick<
          ReturnItem,
          'receivedDate' | 'useStartDate' | 'rule' | 'storePolicyDays'
        >,
        '2026-10-08'
      );

      expect(result.useStartBasedDeadline).toBeUndefined();
      expect(result.daysEarlier).toBeUndefined();
    });

    it('should not set useStartBasedDeadline when useStartDate equals receivedDate', () => {
      const result = computeDeadline(
        {
          receivedDate: '2026-10-01',
          useStartDate: '2026-10-01',
          rule: 'change_of_mind_7d',
        } as Pick<
          ReturnItem,
          'receivedDate' | 'useStartDate' | 'rule' | 'storePolicyDays'
        >,
        '2026-10-01'
      );

      expect(result.useStartBasedDeadline).toBeUndefined();
      expect(result.daysEarlier).toBeUndefined();
    });
  });

  // AC-3: dDay, isToday, isExpired
  describe('AC-3: computeDeadline should calculate dDay and expiration status', () => {
    it('should set isToday=true and isExpired=false when deadline is today', () => {
      const result = computeDeadline(
        {
          receivedDate: '2026-10-01',
          rule: 'change_of_mind_7d',
        } as Pick<
          ReturnItem,
          'receivedDate' | 'useStartDate' | 'rule' | 'storePolicyDays'
        >,
        '2026-10-08'
      );

      expect(result.dDay).toBe(0);
      expect(result.isToday).toBe(true);
      expect(result.isExpired).toBe(false);
    });

    it('should set isExpired=true when deadline has passed', () => {
      const result = computeDeadline(
        {
          receivedDate: '2026-10-01',
          rule: 'change_of_mind_7d',
        } as Pick<
          ReturnItem,
          'receivedDate' | 'useStartDate' | 'rule' | 'storePolicyDays'
        >,
        '2026-10-09'
      );

      expect(result.dDay).toBe(-1);
      expect(result.isExpired).toBe(true);
    });
  });

  // AC-4: formatKoreanDate
  describe('AC-4: formatKoreanDate should format date with weekday', () => {
    it('should format 2026-10-15 as "10월 15일 (목)"', () => {
      const result = formatKoreanDate('2026-10-15', '2026-10-08');
      expect(result).toBe('10월 15일 (목)');
    });

    it('should format 2026-10-11 as "10월 11일 (일)"', () => {
      const result = formatKoreanDate('2026-10-11', '2026-10-08');
      expect(result).toBe('10월 11일 (일)');
    });

    it('should include year for dates in different year: "2027년 1월 1일 (금)"', () => {
      const result = formatKoreanDate('2027-01-01', '2026-10-08');
      expect(result).toBe('2027년 1월 1일 (금)');
    });
  });

  // AC-5: ddayLabel
  describe('AC-5: ddayLabel should format D-day text', () => {
    it('should return "D-DAY" for 0', () => {
      const result = ddayLabel(0);
      expect(result).toBe('D-DAY');
    });

    it('should return "D-5" for 5 days remaining', () => {
      const result = ddayLabel(5);
      expect(result).toMatch(/^D-5$/);
    });

    it('should return "D+2" for 2 days past deadline', () => {
      const result = ddayLabel(-2);
      expect(result).toMatch(/^D\+2$/);
    });
  });

  // AC-6: sortActive
  describe('AC-6: sortActive should return active non-expired items sorted by dDay', () => {
    it('should sort by dDay ascending, then by createdAt ascending', () => {
      const items: ReturnItem[] = [
        {
          id: '1',
          productName: 'Product A',
          store: 'Store A',
          receivedDate: '2026-10-03',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'active',
          createdAt: '2026-10-03T10:00:00Z',
        },
        {
          id: '2',
          productName: 'Product B',
          store: 'Store B',
          receivedDate: '2026-10-01',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'active',
          createdAt: '2026-10-01T10:00:00Z',
        },
        {
          id: '3',
          productName: 'Product C',
          store: 'Store C',
          receivedDate: '2026-10-06',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'active',
          createdAt: '2026-10-06T10:00:00Z',
        },
      ];

      const result = sortActive(items, '2026-10-08');

      // Expected dDays: Product B (dDay 0), Product C (dDay 2), Product A (dDay 5)
      expect(result.length).toBe(3);
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('1');
    });

    it('should exclude expired items', () => {
      const items: ReturnItem[] = [
        {
          id: '1',
          productName: 'Product A',
          store: 'Store A',
          receivedDate: '2026-10-01',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'active',
          createdAt: '2026-10-01T10:00:00Z',
        },
        {
          id: '2',
          productName: 'Product B',
          store: 'Store B',
          receivedDate: '2026-09-30',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'active',
          createdAt: '2026-09-30T10:00:00Z',
        },
      ];

      const result = sortActive(items, '2026-10-08');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
    });

    it('should exclude non-active items', () => {
      const items: ReturnItem[] = [
        {
          id: '1',
          productName: 'Product A',
          store: 'Store A',
          receivedDate: '2026-10-01',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'active',
          createdAt: '2026-10-01T10:00:00Z',
        },
        {
          id: '2',
          productName: 'Product B',
          store: 'Store B',
          receivedDate: '2026-10-05',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'returned',
          createdAt: '2026-10-05T10:00:00Z',
        },
      ];

      const result = sortActive(items, '2026-10-08');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
    });
  });

  // AC-7: sortArchive
  describe('AC-7: sortArchive should return archived/expired items sorted by deadline desc', () => {
    it('should include expired items and non-active items', () => {
      const items: ReturnItem[] = [
        {
          id: '1',
          productName: 'Product A',
          store: 'Store A',
          receivedDate: '2026-10-01',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'returned',
          createdAt: '2026-10-01T10:00:00Z',
        },
        {
          id: '2',
          productName: 'Product B',
          store: 'Store B',
          receivedDate: '2026-09-30',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'active',
          createdAt: '2026-09-30T10:00:00Z',
        },
      ];

      const result = sortArchive(items, '2026-10-08');

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });
  });

  // AC-8: archiveReason
  describe('AC-8: archiveReason should return correct reason or null', () => {
    it('should return "returned" for returned status', () => {
      const item: ReturnItem = {
        id: '1',
        productName: 'Product A',
        store: 'Store A',
        receivedDate: '2026-10-01',
        rule: 'change_of_mind_7d',
        checklist: [],
        status: 'returned',
        createdAt: '2026-10-01T10:00:00Z',
      };

      const result = archiveReason(item, '2026-10-08');
      expect(result).toBe('returned');
    });

    it('should return "kept" for kept status', () => {
      const item: ReturnItem = {
        id: '1',
        productName: 'Product A',
        store: 'Store A',
        receivedDate: '2026-10-01',
        rule: 'change_of_mind_7d',
        checklist: [],
        status: 'kept',
        createdAt: '2026-10-01T10:00:00Z',
      };

      const result = archiveReason(item, '2026-10-08');
      expect(result).toBe('kept');
    });

    it('should return "expired" for active expired item', () => {
      const item: ReturnItem = {
        id: '1',
        productName: 'Product A',
        store: 'Store A',
        receivedDate: '2026-09-30',
        rule: 'change_of_mind_7d',
        checklist: [],
        status: 'active',
        createdAt: '2026-09-30T10:00:00Z',
      };

      const result = archiveReason(item, '2026-10-08');
      expect(result).toBe('expired');
    });

    it('should return null for active non-expired item', () => {
      const item: ReturnItem = {
        id: '1',
        productName: 'Product A',
        store: 'Store A',
        receivedDate: '2026-10-01',
        rule: 'change_of_mind_7d',
        checklist: [],
        status: 'active',
        createdAt: '2026-10-01T10:00:00Z',
      };

      const result = archiveReason(item, '2026-10-08');
      expect(result).toBeNull();
    });
  });

  // AC-9: summarizeActive
  describe('AC-9: summarizeActive should return summary stats', () => {
    it('should count todayCount and within3Count correctly', () => {
      const items: ReturnItem[] = [
        {
          id: '1',
          productName: 'Product A',
          store: 'Store A',
          receivedDate: '2026-10-01',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'active',
          createdAt: '2026-10-01T10:00:00Z',
        },
        {
          id: '2',
          productName: 'Product B',
          store: 'Store B',
          receivedDate: '2026-10-03',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'active',
          createdAt: '2026-10-03T10:00:00Z',
        },
        {
          id: '3',
          productName: 'Product C',
          store: 'Store C',
          receivedDate: '2026-10-06',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'active',
          createdAt: '2026-10-06T10:00:00Z',
        },
      ];

      const result = summarizeActive(items, '2026-10-08');

      // Product A: dDay 0 (today) → todayCount++
      // Product B: dDay 2 (within 3 days)
      // Product C: dDay 5 (outside 3 days)
      expect(result.todayCount).toBe(1);
      expect(result.within3Count).toBe(1);
      expect(result.nearest).toBeDefined();
      expect(result.nearest?.item.id).toBe('1');
      expect(result.nearest?.dDay).toBe(0);
    });

    it('should return empty counts when no active items', () => {
      const items: ReturnItem[] = [
        {
          id: '1',
          productName: 'Product A',
          store: 'Store A',
          receivedDate: '2026-09-30',
          rule: 'change_of_mind_7d',
          checklist: [],
          status: 'active',
          createdAt: '2026-09-30T10:00:00Z',
        },
      ];

      const result = summarizeActive(items, '2026-10-08');

      expect(result.todayCount).toBe(0);
      expect(result.within3Count).toBe(0);
    });
  });

  // Utility functions
  describe('Helper functions', () => {
    it('should add days correctly', () => {
      expect(addDays('2026-10-01', 7)).toBe('2026-10-08');
      expect(addDays('2026-10-25', 10)).toBe('2026-11-04');
    });

    it('should add months with clamping', () => {
      expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
      expect(addMonthsClamped('2026-11-30', 3)).toBe('2027-02-28');
    });

    it('should calculate day difference correctly', () => {
      expect(diffDays('2026-10-01', '2026-10-08')).toBe(7);
      expect(diffDays('2026-10-08', '2026-10-08')).toBe(0);
      expect(diffDays('2026-10-15', '2026-10-08')).toBe(-7);
    });

    it('should format numbers in Korean locale', () => {
      const result = formatNumber(1000);
      expect(result).toBe('1,000');
    });
  });
});
