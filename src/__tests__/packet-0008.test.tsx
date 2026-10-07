import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import type { ReturnItem } from "@/lib/types";
import App from "@/App";

mockTds();
mockAppsInToss();

const STORAGE_KEY = "rwb:items:v1";

function makeItem(id: string, productName: string): ReturnItem {
  return {
    id,
    productName,
    store: "쿠팡",
    receivedDate: "2026-10-05",
    rule: "change_of_mind_7d",
    checklist: [{ id: `${id}-c1`, label: "택배 박스 보관", done: false }],
    status: "active",
    createdAt: "2026-10-05T09:00:00+09:00",
  };
}

function seed(items: ReturnItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="probe">{loc.pathname}</div>;
}

function renderApp(entry: string | { pathname: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry as string]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T09:00:00+09:00"));
  seed([makeItem("item-a", "무선 청소기"), makeItem("item-b", "러닝화 270")]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Routing & Integration — App 라우트 연결과 검수 점검", () => {
  it("AC-1[P0]: '/'는 Home을 렌더하고 ListRow 탭 시 /result/{id}로 이동해 해당 건을 보여준다", async () => {
    renderApp("/");
    expect(screen.getByTestId("probe").textContent).toBe("/");
    const row = await screen.findByText("무선 청소기");
    expect(row).toBeInTheDocument();
    expect(screen.getByText("러닝화 270")).toBeInTheDocument();

    fireEvent.click(screen.getByText("러닝화 270"));

    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("/result/item-b"));
    expect(await screen.findByText(/러닝화 270/)).toBeInTheDocument();
    expect(screen.queryByText("무선 청소기")).toBeNull();
  });

  it("AC-1[P0]: 알 수 없는 경로는 '/'로 replace 이동한다", async () => {
    renderApp("/unknown");
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("/"));
    expect(await screen.findByText("무선 청소기")).toBeInTheDocument();
  });

  it("AC-1[P0]: 옛 '/result'(id 없음)도 '/'로 이동한다", async () => {
    renderApp("/result");
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("/"));
    expect(screen.queryByTestId("probe")?.textContent).not.toMatch(/^\/result/);
  });

  it("AC-2[P0]: /result/{id} 직접 진입(새로고침)에도 location.state 없이 같은 건이 표시된다", async () => {
    renderApp({ pathname: "/result/item-a" });
    expect(await screen.findByText(/무선 청소기/)).toBeInTheDocument();
    expect(screen.getByTestId("probe").textContent).toBe("/result/item-a");
    expect(screen.queryByText(/러닝화 270/)).toBeNull();
  });

  it("AC-2[P0]: 저장소에 없는 id는 크래시 없이 처리된다(홈 이동 또는 빈 상태)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderApp("/result/ghost-id");
    await waitFor(() => expect(document.body.textContent?.length ?? 0).toBeGreaterThan(0));
    expect(screen.queryByText(/무선 청소기/)).toBeNull();
    expect(errSpy).not.toHaveBeenCalled();
  });

  it("AC-5[P1]: 홈 → 상세 → 홈 흐름에서 console.error가 0건이다", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = renderApp("/");
    fireEvent.click(await screen.findByText("무선 청소기"));
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("/result/item-a"));
    await screen.findByText(/무선 청소기/);
    unmount();
    renderApp("/nowhere");
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("/"));
    expect(errSpy).toHaveBeenCalledTimes(0);
    expect(errSpy.mock.calls).toEqual([]);
  });
});

// ── 정적 점검 (AC-3, AC-4) ──
const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "__tests__") continue;
      walk(p, out);
    } else if (/\.(tsx?|css)$/.test(name) && !name.startsWith("__TdsGallery")) {
      out.push(p);
    }
  }
  return out;
}

function hits(files: string[], re: RegExp): string[] {
  const found: string[] = [];
  for (const f of files) {
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (re.test(line)) found.push(`${relative(SRC, f)}:${i + 1}: ${line.trim()}`);
      });
  }
  return found;
}

describe("AC-3: 검수 반려 항목 grep 0건", () => {
  const files = walk(SRC);

  it.each([
    ["색상 HEX", /#[0-9a-fA-F]{3,6}\b/],
    ['href="http', /href="http/],
    ["window 팝업 열기", new RegExp(["window", "open"].join("\\."))],
    ["location 대입 이동", new RegExp(["location", "href"].join("\\.") + "\\s*=")],
    ["외부 분석 SDK", /amplitude|gtag|google-analytics/],
    ["fetch( / axios", /fetch\(|axios/],
  ])("AC-3[P0]: %s 0건", (_name, re) => {
    expect(hits(files, re)).toEqual([]);
  });

  it("AC-3[P0]: src/pages 안에 TossRewardAd 0건", () => {
    const pages = walk(join(SRC, "pages"));
    expect(pages.length).toBeGreaterThan(0);
    expect(hits(pages, /TossRewardAd/)).toEqual([]);
  });
});

/** JSX 여는 태그 전체 텍스트를 중괄호 깊이를 세며 추출 (화살표 함수의 `>` 오인 방지) */
function openingTags(src: string, names: string[]): { tag: string; line: number }[] {
  const out: { tag: string; line: number }[] = [];
  const re = new RegExp(`<(${names.join("|")})(?=[\\s/>])`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let depth = 0;
    let i = m.index;
    let quote = "";
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) { if (c === quote) quote = ""; continue; }
      if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    out.push({ tag: src.slice(m.index, i + 1), line: src.slice(0, m.index).split("\n").length });
  }
  return out;
}

describe("AC-4: 접근성·인라인 크기 스타일", () => {
  // 템플릿이 미리 깔아 둔 레이아웃 래퍼(자체 padding 등)는 점검 대상이 아니다 — 이 앱이 만든 페이지·컴포넌트만 본다.
  const TEMPLATE = new Set([
    "Amount", "BottomCTA", "Card", "CountUp", "FloatingTabBar", "MiniBar", "PageShell",
    "ScreenScaffold", "Sparkline", "StateView", "SummaryHero", "AdSlot", "TossPurchase", "TossRewardAd",
  ]);
  const files = [...walk(join(SRC, "pages")), ...walk(join(SRC, "components"))]
    .filter((f) => f.endsWith(".tsx"))
    .filter((f) => !TEMPLATE.has(f.split("/").pop()!.replace(".tsx", "")));

  it("AC-4[P0]: Button·TextField·ChipItem·Switch에 aria-label이 있다", () => {
    const missing: string[] = [];
    for (const f of files) {
      for (const { tag, line } of openingTags(readFileSync(f, "utf8"), ["Button", "TextField", "ChipItem", "Switch"])) {
        if (!/aria-label\s*=/.test(tag) && !/\{\.\.\.\w+\}/.test(tag)) missing.push(`${relative(SRC, f)}:${line}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("AC-4[P0]: 크기를 덮어쓰는 width/height/padding 인라인 스타일이 0건이다(Skeleton height 예외)", () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const re = /style=\{\{([^}]*)\}\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const body = m[1];
        const sizeProps = [...body.matchAll(/\b(width|height|minWidth|minHeight|maxWidth|maxHeight|padding\w*)\s*:/g)].map((x) => x[1]);
        const nonSkeleton = sizeProps.filter((p) => !(p === "height" && /Skeleton|skeleton/.test(src.slice(Math.max(0, m!.index - 300), m!.index))));
        if (nonSkeleton.length) bad.push(`${relative(SRC, f)}:${src.slice(0, m.index).split("\n").length} ${nonSkeleton.join(",")}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
