import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EventSalesDatabase } from "../db/database";
import { checkoutReducer, createInitialCheckoutState } from "../reducers/checkoutReducer";
import {
  confirmCheckout,
  handoverReservation,
  undoSale,
} from "./checkoutService";

describe("checkoutService", () => {
  let db: EventSalesDatabase;

  beforeEach(() => {
    db = new EventSalesDatabase(`checkout-service-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("confirms checkout by saving a sale snapshot", async () => {
    await db.eventInventories.put({
      eventId: "event-1",
      productId: "book",
      initialStock: 10,
      reservedStock: 0,
    });

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

    const sale = await confirmCheckout(db, state, {
      saleId: "sale-1",
      datetime: "2026-08-16T10:00:00+09:00",
    });

    await expect(db.sales.get("sale-1")).resolves.toEqual(sale);
    expect(sale.totalAmount).toBe(1000);
    expect(sale.canceled).toBe(false);
  });

  it("decrements reserved stock and creates a reservation sale", async () => {
    await db.eventInventories.put({
      eventId: "event-1",
      productId: "book",
      initialStock: 10,
      reservedStock: 2,
    });

    const sale = await handoverReservation(db, {
      eventId: "event-1",
      productId: "book",
      productName: "新刊",
      productGenre: "book",
      unitPrice: 1000,
      saleId: "sale-1",
      datetime: "2026-08-16T10:00:00+09:00",
    });

    await expect(db.eventInventories.get(["event-1", "book"])).resolves.toMatchObject({
      reservedStock: 1,
    });
    expect(sale.lines[0]).toMatchObject({
      kind: "reservation",
      refId: "book",
      displayName: "取り置き 新刊",
      quantity: 1,
    });
  });

  it("undoes a sale by marking it canceled without deleting it", async () => {
    await db.sales.put({
      id: "sale-1",
      eventId: "event-1",
      datetime: "2026-08-16T10:00:00+09:00",
      totalAmount: 1000,
      canceled: false,
      lines: [],
    });

    await undoSale(db, "sale-1");

    await expect(db.sales.get("sale-1")).resolves.toMatchObject({
      canceled: true,
    });
  });
});
