import { useEffect, useMemo, useState } from 'react';
import type { FocusEvent } from 'react';
import { BottomSheet, Chip, ChipItem, Paragraph, Spacing, TextField } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import type { DeadlineRule, ItemFormInput, ReturnItem } from '@/lib/types';
import { MESSAGES, RULE_OPTIONS } from '@/lib/types';
import { computeDeadline, ddayLabel, formatKoreanDate, todayYmd } from '@/lib/deadline';
import { addItem, loadItems, recentStores as deriveRecentStores, StoreWriteError, updateItem } from '@/lib/itemsStore';
import { validateForm } from '@/lib/validateForm';
import type { FormField } from '@/lib/validateForm';
import { logClick } from '@/lib/analytics';

function emptyInput(today: string): ItemFormInput {
  return {
    productName: '',
    store: '',
    receivedDate: today,
    useStartDate: '',
    rule: null,
    storePolicyDays: '',
  };
}

function inputFromItem(item: ReturnItem): ItemFormInput {
  return {
    productName: item.productName,
    store: item.store,
    receivedDate: item.receivedDate,
    useStartDate: item.useStartDate ?? '',
    rule: item.rule,
    storePolicyDays: item.storePolicyDays != null ? String(item.storePolicyDays) : '',
  };
}

// SDK는 WebView 밖에서 throw한다 — 햅틱 실패가 저장·선택을 막으면 안 된다
function haptic(type: 'tickWeak' | 'success') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

function storedRecentStores(): string[] {
  try {
    return deriveRecentStores(loadItems());
  } catch {
    return [];
  }
}

function scrollToCenter(e: FocusEvent<HTMLInputElement>) {
  try {
    e.currentTarget.scrollIntoView?.({ block: 'center' });
  } catch {
    /* 구형 WebView — 무시 */
  }
}

export function ItemFormSheet({
  open,
  mode,
  initial,
  recentStores: recentStoresProp,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: ReturnItem;
  /** 생략하면 저장소의 최근 구매처 5개 */
  recentStores?: string[];
  onClose: () => void;
  onSaved: (item: ReturnItem) => void;
}) {
  const today = todayYmd();
  const recentStores = useMemo(
    () => recentStoresProp ?? (open ? storedRecentStores() : []),
    [recentStoresProp, open],
  );
  const [input, setInput] = useState<ItemFormInput>(() =>
    initial ? inputFromItem(initial) : emptyInput(today),
  );
  const [touched, setTouched] = useState<Partial<Record<FormField, boolean>>>({});
  const [saveFailed, setSaveFailed] = useState(false);

  // 수정은 열 때마다 저장된 값으로 채운다. 등록 초안은 시트를 닫았다 열어도 남긴다.
  useEffect(() => {
    if (open && mode === 'edit' && initial) {
      setInput(inputFromItem(initial));
      setTouched({});
      setSaveFailed(false);
    }
  }, [open, mode, initial]);

  const validation = useMemo(() => validateForm(input, today), [input, today]);

  const preview = useMemo(() => {
    if (!validation.valid || input.rule === null) return null;
    const info = computeDeadline(
      {
        receivedDate: input.receivedDate,
        rule: input.rule,
        storePolicyDays: input.rule === 'store_policy_days' ? Number(input.storePolicyDays) : undefined,
      },
      today,
    );
    return `마감: ${formatKoreanDate(info.deadline, today)} · ${ddayLabel(info.dDay)}`;
  }, [validation.valid, input, today]);

  const set = <K extends keyof ItemFormInput>(key: K, value: ItemFormInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaveFailed(false);
  };
  const touch = (field: FormField) => setTouched((prev) => ({ ...prev, [field]: true }));

  const errorOf = (field: FormField): string | undefined => {
    const msg = validation.fieldErrors[field];
    if (!msg) return undefined;
    const raw = field === 'rule' ? input.rule ?? '' : String(input[field as keyof ItemFormInput] ?? '');
    return touched[field] || raw.trim() !== '' ? msg : undefined;
  };

  const handleSave = () => {
    if (!validation.valid) return;
    logClick(mode === 'create' ? 'item_create_save' : 'item_edit_save');
    haptic('success');
    let saved: ReturnItem;
    try {
      saved = mode === 'edit' && initial ? updateItem(initial.id, input) : addItem(input);
    } catch (err) {
      // 시트와 입력값을 그대로 두고, 버튼은 다시 누를 수 있게 둔다. 그 밖의 예외는 숨기지 않는다.
      if (!(err instanceof StoreWriteError)) throw err;
      setSaveFailed(true);
      return;
    }
    setSaveFailed(false);
    if (mode === 'create') {
      setInput(emptyInput(today));
      setTouched({});
    }
    onSaved(saved);
    onClose();
  };

  const hint = saveFailed ? MESSAGES.WRITE_FAIL_HINT : validation.valid ? undefined : validation.firstHint;

  const selectedRuleLabel = RULE_OPTIONS.find((o) => o.value === input.rule)?.label;

  const pickRule = (rule: DeadlineRule) => {
    haptic('tickWeak');
    set('rule', rule);
    touch('rule');
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      header={<BottomSheet.Header>{mode === 'create' ? '반품 건 추가' : '반품 건 수정'}</BottomSheet.Header>}
      cta={
        <BottomSheet.CTA
          aria-label="저장하기"
          onClick={handleSave}
          disabled={!validation.valid}
          fixedAboveKeyboard
          topAccessory={
            hint ? (
              <div data-testid="item-form-hint" style={{ textAlign: 'center' }}>
                <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
                  {hint}
                </Paragraph.Text>
              </div>
            ) : undefined
          }
        >
          저장하기
        </BottomSheet.CTA>
      }
    >
      <TextField
        variant="box"
        label="상품명"
        labelOption="sustain"
        aria-label="상품명"
        placeholder="예: 무선 청소기 V12"
        value={input.productName}
        onChange={(e) => set('productName', e.target.value)}
        onBlur={() => touch('productName')}
        onFocus={scrollToCenter}
        hasError={!!errorOf('productName')}
        help={errorOf('productName')}
        enterKeyHint="next"
      />
      <Spacing size={12} />
      <TextField
        variant="box"
        label="구매처"
        labelOption="sustain"
        aria-label="구매처"
        placeholder="예: 쿠팡"
        value={input.store}
        onChange={(e) => set('store', e.target.value)}
        onBlur={() => touch('store')}
        onFocus={scrollToCenter}
        hasError={!!errorOf('store')}
        help={errorOf('store')}
        enterKeyHint="next"
      />
      {recentStores.length > 0 ? (
        <>
          <Spacing size={8} />
          <Chip kind="action" wrap>
            {recentStores.map((name) => (
              <ChipItem
                key={name}
                aria-label={`구매처 ${name}`}
                selected={false}
                onClick={() => {
                  haptic('tickWeak');
                  set('store', name);
                }}
              >
                {name}
              </ChipItem>
            ))}
          </Chip>
        </>
      ) : null}
      <Spacing size={12} />
      <TextField
        variant="box"
        type="date"
        label="수령일"
        labelOption="sustain"
        aria-label="수령일"
        placeholder="예: 2026-10-05"
        max={today}
        value={input.receivedDate}
        onChange={(e) => set('receivedDate', e.target.value)}
        onBlur={() => touch('receivedDate')}
        onFocus={scrollToCenter}
        hasError={!!errorOf('receivedDate')}
        help={errorOf('receivedDate')}
      />
      <Spacing size={16} />
      <Paragraph.Text typography="t6">
        {selectedRuleLabel ? `기한 유형 · ${selectedRuleLabel} 선택됨` : '기한 유형'}
      </Paragraph.Text>
      <Spacing size={8} />
      <Chip kind="select" variant="fill" wrap>
        {RULE_OPTIONS.map((opt) => (
          <ChipItem
            key={opt.value}
            aria-label={opt.label}
            selected={input.rule === opt.value}
            onClick={() => pickRule(opt.value)}
          >
            {opt.label}
          </ChipItem>
        ))}
      </Chip>
      {input.rule === 'store_policy_days' ? (
        <>
          <Spacing size={12} />
          <TextField
            variant="box"
            label="구매처 반품 기한(일)"
            labelOption="sustain"
            aria-label="구매처 반품 기한"
            placeholder="예: 30"
            inputMode="numeric"
            enterKeyHint="next"
            suffix="일"
            value={input.storePolicyDays}
            onChange={(e) => set('storePolicyDays', e.target.value)}
            onBlur={() => touch('storePolicyDays')}
            onFocus={scrollToCenter}
            hasError={!!errorOf('storePolicyDays')}
            help={errorOf('storePolicyDays')}
          />
        </>
      ) : null}
      <Spacing size={12} />
      <TextField
        variant="box"
        type="date"
        label="사용 시작일 (선택)"
        labelOption="sustain"
        aria-label="사용 시작일"
        placeholder="예: 2026-10-06"
        value={input.useStartDate}
        onChange={(e) => set('useStartDate', e.target.value)}
        onBlur={() => touch('useStartDate')}
        onFocus={scrollToCenter}
        hasError={!!errorOf('useStartDate')}
        help={errorOf('useStartDate')}
        enterKeyHint="done"
      />
      {preview ? (
        <>
          <Spacing size={16} />
          <Paragraph.Text typography="t5" data-testid="deadline-preview">
            {preview}
          </Paragraph.Text>
        </>
      ) : null}
      <Spacing size={16} />
    </BottomSheet>
  );
}
