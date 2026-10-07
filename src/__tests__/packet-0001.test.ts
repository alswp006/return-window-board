import { describe, it, expect } from "vitest";
import type {
  DeadlineRule,
  ItemStatus,
  ChecklistItem,
  ReturnItem,
  ItemFormInput,
  DeadlineInfo,
  BoardSection,
  ArchiveReason,
  ResultParams,
} from "@/lib/types";
import {
  STORAGE_KEY,
  RULE_OPTIONS,
  ruleSourceLine,
  RULE_NOTICE,
  COST_LINE,
  ARCHIVE_LABEL,
  MESSAGES,
} from "@/lib/types";

describe("Types & Constants (Packet 0001)", () => {
  // AC-1: All 9 types are exported and have correct field names/structure
  it("AC-1a: should export DeadlineRule type as union of 3 values", () => {
    const rule1: DeadlineRule = "change_of_mind_7d";
    const rule2: DeadlineRule = "mismatch_3m";
    const rule3: DeadlineRule = "store_policy_days";
    expect(rule1).toBe("change_of_mind_7d");
    expect(rule2).toBe("mismatch_3m");
    expect(rule3).toBe("store_policy_days");
  });

  it("AC-1b: should export ItemStatus type as union of 3 values", () => {
    const status1: ItemStatus = "active";
    const status2: ItemStatus = "returned";
    const status3: ItemStatus = "kept";
    expect(status1).toBe("active");
    expect(status2).toBe("returned");
    expect(status3).toBe("kept");
  });

  it("AC-1c: should export ChecklistItem interface with done and text fields", () => {
    const item: ChecklistItem = {
      id: "c-1",
      label: "Check for defects",
      done: false,
    };
    expect(item.done).toBe(false);
    expect(item.label).toBe("Check for defects");
  });

  it("AC-1d: should export ReturnItem interface with all required fields", () => {
    const returnItem: ReturnItem = {
      id: "item-001",
      productName: "Test Product",
      store: "Test Store",
      receivedDate: "2026-09-01",
      useStartDate: "2026-09-05",
      rule: "change_of_mind_7d",
      storePolicyDays: undefined,
      checklist: [{ id: "c-1", label: "Test", done: false }],
      status: "active",
      closedAt: undefined,
      createdAt: "2026-09-01T10:00:00Z",
    };
    expect(returnItem.id).toBe("item-001");
    expect(returnItem.productName).toBe("Test Product");
    expect(returnItem.receivedDate).toBe("2026-09-01");
    expect(returnItem.rule).toBe("change_of_mind_7d");
    expect(returnItem.status).toBe("active");
  });

  it("AC-1e: should export ItemFormInput interface with form fields", () => {
    const formInput: ItemFormInput = {
      productName: "New Product",
      store: "New Store",
      receivedDate: "2026-09-01",
      useStartDate: "2026-09-05",
      rule: "mismatch_3m",
      storePolicyDays: "30",
    };
    expect(formInput.productName).toBe("New Product");
    expect(formInput.store).toBe("New Store");
    expect(formInput.rule).toBe("mismatch_3m");
  });

  it("AC-1f: should export DeadlineInfo interface with calculated deadline fields", () => {
    const deadlineInfo: DeadlineInfo = {
      deadline: "2026-09-08",
      dDay: 3,
      isToday: false,
      isExpired: false,
    };
    expect(deadlineInfo.deadline).toBe("2026-09-08");
    expect(deadlineInfo.dDay).toBe(3);
    expect(deadlineInfo.isExpired).toBe(false);
  });

  it("AC-1g: should export BoardSection type as union of 2 values", () => {
    const section1: BoardSection = "active";
    const section2: BoardSection = "archive";
    expect(section1).toBe("active");
    expect(section2).toBe("archive");
  });

  it("AC-1h: should export ArchiveReason type as union of 3 values", () => {
    const reason1: ArchiveReason = "returned";
    const reason2: ArchiveReason = "kept";
    const reason3: ArchiveReason = "expired";
    expect(reason1).toBe("returned");
    expect(reason2).toBe("kept");
    expect(reason3).toBe("expired");
  });

  it("AC-1i: should export ResultParams interface with result configuration", () => {
    const resultParams: ResultParams = {
      id: "item-001",
    };
    expect(resultParams.id).toBe("item-001");
  });

  // AC-2: STORAGE_KEY constant is correct
  it("AC-2: STORAGE_KEY should equal 'rwb:items:v1'", () => {
    expect(STORAGE_KEY).toBe("rwb:items:v1");
    expect(typeof STORAGE_KEY).toBe("string");
  });

  // AC-3: RULE_OPTIONS array has exactly 3 items in specified order
  it("AC-3a: RULE_OPTIONS should have length 3", () => {
    expect(RULE_OPTIONS).toHaveLength(3);
  });

  it("AC-3b: RULE_OPTIONS[0] should be change_of_mind_7d with label '단순 변심 7일'", () => {
    expect(RULE_OPTIONS[0]).toEqual({
      value: "change_of_mind_7d",
      label: "단순 변심 7일",
    });
  });

  it("AC-3c: RULE_OPTIONS[1] should be mismatch_3m with label '하자·광고와 다름 3개월'", () => {
    expect(RULE_OPTIONS[1]).toEqual({
      value: "mismatch_3m",
      label: "하자·광고와 다름 3개월",
    });
  });

  it("AC-3d: RULE_OPTIONS[2] should be store_policy_days with label '구매처 정책'", () => {
    expect(RULE_OPTIONS[2]).toEqual({
      value: "store_policy_days",
      label: "구매처 정책",
    });
  });

  // AC-4: ruleSourceLine() returns correct strings for each rule
  it("AC-4a: ruleSourceLine('change_of_mind_7d') should return law citation for 7-day rule", () => {
    const result = ruleSourceLine("change_of_mind_7d");
    expect(result).toBe("수령일부터 7일 · 전자상거래법 제17조 ①");
  });

  it("AC-4b: ruleSourceLine('mismatch_3m') should return law citation for 3-month rule", () => {
    const result = ruleSourceLine("mismatch_3m");
    expect(result).toBe("공급받은 날부터 3개월 · 전자상거래법 제17조 ③");
  });

  it("AC-4c: ruleSourceLine('store_policy_days', 30) should return policy citation with days", () => {
    const result = ruleSourceLine("store_policy_days", 30);
    expect(result).toBe("구매처 정책 30일 · 구매처 안내 기준");
  });

  it("AC-4d: ruleSourceLine('store_policy_days', 60) should use provided days value", () => {
    const result = ruleSourceLine("store_policy_days", 60);
    expect(result).toBe("구매처 정책 60일 · 구매처 안내 기준");
  });

  // AC-5: RULE_NOTICE has correct values for each rule
  it("AC-5a: RULE_NOTICE['change_of_mind_7d'] should have 7-day rule notice", () => {
    const notice = RULE_NOTICE["change_of_mind_7d"];
    expect(notice).toBe(
      "써 보거나 일부를 소비해 가치가 크게 줄면 철회가 제한될 수 있어요. 내용 확인을 위한 포장 개봉은 예외예요 (제17조 ②)"
    );
  });

  it("AC-5b: RULE_NOTICE['mismatch_3m'] should have 3-month rule notice", () => {
    const notice = RULE_NOTICE["mismatch_3m"];
    expect(notice).toBe(
      "하자를 안 날(알 수 있었던 날)부터 30일 이내라는 조건도 함께 있어요 (제17조 ③)"
    );
  });

  it("AC-5c: RULE_NOTICE['store_policy_days'] should be null", () => {
    const notice = RULE_NOTICE["store_policy_days"];
    expect(notice).toBeNull();
  });

  // AC-6: COST_LINE has correct values for each rule
  it("AC-6a: COST_LINE['change_of_mind_7d'] should indicate buyer pays shipping", () => {
    const costLine = COST_LINE["change_of_mind_7d"];
    expect(costLine).toBe(
      "반품 배송비는 보통 내가 부담해요 (전자상거래법 제18조)"
    );
  });

  it("AC-6b: COST_LINE['mismatch_3m'] should indicate seller pays cost", () => {
    const costLine = COST_LINE["mismatch_3m"];
    expect(costLine).toBe(
      "반품 비용은 판매자가 부담해요 (전자상거래법 제18조)"
    );
  });

  it("AC-6c: COST_LINE['store_policy_days'] should indicate to check store policy", () => {
    const costLine = COST_LINE["store_policy_days"];
    expect(costLine).toBe(
      "배송비 부담은 구매처 안내를 확인하세요"
    );
  });

  // AC-7: ARCHIVE_LABEL has correct labels
  it("AC-7a: ARCHIVE_LABEL['returned'] should be '반품 신청함'", () => {
    expect(ARCHIVE_LABEL["returned"]).toBe("반품 신청함");
  });

  it("AC-7b: ARCHIVE_LABEL['kept'] should be '계속 쓰기로 함'", () => {
    expect(ARCHIVE_LABEL["kept"]).toBe("계속 쓰기로 함");
  });

  it("AC-7c: ARCHIVE_LABEL['expired'] should be '기한 지남'", () => {
    expect(ARCHIVE_LABEL["expired"]).toBe("기한 지남");
  });

  // AC-8: MESSAGES has all required strings
  it("AC-8a: MESSAGES.WRITE_FAIL_HINT should have storage cleanup message", () => {
    expect(MESSAGES.WRITE_FAIL_HINT).toBe(
      "저장하지 못했어요. 보관함의 지난 건을 삭제한 뒤 다시 시도해 주세요"
    );
  });

  it("AC-8b: MESSAGES.SAVE_FAIL_TOAST should have save retry message", () => {
    expect(MESSAGES.SAVE_FAIL_TOAST).toBe(
      "저장하지 못했어요. 다시 시도해 주세요"
    );
  });

  it("AC-8c: MESSAGES.DELETE_FAIL_TOAST should have delete retry message", () => {
    expect(MESSAGES.DELETE_FAIL_TOAST).toBe(
      "삭제하지 못했어요. 다시 시도해 주세요"
    );
  });

  it("AC-8d: MESSAGES.LOAD_ERROR should have load error message", () => {
    expect(MESSAGES.LOAD_ERROR).toBe(
      "저장된 목록을 불러오지 못했어요"
    );
  });

  it("AC-8e: MESSAGES.NOT_FOUND should have not found message", () => {
    expect(MESSAGES.NOT_FOUND).toBe("찾을 수 없는 건이에요");
  });

  // AC-8 integrated: All MESSAGES keys are present
  it("AC-8f: MESSAGES should contain all 5 required message keys", () => {
    expect(MESSAGES).toHaveProperty("WRITE_FAIL_HINT");
    expect(MESSAGES).toHaveProperty("SAVE_FAIL_TOAST");
    expect(MESSAGES).toHaveProperty("DELETE_FAIL_TOAST");
    expect(MESSAGES).toHaveProperty("LOAD_ERROR");
    expect(MESSAGES).toHaveProperty("NOT_FOUND");
  });
});
