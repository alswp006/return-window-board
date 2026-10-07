// 법정 기준 + 사용자 지정 일수 — 법정 공개 기준(제17조 ①③)이라 닫힌 집합 예외. 사용자 분류 아님.
export type DeadlineRule = 'change_of_mind_7d' | 'mismatch_3m' | 'store_policy_days';

// 앱 로직이 쓰는 처리 상태 (사용자 분류 아님). 'expired'는 저장하지 않고 날짜로 파생.
export type ItemStatus = 'active' | 'returned' | 'kept';

export interface ChecklistItem {
  id: string;
  label: string; // 1~30자, 사용자 수정·추가·삭제 가능
  done: boolean;
}

export interface ReturnItem {
  id: string;
  productName: string; // 1~40자
  store: string; // 구매처 자유 입력 (닫힌 목록 아님)
  receivedDate: string; // 'YYYY-MM-DD' (로컬 날짜)
  useStartDate?: string; // 'YYYY-MM-DD', >= receivedDate
  rule: DeadlineRule;
  storePolicyDays?: number; // rule === 'store_policy_days'일 때 1~365 정수
  checklist: ChecklistItem[];
  status: ItemStatus;
  closedAt?: string; // status 변경 시각 ISO
  createdAt: string; // ISO
}

export interface ItemFormInput {
  productName: string;
  store: string;
  receivedDate: string;
  useStartDate: string; // '' = 미입력
  rule: DeadlineRule | null;
  storePolicyDays: string; // TextField 원문
}

export interface DeadlineInfo {
  deadline: string; // 'YYYY-MM-DD'
  dDay: number; // deadline - today (일), 음수 = 지남
  isToday: boolean;
  isExpired: boolean;
  useStartBasedDeadline?: string; // 사용 시작일로 셌을 때 (안내용)
  daysEarlier?: number; // useStartBased - deadline
}

export type BoardSection = 'active' | 'archive';
export type ArchiveReason = 'returned' | 'kept' | 'expired';

// Route params (react-router) — 새로고침에도 유지되도록 state 대신 URL id + 저장소 조회
export interface ResultParams {
  id: string;
}

// localStorage key — 값은 JSON.stringify(ReturnItem[])
export const STORAGE_KEY = 'rwb:items:v1';

export const RULE_OPTIONS: { value: DeadlineRule; label: string }[] = [
  { value: 'change_of_mind_7d', label: '단순 변심 7일' },
  { value: 'mismatch_3m', label: '하자·광고와 다름 3개월' },
  { value: 'store_policy_days', label: '구매처 정책' },
];

export function ruleSourceLine(rule: DeadlineRule, days?: number): string {
  switch (rule) {
    case 'change_of_mind_7d':
      return '수령일부터 7일 · 전자상거래법 제17조 ①';
    case 'mismatch_3m':
      return '공급받은 날부터 3개월 · 전자상거래법 제17조 ③';
    case 'store_policy_days':
      return `구매처 정책 ${days ?? ''}일 · 구매처 안내 기준`;
  }
}

export const RULE_NOTICE: Record<DeadlineRule, string | null> = {
  change_of_mind_7d:
    '써 보거나 일부를 소비해 가치가 크게 줄면 철회가 제한될 수 있어요. 내용 확인을 위한 포장 개봉은 예외예요 (제17조 ②)',
  mismatch_3m: '하자를 안 날(알 수 있었던 날)부터 30일 이내라는 조건도 함께 있어요 (제17조 ③)',
  store_policy_days: null,
};

export const COST_LINE: Record<DeadlineRule, string> = {
  change_of_mind_7d: '반품 배송비는 보통 내가 부담해요 (전자상거래법 제18조)',
  mismatch_3m: '반품 비용은 판매자가 부담해요 (전자상거래법 제18조)',
  store_policy_days: '배송비 부담은 구매처 안내를 확인하세요',
};

export const ARCHIVE_LABEL: Record<ArchiveReason, string> = {
  returned: '반품 신청함',
  kept: '계속 쓰기로 함',
  expired: '기한 지남',
};

export const MESSAGES = {
  WRITE_FAIL_HINT: '저장하지 못했어요. 보관함의 지난 건을 삭제한 뒤 다시 시도해 주세요',
  SAVE_FAIL_TOAST: '저장하지 못했어요. 다시 시도해 주세요',
  DELETE_FAIL_TOAST: '삭제하지 못했어요. 다시 시도해 주세요',
  LOAD_ERROR: '저장된 목록을 불러오지 못했어요',
  NOT_FOUND: '찾을 수 없는 건이에요',
} as const;
