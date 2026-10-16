import { describe, expect, it } from "vitest";
import { orderCategoryTree } from "@/lib/category-tree";

const c = (id: string, parentId: string | null, position: number, name = id) => ({ id, parentId, position, name });

describe("orderCategoryTree", () => {
  it("lists each parent followed by its children, both sorted by position", () => {
    const ordered = orderCategoryTree([
      c("frigos", "gros", 0),
      c("tv", null, 0),
      c("lave-linge", "gros", 1),
      c("gros", null, 1),
      c("televiseurs", "tv", 0),
    ]);
    expect(ordered.map((x) => `${x.depth}:${x.id}`)).toEqual([
      "0:tv",
      "1:televiseurs",
      "0:gros",
      "1:frigos",
      "1:lave-linge",
    ]);
  });

  it("reports parent name and child count", () => {
    const ordered = orderCategoryTree([c("gros", null, 0, "Gros"), c("frigos", "gros", 0), c("lave-linge", "gros", 1)]);
    expect(ordered[0]).toMatchObject({ childCount: 2, parentName: null });
    expect(ordered[1]).toMatchObject({ depth: 1, parentName: "Gros" });
  });

  it("treats a category whose parent is missing as a root instead of dropping it", () => {
    const ordered = orderCategoryTree([c("orphan", "inactive-parent", 0), c("tv", null, 1)]);
    expect(ordered.map((x) => x.id)).toEqual(["orphan", "tv"]);
  });
});
