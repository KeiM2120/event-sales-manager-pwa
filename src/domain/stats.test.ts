import { describe, expect, it } from "vitest";
import { calculateEventStats } from "./stats";
import { makeExpense, makeSale } from "../test/fixtures";

describe("stats domain", () => {
  it("calculates event stats while excluding canceled sales", () => {
    const stats = calculateEventStats({
      eventId: "event-1",
      sales: [
        makeSale({
          id: "sale-1",
          totalAmount: 2500,
          lines: [
            {
              lineId: "line-1",
              kind: "product",
              refId: "book",
              displayName: "新刊",
              productGenre: "book",
              unitPrice: 1000,
              quantity: 2,
              subtotal: 2000,
            },
            {
              lineId: "line-2",
              kind: "product",
              refId: "badge",
              displayName: "缶バッジ",
              productGenre: "goods",
              unitPrice: 500,
              quantity: 1,
              subtotal: 500,
            },
          ],
        }),
        makeSale({
          id: "sale-canceled",
          totalAmount: 9999,
          canceled: true,
          lines: [],
        }),
      ],
      expenses: [makeExpense({ amount: 800 })],
    });

    expect(stats.summary).toEqual({
      totalSales: 2500,
      totalQuantity: 3,
      averageUnitPrice: 833,
      totalExpenses: 800,
      profit: 1700,
    });
    expect(stats.genreQuantities).toEqual([
      { productGenre: "book", quantity: 2 },
      { productGenre: "goods", quantity: 1 },
    ]);
    expect(stats.productRanking).toEqual([
      { productId: "book", displayName: "新刊", quantity: 2 },
      { productId: "badge", displayName: "缶バッジ", quantity: 1 },
    ]);
    expect(stats.salesHistory).toEqual([
      {
        saleId: "sale-1",
        datetime: "2026-08-16T10:00:00+09:00",
        totalAmount: 2500,
      },
    ]);
  });
});
