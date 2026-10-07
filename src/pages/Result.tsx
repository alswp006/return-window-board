import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, ConfirmDialog, Paragraph, Spacing, Top, useToast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Card } from '../components/Card';
import { EmptyState, LoadingState } from '../components/StateView';
import { AdSlot } from '../components/AdSlot';
import { AdBoundary, adGroupId } from '../components/AdBoundary';
import { ItemFormSheet } from '../components/ItemFormSheet';
import { ChecklistSection } from '../components/ChecklistSection';
import type { ItemStatus, ResultParams, ReturnItem } from '@/lib/types';
import { ARCHIVE_LABEL, COST_LINE, MESSAGES, RULE_NOTICE, ruleSourceLine } from '@/lib/types';
import { archiveReason, computeDeadline, ddayLabel, formatKoreanDate, todayYmd } from '@/lib/deadline';
import { formatNumber } from '@/lib/utils';
import { deleteItem, getItem, ItemNotFoundError, loadItems, reloadItems, setStatus } from '@/lib/itemsStore';
import { logClick } from '@/lib/analytics';
import { requestReviewOnce } from '@/lib/review';

type Phase =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'missing' }
  | { kind: 'ready'; item: ReturnItem };

const APP_TITLE = '반품 마감 보드';

// SDK는 WebView 밖에서 throw한다 — 햅틱 실패가 저장·삭제를 막으면 안 된다. tickStrong은 SDK 타입에 없어 tickMedium을 쓴다.
function haptic(type: 'success' | 'tickMedium') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

export default function Result() {
  const { id = '' } = useParams<keyof ResultParams>();
  const navigate = useNavigate();
  const toast = useToast();
  const today = todayYmd();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // URL id로 저장소를 조회한다 — location.state에 기대지 않아 새로고침해도 같은 건이 보인다
  const read = useCallback(
    (fresh: boolean) => {
      try {
        if (fresh) reloadItems();
        else loadItems();
        const item = getItem(id);
        setPhase(item ? { kind: 'ready', item } : { kind: 'missing' });
      } catch {
        setPhase({ kind: 'error' });
      }
    },
    [id],
  );

  useEffect(() => {
    read(false);
  }, [read]);

  const item = phase.kind === 'ready' ? phase.item : null;
  const info = useMemo(() => (item ? computeDeadline(item, today) : null), [item, today]);

  const goList = () => navigate('/');
  const setItem = (next: ReturnItem) => setPhase({ kind: 'ready', item: next });

  if (phase.kind === 'loading') {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>{APP_TITLE}</Top.TitleParagraph>} />}>
        <LoadingState rows={3} testId="result-loading" />
      </ScreenScaffold>
    );
  }

  if (phase.kind === 'error') {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>{APP_TITLE}</Top.TitleParagraph>} />}>
        <EmptyState
          testId="result-error"
          title={MESSAGES.LOAD_ERROR}
          action={
            <Button aria-label="다시 시도" variant="weak" onClick={() => read(true)}>
              다시 시도
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  if (phase.kind === 'missing' || !item || !info) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>{APP_TITLE}</Top.TitleParagraph>} />}>
        <EmptyState
          testId="result-missing"
          title={MESSAGES.NOT_FOUND}
          action={
            <Button aria-label="목록으로" variant="weak" onClick={goList}>
              목록으로
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const reason = archiveReason(item, today);
  const notice = RULE_NOTICE[item.rule];
  const ad = adGroupId();

  const useStartLine =
    info.useStartBasedDeadline && info.daysEarlier && info.daysEarlier > 0
      ? `사용 시작일로 세면 ${formatKoreanDate(info.useStartBasedDeadline, today)}이지만, 기한은 수령일부터 세서 실제 마감은 ${formatKoreanDate(info.deadline, today)}이에요 — ${formatNumber(info.daysEarlier)}일 빨라요`
      : '기한은 상품을 받은 날부터 세요';

  const onStatus = (status: ItemStatus) => {
    logClick(status === 'active' ? 'status_reopen' : `status_${status}`);
    haptic('success');
    let next: ReturnItem;
    try {
      next = setStatus(item.id, status);
    } catch (e) {
      // 쓰기 실패는 화면을 그대로 둔다 — 저장소·캐시도 실패 전 그대로다
      if (e instanceof ItemNotFoundError) setPhase({ kind: 'missing' });
      else toast.openToast(MESSAGES.SAVE_FAIL_TOAST);
      return;
    }
    setItem(next);
    if (status !== 'active') requestReviewOnce();
  };

  const onDelete = () => {
    logClick('item_delete_confirm');
    haptic('tickMedium');
    try {
      deleteItem(item.id);
    } catch {
      setConfirmOpen(false);
      toast.openToast(MESSAGES.DELETE_FAIL_TOAST);
      return;
    }
    setConfirmOpen(false);
    navigate('/');
  };

  const openEdit = () => {
    logClick('item_edit_open');
    setEditOpen(true);
  };

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>{item.productName}</Top.TitleParagraph>}
          right={
            <Button aria-label="수정" variant="weak" size="small" onClick={openEdit}>
              수정
            </Button>
          }
        />
      }
    >
      <SummaryHero
        testId="result-hero"
        label={reason ? ARCHIVE_LABEL[reason] : '반품 마감까지'}
        value={<Paragraph.Text typography="t1">{ddayLabel(info.dDay)}</Paragraph.Text>}
        caption={`${formatKoreanDate(info.deadline, today)} 마감`}
      />
      <Spacing size={8} />
      <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
        {ruleSourceLine(item.rule, item.storePolicyDays)}
      </Paragraph.Text>
      <Spacing size={24} />
      <Card testId="result-guide">
        <Paragraph.Text typography="t4">기한 안내</Paragraph.Text>
        <Spacing size={12} />
        <Paragraph.Text typography="t5">{useStartLine}</Paragraph.Text>
        {notice ? (
          <>
            <Spacing size={8} />
            <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
              {notice}
            </Paragraph.Text>
          </>
        ) : null}
        <Spacing size={8} />
        <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
          {COST_LINE[item.rule]}
        </Paragraph.Text>
      </Card>
      <Spacing size={16} />
      <ChecklistSection item={item} onChange={setItem} />
      <Spacing size={32} />
      {item.status === 'active' && !info.isExpired ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Button
              variant="fill"
              size="large"
              display="block"
              aria-label={ARCHIVE_LABEL.returned}
              onClick={() => onStatus('returned')}
            >
              {ARCHIVE_LABEL.returned}
            </Button>
          </div>
          <div style={{ flex: 1 }}>
            <Button
              variant="weak"
              size="large"
              display="block"
              aria-label={ARCHIVE_LABEL.kept}
              onClick={() => onStatus('kept')}
            >
              {ARCHIVE_LABEL.kept}
            </Button>
          </div>
        </div>
      ) : null}
      {item.status !== 'active' && !info.isExpired ? (
        <Button
          variant="weak"
          size="large"
          display="block"
          aria-label="진행 중으로 되돌리기"
          onClick={() => onStatus('active')}
        >
          진행 중으로 되돌리기
        </Button>
      ) : null}
      <Spacing size={12} />
      <Button
        variant="weak"
        color="danger"
        size="large"
        display="block"
        aria-label="삭제"
        onClick={() => {
          logClick('item_delete_tap');
          setConfirmOpen(true);
        }}
      >
        삭제
      </Button>
      {ad ? (
        <>
          <Spacing size={24} />
          <AdBoundary>
            <AdSlot adGroupId={ad} />
          </AdBoundary>
        </>
      ) : null}
      <Spacing size={32} />
      <ConfirmDialog
        open={confirmOpen}
        title="이 건을 삭제할까요?"
        onClose={() => setConfirmOpen(false)}
        cancelButton={
          <ConfirmDialog.CancelButton aria-label="닫기" onClick={() => setConfirmOpen(false)}>
            닫기
          </ConfirmDialog.CancelButton>
        }
        confirmButton={
          <ConfirmDialog.ConfirmButton aria-label="삭제하기" color="danger" onClick={onDelete}>
            삭제하기
          </ConfirmDialog.ConfirmButton>
        }
      />
      <ItemFormSheet
        open={editOpen}
        mode="edit"
        initial={item}
        onClose={() => setEditOpen(false)}
        onSaved={(next) => {
          setItem(next);
          setEditOpen(false);
        }}
      />
    </ScreenScaffold>
  );
}
