import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import type { ItemFormInput, ReturnItem } from "@/lib/types";
import { validateForm } from "@/lib/validateForm";
import { ItemFormSheet } from "@/components/ItemFormSheet";

mockTds();
mockAppsInToss();

const TODAY = "2026-10-08";
const STORAGE_KEY = "rwb:items:v1";
const FAIL_HINT = "저장하지 못했어요. 보관함의 지난 건을 삭제한 뒤 다시 시도해 주세요";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T09:00:00+09:00"));
  localStorage.clear();
});

function input(over: Partial<ItemFormInput> = {}): ItemFormInput {
  return {
    productName: "무선 청소기",
    store: "쿠팡",
    receivedDate: "2026-10-05",
    useStartDate: "",
    rule: "change_of_mind_7d",
    storePolicyDays: "",
    ...over,
  };
}

function makeItem(over: Partial<ReturnItem> = {}): ReturnItem {
  return {
    id: "item-1",
    productName: "무선 청소기",
    store: "쿠팡",
    receivedDate: "2026-10-05",
    rule: "change_of_mind_7d",
    checklist: [],
    status: "active",
    createdAt: "2026-10-05T09:00:00+09:00",
    ...over,
  };
}

function renderSheet(props: Record<string, unknown> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    React.createElement(
      MemoryRouter,
      null,
      // recentStores는 props로 받든 저장소에서 파생하든 통과하도록 둘 다 열어 둔다
      React.createElement(ItemFormSheet as React.ComponentType<any>, {
        open: true,
        mode: "create",
        recentStores: [],
        onClose,
        onSaved,
        ...props,
      }),
    ),
  );
  return { onClose, onSaved };
}

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const saveButton = () => screen.getByRole("button", { name: "저장하기" }) as HTMLButtonElement;
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });

function fillValid() {
  type("상품명", "무선 청소기");
  type("구매처", "쿠팡");
  fireEvent.click(screen.getByRole("button", { name: "단순 변심 7일" }));
}

describe("ItemFormSheet — 등록·수정 공용 BottomSheet + 검증", () => {
  it("AC-1: create 첫 열기는 수령일만 오늘로 채워지고 에러·저장 모두 막힌다", () => {
    renderSheet();
    expect(field("수령일").value).toBe(TODAY);
    expect(field("상품명").value).toBe("");
    expect(field("구매처").value).toBe("");
    expect(document.querySelectorAll('input[aria-invalid="true"]')).toHaveLength(0);
    expect(saveButton().disabled).toBe(true);
    expect(screen.getByText("상품명을 입력해 주세요")).toBeTruthy();
  });

  it("AC-2: firstHint는 상품명→구매처→수령일→기한 유형→일수 순서의 첫 빈 항목 문구다", () => {
    const hint = (over: Partial<ItemFormInput>) => validateForm(input(over), TODAY).firstHint;
    expect(hint({ productName: "", store: "" })).toBe("상품명을 입력해 주세요");
    expect(hint({ store: "" })).toBe("구매처를 입력해 주세요");
    expect(hint({ receivedDate: "" })).toBe("수령일을 선택해 주세요");
    expect(hint({ rule: null })).toBe("기한 유형을 선택해 주세요");
    expect(hint({ rule: "store_policy_days", storePolicyDays: "" })).toBe("구매처 반품 기한을 입력해 주세요");
    const ok = validateForm(input(), TODAY);
    expect(ok.valid).toBe(true);
    expect(ok.firstHint).toBeUndefined();
  });

  it("AC-3: 범위 오류는 해당 칸 문구를 fieldErrors에 담고 valid=false다", () => {
    const err = (over: Partial<ItemFormInput>) => validateForm(input(over), TODAY);
    expect(err({ productName: "가".repeat(41) }).fieldErrors.productName).toBe("40자 이내로 입력해 주세요");
    expect(err({ productName: "가".repeat(40) }).valid).toBe(true);
    for (const days of ["0", "366", "2.5", "abc"]) {
      const r = err({ rule: "store_policy_days", storePolicyDays: days });
      expect(r.fieldErrors.storePolicyDays).toBe("1~365일 사이 숫자로 입력해 주세요");
      expect(r.valid).toBe(false);
    }
    expect(err({ receivedDate: "2026-10-09" }).fieldErrors.receivedDate).toBe("수령일은 오늘 이후일 수 없어요");
    expect(err({ useStartDate: "2026-10-04" }).fieldErrors.useStartDate).toBe("사용 시작일은 수령일 이후여야 해요");
  });

  it("AC-3: 화면에서 상품명 41자를 넣으면 빨간 칸 + help 문구가 뜨고 저장이 비활성이다", () => {
    renderSheet();
    fillValid();
    expect(saveButton().disabled).toBe(false);
    type("상품명", "가".repeat(41));
    fireEvent.blur(field("상품명"));
    expect(screen.getAllByText("40자 이내로 입력해 주세요").length).toBeGreaterThanOrEqual(1);
    expect(field("상품명").getAttribute("aria-invalid")).toBe("true");
    expect(saveButton().disabled).toBe(true);
  });

  it("AC-1: blur 전에는 빨간 칸이 없고, 빈 칸을 blur한 뒤에만 에러가 표시된다", () => {
    renderSheet();
    expect(field("상품명").getAttribute("aria-invalid")).toBeNull();
    fireEvent.blur(field("상품명"));
    expect(field("상품명").getAttribute("aria-invalid")).toBe("true");
    expect(field("구매처").getAttribute("aria-invalid")).toBeNull();
  });

  it("AC-4: '구매처 정책' 칩을 선택했을 때만 일수 칸이 렌더링된다", () => {
    renderSheet();
    expect(screen.queryByLabelText("구매처 반품 기한(일)")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "단순 변심 7일" }));
    expect(screen.queryByLabelText("구매처 반품 기한(일)")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "구매처 정책" }));
    expect(screen.getByLabelText("구매처 반품 기한(일)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "구매처 정책" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("AC-5: 유효한 입력이면 '마감: 10월 8일 (목) · D-DAY' 미리보기가 보인다", () => {
    renderSheet();
    expect(screen.queryByText(/^마감:/)).toBeNull();
    fillValid();
    type("수령일", "2026-10-01");
    expect(screen.getByText("마감: 10월 8일 (목) · D-DAY")).toBeTruthy();
    type("수령일", "2026-10-05");
    expect(screen.getByText("마감: 10월 12일 (월) · D-4")).toBeTruthy();
  });

  it("AC-6: 최근 구매처 칩은 최대 5개, 탭하면 구매처 값이 된다. 0개면 칩 영역이 없다", () => {
    const stores = ["쿠팡", "11번가", "무신사", "올리브영", "오늘의집", "마켓컬리", "SSG"];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        stores.map((s, i) => makeItem({ id: `i${i}`, store: s, createdAt: `2026-10-0${i + 1}T09:00:00+09:00` })),
      ),
    );
    renderSheet({ recentStores: stores.slice(0, 5) });
    const group = screen.getAllByRole("group").find((g) => g.getAttribute("data-kind") === "action")!;
    expect(within(group).getAllByRole("button")).toHaveLength(5);
    fireEvent.click(within(group).getAllByRole("button")[1]);
    expect(field("구매처").value).toBe(stores[1]);
  });

  it("AC-6: 최근 구매처가 없으면 action Chip 영역이 DOM에 없다", () => {
    renderSheet({ recentStores: [] });
    expect(document.querySelector('[data-kind="action"]')).toBeNull();
    expect(screen.getAllByRole("group")).toHaveLength(1);
  });

  it("AC-7: edit 모드는 기존 값을 채우고, 저장하면 updateItem 결과로 onSaved를 부른다", () => {
    const item = makeItem({ rule: "store_policy_days", storePolicyDays: 30, useStartDate: "2026-10-06" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));
    const { onSaved } = renderSheet({ mode: "edit", initial: item });
    expect(field("상품명").value).toBe("무선 청소기");
    expect(field("구매처").value).toBe("쿠팡");
    expect(field("수령일").value).toBe("2026-10-05");
    expect(field("사용 시작일").value).toBe("2026-10-06");
    expect(field("구매처 반품 기한(일)").value).toBe("30");
    type("상품명", "로봇 청소기");
    fireEvent.click(saveButton());
    expect(onSaved).toHaveBeenCalledTimes(1);
    const saved = onSaved.mock.calls[0][0] as ReturnItem;
    expect(saved.id).toBe("item-1");
    expect(saved.productName).toBe("로봇 청소기");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as ReturnItem[];
    expect(stored[0].productName).toBe("로봇 청소기");
  });

  it("AC-7: 저장 성공 후 시트가 닫힌다 (onSaved 뒤 onClose)", () => {
    const { onSaved, onClose } = renderSheet();
    fillValid();
    fireEvent.click(saveButton());
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect((onSaved.mock.calls[0][0] as ReturnItem).productName).toBe("무선 청소기");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });

  it("AC-8: StoreWriteError면 시트·입력값이 유지되고 실패 hint가 뜨며, 입력을 바꾸면 사라진다", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    const { onSaved, onClose } = renderSheet();
    fillValid();
    fireEvent.click(saveButton());
    expect(screen.getByText(FAIL_HINT)).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(field("상품명").value).toBe("무선 청소기");
    expect(field("구매처").value).toBe("쿠팡");
    expect(saveButton().disabled).toBe(false);
    type("상품명", "무선 청소기 V2");
    expect(screen.queryByText(FAIL_HINT)).toBeNull();
    spy.mockRestore();
  });

  it("AC-9: TextField focus 시 scrollIntoView({block:'center'})가 호출되고 칸·칩에 aria-label이 있다", () => {
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    renderSheet({ recentStores: ["쿠팡"] });
    fireEvent.focus(field("상품명"));
    expect(scroll).toHaveBeenCalledWith({ block: "center" });
    fireEvent.click(screen.getByRole("button", { name: "구매처 정책" }));
    const inputs = Array.from(document.querySelectorAll("input"));
    expect(inputs.length).toBeGreaterThanOrEqual(5);
    for (const el of inputs) expect(el.getAttribute("aria-label")).toBeTruthy();
    const chips = Array.from(document.querySelectorAll('[role="group"] button'));
    expect(chips.length).toBe(4);
    for (const el of chips) expect(el.getAttribute("aria-label")).toBeTruthy();
  });
});
