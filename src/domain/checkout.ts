import type { CheckoutLine, CheckoutState, Sale } from "./types";

export interface CheckoutTotals {
  totalQuantity: number;
  totalAmount: number;
}

export interface CheckoutToSaleInput {
  saleId: string;
  datetime: string;
}

export function calculateCheckoutTotals(
  lines: CheckoutLine[],
): CheckoutTotals {
  return lines.reduce(
    (totals, line) => ({
      totalQuantity: totals.totalQuantity + line.quantity,
      totalAmount: totals.totalAmount + line.subtotal,
    }),
    { totalQuantity: 0, totalAmount: 0 },
  );
}

export function checkoutToSale(
  state: CheckoutState,
  input: CheckoutToSaleInput,
): Sale {
  return {
    id: input.saleId,
    eventId: state.eventId,
    datetime: input.datetime,
    totalAmount: state.totalAmount,
    canceled: false,
    lines: state.lines.map((line) => ({
      lineId: line.lineId,
      kind: line.kind,
      refId: line.refId,
      displayName: line.displayName,
      productGenre: line.productGenre,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      subtotal: line.subtotal,
      ...(line.components ? { components: line.components.map((item) => ({ ...item })) } : {}),
    })),
  };
}
