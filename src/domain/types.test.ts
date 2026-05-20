import { describe, expect, it } from "vitest";
import { makeProduct, makeSale } from "../test/fixtures";

describe("domain fixtures", () => {
  it("creates product and sale fixtures with stable defaults", () => {
    const product = makeProduct({ id: "book-1", name: "新刊" });
    const sale = makeSale({ eventId: "event-1" });

    expect(product.name).toBe("新刊");
    expect(product.isActive).toBe(true);
    expect(sale.canceled).toBe(false);
    expect(sale.lines).toEqual([]);
  });
});
