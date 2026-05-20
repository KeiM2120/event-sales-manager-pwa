import { describe, expect, it } from "vitest";
import {
  buildProductMovementRows,
  calculateRemainingStock,
  validateCheckoutStock,
} from "./inventory";
import { makeInventory, makeSale } from "../test/fixtures";

describe("inventory domain", () => {
  it("calculates remaining stock from inventory, reservations, and non-canceled sales", () => {
    const inventories = [
      makeInventory({ productId: "book", initialStock: 10, reservedStock: 2 }),
    ];
    const sales = [
      makeSale({
        lines: [
          {
            lineId: "line-1",
            kind: "product",
            refId: "book",
            displayName: "新刊",
            productGenre: "book",
            unitPrice: 1000,
            quantity: 3,
            subtotal: 3000,
          },
        ],
      }),
      makeSale({
        id: "sale-canceled",
        canceled: true,
        lines: [
          {
            lineId: "line-2",
            kind: "product",
            refId: "book",
            displayName: "新刊",
            productGenre: "book",
            unitPrice: 1000,
            quantity: 99,
            subtotal: 99000,
          },
        ],
      }),
    ];

    expect(calculateRemainingStock("book", inventories, sales)).toBe(5);
  });

  it("expands bundle sales into product movement rows", () => {
    const sale = makeSale({
      id: "sale-1",
      lines: [
        {
          lineId: "line-1",
          kind: "bundle",
          refId: "set-1",
          displayName: "新刊セット",
          productGenre: "other",
          unitPrice: 1500,
          quantity: 2,
          subtotal: 3000,
          components: [
            {
              productId: "book",
              productName: "新刊",
              productGenre: "book",
              quantity: 1,
            },
            {
              productId: "badge",
              productName: "缶バッジ",
              productGenre: "goods",
              quantity: 2,
            },
          ],
        },
      ],
    });

    expect(buildProductMovementRows([sale])).toEqual([
      {
        saleId: "sale-1",
        datetime: "2026-08-16T10:00:00+09:00",
        lineId: "line-1",
        sourceKind: "bundle",
        sourceRefId: "set-1",
        sourceDisplayName: "新刊セット",
        productId: "book",
        productName: "新刊",
        productGenre: "book",
        unitQuantity: 1,
        lineQuantity: 2,
        totalProductQuantity: 2,
        canceled: false,
      },
      {
        saleId: "sale-1",
        datetime: "2026-08-16T10:00:00+09:00",
        lineId: "line-1",
        sourceKind: "bundle",
        sourceRefId: "set-1",
        sourceDisplayName: "新刊セット",
        productId: "badge",
        productName: "缶バッジ",
        productGenre: "goods",
        unitQuantity: 2,
        lineQuantity: 2,
        totalProductQuantity: 4,
        canceled: false,
      },
    ]);
  });

  it("validates normal stock and reservation stock separately", () => {
    const result = validateCheckoutStock({
      inventories: [
        makeInventory({
          productId: "book",
          initialStock: 3,
          reservedStock: 1,
        }),
      ],
      existingSales: [],
      nextLines: [
        {
          lineId: "line-1",
          kind: "product",
          refId: "book",
          displayName: "新刊",
          productGenre: "book",
          unitPrice: 1000,
          quantity: 3,
          subtotal: 3000,
        },
        {
          lineId: "line-2",
          kind: "reservation",
          refId: "book",
          displayName: "取り置き 新刊",
          productGenre: "book",
          unitPrice: 1000,
          quantity: 2,
          subtotal: 2000,
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "在庫が不足しています: 新刊 は残り 2 / 必要 3",
        "取り置き在庫が不足しています: 取り置き 新刊 は残り 1 / 必要 2",
      ],
    });
  });
});
