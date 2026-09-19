import { describe, expect, it } from "vitest";
import { LineItemPatchQueue, restoreDeletedItem } from "@/lib/lineItemMutations";

type Item = { id: string; name: string; price: number; quantity: number };

describe("LineItemPatchQueue", () => {
  it("coalesces two patches for the same item into one merged patch", () => {
    const queue = new LineItemPatchQueue<Item>();
    const original: Item = { id: "item-1", name: "A", price: 1, quantity: 1 };

    queue.queue("item-1", { name: "B" }, original);
    // Second edit sees the item as it looks after the first optimistic
    // update -- the queue must still snapshot back to `original`, not this.
    queue.queue("item-1", { price: 5 }, { ...original, name: "B" });

    const result = queue.take("item-1");

    expect(result).toEqual({
      patch: { name: "B", price: 5 },
      rollbackTo: original,
    });
  });

  it("clears the queue after take(), so a later edit starts a fresh window", () => {
    const queue = new LineItemPatchQueue<Item>();
    const original: Item = { id: "item-1", name: "A", price: 1, quantity: 1 };
    queue.queue("item-1", { name: "B" }, original);
    queue.take("item-1");

    expect(queue.take("item-1")).toBeUndefined();
  });

  it("keeps different items' pending patches independent", () => {
    const queue = new LineItemPatchQueue<Item>();
    const a: Item = { id: "a", name: "A", price: 1, quantity: 1 };
    const b: Item = { id: "b", name: "B", price: 2, quantity: 2 };

    queue.queue("a", { name: "A2" }, a);
    queue.queue("b", { price: 9 }, b);

    expect(queue.take("a")).toEqual({ patch: { name: "A2" }, rollbackTo: a });
    expect(queue.take("b")).toEqual({ patch: { price: 9 }, rollbackTo: b });
  });
});

describe("restoreDeletedItem", () => {
  const deleted: Item = { id: "deleted", name: "Deleted", price: 1, quantity: 1 };

  it("re-inserts the deleted item at its original position", () => {
    const current: Item[] = [
      { id: "keep-1", name: "Keep 1", price: 1, quantity: 1 },
      { id: "keep-2", name: "Keep 2", price: 1, quantity: 1 },
    ];

    const result = restoreDeletedItem(current, deleted, 1);

    expect(result.map((i) => i.id)).toEqual(["keep-1", "deleted", "keep-2"]);
  });

  it("preserves unrelated concurrent changes made while the delete was in flight", () => {
    // Simulates: item deleted optimistically, then -- while the DELETE
    // request is in flight -- the operator edits another row and adds a
    // new one. The delete then fails.
    const currentAtRollbackTime: Item[] = [
      { id: "keep-1", name: "Edited while delete was in flight", price: 42, quantity: 1 },
      { id: "new-item", name: "Added while delete was in flight", price: 0, quantity: 1 },
    ];

    const result = restoreDeletedItem(currentAtRollbackTime, deleted, 0);

    expect(result).toContainEqual(currentAtRollbackTime[0]);
    expect(result).toContainEqual(currentAtRollbackTime[1]);
    expect(result).toContainEqual(deleted);
    expect(result).toHaveLength(3);
  });

  it("is a no-op if the item is already present (avoids duplicating it)", () => {
    const current: Item[] = [deleted];

    const result = restoreDeletedItem(current, deleted, 0);

    expect(result).toBe(current);
  });

  it("clamps an out-of-range index instead of throwing", () => {
    const current: Item[] = [{ id: "keep-1", name: "Keep 1", price: 1, quantity: 1 }];

    const result = restoreDeletedItem(current, deleted, 99);

    expect(result.map((i) => i.id)).toEqual(["keep-1", "deleted"]);
  });
});
