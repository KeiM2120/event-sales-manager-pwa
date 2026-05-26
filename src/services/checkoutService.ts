import { checkoutToSale, type CheckoutToSaleInput } from "../domain/checkout";
import { validateCheckoutStock } from "../domain/inventory";
import type {
  CheckoutState,
  ProductGenre,
  Sale,
  SaleLine,
} from "../domain/types";
import type { EventSalesDatabase } from "../db/database";

export interface ReservationHandoverInput {
  eventId: string;
  productId: string;
  productName: string;
  productGenre: ProductGenre;
  unitPrice: number;
  saleId: string;
  datetime: string;
}

export async function confirmCheckout(
  db: EventSalesDatabase,
  state: CheckoutState,
  input: CheckoutToSaleInput,
): Promise<Sale> {
  const sale = checkoutToSale(state, input);

  await db.transaction(
    "rw",
    db.eventInventories,
    db.sales,
    async () => {
      const [inventories, existingSales] = await Promise.all([
        db.eventInventories.where("eventId").equals(state.eventId).toArray(),
        db.sales.where("eventId").equals(state.eventId).toArray(),
      ]);
      const validation = validateCheckoutStock({
        inventories,
        existingSales,
        nextLines: sale.lines,
      });

      if (!validation.ok) {
        throw new Error(validation.errors.join("\n"));
      }

      for (const line of sale.lines.filter((item) => item.kind === "reservation")) {
        const key: [string, string] = [state.eventId, line.refId];
        const inventory = await db.eventInventories.get(key);
        if (!inventory) {
          throw new Error(`取り置き在庫が不足しています: ${line.displayName}`);
        }

        await db.eventInventories.put({
          ...inventory,
          reservedStock: inventory.reservedStock - line.quantity,
        });
      }

      await db.sales.put(sale);
    },
  );

  return sale;
}

export async function handoverReservation(
  db: EventSalesDatabase,
  input: ReservationHandoverInput,
): Promise<Sale> {
  const saleLine: SaleLine = {
    lineId: `reservation:${input.productId}`,
    kind: "reservation",
    refId: input.productId,
    displayName: `取り置き ${input.productName}`,
    productGenre: input.productGenre,
    unitPrice: input.unitPrice,
    quantity: 1,
    subtotal: input.unitPrice,
  };
  const sale: Sale = {
    id: input.saleId,
    eventId: input.eventId,
    datetime: input.datetime,
    totalAmount: input.unitPrice,
    canceled: false,
    lines: [saleLine],
  };

  await db.transaction(
    "rw",
    db.eventInventories,
    db.sales,
    async () => {
      const key: [string, string] = [input.eventId, input.productId];
      const inventory = await db.eventInventories.get(key);

      if (!inventory || inventory.reservedStock < 1) {
        throw new Error(`取り置き在庫が不足しています: ${input.productName}`);
      }

      await db.eventInventories.put({
        ...inventory,
        reservedStock: inventory.reservedStock - 1,
      });
      await db.sales.put(sale);
    },
  );

  return sale;
}

export async function undoSale(
  db: EventSalesDatabase,
  saleId: string,
): Promise<void> {
  await db.transaction("rw", db.eventInventories, db.sales, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale || sale.canceled) {
      return;
    }

    for (const line of sale.lines.filter((item) => item.kind === "reservation")) {
      const key: [string, string] = [sale.eventId, line.refId];
      const inventory = await db.eventInventories.get(key);
      if (inventory) {
        await db.eventInventories.put({
          ...inventory,
          reservedStock: inventory.reservedStock + line.quantity,
        });
      }
    }

    await db.sales.update(saleId, { canceled: true });
  });
}
