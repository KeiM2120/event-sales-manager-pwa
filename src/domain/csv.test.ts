import { describe, expect, it } from "vitest";
import { buildExpensesCsv, buildSalesCsv, escapeCsvCell } from "./csv";
import { makeExpense, makeSale } from "../test/fixtures";

describe("csv domain", () => {
  it("escapes CSV cells with quotes, commas, and newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
  });

  it("builds sales and expenses CSV text", () => {
    expect(
      buildSalesCsv([
        makeSale({
          id: "sale-1",
          totalAmount: 1000,
          lines: [
            {
              lineId: "line-1",
              kind: "product",
              refId: "book",
              displayName: "新刊",
              productGenre: "book",
              unitPrice: 1000,
              quantity: 1,
              subtotal: 1000,
            },
          ],
        }),
      ]),
    ).toBe(
      [
        "saleId,eventId,datetime,canceled,totalAmount,lineId,kind,refId,displayName,productGenre,unitPrice,quantity,subtotal",
        "sale-1,event-1,2026-08-16T10:00:00+09:00,false,1000,line-1,product,book,新刊,book,1000,1,1000",
      ].join("\n"),
    );

    expect(buildExpensesCsv([makeExpense({ payee: "JR,私鉄" })])).toBe(
      [
        "expenseId,eventId,category,payee,amount,memo",
        'expense-1,event-1,transport,"JR,私鉄",840,',
      ].join("\n"),
    );
  });
});
