# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** (구현: 패킷 0001) */
export type DeadlineRule = { type: 'purchased' | 'received'; days: number } | { type: 'monthclamped'; months: number };

/** (구현: 패킷 0001) */
export type ItemStatus = 'active' | 'archived';

/** (구현: 패킷 0001) */
export type ChecklistItem = { id: string; text: string; completed: boolean };

/** (구현: 패킷 0001) */
export type ReturnItem = { id: string; productName: string; store: string; createdAt: string; receivedDate: string; rule: DeadlineRule; checklist: ChecklistItem[]; status: ItemStatus };

/** (구현: 패킷 0001) */
export type ItemFormInput = { productName: string; store: string; receivedDate: string; rule: DeadlineRule };

/** (구현: 패킷 0001) */
export type DeadlineInfo = { deadline: string; dday: number; ruleSource: string };

/** (구현: 패킷 0001) */
export type BoardSection = 'active' | 'archived';

/** (구현: 패킷 0001) */
export type ArchiveReason = 'expired' | 'returned' | 'cancelled';

/** (구현: 패킷 0001) */
export type ResultParams = { id: string };

/** (구현: 패킷 0001) */
export type STORAGE_KEYFn = () => 'rwb:items:v1';

/** (구현: 패킷 0002) */
export type addDaysFn = (date: string, days: number) => string;

/** (구현: 패킷 0002) */
export type addMonthsClampedFn = (date: string, months: number) => string;

/** (구현: 패킷 0002) */
export type computeDeadlineFn = (received: string, rule: DeadlineRule, today: string) => string;

/** (구현: 패킷 0002) */
export type ddayLabelFn = (deadline: string, today: string) => string;

/** (구현: 패킷 0002) */
export type sortActiveFn = (items: ReturnItem[], today: string) => ReturnItem[];

/** (구현: 패킷 0002) */
export type sortArchiveFn = (items: ReturnItem[]) => ReturnItem[];

/** (구현: 패킷 0002) */
export type archiveReasonFn = (item: ReturnItem, today: string) => ArchiveReason;

/** (구현: 패킷 0002) */
export type summarizeActiveFn = (items: ReturnItem[], today: string) => string;

/** (구현: 패킷 0002) */
export type formatKoreanDateFn = (date: string) => string;

/** (구현: 패킷 0002) */
export type todayYmdFn = () => string;

/** 메모리 캐시 사용, JSON 오류 시 StoreReadError 던짐 (구현: 패킷 0003) */
export type loadItemsFn = () => ReturnItem[];

/** 새 배열 생성 후 setItem 1회 호출, 실패 시 StoreWriteError (구현: 패킷 0003) */
export type addItemFn = (input: ItemFormInput) => void;

/** 최근 구매처 목록 (구현: 패킷 0003) */
export type recentStoresFn = () => string[];

/** (구현: 패킷 0004) */
export type validateFormFn = (input: ItemFormInput, today: string) => { valid: boolean; firstHint: string; fieldErrors: { [key: string]: string } };

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
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
  NOT_
// ...truncated
```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    analytics.ts
    contract.ts
    review.ts
    share.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    Result.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- analytics.ts: export type LogFields = Record<string, string | number | boolean | null>; export const DWELL_MS = 3000; export function fireAndForget(call: () => unknown): void; export function logScreen(page: string, extra?: LogFields): void; export function logClick(name: string, extra?: LogFields): void; export function logImpression(name: string, extra?: LogFields): void; export function useScreenLog(page: string): void
- contract.ts: export type DeadlineRule =; export type ItemStatus = 'active' | 'archived'; export type ChecklistItem =; export type ReturnItem =; export type ItemFormInput =; export type DeadlineInfo =; export type BoardSection = 'active' | 'archived'; export type ArchiveReason = 'expired' | 'returned' | 'cancelled'
- review.ts: export function requestReviewOnce(key: string = REVIEW_REQUESTED_KEY): void
- share.ts: export interface ShareAppOptions; export async function shareApp(opts: ShareAppOptions): Promise<void>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export type DeadlineRule = 'change_of_mind_7d' | 'mismatch_3m' | 'store_policy_days'; export type ItemStatus = 'active' | 'returned' | 'kept'; export interface ChecklistItem; export interface ReturnItem; export interface ItemFormInput; export interface DeadlineInfo; export type BoardSection = 'active' | 'archive'; export type ArchiveReason = 'returned' | 'kept' | 'expired'
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: Types & Constants (files: src/lib/types.ts)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/lib/analytics.ts
export type LogFields = Record<string, string | number | boolean | null>;
export const DWELL_MS = 3000;
export function fireAndForget(call: () => unknown): void {
export function logScreen(page: string, extra?: LogFields): void {
export function logClick(name: string, extra?: LogFields): void {
export function logImpression(name: string, extra?: LogFields): void {
export function useScreenLog(page: string): void {

// src/lib/contract.ts
export type DeadlineRule = { type: 'purchased' | 'received'; days: number } | { type: 'monthclamped'; months: number };
export type ItemStatus = 'active' | 'archived';
export type ChecklistItem = { id: string; text: string; completed: boolean };
export type ReturnItem = { id: string; productName: string; store: string; createdAt: string; receivedDate: string; rule: DeadlineRule; checklist: ChecklistItem[]; s

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(4), general(14), testing(2), ui(3)

Key lessons (verify against actual code before applying):
- [general] 진입점 라우터 배선은 맨 끝에 두지 말고 기반 패킷 직후 플레이스홀더 페이지와 함께 먼저 병합하라. 화면 패킷은 그 플레이스홀더를 교체하게 해서, 언제 중단돼도 병합된 화면에 도달할 수 있게 하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 파일 생성 전 디렉토리 구조 확인 — mkdir -p로 경로 보장 (60% · 타 앱 1회 — 맹신 금지)
- [general] 화면·라우팅 등 소비자 모듈은 그것이 import하는 생산자 모듈이 병합된 뒤에만 병합하고, 순서를 지킬 수 없으면 소비자 병합과 동시에 최소 플레이스홀더를 만들어 매 병합 직후 타입체크와 빌드가 항상 통과하도록 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 전역 라우팅·탭바·Provider 배선은 개별 화면보다 먼저(초반 20% 안에) 완료하고 미구현 화면은 스텁 라우트로 연결해, 시간 예산이 소진돼도 앱이 항상 실행 가능한 상태를 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)