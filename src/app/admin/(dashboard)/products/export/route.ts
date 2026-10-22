import { buildProductsWorkbook } from "@/data/product-io";
import { AuthzError } from "@/lib/errors";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Streams the full catalogue as an .xlsx download (admin-only). */
export async function GET() {
  try {
    const buffer = await buildProductsWorkbook();
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": XLSX_MIME,
        "Content-Disposition": `attachment; filename="produits-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuthzError) return new Response(err.message, { status: err.status });
    throw err;
  }
}
