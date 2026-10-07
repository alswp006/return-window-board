import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { mockTds, mockAppsInToss, mockAnalytics, mockNavigate } from "@/__tests__/__helpers__/mocks";
import type { ReturnItem } from "@/lib/types";
import Home from "@/pages/Home";
import { AdBoundary } from "@/components/AdBoundary";

mockTds();
mockAppsInToss();
mockAnalytics();

// AdSlot은 템플릿 컴포넌트 — 정상/렌더 중 throw 두 모드로 목킹한다.
const ad = vi.hoisted(() => ({ throws: false }));
vi.mock("@/components/AdSlot", () => ({
  AdSlot: () => {
    if (ad.throws) throw new Error("ad render failed");
    return React.createElement("div", { "data-testid": "ad-slot" }, "광고");
  },
}));

const STORAGE_KEY = "rwb:items:v1";
const LOAD_ERROR = "저장된 목록을 불러오지 못했어요";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T09:00:00+09:00")); // 목요일
  vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "ad-group-from-console");
  ad.throws = false;
  mockNavigate.mockClear();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

let seq = 0;
// store_policy_days: 마감일 = 수령일 + days. 수령일을 오늘(10-08)로 두면 days가 곧 D-day다.
function make(over: Partial<ReturnItem> & { days?: number } = {}): ReturnItem {
  const { days = 5, ...rest } = over;
  seq += 1;
  return {
    id: `id-${seq}`,
    productName: `상품${seq}`,
    store: "쿠팡",
    receivedDate: "2026-10-08",
    rule: "store_policy_days",
    storePolicyDays: days,
    checklist: [],
    status: "active",
    createdAt: `2026-10-0${(seq % 8) + 1}T09:00:00+09:00`,
    ...rest,
  };
}

function seed(items: ReturnItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function renderHome() {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/"] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: "/", element: React.createElement(Home) }),
        React.createElement(Route, {
          path: "/result/:id",
          element: React.createElement("div", null, "상세 화면"),
        }),
      ),
    ),
  );
}

const rows = () => Array.from(document.querySelectorAll("li"));
const rowTexts = () => rows().map((r) => r.textContent ?? "");
const goArchive = () => fireEvent.click(screen.getByRole("tab", { name: /^보관함/ }));

const threeActive = () => [
  make({ id: "a5", productName: "블루투스 이어폰", store: "쿠팡", days: 5 }),
  make({ id: "a0", productName: "무선 청소기", store: "11번가", days: 0 }),
  make({ id: "a2", productName: "러닝화", store: "무신사", days: 2 }),
];

describe("Home Page — D-day 보드 + AdBoundary", () => {
  it("AC-1[P0]: 진행 중 탭은 D-DAY → D-2 → D-5 순서이고 구매처·날짜·D-day가 보이며 오늘 마감 Badge는 D-0 줄에만 있다", () => {
    seed(threeActive());
    renderHome();
    const list = rows();
    expect(list).toHaveLength(3);
    expect(list[0].textContent).toContain("무선 청소기");
    expect(list[0].textContent).toContain("11번가 · 10월 8일 (목)");
    expect(list[0].textContent).toContain("D-DAY");
    expect(list[1].textContent).toContain("러닝화");
    expect(list[1].textContent).toContain("무신사 · 10월 10일 (토)");
    expect(list[1].textContent).toContain("D-2");
    expect(list[2].textContent).toContain("블루투스 이어폰");
    expect(list[2].textContent).toContain("쿠팡 · 10월 13일 (화)");
    expect(list[2].textContent).toContain("D-5");
    expect(screen.getAllByText("오늘 마감")).toHaveLength(1);
    expect(within(list[0]).getByText("오늘 마감")).toBeTruthy();
    expect(within(list[1]).queryByText("오늘 마감")).toBeNull();
    expect(within(list[2]).queryByText("오늘 마감")).toBeNull();
  });

  it("AC-2[P0]: 요약 문구 — 오늘 1건·3일 안 1건 / 임박 건 없으면 가장 가까운 마감 / 진행 중 0건이면 SummaryHero 없음", () => {
    seed(threeActive());
    const first = renderHome();
    expect(screen.getByText("오늘 마감 1건 · 3일 안에 1건")).toBeTruthy();
    expect(screen.getByTestId("home-summary")).toBeTruthy();
    first.unmount();

    seed([make({ productName: "전기포트", days: 5 }), make({ productName: "책상 조명", days: 9 })]);
    const second = renderHome();
    expect(screen.getByText("가장 가까운 마감: 전기포트 D-5")).toBeTruthy();
    expect(screen.queryByText(/오늘 마감 \d+건/)).toBeNull();
    second.unmount();

    // 진행 중 0건 (보관함에만 건이 있음)
    seed([make({ status: "returned", days: 3 })]);
    renderHome();
    expect(screen.queryByTestId("home-summary")).toBeNull();
    expect(screen.getByRole("tab", { name: "진행 중 0" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "보관함 1" })).toBeTruthy();
  });

  it("AC-3[P0]: 보관함은 마감일 내림차순이고 기한 지남·반품 신청함·계속 쓰기로 함 라벨이 붙으며 저장된 status는 그대로다", () => {
    const items = [
      make({ id: "exp", productName: "만료된 건", receivedDate: "2026-09-01", days: 3 }), // 마감 09-04 지남
      make({ id: "ret", productName: "반품한 건", status: "returned", days: 12 }), // 10-20
      make({ id: "kep", productName: "유지한 건", status: "kept", days: 4 }), // 10-12
      make({ id: "act", productName: "진행 건", days: 6 }),
    ];
    seed(items);
    const before = localStorage.getItem(STORAGE_KEY);
    renderHome();
    expect(screen.getByRole("tab", { name: "진행 중 1" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "보관함 3" })).toBeTruthy();
    goArchive();
    const texts = rowTexts();
    expect(texts).toHaveLength(3);
    expect(texts[0]).toContain("반품한 건");
    expect(texts[0]).toContain("반품 신청함");
    expect(texts[1]).toContain("유지한 건");
    expect(texts[1]).toContain("계속 쓰기로 함");
    expect(texts[2]).toContain("만료된 건");
    expect(texts[2]).toContain("기한 지남");
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).find((i: ReturnItem) => i.id === "exp").status).toBe("active");
  });

  it("AC-3: Tab 라벨의 숫자는 formatNumber(천 단위 쉼표)를 거친다", () => {
    seed(Array.from({ length: 1200 }, (_, i) => make({ id: `bulk-${i}`, productName: `묶음${i}`, days: 3 })));
    renderHome();
    expect(screen.getByRole("tab", { name: "진행 중 1,200" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "보관함 0" })).toBeTruthy();
  });

  it("AC-4[P0]: 저장된 건이 0개면 EmptyState와 '첫 주문 등록하기'만 보이고 SummaryHero·Tab·SubmitFooter는 없다", () => {
    renderHome();
    expect(screen.getByText("아직 등록한 주문이 없어요")).toBeTruthy();
    expect(screen.getByText("받은 날만 넣으면 반품 마감일을 계산해 드려요")).toBeTruthy();
    expect(screen.getByRole("button", { name: "첫 주문 등록하기" })).toBeTruthy();
    expect(screen.queryByTestId("home-summary")).toBeNull();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "반품 건 추가" })).toBeNull();
  });

  it("AC-4: 보관함 탭이 비어 있으면 '보관함이 비어 있어요'가 보인다", () => {
    seed(threeActive());
    renderHome();
    goArchive();
    expect(screen.getByText("보관함이 비어 있어요")).toBeTruthy();
    expect(rows()).toHaveLength(0);
  });

  it("AC-5[P0]: 첫 읽기 전 렌더는 Skeleton 막대 3개뿐이고 Tab·ListRow는 0개다", () => {
    seed(threeActive());
    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(Home)),
    );
    expect((html.match(/data-skeleton="true"/g) ?? []).length).toBe(3);
    expect(html).not.toContain('role="tab"');
    expect(html).not.toContain("<li");
    expect(html).not.toContain("무선 청소기");
  });

  it("AC-5[P0]: loadItems가 StoreReadError를 던지면 오류 문구와 '다시 시도'가 보이고 누르면 reloadItems로 다시 읽는다", () => {
    localStorage.setItem(STORAGE_KEY, "{손상된 JSON");
    renderHome();
    expect(screen.getByText(LOAD_ERROR)).toBeTruthy();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(rows()).toHaveLength(0);
    const retry = screen.getByRole("button", { name: "다시 시도" });
    // 저장소를 복구한 뒤 다시 시도
    seed([make({ productName: "복구된 상품", days: 4 })]);
    fireEvent.click(retry);
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
    expect(rowTexts()).toHaveLength(1);
    expect(rowTexts()[0]).toContain("복구된 상품");
  });

  it("AC-6[P0]: ListRow를 탭하면 /result/{id}로 이동한다", () => {
    seed(threeActive());
    renderHome();
    const target = rows().find((r) => (r.textContent ?? "").includes("러닝화"))!;
    fireEvent.click(target);
    const viaSpy = mockNavigate.mock.calls.some((c) => c[0] === "/result/a2");
    const viaRouter = screen.queryByText("상세 화면") !== null; // useLinkClickHandler 경로
    expect(viaSpy || viaRouter).toBe(true);
    expect(mockNavigate.mock.calls.every((c) => c[0] === "/result/a2")).toBe(true);
  });

  it("AC-7[P0]: '반품 건 추가'는 create 시트를 열고 저장에 성공하면 시트가 닫히며 새 줄이 즉시 보인다", () => {
    seed([make({ productName: "기존 상품", days: 4 })]);
    renderHome();
    expect(rows()).toHaveLength(1);
    expect(screen.queryByLabelText("상품명")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "반품 건 추가" }));
    fireEvent.change(screen.getByLabelText("상품명"), { target: { value: "새로 산 모니터" } });
    fireEvent.change(screen.getByLabelText("구매처"), { target: { value: "지마켓" } });
    fireEvent.click(screen.getByRole("button", { name: "단순 변심 7일" }));
    fireEvent.click(screen.getByRole("button", { name: "저장하기" }));
    expect(screen.queryByLabelText("상품명")).toBeNull();
    expect(rows()).toHaveLength(2);
    expect(rowTexts().some((t) => t.includes("새로 산 모니터") && t.includes("지마켓 · 10월 15일 (목)") && t.includes("D-7"))).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toHaveLength(2);
  });

  it("AC-8[P0]: AdSlot은 목록 아래에 1개만 있고 ListRow 사이에는 없다", () => {
    seed(threeActive());
    renderHome();
    const slots = screen.getAllByTestId("ad-slot");
    expect(slots).toHaveLength(1);
    const lis = rows();
    const lastRow = lis[lis.length - 1];
    expect(lastRow.compareDocumentPosition(slots[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(lis.some((li) => li.contains(slots[0]))).toBe(false);
    expect(document.querySelector("ul, [data-testid='home-list']")?.contains(slots[0]) ?? false).toBe(false);
  });

  it("AC-8[P0]: AdSlot이 렌더 중 throw해도 화면은 그대로이고 오류 문구·광고 DOM이 없다", () => {
    ad.throws = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    seed(threeActive());
    renderHome();
    expect(screen.getByText("오늘 마감 1건 · 3일 안에 1건")).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(rows()).toHaveLength(3);
    expect(screen.getByRole("button", { name: "반품 건 추가" })).toBeTruthy();
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
    expect(screen.queryByText(/오류|문제가 발생/)).toBeNull();
    expect(screen.queryByTestId("ad-slot")).toBeNull();
    expect(screen.queryByText("광고")).toBeNull();
  });

  it("AC-9: VITE_TOSS_AD_GROUP_ID가 빈 값이어도 같은 화면이고 광고 영역 DOM은 비어 있다", () => {
    vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "");
    seed(threeActive());
    renderHome();
    expect(screen.getByText("오늘 마감 1건 · 3일 안에 1건")).toBeTruthy();
    expect(rows()).toHaveLength(3);
    expect(screen.getByRole("button", { name: "반품 건 추가" })).toBeTruthy();
    expect(screen.queryByTestId("ad-slot")).toBeNull();
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
  });

  it("AdBoundary: 자식이 throw하면 null을 렌더하고 정상이면 자식을 그대로 렌더한다", () => {
    expect(AdBoundary.getDerivedStateFromError()).toEqual({ failed: true });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Boom = () => {
      throw new Error("boom");
    };
    const failed = render(
      React.createElement("div", { "data-testid": "wrap" }, React.createElement(AdBoundary, null, React.createElement(Boom))),
    );
    expect(failed.getByTestId("wrap").innerHTML).toBe("");
    failed.unmount();
    const ok = render(
      React.createElement("div", { "data-testid": "wrap" }, React.createElement(AdBoundary, null, React.createElement("p", null, "정상 광고"))),
    );
    expect(ok.getByTestId("wrap").textContent).toBe("정상 광고");
  });
});
