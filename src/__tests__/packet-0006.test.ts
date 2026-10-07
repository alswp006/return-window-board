import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React, { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import type { ReturnItem } from "@/lib/types";
import { ChecklistSection } from "@/components/ChecklistSection";

mockTds();
mockAppsInToss();

const STORAGE_KEY = "rwb:items:v1";
const FAIL_TOAST = "저장하지 못했어요. 다시 시도해 주세요";

function makeItem(over: Partial<ReturnItem> = {}): ReturnItem {
  return {
    id: "item-1",
    productName: "무선 청소기",
    store: "쿠팡",
    receivedDate: "2026-10-05",
    rule: "change_of_mind_7d",
    checklist: [
      { id: "c1", label: "상품 사진 찍기", done: true },
      { id: "c2", label: "구성품 확인", done: false },
      { id: "c3", label: "포장 상자 보관", done: false },
    ],
    status: "active",
    createdAt: "2026-10-05T09:00:00+09:00",
    ...over,
  };
}

function seed(item: ReturnItem) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));
}

function stored(): ReturnItem {
  return (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as ReturnItem[])[0];
}

// 부모처럼 onChange로 올라온 item을 다시 내려준다
function Host({ initial, onChange }: { initial: ReturnItem; onChange: (i: ReturnItem) => void }) {
  const [item, setItem] = useState(initial);
  return React.createElement(ChecklistSection as React.ComponentType<any>, {
    item,
    onChange: (next: ReturnItem) => {
      onChange(next);
      setItem(next);
    },
  });
}

function mount(item: ReturnItem) {
  seed(item);
  const onChange = vi.fn();
  const view = render(
    React.createElement(MemoryRouter, null, React.createElement(Host, { initial: item, onChange })),
  );
  return { onChange, view };
}

const sw = (name: string) => screen.getByRole("switch", { name }) as HTMLInputElement;
const input = () => screen.getByLabelText("새 체크 항목") as HTMLInputElement;
const addBtn = () => screen.getByRole("button", { name: "추가" }) as HTMLButtonElement;
const toastShown = () =>
  mockOpenToast.mock.calls.some((c) => String(c[0]?.text ?? c[0]).includes(FAIL_TOAST)) ||
  screen.queryByText(FAIL_TOAST) !== null;

let writeSpy: ReturnType<typeof vi.spyOn> | null = null;

function failWrites() {
  writeSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("quota", "QuotaExceededError");
  });
  return writeSpy;
}

// setItem 스파이가 다음 테스트의 seed까지 막지 않게 되돌린다
afterEach(() => {
  writeSpy?.mockRestore();
  writeSpy = null;
});

beforeEach(() => {
  localStorage.clear();
  mockOpenToast.mockClear();
});

describe("ChecklistSection — 환불 체크리스트 (토글·추가·삭제·롤백)", () => {
  it("AC-1: 토글하면 즉시 저장되고 Badge 숫자가 바뀐다", () => {
    const { onChange } = mount(makeItem());
    expect(screen.getByText("1/3 완료")).toBeInTheDocument();
    fireEvent.click(sw("구성품 확인"));
    expect(sw("구성품 확인").checked).toBe(true);
    expect(screen.getByText("2/3 완료")).toBeInTheDocument();
    expect(stored().checklist.map((c) => c.done)).toEqual([true, true, false]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].checklist[1].done).toBe(true);
  });

  it("AC-1: 리마운트해도 같은 체크 상태가 보인다", () => {
    const { view } = mount(makeItem());
    fireEvent.click(sw("포장 상자 보관"));
    view.unmount();
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(Host, { initial: stored(), onChange: vi.fn() }),
      ),
    );
    expect(sw("포장 상자 보관").checked).toBe(true);
    expect(sw("구성품 확인").checked).toBe(false);
    expect(screen.getByText("2/3 완료")).toBeInTheDocument();
  });

  it("AC-2: 비었거나 공백뿐이거나 30자 초과면 추가 버튼이 disabled다", () => {
    mount(makeItem());
    expect(addBtn().disabled).toBe(true);
    fireEvent.change(input(), { target: { value: "   " } });
    expect(addBtn().disabled).toBe(true);
    fireEvent.change(input(), { target: { value: "가".repeat(31) } });
    expect(addBtn().disabled).toBe(true);
    fireEvent.change(input(), { target: { value: "가".repeat(30) } });
    expect(addBtn().disabled).toBe(false);
  });

  it("AC-2: 1~30자를 추가하면 목록 끝에 생기고 입력칸이 비워진다", () => {
    const { onChange } = mount(makeItem());
    fireEvent.change(input(), { target: { value: "  영수증 챙기기  " } });
    fireEvent.click(addBtn());
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(4);
    expect(switches[3]).toHaveAttribute("aria-label", "영수증 챙기기");
    expect((switches[3] as HTMLInputElement).checked).toBe(false);
    expect(input().value).toBe("");
    expect(screen.getByText("1/4 완료")).toBeInTheDocument();
    expect(stored().checklist[3].label).toBe("영수증 챙기기");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("AC-3: 삭제하면 목록에서 사라지고 저장소에도 없다", () => {
    const { onChange } = mount(makeItem());
    fireEvent.click(screen.getByRole("button", { name: "구성품 확인 삭제" }));
    expect(screen.queryByRole("switch", { name: "구성품 확인" })).toBeNull();
    expect(screen.getAllByRole("switch")).toHaveLength(2);
    expect(stored().checklist.map((c) => c.id)).toEqual(["c1", "c3"]);
    expect(screen.getByText("1/2 완료")).toBeInTheDocument();
    expect(onChange.mock.calls[0][0].checklist).toHaveLength(2);
  });

  it("AC-4[P0]: 저장 실패 — 토글은 원래 위치와 숫자로 돌아가고 토스트가 뜬다", () => {
    const { onChange } = mount(makeItem());
    failWrites();
    fireEvent.click(sw("구성품 확인"));
    expect(sw("구성품 확인").checked).toBe(false);
    expect(screen.getByText("1/3 완료")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(toastShown()).toBe(true);
  });

  it("AC-4[P0]: 저장 실패 — 추가는 새 항목이 없고 입력값이 남는다", () => {
    const { onChange } = mount(makeItem());
    fireEvent.change(input(), { target: { value: "영수증 챙기기" } });
    failWrites();
    fireEvent.click(addBtn());
    expect(screen.getAllByRole("switch")).toHaveLength(3);
    expect(screen.queryByRole("switch", { name: "영수증 챙기기" })).toBeNull();
    expect(input().value).toBe("영수증 챙기기");
    expect(onChange).not.toHaveBeenCalled();
    expect(toastShown()).toBe(true);
  });

  it("AC-4[P0]: 저장 실패 — 삭제한 항목이 같은 자리에 다시 보인다", () => {
    const { onChange } = mount(makeItem());
    failWrites();
    fireEvent.click(screen.getByRole("button", { name: "구성품 확인 삭제" }));
    const names = screen.getAllByRole("switch").map((s) => s.getAttribute("aria-label"));
    expect(names).toEqual(["상품 사진 찍기", "구성품 확인", "포장 상자 보관"]);
    expect(screen.getByText("1/3 완료")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(toastShown()).toBe(true);
  });

  it("AC-5: 접근성 이름이 있고 완료 숫자는 formatNumber를 거친다", () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({
      id: `k${i}`,
      label: `항목 ${i}`,
      done: i < 3,
    }));
    mount(makeItem({ checklist: many }));
    expect(screen.getByText("3/1,000 완료")).toBeInTheDocument();
    expect(sw("항목 0")).toHaveAttribute("aria-label", "항목 0");
    expect(screen.getByRole("button", { name: "항목 5 삭제" })).toBeInTheDocument();
    expect(input()).toHaveAttribute("aria-label", "새 체크 항목");
    expect(within(document.body).getByRole("button", { name: "추가" })).toBeInTheDocument();
  }, 30000);
});
