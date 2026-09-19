/**
 * Pure state-management helpers for QuoteBuilder's per-item debounced edits
 * and delete rollback (issue #50 review findings on PR #55). Extracted so
 * the sequencing behavior is unit-testable without a DOM/component harness.
 */

/**
 * Accumulates per-item patches across a debounce window so that editing
 * two different fields (e.g. name, then price) before the debounce fires
 * sends BOTH changes in one request, instead of only the most recent call's
 * partial patch silently dropping the earlier field. Also captures the
 * item's state as of the *first* edit in the window, so a rollback restores
 * to before any of the batched edits, not an intermediate one.
 */
export class LineItemPatchQueue<T extends { id: string }> {
  private pending = new Map<string, Partial<T>>();
  private snapshots = new Map<string, T>();

  queue(itemId: string, patch: Partial<T>, currentItem: T): void {
    if (!this.snapshots.has(itemId)) {
      this.snapshots.set(itemId, currentItem);
    }
    this.pending.set(itemId, { ...this.pending.get(itemId), ...patch });
  }

  /** Clears and returns the accumulated patch + rollback snapshot for an item. */
  take(itemId: string): { patch: Partial<T>; rollbackTo: T } | undefined {
    const patch = this.pending.get(itemId);
    const rollbackTo = this.snapshots.get(itemId);
    this.pending.delete(itemId);
    this.snapshots.delete(itemId);
    if (!patch || !rollbackTo) return undefined;
    return { patch, rollbackTo };
  }
}

/**
 * Re-inserts a deleted item into the CURRENT array (not a stale pre-delete
 * snapshot) after a failed delete, so unrelated edits/additions made while
 * the delete request was in flight aren't clobbered by the rollback.
 */
export function restoreDeletedItem<T extends { id: string }>(
  current: T[],
  deletedItem: T,
  deletedIndex: number,
): T[] {
  if (current.some((item) => item.id === deletedItem.id)) return current;
  const next = [...current];
  const insertAt = Math.min(Math.max(deletedIndex, 0), next.length);
  next.splice(insertAt, 0, deletedItem);
  return next;
}
