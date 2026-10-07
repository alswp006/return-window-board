import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLinkClickHandler } from 'react-router-dom';
import { Badge, Button, ListRow, Paragraph, Spacing, Tab, Top } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { SubmitFooter } from '../components/BottomCTA';
import { EmptyState, LoadingState } from '../components/StateView';
import { AdSlot } from '../components/AdSlot';
import { AdBoundary, adGroupId } from '../components/AdBoundary';
import { ItemFormSheet } from '../components/ItemFormSheet';
import type { BoardSection, ReturnItem } from '@/lib/types';
import { ARCHIVE_LABEL, MESSAGES } from '@/lib/types';
import {
  archiveReason,
  computeDeadline,
  ddayLabel,
  formatKoreanDate,
  sortActive,
  sortArchive,
  summarizeActive,
  todayYmd,
} from '@/lib/deadline';
import { formatNumber } from '@/lib/utils';
import { loadItems, recentStores, reloadItems } from '@/lib/itemsStore';
import { logClick } from '@/lib/analytics';

type Phase = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; items: ReturnItem[] };

// 탭 위치는 상세에 다녀와도 남도록 세션에 둔다
const TAB_KEY = 'rwb:home-tab';

function readTab(): BoardSection {
  try {
    return sessionStorage.getItem(TAB_KEY) === 'archive' ? 'archive' : 'active';
  } catch {
    return 'active';
  }
}

function writeTab(tab: BoardSection) {
  try {
    sessionStorage.setItem(TAB_KEY, tab);
  } catch {
    /* 저장 불가 환경 — 탭 위치만 잃는다 */
  }
}

function summaryLine(items: ReturnItem[], today: string): string {
  const { todayCount, within3Count, nearest } = summarizeActive(items, today);
  if (todayCount > 0 || within3Count > 0) {
    return `오늘 마감 ${formatNumber(todayCount)}건 · 3일 안에 ${formatNumber(within3Count)}건`;
  }
  if (nearest) return `가장 가까운 마감: ${nearest.item.productName} ${ddayLabel(nearest.dDay)}`;
  return '진행 중인 건이 없어요';
}

/** 목록 한 줄 — 탭하면 /result/{id}. 줄 전체가 링크처럼 동작한다(라우터 링크 클릭 처리 그대로). */
function BoardRow({ item, today, archived }: { item: ReturnItem; today: string; archived: boolean }) {
  const open = useLinkClickHandler<HTMLElement>(`/result/${item.id}`);
  const info = computeDeadline(item, today);
  const reason = archived ? archiveReason(item, today) : null;
  return (
    <ListRow
      withArrow
      onClick={(e) => {
        logClick('item_open');
        open(e);
      }}
      contents={
        <ListRow.Texts
          type="2RowTypeA"
          top={item.productName}
          bottom={`${item.store} · ${formatKoreanDate(info.deadline, today)}`}
        />
      }
      right={
        reason ? (
          <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
            {ARCHIVE_LABEL[reason]}
          </Paragraph.Text>
        ) : info.isToday ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge size="small" variant="fill" color="red">
              오늘 마감
            </Badge>
            <Paragraph.Text typography="t5" color="var(--adaptiveRed500)">
              {ddayLabel(info.dDay)}
            </Paragraph.Text>
          </div>
        ) : (
          <Paragraph.Text
            typography="t5"
            color={info.dDay <= 3 ? 'var(--adaptiveRed500)' : 'var(--adaptiveGrey700)'}
          >
            {ddayLabel(info.dDay)}
          </Paragraph.Text>
        )
      }
    />
  );
}

export default function Home() {
  const today = todayYmd();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [tab, setTab] = useState<BoardSection>(readTab);
  const [sheetOpen, setSheetOpen] = useState(false);

  const read = useCallback((fresh: boolean) => {
    try {
      setPhase({ kind: 'ready', items: fresh ? reloadItems() : loadItems() });
    } catch {
      setPhase({ kind: 'error' });
    }
  }, []);

  useEffect(() => {
    read(false);
  }, [read]);

  const items = phase.kind === 'ready' ? phase.items : [];
  const active = useMemo(() => sortActive(items, today), [items, today]);
  const archive = useMemo(() => sortArchive(items, today), [items, today]);
  const stores = useMemo(() => recentStores(items), [items]);

  const changeTab = (next: BoardSection) => {
    setTab(next);
    writeTab(next);
  };

  const openSheet = () => {
    logClick('item_add_open');
    setSheetOpen(true);
  };

  const handleSaved = () => {
    setSheetOpen(false);
    changeTab('active');
    read(false);
  };

  const top = <Top title={<Top.TitleParagraph>반품 마감 보드</Top.TitleParagraph>} />;

  if (phase.kind === 'loading') {
    return (
      <ScreenScaffold top={top}>
        <LoadingState rows={4} testId="home-loading" />
      </ScreenScaffold>
    );
  }

  if (phase.kind === 'error') {
    return (
      <ScreenScaffold top={top}>
        <EmptyState
          testId="home-error"
          title={MESSAGES.LOAD_ERROR}
          description="저장소를 다시 읽으면 대부분 해결돼요"
          action={
            <Button aria-label="다시 시도" variant="weak" onClick={() => read(true)}>
              다시 시도
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const sheet = (
    <ItemFormSheet
      open={sheetOpen}
      mode="create"
      recentStores={stores}
      onClose={() => setSheetOpen(false)}
      onSaved={handleSaved}
    />
  );

  if (items.length === 0) {
    return (
      <ScreenScaffold top={top}>
        <EmptyState
          testId="home-empty"
          title="아직 등록한 주문이 없어요"
          description="받은 날만 넣으면 반품 마감일을 계산해 드려요"
          action={
            <Button aria-label="첫 주문 등록하기" variant="fill" onClick={openSheet}>
              첫 주문 등록하기
            </Button>
          }
        />
        {sheet}
      </ScreenScaffold>
    );
  }

  const rows = tab === 'active' ? active : archive;
  const ad = adGroupId();

  return (
    <ScreenScaffold
      top={top}
      bottom={<SubmitFooter label="반품 건 추가" onClick={openSheet} />}
    >
      <SummaryHero
        testId="home-summary"
        label={`진행 중 ${formatNumber(active.length)}건`}
        value={<Paragraph.Text typography="t3">{summaryLine(items, today)}</Paragraph.Text>}
      />
      <Spacing size={16} />
      <Tab onChange={(i) => changeTab(i === 1 ? 'archive' : 'active')}>
        <Tab.Item selected={tab === 'active'}>{`진행 중 ${formatNumber(active.length)}`}</Tab.Item>
        <Tab.Item selected={tab === 'archive'}>{`보관함 ${formatNumber(archive.length)}`}</Tab.Item>
      </Tab>
      <Spacing size={8} />
      {rows.length === 0 ? (
        <EmptyState
          testId="home-tab-empty"
          title={tab === 'archive' ? '보관함이 비어 있어요' : '진행 중인 건이 없어요'}
          description={
            tab === 'archive'
              ? '반품을 신청했거나 계속 쓰기로 한 건이 여기에 모여요'
              : '새로 받은 주문을 추가하면 마감일을 계산해 드려요'
          }
        />
      ) : (
        <div data-testid="home-list">
          {rows.map((item) => (
            <BoardRow key={item.id} item={item} today={today} archived={tab === 'archive'} />
          ))}
        </div>
      )}
      {ad ? (
        <>
          <Spacing size={24} />
          <AdBoundary>
            <AdSlot adGroupId={ad} />
          </AdBoundary>
        </>
      ) : null}
      <Spacing size={120} />
      {sheet}
    </ScreenScaffold>
  );
}
