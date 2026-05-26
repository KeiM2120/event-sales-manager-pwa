import { describe, expect, it } from "vitest";
import {
  buildProductMovementRows,
  calculateBundleAvailability,
  calculateRemainingStock,
  validateCheckoutStock,
} from "./inventory";
import { makeBundleItem, makeInventory, makeSale } from "../test/fixtures";

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
            displayName: "Book",
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
            displayName: "Book",
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
      ],
    });

    expect(buildProductMovementRows([sale])).toEqual([
      {
        saleId: "sale-1",
        datetime: "2026-08-16T10:00:00+09:00",
        lineId: "line-1",
        sourceKind: "bundle",
        sourceRefId: "set-1",
        sourceDisplayName: "Starter Set",
        productId: "book",
        productName: "Book",
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
        sourceDisplayName: "Starter Set",
        productId: "badge",
        productName: "Badge",
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
          displayName: "Book",
          productGenre: "book",
          unitPrice: 1000,
          quantity: 3,
          subtotal: 3000,
        },
        {
          lineId: "line-2",
          kind: "reservation",
          refId: "book",
          displayName: "Reserved Book",
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
        "在庫が不足しています: Book は残り 2 / 必要 3",
        "取り置き在庫が不足しています: Reserved Book は残り 1 / 必要 2",
      ],
    });
  });

  it("calculates bundle availability from component remaining stock", () => {
    const availability = calculateBundleAvailability({
      bundleId: "bundle-1",
      bundleItems: [
        makeBundleItem({
          bundleId: "bundle-1",
          productId: "book-a",
          quantity: 2,
        }),
        makeBundleItem({
          bundleId: "bundle-1",
          productId: "goods-a",
          quantity: 1,
        }),
      ],
      inventories: [
        makeInventory({
          productId: "book-a",
          initialStock: 5,
          reservedStock: 1,
        }),
        makeInventory({
          productId: "goods-a",
          initialStock: 3,
        }),
      ],
      sales: [],
    });

    expect(availability).toEqual({
      availableQuantity: 2,
      blockingProductIds: [],
    });
  });

  it("reports components with no bundle availability as blocking product IDs", () => {
    const availability = calculateBundleAvailability({
      bundleId: "bundle-1",
      bundleItems: [
        makeBundleItem({
          bundleId: "bundle-1",
          productId: "book-a",
          quantity: 1,
        }),
      ],
      inventories: [
        makeInventory({
          productId: "book-a",
          initialStock: 1,
          reservedStock: 1,
        }),
      ],
      sales: [],
    });

    expect(availability).toEqual({
      availableQuantity: 0,
      blockingProductIds: ["book-a"],
    });
  });
});
