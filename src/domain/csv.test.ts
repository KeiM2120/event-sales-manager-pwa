import { describe, expect, it } from "vitest";
import {
  buildExpensesCsv,
  buildProductMovementCsv,
  buildSalesCsv,
  buildSalesDetailCsv,
  buildSalesSummaryCsv,
  escapeCsvCell,
} from "./csv";
import { makeExpense, makeSale } from "../test/fixtures";

describe("csv domain", () => {
  it("escapes CSV cells with quotes, commas, and newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
  });

  it("builds sales detail and expenses CSV text", () => {
    const sales = [
      makeSale({
        id: "sale-1",
        totalAmount: 1500,
        lines: [
          {
            lineId: "line-1",
            kind: "bundle",
            refId: "bundle-1",
            displayName: "Starter Set",
            productGenre: "other",
            unitPrice: 1500,
            quantity: 1,
            subtotal: 1500,
            components: [
              {
                productId: "book",
                productName: "New Book",
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
        ],
      }),
    ];

    expect(buildSalesDetailCsv(sales)).toBe(
      [
        "saleId,datetime,lineId,kind,refId,displayName,productGenre,unitPrice,quantity,subtotal,canceled,componentProductIds,componentQuantities",
        "sale-1,2026-08-16T10:00:00+09:00,line-1,bundle,bundle-1,Starter Set,other,1500,1,1500,false,book|badge,1|2",
      ].join("\n"),
    );
    expect(buildSalesCsv(sales)).toBe(buildSalesDetailCsv(sales));

    expect(buildExpensesCsv([makeExpense({ payee: "JR,Metro" })])).toBe(
      [
        "expenseId,eventId,category,payee,amount,memo",
        'expense-1,event-1,transport,"JR,Metro",840,',
      ].join("\n"),
    );
  });

  it("builds a sales summary CSV with one row per sale checkout", () => {
    const csv = buildSalesSummaryCsv([
      makeSale({
        id: "sale-1",
        totalAmount: 2500,
        lines: [
          {
            lineId: "line-1",
            kind: "product",
            refId: "book",
            displayName: "New Book",
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
        totalAmount: 9999,
        canceled: true,
        lines: [
          {
            lineId: "line-canceled",
            kind: "product",
            refId: "book",
            displayName: "New Book",
            productGenre: "book",
            unitPrice: 9999,
            quantity: 4,
            subtotal: 9999,
          },
        ],
      }),
    ]);

    expect(csv).toBe(
      [
        "saleId,eventId,datetime,totalAmount,totalQuantity,canceled,lineCount",
        "sale-1,event-1,2026-08-16T10:00:00+09:00,2500,3,false,2",
        "sale-canceled,event-1,2026-08-16T10:00:00+09:00,9999,4,true,1",
      ].join("\n"),
    );
  });

  it("builds a product movement CSV from expanded inventory movement rows", () => {
    const csv = buildProductMovementCsv([
      makeSale({
        id: "sale-bundle",
        totalAmount: 3000,
        lines: [
          {
            lineId: "line-bundle",
            kind: "bundle",
            refId: "bundle-1",
            displayName: "Starter Set",
            productGenre: "book",
            unitPrice: 1500,
            quantity: 2,
            subtotal: 3000,
            components: [
              {
                productId: "book",
                productName: "New Book",
                productGenre: "book",
                quantity: 1,
              },
              {
                productId: "badge",
                productName: "Badge",
                productGenre: "goods",
                quantity: 3,
              },
            ],
          },
        ],
      }),
    ]);

    expect(csv).toBe(
      [
        "saleId,datetime,lineId,sourceKind,sourceRefId,sourceDisplayName,productId,productName,productGenre,unitQuantity,lineQuantity,totalProductQuantity,canceled",
        "sale-bundle,2026-08-16T10:00:00+09:00,line-bundle,bundle,bundle-1,Starter Set,book,New Book,book,1,2,2,false",
        "sale-bundle,2026-08-16T10:00:00+09:00,line-bundle,bundle,bundle-1,Starter Set,badge,Badge,goods,3,2,6,false",
      ].join("\n"),
    );
  });
});
