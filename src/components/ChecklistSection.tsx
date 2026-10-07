import { useState } from 'react';
import type { FormEvent } from 'react';
import { Badge, Button, ListRow, Paragraph, Spacing, Switch, TextField, useToast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import type { ReturnItem } from '@/lib/types';
import { MESSAGES } from '@/lib/types';
import { addCheck, CHECK_LABEL_MAX, removeCheck, StoreWriteError, toggleCheck } from '@/lib/itemsStore';
import { formatNumber } from '@/lib/utils';
import { Card } from './Card';

// SDK는 WebView 밖에서 throw한다 — 햅틱 실패가 저장을 막으면 안 된다. tickStrong은 SDK 타입에 없어 tickMedium을 쓴다.
function haptic(type: 'tickWeak' | 'tickMedium' | 'success') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

/**
 * 환불 체크리스트 — 토글·추가·삭제가 즉시 저장된다.
 * 저장소 함수는 쓰기에 실패하면 throw하고 저장소·캐시를 그대로 둔다. 부모에 올리기 전에
 * 던지므로 화면은 이전 snapshot 그대로 남고, 토스트로 실패를 알린다.
 */
export function ChecklistSection({
  item,
  onChange,
}: {
  item: ReturnItem;
  onChange: (next: ReturnItem) => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const done = item.checklist.filter((c) => c.done).length;
  const label = draft.trim();
  const canAdd = label.length >= 1 && label.length <= CHECK_LABEL_MAX;

  const run = (op: () => ReturnItem): boolean => {
    let next: ReturnItem;
    try {
      next = op();
    } catch (e) {
      if (!(e instanceof StoreWriteError)) throw e;
      toast.openToast(MESSAGES.SAVE_FAIL_TOAST);
      return false;
    }
    onChange(next);
    return true;
  };

  const handleAdd = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canAdd) return;
    haptic('success');
    if (run(() => addCheck(item.id, label))) setDraft('');
  };

  return (
    <Card testId="checklist-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Paragraph.Text typography="t4">환불 체크리스트</Paragraph.Text>
        <Badge size="small" variant="weak" color="blue">
          {`${formatNumber(done)}/${formatNumber(item.checklist.length)} 완료`}
        </Badge>
      </div>
      <Spacing size={8} />
      <div>
        {item.checklist.map((c) => (
          <ListRow
            key={c.id}
            contents={<ListRow.Texts type="1RowTypeA" top={c.label} />}
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch
                  aria-label={c.label}
                  checked={c.done}
                  onChange={() => {
                    haptic('tickWeak');
                    run(() => toggleCheck(item.id, c.id));
                  }}
                />
                <Button
                  aria-label={`${c.label} 삭제`}
                  size="small"
                  variant="weak"
                  onClick={() => {
                    haptic('tickMedium');
                    run(() => removeCheck(item.id, c.id));
                  }}
                >
                  삭제
                </Button>
              </div>
            }
          />
        ))}
      </div>
      <Spacing size={12} />
      <form onSubmit={handleAdd} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <TextField
            variant="box"
            label="새 항목"
            labelOption="sustain"
            aria-label="새 체크 항목"
            placeholder="예: 영수증 챙기기"
            value={draft}
            maxLength={CHECK_LABEL_MAX}
            enterKeyHint="done"
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <Button aria-label="추가" type="submit" variant="weak" disabled={!canAdd}>
          추가
        </Button>
      </form>
    </Card>
  );
}
