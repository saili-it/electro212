import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/data/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { dateToShopLocal } from "@/lib/datetime";
import {
  canTransition,
  formatOrderReference,
  isReasonRequired,
  ORDER_STATUS_LABELS,
  STOCK_PHASE,
  stockDeltaForPhase,
  stockMovementTypeForPhase,
} from "@/lib/orders";

/*
 * Orders data layer.
 *
 * placeOrder() is the ONLY public (unauthenticated) mutation in the app: it is
 * the storefront checkout. It never trusts the client — prices, names and SKUs
 * are re-read from the DB, and stock is reserved with an atomic conditional
 * UPDATE so two shoppers can't oversell the same unit. Everything else here is
 * admin-only and gated by requireAdmin().
 */

// ---------- Checkout (public) ----------

const CHECKOUT_MODES = ["livraison-cod", "livraison-virement", "retrait-magasin"] as const;
type CheckoutMode = (typeof CHECKOUT_MODES)[number];

const MODE_CONFIG: Record<CheckoutMode, { paymentMethod: PaymentMethod; pickup: boolean }> = {
  "livraison-cod": { paymentMethod: "CASH_ON_DELIVERY", pickup: false },
  "livraison-virement": { paymentMethod: "BANK_TRANSFER", pickup: false },
  "retrait-magasin": { paymentMethod: "CASH_ON_DELIVERY", pickup: true },
};

// In-store pickup reuses the delivery fields (no schema change); these sentinels
// make it unmistakable on the admin order.
const PICKUP_CITY = "Retrait en magasin";
const PICKUP_ADDRESS = "À retirer au magasin Electro212";

const checkoutSchema = z
  .object({
    contactName: z.string().trim().min(2, "Nom trop court.").max(120),
    contactPhone: z.string().trim().min(6, "Téléphone invalide.").max(30),
    contactEmail: z
      .string()
      .trim()
      .max(160)
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => v === undefined || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "E-mail invalide."),
    mode: z.enum(CHECKOUT_MODES),
    deliveryCity: z.string().trim().max(120).optional(),
    deliveryAddressLine: z.string().trim().max(300).optional(),
    deliveryNotes: z.string().trim().max(1000).optional(),
    idempotencyKey: z.string().uuid().optional(),
    items: z
      .array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(99) }))
      .min(1, "Votre panier est vide.")
      .max(50, "Trop d'articles dans le panier."),
  })
  .superRefine((data, ctx) => {
    if (!MODE_CONFIG[data.mode].pickup) {
      if (!data.deliveryCity) {
        ctx.addIssue({ code: "custom", path: ["deliveryCity"], message: "La ville de livraison est requise." });
      }
      if (!data.deliveryAddressLine) {
        ctx.addIssue({ code: "custom", path: ["deliveryAddressLine"], message: "L'adresse de livraison est requise." });
      }
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type PlaceOrderIssue = { name: string; reason: string };
export type PlaceOrderResult =
  | { ok: true; orderId: string; reference: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; issues?: PlaceOrderIssue[] };

class InsufficientStockError extends Error {}

function normalizePhone(input: string): string {
  // Keep digits and a leading "+", drop spaces/dots/dashes/parens — used as the customer key.
  return input.replace(/[^\d+]/g, "");
}

/** Shop-local "YYYYMMDD" for the daily order-reference sequence. */
function shopDatePart(date: Date): string {
  return dateToShopLocal(date).slice(0, 10).replace(/-/g, "");
}

function isUniqueViolation(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Veuillez corriger les informations de commande.", fieldErrors };
  }
  const data = parsed.data;
  const { paymentMethod, pickup } = MODE_CONFIG[data.mode];

  // Merge any duplicate lines defensively (the cart dedupes by id, but never trust input).
  const wanted = new Map<string, number>();
  for (const item of data.items) {
    wanted.set(item.productId, Math.min(99, (wanted.get(item.productId) ?? 0) + item.qty));
  }

  // Re-read the catalogue: only PUBLISHED products are orderable, and prices/names
  // come from the DB — never from the client.
  const products = await prisma.product.findMany({
    where: { id: { in: [...wanted.keys()] }, status: "PUBLISHED" },
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      inventory: { select: { stockQuantity: true, reservedQuantity: true } },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  type Line = { productId: string; sku: string; name: string; unitPrice: number; quantity: number; lineTotal: number };
  const lines: Line[] = [];
  const issues: PlaceOrderIssue[] = [];

  for (const [productId, qty] of wanted) {
    const product = byId.get(productId);
    if (!product) {
      issues.push({ name: "Un article", reason: "n'est plus disponible à la vente." });
      continue;
    }
    const name = product.translations[0]?.name ?? product.sku;
    const available = (product.inventory?.stockQuantity ?? 0) - (product.inventory?.reservedQuantity ?? 0);
    if (available < qty) {
      issues.push({
        name,
        reason: available <= 0 ? "est en rupture de stock." : `n'est disponible qu'en ${available} exemplaire(s).`,
      });
      continue;
    }
    lines.push({
      productId,
      sku: product.sku,
      name,
      unitPrice: product.priceMinorUnits,
      quantity: qty,
      lineTotal: product.priceMinorUnits * qty,
    });
  }

  if (issues.length > 0) {
    return {
      ok: false,
      error: "Certains articles ne sont plus disponibles. Vérifiez votre panier.",
      issues,
    };
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const idempotencyKey = data.idempotencyKey ?? randomUUID();

  // Idempotency: a retried submit with the same key returns the existing order.
  const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
  if (existing) return { ok: true, orderId: existing.id, reference: existing.reference };

  const deliveryCity = pickup ? PICKUP_CITY : data.deliveryCity!;
  const deliveryAddressLine = pickup ? PICKUP_ADDRESS : data.deliveryAddressLine!;
  const deliveryNotes = data.deliveryNotes || null;

  const MAX_ATTEMPTS = 6; // reference collisions under concurrency are retried
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        // Atomic, oversell-proof reservation: the WHERE guard + row lock means two
        // concurrent orders cannot both pass when only one unit is left.
        for (const line of lines) {
          const affected = await tx.$executeRaw`
            UPDATE "Inventory"
            SET "reservedQuantity" = "reservedQuantity" + ${line.quantity}, "updatedAt" = now()
            WHERE "productId" = ${line.productId}
              AND "stockQuantity" - "reservedQuantity" >= ${line.quantity}
          `;
          if (affected !== 1) throw new InsufficientStockError();
        }

        const customer = await tx.customer.upsert({
          where: { phone: normalizePhone(data.contactPhone) },
          update: { name: data.contactName },
          create: { phone: normalizePhone(data.contactPhone), name: data.contactName },
        });

        const datePart = shopDatePart(new Date());
        const sameDay = await tx.order.count({ where: { reference: { startsWith: `E212-${datePart}-` } } });
        const reference = formatOrderReference(datePart, sameDay + 1);

        return tx.order.create({
          data: {
            reference,
            customerId: customer.id,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
            contactEmail: data.contactEmail ?? null,
            deliveryCity,
            deliveryAddressLine,
            deliveryNotes,
            status: "PENDING_CONFIRMATION",
            // Delivery fee is confirmed by an advisor afterwards (business rule), so
            // the stored total equals the subtotal at checkout time.
            subtotalMinorUnits: subtotal,
            deliveryFeeMinorUnits: 0,
            totalMinorUnits: subtotal,
            paymentMethod,
            paymentStatus: "PENDING",
            idempotencyKey,
            items: {
              create: lines.map((line) => ({
                productId: line.productId,
                skuSnapshot: line.sku,
                nameSnapshot: line.name,
                unitPriceMinorUnitsSnapshot: line.unitPrice,
                quantity: line.quantity,
                lineTotalMinorUnits: line.lineTotal,
              })),
            },
            statusHistory: { create: { fromStatus: null, toStatus: "PENDING_CONFIRMATION" } },
            stockMovements: {
              create: lines.map((line) => ({
                productId: line.productId,
                type: "RESERVATION",
                quantityDelta: line.quantity,
                reason: "Réservation (commande créée)",
              })),
            },
          },
          select: { id: true, reference: true },
        });
      });

      return { ok: true, orderId: order.id, reference: order.reference };
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        return {
          ok: false,
          error: "Le stock de l'un des articles vient de changer. Vérifiez votre panier et réessayez.",
        };
      }
      if (isUniqueViolation(err)) {
        // Could be a concurrent identical submit (idempotencyKey) or a same-day
        // reference race. If our key already landed, that order is the answer.
        const dup = await prisma.order.findUnique({ where: { idempotencyKey } });
        if (dup) return { ok: true, orderId: dup.id, reference: dup.reference };
        continue; // reference collision → regenerate the sequence and retry
      }
      throw err;
    }
  }

  return { ok: false, error: "Impossible d'enregistrer la commande pour le moment. Réessayez." };
}

export type OrderConfirmation = {
  reference: string;
  status: OrderStatus;
  createdAtMs: number;
  contactName: string;
  deliveryCity: string;
  deliveryAddressLine: string;
  paymentMethod: PaymentMethod;
  subtotalMinorUnits: number;
  totalMinorUnits: number;
  items: { name: string; quantity: number; unitPriceMinorUnits: number; lineTotalMinorUnits: number }[];
};

/** Public read for the confirmation page, keyed by the unguessable order id (cuid). */
export async function getOrderConfirmation(id: string): Promise<OrderConfirmation | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return null;

  return {
    reference: order.reference,
    status: order.status,
    createdAtMs: order.createdAt.getTime(),
    contactName: order.contactName,
    deliveryCity: order.deliveryCity,
    deliveryAddressLine: order.deliveryAddressLine,
    paymentMethod: order.paymentMethod,
    subtotalMinorUnits: order.subtotalMinorUnits,
    totalMinorUnits: order.totalMinorUnits,
    items: order.items.map((item) => ({
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitPriceMinorUnits: item.unitPriceMinorUnitsSnapshot,
      lineTotalMinorUnits: item.lineTotalMinorUnits,
    })),
  };
}

// ---------- Admin reads ----------

const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export async function listOrders(
  params: { q?: string; status?: OrderStatus; page?: number; pageSize?: number } = {},
) {
  await requireAdmin();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const q = params.q?.trim();

  const where: Prisma.OrderWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { contactPhone: { contains: normalizePhone(q) || q } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { items: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      createdAt: row.createdAt,
      status: row.status,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      itemCount: row._count.items,
      totalMinorUnits: row.totalMinorUnits,
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getOrderDetail(id: string) {
  await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { slug: true, status: true } } } },
      statusHistory: { include: { adminUser: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      customer: { select: { id: true, phone: true, email: true } },
    },
  });
  if (!order) return null;

  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    contactName: order.contactName,
    contactPhone: order.contactPhone,
    contactEmail: order.contactEmail,
    deliveryCity: order.deliveryCity,
    deliveryAddressLine: order.deliveryAddressLine,
    deliveryNotes: order.deliveryNotes,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    cancellationReason: order.cancellationReason,
    subtotalMinorUnits: order.subtotalMinorUnits,
    deliveryFeeMinorUnits: order.deliveryFeeMinorUnits,
    totalMinorUnits: order.totalMinorUnits,
    items: order.items.map((item) => ({
      id: item.id,
      slug: item.product?.slug ?? null,
      productExists: item.product != null,
      skuSnapshot: item.skuSnapshot,
      nameSnapshot: item.nameSnapshot,
      unitPriceMinorUnitsSnapshot: item.unitPriceMinorUnitsSnapshot,
      quantity: item.quantity,
      lineTotalMinorUnits: item.lineTotalMinorUnits,
    })),
    history: order.statusHistory.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      reason: entry.reason,
      adminName: entry.adminUser?.name ?? null,
      createdAt: entry.createdAt,
    })),
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;

// ---------- Admin mutations ----------

export async function changeOrderStatus(
  id: string,
  toStatus: OrderStatus,
  reason?: string,
): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin(["SUPER_ADMIN", "ORDER_MANAGER"]);

  if (!ORDER_STATUSES.includes(toStatus)) return { error: "Statut inconnu." };
  const trimmedReason = reason?.trim() || null;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) return { error: "Commande introuvable." };

    const from = order.status;
    if (from === toStatus) return { error: "La commande est déjà dans ce statut." };
    if (!canTransition(from, toStatus)) {
      return { error: `Transition non autorisée : ${ORDER_STATUS_LABELS[from]} → ${ORDER_STATUS_LABELS[toStatus]}.` };
    }
    if (isReasonRequired(toStatus) && !trimmedReason) {
      return { error: "Un motif est requis pour ce changement de statut." };
    }

    const fromPhase = STOCK_PHASE[from];
    const toPhase = STOCK_PHASE[toStatus];
    const movementType = stockMovementTypeForPhase(fromPhase, toPhase);

    for (const item of order.items) {
      if (!item.productId) continue; // product gone (snapshot-only line) — nothing to adjust
      const { reservedDelta, stockDelta } = stockDeltaForPhase(fromPhase, toPhase, item.quantity);
      if (reservedDelta === 0 && stockDelta === 0) continue;

      await tx.inventory.update({
        where: { productId: item.productId },
        data: {
          reservedQuantity: { increment: reservedDelta },
          stockQuantity: { increment: stockDelta },
        },
      });
      if (movementType) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            orderId: order.id,
            type: movementType,
            quantityDelta: stockDelta !== 0 ? stockDelta : reservedDelta,
            reason: trimmedReason ?? ORDER_STATUS_LABELS[toStatus],
            adminUserId: admin.id,
          },
        });
      }
    }

    await tx.order.update({
      where: { id },
      data: {
        status: toStatus,
        ...(toStatus === "CANCELLED" ? { cancellationReason: trimmedReason } : {}),
      },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, fromStatus: from, toStatus, reason: trimmedReason, adminUserId: admin.id },
    });
    await tx.auditLog.create({
      data: {
        adminUserId: admin.id,
        action: "order.status_change",
        entityType: "Order",
        entityId: order.id,
        metadata: { from, to: toStatus, reason: trimmedReason },
      },
    });

    return { ok: true as const };
  });
}

const SETTABLE_PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "PAID", "REFUNDED", "NOT_APPLICABLE"];

export async function setOrderPaymentStatus(
  id: string,
  status: PaymentStatus,
): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin(["SUPER_ADMIN", "ORDER_MANAGER"]);
  if (!SETTABLE_PAYMENT_STATUSES.includes(status)) return { error: "Statut de paiement inconnu." };

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, paymentStatus: true } });
  if (!order) return { error: "Commande introuvable." };

  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { paymentStatus: status } }),
    prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        action: "order.payment_status",
        entityType: "Order",
        entityId: id,
        metadata: { from: order.paymentStatus, to: status },
      },
    }),
  ]);
  return { ok: true as const };
}

// ---------- Dashboard ----------

export async function getOrderStats() {
  await requireAdmin();
  const [pending, toProcess] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING_CONFIRMATION" } }),
    prisma.order.count({
      where: { status: { in: ["PENDING_CONFIRMATION", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"] } },
    }),
  ]);
  return { pending, toProcess };
}

export async function getRecentOrders(limit = 6) {
  await requireAdmin();
  const rows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      reference: true,
      createdAt: true,
      status: true,
      contactName: true,
      totalMinorUnits: true,
    },
  });
  return rows;
}
