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

  it("does not add a line when maxQuantity is zero or lower", () => {
    const state = checkoutReducer(createInitialCheckoutState("event-1"), {
      type: "addLine",
      item: {
        kind: "product",
        refId: "sold-out-book",
        displayName: "完売本",
        productGenre: "book",
        unitPrice: 1000,
        maxQuantity: 0,
      },
    });

    expect(state.lines).toEqual([]);
    expect(state.totalQuantity).toBe(0);
    expect(state.totalAmount).toBe(0);
  });

  it("does not increment an existing line past maxQuantity", () => {
    const item = {
      kind: "reservation" as const,
      refId: "reserved-book",
      displayName: "取り置き 新刊",
      productGenre: "book" as const,
      unitPrice: 1000,
      maxQuantity: 2,
    };
    const initial = createInitialCheckoutState("event-1");
    const once = checkoutReducer(initial, { type: "addLine", item });
    const twice = checkoutReducer(once, { type: "addLine", item });
    const capped = checkoutReducer(twice, { type: "addLine", item });

    expect(capped.lines).toHaveLength(1);
    expect(capped.lines[0]?.quantity).toBe(2);
    expect(capped.totalQuantity).toBe(2);
    expect(capped.totalAmount).toBe(2000);
  });
});
