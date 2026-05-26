import Dexie, { type Table } from "dexie";
import type {
  Bundle,
  BundleItem,
  Event,
  EventInventory,
  Expense,
  Product,
  Sale,
} from "../domain/types";

export const storeNames = [
  "events",
  "products",
  "bundles",
  "bundleItems",
  "eventInventories",
  "sales",
  "expenses",
] as const;

export type StoreName = (typeof storeNames)[number];

export class EventSalesDatabase extends Dexie {
  events!: Table<Event, string>;
  products!: Table<Product, string>;
  bundles!: Table<Bundle, string>;
  bundleItems!: Table<BundleItem, [string, string]>;
  eventInventories!: Table<EventInventory, [string, string]>;
  sales!: Table<Sale, string>;
  expenses!: Table<Expense, string>;

  constructor(name = "event-sales-manager") {
    super(name);

    this.version(1).stores({
      events: "id,eventDate,series",
      products: "id,name,productGenre,isActive",
      bundles: "id,name,isActive",
      bundleItems: "[bundleId+productId],bundleId,productId",
      eventInventories: "[eventId+productId],eventId,productId",
      sales: "id,[eventId+datetime],eventId,datetime,canceled",
      expenses: "id,eventId,category",
    });
  }
}

export const db = new EventSalesDatabase();
