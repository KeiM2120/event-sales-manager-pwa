import type {
  Bundle,
  BundleItem,
  Event,
  EventInventory,
  Expense,
  Product,
  Sale,
} from "../domain/types";

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    name: "コミックマーケット",
    eventDate: "2026-08-16",
    series: "comic-market",
    ...overrides,
  };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    name: "新刊",
    productGenre: "book",
    defaultPrice: 1000,
    isActive: true,
    ...overrides,
  };
}

export function makeBundle(overrides: Partial<Bundle> = {}): Bundle {
  return {
    id: "bundle-1",
    name: "新刊セット",
    price: 1500,
    isActive: true,
    ...overrides,
  };
}

export function makeBundleItem(
  overrides: Partial<BundleItem> = {},
): BundleItem {
  return {
    bundleId: "bundle-1",
    productId: "product-1",
    quantity: 1,
    ...overrides,
  };
}

export function makeInventory(
  overrides: Partial<EventInventory> = {},
): EventInventory {
  return {
    eventId: "event-1",
    productId: "product-1",
    initialStock: 10,
    reservedStock: 0,
    ...overrides,
  };
}

export function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: "sale-1",
    eventId: "event-1",
    datetime: "2026-08-16T10:00:00+09:00",
    totalAmount: 0,
    canceled: false,
    lines: [],
    ...overrides,
  };
}

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-1",
    eventId: "event-1",
    category: "transport",
    payee: "JR",
    amount: 840,
    ...overrides,
  };
}
