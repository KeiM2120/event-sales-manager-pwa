import { calculateCheckoutTotals } from "../domain/checkout";
import type {
  CheckoutLine,
  CheckoutLineComponent,
  CheckoutState,
  ProductGenre,
  SaleLineKind,
} from "../domain/types";

export interface CheckoutItemInput {
  kind: SaleLineKind;
  refId: string;
  displayName: string;
  productGenre: ProductGenre;
  unitPrice: number;
  maxQuantity?: number;
  components?: CheckoutLineComponent[];
}

export type CheckoutAction =
  | { type: "addLine"; item: CheckoutItemInput }
  | { type: "incrementLine"; lineId: string }
  | { type: "decrementLine"; lineId: string }
  | { type: "removeLine"; lineId: string }
  | { type: "clear" };

export function createInitialCheckoutState(eventId: string): CheckoutState {
  return {
    eventId,
    lines: [],
    totalQuantity: 0,
    totalAmount: 0,
  };
}

export function checkoutReducer(
  state: CheckoutState,
  action: CheckoutAction,
): CheckoutState {
  switch (action.type) {
    case "addLine": {
      if (action.item.maxQuantity !== undefined && action.item.maxQuantity <= 0) {
        return state;
      }

      const lineId = createLineId(action.item);
      const existingLine = state.lines.find((line) => line.lineId === lineId);
      if (
        existingLine &&
        action.item.maxQuantity !== undefined &&
        existingLine.quantity >= action.item.maxQuantity
      ) {
        return state;
      }

      const lines = existingLine
        ? state.lines.map((line) =>
            line.lineId === lineId ? updateQuantity(line, line.quantity + 1) : line,
          )
        : [...state.lines, createLine(action.item, lineId)];

      return withTotals(state.eventId, lines);
    }
    case "incrementLine":
      return withTotals(
        state.eventId,
        state.lines.map((line) =>
          line.lineId === action.lineId
            ? updateQuantity(line, line.quantity + 1)
            : line,
        ),
      );
    case "decrementLine":
      return withTotals(
        state.eventId,
        state.lines.flatMap((line) => {
          if (line.lineId !== action.lineId) {
            return [line];
          }
          const nextQuantity = line.quantity - 1;
          return nextQuantity > 0 ? [updateQuantity(line, nextQuantity)] : [];
        }),
      );
    case "removeLine":
      return withTotals(
        state.eventId,
        state.lines.filter((line) => line.lineId !== action.lineId),
      );
    case "clear":
      return createInitialCheckoutState(state.eventId);
  }
}

function createLineId(item: CheckoutItemInput): string {
  return `${item.kind}:${item.refId}`;
}

function createLine(item: CheckoutItemInput, lineId: string): CheckoutLine {
  return {
    lineId,
    kind: item.kind,
    refId: item.refId,
    displayName: item.displayName,
    productGenre: item.productGenre,
    unitPrice: item.unitPrice,
    quantity: 1,
    subtotal: item.unitPrice,
    ...(item.components ? { components: item.components.map((component) => ({ ...component })) } : {}),
  };
}

function updateQuantity(line: CheckoutLine, quantity: number): CheckoutLine {
  return {
    ...line,
    quantity,
    subtotal: line.unitPrice * quantity,
  };
}

function withTotals(eventId: string, lines: CheckoutLine[]): CheckoutState {
  return {
    eventId,
    lines,
    ...calculateCheckoutTotals(lines),
  };
}
