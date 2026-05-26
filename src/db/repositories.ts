import type { Table } from "dexie";
import type {
  Bundle,
  BundleItem,
  Event,
  EventInventory,
  Expense,
  Product,
  Sale,
} from "../domain/types";
import { db, type EventSalesDatabase } from "./database";

export interface Repositories {
  events: Table<Event, string>;
  products: Table<Product, string>;
  bundles: Table<Bundle, string>;
  bundleItems: Table<BundleItem, [string, string]>;
  eventInventories: Table<EventInventory, [string, string]>;
  sales: Table<Sale, string>;
  expenses: Table<Expense, string>;
}

export function createRepositories(database: EventSalesDatabase): Repositories {
  return {
    events: database.events,
    products: database.products,
    bundles: database.bundles,
    bundleItems: database.bundleItems,
    eventInventories: database.eventInventories,
    sales: database.sales,
    expenses: database.expenses,
  };
}

export const repositories = createRepositories(db);
