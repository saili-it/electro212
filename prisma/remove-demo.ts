import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// Deletes only the seeded demo products (SKU starting with "DEMO-").
// Categories, brands and attributes are real structure and are kept.
async function main() {
  const demos = await prisma.product.findMany({
    where: { sku: { startsWith: "DEMO-" } },
    select: { id: true, sku: true, _count: { select: { orderItems: true } } },
  });

  const withOrders = demos.filter((product) => product._count.orderItems > 0);
  if (withOrders.length > 0) {
    // Never destroy order history to clean up demo data.
    throw new Error(
      `Ces produits démo ont des commandes, archivez-les plutôt : ${withOrders.map((p) => p.sku).join(", ")}`,
    );
  }

  const ids = demos.map((product) => product.id);
  await prisma.$transaction([
    prisma.stockMovement.deleteMany({ where: { productId: { in: ids } } }),
    prisma.product.deleteMany({ where: { id: { in: ids } } }),
  ]);
  console.log(`${ids.length} produit(s) démo supprimé(s).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
