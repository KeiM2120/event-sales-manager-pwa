import type { Bundle, Event, EventInventory, Product } from "./types";

export type SetupStatusRowId =
  | "events"
  | "products"
  | "bundles"
  | "inventory"
  | "checkout";

export type SetupStatusState = "complete" | "warning" | "missing";

export interface SetupStatusRow {
  id: SetupStatusRowId;
  label: string;
  detail: string;
  count?: number;
  required: boolean;
  state: SetupStatusState;
}

export interface SetupStatusInput {
  events: Event[];
  products: Product[];
  bundles: Bundle[];
  inventories: EventInventory[];
  selectedEventId: string | null;
}

export interface SetupStatus {
  selectedEvent: Event | null;
  activeProductCount: number;
  activeBundleCount: number;
  selectedEventInventoryCount: number;
  checkoutReady: boolean;
  rows: SetupStatusRow[];
}

export function buildSetupStatus({
  events,
  products,
  bundles,
  inventories,
  selectedEventId,
}: SetupStatusInput): SetupStatus {
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;
  const activeProductCount = products.filter((product) => product.isActive).length;
  const activeBundleCount = bundles.filter((bundle) => bundle.isActive).length;
  const selectedEventInventoryCount = selectedEvent
    ? inventories.filter((inventory) => inventory.eventId === selectedEvent.id).length
    : 0;
  const hasEvents = events.length > 0;
  const hasProducts = activeProductCount > 0;
  const hasInventory = selectedEventInventoryCount > 0;
  const checkoutReady = hasEvents && hasProducts && hasInventory;

  return {
    selectedEvent,
    activeProductCount,
    activeBundleCount,
    selectedEventInventoryCount,
    checkoutReady,
    rows: [
      {
        id: "events",
        label: "イベント",
        detail: hasEvents ? "登録済み" : "イベントを登録してください",
        count: events.length,
        required: true,
        state: hasEvents ? "complete" : "missing",
      },
      {
        id: "products",
        label: "商品",
        detail: hasProducts ? "有効な商品があります" : "商品を登録してください",
        count: activeProductCount,
        required: true,
        state: hasProducts ? "complete" : "missing",
      },
      {
        id: "bundles",
        label: "セット",
        detail: activeBundleCount > 0 ? "登録済み" : "セットは任意です",
        count: activeBundleCount,
        required: false,
        state: activeBundleCount > 0 ? "complete" : "warning",
      },
      {
        id: "inventory",
        label: "在庫",
        detail: hasInventory ? "選択中イベントの在庫があります" : "在庫を登録してください",
        count: selectedEventInventoryCount,
        required: true,
        state: hasInventory ? "complete" : "missing",
      },
      {
        id: "checkout",
        label: "会計可能状態",
        detail: checkoutReady ? "会計を開始できます" : "必須項目を登録してください",
        required: true,
        state: checkoutReady ? "complete" : "missing",
      },
    ],
  };
}
