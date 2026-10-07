import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  ReturnItem,
  ItemFormInput,
  ChecklistItem,
  DeadlineRule,
} from "@/lib/types";

/**
 * TDD Red Phase — Tests for Storage (itemsStore + checklistPresets)
 *
 * The source modules `src/lib/itemsStore.ts` and `src/lib/checklistPresets.ts`
 * do not yet exist. These tests define the expected behavior.
 *
 * Run: npx vitest run src/__tests__/packet-0003.test.ts
 * Expected: All tests fail (red phase).
 */

describe("Storage — itemsStore + 체크리스트 프리셋", () => {
  const STORAGE_KEY = "rwb:items:v1";

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ── AC-1: addItem — 기본 동작 ──
  describe("AC-1: addItem should add item with trim, id, createdAt, status, checklist", () => {
    it("should trim productName and store, add id/createdAt/status/checklist", async () => {
      const { addItem } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "  Galaxy S24  ",
        store: "  쿠팡  ",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const result = addItem(input);

      // productName/store should be trimmed
      expect(result.productName).toBe("Galaxy S24");
      expect(result.store).toBe("쿠팡");
      // id should be generated (UUID-like string)
      expect(result.id).toBeTruthy();
      expect(typeof result.id).toBe("string");
      // createdAt should be ISO string
      expect(result.createdAt).toBeTruthy();
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      // status should be 'active'
      expect(result.status).toBe("active");
      // checklist should be seeded array
      expect(Array.isArray(result.checklist)).toBe(true);
      expect(result.checklist.length).toBeGreaterThan(0);
      // all checklist items should have id, label, done=false
      result.checklist.forEach((item: ChecklistItem) => {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.done).toBe(false);
      });
    });

    it("should save to localStorage and retrieve via loadItems", async () => {
      const { addItem, loadItems } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "MacBook Pro",
        store: "Apple Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const added = addItem(input);
      const loaded = loadItems();

      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe(added.id);
      expect(loaded[0].productName).toBe(added.productName);
      expect(loaded[0].store).toBe(added.store);
      expect(loaded[0].receivedDate).toBe(added.receivedDate);
      expect(loaded[0].rule).toBe(added.rule);
      expect(loaded[0].checklist).toEqual(added.checklist);
      // Verify in localStorage
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      expect(stored.length).toBe(1);
    });
  });

  // ── AC-2: 시드 프리셋 — 5개 기본, 6개 mismatch_3m ──
  describe("AC-2: checklistPresets should return 5 items by default, 6 for mismatch_3m", () => {
    it("should return 5 checklist items for change_of_mind_7d rule", async () => {
      const { seedChecklist } = await import("@/lib/checklistPresets");

      const preset = seedChecklist("change_of_mind_7d");

      expect(preset.length).toBe(5);
      expect(preset[0].label).toBeTruthy();
      expect(preset[0].done).toBe(false);
      preset.forEach((item: ChecklistItem) => {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.label.length).toBeLessThanOrEqual(30);
      });
    });

    it("should return 6 checklist items for mismatch_3m rule", async () => {
      const { seedChecklist } = await import("@/lib/checklistPresets");

      const preset = seedChecklist("mismatch_3m");

      expect(preset.length).toBe(6);
      preset.forEach((item: ChecklistItem) => {
        expect(item.label).toBeTruthy();
        expect(item.done).toBe(false);
      });
    });

    it("should return 5 checklist items for store_policy_days rule", async () => {
      const { seedChecklist } = await import("@/lib/checklistPresets");

      const preset = seedChecklist("store_policy_days");

      expect(preset.length).toBe(5);
    });

    it("should include expected checklist labels", async () => {
      const { seedChecklist } = await import("@/lib/checklistPresets");

      const preset = seedChecklist("change_of_mind_7d");

      // Check that expected labels are present (not exact order, just presence)
      const labels = preset.map((item: ChecklistItem) => item.label.toLowerCase());
      expect(labels.some((l: string) => l.includes("주문") || l.includes("접수"))).toBe(true);
      expect(labels.some((l: string) => l.includes("사진") || l.includes("촬영"))).toBe(true);
    });
  });

  // ── AC-3: updateItem — 입력 필드만 변경 ──
  describe("AC-3: updateItem should update input fields only, preserve checklist/status/createdAt", () => {
    it("should update productName and store, preserve checklist/status/createdAt", async () => {
      const { addItem, updateItem, loadItems } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "MacBook Pro",
        store: "Apple Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const added = addItem(input);
      const originalCreatedAt = added.createdAt;
      const originalChecklist = added.checklist;

      // Manually set status to 'returned' to test preservation
      const item = loadItems()[0];
      item.status = "returned";
      localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

      const updateInput: ItemFormInput = {
        productName: "MacBook Pro 14-inch",
        store: "Apple Online",
        receivedDate: "2026-10-05",
        useStartDate: "2026-10-06",
        rule: "mismatch_3m",
        storePolicyDays: "",
      };

      const updated = updateItem(added.id, updateInput);

      expect(updated.productName).toBe("MacBook Pro 14-inch");
      expect(updated.store).toBe("Apple Online");
      expect(updated.receivedDate).toBe("2026-10-05");
      expect(updated.useStartDate).toBe("2026-10-06");
      expect(updated.rule).toBe("mismatch_3m");
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.status).toBe("returned");
      expect(updated.checklist).toEqual(originalChecklist);
    });
  });

  // ── AC-4: deleteItem — 삭제 후 없음 ──
  describe("AC-4: deleteItem should remove item from storage", () => {
    it("should delete item and not appear in loadItems", async () => {
      const { addItem, deleteItem, loadItems } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "Item 1",
        store: "Store 1",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const item1 = addItem(input);
      const input2: ItemFormInput = {
        ...input,
        productName: "Item 2",
      };
      const item2 = addItem(input2);

      expect(loadItems().length).toBe(2);

      deleteItem(item1.id);

      const loaded = loadItems();
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe(item2.id);
      expect(loaded.some((i: ReturnItem) => i.id === item1.id)).toBe(false);
    });
  });

  // ── AC-5: setStatus — status와 closedAt 관리 ──
  describe("AC-5: setStatus should update status and closedAt", () => {
    it("should set status to 'returned' with closedAt ISO timestamp", async () => {
      const { addItem, setStatus } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "Item",
        store: "Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const added = addItem(input);

      const updated = setStatus(added.id, "returned");

      expect(updated.status).toBe("returned");
      expect(updated.closedAt).toBeTruthy();
      expect(updated.closedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should set status to 'kept' with closedAt ISO timestamp", async () => {
      const { addItem, setStatus } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "Item",
        store: "Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const added = addItem(input);
      const updated = setStatus(added.id, "kept");

      expect(updated.status).toBe("kept");
      expect(updated.closedAt).toBeTruthy();
    });

    it("should remove closedAt when setting status back to 'active'", async () => {
      const { addItem, setStatus } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "Item",
        store: "Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const added = addItem(input);
      setStatus(added.id, "returned");
      const reactivated = setStatus(added.id, "active");

      expect(reactivated.status).toBe("active");
      expect(reactivated.closedAt).toBeUndefined();
    });
  });

  // ── AC-6: 체크리스트 함수 — toggleCheck, addCheck, removeCheck ──
  describe("AC-6: toggleCheck should invert done, addCheck should append, removeCheck should delete", () => {
    it("should toggle done boolean for a checklist item", async () => {
      const { addItem, toggleCheck, loadItems } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "Item",
        store: "Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const added = addItem(input);
      const checkId = added.checklist[0].id;

      expect(added.checklist[0].done).toBe(false);

      const toggled = toggleCheck(added.id, checkId);

      expect(toggled.checklist[0].done).toBe(true);
      // Verify in loaded items
      const loaded = loadItems();
      expect(loaded[0].checklist[0].done).toBe(true);
    });

    it("should add checklist item with label 1-30 chars", async () => {
      const { addItem, addCheck } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "Item",
        store: "Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const added = addItem(input);
      const originalCount = added.checklist.length;

      const newCheck = addCheck(added.id, "  새 항목  ");

      expect(newCheck.checklist.length).toBe(originalCount + 1);
      const lastItem = newCheck.checklist[newCheck.checklist.length - 1];
      expect(lastItem.label).toBe("새 항목");
      expect(lastItem.done).toBe(false);
    });

    it("should throw error for label outside 1-30 chars range", async () => {
      const { addItem, addCheck } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "Item",
        store: "Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const added = addItem(input);

      expect(() => addCheck(added.id, "")).toThrow();
      expect(() => addCheck(added.id, "a".repeat(31))).toThrow();
    });

    it("should remove checklist item by checkId", async () => {
      const { addItem, removeCheck } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "Item",
        store: "Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const added = addItem(input);
      const checkId = added.checklist[0].id;
      const originalCount = added.checklist.length;

      const removed = removeCheck(added.id, checkId);

      expect(removed.checklist.length).toBe(originalCount - 1);
      expect(removed.checklist.some((c: ChecklistItem) => c.id === checkId)).toBe(false);
    });
  });

  // ── AC-7: 손상된 JSON — StoreReadError 던짐, 원문 유지 ──
  describe("AC-7: loadItems should throw StoreReadError on corrupt JSON, preserve original text", () => {
    it("should throw StoreReadError when JSON is malformed", async () => {
      const { loadItems, StoreReadError } = await import("@/lib/itemsStore");

      localStorage.setItem(STORAGE_KEY, "{broken");

      expect(() => loadItems()).toThrow(StoreReadError);
      // Verify original text is preserved
      expect(localStorage.getItem(STORAGE_KEY)).toBe("{broken");
    });

    it("should return empty array when key does not exist", async () => {
      const { loadItems } = await import("@/lib/itemsStore");

      const result = loadItems();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should cache result so second call does not reparse", async () => {
      const { addItem, loadItems, reloadItems } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "Item",
        store: "Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const added = addItem(input);
      const first = loadItems();

      // Corrupt localStorage
      localStorage.setItem(STORAGE_KEY, "{bad");

      // loadItems should return cached value (not throw)
      const second = loadItems();
      expect(second.length).toBe(1);

      // reloadItems should throw because it ignores cache
      expect(() => reloadItems()).toThrow();
    });
  });

  // ── AC-8: Storage.setItem 실패 — StoreWriteError, 캐시·저장소 유지 ──
  describe("AC-8: write operations should throw StoreWriteError on storage failure, preserve state", () => {
    it("should throw StoreWriteError when Storage.setItem fails", async () => {
      const { addItem, StoreWriteError } = await import("@/lib/itemsStore");

      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });

      const input: ItemFormInput = {
        productName: "Item",
        store: "Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      expect(() => addItem(input)).toThrow(StoreWriteError);

      // Restore and cleanup
      localStorage.setItem = originalSetItem;
    });

    it("addItem should preserve cache and localStorage on write failure", async () => {
      const { addItem, loadItems, StoreWriteError } = await import("@/lib/itemsStore");

      // First add succeeds
      const input1: ItemFormInput = {
        productName: "Item 1",
        store: "Store 1",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };
      const added1 = addItem(input1);

      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });

      const input2: ItemFormInput = {
        productName: "Item 2",
        store: "Store 2",
        receivedDate: "2026-10-02",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      expect(() => addItem(input2)).toThrow(StoreWriteError);

      // Restore setItem and verify state is preserved
      localStorage.setItem = originalSetItem;

      const loaded = loadItems();
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe(added1.id);
    });

    it("deleteItem should throw StoreWriteError on failure", async () => {
      const { addItem, deleteItem, StoreWriteError } = await import("@/lib/itemsStore");

      const input: ItemFormInput = {
        productName: "Item",
        store: "Store",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const added = addItem(input);

      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });

      expect(() => deleteItem(added.id)).toThrow(StoreWriteError);

      localStorage.setItem = originalSetItem;
    });
  });

  // ── AC-9: recentStores — 최근 구매처 5개, trim, 중복 제거 ──
  describe("AC-9: recentStores should return recent unique stores (max 5), trimmed", () => {
    it("should return unique stores sorted by createdAt desc, max 5", async () => {
      const { addItem, recentStores } = await import("@/lib/itemsStore");

      // Create items with different stores
      const stores = ["Amazon", "Coupang", "Amazon", "Naver", "GMarket", "11Street", "Coupang"];
      const items = [];

      for (const store of stores) {
        const input: ItemFormInput = {
          productName: `Item at ${store}`,
          store,
          receivedDate: "2026-10-01",
          useStartDate: "",
          rule: "change_of_mind_7d",
          storePolicyDays: "",
        };
        items.push(addItem(input));
        // Small delay to ensure different createdAt
        await new Promise((r) => setTimeout(r, 1));
      }

      const result = recentStores(items);

      // Should contain unique stores, max 5
      expect(result.length).toBeLessThanOrEqual(5);
      expect(new Set(result).size).toBe(result.length); // All unique
      // Most recent stores should appear first
      expect(result[0]).toBe("Coupang");
    });

    it("should trim store names", async () => {
      const { addItem, recentStores } = await import("@/lib/itemsStore");

      const input1: ItemFormInput = {
        productName: "Item 1",
        store: "  Amazon  ",
        receivedDate: "2026-10-01",
        useStartDate: "",
        rule: "change_of_mind_7d",
        storePolicyDays: "",
      };

      const item1 = addItem(input1);

      const result = recentStores([item1]);

      expect(result[0]).toBe("Amazon");
    });

    it("should return empty array when items array is empty", async () => {
      const { recentStores } = await import("@/lib/itemsStore");

      const result = recentStores([]);

      expect(result).toEqual([]);
    });
  });
});
