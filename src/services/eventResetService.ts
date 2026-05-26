import type { EventSalesDatabase } from "../db/database";

export interface EventResetResult {
  inventories: number;
  sales: number;
  expenses: number;
}

export async function resetSelectedEventOperationalData(
  database: EventSalesDatabase,
  eventId: string,
): Promise<EventResetResult> {
  return database.transaction(
    "rw",
    database.eventInventories,
    database.sales,
    database.expenses,
    async () => {
      const [inventoryKeys, saleKeys, expenseKeys] = await Promise.all([
        database.eventInventories.where("eventId").equals(eventId).primaryKeys(),
        database.sales.where("eventId").equals(eventId).primaryKeys(),
        database.expenses.where("eventId").equals(eventId).primaryKeys(),
      ]);

      await Promise.all([
        database.eventInventories.bulkDelete(inventoryKeys),
        database.sales.bulkDelete(saleKeys),
        database.expenses.bulkDelete(expenseKeys),
      ]);

      return {
        inventories: inventoryKeys.length,
        sales: saleKeys.length,
        expenses: expenseKeys.length,
      };
    },
  );
}
