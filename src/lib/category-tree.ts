export type FlatCategory = { id: string; parentId: string | null; name: string; position: number };

export type OrderedCategory<T extends FlatCategory> = T & {
  depth: number;
  parentName: string | null;
  childCount: number;
};

/**
 * Depth-first ordering (each parent followed by its children, siblings by
 * position then name). Orphans whose parent isn't in the list are treated
 * as roots so nothing silently disappears.
 */
export function orderCategoryTree<T extends FlatCategory>(categories: T[]): OrderedCategory<T>[] {
  const ids = new Set(categories.map((c) => c.id));
  const byParent = new Map<string | null, T[]>();
  for (const category of categories) {
    const key = category.parentId && ids.has(category.parentId) ? category.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), category]);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "fr"));
  }

  const result: OrderedCategory<T>[] = [];
  const visit = (parentId: string | null, depth: number, parentName: string | null) => {
    for (const category of byParent.get(parentId) ?? []) {
      result.push({ ...category, depth, parentName, childCount: byParent.get(category.id)?.length ?? 0 });
      visit(category.id, depth + 1, category.name);
    }
  };
  visit(null, 0, null);
  return result;
}
