import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addPaymentInfo,
  addToCart,
  cartToMetaItems,
  contactMethodOf,
  pageView,
  productPayload,
  purchase,
  search,
  toMad,
  viewContent,
} from "@/lib/meta";

describe("productPayload", () => {
  it("builds ids, contents, item count and value in MAD", () => {
    expect(
      productPayload([
        { id: "p1", quantity: 2, price: 999 },
        { id: "p2", quantity: 1, price: 249.9 },
      ]),
    ).toEqual({
      content_type: "product",
      content_ids: ["p1", "p2"],
      contents: [
        { id: "p1", quantity: 2, item_price: 999 },
        { id: "p2", quantity: 1, item_price: 249.9 },
      ],
      num_items: 3,
      value: 2247.9,
      currency: "MAD",
    });
  });

  it("converts cart lines from centimes, keeping the product id", () => {
    expect(toMad(549000)).toBe(5490);
    expect(cartToMetaItems([{ id: "cuid1", name: "Câble", qty: 3, priceMinorUnits: 19990 }])).toEqual([{ id: "cuid1", name: "Câble", quantity: 3, price: 199.9 }]);
  });
});

describe("contactMethodOf", () => {
  it("recognises phone and WhatsApp links only", () => {
    expect(contactMethodOf("tel:+212667333472")).toBe("phone");
    expect(contactMethodOf("https://wa.me/212667333472?text=Bonjour")).toBe("whatsapp");
    expect(contactMethodOf("https://api.whatsapp.com/send?phone=212667333472")).toBe("whatsapp");
    expect(contactMethodOf("whatsapp://send?phone=212667333472")).toBe("whatsapp");
    expect(contactMethodOf("/contact")).toBeNull();
    expect(contactMethodOf("mailto:online@easydis.co.ma")).toBeNull();
    expect(contactMethodOf("https://example.com/wa.me")).toBeNull();
  });
});

describe("event helpers", () => {
  afterEach(() => vi.unstubAllGlobals());

  const withPixel = () => {
    const fbq = vi.fn();
    vi.stubGlobal("window", { fbq });
    return fbq;
  };

  it("Purchase uses the order total as value, the reference as order_id and the order id as eventID", () => {
    const fbq = withPixel();
    purchase({ orderId: "ord_cuid", reference: "E212-20261120-0001", items: [{ id: "p1", quantity: 2, price: 999 }], total: 1998 });
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      expect.objectContaining({ value: 1998, currency: "MAD", order_id: "E212-20261120-0001", content_ids: ["p1"] }),
      { eventID: "ord_cuid" },
    );
  });

  it("ViewContent and AddPaymentInfo carry their extra params", () => {
    const fbq = withPixel();
    viewContent({ id: "p1", name: "Friteuse", category: "Friteuses", price: 999 });
    addPaymentInfo([{ id: "p1", quantity: 1, price: 999 }], "livraison-cod");
    expect(fbq.mock.calls[0][2]).toMatchObject({ content_name: "Friteuse", content_category: "Friteuses", value: 999 });
    expect(fbq.mock.calls[1][2]).toMatchObject({ payment_type: "livraison-cod", num_items: 1 });
    expect(typeof fbq.mock.calls[0][3].eventID).toBe("string");
  });

  it("is a no-op on the server", () => {
    expect(() => viewContent({ id: "p1", name: "x", category: null, price: 1 })).not.toThrow();
  });
});

describe("GA4 events (GTM dataLayer)", () => {
  afterEach(() => vi.unstubAllGlobals());

  const withWindow = (extra: Record<string, unknown> = {}) => {
    const win: { fbq: ReturnType<typeof vi.fn>; dataLayer?: unknown[] } & Record<string, unknown> = { fbq: vi.fn(), ...extra };
    vi.stubGlobal("window", win);
    return win;
  };
  const events = (win: { dataLayer?: unknown[] }) => (win.dataLayer ?? []) as Record<string, unknown>[];

  it("view_item clears the previous ecommerce object, then sends product id, name, category, price", () => {
    const win = withWindow();
    viewContent({ id: "p1", name: "Friteuse", category: "Friteuses", price: 999 });
    expect(events(win)).toEqual([
      { ecommerce: null },
      {
        event: "view_item",
        ecommerce: {
          currency: "MAD",
          value: 999,
          items: [{ item_id: "p1", item_name: "Friteuse", item_category: "Friteuses", price: 999, quantity: 1 }],
        },
      },
    ]);
  });

  it("add_to_cart values quantity × price; search sends search_term", () => {
    const win = withWindow();
    addToCart({ id: "p1", name: "TV", price: 3508 }, 2);
    search("climatiseur");
    expect(events(win)[1]).toMatchObject({ event: "add_to_cart", ecommerce: { value: 7016, items: [{ item_id: "p1", quantity: 2 }] } });
    expect(events(win)[2]).toEqual({ event: "search", search_term: "climatiseur" });
  });

  it("purchase uses the order reference as transaction_id and the order total as value", () => {
    const win = withWindow();
    purchase({ orderId: "ord_cuid", reference: "E212-1", items: [{ id: "p1", name: "TV", quantity: 1, price: 3508 }], total: 3508 });
    expect(events(win)[1]).toMatchObject({
      event: "purchase",
      ecommerce: { transaction_id: "E212-1", value: 3508, currency: "MAD", items: [{ item_id: "p1", item_name: "TV" }] },
    });
  });

  it("add_payment_info carries payment_type; the returned promise resolves without blocking", async () => {
    const win = withWindow();
    const done = addPaymentInfo([{ id: "p1", quantity: 1, price: 999 }], "livraison-cod", 50);
    expect(done).toBeInstanceOf(Promise);
    await expect(done).resolves.toBeUndefined();
    expect(events(win)[1]).toMatchObject({ event: "add_payment_info", ecommerce: { payment_type: "livraison-cod" } });
    expect(win.fbq).toHaveBeenCalledWith("track", "AddPaymentInfo", expect.objectContaining({ payment_type: "livraison-cod" }), expect.any(Object));
  });

  it("add_payment_info resolves at once when the pixel isn't loaded (blocked), so checkout never waits", async () => {
    vi.stubGlobal("window", {});
    const started = Date.now();
    await addPaymentInfo([{ id: "p1", quantity: 1, price: 999 }], "livraison-cod", 5000);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("virtual_page_view sends location, path and title only", () => {
    const win = withWindow({ location: { href: "https://electro212.ma/recherche?q=tv", pathname: "/recherche", search: "?q=tv" } });
    vi.stubGlobal("document", { title: "Recherche : tv | Electro212" });
    pageView();
    expect(events(win)).toEqual([
      { event: "virtual_page_view", page_location: "https://electro212.ma/recherche?q=tv", page_path: "/recherche?q=tv", page_title: "Recherche : tv | Electro212" },
    ]);
  });
});
