import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useLinkClickHandler } from 'react-router-dom';
import { Badge, Button, ListRow, Paragraph, Spacing, Tab, Top } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { SubmitFooter } from '../components/BottomCTA';
import { EmptyState } from '../components/StateView';
import { AdSlot } from '../components/AdSlot';
import { AdBoundary, adGroupId } from '../components/AdBoundary';
import { ItemFormSheet } from '../components/ItemFormSheet';
import type { BoardSection, ReturnItem } from '@/lib/types';
import type { ArchiveReason } from '@/lib/types';
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

const ARCHIVE_COLOR: Record<ArchiveReason, 'blue' | 'teal' | 'elephant'> = {
  returned: 'blue',
  kept: 'teal',
  expired: 'elephant',
};

// SDK는 WebView 밖에서 throw한다 — 햅틱 실패가 탭 전환·시트 열기를 막으면 안 된다
function haptic(type: 'tickWeak' | 'success') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

/** 진행 중 1건 이상일 때만 부른다 — 요약 문구와 히어로 숫자(가장 가까운 D-day) */
function summaryOf(items: ReturnItem[], today: string): { headline: string; text: string } | null {
  const { todayCount, within3Count, nearest } = summarizeActive(items, today);
  if (!nearest) return null;
  const headline = ddayLabel(nearest.dDay);
  if (todayCount > 0 || within3Count > 0) {
    return {
      headline,
      text: `오늘 마감 ${formatNumber(todayCount)}건 · 3일 안에 ${formatNumber(within3Count)}건`,
    };
  }
  return { headline, text: `가장 가까운 마감: ${nearest.item.productName} ${headline}` };
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
          <Badge size="small" variant="weak" color={ARCHIVE_COLOR[reason]}>
            {ARCHIVE_LABEL[reason]}
          </Badge>
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

  // '반품 건 추가'(SubmitFooter)는 success 햅틱을 자체로 낸다 — 여기서 또 내지 않는다
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
        {[0, 1, 2].map((i) => (
          <Fragment key={i}>
            {i > 0 ? <Spacing size={8} /> : null}
            <div
              data-skeleton="true"
              style={{ height: 56, borderRadius: 12, backgroundColor: 'var(--adaptiveGrey100)' }}
            />
          </Fragment>
        ))}
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
      <ScreenScaffold
        top={top}
        bottom={<SubmitFooter label="첫 주문 등록하기" onClick={openSheet} />}
      >
        <Spacing size={96} />
        <EmptyState
          testId="home-empty"
          title="아직 등록한 주문이 없어요"
          description="받은 날만 넣으면 반품 마감일을 계산해 드려요"
        />
        {sheet}
      </ScreenScaffold>
    );
  }

  const rows = tab === 'active' ? active : archive;
  const ad = adGroupId();
  const summary = summaryOf(items, today);

  return (
    <ScreenScaffold
      top={top}
      bottom={<SubmitFooter label="반품 건 추가" onClick={openSheet} />}
    >
      <Spacing size={8} />
      {summary ? (
        <SummaryHero
          testId="home-summary"
          label="반품 마감 요약"
          value={<Paragraph.Text typography="t1">{summary.headline}</Paragraph.Text>}
          caption={summary.text}
        />
      ) : null}
      <Spacing size={16} />
      <Tab
        onChange={(i) => {
          haptic('tickWeak');
          changeTab(i === 1 ? 'archive' : 'active');
        }}
      >
        <Tab.Item selected={tab === 'active'}>{`진행 중 ${formatNumber(active.length)}`}</Tab.Item>
        <Tab.Item selected={tab === 'archive'}>{`보관함 ${formatNumber(archive.length)}`}</Tab.Item>
      </Tab>
      <Spacing size={8} />
      {rows.length === 0 ? (
        <EmptyState
          testId="home-tab-empty"
          title={tab === 'archive' ? '보관함이 비어 있어요' : '진행 중인 건이 없어요'}
          description={tab === 'archive' ? undefined : '새로 받은 주문을 추가하면 마감일을 계산해 드려요'}
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
