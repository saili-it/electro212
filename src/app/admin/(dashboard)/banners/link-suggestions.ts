import "server-only";
import { listCategoryOptions } from "@/data/categories";

/** Category pages offered as autocomplete in the banner "Lien" field. */
export async function getBannerLinkSuggestions() {
  const categories = await listCategoryOptions();
  return categories.map((category) => ({
    path: `/categories/${category.slug}`,
    label: `${"— ".repeat(category.depth)}${category.name}`,
  }));
}
