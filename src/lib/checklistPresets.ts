import type { ChecklistItem, DeadlineRule } from './types';

const BASE_LABELS = [
  '주문번호·결제 내역 캡처해 두기',
  '받은 상태 사진 찍기 (상자·상품·구성품)',
  '구성품·사은품·포장재 모두 챙기기',
  '택·라벨 떼지 않기',
  '구매처 반품 메뉴에서 신청 접수하기',
];

const MISMATCH_EXTRA = '하자 부위 사진·영상 남기기';

let seq = 0;

/** 로컬 고유 id — crypto.randomUUID가 없는 구버전 WebView(Android 7)도 지원 */
export function newId(prefix = 'id'): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${seq}`;
}

export function seedChecklist(rule: DeadlineRule): ChecklistItem[] {
  const labels = rule === 'mismatch_3m' ? [...BASE_LABELS, MISMATCH_EXTRA] : BASE_LABELS;
  return labels.map((label) => ({ id: newId('chk'), label, done: false }));
}
