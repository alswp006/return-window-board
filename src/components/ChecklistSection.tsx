import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, ListRow, Paragraph, Spacing, Switch, TextField } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import type { ReturnItem } from '@/lib/types';
import { addCheck, CHECK_LABEL_MAX, removeCheck, toggleCheck } from '@/lib/itemsStore';
import { formatNumber } from '@/lib/utils';
import { Card } from './Card';

function tick() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

/**
 * 환불 신청 체크리스트 — 토글·추가·삭제가 즉시 저장된다.
 * 저장이 실패하면 저장소 함수가 throw하기 전에는 화면 상태를 바꾸지 않으므로 그대로 실패 전 값이 남는다.
 */
export function ChecklistSection({
  item,
  onChange,
  onWriteFail,
}: {
  item: ReturnItem;
  onChange: (next: ReturnItem) => void;
  onWriteFail: () => void;
}) {
  const [draft, setDraft] = useState('');
  const done = item.checklist.filter((c) => c.done).length;
  const label = draft.trim();
  const canAdd = label.length >= 1 && label.length <= CHECK_LABEL_MAX;

  const run = (op: () => ReturnItem): boolean => {
    try {
      onChange(op());
      return true;
    } catch {
      onWriteFail();
      return false;
    }
  };

  const handleAdd = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canAdd) return;
    if (run(() => addCheck(item.id, label))) setDraft('');
  };

  return (
    <Card testId="checklist-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Paragraph.Text typography="t4">환불 신청 체크리스트</Paragraph.Text>
        <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
          {`${formatNumber(done)}/${formatNumber(item.checklist.length)} 완료`}
        </Paragraph.Text>
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
                    tick();
                    run(() => toggleCheck(item.id, c.id));
                  }}
                />
                <Button
                  aria-label={`${c.label} 삭제`}
                  size="small"
                  variant="weak"
                  onClick={() => run(() => removeCheck(item.id, c.id))}
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
            aria-label="새 체크리스트 항목"
            placeholder="예: 영수증 챙기기"
            value={draft}
            maxLength={CHECK_LABEL_MAX}
            enterKeyHint="done"
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <Button aria-label="체크리스트 항목 추가" type="submit" variant="weak" disabled={!canAdd}>
          추가
        </Button>
      </form>
    </Card>
  );
}
