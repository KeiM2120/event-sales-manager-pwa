# Event Operations Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホームで選択中イベントと詳細セットアップ状態を表示し、設定画面から選択中イベントの運用データだけを安全に初期化できるようにする。

**Architecture:** `App` が `selectedEventId` を保持し、Home/Checkout/Statistics/Settings へ渡す。セットアップ状態は React/Dexie 非依存の `src/domain/setupStatus.ts` で計算し、イベント別初期化は `src/services/eventResetService.ts` の Dexie transaction に閉じ込める。

**Tech Stack:** React, TypeScript, Dexie, dexie-react-hooks, Vitest, Testing Library, fake-indexeddb

---

## File Structure

- Create: `src/domain/setupStatus.ts`
  - イベント、商品、セット、在庫からセットアップ行と会計可能状態を計算する純粋関数。
- Create: `src/domain/setupStatus.test.ts`
  - 必須項目、任意項目、選択中イベント在庫の判定を検証する。
- Create: `src/services/eventResetService.ts`
  - 選択中イベントの `eventInventories` / `sales` / `expenses` だけを transaction で削除する。
- Create: `src/services/eventResetService.test.ts`
  - 削除範囲と保持対象を fake-indexeddb で検証する。
- Modify: `src/pages/HomePage.tsx`
  - 選択中イベント、イベント切り替え、セットアップ状態を表示する。
- Modify: `src/pages/HomePage.test.tsx`
  - イベント切り替えとセットアップ状態の表示を検証する。
- Modify: `src/App.tsx`
  - `selectedEventId` を state 化し、削除・未登録時のフォールバックと会計遷移ガードを実装する。
- Modify: `src/App.test.tsx`
  - 選択中イベント連動と、イベントなし/選択中イベント在庫なしのリダイレクトを検証する。
- Modify: `src/pages/SettingsPage.tsx`
  - 選択中イベント名の完全一致入力による危険操作 UI を追加する。
- Modify: `src/pages/SettingsPage.test.tsx`
  - ガード、初期化結果、CSV が選択中イベント対象であることを検証する。

---

### Task 1: Add Setup Status Domain Logic

**Files:**
- Create: `src/domain/setupStatus.ts`
- Create: `src/domain/setupStatus.test.ts`

- [ ] **Step 1: Write the failing domain tests**

Create `src/domain/setupStatus.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Bundle, Event, EventInventory, Product } from "./types";
import { buildSetupStatus } from "./setupStatus";

const events: Event[] = [
  { id: "event-1", name: "コミティア150", eventDate: "2026-11-23", series: "other" },
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
  { eventId: "event-1", productId: "book-1", initialStock: 30, reservedStock: 2 },
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
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm test -- src/domain/setupStatus.test.ts
```

Expected: FAIL because `src/domain/setupStatus.ts` does not exist.

- [ ] **Step 3: Implement setup status logic**

Create `src/domain/setupStatus.ts`:

```ts
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
```

- [ ] **Step 4: Run the domain test**

Run:

```bash
npm test -- src/domain/setupStatus.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/setupStatus.ts src/domain/setupStatus.test.ts
git commit -m "feat: add setup status domain logic"
```

---

### Task 2: Add Selected Event Reset Service

**Files:**
- Create: `src/services/eventResetService.ts`
- Create: `src/services/eventResetService.test.ts`

- [ ] **Step 1: Write the failing service test**

Create `src/services/eventResetService.test.ts`:

```ts
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EventSalesDatabase } from "../db/database";
import { resetSelectedEventOperationalData } from "./eventResetService";

describe("resetSelectedEventOperationalData", () => {
  let database: EventSalesDatabase;

  beforeEach(() => {
    database = new EventSalesDatabase(`event-reset-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await database.delete();
    database.close();
  });

  it("deletes only selected-event inventory, sales, and expenses", async () => {
    await database.events.bulkPut([
      { id: "event-1", name: "コミティア150", eventDate: "2026-11-23", series: "other" },
      { id: "event-2", name: "コミケ105", eventDate: "2026-12-30", series: "comic-market" },
    ]);
    await database.products.put({
      id: "book-1",
      name: "新刊",
      productGenre: "book",
      defaultPrice: 1000,
      isActive: true,
    });
    await database.bundles.put({
      id: "bundle-1",
      name: "セット",
      price: 1500,
      isActive: true,
    });
    await database.bundleItems.put({
      bundleId: "bundle-1",
      productId: "book-1",
      quantity: 1,
    });
    await database.eventInventories.bulkPut([
      { eventId: "event-1", productId: "book-1", initialStock: 30, reservedStock: 2 },
      { eventId: "event-2", productId: "book-1", initialStock: 40, reservedStock: 1 },
    ]);
    await database.sales.bulkPut([
      {
        id: "sale-1",
        eventId: "event-1",
        datetime: "2026-11-23T10:00:00+09:00",
        totalAmount: 1000,
        canceled: false,
        lines: [],
      },
      {
        id: "sale-2",
        eventId: "event-2",
        datetime: "2026-12-30T10:00:00+09:00",
        totalAmount: 1000,
        canceled: false,
        lines: [],
      },
    ]);
    await database.expenses.bulkPut([
      { id: "expense-1", eventId: "event-1", category: "printing", payee: "印刷所", amount: 500 },
      { id: "expense-2", eventId: "event-2", category: "space", payee: "会場", amount: 1000 },
    ]);

    const result = await resetSelectedEventOperationalData(database, "event-1");

    expect(result).toEqual({ inventories: 1, sales: 1, expenses: 1 });
    expect(await database.eventInventories.toArray()).toEqual([
      expect.objectContaining({ eventId: "event-2" }),
    ]);
    expect(await database.sales.toArray()).toEqual([
      expect.objectContaining({ id: "sale-2", eventId: "event-2" }),
    ]);
    expect(await database.expenses.toArray()).toEqual([
      expect.objectContaining({ id: "expense-2", eventId: "event-2" }),
    ]);
    expect(await database.events.count()).toBe(2);
    expect(await database.products.count()).toBe(1);
    expect(await database.bundles.count()).toBe(1);
    expect(await database.bundleItems.count()).toBe(1);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm test -- src/services/eventResetService.test.ts
```

Expected: FAIL because `eventResetService.ts` does not exist.

- [ ] **Step 3: Implement the reset service**

Create `src/services/eventResetService.ts`:

```ts
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
```

- [ ] **Step 4: Run the service test**

Run:

```bash
npm test -- src/services/eventResetService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/eventResetService.ts src/services/eventResetService.test.ts
git commit -m "feat: add selected event reset service"
```

---

### Task 3: Add Home Event Selection and Setup Status UI

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`

- [ ] **Step 1: Write the failing Home tests**

Replace `src/pages/HomePage.test.tsx` with:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Bundle, Event, EventInventory, Product } from "../domain/types";
import { HomePage } from "./HomePage";

const events: Event[] = [
  { id: "event-1", name: "コミティア150", eventDate: "2026-11-23", series: "other" },
  { id: "event-2", name: "コミケ105", eventDate: "2026-12-30", series: "comic-market" },
];

const products: Product[] = [
  { id: "book-1", name: "新刊", productGenre: "book", defaultPrice: 1000, isActive: true },
];

const bundles: Bundle[] = [
  { id: "bundle-1", name: "会場限定セット", price: 1500, isActive: true },
];

const inventories: EventInventory[] = [
  { eventId: "event-1", productId: "book-1", initialStock: 30, reservedStock: 2 },
];

describe("HomePage", () => {
  it("offers quick access to event-day screens", async () => {
    const onNavigate = vi.fn();
    render(
      <HomePage
        events={events}
        products={products}
        bundles={bundles}
        inventories={inventories}
        selectedEventId="event-1"
        onEventChange={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "会計へ" }));
    expect(onNavigate).toHaveBeenCalledWith("checkout");
  });

  it("shows and changes the selected event", async () => {
    const onEventChange = vi.fn();
    render(
      <HomePage
        events={events}
        products={products}
        bundles={bundles}
        inventories={inventories}
        selectedEventId="event-1"
        onEventChange={onEventChange}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getByText("選択中イベント")).toBeInTheDocument();
    expect(screen.getByDisplayValue("event-1")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("イベントを選択"), "event-2");

    expect(onEventChange).toHaveBeenCalledWith("event-2");
  });

  it("shows detailed setup status", () => {
    render(
      <HomePage
        events={events}
        products={products}
        bundles={[]}
        inventories={inventories}
        selectedEventId="event-1"
        onEventChange={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getByText("セットアップ状態")).toBeInTheDocument();
    expect(screen.getByText("イベント")).toBeInTheDocument();
    expect(screen.getByText("商品")).toBeInTheDocument();
    expect(screen.getByText("セット")).toBeInTheDocument();
    expect(screen.getByText("在庫")).toBeInTheDocument();
    expect(screen.getByText("会計可能状態")).toBeInTheDocument();
    expect(screen.getByText("1件")).toBeInTheDocument();
    expect(screen.getByText("セットは任意です")).toBeInTheDocument();
    expect(screen.getByText("会計を開始できます")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the failing Home tests**

Run:

```bash
npm test -- src/pages/HomePage.test.tsx
```

Expected: FAIL because `HomePage` does not accept the new props yet.

- [ ] **Step 3: Update HomePage**

Modify `src/pages/HomePage.tsx`:

```tsx
import type { AppScreen } from "../components/AppShell";
import { buildSetupStatus } from "../domain/setupStatus";
import type { Bundle, Event, EventInventory, Product } from "../domain/types";

interface HomePageProps {
  bundles: Bundle[];
  events: Event[];
  inventories: EventInventory[];
  onEventChange: (eventId: string) => void;
  onNavigate: (screen: AppScreen) => void;
  products: Product[];
  selectedEventId: string | null;
}

const quickActions: Array<{ label: string; screen: AppScreen; body: string }> = [
  { label: "会計へ", screen: "checkout", body: "頒布中の会計をすぐ始める" },
  { label: "統計へ", screen: "stats", body: "売上と頒布数を確認する" },
  { label: "管理へ", screen: "management", body: "商品・在庫・イベントを編集する" },
];

export function HomePage({
  bundles,
  events,
  inventories,
  onEventChange,
  onNavigate,
  products,
  selectedEventId,
}: HomePageProps) {
  const setupStatus = buildSetupStatus({
    events,
    products,
    bundles,
    inventories,
    selectedEventId,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ホーム</h1>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">選択中イベント</h2>
        {events.length > 0 ? (
          <label className="mt-3 block">
            <span className="text-sm font-semibold text-slate-700">イベントを選択</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-3"
              value={setupStatus.selectedEvent?.id ?? ""}
              onChange={(event) => onEventChange(event.target.value)}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} / {event.eventDate}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="mt-2 text-sm text-slate-600">イベントを登録してください。</p>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">セットアップ状態</h2>
        <div className="mt-3 grid gap-2">
          {setupStatus.rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className="flex min-h-14 items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left"
              onClick={() => onNavigate("management")}
            >
              <span>
                <span className="block font-semibold">{row.label}</span>
                <span className="block text-sm text-slate-600">{row.detail}</span>
              </span>
              <span className="text-sm font-semibold">
                {typeof row.count === "number" ? `${row.count}件` : row.state === "complete" ? "OK" : "未完了"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-3">
        {quickActions.map((action) => (
          <button
            key={action.screen}
            type="button"
            aria-label={action.label}
            onClick={() => onNavigate(action.screen)}
            className="min-h-20 rounded-md bg-white p-4 text-left shadow-sm ring-1 ring-slate-200"
          >
            <span className="block text-lg font-bold">{action.label}</span>
            <span className="mt-1 block text-sm text-slate-600">{action.body}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the Home tests**

Run:

```bash
npm test -- src/pages/HomePage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: show event setup status on home"
```

---

### Task 4: Wire Selected Event Through App

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add failing App integration tests**

Add this test to `src/App.test.tsx`:

```tsx
it("uses the selected event for checkout navigation guards", async () => {
  await database.events.bulkPut([
    { id: "event-1", name: "イベント1", eventDate: "2026-11-23", series: "other" },
    { id: "event-2", name: "イベント2", eventDate: "2026-12-30", series: "comic-market" },
  ]);
  await database.products.put({
    id: "book-1",
    name: "新刊",
    productGenre: "book",
    defaultPrice: 1000,
    isActive: true,
  });
  await database.eventInventories.put({
    eventId: "event-2",
    productId: "book-1",
    initialStock: 30,
    reservedStock: 0,
  });

  render(<App database={database} />);

  await userEvent.selectOptions(await screen.findByLabelText("イベントを選択"), "event-2");
  await userEvent.click(screen.getByRole("button", { name: "会計" }));

  expect(await screen.findByRole("heading", { name: "会計" })).toBeInTheDocument();
  expect(screen.getByText("イベント2 / 2026-12-30")).toBeInTheDocument();
});

it("redirects checkout when the selected event has no inventory", async () => {
  await database.events.bulkPut([
    { id: "event-1", name: "イベント1", eventDate: "2026-11-23", series: "other" },
    { id: "event-2", name: "イベント2", eventDate: "2026-12-30", series: "comic-market" },
  ]);
  await database.products.put({
    id: "book-1",
    name: "新刊",
    productGenre: "book",
    defaultPrice: 1000,
    isActive: true,
  });
  await database.eventInventories.put({
    eventId: "event-1",
    productId: "book-1",
    initialStock: 30,
    reservedStock: 0,
  });

  render(<App database={database} />);

  await userEvent.selectOptions(await screen.findByLabelText("イベントを選択"), "event-2");
  await userEvent.click(screen.getByRole("button", { name: "会計" }));

  expect(await screen.findByRole("heading", { name: "管理" })).toBeInTheDocument();
  expect(screen.getByText("在庫を登録すると会計を開始できます。")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run failing App tests**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL until `App` passes the new Home props and checks selected-event inventory.

- [ ] **Step 3: Update App selected-event state and guard**

Modify `src/App.tsx` so it follows this structure:

```tsx
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppShell, type AppScreen } from "./components/AppShell";
import { db as appDatabase, type EventSalesDatabase } from "./db/database";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { ManagementPage } from "./pages/ManagementPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatisticsPage } from "./pages/StatisticsPage";

interface AppProps {
  database?: EventSalesDatabase;
}

function App({ database = appDatabase }: AppProps) {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [managementNotice, setManagementNotice] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const events = useLiveQuery(() => database.events.toArray(), [database]) ?? [];
  const products = useLiveQuery(() => database.products.toArray(), [database]) ?? [];
  const bundles = useLiveQuery(() => database.bundles.toArray(), [database]) ?? [];
  const inventories =
    useLiveQuery(() => database.eventInventories.toArray(), [database]) ?? [];
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;
  const effectiveSelectedEventId = selectedEvent?.id ?? null;

  useEffect(() => {
    if (effectiveSelectedEventId !== selectedEventId) {
      setSelectedEventId(effectiveSelectedEventId);
    }
  }, [effectiveSelectedEventId, selectedEventId]);

  async function handleNavigate(nextScreen: AppScreen) {
    if (nextScreen === "checkout") {
      if (!effectiveSelectedEventId) {
        setManagementNotice("イベントを登録すると会計を開始できます。");
        setScreen("management");
        return;
      }

      const inventoryCount = await database.eventInventories
        .where("eventId")
        .equals(effectiveSelectedEventId)
        .count();

      if (inventoryCount === 0) {
        setManagementNotice("在庫を登録すると会計を開始できます。");
        setScreen("management");
        return;
      }
    }

    setManagementNotice(null);
    setScreen(nextScreen);
  }

  return (
    <AppShell current={screen} onNavigate={handleNavigate}>
      {screen === "home" && (
        <HomePage
          events={events}
          products={products}
          bundles={bundles}
          inventories={inventories}
          selectedEventId={effectiveSelectedEventId}
          onEventChange={setSelectedEventId}
          onNavigate={handleNavigate}
        />
      )}
      {screen === "checkout" && effectiveSelectedEventId && (
        <CheckoutPage database={database} eventId={effectiveSelectedEventId} />
      )}
      {screen === "stats" && effectiveSelectedEventId && (
        <StatisticsPage database={database} eventId={effectiveSelectedEventId} />
      )}
      {screen === "management" && (
        <ManagementPage database={database} notice={managementNotice} />
      )}
      {screen === "settings" && effectiveSelectedEventId && (
        <SettingsPage database={database} eventId={effectiveSelectedEventId} />
      )}
    </AppShell>
  );
}

export default App;
```

- [ ] **Step 4: Run App tests**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire selected event through app"
```

---

### Task 5: Add Guarded Event Reset UI in Settings

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`

- [ ] **Step 1: Add failing Settings tests**

Add these tests to `src/pages/SettingsPage.test.tsx`:

```tsx
it("keeps event reset disabled until the selected event name matches", async () => {
  await database.events.put({
    id: "event-1",
    name: "コミティア150",
    eventDate: "2026-11-23",
    series: "other",
  });

  render(<SettingsPage database={database} eventId="event-1" />);

  const resetButton = await screen.findByRole("button", {
    name: "選択中イベントの運用データを初期化",
  });
  expect(resetButton).toBeDisabled();

  await userEvent.type(screen.getByLabelText("確認のためイベント名を入力"), "コミティア149");
  expect(resetButton).toBeDisabled();

  await userEvent.clear(screen.getByLabelText("確認のためイベント名を入力"));
  await userEvent.type(screen.getByLabelText("確認のためイベント名を入力"), "コミティア150");
  expect(resetButton).toBeEnabled();
});

it("resets only selected-event operational data from settings", async () => {
  await database.events.bulkPut([
    { id: "event-1", name: "コミティア150", eventDate: "2026-11-23", series: "other" },
    { id: "event-2", name: "コミケ105", eventDate: "2026-12-30", series: "comic-market" },
  ]);
  await database.products.put({
    id: "book-1",
    name: "新刊",
    productGenre: "book",
    defaultPrice: 1000,
    isActive: true,
  });
  await database.bundles.put({ id: "bundle-1", name: "セット", price: 1500, isActive: true });
  await database.bundleItems.put({ bundleId: "bundle-1", productId: "book-1", quantity: 1 });
  await database.eventInventories.bulkPut([
    { eventId: "event-1", productId: "book-1", initialStock: 30, reservedStock: 0 },
    { eventId: "event-2", productId: "book-1", initialStock: 40, reservedStock: 0 },
  ]);
  await database.sales.put({
    id: "sale-1",
    eventId: "event-1",
    datetime: "2026-11-23T10:00:00+09:00",
    totalAmount: 1000,
    canceled: false,
    lines: [],
  });
  await database.expenses.put({
    id: "expense-1",
    eventId: "event-1",
    category: "printing",
    payee: "印刷所",
    amount: 500,
  });

  render(<SettingsPage database={database} eventId="event-1" />);

  await userEvent.type(
    await screen.findByLabelText("確認のためイベント名を入力"),
    "コミティア150",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "選択中イベントの運用データを初期化" }),
  );

  expect(await screen.findByText("選択中イベントの運用データを初期化しました。")).toBeInTheDocument();
  expect(await database.eventInventories.where("eventId").equals("event-1").count()).toBe(0);
  expect(await database.eventInventories.where("eventId").equals("event-2").count()).toBe(1);
  expect(await database.sales.where("eventId").equals("event-1").count()).toBe(0);
  expect(await database.expenses.where("eventId").equals("event-1").count()).toBe(0);
  expect(await database.events.count()).toBe(2);
  expect(await database.products.count()).toBe(1);
  expect(await database.bundles.count()).toBe(1);
  expect(await database.bundleItems.count()).toBe(1);
});
```

- [ ] **Step 2: Run failing Settings tests**

Run:

```bash
npm test -- src/pages/SettingsPage.test.tsx
```

Expected: FAIL because Settings has no reset UI.

- [ ] **Step 3: Implement Settings reset UI**

Modify `src/pages/SettingsPage.tsx` by importing `useState`, querying the selected event, and adding the dangerous operation section:

```tsx
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db as appDatabase, type EventSalesDatabase } from "../db/database";
import type { Event, Expense, Sale } from "../domain/types";
import { usePwaUpdate } from "../hooks/usePwaUpdate";
import { resetSelectedEventOperationalData } from "../services/eventResetService";
```

Inside the component:

```tsx
const [resetConfirmation, setResetConfirmation] = useState("");
const [resetMessage, setResetMessage] = useState<string | null>(null);
const events =
  (useLiveQuery(() => database.events.toArray(), [database]) as Event[] | undefined) ?? [];
const selectedEvent = events.find((event) => event.id === eventId) ?? null;
const resetEnabled = Boolean(selectedEvent && resetConfirmation === selectedEvent.name);

async function handleResetEventData() {
  if (!selectedEvent || !resetEnabled) {
    return;
  }

  await resetSelectedEventOperationalData(database, selectedEvent.id);
  setResetConfirmation("");
  setResetMessage("選択中イベントの運用データを初期化しました。");
}
```

Add this section after the PWA section:

```tsx
<section className="rounded-md border border-red-200 bg-white p-4">
  <h2 className="font-bold text-red-700">危険操作</h2>
  <p className="mt-1 text-sm text-slate-600">
    選択中イベントの在庫、売上、経費を削除します。この操作は元に戻せません。
  </p>
  <p className="mt-2 text-sm font-semibold">
    対象: {selectedEvent ? selectedEvent.name : "イベント未選択"}
  </p>
  <label className="mt-3 block">
    <span className="text-sm font-semibold text-slate-700">
      確認のためイベント名を入力
    </span>
    <input
      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-3"
      value={resetConfirmation}
      onChange={(event) => setResetConfirmation(event.target.value)}
    />
  </label>
  <button
    type="button"
    className="mt-3 rounded-md bg-red-700 px-3 py-3 font-semibold text-white disabled:bg-slate-300"
    disabled={!resetEnabled}
    onClick={handleResetEventData}
  >
    選択中イベントの運用データを初期化
  </button>
  {resetMessage && <p className="mt-2 text-sm font-semibold text-green-700">{resetMessage}</p>}
</section>
```

- [ ] **Step 4: Run Settings tests**

Run:

```bash
npm test -- src/pages/SettingsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "feat: add guarded selected event reset"
```

---

### Task 6: Final Verification and Cleanup

**Files:**
- Inspect: `src/App.tsx`
- Inspect: `src/pages/HomePage.tsx`
- Inspect: `src/pages/SettingsPage.tsx`
- Inspect: `src/domain/setupStatus.ts`
- Inspect: `src/services/eventResetService.ts`

- [ ] **Step 1: Run the targeted tests**

Run:

```bash
npm test -- src/domain/setupStatus.test.ts src/services/eventResetService.test.ts src/pages/HomePage.test.tsx src/pages/SettingsPage.test.tsx src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with zero warnings.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS and Vite writes `dist/`.

- [ ] **Step 5: Manual browser smoke check**

Use the running dev server at:

```text
http://127.0.0.1:5173/event-sales-manager-pwa/
```

Check:

- Home shows selected event and setup status.
- Switching event changes the selected event.
- Checkout uses the selected event.
- Settings reset button is disabled until the exact event name is entered.
- Reset removes selected-event inventory/sales/expenses and Home then shows checkout not ready.

- [ ] **Step 6: Commit final adjustments if any**

If verification requires small fixes:

```bash
git add src/domain/setupStatus.ts src/domain/setupStatus.test.ts src/services/eventResetService.ts src/services/eventResetService.test.ts src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/App.tsx src/App.test.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "test: verify event operations reset flow"
```

---

## Self-Review

- Spec coverage:
  - Event selection is covered by Task 3 and Task 4.
  - Detailed setup status is covered by Task 1 and Task 3.
  - Selected-event checkout guard is covered by Task 4.
  - Event operational reset is covered by Task 2 and Task 5.
  - Minimal domain/service boundaries are covered by Task 1 and Task 2.
- Placeholder scan:
  - No `TODO`, `TBD`, or unspecified implementation steps remain.
- Type consistency:
  - `buildSetupStatus`, `SetupStatusRow`, and `resetSelectedEventOperationalData` are defined before use.
  - `selectedEventId` is consistently `string | null` in Home/App planning.
