import { describe, expect, it } from "vitest";
import type { Bundle, Event, EventInventory, Product } from "./types";
import { buildSetupStatus } from "./setupStatus";

const events: Event[] = [
  {
    id: "event-1",
    name: "コミティア150",
    eventDate: "2026-11-23",
    series: "other",
  },
];

const products: Product[] = [
  {
    id: "book-1",
    name: "新刊",
    productGenre: "book",
    defaultPrice: 1000,
    isActive: true,
  },
];

const bundles: Bundle[] = [
  { id: "bundle-1", name: "会場限定セット", price: 1500, isActive: true },
];

const inventories: EventInventory[] = [
  {
    eventId: "event-1",
    productId: "book-1",
    initialStock: 30,
    reservedStock: 2,
  },
];

describe("buildSetupStatus", () => {
  it("marks checkout ready when event, active product, and selected-event inventory exist", () => {
    const status = buildSetupStatus({
      events,
      products,
      bundles,
      inventories,
      selectedEventId: "event-1",
    });

    expect(status.checkoutReady).toBe(true);
    expect(status.selectedEvent?.name).toBe("コミティア150");
    expect(status.rows).toEqual([
      expect.objectContaining({ id: "events", state: "complete", count: 1 }),
      expect.objectContaining({ id: "products", state: "complete", count: 1 }),
      expect.objectContaining({ id: "bundles", state: "complete", count: 1 }),
      expect.objectContaining({ id: "inventory", state: "complete", count: 1 }),
      expect.objectContaining({ id: "checkout", state: "complete" }),
    ]);
  });

  it("does not require bundles for checkout readiness", () => {
    const status = buildSetupStatus({
      events,
      products,
      bundles: [],
      inventories,
      selectedEventId: "event-1",
    });

    expect(status.checkoutReady).toBe(true);
    expect(status.rows.find((row) => row.id === "bundles")).toEqual(
      expect.objectContaining({ state: "warning", required: false, count: 0 }),
    );
  });

  it("requires inventory for the selected event", () => {
    const status = buildSetupStatus({
      events,
      products,
      bundles,
      inventories: [{ ...inventories[0], eventId: "other-event" }],
      selectedEventId: "event-1",
    });

    expect(status.checkoutReady).toBe(false);
    expect(status.rows.find((row) => row.id === "inventory")).toEqual(
      expect.objectContaining({ state: "missing", count: 0 }),
    );
  });
});
