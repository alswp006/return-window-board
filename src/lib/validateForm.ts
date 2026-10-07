import type { ItemFormInput } from './types';

export type FormField = 'productName' | 'store' | 'receivedDate' | 'rule' | 'storePolicyDays' | 'useStartDate';

export const FORM_FIELD_ORDER: FormField[] = [
  'productName',
  'store',
  'receivedDate',
  'rule',
  'storePolicyDays',
  'useStartDate',
];

export interface FormValidation {
  valid: boolean;
  /** 첫 문제 항목의 문구 하나. 모두 유효하면 없다. */
  firstHint?: string;
  fieldErrors: Partial<Record<FormField, string>>;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function validateForm(input: ItemFormInput, today: string): FormValidation {
  const errors: Partial<Record<FormField, string>> = {};
  const name = input.productName.trim();
  if (name === '') errors.productName = '상품명을 입력해 주세요';
  else if (name.length > 40) errors.productName = '40자 이내로 입력해 주세요';

  if (input.store.trim() === '') errors.store = '구매처를 입력해 주세요';

  if (!YMD.test(input.receivedDate)) errors.receivedDate = '수령일을 선택해 주세요';
  else if (input.receivedDate > today) errors.receivedDate = '수령일은 오늘 이후일 수 없어요';

  if (input.rule === null) errors.rule = '기한 유형을 선택해 주세요';

  if (input.rule === 'store_policy_days') {
    const raw = input.storePolicyDays.trim();
    const n = Number(raw);
    if (raw === '') errors.storePolicyDays = '구매처 반품 기한을 입력해 주세요';
    else if (!/^\d+$/.test(raw) || !Number.isInteger(n) || n < 1 || n > 365) {
      errors.storePolicyDays = '1~365일 사이 숫자로 입력해 주세요';
    }
  }

  const useStart = input.useStartDate.trim();
  if (useStart !== '' && YMD.test(input.receivedDate) && useStart < input.receivedDate) {
    errors.useStartDate = '사용 시작일은 수령일 이후여야 해요';
  }

  const first = FORM_FIELD_ORDER.find((f) => errors[f]);
  return { valid: !first, firstHint: first ? errors[first] : undefined, fieldErrors: errors };
}
