import type {
  BundleItem,
  EventInventory,
  ProductGenre,
  Sale,
  SaleLine,
  SaleLineKind,
} from "./types";

export interface ProductMovementRow {
  saleId: string;
  datetime: string;
  lineId: string;
  sourceKind: SaleLineKind;
  sourceRefId: string;
  sourceDisplayName: string;
  productId: string;
  productName: string;
  productGenre: ProductGenre;
  unitQuantity: number;
  lineQuantity: number;
  totalProductQuantity: number;
  canceled: boolean;
}

export type StockValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: string[] };

export interface ValidateCheckoutStockInput {
  inventories: EventInventory[];
  existingSales: Sale[];
  nextLines: SaleLine[];
}

export interface BundleAvailabilityInput {
  bundleId: string;
  bundleItems: BundleItem[];
  inventories: EventInventory[];
  sales: Sale[];
}

export interface BundleAvailability {
  availableQuantity: number;
  blockingProductIds: string[];
}

export function buildProductMovementRows(sales: Sale[]): ProductMovementRow[] {
  return sales.flatMap((sale) =>
    sale.lines.flatMap((line) => buildLineMovementRows(sale, line)),
  );
}

export function calculateRemainingStock(
  productId: string,
  inventories: EventInventory[],
  sales: Sale[],
): number {
  const inventory = inventories.find((item) => item.productId === productId);
  const initialStock = inventory?.initialStock ?? 0;
  const reservedStock = inventory?.reservedStock ?? 0;
  const soldCount = buildProductMovementRows(sales)
    .filter((row) => !row.canceled && row.productId === productId)
    .reduce((total, row) => total + row.totalProductQuantity, 0);

  return initialStock - reservedStock - soldCount;
}

export function calculateBundleAvailability({
  bundleId,
  bundleItems,
  inventories,
  sales,
}: BundleAvailabilityInput): BundleAvailability {
  const components = bundleItems.filter((item) => item.bundleId === bundleId);

  if (components.length === 0) {
    return { availableQuantity: 0, blockingProductIds: [] };
  }

  const componentAvailability = components.map((component) => {
    const remainingStock = calculateRemainingStock(
      component.productId,
      inventories,
      sales,
    );
    return {
      productId: component.productId,
      availableQuantity:
        component.quantity <= 0
          ? 0
          : Math.floor(remainingStock / component.quantity),
    };
  });
  const availableQuantity = Math.max(
    0,
    Math.min(...componentAvailability.map((item) => item.availableQuantity)),
  );

  return {
    availableQuantity,
    blockingProductIds: componentAvailability
      .filter((item) => item.availableQuantity <= 0)
      .map((item) => item.productId),
  };
}

export function validateCheckoutStock({
  inventories,
  existingSales,
  nextLines,
}: ValidateCheckoutStockInput): StockValidationResult {
  const errors: string[] = [];
  const normalRequests = new Map<string, { name: string; quantity: number }>();
  const reservationRequests = new Map<
    string,
    { name: string; quantity: number }
  >();

  for (const line of nextLines) {
    const target =
      line.kind === "reservation" ? reservationRequests : normalRequests;

    for (const movement of buildLineMovementRows(
      {
        id: "next",
        eventId: "next",
        datetime: "",
        totalAmount: 0,
        canceled: false,
        lines: [],
      },
      line,
    )) {
      const current = target.get(movement.productId);
      target.set(movement.productId, {
        name: current?.name ?? movement.sourceDisplayName,
        quantity: (current?.quantity ?? 0) + movement.totalProductQuantity,
      });
    }
  }

  for (const [productId, request] of normalRequests) {
    const remaining = calculateRemainingStock(
      productId,
      inventories,
      existingSales,
    );
    if (request.quantity > remaining) {
      errors.push(
        `在庫が不足しています: ${request.name} は残り ${remaining} / 必要 ${request.quantity}`,
      );
    }
  }

  for (const [productId, request] of reservationRequests) {
    const reservedStock =
      inventories.find((item) => item.productId === productId)?.reservedStock ??
      0;
    if (request.quantity > reservedStock) {
      errors.push(
        `取り置き在庫が不足しています: ${request.name} は残り ${reservedStock} / 必要 ${request.quantity}`,
      );
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, errors: [] };
}

function buildLineMovementRows(sale: Sale, line: SaleLine): ProductMovementRow[] {
  if (line.kind === "bundle") {
    return (line.components ?? []).map((component) => ({
      saleId: sale.id,
      datetime: sale.datetime,
      lineId: line.lineId,
      sourceKind: line.kind,
      sourceRefId: line.refId,
      sourceDisplayName: line.displayName,
      productId: component.productId,
      productName: component.productName,
      productGenre: component.productGenre,
      unitQuantity: component.quantity,
      lineQuantity: line.quantity,
      totalProductQuantity: component.quantity * line.quantity,
      canceled: sale.canceled,
    }));
  }

  return [
    {
      saleId: sale.id,
      datetime: sale.datetime,
      lineId: line.lineId,
      sourceKind: line.kind,
      sourceRefId: line.refId,
      sourceDisplayName: line.displayName,
      productId: line.refId,
      productName: line.displayName,
      productGenre: line.productGenre,
      unitQuantity: 1,
      lineQuantity: line.quantity,
      totalProductQuantity: line.quantity,
      canceled: sale.canceled,
    },
  ];
}
