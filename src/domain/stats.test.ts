import { describe, expect, it } from "vitest";
import { calculateEventStats } from "./stats";
import { makeExpense, makeSale } from "../test/fixtures";

describe("stats domain", () => {
  it("calculates event stats while excluding canceled sales from aggregates but keeping them in history", () => {
    const stats = calculateEventStats({
      eventId: "event-1",
      sales: [
        makeSale({
          id: "sale-1",
          datetime: "2026-08-16T10:00:00+09:00",
          totalAmount: 2500,
          lines: [
            {
              lineId: "line-1",
              kind: "product",
              refId: "book",
              displayName: "Book",
              productGenre: "book",
              unitPrice: 1000,
              quantity: 2,
              subtotal: 2000,
            },
            {
              lineId: "line-2",
              kind: "product",
              refId: "badge",
              displayName: "Badge",
              productGenre: "goods",
              unitPrice: 500,
              quantity: 1,
              subtotal: 500,
            },
          ],
        }),
        makeSale({
          id: "sale-canceled",
          datetime: "2026-08-16T11:00:00+09:00",
          totalAmount: 9999,
          canceled: true,
          lines: [
            {
              lineId: "line-canceled",
              kind: "product",
              refId: "book",
              displayName: "Book",
              productGenre: "book",
              unitPrice: 9999,
              quantity: 1,
              subtotal: 9999,
            },
          ],
        }),
      ],
      expenses: [
        makeExpense({ id: "expense-1", category: "transport", amount: 800 }),
        makeExpense({ id: "expense-2", category: "printing", amount: 1200 }),
        makeExpense({ id: "expense-3", category: "transport", amount: 200 }),
      ],
    });

    expect(stats.summary).toEqual({
      totalSales: 2500,
      totalQuantity: 3,
      customerCount: 1,
      averageUnitPrice: 833,
      totalExpenses: 2200,
      profit: 300,
    });
    expect(stats.genreQuantities).toEqual([
      { productGenre: "book", quantity: 2 },
      { productGenre: "goods", quantity: 1 },
    ]);
    expect(stats.productRanking).toEqual([
      {
        itemKey: "product:book",
        displayName: "Book",
        kind: "product",
        quantity: 2,
      },
      {
        itemKey: "product:badge",
        displayName: "Badge",
        kind: "product",
        quantity: 1,
      },
    ]);
    expect(stats.salesHistory).toEqual([
      {
        saleId: "sale-canceled",
        datetime: "2026-08-16T11:00:00+09:00",
        lineSummary: "Book 1点",
        totalAmount: 9999,
        quantity: 1,
        canceled: true,
      },
      {
        saleId: "sale-1",
        datetime: "2026-08-16T10:00:00+09:00",
        lineSummary: "Book 2点 / Badge 1点",
        totalAmount: 2500,
        quantity: 3,
        canceled: false,
      },
    ]);
    expect(stats.expenseBreakdown).toEqual([
      { category: "printing", count: 1, amount: 1200 },
      { category: "transport", count: 2, amount: 1000 },
    ]);
  });

  it("decomposes bundles for genre quantities but ranks sale lines separately", () => {
    const stats = calculateEventStats({
      eventId: "event-1",
      sales: [
        makeSale({
          id: "sale-bundle",
          totalAmount: 3000,
          lines: [
            {
              lineId: "bundle:starter",
              kind: "bundle",
              refId: "starter",
              displayName: "Starter Set",
              productGenre: "other",
              unitPrice: 1500,
              quantity: 2,
              subtotal: 3000,
              components: [
                {
                  productId: "book",
                  productName: "Book",
                  productGenre: "book",
                  quantity: 1,
                },
                {
                  productId: "badge",
                  productName: "Badge",
                  productGenre: "goods",
                  quantity: 2,
                },
              ],
            },
            {
              lineId: "reservation:book",
              kind: "reservation",
              refId: "book",
              displayName: "Reserved Book",
              productGenre: "book",
              unitPrice: 1000,
              quantity: 1,
              subtotal: 1000,
            },
          ],
        }),
      ],
      expenses: [],
    });

    expect(stats.genreQuantities).toEqual([
      { productGenre: "goods", quantity: 4 },
      { productGenre: "book", quantity: 3 },
    ]);
    expect(stats.productRanking).toEqual([
      {
        itemKey: "bundle:starter",
        displayName: "Starter Set",
        kind: "bundle",
        quantity: 2,
      },
      {
        itemKey: "reservation:book",
        displayName: "Reserved Book",
        kind: "reservation",
        quantity: 1,
      },
    ]);
  });
});
