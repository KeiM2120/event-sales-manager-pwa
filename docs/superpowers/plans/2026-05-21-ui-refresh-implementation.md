# UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/superpowers/specs/2026-05-21-ui-refresh-design-notes.md` とモックを根拠に、会計・ホーム・管理・統計・設定の UI を `#738dc2` 基調の運用向け画面へ刷新する。

**Architecture:** 既存の React/Vite/Tailwind 構成を保ち、ドメイン計算は `src/domain/` に寄せ、画面固有の表示組み立ては各 `src/pages/*Page.tsx` に閉じる。共通の色・カード・チップ・下部固定アクションは小さな UI 部品として `src/components/` に追加し、管理画面のモーダル化は既存 `Modal` を拡張して使う。

**Tech Stack:** React 18, TypeScript strict, Vite, TailwindCSS, Dexie, IndexedDB, Vitest, Testing Library.

---

## 参照資料

- 仕様メモ: `docs/superpowers/specs/2026-05-21-ui-refresh-design-notes.md`
- モック: `.superpowers/brainstorm/ui-refresh-20260521/content/visual-style-001.html`
- 現行実装: `src/`

## ファイル構成と責務

- Modify: `src/styles.css`
  - CSS 変数でブランド色、背景、カード、影、フォーカスリングを定義する。
  - 長いタイトルの 1 行省略用 `.truncate-one-line` を定義する。
- Create: `src/components/DesignSystem.tsx`
  - `ScreenTitle`, `SurfaceCard`, `StatusChip`, `HeroEventCard`, `PrimaryActionBar`, `InlineActionButton`, `DangerCard` を提供する。
  - 見た目だけの部品に限定し、DB 操作や画面状態は持たせない。
- Modify: `src/components/AppShell.tsx`
  - ナビゲーション文言を日本語へ復旧し、モックの soft rounded nav に寄せる。
- Modify: `src/components/Modal.tsx`
  - 管理画面の中央モーダルで使えるよう、下部固定ボタンと内部スクロールに耐える最大高さを追加する。
- Modify: `src/domain/inventory.ts`
  - セットの `取扱可能数` を構成頒布物の残数から導出する純関数を追加する。
  - 残数は保存せず、既存の `calculateRemainingStock` を使う。
- Modify: `src/domain/stats.ts`
  - 統計画面用に客数、販売点数、頒布物ランキング、ジャンル集計、売上履歴、収支内訳を返す。
  - キャンセル済み売上は集計から除外し、売上履歴にはキャンセル表示用に含める。
- Modify: `src/pages/CheckoutPage.tsx`
  - 会計画面を Card Pattern に刷新する。
  - `商品` 表現を `頒布物` に統一し、ステッパー横並び、選択中明細固定、セット取扱可能数、長名省略を反映する。
- Modify: `src/pages/HomePage.tsx`
  - 選択中イベントカード、セットアップ状態、会計ボタン、今日の売上カードへ刷新する。
  - セットアップ状態の各行は対応する管理タブへ遷移する。
- Modify: `src/pages/ManagementPage.tsx`
  - 管理タブを `イベント / 頒布物 / セット / 在庫 / 経費` にする。
  - 追加・編集をモーダル化し、一覧カードに編集・削除ボタンを表示する。
  - 在庫タブにセットの導出カードと `取扱可能数` を表示する。
- Modify: `src/pages/StatisticsPage.tsx`
  - 統計画面の表示順と固定高スクロール履歴、収支内訳を反映する。
- Modify: `src/pages/SettingsPage.tsx`
  - `アプリ状態 / CSV出力 / 危険操作` に整理し、CSV カードと選択イベントリセット確認を刷新する。
- Modify: `src/services/csvExportService.ts`
  - 収支 CSV のダウンロード関数を追加し、Settings から参照する。
- Modify/Test: 既存の `*.test.tsx` と `*.test.ts`
  - 文字列・挙動・集計の変更に合わせて更新する。

## 実装前の注意

- `Product` など内部型名は変更しない。ユーザーに見える文言だけ `頒布物` に統一する。
- `商品` という表示文字列は実装後に `src` 配下へ残さない。
- 残在庫、セット取扱可能数、統計値は保存しない。既存レコードから導出する。
- `.superpowers/` 配下のモックは実装参考資料であり、本番アプリへ直接取り込まない。
- 現行ファイルには文字化けした日本語文言がある。UI 刷新対象の画面文言はこの計画内の日本語へ置き換える。

---

### Task 1: 共通デザイン基盤と言語復旧

**Files:**
- Modify: `src/styles.css`
- Create: `src/components/DesignSystem.tsx`
- Test: `src/components/BasicComponents.test.tsx`
- Modify: `src/components/AppShell.tsx`
- Test: `src/components/AppShell.test.tsx`

- [ ] **Step 1: 共通部品の失敗テストを書く**

`src/components/BasicComponents.test.tsx` に以下のテストを追加する。

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HeroEventCard,
  PrimaryActionBar,
  StatusChip,
  SurfaceCard,
} from "./DesignSystem";

describe("DesignSystem", () => {
  it("renders shared cards and chips with accessible labels", () => {
    render(
      <SurfaceCard ariaLabel="頒布物カード">
        <StatusChip tone="ok">OK</StatusChip>
        <HeroEventCard eventName="コミティア150" circleSpace="東4ホール た-12b" />
      </SurfaceCard>,
    );

    expect(screen.getByLabelText("頒布物カード")).toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByText("コミティア150")).toBeInTheDocument();
    expect(screen.getByText("東4ホール た-12b")).toBeInTheDocument();
  });

  it("renders a bottom primary action area", () => {
    render(
      <PrimaryActionBar summary={<span>2点 2,000円</span>}>
        <button type="button">会計を確定</button>
      </PrimaryActionBar>,
    );

    expect(screen.getByText("2点 2,000円")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "会計を確定" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 失敗を確認する**

Run: `npm test -- src/components/BasicComponents.test.tsx`

Expected: `Cannot find module './DesignSystem'` で FAIL。

- [ ] **Step 3: `src/styles.css` にデザイントークンを追加する**

既存の Tailwind directive と base style は残し、末尾に以下を追加する。

```css
:root {
  --color-main: #738dc2;
  --color-sub: #a2d7dd;
  --color-accent: #e593b4;
  --color-page: #f6f7fb;
  --color-card: #ffffff;
  --color-text: #172033;
  --color-muted: #667085;
  --color-ok: #15803d;
  --color-warn: #b45309;
  --color-error: #b91c1c;
  --shadow-card: 0 10px 28px rgb(23 32 51 / 0.10);
}

body {
  background: var(--color-page);
  color: var(--color-text);
}

.truncate-one-line {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 4: `DesignSystem` を実装する**

`src/components/DesignSystem.tsx` を作成する。

```tsx
import type { ReactNode } from "react";

type ChipTone = "main" | "sub" | "accent" | "ok" | "warn" | "error" | "muted";

const chipClassName: Record<ChipTone, string> = {
  main: "bg-[#eef3ff] text-[#355184] ring-[#d8e2f7]",
  sub: "bg-[#edf8fa] text-[#28636a] ring-[#d2eef2]",
  accent: "bg-[#fff0f6] text-[#9f3c64] ring-[#f6c8da]",
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  error: "bg-red-50 text-red-700 ring-red-200",
  muted: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function ScreenTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-bold tracking-normal text-slate-950">{children}</h1>;
}

export function SurfaceCard({
  ariaLabel,
  children,
  className = "",
}: {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={`rounded-lg bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-200/70 ${className}`}
    >
      {children}
    </section>
  );
}

export function StatusChip({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: ChipTone;
}) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-bold ring-1 ${chipClassName[tone]}`}
    >
      {children}
    </span>
  );
}

export function HeroEventCard({
  circleSpace,
  eventName,
}: {
  circleSpace?: string;
  eventName: string;
}) {
  return (
    <section className="rounded-2xl bg-[#738dc2] p-5 text-white shadow-[var(--shadow-card)]">
      <p className="truncate-one-line text-2xl font-bold">{eventName}</p>
      {circleSpace ? <p className="mt-2 truncate-one-line text-sm font-bold">{circleSpace}</p> : null}
    </section>
  );
}

export function PrimaryActionBar({
  children,
  summary,
}: {
  children: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <section className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_24px_rgb(23_32_51_/_0.12)] backdrop-blur">
      <div className="mx-auto grid max-w-3xl gap-3">
        {summary}
        {children}
      </div>
    </section>
  );
}

export function InlineActionButton({
  children,
  onClick,
  tone = "main",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "main" | "danger" | "neutral";
}) {
  const className =
    tone === "danger"
      ? "border-red-200 text-red-700"
      : tone === "main"
        ? "border-[#d8e2f7] text-[#355184]"
        : "border-slate-300 text-slate-700";

  return (
    <button
      type="button"
      className={`min-h-11 rounded-md border bg-white px-4 text-sm font-bold ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function DangerCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-red-200 bg-white p-4 shadow-[var(--shadow-card)]">
      {children}
    </section>
  );
}
```

- [ ] **Step 5: AppShell の文言とナビ見た目の失敗テストを書く**

`src/components/AppShell.test.tsx` に、既存テストを残したうえで以下を追加または同等の期待値へ更新する。

```tsx
it("renders Japanese navigation labels", () => {
  render(
    <AppShell current="checkout" onNavigate={() => undefined}>
      <div>content</div>
    </AppShell>,
  );

  expect(screen.getByRole("navigation", { name: "画面切り替え" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "ホーム" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "会計" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "統計" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "管理" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "設定" })).toBeInTheDocument();
});
```

- [ ] **Step 6: AppShell を更新する**

`navigationItems` と JSX の className を以下の形へ置き換える。

```tsx
const navigationItems: Array<{ screen: AppScreen; label: string }> = [
  { screen: "home", label: "ホーム" },
  { screen: "checkout", label: "会計" },
  { screen: "stats", label: "統計" },
  { screen: "management", label: "管理" },
  { screen: "settings", label: "設定" },
];

export function AppShell({ current, onNavigate, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-page)] pb-6 pt-24 text-slate-950">
      <main className="mx-auto min-h-screen w-full max-w-3xl p-4">{children}</main>
      <nav aria-label="画面切り替え" className="fixed inset-x-0 top-0 z-10 bg-white/95 px-3 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 rounded-full border border-[#d8e2f7] bg-[#eef3ff] p-1">
          {navigationItems.map((item) => (
            <button
              key={item.screen}
              type="button"
              aria-current={current === item.screen ? "page" : undefined}
              onClick={() => onNavigate(item.screen)}
              className={
                current === item.screen
                  ? "min-h-12 rounded-full bg-[#738dc2] px-2 text-sm font-bold text-white shadow"
                  : "min-h-12 rounded-full px-2 text-sm font-bold text-[#355184]"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 7: テストを通す**

Run: `npm test -- src/components/BasicComponents.test.tsx src/components/AppShell.test.tsx`

Expected: PASS。

- [ ] **Step 8: コミットする**

```bash
git add src/styles.css src/components/DesignSystem.tsx src/components/BasicComponents.test.tsx src/components/AppShell.tsx src/components/AppShell.test.tsx
git commit -m "feat: add shared UI refresh foundation"
```

---

### Task 2: セット取扱可能数と統計ドメインの更新

**Files:**
- Modify: `src/domain/inventory.ts`
- Test: `src/domain/inventory.test.ts`
- Modify: `src/domain/stats.ts`
- Test: `src/domain/stats.test.ts`

- [ ] **Step 1: セット取扱可能数の失敗テストを書く**

`src/domain/inventory.test.ts` に以下を追加する。

```ts
import { calculateBundleAvailability } from "./inventory";

it("calculates bundle availability from component remaining stock", () => {
  const availability = calculateBundleAvailability({
    bundleId: "bundle-1",
    bundleItems: [
      { bundleId: "bundle-1", productId: "book-a", quantity: 2 },
      { bundleId: "bundle-1", productId: "goods-a", quantity: 1 },
    ],
    inventories: [
      { eventId: "event-1", productId: "book-a", initialStock: 5, reservedStock: 1 },
      { eventId: "event-1", productId: "goods-a", initialStock: 3, reservedStock: 0 },
    ],
    sales: [],
  });

  expect(availability.availableQuantity).toBe(2);
  expect(availability.blockingProductIds).toEqual([]);
});

it("returns zero and blocking products when a component is unavailable", () => {
  const availability = calculateBundleAvailability({
    bundleId: "bundle-1",
    bundleItems: [
      { bundleId: "bundle-1", productId: "book-a", quantity: 1 },
      { bundleId: "bundle-1", productId: "goods-a", quantity: 1 },
    ],
    inventories: [
      { eventId: "event-1", productId: "book-a", initialStock: 1, reservedStock: 1 },
      { eventId: "event-1", productId: "goods-a", initialStock: 3, reservedStock: 0 },
    ],
    sales: [],
  });

  expect(availability.availableQuantity).toBe(0);
  expect(availability.blockingProductIds).toEqual(["book-a"]);
});
```

- [ ] **Step 2: 失敗を確認する**

Run: `npm test -- src/domain/inventory.test.ts`

Expected: `calculateBundleAvailability` が存在せず FAIL。

- [ ] **Step 3: `calculateBundleAvailability` を実装する**

`src/domain/inventory.ts` に型と関数を追加する。

```ts
import type { BundleItem, EventInventory, Sale } from "./types";

export interface BundleAvailabilityInput {
  bundleId: string;
  bundleItems: BundleItem[];
  inventories: EventInventory[];
  sales: Sale[];
}

export interface BundleAvailability {
  availableQuantity: number;
  blockingProductIds: string[];
}

export function calculateBundleAvailability({
  bundleId,
  bundleItems,
  inventories,
  sales,
}: BundleAvailabilityInput): BundleAvailability {
  const components = bundleItems.filter((item) => item.bundleId === bundleId);

  if (components.length === 0) {
    return { availableQuantity: 0, blockingProductIds: [] };
  }

  const quantities = components.map((component) => {
    const remaining = calculateRemainingStock(component.productId, inventories, sales);
    return {
      productId: component.productId,
      availableQuantity: Math.floor(remaining / component.quantity),
    };
  });
  const availableQuantity = Math.max(
    0,
    Math.min(...quantities.map((item) => item.availableQuantity)),
  );

  return {
    availableQuantity,
    blockingProductIds: quantities
      .filter((item) => item.availableQuantity <= 0)
      .map((item) => item.productId),
  };
}
```

既存 import に `BundleItem` を追加し、`./types` からの import 文は 1 つにまとめる。

- [ ] **Step 4: 在庫テストを通す**

Run: `npm test -- src/domain/inventory.test.ts`

Expected: PASS。

- [ ] **Step 5: 統計仕様の失敗テストを書く**

`src/domain/stats.test.ts` に以下を追加する。

```ts
it("counts customers, product ranking, bundle ranking, history, and expense breakdown", () => {
  const stats = calculateEventStats({
    eventId: "event-1",
    expenses: [
      { id: "expense-1", eventId: "event-1", category: "printing", payee: "印刷所", amount: 5000 },
      { id: "expense-2", eventId: "event-1", category: "transport", payee: "電車", amount: 1200 },
      { id: "expense-3", eventId: "event-1", category: "transport", payee: "バス", amount: 300 },
    ],
    sales: [
      {
        id: "sale-1",
        eventId: "event-1",
        datetime: "2026-11-23T10:00:00.000Z",
        totalAmount: 2000,
        canceled: false,
        lines: [
          {
            lineId: "line-1",
            kind: "bundle",
            refId: "bundle-1",
            displayName: "限定セット",
            quantity: 1,
            unitPrice: 1500,
            components: [
              { productId: "book-a", productName: "新刊A", productGenre: "book", quantity: 1 },
              { productId: "goods-a", productName: "グッズA", productGenre: "goods", quantity: 1 },
            ],
          },
          {
            lineId: "line-2",
            kind: "product",
            refId: "book-a",
            displayName: "新刊A",
            productGenre: "book",
            quantity: 1,
            unitPrice: 500,
          },
        ],
      },
      {
        id: "sale-2",
        eventId: "event-1",
        datetime: "2026-11-23T10:01:00.000Z",
        totalAmount: 500,
        canceled: true,
        lines: [
          {
            lineId: "line-3",
            kind: "product",
            refId: "book-a",
            displayName: "新刊A",
            productGenre: "book",
            quantity: 1,
            unitPrice: 500,
          },
        ],
      },
    ],
  });

  expect(stats.summary.customerCount).toBe(1);
  expect(stats.summary.totalQuantity).toBe(2);
  expect(stats.productRanking).toEqual([
    { itemKey: "bundle:bundle-1", displayName: "限定セット", kind: "bundle", quantity: 1 },
    { itemKey: "product:book-a", displayName: "新刊A", kind: "product", quantity: 1 },
  ]);
  expect(stats.genreQuantities).toContainEqual({ productGenre: "book", quantity: 2 });
  expect(stats.expenseBreakdown).toEqual([
    { category: "printing", count: 1, amount: 5000 },
    { category: "transport", count: 2, amount: 1500 },
  ]);
  expect(stats.salesHistory.map((row) => ({ saleId: row.saleId, canceled: row.canceled }))).toEqual([
    { saleId: "sale-2", canceled: true },
    { saleId: "sale-1", canceled: false },
  ]);
});
```

- [ ] **Step 6: 統計テストの失敗を確認する**

Run: `npm test -- src/domain/stats.test.ts`

Expected: `customerCount`, `expenseBreakdown`, `itemKey`, `kind`, `canceled` の不足で FAIL。

- [ ] **Step 7: `src/domain/stats.ts` を更新する**

既存型を以下の形へ拡張する。既存 export 名は維持する。

```ts
export interface EventStatsSummary {
  customerCount: number;
  totalSales: number;
  totalQuantity: number;
  averageUnitPrice: number;
  totalExpenses: number;
  profit: number;
}

export interface ProductRankingRow {
  itemKey: string;
  displayName: string;
  kind: "product" | "bundle" | "reservation";
  quantity: number;
}

export interface SalesHistoryRow {
  saleId: string;
  datetime: string;
  totalAmount: number;
  quantity: number;
  canceled: boolean;
}

export interface ExpenseBreakdownRow {
  category: ExpenseCategory;
  count: number;
  amount: number;
}

export interface EventStats {
  summary: EventStatsSummary;
  genreQuantities: GenreQuantity[];
  productRanking: ProductRankingRow[];
  salesHistory: SalesHistoryRow[];
  expenseBreakdown: ExpenseBreakdownRow[];
}
```

`calculateEventStats` は以下の方針で更新する。

```ts
const eventSales = input.sales.filter((sale) => sale.eventId === input.eventId);
const activeSales = eventSales.filter((sale) => !sale.canceled);
const movementRows = buildProductMovementRows(activeSales);

return {
  summary: {
    customerCount: activeSales.length,
    totalSales,
    totalQuantity,
    averageUnitPrice: totalQuantity === 0 ? 0 : Math.round(totalSales / totalQuantity),
    totalExpenses,
    profit: totalSales - totalExpenses,
  },
  genreQuantities: sortByQuantityDesc(
    Array.from(sumByGenre(movementRows).entries()).map(([productGenre, quantity]) => ({
      productGenre,
      quantity,
    })),
  ),
  productRanking: sortByQuantityDesc(Array.from(sumBySaleLine(activeSales).values())).slice(0, 5),
  salesHistory: eventSales
    .map((sale) => ({
      saleId: sale.id,
      datetime: sale.datetime,
      totalAmount: sale.totalAmount,
      quantity: sale.lines.reduce((total, line) => total + line.quantity, 0),
      canceled: sale.canceled,
    }))
    .sort((a, b) => b.datetime.localeCompare(a.datetime)),
  expenseBreakdown: sortExpenseBreakdown(sumByExpenseCategory(expenses)),
};
```

追加する helper は以下。

```ts
function sumBySaleLine(sales: Sale[]): Map<string, ProductRankingRow> {
  const rows = new Map<string, ProductRankingRow>();

  for (const sale of sales) {
    for (const line of sale.lines) {
      const itemKey = `${line.kind}:${line.refId}`;
      const current = rows.get(itemKey);
      rows.set(itemKey, {
        itemKey,
        displayName: current?.displayName ?? line.displayName,
        kind: line.kind,
        quantity: (current?.quantity ?? 0) + line.quantity,
      });
    }
  }

  return rows;
}

function sumByExpenseCategory(expenses: Expense[]): Map<ExpenseCategory, ExpenseBreakdownRow> {
  const rows = new Map<ExpenseCategory, ExpenseBreakdownRow>();

  for (const expense of expenses) {
    const current = rows.get(expense.category);
    rows.set(expense.category, {
      category: expense.category,
      count: (current?.count ?? 0) + 1,
      amount: (current?.amount ?? 0) + expense.amount,
    });
  }

  return rows;
}

function sortExpenseBreakdown(rows: Map<ExpenseCategory, ExpenseBreakdownRow>): ExpenseBreakdownRow[] {
  return [...rows.values()].sort((a, b) => b.amount - a.amount);
}
```

- [ ] **Step 8: ドメインテストを通す**

Run: `npm test -- src/domain/inventory.test.ts src/domain/stats.test.ts`

Expected: PASS。

- [ ] **Step 9: コミットする**

```bash
git add src/domain/inventory.ts src/domain/inventory.test.ts src/domain/stats.ts src/domain/stats.test.ts
git commit -m "feat: derive bundle availability and refreshed stats"
```

---

### Task 3: 会計画面の刷新

**Files:**
- Modify: `src/pages/CheckoutPage.tsx`
- Test: `src/pages/CheckoutPage.test.tsx`
- Modify: `src/reducers/checkoutReducer.ts`
- Test: `src/reducers/checkoutReducer.test.ts`

- [ ] **Step 1: 会計画面の表示仕様テストを書く**

`src/pages/CheckoutPage.test.tsx` に以下を追加する。テストファイル末尾の `seedCheckoutDatabase` を使い、表示期待値はこの日本語へ合わせる。

```tsx
it("renders refreshed checkout layout with 頒布物 labels, horizontal steppers, and fixed selected list", async () => {
  await seedCheckoutDatabase(database);

  render(<CheckoutPage database={database} eventId="event-1" />);

  expect(await screen.findByText("コミティア150")).toBeInTheDocument();
  expect(screen.queryByText("会計中イベント")).not.toBeInTheDocument();
  expect(screen.getByRole("list", { name: "頒布物一覧" })).toBeInTheDocument();

  const item = await screen.findByRole("button", { name: /新刊Aを追加/ });
  expect(item).toHaveTextContent("500円 / 残");

  expect(screen.getByRole("button", { name: "新刊Aを減らす" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "新刊Aを増やす" })).toBeInTheDocument();
  expect(screen.getByText("選択中")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "会計を確定" })).toBeInTheDocument();
});
```

- [ ] **Step 2: 長い頒布物名と予約・売切のテストを書く**

```tsx
it("uses ellipsis-friendly labels and shows reservation and sold-out pins", async () => {
  await seedCheckoutDatabase(database, {
    productName: "カルボナーラ ペペロンチーノ ボロネーゼ 特別編集版",
    reservedStock: 1,
    initialStock: 1,
    soldQuantity: 1,
  });

  render(<CheckoutPage database={database} eventId="event-1" />);

  expect(await screen.findByText("予約")).toBeInTheDocument();
  expect(screen.getByText("売切")).toBeInTheDocument();
  expect(screen.getByLabelText("カルボナーラ ペペロンチーノ ボロネーゼ 特別編集版の全文")).toHaveTextContent(
    "カルボナーラ ペペロンチーノ ボロネーゼ 特別編集版",
  );
});
```

`seedCheckoutDatabase` を以下のシグネチャへ拡張する。

```ts
async function seedCheckoutDatabase(
  database: EventSalesDatabase,
  options: {
    productName?: string;
    initialStock?: number;
    reservedStock?: number;
    soldQuantity?: number;
  } = {},
) {
  const productName = options.productName ?? "新刊A";
  await database.events.put({
    id: "event-1",
    name: "コミティア150",
    eventDate: "2026-11-23",
    series: "other",
    circleSpace: "東4ホール た-12b",
  });
  await database.products.put({
    id: "book",
    name: productName,
    productGenre: "book",
    defaultPrice: 500,
    isActive: true,
  });
  await database.eventInventories.put({
    eventId: "event-1",
    productId: "book",
    initialStock: options.initialStock ?? 10,
    reservedStock: options.reservedStock ?? 0,
  });
  if ((options.soldQuantity ?? 0) > 0) {
    await database.sales.put({
      id: "sale-existing",
      eventId: "event-1",
      datetime: "2026-11-23T09:00:00+09:00",
      totalAmount: 500 * (options.soldQuantity ?? 0),
      canceled: false,
      lines: [
        {
          lineId: "product:book",
          kind: "product",
          refId: "book",
          displayName: productName,
          productGenre: "book",
          unitPrice: 500,
          quantity: options.soldQuantity ?? 0,
          subtotal: 500 * (options.soldQuantity ?? 0),
        },
      ],
    });
  }
}
```

- [ ] **Step 3: 失敗を確認する**

Run: `npm test -- src/pages/CheckoutPage.test.tsx`

Expected: `頒布物一覧`, `予約`, `売切`, `会計を確定` の期待値で FAIL。

- [ ] **Step 4: reducer の上限チェックテストを書く**

`src/reducers/checkoutReducer.test.ts` に以下を追加する。

```ts
it("does not add beyond maxQuantity when provided", () => {
  const state = createInitialCheckoutState("event-1");
  const item = {
    kind: "product" as const,
    refId: "book-a",
    displayName: "新刊A",
    productGenre: "book" as const,
    unitPrice: 500,
    maxQuantity: 1,
  };

  const once = checkoutReducer(state, { type: "addLine", item });
  const twice = checkoutReducer(once, { type: "addLine", item });

  expect(twice.totalQuantity).toBe(1);
});
```

- [ ] **Step 5: reducer を必要最小限で更新する**

`CheckoutDisplayItem` 相当の reducer 入力型に `maxQuantity?: number` を追加し、`addLine` で以下の制御を入れる。

```ts
const maxQuantity = action.item.maxQuantity ?? Number.POSITIVE_INFINITY;
if (existingLine && existingLine.quantity >= maxQuantity) {
  return state;
}
if (!existingLine && maxQuantity <= 0) {
  return state;
}
```

- [ ] **Step 6: CheckoutPage の表示データを更新する**

`CheckoutDisplayItem` に `maxQuantity`, `variant`, `chipLabel`, `fullNameLabel` を追加する。

```ts
interface CheckoutDisplayItem {
  kind: "product" | "bundle" | "reservation";
  refId: string;
  displayName: string;
  productGenre: Product["productGenre"];
  unitPrice: number;
  stockLabel: string;
  maxQuantity: number;
  variant: "basic" | "bundle" | "reservation" | "soldOut";
  chipLabel?: "予約" | "売切";
  components?: Array<{
    productId: string;
    productName: string;
    productGenre: Product["productGenre"];
    quantity: number;
  }>;
}
```

通常頒布物の `maxQuantity` は `remainingStock`、予約は `inventory.reservedStock`、セットは `calculateBundleAvailability(...).availableQuantity` を設定する。`maxQuantity <= 0` の通常頒布物とセットは `variant: "soldOut"` として一覧下部へ並べる。

- [ ] **Step 7: CheckoutPage JSX を Card Pattern へ置き換える**

画面構造は以下へ寄せる。

```tsx
<div className="space-y-4 pb-64">
  {checkoutData?.event ? (
    <HeroEventCard
      eventName={checkoutData.event.name}
      circleSpace={checkoutData.event.circleSpace}
    />
  ) : null}
  {message ? <CheckoutToast message={message} /> : null}
  <ul aria-label="頒布物一覧" className="grid gap-3">
    {items.map((item) => (
      <CheckoutItemCard
        key={`${item.kind}-${item.refId}`}
        item={item}
        quantity={getLineQuantity(state, item)}
        onAdd={() => dispatch({ type: "addLine", item })}
        onDecrement={() => dispatch({ type: "decrementLine", lineId: createLineId(item) })}
      />
    ))}
  </ul>
  <PrimaryActionBar
    summary={
      <CheckoutSummary
        lines={state.lines}
        totalAmount={state.totalAmount}
        totalQuantity={state.totalQuantity}
        onDecrement={(lineId) => dispatch({ type: "decrementLine", lineId })}
      />
    }
  >
    <button type="button" className="min-h-14 rounded-md bg-[#738dc2] font-bold text-white disabled:bg-slate-300" disabled={isConfirming || state.lines.length === 0} onClick={handleConfirm}>
      会計を確定
    </button>
  </PrimaryActionBar>
</div>
```

`CheckoutSummary` は header と scrollable lines を分離する。

```tsx
function CheckoutSummary({ lines, totalAmount, totalQuantity, onDecrement }: CheckoutSummaryProps) {
  return (
    <section aria-label="選択中の頒布物" className="rounded-lg bg-white p-3 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
      <div className="flex items-center justify-between text-sm font-bold text-[#355184]">
        <span>選択中</span>
        <span>{totalQuantity}点</span>
      </div>
      <ul className="mt-2 max-h-20 space-y-1 overflow-y-auto pr-1">
        {lines.map((line) => (
          <li key={line.lineId} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-sm">
            <span className="truncate-one-line">{line.displayName}</span>
            <span className="font-bold">{line.quantity}個</span>
            <button type="button" aria-label={`${line.displayName}を選択中から減らす`} className="h-8 w-8 rounded-md border" onClick={() => onDecrement(line.lineId)}>
              -
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-lg font-bold">
        <span>会計</span>
        <span>{formatYen(totalAmount)}</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: 成功表示を中央トーストにする**

`message` は成功・失敗を区別する。

```ts
const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
```

成功時は `会計を保存しました`、失敗時は Error の message を表示する。成功 message は `window.setTimeout(() => setMessage(null), 1400)` で消す。

- [ ] **Step 9: 会計テストを通す**

Run: `npm test -- src/reducers/checkoutReducer.test.ts src/pages/CheckoutPage.test.tsx`

Expected: PASS。

- [ ] **Step 10: コミットする**

```bash
git add src/reducers/checkoutReducer.ts src/reducers/checkoutReducer.test.ts src/pages/CheckoutPage.tsx src/pages/CheckoutPage.test.tsx
git commit -m "feat: refresh checkout screen"
```

---

### Task 4: ホーム画面の刷新

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Test: `src/pages/HomePage.test.tsx`
- Modify: `src/domain/setupStatus.ts`
- Test: `src/domain/setupStatus.test.ts`

- [ ] **Step 1: セットアップ文言の失敗テストを書く**

`src/domain/setupStatus.test.ts` で `products` 行の label 期待値を `頒布物` に更新し、在庫行が選択中イベントの在庫数を返すことを確認する。

```ts
expect(status.rows.map((row) => row.label)).toEqual([
  "イベント",
  "頒布物",
  "セット",
  "在庫",
]);
```

- [ ] **Step 2: ホーム画面の失敗テストを書く**

`src/pages/HomePage.test.tsx` に以下を追加する。

```tsx
it("renders event switch card, setup rows, and a bottom checkout action", () => {
  const onNavigate = vi.fn();
  render(
    <HomePage
      events={[{ id: "event-1", name: "コミティア150", eventDate: "2026-11-23", series: "other", circleSpace: "東4ホール た-12b" }]}
      products={[{ id: "product-1", name: "新刊A", productGenre: "book", defaultPrice: 500, isActive: true }]}
      bundles={[]}
      inventories={[{ eventId: "event-1", productId: "product-1", initialStock: 10, reservedStock: 0 }]}
      selectedEventId="event-1"
      onEventChange={() => undefined}
      onNavigate={onNavigate}
    />,
  );

  expect(screen.getByText("コミティア150")).toBeInTheDocument();
  expect(screen.getByText("東4ホール た-12b")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "頒布物の管理タブへ" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "会計へ進む" })).toBeInTheDocument();
});
```

- [ ] **Step 3: 失敗を確認する**

Run: `npm test -- src/domain/setupStatus.test.ts src/pages/HomePage.test.tsx`

Expected: `頒布物`, `会計へ進む` の期待値で FAIL。

- [ ] **Step 4: `setupStatus` の label を更新する**

`src/domain/setupStatus.ts` の products 行 label を `頒布物` にする。`row.id` は `products` のまま維持し、遷移先との互換性を保つ。

- [ ] **Step 5: HomePage を刷新する**

画面構造を以下へ寄せる。

```tsx
<div className="space-y-4 pb-28">
  <ScreenTitle>ホーム</ScreenTitle>
  <SurfaceCard ariaLabel="選択中イベント">
    <label className="block text-sm font-bold text-slate-700">
      選択中イベント
      <select ... />
    </label>
    {setupStatus.selectedEvent ? (
      <div className="mt-3">
        <HeroEventCard eventName={setupStatus.selectedEvent.name} circleSpace={setupStatus.selectedEvent.circleSpace} />
      </div>
    ) : (
      <p className="mt-2 text-sm text-slate-600">イベントを登録してください。</p>
    )}
  </SurfaceCard>
  <SurfaceCard ariaLabel="セットアップ状態">
    <h2 className="text-lg font-bold">セットアップ状態</h2>
    <div className="mt-3 grid gap-2">{setupStatus.rows.map(...)}</div>
  </SurfaceCard>
  <PrimaryActionBar>
    <button type="button" className="min-h-14 rounded-md bg-[#738dc2] font-bold text-white disabled:bg-slate-300" disabled={!setupStatus.canCheckout} onClick={() => onNavigate("checkout")}>
      会計へ進む
    </button>
  </PrimaryActionBar>
</div>
```

セットアップ行の aria-label は `${row.label}の管理タブへ` にする。`products` 行は `managementSection: "products"` へ遷移する。

- [ ] **Step 6: ホームテストを通す**

Run: `npm test -- src/domain/setupStatus.test.ts src/pages/HomePage.test.tsx`

Expected: PASS。

- [ ] **Step 7: コミットする**

```bash
git add src/domain/setupStatus.ts src/domain/setupStatus.test.ts src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: refresh home screen"
```

---

### Task 5: 管理画面の刷新

**Files:**
- Modify: `src/components/Modal.tsx`
- Modify: `src/pages/ManagementPage.tsx`
- Test: `src/pages/ManagementPage.test.tsx`

- [ ] **Step 1: Modal の失敗テストを書く**

`src/components/BasicComponents.test.tsx` に以下を追加する。

```tsx
it("renders modal content with a Japanese close button", () => {
  render(
    <Modal title="頒布物編集" onClose={() => undefined}>
      <button type="button">保存</button>
    </Modal>,
  );

  expect(screen.getByRole("dialog", { name: "頒布物編集" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Modal を更新する**

`src/components/Modal.tsx` を以下の見た目へ更新する。

```tsx
export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="grid max-h-[calc(100vh-2rem)] w-full max-w-md grid-rows-[auto_1fr] rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" className="min-h-11 rounded-md px-3 font-bold text-[#355184]" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: 管理画面タブとモーダルの失敗テストを書く**

`src/pages/ManagementPage.test.tsx` に以下を追加する。

```tsx
it("renders refreshed management tabs and opens product modal from bottom add button", async () => {
  await seedManagementDatabase(database);
  const user = userEvent.setup();

  render(<ManagementPage database={database} initialSection="products" />);

  expect(await screen.findByRole("tab", { name: "頒布物" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "イベント" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "セット" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "在庫" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "経費" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "頒布物を追加" }));

  expect(screen.getByRole("dialog", { name: "頒布物編集" })).toBeInTheDocument();
  expect(screen.getByLabelText("頒布物名")).toBeInTheDocument();
  expect(screen.getByLabelText("ジャンル")).toBeInTheDocument();
});
```

- [ ] **Step 4: 削除ブロックと在庫セットカードの失敗テストを書く**

```tsx
it("shows delete reasons and derived bundle availability in inventory", async () => {
  await seedManagementDatabaseWithBundle(database);
  const user = userEvent.setup();

  render(<ManagementPage database={database} initialSection="products" />);

  expect(await screen.findByText("在庫・セットで使われているため削除できません")).toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "在庫" }));

  expect(await screen.findByText("限定セット")).toBeInTheDocument();
  expect(screen.getByText("取扱可能数 2")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "限定セットの在庫を編集" })).not.toBeInTheDocument();
});
```

この 2 つのテストで使う helper は `src/pages/ManagementPage.test.tsx` の末尾へ追加する。

```ts
async function seedManagementDatabase(database: EventSalesDatabase) {
  await database.events.put({
    id: "event-1",
    name: "コミティア150",
    eventDate: "2026-11-23",
    series: "other",
    circleSpace: "東4ホール た-12b",
  });
  await database.products.put({
    id: "product-1",
    name: "新刊A",
    productGenre: "book",
    defaultPrice: 500,
    isActive: true,
  });
}

async function seedManagementDatabaseWithBundle(database: EventSalesDatabase) {
  await seedManagementDatabase(database);
  await database.products.put({
    id: "product-2",
    name: "グッズA",
    productGenre: "goods",
    defaultPrice: 300,
    isActive: true,
  });
  await database.eventInventories.bulkPut([
    { eventId: "event-1", productId: "product-1", initialStock: 5, reservedStock: 1 },
    { eventId: "event-1", productId: "product-2", initialStock: 3, reservedStock: 0 },
  ]);
  await database.bundles.put({
    id: "bundle-1",
    name: "限定セット",
    price: 1500,
    isActive: true,
  });
  await database.bundleItems.bulkPut([
    { bundleId: "bundle-1", productId: "product-1", quantity: 2 },
    { bundleId: "bundle-1", productId: "product-2", quantity: 1 },
  ]);
}
```

- [ ] **Step 5: 失敗を確認する**

Run: `npm test -- src/components/BasicComponents.test.tsx src/pages/ManagementPage.test.tsx`

Expected: `頒布物`, `頒布物を追加`, `取扱可能数` などで FAIL。

- [ ] **Step 6: 管理タブ文言を更新する**

`sections` を以下へ更新する。

```ts
const sections: Array<{ value: ManagementSection; label: string }> = [
  { value: "events", label: "イベント" },
  { value: "products", label: "頒布物" },
  { value: "bundles", label: "セット" },
  { value: "inventory", label: "在庫" },
  { value: "expenses", label: "経費" },
];
```

`productGenres`, `seriesOptions`, `expenseCategories` の label も日本語へ復旧する。

```ts
const productGenres = [
  { value: "book", label: "本" },
  { value: "goods", label: "グッズ" },
  { value: "music", label: "音楽" },
  { value: "software", label: "ソフト" },
  { value: "other", label: "その他" },
] satisfies Array<{ value: ProductGenre; label: string }>;
```

- [ ] **Step 7: 管理画面のフォームをモーダル化する**

各 Panel で `editingId` または `isAdding` を `modalMode` に統一する。

```ts
type ProductModalMode =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; productId: string };
```

一覧の下部固定ボタンは画面ごとに以下を使う。

```tsx
<PrimaryActionBar>
  <button type="button" className="min-h-14 rounded-md bg-[#738dc2] font-bold text-white" onClick={() => openAddModal()}>
    頒布物を追加
  </button>
</PrimaryActionBar>
```

イベント、セット、在庫、経費もそれぞれ `イベントを追加`, `セットを追加`, `在庫を追加`, `経費を追加` とする。

- [ ] **Step 8: 一覧カードを実装する**

`ActionList` は削除理由を表示できるように拡張する。

```ts
interface ActionListItem {
  id: string;
  label: string;
  detail?: string;
  editLabel: string;
  deleteLabel: string;
  deleteDisabledReason?: string;
  onEdit: () => void;
  onDelete: () => void;
  borderTone?: "sub" | "accent" | "neutral";
}
```

削除ボタンは `deleteDisabledReason` がある場合 disabled にし、カード内に理由を表示する。

```tsx
{item.deleteDisabledReason ? (
  <p className="text-xs font-bold text-amber-700">{item.deleteDisabledReason}</p>
) : null}
```

頒布物カードの `borderTone` は `sub`、セットカードは `accent` にする。

- [ ] **Step 9: イベントタブを決定仕様へ合わせる**

イベント一覧は以下で並べる。

```ts
const sortedEvents = [...events].sort((a, b) => {
  if (Boolean(a.isClosed) !== Boolean(b.isClosed)) {
    return a.isClosed ? 1 : -1;
  }
  return b.eventDate.localeCompare(a.eventDate);
});
```

削除は既存どおり `isHidden: true`。確認文言は `イベントを非表示にします。売上や経費の履歴は保持されます。` とする。イベント終了 checkbox は編集モーダル内に置く。

- [ ] **Step 10: 在庫タブにセット取扱可能数カードを追加する**

`InventoryPanel` に `bundles`, `bundleItems`, `sales` を渡し、通常在庫カードの下に導出カードを表示する。

```tsx
const bundleAvailabilityCards = bundles.map((bundle) => {
  const availability = calculateBundleAvailability({
    bundleId: bundle.id,
    bundleItems,
    inventories: eventInventories,
    sales: eventSales,
  });
  return { bundle, availability };
});
```

`availability.availableQuantity >= 1` は通常表示、`0` は灰色で一覧下部に表示する。編集・削除ボタンは出さず、`セット内容はセットタブで編集` と表示する。

- [ ] **Step 11: 管理画面テストを通す**

Run: `npm test -- src/components/BasicComponents.test.tsx src/pages/ManagementPage.test.tsx`

Expected: PASS。

- [ ] **Step 12: コミットする**

```bash
git add src/components/Modal.tsx src/components/BasicComponents.test.tsx src/pages/ManagementPage.tsx src/pages/ManagementPage.test.tsx
git commit -m "feat: refresh management screen"
```

---

### Task 6: 統計画面の刷新

**Files:**
- Modify: `src/pages/StatisticsPage.tsx`
- Test: `src/pages/StatisticsPage.test.tsx`

- [ ] **Step 1: 統計画面の失敗テストを書く**

`src/pages/StatisticsPage.test.tsx` に以下を追加する。

```tsx
it("renders refreshed statistics sections in the decided order", async () => {
  await seedStatisticsDatabase(database);

  render(<StatisticsPage database={database} eventId="event-1" />);

  const headings = await screen.findAllByRole("heading");
  expect(headings.map((heading) => heading.textContent)).toEqual([
    "統計",
    "客数・販売点数",
    "売上",
    "利益・収支",
    "頒布物ランキング",
    "ジャンル別",
    "売上履歴",
    "収支内訳",
  ]);
  expect(screen.getByText("印刷費 / 1件 : 5,000円")).toBeInTheDocument();
  expect(screen.getByText("▲1,200円")).toHaveClass("text-red-700");
});
```

- [ ] **Step 2: 失敗を確認する**

Run: `npm test -- src/pages/StatisticsPage.test.tsx`

Expected: 見出し順と収支内訳で FAIL。

- [ ] **Step 3: StatisticsPage を表示順どおりに組み替える**

`stats.summary.customerCount`, `stats.summary.totalQuantity`, `stats.summary.totalSales`, `stats.summary.totalExpenses`, `stats.summary.profit` を使う。profit は負数なら赤字で `▲${formatYen(abs)}` と表示する。

```ts
function formatSignedYen(value: number): string {
  if (value < 0) {
    return `▲${Math.abs(value).toLocaleString("ja-JP")}円`;
  }

  return `${value.toLocaleString("ja-JP")}円`;
}
```

売上履歴は内部スクロールにする。

```tsx
<ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
  {stats.salesHistory.map((sale) => (
    <li key={sale.saleId} className={sale.canceled ? "rounded-md bg-slate-100 p-3 text-slate-500" : "rounded-md bg-slate-50 p-3"}>
      ...
      {sale.canceled ? <StatusChip tone="muted">キャンセル</StatusChip> : null}
    </li>
  ))}
</ul>
```

収支内訳は以下の format にする。

```ts
function formatExpenseCategory(category: ExpenseCategory): string {
  const labels: Record<ExpenseCategory, string> = {
    printing: "印刷費",
    transport: "交通費",
    space: "参加費",
    supply: "備品費",
    other: "その他費",
  };
  return labels[category];
}
```

```tsx
{stats.expenseBreakdown.map((row) => (
  <li key={row.category} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
    <span>{formatExpenseCategory(row.category)} / {row.count}件 : {formatYen(row.amount)}</span>
  </li>
))}
```

- [ ] **Step 4: 統計画面テストを通す**

Run: `npm test -- src/pages/StatisticsPage.test.tsx`

Expected: PASS。

- [ ] **Step 5: コミットする**

```bash
git add src/pages/StatisticsPage.tsx src/pages/StatisticsPage.test.tsx
git commit -m "feat: refresh statistics screen"
```

---

### Task 7: 設定画面の刷新と収支 CSV

**Files:**
- Modify: `src/domain/csv.ts`
- Test: `src/domain/csv.test.ts`
- Modify: `src/pages/SettingsPage.tsx`
- Test: `src/pages/SettingsPage.test.tsx`
- Modify: `src/services/csvExportService.ts`
- Test: `src/services/csvExportService.test.ts`

- [ ] **Step 1: 収支 CSV の失敗テストを書く**

`src/domain/csv.test.ts` に以下を追加する。

```ts
import { buildProfitLossCsv } from "./csv";

it("builds profit and loss csv rows", () => {
  const csv = buildProfitLossCsv({
    totalSales: 2000,
    totalExpenses: 6500,
    profit: -4500,
    expenseBreakdown: [{ category: "printing", count: 1, amount: 5000 }],
  });

  expect(csv).toContain("売上,経費,利益");
  expect(csv).toContain("2000,6500,-4500");
  expect(csv).toContain("経費カテゴリ,件数,金額");
  expect(csv).toContain("printing,1,5000");
});
```

`src/services/csvExportService.test.ts` に以下を追加する。

```ts
it("downloads profit and loss csv for the selected event", () => {
  const downloader = vi.fn();

  downloadProfitLossCsv(
    {
      totalSales: 2000,
      totalExpenses: 6500,
      profit: -4500,
      expenseBreakdown: [{ category: "printing", count: 1, amount: 5000 }],
    },
    { downloader, filename: "profit-loss-event-1.csv" },
  );

  expect(downloader).toHaveBeenCalledWith(
    "profit-loss-event-1.csv",
    expect.stringContaining("売上,経費,利益"),
  );
});
```

- [ ] **Step 2: 失敗を確認する**

Run: `npm test -- src/domain/csv.test.ts src/services/csvExportService.test.ts`

Expected: `buildProfitLossCsv` と `downloadProfitLossCsv` が存在せず FAIL。

- [ ] **Step 3: 収支 CSV を実装する**

`src/domain/csv.ts` の import に `ExpenseCategory` を足し、以下を追加する。

```ts
import type { Expense, ExpenseCategory, Sale } from "./types";

export interface ProfitLossCsvInput {
  totalSales: number;
  totalExpenses: number;
  profit: number;
  expenseBreakdown: Array<{
    category: ExpenseCategory;
    count: number;
    amount: number;
  }>;
}

export function buildProfitLossCsv(input: ProfitLossCsvInput): string {
  const rows = [
    ["売上", "経費", "利益"],
    [String(input.totalSales), String(input.totalExpenses), String(input.profit)],
    [],
    ["経費カテゴリ", "件数", "金額"],
    ...input.expenseBreakdown.map((row) => [
      row.category,
      String(row.count),
      String(row.amount),
    ]),
  ];

  return buildCsv(rows);
}
```

`src/services/csvExportService.ts` の import に `buildProfitLossCsv` と `ProfitLossCsvInput` を追加し、以下を追加する。

```ts
import {
  buildExpensesCsv,
  buildProductMovementCsv,
  buildProfitLossCsv,
  buildSalesDetailCsv,
  buildSalesSummaryCsv,
  type ProfitLossCsvInput,
} from "../domain/csv";

export function downloadProfitLossCsv(
  input: ProfitLossCsvInput,
  options: CsvExportOptions,
): void {
  exportCsv(options, buildProfitLossCsv(input));
}
```

- [ ] **Step 4: 設定画面の失敗テストを書く**

`src/pages/SettingsPage.test.tsx` に以下を追加する。

```tsx
it("renders app state, csv cards, and selected event danger reset", async () => {
  await seedSettingsDatabase(database);

  render(<SettingsPage database={database} eventId="event-1" />);

  expect(await screen.findByRole("heading", { name: "アプリ状態" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "CSV出力" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "売上サマリーCSV" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "売上詳細CSV" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "頒布物移動CSV" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "経費CSV" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "収支CSV" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "危険操作" })).toBeInTheDocument();
  expect(screen.getByText("在庫・売上・経費をリセットします。イベント、頒布物、セットは残ります。")).toBeInTheDocument();
});
```

- [ ] **Step 5: SettingsPage を刷新する**

セクション順は `アプリ状態`, `CSV出力`, `危険操作`。イベント名入力確認は廃止し、確認ダイアログまたは確認 state で `キャンセル` / `リセットする` を表示する。

CSV ボタン配列は以下へ更新する。

```ts
const csvButtons = [
  { label: "売上サマリーCSV", onClick: downloadSummary },
  { label: "売上詳細CSV", onClick: downloadDetail },
  { label: "頒布物移動CSV", onClick: downloadMovement },
  { label: "経費CSV", onClick: downloadExpenses },
  { label: "収支CSV", onClick: downloadProfitLoss },
];
```

危険操作の本文は以下を表示する。

```tsx
<p className="mt-2 text-sm text-slate-700">
  在庫・売上・経費をリセットします。イベント、頒布物、セットは残ります。
</p>
<p className="mt-2 text-sm font-bold text-red-700">
  実行前に CSV を出力しておくことを推奨します。
</p>
```

- [ ] **Step 6: 設定関連テストを通す**

Run: `npm test -- src/domain/csv.test.ts src/services/csvExportService.test.ts src/pages/SettingsPage.test.tsx`

Expected: PASS。

- [ ] **Step 7: コミットする**

```bash
git add src/domain/csv.ts src/domain/csv.test.ts src/services/csvExportService.ts src/services/csvExportService.test.ts src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "feat: refresh settings screen"
```

---

### Task 8: 表示文言の最終統一と全体検証

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/*.tsx`
- Modify: `src/components/*.tsx`
- Modify: `src/domain/*.ts`
- Test: relevant existing tests

- [ ] **Step 1: `商品` 表示文字列が残っていないことを確認する**

PowerShell:

```powershell
Select-String -Path src\**\*.tsx,src\**\*.ts -Pattern '商品' -SimpleMatch
```

Expected: ユーザー表示文言としての `商品` が出ない。内部型名 `Product` は対象外なので、このコマンドでは検出されない。

- [ ] **Step 2: App の管理誘導文言を日本語へ復旧する**

`src/App.tsx` の `managementNotice` を以下へ置き換える。

```ts
setManagementNotice("イベントを登録すると会計を開始できます。");
```

```ts
setManagementNotice("在庫を登録すると会計を開始できます。");
```

- [ ] **Step 3: App の導線テストを更新する**

`src/App.test.tsx` に、在庫がない状態で会計へ遷移したとき在庫タブへ誘導される期待値を明確に入れる。

```tsx
expect(await screen.findByText("在庫を登録すると会計を開始できます。")).toBeInTheDocument();
expect(screen.getByRole("tab", { name: "在庫" })).toHaveAttribute("aria-selected", "true");
```

- [ ] **Step 4: 画面単位テストを実行する**

Run:

```bash
npm test -- src/App.test.tsx src/pages/HomePage.test.tsx src/pages/CheckoutPage.test.tsx src/pages/ManagementPage.test.tsx src/pages/StatisticsPage.test.tsx src/pages/SettingsPage.test.tsx
```

Expected: PASS。

- [ ] **Step 5: 全テストを実行する**

Run: `npm test`

Expected: PASS。

- [ ] **Step 6: lint を実行する**

Run: `npm run lint`

Expected: PASS with `0 warnings`。

- [ ] **Step 7: build を実行する**

Run: `npm run build`

Expected: TypeScript build と Vite build が PASS。

- [ ] **Step 8: 開発サーバで目視確認する**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: terminal に `Local: http://127.0.0.1:5173/event-sales-manager-pwa/` または同等のローカル URL が出る。

目視確認:
- ホーム: 選択中イベントを切り替えられる。セットアップ行が対応タブへ遷移する。
- 会計: 長い頒布物名が `...` で省略される。選択中リストの見出しとスクロール範囲が重ならない。
- 管理: 各タブで追加ボタンが下部にあり、編集モーダルが中央に出る。
- 在庫: セットの `取扱可能数` が導出表示され、編集ボタンがない。
- 統計: 売上履歴が内部スクロールし、収支内訳が `XXX費 / n件 : YYYY円` で表示される。
- 設定: CSV カードが 5 種類あり、危険操作は強い確認になっている。

- [ ] **Step 9: 最終コミットする**

```bash
git add src
git commit -m "chore: align refreshed UI copy and verification"
```

---

## Self-Review

- Spec coverage:
  - 色、Material-aware、Card Pattern、ナビ、会計のカード・横ステッパー・選択中固定・長名省略・予約/売切チップは Task 1 と Task 3 で扱う。
  - ホームのイベント切替、セットアップ行、会計ボタンは Task 4 で扱う。
  - 管理タブ、モーダル、削除制御、イベント非表示、セット取扱可能数、経費タブは Task 5 で扱う。
  - 統計の表示順、ランキング、ジャンル、履歴、収支内訳は Task 2 と Task 6 で扱う。
  - 設定のアプリ状態、CSV、危険操作は Task 7 で扱う。
  - `商品` から `頒布物` への表示統一と文字化け復旧は Task 1, Task 4, Task 5, Task 8 で扱う。
- Placeholder scan:
  - 実装未定の空欄は置かず、各タスクに対象ファイル、テスト、実装方針、実行コマンド、期待結果を入れた。
- Type consistency:
  - `calculateBundleAvailability`, `BundleAvailability`, `ProductRankingRow.itemKey`, `ExpenseBreakdownRow`, `PrimaryActionBar`, `HeroEventCard` は定義タスクより後で参照している。
  - 内部型 `Product` は維持し、表示文言だけ `頒布物` にする方針で統一している。
