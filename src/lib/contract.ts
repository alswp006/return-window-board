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
