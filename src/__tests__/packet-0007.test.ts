import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { mockTds, mockAppsInToss, mockAnalytics, mockNavigate, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import type { ReturnItem } from "@/lib/types";
import { ARCHIVE_LABEL, COST_LINE, MESSAGES, RULE_NOTICE } from "@/lib/types";
import Result from "@/pages/Result";

mockTds();
mockAppsInToss();
mockAnalytics();

const ad = vi.hoisted(() => ({ throws: false }));
vi.mock("@/components/AdSlot", () => ({
  AdSlot: () => {
    if (ad.throws) throw new Error("ad render failed");
    return React.createElement("div", { "data-testid": "ad-slot" }, "광고");
  },
}));

const STORAGE_KEY = "rwb:items:v1";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T09:00:00+09:00")); // 목요일
  vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "ad-group-from-console");
  ad.throws = false;
  mockNavigate.mockClear();
  mockOpenToast.mockClear();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function make(over: Partial<ReturnItem> = {}): ReturnItem {
  return {
    id: "item-1",
    productName: "블루투스 이어폰",
    store: "쿠팡",
    receivedDate: "2026-10-01",
    rule: "change_of_mind_7d",
    checklist: [
      { id: "c1", label: "구성품 확인", done: false },
      { id: "c2", label: "포장 상자 보관", done: true },
    ],
    status: "active",
    createdAt: "2026-10-01T09:00:00+09:00",
    ...over,
  };
}

const seed = (items: ReturnItem[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
const stored = (): ReturnItem[] => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");

function tree(id: string) {
  return React.createElement(
    MemoryRouter,
    { initialEntries: [`/result/${id}`] },
    React.createElement(
      Routes,
      null,
      React.createElement(Route, { path: "/result/:id", element: React.createElement(Result) }),
    ),
  );
}
const renderResult = (id = "item-1") => render(tree(id));

function failWrites() {
  return vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("quota", "QuotaExceededError");
  });
}
const toastShown = (text: string) =>
  mockOpenToast.mock.calls.some((c) => String(c[0]?.text ?? c[0]).includes(text)) ||
  screen.queryByText(text) !== null;
const btn = (name: string) => screen.getByRole("button", { name });
const hasBtn = (name: string) => screen.queryByRole("button", { name }) !== null;

describe("Result Page — 상세 (핵심 답·기한 안내·상태·수정·삭제)", () => {
  it("AC-1[P0]: Top에 상품명, SummaryHero에 D-day와 '마감' 날짜, 그 아래 적용 규칙 출처가 보인다", () => {
    seed([make()]);
    renderResult();
    expect(screen.getAllByText("블루투스 이어폰").length).toBeGreaterThan(0);
    expect(screen.getByText("D-DAY")).toBeInTheDocument();
    expect(screen.getByText("10월 8일 (목) 마감")).toBeInTheDocument();
    expect(screen.getByText("수령일부터 7일 · 전자상거래법 제17조 ①")).toBeInTheDocument();
  });

  it("AC-1[P0]: 구매처 정책 건은 '구매처 정책 30일 · 구매처 안내 기준'과 D-23을 보인다", () => {
    seed([make({ rule: "store_policy_days", storePolicyDays: 30 })]);
    renderResult();
    expect(screen.getByText("구매처 정책 30일 · 구매처 안내 기준")).toBeInTheDocument();
    expect(screen.getByText("D-23")).toBeInTheDocument();
    expect(screen.getByText("10월 31일 (토) 마감")).toBeInTheDocument();
  });

  it("AC-2[P1]: 사용 시작일이 더 늦으면 3일 빨라진다는 안내를, 없거나 같으면 한 줄 안내만 보인다", () => {
    const line =
      "사용 시작일로 세면 10월 11일 (일)이지만, 기한은 수령일부터 세서 실제 마감은 10월 8일 (목)이에요 — 3일 빨라요";
    seed([make({ useStartDate: "2026-10-04" })]);
    const first = renderResult();
    expect(screen.getByText(line)).toBeInTheDocument();
    expect(screen.queryByText("기한은 상품을 받은 날부터 세요")).toBeNull();
    first.unmount();

    for (const useStartDate of [undefined, "2026-10-01"]) {
      seed([make({ useStartDate })]);
      const v = renderResult();
      expect(screen.getByText("기한은 상품을 받은 날부터 세요")).toBeInTheDocument();
      expect(screen.queryByText(line)).toBeNull();
      v.unmount();
    }
  });

  it("AC-3[P1]: 유형별 안내는 RULE_NOTICE·COST_LINE과 글자 단위로 같다 (7d는 ②만, 3m은 30일 조건만, policy는 둘 다 없음)", () => {
    const notice7 = RULE_NOTICE.change_of_mind_7d as string;
    const notice3m = RULE_NOTICE.mismatch_3m as string;

    seed([make({ rule: "change_of_mind_7d" })]);
    let v = renderResult();
    expect(screen.getByText(notice7)).toBeInTheDocument();
    expect(screen.queryByText(notice3m)).toBeNull();
    expect(screen.getByText(COST_LINE.change_of_mind_7d)).toBeInTheDocument();
    v.unmount();

    seed([make({ rule: "mismatch_3m", receivedDate: "2026-09-20" })]);
    v = renderResult();
    expect(screen.getByText(notice3m)).toBeInTheDocument();
    expect(screen.queryByText(notice7)).toBeNull();
    expect(screen.getByText(COST_LINE.mismatch_3m)).toBeInTheDocument();
    v.unmount();

    seed([make({ rule: "store_policy_days", storePolicyDays: 30 })]);
    v = renderResult();
    expect(screen.queryByText(notice7)).toBeNull();
    expect(screen.queryByText(notice3m)).toBeNull();
    expect(screen.getByText(COST_LINE.store_policy_days)).toBeInTheDocument();
  });

  it("AC-4[P0]: 진행 중·미만료 건은 두 상태 버튼이 보이고, 누르면 저장되고 화면에 머문 채 히어로 라벨이 바뀐다", () => {
    seed([make()]);
    renderResult();
    expect(screen.getByText("반품 마감까지")).toBeInTheDocument();
    expect(hasBtn(ARCHIVE_LABEL.returned)).toBe(true);
    expect(hasBtn(ARCHIVE_LABEL.kept)).toBe(true);
    expect(hasBtn("진행 중으로 되돌리기")).toBe(false);

    fireEvent.click(btn(ARCHIVE_LABEL.returned));
    expect(stored()[0].status).toBe("returned");
    expect(screen.queryByText("반품 마감까지")).toBeNull();
    expect(screen.getByText(ARCHIVE_LABEL.returned)).toBeInTheDocument();
    expect(hasBtn("진행 중으로 되돌리기")).toBe(true);
    expect(hasBtn(ARCHIVE_LABEL.kept)).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(btn("진행 중으로 되돌리기"));
    expect(stored()[0].status).toBe("active");
    expect(screen.getByText("반품 마감까지")).toBeInTheDocument();
  });

  it("AC-4[P0]: 보관함 상태는 되돌리기만, 만료 건은 상태 버튼이 하나도 없다", () => {
    seed([make({ status: "kept" })]);
    const v = renderResult();
    expect(screen.getByText(ARCHIVE_LABEL.kept)).toBeInTheDocument();
    expect(hasBtn("진행 중으로 되돌리기")).toBe(true);
    expect(hasBtn(ARCHIVE_LABEL.returned)).toBe(false);
    expect(hasBtn(ARCHIVE_LABEL.kept)).toBe(false);
    v.unmount();

    seed([make({ receivedDate: "2026-09-20" })]); // 마감 9월 27일 — 지남
    renderResult();
    expect(screen.getByText("D+11")).toBeInTheDocument();
    expect(hasBtn(ARCHIVE_LABEL.returned)).toBe(false);
    expect(hasBtn(ARCHIVE_LABEL.kept)).toBe(false);
    expect(hasBtn("진행 중으로 되돌리기")).toBe(false);
  });

  it("AC-8[P0]: setStatus가 StoreWriteError면 버튼·라벨이 그대로이고 저장 실패 Toast가 뜬다", () => {
    seed([make()]);
    renderResult();
    failWrites();
    fireEvent.click(btn(ARCHIVE_LABEL.returned));
    expect(screen.getByText("반품 마감까지")).toBeInTheDocument();
    expect(hasBtn(ARCHIVE_LABEL.returned)).toBe(true);
    expect(hasBtn(ARCHIVE_LABEL.kept)).toBe(true);
    expect(hasBtn("진행 중으로 되돌리기")).toBe(false);
    expect(toastShown(MESSAGES.SAVE_FAIL_TOAST)).toBe(true);
    expect(stored()[0].status).toBe("active");
  });

  it("AC-5[P0]: '수정'은 edit 시트를 현재 값으로 열고, 저장하면 마감일·D-day·안내가 다시 계산된다", () => {
    seed([make()]);
    renderResult();
    expect(screen.getByText("D-DAY")).toBeInTheDocument();
    fireEvent.click(btn("수정"));
    expect(screen.getByText("반품 건 수정")).toBeInTheDocument();
    const name = screen.getByLabelText("상품명") as HTMLInputElement;
    expect(name.value).toBe("블루투스 이어폰");

    fireEvent.change(name, { target: { value: "노이즈캔슬링 헤드폰" } });
    fireEvent.click(btn("하자·광고와 다름 3개월"));
    fireEvent.click(btn("저장하기"));

    expect(stored()[0].productName).toBe("노이즈캔슬링 헤드폰");
    expect(stored()[0].rule).toBe("mismatch_3m");
    expect(screen.getAllByText("노이즈캔슬링 헤드폰").length).toBeGreaterThan(0);
    expect(screen.getByText("2027년 1월 1일 (금) 마감")).toBeInTheDocument();
    expect(screen.getByText("D-85")).toBeInTheDocument();
    expect(screen.getByText(RULE_NOTICE.mismatch_3m as string)).toBeInTheDocument();
    expect(screen.queryByText("반품 건 수정")).toBeNull();
  });

  it("AC-6[P0]: '삭제' → AlertDialog '이 건을 삭제할까요?' → '삭제하기'면 deleteItem 후 '/'로 이동한다", async () => {
    seed([make(), make({ id: "item-2", productName: "러닝화" })]);
    renderResult();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(btn("삭제"));
    expect(screen.getByRole("alertdialog", { name: "이 건을 삭제할까요?" })).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    fireEvent.click(btn("삭제하기"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(stored().map((i) => i.id)).toEqual(["item-2"]);
  });

  it("AC-7[P0]: deleteItem이 StoreWriteError면 이동하지 않고 다이얼로그가 닫히며 삭제 실패 Toast가 뜬다", async () => {
    seed([make()]);
    renderResult();
    fireEvent.click(btn("삭제"));
    failWrites();
    fireEvent.click(btn("삭제하기"));
    await waitFor(() => expect(toastShown(MESSAGES.DELETE_FAIL_TOAST)).toBe(true));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getAllByText("블루투스 이어폰").length).toBeGreaterThan(0);
    expect(screen.getByText("D-DAY")).toBeInTheDocument();
    expect(stored()).toHaveLength(1);
  });

  it("AC-9[P0]: id가 저장소에 없으면 '찾을 수 없는 건이에요'와 '목록으로'가 보이고 누르면 '/'로 이동한다", () => {
    seed([make()]);
    renderResult("nope");
    expect(screen.getByText(MESSAGES.NOT_FOUND)).toBeInTheDocument();
    expect(screen.queryByText("D-DAY")).toBeNull();
    fireEvent.click(btn("목록으로"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-9[P0]: 첫 읽기 전에는 Skeleton 3개만 보이고, StoreReadError면 오류 문구와 '다시 시도'가 보인다", () => {
    seed([make()]);
    // 서버 렌더는 effect 전 첫 프레임이다 — 읽기 전 상태
    const html = renderToStaticMarkup(tree("item-1"));
    expect((html.match(/data-skeleton="true"/g) ?? []).length).toBe(3);
    expect(html).not.toContain(MESSAGES.NOT_FOUND);
    expect(html).not.toContain(MESSAGES.LOAD_ERROR);

    localStorage.setItem(STORAGE_KEY, "{깨진 json");
    renderResult();
    expect(screen.getByText(MESSAGES.LOAD_ERROR)).toBeInTheDocument();
    expect(screen.queryByText(MESSAGES.NOT_FOUND)).toBeNull();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([make()]));
    fireEvent.click(btn("다시 시도"));
    expect(screen.getByText("D-DAY")).toBeInTheDocument();
    expect(screen.queryByText(MESSAGES.LOAD_ERROR)).toBeNull();
  });

  it("AC-10[P0]: 하단에 AdSlot이 정확히 1개 있고, 파일에 TossRewardAd가 없다", () => {
    seed([make()]);
    renderResult();
    expect(screen.getAllByTestId("ad-slot")).toHaveLength(1);
    expect(screen.getByTestId("checklist-card")).toBeInTheDocument();
    const src = readFileSync("src/pages/Result.tsx", "utf8");
    expect(src.match(/TossRewardAd/g) ?? []).toHaveLength(0);
  });

  it("AC-10[P0]: AdSlot이 throw해도 핵심 답·안내·체크리스트·상태 버튼이 그대로 보이고 오류 화면은 없다", () => {
    ad.throws = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    seed([make()]);
    renderResult();
    expect(screen.queryByTestId("ad-slot")).toBeNull();
    expect(screen.getByText("D-DAY")).toBeInTheDocument();
    expect(screen.getByText("10월 8일 (목) 마감")).toBeInTheDocument();
    expect(screen.getByText(COST_LINE.change_of_mind_7d)).toBeInTheDocument();
    expect(screen.getByTestId("checklist-card")).toBeInTheDocument();
    expect(hasBtn(ARCHIVE_LABEL.returned)).toBe(true);
    expect(screen.queryByText(MESSAGES.LOAD_ERROR)).toBeNull();
    expect(screen.queryByText(MESSAGES.NOT_FOUND)).toBeNull();
  });
});
