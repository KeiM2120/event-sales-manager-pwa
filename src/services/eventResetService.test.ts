import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EventSalesDatabase } from "../db/database";
import { resetSelectedEventOperationalData } from "./eventResetService";

describe("resetSelectedEventOperationalData", () => {
  let database: EventSalesDatabase;

  beforeEach(() => {
    database = new EventSalesDatabase(`event-reset-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await database.delete();
    database.close();
  });

  it("deletes only selected-event inventory, sales, and expenses", async () => {
    await database.events.bulkPut([
      { id: "event-1", name: "コミティア150", eventDate: "2026-11-23", series: "other" },
      { id: "event-2", name: "コミケ105", eventDate: "2026-12-30", series: "comic-market" },
    ]);
    await database.products.put({
      id: "book-1",
      name: "新刊",
      productGenre: "book",
      defaultPrice: 1000,
      isActive: true,
    });
    await database.bundles.put({
      id: "bundle-1",
      name: "セット",
      price: 1500,
      isActive: true,
    });
    await database.bundleItems.put({
      bundleId: "bundle-1",
      productId: "book-1",
      quantity: 1,
    });
    await database.eventInventories.bulkPut([
      { eventId: "event-1", productId: "book-1", initialStock: 30, reservedStock: 2 },
      { eventId: "event-2", productId: "book-1", initialStock: 40, reservedStock: 1 },
    ]);
    await database.sales.bulkPut([
      {
        id: "sale-1",
        eventId: "event-1",
        datetime: "2026-11-23T10:00:00+09:00",
        totalAmount: 1000,
        canceled: false,
        lines: [],
      },
      {
        id: "sale-2",
        eventId: "event-2",
        datetime: "2026-12-30T10:00:00+09:00",
        totalAmount: 1000,
        canceled: false,
        lines: [],
      },
    ]);
    await database.expenses.bulkPut([
      { id: "expense-1", eventId: "event-1", category: "printing", payee: "印刷所", amount: 500 },
      { id: "expense-2", eventId: "event-2", category: "space", payee: "会場", amount: 1000 },
    ]);

    const result = await resetSelectedEventOperationalData(database, "event-1");

    expect(result).toEqual({ inventories: 1, sales: 1, expenses: 1 });
    expect(await database.eventInventories.toArray()).toEqual([
      expect.objectContaining({ eventId: "event-2" }),
    ]);
    expect(await database.sales.toArray()).toEqual([
      expect.objectContaining({ id: "sale-2", eventId: "event-2" }),
    ]);
    expect(await database.expenses.toArray()).toEqual([
      expect.objectContaining({ id: "expense-2", eventId: "event-2" }),
    ]);
    expect(await database.events.count()).toBe(2);
    expect(await database.products.count()).toBe(1);
    expect(await database.bundles.count()).toBe(1);
    expect(await database.bundleItems.count()).toBe(1);
  });
});
