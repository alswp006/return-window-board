import type { ItemFormInput, ItemStatus, ReturnItem } from './types';
import { STORAGE_KEY } from './types';
import { newId, seedChecklist } from './checklistPresets';

export class StoreReadError extends Error {
  constructor(message = '저장된 목록을 불러오지 못했어요') {
    super(message);
    this.name = 'StoreReadError';
  }
}

export class StoreWriteError extends Error {
  constructor(message = '저장하지 못했어요') {
    super(message);
    this.name = 'StoreWriteError';
  }
}

export class ItemNotFoundError extends Error {
  constructor(id: string) {
    super(`item not found: ${id}`);
    this.name = 'ItemNotFoundError';
  }
}

// @AI:NOTE 메모리 캐시는 마지막으로 읽거나 쓴 원문(raw)과 짝을 이룬다.
// 저장소 원문이 그대로면 다시 파싱하지 않고, 다르면(다른 탭·초기화) 다시 읽는다.
let cache: { raw: string | null; items: ReturnItem[] } | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new StoreReadError();
  }
}

function parse(raw: string | null): ReturnItem[] {
  if (raw === null || raw === '') return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new StoreReadError();
  }
  if (!Array.isArray(data)) throw new StoreReadError();
  return data as ReturnItem[];
}

/** 캐시를 우선 쓴다. 손상된 JSON이면 StoreReadError — 저장소 원문은 덮어쓰지 않는다. */
export function loadItems(): ReturnItem[] {
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.items;
  const items = parse(raw);
  cache = { raw, items };
  return items;
}

/** 캐시를 무시하고 저장소를 다시 읽는다 (다시 시도 버튼). */
export function reloadItems(): ReturnItem[] {
  cache = null;
  return loadItems();
}

export function getItem(id: string): ReturnItem | undefined {
  return loadItems().find((it) => it.id === id);
}

export const findItem = getItem;

/** 새 배열을 다 만든 뒤 한 번만 쓴다. 실패하면 캐시·저장소 모두 실패 전 그대로다. */
function commit(next: ReturnItem[]): void {
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    throw new StoreWriteError();
  }
  cache = { raw, items: next };
}

function replaceItem(id: string, change: (item: ReturnItem) => ReturnItem): ReturnItem {
  const items = loadItems();
  const idx = items.findIndex((it) => it.id === id);
  if (idx < 0) throw new ItemNotFoundError(id);
  const updated = change(items[idx]);
  const next = items.slice();
  next[idx] = updated;
  commit(next);
  return updated;
}

function fieldsFromInput(input: ItemFormInput) {
  const rule = input.rule ?? 'change_of_mind_7d';
  const days = rule === 'store_policy_days' ? Number(input.storePolicyDays.trim()) : undefined;
  const useStart = input.useStartDate.trim();
  return {
    productName: input.productName.trim(),
    store: input.store.trim(),
    receivedDate: input.receivedDate,
    useStartDate: useStart === '' ? undefined : useStart,
    rule,
    storePolicyDays: days,
  };
}

export function addItem(input: ItemFormInput): ReturnItem {
  const items = loadItems();
  const fields = fieldsFromInput(input);
  const item: ReturnItem = {
    id: newId('item'),
    ...fields,
    checklist: seedChecklist(fields.rule),
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  commit([...items, item]);
  return item;
}

/** 입력 필드만 바꾼다 — 체크리스트·상태·등록 시각은 그대로 */
export function updateItem(id: string, input: ItemFormInput): ReturnItem {
  return replaceItem(id, (item) => ({ ...item, ...fieldsFromInput(input) }));
}

export function deleteItem(id: string): void {
  const items = loadItems();
  commit(items.filter((it) => it.id !== id));
}

export function setStatus(id: string, status: ItemStatus): ReturnItem {
  return replaceItem(id, (item) => {
    const next: ReturnItem = { ...item, status };
    if (status === 'active') delete next.closedAt;
    else next.closedAt = new Date().toISOString();
    return next;
  });
}

export function toggleCheck(id: string, checkId: string): ReturnItem {
  return replaceItem(id, (item) => ({
    ...item,
    checklist: item.checklist.map((c) => (c.id === checkId ? { ...c, done: !c.done } : c)),
  }));
}

export const CHECK_LABEL_MAX = 30;

export function addCheck(id: string, label: string): ReturnItem {
  const trimmed = label.trim();
  if (trimmed.length < 1 || trimmed.length > CHECK_LABEL_MAX) {
    throw new RangeError('label must be 1~30 chars');
  }
  return replaceItem(id, (item) => ({
    ...item,
    checklist: [...item.checklist, { id: newId('chk'), label: trimmed, done: false }],
  }));
}

export function removeCheck(id: string, checkId: string): ReturnItem {
  return replaceItem(id, (item) => ({
    ...item,
    checklist: item.checklist.filter((c) => c.id !== checkId),
  }));
}

/** 최근 등록순으로 공백 제거·중복 제거한 구매처 최대 5개 */
export function recentStores(items: ReturnItem[]): string[] {
  const sorted = items
    .map((it, i) => ({ it, i }))
    .sort((a, b) =>
      a.it.createdAt !== b.it.createdAt ? (a.it.createdAt < b.it.createdAt ? 1 : -1) : b.i - a.i,
    );
  const out: string[] = [];
  for (const { it } of sorted) {
    const name = it.store.trim();
    if (name && !out.includes(name)) out.push(name);
    if (out.length === 5) break;
  }
  return out;
}
