import { afterEach, describe, expect, it, vi } from "vitest";
import { addPaymentInfo, cartToMetaItems, contactMethodOf, productPayload, purchase, toMad, viewContent } from "@/lib/meta";

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
    expect(cartToMetaItems([{ id: "cuid1", qty: 3, priceMinorUnits: 19990 }])).toEqual([{ id: "cuid1", quantity: 3, price: 199.9 }]);
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
