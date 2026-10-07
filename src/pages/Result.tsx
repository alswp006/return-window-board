import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Paragraph, Spacing, Top, useDialog, useToast } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Card } from '../components/Card';
import { ButtonStack, SubmitFooter } from '../components/BottomCTA';
import { EmptyState, LoadingState } from '../components/StateView';
import { AdSlot } from '../components/AdSlot';
import { AdBoundary, adGroupId } from '../components/AdBoundary';
import { ItemFormSheet } from '../components/ItemFormSheet';
import { ChecklistSection } from '../components/ChecklistSection';
import type { ItemStatus, ResultParams, ReturnItem } from '@/lib/types';
import { ARCHIVE_LABEL, COST_LINE, MESSAGES, RULE_NOTICE, ruleSourceLine } from '@/lib/types';
import { archiveReason, computeDeadline, ddayLabel, formatKoreanDate, todayYmd } from '@/lib/deadline';
import { formatNumber } from '@/lib/utils';
import { deleteItem, loadItems, recentStores, reloadItems, setStatus } from '@/lib/itemsStore';
import { logClick } from '@/lib/analytics';
import { requestReviewOnce } from '@/lib/review';
import { shareApp } from '@/lib/share';

type Phase =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'missing' }
  | { kind: 'ready'; item: ReturnItem; stores: string[] };

const APP_TITLE = '반품 마감 보드';

export default function Result() {
  const { id = '' } = useParams<keyof ResultParams>();
  const navigate = useNavigate();
  const dialog = useDialog();
  const toast = useToast();
  const today = todayYmd();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [editOpen, setEditOpen] = useState(false);

  // URL id로 저장소를 조회한다 — location.state에 기대지 않아 새로고침해도 같은 건이 보인다
  const read = useCallback(
    (fresh: boolean) => {
      try {
        const items = fresh ? reloadItems() : loadItems();
        const item = items.find((it) => it.id === id);
        setPhase(item ? { kind: 'ready', item, stores: recentStores(items) } : { kind: 'missing' });
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

  const goHome = () => navigate('/');

  const replaceItem = (next: ReturnItem) => {
    setPhase((prev) => (prev.kind === 'ready' ? { ...prev, item: next } : prev));
  };

  const changeStatus = (status: ItemStatus) => {
    if (!item) return;
    logClick(status === 'active' ? 'status_reopen' : `status_${status}`);
    try {
      replaceItem(setStatus(item.id, status));
    } catch {
      toast.openToast(MESSAGES.SAVE_FAIL_TOAST);
      return;
    }
    if (status === 'active') {
      toast.openToast('진행 중으로 옮겼어요');
    } else {
      toast.openToast(`보관함으로 옮겼어요 · ${status === 'returned' ? ARCHIVE_LABEL.returned : ARCHIVE_LABEL.kept}`);
      requestReviewOnce();
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    logClick('item_delete_tap');
    let ok = false;
    try {
      ok = await dialog.openConfirm({
        title: '이 건을 삭제할까요?',
        description: '체크리스트도 함께 지워져요',
        confirmButton: '삭제',
        cancelButton: '닫기',
      });
    } catch {
      ok = false;
    }
    if (!ok) return;
    try {
      deleteItem(item.id);
    } catch {
      toast.openToast(MESSAGES.DELETE_FAIL_TOAST);
      return;
    }
    navigate('/');
  };

  const handleShare = () => {
    if (!item || !info) return;
    logClick('share_tap');
    void shareApp({
      message: `${item.productName} 반품 마감은 ${formatKoreanDate(info.deadline, today)}이에요 (${ddayLabel(info.dDay)})`,
    });
  };

  if (phase.kind === 'loading') {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>{APP_TITLE}</Top.TitleParagraph>} />}>
        <LoadingState rows={4} testId="result-loading" />
      </ScreenScaffold>
    );
  }

  if (phase.kind === 'error' || phase.kind === 'missing') {
    const isError = phase.kind === 'error';
    return (
      <ScreenScaffold
        top={<Top title={<Top.TitleParagraph>{APP_TITLE}</Top.TitleParagraph>} />}
        bottom={<SubmitFooter label="목록으로" onClick={goHome} />}
      >
        <EmptyState
          testId={isError ? 'result-error' : 'result-missing'}
          title={isError ? MESSAGES.LOAD_ERROR : MESSAGES.NOT_FOUND}
          description={isError ? '저장소를 다시 읽으면 대부분 해결돼요' : '삭제됐거나 다른 기기에서 등록한 건이에요'}
          action={
            isError ? (
              <Button aria-label="다시 시도" variant="weak" onClick={() => read(true)}>
                다시 시도
              </Button>
            ) : undefined
          }
        />
      </ScreenScaffold>
    );
  }

  const current = phase.item;
  const deadline = info!;
  const reason = archiveReason(current, today);
  const notice = RULE_NOTICE[current.rule];
  const ad = adGroupId();

  const baseLine =
    deadline.useStartBasedDeadline && deadline.daysEarlier && deadline.daysEarlier > 0
      ? `사용 시작일로 세면 ${formatKoreanDate(deadline.useStartBasedDeadline, today)}이지만, 기한은 수령일부터 세서 실제 마감은 ${formatKoreanDate(deadline.deadline, today)}이에요 — ${formatNumber(deadline.daysEarlier)}일 빨라요`
      : '기한은 상품을 받은 날부터 세요';

  let bottom;
  if (reason === null) {
    bottom = (
      <ButtonStack
        primary={{ label: ARCHIVE_LABEL.returned, onClick: () => changeStatus('returned') }}
        secondary={{ label: ARCHIVE_LABEL.kept, onClick: () => changeStatus('kept') }}
      />
    );
  } else if (reason !== 'expired' && !deadline.isExpired) {
    bottom = (
      <ButtonStack
        primary={{ label: '진행 중으로 되돌리기', onClick: () => changeStatus('active') }}
        secondary={{ label: '목록으로', onClick: goHome }}
      />
    );
  } else {
    bottom = <SubmitFooter label="목록으로" onClick={goHome} />;
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{current.productName}</Top.TitleParagraph>} />}
      bottom={bottom}
    >
      <SummaryHero
        testId="result-hero"
        label={reason ? `반품 마감일 · ${ARCHIVE_LABEL[reason]}` : '반품 마감일'}
        value={
          <Paragraph.Text typography="t1">
            {`${formatKoreanDate(deadline.deadline, today)} ${ddayLabel(deadline.dDay)}`}
          </Paragraph.Text>
        }
        caption={ruleSourceLine(current.rule, current.storePolicyDays)}
        action={
          <Button aria-label="마감일 공유하기" variant="weak" display="block" onClick={handleShare}>
            마감일 공유하기
          </Button>
        }
      />
      <Spacing size={12} />
      <Card testId="result-guide">
        <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
          {`수령일 ${formatKoreanDate(current.receivedDate, today)} · ${current.store}`}
        </Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="t6">{baseLine}</Paragraph.Text>
        {notice ? (
          <>
            <Spacing size={8} />
            <Paragraph.Text typography="t6">{notice}</Paragraph.Text>
          </>
        ) : null}
        <Spacing size={8} />
        <Paragraph.Text typography="t6">{COST_LINE[current.rule]}</Paragraph.Text>
      </Card>
      <Spacing size={12} />
      <ChecklistSection item={current} onChange={replaceItem} />
      <Spacing size={16} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Button
            aria-label="수정"
            variant="weak"
            display="block"
            onClick={() => {
              logClick('item_edit_open');
              setEditOpen(true);
            }}
          >
            수정
          </Button>
        </div>
        <div style={{ flex: 1 }}>
          <Button aria-label="삭제" variant="weak" color="danger" display="block" onClick={handleDelete}>
            삭제
          </Button>
        </div>
        {/* 하단 고정 영역에 '목록으로'가 없을 때만(진행 중 상태) 여기 둔다 */}
        {reason === null ? (
          <div style={{ flex: 1 }}>
            <Button aria-label="목록으로" variant="weak" display="block" onClick={goHome}>
              목록으로
            </Button>
          </div>
        ) : null}
      </div>
      {ad ? (
        <>
          <Spacing size={24} />
          <AdBoundary>
            <AdSlot adGroupId={ad} />
          </AdBoundary>
        </>
      ) : null}
      <Spacing size={160} />
      <ItemFormSheet
        open={editOpen}
        mode="edit"
        initial={current}
        recentStores={phase.stores}
        onClose={() => setEditOpen(false)}
        onSaved={(next) => {
          replaceItem(next);
          setEditOpen(false);
        }}
      />
    </ScreenScaffold>
  );
}
