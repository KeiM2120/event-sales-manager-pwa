import { describe, expect, it } from "vitest";
import { checkoutToSale, calculateCheckoutTotals } from "./checkout";
import { checkoutReducer, createInitialCheckoutState } from "../reducers/checkoutReducer";

describe("checkout domain", () => {
  it("calculates totals from checkout lines", () => {
    const totals = calculateCheckoutTotals([
      {
        lineId: "product:book",
        kind: "product",
        refId: "book",
        displayName: "新刊",
        productGenre: "book",
        unitPrice: 1000,
        quantity: 2,
        subtotal: 2000,
      },
    ]);

    expect(totals).toEqual({ totalQuantity: 2, totalAmount: 2000 });
  });

  it("creates a sale snapshot from checkout state", () => {
    const state = checkoutReducer(createInitialCheckoutState("event-1"), {
      type: "addLine",
      item: {
        kind: "product",
        refId: "book",
        displayName: "新刊",
        productGenre: "book",
        unitPrice: 1000,
      },
    });

    const sale = checkoutToSale(state, {
      saleId: "sale-1",
      datetime: "2026-08-16T10:00:00+09:00",
    });

    expect(sale).toEqual({
      id: "sale-1",
      eventId: "event-1",
      datetime: "2026-08-16T10:00:00+09:00",
      totalAmount: 1000,
      canceled: false,
      lines: [
        {
          lineId: "product:book",
          kind: "product",
          refId: "book",
          displayName: "新刊",
          productGenre: "book",
          unitPrice: 1000,
          quantity: 1,
          subtotal: 1000,
        },
      ],
    });
  });
});
