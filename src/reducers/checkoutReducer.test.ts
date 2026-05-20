import { describe, expect, it } from "vitest";
import {
  checkoutReducer,
  createInitialCheckoutState,
} from "./checkoutReducer";

describe("checkoutReducer", () => {
  it("adds, increments, decrements, removes, and clears checkout lines", () => {
    const initial = createInitialCheckoutState("event-1");
    const added = checkoutReducer(initial, {
      type: "addLine",
      item: {
        kind: "product",
        refId: "book",
        displayName: "新刊",
        productGenre: "book",
        unitPrice: 1000,
      },
    });
    const incremented = checkoutReducer(added, {
      type: "addLine",
      item: {
        kind: "product",
        refId: "book",
        displayName: "新刊",
        productGenre: "book",
        unitPrice: 1000,
      },
    });
    const decremented = checkoutReducer(incremented, {
      type: "decrementLine",
      lineId: "product:book",
    });
    const removed = checkoutReducer(decremented, {
      type: "decrementLine",
      lineId: "product:book",
    });

    expect(added.lines).toHaveLength(1);
    expect(incremented.totalQuantity).toBe(2);
    expect(incremented.totalAmount).toBe(2000);
    expect(decremented.lines[0]?.quantity).toBe(1);
    expect(removed.lines).toEqual([]);
    expect(checkoutReducer(incremented, { type: "clear" })).toEqual(initial);
  });

  it("keeps bundle component snapshots on checkout lines", () => {
    const state = checkoutReducer(createInitialCheckoutState("event-1"), {
      type: "addLine",
      item: {
        kind: "bundle",
        refId: "set-1",
        displayName: "新刊セット",
        productGenre: "other",
        unitPrice: 1500,
        components: [
          {
            productId: "book",
            productName: "新刊",
            productGenre: "book",
            quantity: 1,
          },
        ],
      },
    });

    expect(state.lines[0]).toMatchObject({
      lineId: "bundle:set-1",
      displayName: "新刊セット",
      quantity: 1,
      subtotal: 1500,
      components: [
        {
          productId: "book",
          productName: "新刊",
          productGenre: "book",
          quantity: 1,
        },
      ],
    });
  });
});
