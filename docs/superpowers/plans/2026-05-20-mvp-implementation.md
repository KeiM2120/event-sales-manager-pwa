# Event Sales Manager PWA MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable offline-first Event Sales Manager PWA MVP, including setup, checkout, management, statistics, CSV export, PWA behavior, and GitHub Pages CI/CD.

**Architecture:** Implement data and business rules first, then screens. Keep domain logic in pure TypeScript modules, IndexedDB access in Dexie repositories, workflow orchestration in services, and React pages focused on loading state, rendering, and dispatching reducer actions.

**Tech Stack:** React, TypeScript, Vite, TailwindCSS, Dexie, IndexedDB, Vitest, Testing Library, vite-plugin-pwa, GitHub Actions, GitHub Pages.

---

## Reference Documents

- Primary design: `docs/superpowers/specs/2026-05-20-mvp-implementation-design.ja.md`
- Repository guidance: `AGENTS.md`
- Original rough spec: `spec.md`

## Scope Notes

This plan implements the complete MVP described in the Japanese design document. The app is still unscaffolded, so Task 1 creates the Vite project in the repository root. `AGENTS.md` and `spec.md` are currently untracked user files; do not delete, overwrite, or stage them unless the user explicitly asks.

## Planned File Structure

Create and maintain these files:

```txt
.github/
  workflows/
    deploy-pages.yml
index.html
package.json
package-lock.json
postcss.config.js
tailwind.config.js
tsconfig.json
tsconfig.node.json
vite.config.ts
vitest.setup.ts
public/
  pwa-192x192.svg
  pwa-512x512.svg
src/
  App.tsx
  main.tsx
  styles.css
  components/
    AppShell.tsx
    ConfirmDialog.tsx
    EmptyState.tsx
    ErrorBanner.tsx
    Modal.tsx
    NumberField.tsx
    SectionTabs.tsx
  db/
    database.ts
    repositories.ts
  domain/
    checkout.ts
    csv.ts
    inventory.ts
    stats.ts
    types.ts
  hooks/
    useLiveQueryState.ts
    usePwaUpdate.ts
  pages/
    CheckoutPage.tsx
    HomePage.tsx
    ManagementPage.tsx
    SettingsPage.tsx
    StatisticsPage.tsx
  reducers/
    checkoutReducer.ts
  services/
    checkoutService.ts
    csvExportService.ts
    seedService.ts
    settingsService.ts
  test/
    fixtures.ts
```

Responsibilities:

- `src/domain/types.ts`: shared domain types and discriminated unions.
- `src/domain/inventory.ts`: bundle expansion, sold-count aggregation, remaining stock, stock validation.
- `src/domain/checkout.ts`: checkout-to-sale snapshot conversion and checkout totals.
- `src/domain/stats.ts`: selected-event statistics from sales, inventories, products, bundles, expenses.
- `src/domain/csv.ts`: pure CSV escaping and row generation.
- `src/db/database.ts`: Dexie schema and typed database instance.
- `src/db/repositories.ts`: all DB reads/writes used by pages and services.
- `src/reducers/checkoutReducer.ts`: pure checkout state reducer.
- `src/services/checkoutService.ts`: transactional sale confirmation, reservation decrement, undo.
- `src/services/csvExportService.ts`: browser downloads for the four CSV exports.
- `src/services/seedService.ts`: optional first-run sample data for local development only if needed by tests or manual smoke checks.
- `src/services/settingsService.ts`: data reset and app-level settings helpers.
- `src/pages/*`: independent app screens.
- `.github/workflows/deploy-pages.yml`: lint, test, build, and deploy `dist/` to GitHub Pages from `main`.

---

### Task 1: Vite React TypeScript Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.setup.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `public/pwa-192x192.svg`
- Create: `public/pwa-512x512.svg`

- [ ] **Step 1: Create package scripts and dependencies**

Create `package.json`:

```json
{
  "name": "event-sales-manager-pwa",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint . --max-warnings=0",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "dexie": "latest",
    "dexie-react-hooks": "latest",
    "vite-plugin-pwa": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@eslint/js": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "autoprefixer": "latest",
    "eslint": "latest",
    "eslint-plugin-react-hooks": "latest",
    "eslint-plugin-react-refresh": "latest",
    "globals": "latest",
    "jsdom": "latest",
    "postcss": "latest",
    "tailwindcss": "latest",
    "typescript": "latest",
    "typescript-eslint": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created, `node_modules/` is installed, and npm exits with code 0.

- [ ] **Step 3: Add TypeScript config**

Create `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "vitest.setup.ts", "vite.config.ts"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Add Vite, Vitest, Tailwind, and PWA config**

Create `vite.config.ts`:

```ts
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  base: "/event-sales-manager-pwa/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["pwa-192x192.svg", "pwa-512x512.svg"],
      manifest: {
        name: "Event Sales Manager",
        short_name: "EventSales",
        description: "Offline-first doujin event sales manager",
        theme_color: "#111827",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: "/event-sales-manager-pwa/",
        scope: "/event-sales-manager-pwa/",
        icons: [
          {
            src: "pwa-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          },
          {
            src: "pwa-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/event-sales-manager-pwa/index.html"
      }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    globals: true
  }
})
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest"
```

Create `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {}
  },
  plugins: []
}
```

Create `postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

- [ ] **Step 5: Add app entry files**

Create `index.html`:

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#111827" />
    <title>Event Sales Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./styles.css"

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Create `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950">
      <h1 className="text-2xl font-bold">Event Sales Manager</h1>
      <p className="mt-2 text-sm text-slate-700">MVP scaffold is ready.</p>
    </main>
  )
}
```

Create `src/styles.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
input,
select,
textarea {
  font: inherit;
}
```

- [ ] **Step 6: Add simple SVG PWA icons**

Create `public/pwa-192x192.svg` and `public/pwa-512x512.svg` with the same content:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#111827"/>
  <path d="M128 154h256v204H128z" fill="#f8fafc"/>
  <path d="M164 198h184v34H164zm0 70h120v34H164z" fill="#111827"/>
  <circle cx="348" cy="285" r="36" fill="#16a34a"/>
</svg>
```

- [ ] **Step 7: Run scaffold verification**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected:

- `npm run lint` exits 0.
- `npm run test` exits 0 with no tests or a pass summary.
- `npm run build` creates `dist/`.

- [ ] **Step 8: Commit scaffold**

```bash
git add index.html package.json package-lock.json postcss.config.js tailwind.config.js tsconfig.json tsconfig.node.json vite.config.ts vitest.setup.ts public src
git commit -m "feat: scaffold React PWA app"
```

---

### Task 2: Domain Types And Test Fixtures

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/test/fixtures.ts`
- Test: `src/domain/types.test.ts`

- [ ] **Step 1: Write type fixture test**

Create `src/domain/types.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { makeProduct, makeSale } from "../test/fixtures"

describe("domain fixtures", () => {
  it("creates product and sale fixtures with stable defaults", () => {
    const product = makeProduct({ id: "book-1", name: "新刊" })
    const sale = makeSale({ eventId: "event-1" })

    expect(product.name).toBe("新刊")
    expect(product.isActive).toBe(true)
    expect(sale.canceled).toBe(false)
    expect(sale.lines).toEqual([])
  })
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npm run test -- src/domain/types.test.ts
```

Expected: FAIL because `src/test/fixtures.ts` and domain types do not exist.

- [ ] **Step 3: Add domain types**

Create `src/domain/types.ts`:

```ts
export type Series = "comic-market" | "m3" | "techbookfest" | "other"

export type ProductGenre = "book" | "goods" | "music" | "software" | "other"

export type ExpenseCategory =
  | "printing"
  | "transport"
  | "space"
  | "supply"
  | "other"

export interface Event {
  id: string
  name: string
  eventDate: string
  series: Series
  memo?: string
}

export interface Product {
  id: string
  name: string
  productGenre: ProductGenre
  defaultPrice: number
  isActive: boolean
}

export interface Bundle {
  id: string
  name: string
  price: number
  isActive: boolean
}

export interface BundleItem {
  bundleId: string
  productId: string
  quantity: number
}

export interface EventInventory {
  eventId: string
  productId: string
  initialStock: number
  reservedStock: number
  reservationMemo?: string
}

export type SaleLineKind = "product" | "bundle" | "reservation"

export interface SaleLineComponent {
  productId: string
  productName: string
  productGenre: ProductGenre
  quantity: number
}

export interface SaleLine {
  lineId: string
  kind: SaleLineKind
  refId: string
  displayName: string
  productGenre: ProductGenre
  unitPrice: number
  quantity: number
  subtotal: number
  components?: SaleLineComponent[]
}

export interface Sale {
  id: string
  eventId: string
  datetime: string
  totalAmount: number
  canceled: boolean
  lines: SaleLine[]
}

export interface Expense {
  id: string
  eventId: string
  category: ExpenseCategory
  payee: string
  amount: number
  memo?: string
}
```

- [ ] **Step 4: Add test fixtures**

Create `src/test/fixtures.ts`:

```ts
import type {
  Bundle,
  BundleItem,
  Event,
  EventInventory,
  Expense,
  Product,
  Sale,
} from "../domain/types"

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    name: "コミックマーケット",
    eventDate: "2026-08-16",
    series: "comic-market",
    ...overrides,
  }
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    name: "既刊",
    productGenre: "book",
    defaultPrice: 1000,
    isActive: true,
    ...overrides,
  }
}

export function makeBundle(overrides: Partial<Bundle> = {}): Bundle {
  return {
    id: "bundle-1",
    name: "新刊セット",
    price: 1500,
    isActive: true,
    ...overrides,
  }
}

export function makeBundleItem(overrides: Partial<BundleItem> = {}): BundleItem {
  return {
    bundleId: "bundle-1",
    productId: "product-1",
    quantity: 1,
    ...overrides,
  }
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
  }
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
  }
}

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-1",
    eventId: "event-1",
    category: "transport",
    payee: "JR",
    amount: 840,
    ...overrides,
  }
}
```

- [ ] **Step 5: Run test and verify it passes**

Run:

```bash
npm run test -- src/domain/types.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit domain types**

```bash
git add src/domain/types.ts src/domain/types.test.ts src/test/fixtures.ts
git commit -m "feat: add domain types"
```

---

### Task 3: Inventory And Bundle Domain Logic

**Files:**
- Create: `src/domain/inventory.ts`
- Test: `src/domain/inventory.test.ts`

- [ ] **Step 1: Write failing inventory tests**

Create `src/domain/inventory.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  buildProductMovementRows,
  calculateRemainingStock,
  validateCheckoutStock,
} from "./inventory"
import { makeInventory, makeSale } from "../test/fixtures"

describe("inventory domain", () => {
  it("calculates remaining stock without persisting derived stock", () => {
    const inventories = [
      makeInventory({ productId: "book", initialStock: 10, reservedStock: 2 }),
    ]
    const sales = [
      makeSale({
        lines: [
          {
            lineId: "line-1",
            kind: "product",
            refId: "book",
            displayName: "新刊",
            productGenre: "book",
            unitPrice: 1000,
            quantity: 3,
            subtotal: 3000,
          },
        ],
      }),
      makeSale({
        id: "sale-canceled",
        canceled: true,
        lines: [
          {
            lineId: "line-2",
            kind: "product",
            refId: "book",
            displayName: "新刊",
            productGenre: "book",
            unitPrice: 1000,
            quantity: 99,
            subtotal: 99000,
          },
        ],
      }),
    ]

    expect(calculateRemainingStock("book", inventories, sales)).toBe(5)
  })

  it("expands bundles into product movement rows", () => {
    const sale = makeSale({
      id: "sale-1",
      lines: [
        {
          lineId: "line-1",
          kind: "bundle",
          refId: "set-1",
          displayName: "新刊セット",
          productGenre: "other",
          unitPrice: 1500,
          quantity: 2,
          subtotal: 3000,
          components: [
            {
              productId: "book",
              productName: "新刊",
              productGenre: "book",
              quantity: 1,
            },
            {
              productId: "badge",
              productName: "缶バッジ",
              productGenre: "goods",
              quantity: 2,
            },
          ],
        },
      ],
    })

    expect(buildProductMovementRows([sale])).toEqual([
      {
        saleId: "sale-1",
        datetime: "2026-08-16T10:00:00+09:00",
        lineId: "line-1",
        sourceKind: "bundle",
        sourceRefId: "set-1",
        sourceDisplayName: "新刊セット",
        productId: "book",
        productName: "新刊",
        productGenre: "book",
        unitQuantity: 1,
        lineQuantity: 2,
        totalProductQuantity: 2,
        canceled: false,
      },
      {
        saleId: "sale-1",
        datetime: "2026-08-16T10:00:00+09:00",
        lineId: "line-1",
        sourceKind: "bundle",
        sourceRefId: "set-1",
        sourceDisplayName: "新刊セット",
        productId: "badge",
        productName: "缶バッジ",
        productGenre: "goods",
        unitQuantity: 2,
        lineQuantity: 2,
        totalProductQuantity: 4,
        canceled: false,
      },
    ])
  })

  it("validates normal stock and reservation stock separately", () => {
    const result = validateCheckoutStock({
      inventories: [
        makeInventory({
          productId: "book",
          initialStock: 3,
          reservedStock: 1,
        }),
      ],
      existingSales: [],
      nextLines: [
        {
          lineId: "line-1",
          kind: "product",
          refId: "book",
          displayName: "新刊",
          productGenre: "book",
          unitPrice: 1000,
          quantity: 3,
          subtotal: 3000,
        },
        {
          lineId: "line-2",
          kind: "reservation",
          refId: "book",
          displayName: "取り置き: 新刊",
          productGenre: "book",
          unitPrice: 1000,
          quantity: 2,
          subtotal: 2000,
        },
      ],
    })

    expect(result).toEqual({
      ok: false,
      errors: [
        "在庫が不足しています: 新刊 残り2 / 必要3",
        "取り置き数が不足しています: 取り置き: 新刊 残り1 / 必要2",
      ],
    })
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test -- src/domain/inventory.test.ts
```

Expected: FAIL because `src/domain/inventory.ts` does not exist.

- [ ] **Step 3: Implement inventory domain**

Create `src/domain/inventory.ts`:

```ts
import type {
  EventInventory,
  ProductGenre,
  Sale,
  SaleLine,
  SaleLineKind,
} from "./types"

export interface ProductMovementRow {
  saleId: string
  datetime: string
  lineId: string
  sourceKind: SaleLineKind
  sourceRefId: string
  sourceDisplayName: string
  productId: string
  productName: string
  productGenre: ProductGenre
  unitQuantity: number
  lineQuantity: number
  totalProductQuantity: number
  canceled: boolean
}

export interface StockValidationInput {
  inventories: EventInventory[]
  existingSales: Sale[]
  nextLines: SaleLine[]
}

export type StockValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: string[] }

export function buildProductMovementRows(sales: Sale[]): ProductMovementRow[] {
  return sales.flatMap((sale) =>
    sale.lines.flatMap((line) => {
      if (line.kind === "bundle") {
        return (line.components ?? []).map((component) => ({
          saleId: sale.id,
          datetime: sale.datetime,
          lineId: line.lineId,
          sourceKind: line.kind,
          sourceRefId: line.refId,
          sourceDisplayName: line.displayName,
          productId: component.productId,
          productName: component.productName,
          productGenre: component.productGenre,
          unitQuantity: component.quantity,
          lineQuantity: line.quantity,
          totalProductQuantity: component.quantity * line.quantity,
          canceled: sale.canceled,
        }))
      }

      return [
        {
          saleId: sale.id,
          datetime: sale.datetime,
          lineId: line.lineId,
          sourceKind: line.kind,
          sourceRefId: line.refId,
          sourceDisplayName: line.displayName,
          productId: line.refId,
          productName: line.displayName.replace(/^取り置き: /, ""),
          productGenre: line.productGenre,
          unitQuantity: 1,
          lineQuantity: line.quantity,
          totalProductQuantity: line.quantity,
          canceled: sale.canceled,
        },
      ]
    }),
  )
}

export function calculateSoldCount(productId: string, sales: Sale[]): number {
  return buildProductMovementRows(sales)
    .filter((row) => !row.canceled && row.productId === productId)
    .reduce((sum, row) => sum + row.totalProductQuantity, 0)
}

export function calculateRemainingStock(
  productId: string,
  inventories: EventInventory[],
  sales: Sale[],
): number {
  const inventory = inventories.find((item) => item.productId === productId)
  if (!inventory) return 0
  return (
    inventory.initialStock -
    inventory.reservedStock -
    calculateSoldCount(productId, sales)
  )
}

export function validateCheckoutStock(
  input: StockValidationInput,
): StockValidationResult {
  const errors: string[] = []
  const normalSales = input.nextLines
    .filter((line) => line.kind !== "reservation")
    .map((line): Sale => ({
      id: "pending",
      eventId: input.inventories[0]?.eventId ?? "",
      datetime: "",
      totalAmount: 0,
      canceled: false,
      lines: [line],
    }))

  for (const row of buildProductMovementRows(normalSales)) {
    const remaining = calculateRemainingStock(
      row.productId,
      input.inventories,
      input.existingSales,
    )
    if (remaining < row.totalProductQuantity) {
      errors.push(
        `在庫が不足しています: ${row.productName} 残り${remaining} / 必要${row.totalProductQuantity}`,
      )
    }
  }

  for (const line of input.nextLines.filter((item) => item.kind === "reservation")) {
    const inventory = input.inventories.find((item) => item.productId === line.refId)
    const reservedStock = inventory?.reservedStock ?? 0
    if (reservedStock < line.quantity) {
      errors.push(
        `取り置き数が不足しています: ${line.displayName} 残り${reservedStock} / 必要${line.quantity}`,
      )
    }
  }

  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors }
}
```

- [ ] **Step 4: Run inventory tests**

Run:

```bash
npm run test -- src/domain/inventory.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit inventory logic**

```bash
git add src/domain/inventory.ts src/domain/inventory.test.ts
git commit -m "feat: add inventory domain logic"
```

---

### Task 4: Checkout Reducer And Sale Snapshot Logic

**Files:**
- Create: `src/reducers/checkoutReducer.ts`
- Create: `src/domain/checkout.ts`
- Test: `src/reducers/checkoutReducer.test.ts`
- Test: `src/domain/checkout.test.ts`

- [ ] **Step 1: Write failing checkout reducer tests**

Create `src/reducers/checkoutReducer.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { checkoutReducer, createInitialCheckoutState } from "./checkoutReducer"

const productLine = {
  kind: "product" as const,
  refId: "book",
  displayName: "新刊",
  productGenre: "book" as const,
  unitPrice: 1000,
  components: undefined,
}

describe("checkoutReducer", () => {
  it("adds, increments, decrements, removes at zero, and clears lines", () => {
    let state = createInitialCheckoutState("event-1")

    state = checkoutReducer(state, { type: "addLine", item: productLine })
    state = checkoutReducer(state, { type: "addLine", item: productLine })

    expect(state.totalQuantity).toBe(2)
    expect(state.totalAmount).toBe(2000)
    expect(state.lines).toHaveLength(1)

    const lineId = state.lines[0].lineId
    state = checkoutReducer(state, { type: "decrementLine", lineId })
    expect(state.lines[0].quantity).toBe(1)

    state = checkoutReducer(state, { type: "decrementLine", lineId })
    expect(state.lines).toHaveLength(0)

    state = checkoutReducer(state, { type: "addLine", item: productLine })
    state = checkoutReducer(state, { type: "clear" })
    expect(state.totalQuantity).toBe(0)
    expect(state.totalAmount).toBe(0)
  })
})
```

Create `src/domain/checkout.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { checkoutToSale } from "./checkout"

describe("checkoutToSale", () => {
  it("creates a sale snapshot from checkout state", () => {
    const sale = checkoutToSale({
      saleId: "sale-1",
      datetime: "2026-08-16T10:10:00+09:00",
      state: {
        eventId: "event-1",
        lines: [
          {
            lineId: "line-1",
            kind: "reservation",
            refId: "book",
            displayName: "取り置き: 新刊",
            productGenre: "book",
            unitPrice: 1000,
            quantity: 2,
            subtotal: 2000,
          },
        ],
        totalQuantity: 2,
        totalAmount: 2000,
      },
    })

    expect(sale).toEqual({
      id: "sale-1",
      eventId: "event-1",
      datetime: "2026-08-16T10:10:00+09:00",
      totalAmount: 2000,
      canceled: false,
      lines: [
        {
          lineId: "line-1",
          kind: "reservation",
          refId: "book",
          displayName: "取り置き: 新刊",
          productGenre: "book",
          unitPrice: 1000,
          quantity: 2,
          subtotal: 2000,
        },
      ],
    })
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test -- src/reducers/checkoutReducer.test.ts src/domain/checkout.test.ts
```

Expected: FAIL because reducer and checkout domain modules do not exist.

- [ ] **Step 3: Implement checkout reducer**

Create `src/reducers/checkoutReducer.ts`:

```ts
import type { ProductGenre, SaleLine, SaleLineComponent, SaleLineKind } from "../domain/types"

export interface CheckoutState {
  eventId: string
  lines: SaleLine[]
  totalQuantity: number
  totalAmount: number
}

export interface CheckoutItem {
  kind: SaleLineKind
  refId: string
  displayName: string
  productGenre: ProductGenre
  unitPrice: number
  components?: SaleLineComponent[]
}

export type CheckoutAction =
  | { type: "addLine"; item: CheckoutItem }
  | { type: "incrementLine"; lineId: string }
  | { type: "decrementLine"; lineId: string }
  | { type: "clear" }
  | { type: "replaceEvent"; eventId: string }

export function createInitialCheckoutState(eventId: string): CheckoutState {
  return {
    eventId,
    lines: [],
    totalQuantity: 0,
    totalAmount: 0,
  }
}

export function checkoutReducer(
  state: CheckoutState,
  action: CheckoutAction,
): CheckoutState {
  switch (action.type) {
    case "addLine": {
      const existing = state.lines.find(
        (line) => line.kind === action.item.kind && line.refId === action.item.refId,
      )
      const lines = existing
        ? state.lines.map((line) =>
            line.lineId === existing.lineId
              ? buildLine({ ...line, quantity: line.quantity + 1 })
              : line,
          )
        : [
            ...state.lines,
            buildLine({
              lineId: crypto.randomUUID(),
              kind: action.item.kind,
              refId: action.item.refId,
              displayName: action.item.displayName,
              productGenre: action.item.productGenre,
              unitPrice: action.item.unitPrice,
              quantity: 1,
              subtotal: action.item.unitPrice,
              components: action.item.components,
            }),
          ]
      return withTotals({ ...state, lines })
    }
    case "incrementLine":
      return withTotals({
        ...state,
        lines: state.lines.map((line) =>
          line.lineId === action.lineId
            ? buildLine({ ...line, quantity: line.quantity + 1 })
            : line,
        ),
      })
    case "decrementLine":
      return withTotals({
        ...state,
        lines: state.lines
          .map((line) =>
            line.lineId === action.lineId
              ? buildLine({ ...line, quantity: line.quantity - 1 })
              : line,
          )
          .filter((line) => line.quantity > 0),
      })
    case "clear":
      return createInitialCheckoutState(state.eventId)
    case "replaceEvent":
      return createInitialCheckoutState(action.eventId)
  }
}

function buildLine(line: SaleLine): SaleLine {
  return {
    ...line,
    subtotal: line.unitPrice * line.quantity,
  }
}

function withTotals(state: CheckoutState): CheckoutState {
  return {
    ...state,
    totalQuantity: state.lines.reduce((sum, line) => sum + line.quantity, 0),
    totalAmount: state.lines.reduce((sum, line) => sum + line.subtotal, 0),
  }
}
```

- [ ] **Step 4: Implement checkout snapshot conversion**

Create `src/domain/checkout.ts`:

```ts
import type { Sale } from "./types"
import type { CheckoutState } from "../reducers/checkoutReducer"

export interface CheckoutToSaleInput {
  saleId: string
  datetime: string
  state: CheckoutState
}

export function checkoutToSale(input: CheckoutToSaleInput): Sale {
  return {
    id: input.saleId,
    eventId: input.state.eventId,
    datetime: input.datetime,
    totalAmount: input.state.totalAmount,
    canceled: false,
    lines: input.state.lines.map((line) => ({
      ...line,
      components: line.components ? [...line.components] : undefined,
    })),
  }
}
```

- [ ] **Step 5: Run checkout tests**

Run:

```bash
npm run test -- src/reducers/checkoutReducer.test.ts src/domain/checkout.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit checkout reducer and snapshot logic**

```bash
git add src/reducers/checkoutReducer.ts src/reducers/checkoutReducer.test.ts src/domain/checkout.ts src/domain/checkout.test.ts
git commit -m "feat: add checkout reducer"
```

---

### Task 5: Dexie Database And Repositories

**Files:**
- Create: `src/db/database.ts`
- Create: `src/db/repositories.ts`
- Test: `src/db/repositories.test.ts`

- [ ] **Step 1: Write repository smoke test**

Create `src/db/repositories.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest"
import { db } from "./database"
import { eventRepository, productRepository } from "./repositories"
import { makeEvent, makeProduct } from "../test/fixtures"

afterEach(async () => {
  await db.delete()
  await db.open()
})

describe("repositories", () => {
  it("saves and lists events and products", async () => {
    await eventRepository.save(makeEvent({ id: "event-1" }))
    await productRepository.save(makeProduct({ id: "book", name: "新刊" }))

    await expect(eventRepository.list()).resolves.toHaveLength(1)
    await expect(productRepository.listActive()).resolves.toEqual([
      {
        id: "book",
        name: "新刊",
        productGenre: "book",
        defaultPrice: 1000,
        isActive: true,
      },
    ])
  })
})
```

- [ ] **Step 2: Run repository test and verify failure**

Run:

```bash
npm run test -- src/db/repositories.test.ts
```

Expected: FAIL because DB modules do not exist.

- [ ] **Step 3: Implement Dexie database**

Create `src/db/database.ts`:

```ts
import Dexie, { type Table } from "dexie"
import type {
  Bundle,
  BundleItem,
  Event,
  EventInventory,
  Expense,
  Product,
  Sale,
} from "../domain/types"

export class EventSalesDatabase extends Dexie {
  events!: Table<Event, string>
  products!: Table<Product, string>
  bundles!: Table<Bundle, string>
  bundleItems!: Table<BundleItem, [string, string]>
  eventInventories!: Table<EventInventory, [string, string]>
  sales!: Table<Sale, string>
  expenses!: Table<Expense, string>

  constructor() {
    super("event-sales-manager")
    this.version(1).stores({
      events: "id,eventDate,series",
      products: "id,name,productGenre,isActive",
      bundles: "id,name,isActive",
      bundleItems: "[bundleId+productId],bundleId,productId",
      eventInventories: "[eventId+productId],eventId,productId",
      sales: "id,[eventId+datetime],eventId,datetime,canceled",
      expenses: "id,eventId,category",
    })
  }
}

export const db = new EventSalesDatabase()
```

- [ ] **Step 4: Implement repositories**

Create `src/db/repositories.ts`:

```ts
import { db } from "./database"
import type {
  Bundle,
  BundleItem,
  Event,
  EventInventory,
  Expense,
  Product,
  Sale,
} from "../domain/types"

export const eventRepository = {
  list: () => db.events.orderBy("eventDate").reverse().toArray(),
  get: (id: string) => db.events.get(id),
  save: (event: Event) => db.events.put(event),
  delete: (id: string) => db.events.delete(id),
}

export const productRepository = {
  list: () => db.products.orderBy("name").toArray(),
  listActive: () => db.products.where("isActive").equals(1).sortBy("name"),
  get: (id: string) => db.products.get(id),
  save: (product: Product) => db.products.put(product),
}

export const bundleRepository = {
  list: () => db.bundles.orderBy("name").toArray(),
  listActive: () => db.bundles.where("isActive").equals(1).sortBy("name"),
  get: (id: string) => db.bundles.get(id),
  save: (bundle: Bundle) => db.bundles.put(bundle),
}

export const bundleItemRepository = {
  listByBundle: (bundleId: string) =>
    db.bundleItems.where("bundleId").equals(bundleId).toArray(),
  listAll: () => db.bundleItems.toArray(),
  saveMany: (items: BundleItem[]) => db.bundleItems.bulkPut(items),
  replaceForBundle: async (bundleId: string, items: BundleItem[]) => {
    await db.transaction("rw", db.bundleItems, async () => {
      await db.bundleItems.where("bundleId").equals(bundleId).delete()
      if (items.length > 0) await db.bundleItems.bulkPut(items)
    })
  },
}

export const inventoryRepository = {
  listByEvent: (eventId: string) =>
    db.eventInventories.where("eventId").equals(eventId).toArray(),
  save: (inventory: EventInventory) => db.eventInventories.put(inventory),
  saveMany: (inventories: EventInventory[]) =>
    db.eventInventories.bulkPut(inventories),
}

export const saleRepository = {
  listByEvent: (eventId: string) =>
    db.sales.where("eventId").equals(eventId).reverse().sortBy("datetime"),
  get: (id: string) => db.sales.get(id),
  save: (sale: Sale) => db.sales.put(sale),
}

export const expenseRepository = {
  listByEvent: (eventId: string) =>
    db.expenses.where("eventId").equals(eventId).toArray(),
  save: (expense: Expense) => db.expenses.put(expense),
  delete: (id: string) => db.expenses.delete(id),
}

export async function resetDatabase(): Promise<void> {
  await db.transaction(
    "rw",
    db.events,
    db.products,
    db.bundles,
    db.bundleItems,
    db.eventInventories,
    db.sales,
    db.expenses,
    async () => {
      await Promise.all([
        db.events.clear(),
        db.products.clear(),
        db.bundles.clear(),
        db.bundleItems.clear(),
        db.eventInventories.clear(),
        db.sales.clear(),
        db.expenses.clear(),
      ])
    },
  )
}
```

- [ ] **Step 5: Run repository test**

Run:

```bash
npm run test -- src/db/repositories.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit DB layer**

```bash
git add src/db/database.ts src/db/repositories.ts src/db/repositories.test.ts
git commit -m "feat: add indexeddb repositories"
```

---

### Task 6: Checkout Service Transactions

**Files:**
- Create: `src/services/checkoutService.ts`
- Test: `src/services/checkoutService.test.ts`

- [ ] **Step 1: Write failing checkout service tests**

Create `src/services/checkoutService.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest"
import { db } from "../db/database"
import { inventoryRepository, saleRepository } from "../db/repositories"
import { createInitialCheckoutState, checkoutReducer } from "../reducers/checkoutReducer"
import { makeInventory } from "../test/fixtures"
import { confirmCheckout, undoLatestSale } from "./checkoutService"

afterEach(async () => {
  await db.delete()
  await db.open()
})

describe("checkoutService", () => {
  it("saves sale and decrements reserved stock for reservation handover", async () => {
    await inventoryRepository.save(
      makeInventory({ productId: "book", initialStock: 10, reservedStock: 2 }),
    )

    const state = checkoutReducer(createInitialCheckoutState("event-1"), {
      type: "addLine",
      item: {
        kind: "reservation",
        refId: "book",
        displayName: "取り置き: 新刊",
        productGenre: "book",
        unitPrice: 1000,
      },
    })

    const result = await confirmCheckout(state, {
      now: () => "2026-08-16T10:20:00+09:00",
      id: () => "sale-1",
    })

    expect(result).toEqual({ ok: true, saleId: "sale-1" })
    await expect(saleRepository.listByEvent("event-1")).resolves.toHaveLength(1)
    await expect(inventoryRepository.listByEvent("event-1")).resolves.toMatchObject([
      { productId: "book", reservedStock: 1 },
    ])
  })

  it("cancels latest non-canceled sale without deleting it", async () => {
    await saleRepository.save({
      id: "sale-1",
      eventId: "event-1",
      datetime: "2026-08-16T10:20:00+09:00",
      totalAmount: 1000,
      canceled: false,
      lines: [],
    })

    const result = await undoLatestSale("event-1")

    expect(result).toEqual({ ok: true, saleId: "sale-1" })
    await expect(saleRepository.get("sale-1")).resolves.toMatchObject({
      canceled: true,
    })
  })
})
```

- [ ] **Step 2: Run service tests and verify failure**

Run:

```bash
npm run test -- src/services/checkoutService.test.ts
```

Expected: FAIL because `checkoutService.ts` does not exist.

- [ ] **Step 3: Implement checkout service**

Create `src/services/checkoutService.ts`:

```ts
import { db } from "../db/database"
import { checkoutToSale } from "../domain/checkout"
import { validateCheckoutStock } from "../domain/inventory"
import type { Sale } from "../domain/types"
import type { CheckoutState } from "../reducers/checkoutReducer"

export interface ClockAndId {
  now: () => string
  id: () => string
}

export type ConfirmCheckoutResult =
  | { ok: true; saleId: string }
  | { ok: false; errors: string[] }

export type UndoSaleResult =
  | { ok: true; saleId: string }
  | { ok: false; errors: string[] }

export async function confirmCheckout(
  state: CheckoutState,
  dependencies: ClockAndId = {
    now: () => new Date().toISOString(),
    id: () => crypto.randomUUID(),
  },
): Promise<ConfirmCheckoutResult> {
  if (state.lines.length === 0) {
    return { ok: false, errors: ["会計明細が空です。"] }
  }

  const sale = checkoutToSale({
    saleId: dependencies.id(),
    datetime: dependencies.now(),
    state,
  })

  return db.transaction(
    "rw",
    db.eventInventories,
    db.sales,
    async (): Promise<ConfirmCheckoutResult> => {
      const inventories = await db.eventInventories
        .where("eventId")
        .equals(state.eventId)
        .toArray()
      const existingSales = await db.sales
        .where("eventId")
        .equals(state.eventId)
        .toArray()
      const validation = validateCheckoutStock({
        inventories,
        existingSales,
        nextLines: sale.lines,
      })

      if (!validation.ok) return validation

      await db.sales.put(sale)

      for (const line of sale.lines.filter((item) => item.kind === "reservation")) {
        const inventory = inventories.find((item) => item.productId === line.refId)
        if (!inventory) {
          return {
            ok: false,
            errors: [`取り置き在庫が見つかりません: ${line.displayName}`],
          }
        }
        await db.eventInventories.put({
          ...inventory,
          reservedStock: inventory.reservedStock - line.quantity,
        })
      }

      return { ok: true, saleId: sale.id }
    },
  )
}

export async function undoLatestSale(eventId: string): Promise<UndoSaleResult> {
  return db.transaction("rw", db.sales, async () => {
    const sales = await db.sales.where("eventId").equals(eventId).toArray()
    const latest = sales
      .filter((sale): sale is Sale => !sale.canceled)
      .sort((a, b) => b.datetime.localeCompare(a.datetime))[0]

    if (!latest) return { ok: false, errors: ["取り消しできる売上がありません。"] }

    await db.sales.put({ ...latest, canceled: true })
    return { ok: true, saleId: latest.id }
  })
}
```

- [ ] **Step 4: Run checkout service tests**

Run:

```bash
npm run test -- src/services/checkoutService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit checkout service**

```bash
git add src/services/checkoutService.ts src/services/checkoutService.test.ts
git commit -m "feat: add checkout transactions"
```

---

### Task 7: Statistics And CSV Domain Logic

**Files:**
- Create: `src/domain/stats.ts`
- Create: `src/domain/csv.ts`
- Create: `src/services/csvExportService.ts`
- Test: `src/domain/stats.test.ts`
- Test: `src/domain/csv.test.ts`

- [ ] **Step 1: Write failing stats and CSV tests**

Create `src/domain/stats.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { calculateEventStats } from "./stats"
import { makeExpense, makeSale } from "../test/fixtures"

describe("calculateEventStats", () => {
  it("excludes canceled sales and subtracts expenses", () => {
    const stats = calculateEventStats({
      sales: [
        makeSale({
          totalAmount: 2000,
          lines: [
            {
              lineId: "line-1",
              kind: "product",
              refId: "book",
              displayName: "新刊",
              productGenre: "book",
              unitPrice: 1000,
              quantity: 2,
              subtotal: 2000,
            },
          ],
        }),
        makeSale({ id: "sale-canceled", totalAmount: 9999, canceled: true }),
      ],
      expenses: [makeExpense({ amount: 500 })],
    })

    expect(stats).toEqual({
      totalSales: 2000,
      totalQuantity: 2,
      averageUnitPrice: 1000,
      expenses: 500,
      profit: 1500,
      genreCounts: [{ productGenre: "book", quantity: 2 }],
      productRanking: [{ productId: "book", productName: "新刊", quantity: 2 }],
    })
  })
})
```

Create `src/domain/csv.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { buildSalesSummaryCsv, escapeCsvValue } from "./csv"
import { makeSale } from "../test/fixtures"

describe("csv domain", () => {
  it("escapes csv values", () => {
    expect(escapeCsvValue('新刊,"A"')).toBe('"新刊,""A"""')
  })

  it("builds sales summary csv", () => {
    const csv = buildSalesSummaryCsv([
      makeSale({
        id: "sale-1",
        eventId: "event-1",
        totalAmount: 1500,
        lines: [
          {
            lineId: "line-1",
            kind: "product",
            refId: "book",
            displayName: "新刊",
            productGenre: "book",
            unitPrice: 1500,
            quantity: 1,
            subtotal: 1500,
          },
        ],
      }),
    ])

    expect(csv).toContain("saleId,eventId,datetime,totalAmount,totalQuantity,canceled,lineCount")
    expect(csv).toContain("sale-1,event-1,2026-08-16T10:00:00+09:00,1500,1,false,1")
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test -- src/domain/stats.test.ts src/domain/csv.test.ts
```

Expected: FAIL because stats and CSV modules do not exist.

- [ ] **Step 3: Implement statistics**

Create `src/domain/stats.ts`:

```ts
import { buildProductMovementRows } from "./inventory"
import type { Expense, ProductGenre, Sale } from "./types"

export interface EventStats {
  totalSales: number
  totalQuantity: number
  averageUnitPrice: number
  expenses: number
  profit: number
  genreCounts: Array<{ productGenre: ProductGenre; quantity: number }>
  productRanking: Array<{ productId: string; productName: string; quantity: number }>
}

export function calculateEventStats(input: {
  sales: Sale[]
  expenses: Expense[]
}): EventStats {
  const activeSales = input.sales.filter((sale) => !sale.canceled)
  const totalSales = activeSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
  const movementRows = buildProductMovementRows(activeSales)
  const totalQuantity = movementRows.reduce(
    (sum, row) => sum + row.totalProductQuantity,
    0,
  )
  const expenses = input.expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return {
    totalSales,
    totalQuantity,
    averageUnitPrice:
      totalQuantity === 0 ? 0 : Math.round(totalSales / totalQuantity),
    expenses,
    profit: totalSales - expenses,
    genreCounts: groupGenres(movementRows),
    productRanking: groupProducts(movementRows),
  }
}

function groupGenres(
  rows: ReturnType<typeof buildProductMovementRows>,
): EventStats["genreCounts"] {
  const map = new Map<ProductGenre, number>()
  for (const row of rows) {
    map.set(row.productGenre, (map.get(row.productGenre) ?? 0) + row.totalProductQuantity)
  }
  return [...map.entries()]
    .map(([productGenre, quantity]) => ({ productGenre, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
}

function groupProducts(
  rows: ReturnType<typeof buildProductMovementRows>,
): EventStats["productRanking"] {
  const map = new Map<string, { productName: string; quantity: number }>()
  for (const row of rows) {
    const current = map.get(row.productId) ?? { productName: row.productName, quantity: 0 }
    map.set(row.productId, {
      productName: current.productName,
      quantity: current.quantity + row.totalProductQuantity,
    })
  }
  return [...map.entries()]
    .map(([productId, value]) => ({ productId, ...value }))
    .sort((a, b) => b.quantity - a.quantity)
}
```

- [ ] **Step 4: Implement CSV generation**

Create `src/domain/csv.ts`:

```ts
import { buildProductMovementRows } from "./inventory"
import type { Expense, Sale } from "./types"

export function escapeCsvValue(value: string | number | boolean | undefined): string {
  const text = value === undefined ? "" : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function buildCsv(headers: string[], rows: Array<Array<string | number | boolean | undefined>>): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n")
}

export function buildSalesSummaryCsv(sales: Sale[]): string {
  return buildCsv(
    ["saleId", "eventId", "datetime", "totalAmount", "totalQuantity", "canceled", "lineCount"],
    sales.map((sale) => [
      sale.id,
      sale.eventId,
      sale.datetime,
      sale.totalAmount,
      sale.lines.reduce((sum, line) => sum + line.quantity, 0),
      sale.canceled,
      sale.lines.length,
    ]),
  )
}

export function buildSalesLinesCsv(sales: Sale[]): string {
  return buildCsv(
    [
      "saleId",
      "datetime",
      "lineId",
      "kind",
      "refId",
      "displayName",
      "productGenre",
      "unitPrice",
      "quantity",
      "subtotal",
      "canceled",
      "componentProductIds",
      "componentQuantities",
    ],
    sales.flatMap((sale) =>
      sale.lines.map((line) => [
        sale.id,
        sale.datetime,
        line.lineId,
        line.kind,
        line.refId,
        line.displayName,
        line.productGenre,
        line.unitPrice,
        line.quantity,
        line.subtotal,
        sale.canceled,
        line.components?.map((component) => component.productId).join(","),
        line.components?.map((component) => component.quantity).join(","),
      ]),
    ),
  )
}

export function buildProductExpandedCsv(sales: Sale[]): string {
  return buildCsv(
    [
      "saleId",
      "datetime",
      "lineId",
      "sourceKind",
      "sourceRefId",
      "sourceDisplayName",
      "productId",
      "productName",
      "productGenre",
      "unitQuantity",
      "lineQuantity",
      "totalProductQuantity",
      "canceled",
    ],
    buildProductMovementRows(sales).map((row) => [
      row.saleId,
      row.datetime,
      row.lineId,
      row.sourceKind,
      row.sourceRefId,
      row.sourceDisplayName,
      row.productId,
      row.productName,
      row.productGenre,
      row.unitQuantity,
      row.lineQuantity,
      row.totalProductQuantity,
      row.canceled,
    ]),
  )
}

export function buildExpensesCsv(expenses: Expense[]): string {
  return buildCsv(
    ["expenseId", "eventId", "category", "payee", "amount", "memo"],
    expenses.map((expense) => [
      expense.id,
      expense.eventId,
      expense.category,
      expense.payee,
      expense.amount,
      expense.memo,
    ]),
  )
}
```

- [ ] **Step 5: Add CSV export service**

Create `src/services/csvExportService.ts`:

```ts
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 6: Run stats and CSV tests**

Run:

```bash
npm run test -- src/domain/stats.test.ts src/domain/csv.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit stats and CSV**

```bash
git add src/domain/stats.ts src/domain/stats.test.ts src/domain/csv.ts src/domain/csv.test.ts src/services/csvExportService.ts
git commit -m "feat: add stats and csv exports"
```

---

### Task 8: Reusable UI Components And App Navigation

**Files:**
- Create: `src/components/AppShell.tsx`
- Create: `src/components/ConfirmDialog.tsx`
- Create: `src/components/EmptyState.tsx`
- Create: `src/components/ErrorBanner.tsx`
- Create: `src/components/Modal.tsx`
- Create: `src/components/NumberField.tsx`
- Create: `src/components/SectionTabs.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write app navigation test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import App from "./App"

describe("App navigation", () => {
  it("starts on home and navigates to management", async () => {
    render(<App />)

    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "管理" }))
    expect(screen.getByRole("heading", { name: "管理" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run app test and verify failure**

Run:

```bash
npm run test -- src/App.test.tsx
```

Expected: FAIL because App still shows scaffold text and components do not exist.

- [ ] **Step 3: Add reusable components**

Create `src/components/ErrorBanner.tsx`:

```tsx
export function ErrorBanner({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null
  return (
    <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
      {messages.map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  )
}
```

Create `src/components/EmptyState.tsx`:

```tsx
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  )
}
```

Create `src/components/AppShell.tsx`:

```tsx
import type { ReactNode } from "react"

export type AppScreen = "home" | "checkout" | "stats" | "management" | "settings"

const navItems: Array<{ screen: AppScreen; label: string }> = [
  { screen: "home", label: "ホーム" },
  { screen: "checkout", label: "会計" },
  { screen: "stats", label: "統計" },
  { screen: "management", label: "管理" },
  { screen: "settings", label: "設定" },
]

export function AppShell({
  current,
  onNavigate,
  children,
}: {
  current: AppScreen
  onNavigate: (screen: AppScreen) => void
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Event Sales Manager
            </p>
            <p className="text-lg font-bold">頒布管理PWA</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <button
                key={item.screen}
                type="button"
                onClick={() => onNavigate(item.screen)}
                className={
                  item.screen === current
                    ? "rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
                }
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl p-4">{children}</div>
    </div>
  )
}
```

Create `src/components/Modal.tsx`, `src/components/ConfirmDialog.tsx`, `src/components/NumberField.tsx`, and `src/components/SectionTabs.tsx` with focused props:

```tsx
// src/components/Modal.tsx
import type { ReactNode } from "react"

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 p-4">
      <div className="mx-auto max-w-lg rounded-md bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" className="rounded-md border px-3 py-2" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
```

```tsx
// src/components/ConfirmDialog.tsx
export function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
      <p className="text-sm text-amber-900">{message}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="rounded-md bg-amber-700 px-3 py-2 text-white" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="rounded-md border px-3 py-2" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </div>
  )
}
```

```tsx
// src/components/NumberField.tsx
export function NumberField({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string
  value: number
  min?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
      />
    </label>
  )
}
```

```tsx
// src/components/SectionTabs.tsx
export function SectionTabs<T extends string>({
  value,
  items,
  onChange,
}: {
  value: T
  items: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={
            item.value === value
              ? "rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              : "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Replace App with screen navigation**

Modify `src/App.tsx`:

```tsx
import { useState } from "react"
import { AppShell, type AppScreen } from "./components/AppShell"

function ScreenHeading({ title }: { title: string }) {
  return <h1 className="text-2xl font-bold">{title}</h1>
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("home")

  return (
    <AppShell current={screen} onNavigate={setScreen}>
      {screen === "home" && <ScreenHeading title="ホーム" />}
      {screen === "checkout" && <ScreenHeading title="会計" />}
      {screen === "stats" && <ScreenHeading title="統計" />}
      {screen === "management" && <ScreenHeading title="管理" />}
      {screen === "settings" && <ScreenHeading title="設定" />}
    </AppShell>
  )
}
```

- [ ] **Step 5: Run app navigation test**

Run:

```bash
npm run test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit UI shell**

```bash
git add src/App.tsx src/App.test.tsx src/components
git commit -m "feat: add app shell navigation"
```

---

### Task 9: Home And Management Screens

**Files:**
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/ManagementPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/pages/HomePage.test.tsx`
- Test: `src/pages/ManagementPage.test.tsx`

- [ ] **Step 1: Write page tests**

Create `src/pages/HomePage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { HomePage } from "./HomePage"

describe("HomePage", () => {
  it("shows setup steps", () => {
    render(<HomePage selectedEventName={undefined} onNavigate={() => undefined} />)

    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument()
    expect(screen.getByText("イベント作成")).toBeInTheDocument()
    expect(screen.getByText("商品登録")).toBeInTheDocument()
    expect(screen.getByText("在庫と取り置き入力")).toBeInTheDocument()
  })
})
```

Create `src/pages/ManagementPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ManagementPage } from "./ManagementPage"

describe("ManagementPage", () => {
  it("shows management sections", () => {
    render(<ManagementPage />)

    expect(screen.getByRole("heading", { name: "管理" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "商品" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "セット" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "在庫と取り置き" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run page tests and verify failure**

Run:

```bash
npm run test -- src/pages/HomePage.test.tsx src/pages/ManagementPage.test.tsx
```

Expected: FAIL because pages do not exist.

- [ ] **Step 3: Implement HomePage**

Create `src/pages/HomePage.tsx`:

```tsx
import type { AppScreen } from "../components/AppShell"

const setupSteps = [
  "イベント作成",
  "商品登録",
  "セット登録",
  "在庫と取り置き入力",
  "会計開始",
]

export function HomePage({
  selectedEventName,
  onNavigate,
}: {
  selectedEventName?: string
  onNavigate: (screen: AppScreen) => void
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ホーム</h1>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">選択中イベント</h2>
        <p className="mt-1 text-sm text-slate-700">
          {selectedEventName ?? "イベントが選択されていません。"}
        </p>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">初期セットアップ</h2>
        <ol className="mt-3 space-y-2">
          {setupSteps.map((step, index) => (
            <li key={step} className="flex items-center gap-2 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="rounded-md bg-emerald-700 px-4 py-4 font-bold text-white" onClick={() => onNavigate("checkout")}>
          会計へ
        </button>
        <button type="button" className="rounded-md border border-slate-300 bg-white px-4 py-4 font-bold" onClick={() => onNavigate("management")}>
          管理へ
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement ManagementPage**

Create `src/pages/ManagementPage.tsx`:

```tsx
import { useState } from "react"
import { EmptyState } from "../components/EmptyState"
import { SectionTabs } from "../components/SectionTabs"

type ManagementSection = "products" | "bundles" | "inventory" | "events" | "expenses"

const sections: Array<{ value: ManagementSection; label: string }> = [
  { value: "products", label: "商品" },
  { value: "bundles", label: "セット" },
  { value: "inventory", label: "在庫と取り置き" },
  { value: "events", label: "イベント" },
  { value: "expenses", label: "経費" },
]

const emptyBodies: Record<ManagementSection, string> = {
  products: "商品名、価格、ジャンル、有効状態を登録します。",
  bundles: "セット名、価格、構成商品と数量を登録します。",
  inventory: "イベントごとの初期在庫、取り置き数、取り置きメモを登録します。",
  events: "イベント名、日付、種別、メモを登録します。",
  expenses: "印刷費、交通費、備品費などを登録します。",
}

export function ManagementPage() {
  const [section, setSection] = useState<ManagementSection>("products")
  const label = sections.find((item) => item.value === section)?.label ?? "商品"

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">管理</h1>
      <SectionTabs value={section} items={sections} onChange={setSection} />
      <EmptyState title={label} body={emptyBodies[section]} />
    </div>
  )
}
```

- [ ] **Step 5: Wire pages into App**

Modify `src/App.tsx`:

```tsx
import { useState } from "react"
import { AppShell, type AppScreen } from "./components/AppShell"
import { HomePage } from "./pages/HomePage"
import { ManagementPage } from "./pages/ManagementPage"

function ScreenHeading({ title }: { title: string }) {
  return <h1 className="text-2xl font-bold">{title}</h1>
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("home")

  return (
    <AppShell current={screen} onNavigate={setScreen}>
      {screen === "home" && <HomePage onNavigate={setScreen} />}
      {screen === "checkout" && <ScreenHeading title="会計" />}
      {screen === "stats" && <ScreenHeading title="統計" />}
      {screen === "management" && <ManagementPage />}
      {screen === "settings" && <ScreenHeading title="設定" />}
    </AppShell>
  )
}
```

- [ ] **Step 6: Run page tests**

Run:

```bash
npm run test -- src/pages/HomePage.test.tsx src/pages/ManagementPage.test.tsx src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit home and management skeletons**

```bash
git add src/App.tsx src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/pages/ManagementPage.tsx src/pages/ManagementPage.test.tsx
git commit -m "feat: add home and management screens"
```

---

### Task 10: Checkout, Statistics, And Settings Screens

**Files:**
- Create: `src/pages/CheckoutPage.tsx`
- Create: `src/pages/StatisticsPage.tsx`
- Create: `src/pages/SettingsPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/pages/CheckoutPage.test.tsx`
- Test: `src/pages/StatisticsPage.test.tsx`
- Test: `src/pages/SettingsPage.test.tsx`

- [ ] **Step 1: Write screen tests**

Create `src/pages/CheckoutPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { CheckoutPage } from "./CheckoutPage"

describe("CheckoutPage", () => {
  it("adds product and removes it by decrementing to zero", async () => {
    render(<CheckoutPage eventId="event-1" />)

    await userEvent.click(screen.getByRole("button", { name: /新刊 ¥1000/ }))
    expect(screen.getByText("新刊 x1")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "新刊を減らす" }))
    expect(screen.queryByText("新刊 x1")).not.toBeInTheDocument()
  })
})
```

Create `src/pages/StatisticsPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StatisticsPage } from "./StatisticsPage"

describe("StatisticsPage", () => {
  it("shows statistic labels", () => {
    render(<StatisticsPage />)

    expect(screen.getByRole("heading", { name: "統計" })).toBeInTheDocument()
    expect(screen.getByText("総売上")).toBeInTheDocument()
    expect(screen.getByText("利益")).toBeInTheDocument()
  })
})
```

Create `src/pages/SettingsPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SettingsPage } from "./SettingsPage"

describe("SettingsPage", () => {
  it("shows csv and update controls", () => {
    render(<SettingsPage />)

    expect(screen.getByRole("heading", { name: "設定" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "売上サマリーCSV" })).toBeInTheDocument()
    expect(screen.getByText("PWA更新")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run screen tests and verify failure**

Run:

```bash
npm run test -- src/pages/CheckoutPage.test.tsx src/pages/StatisticsPage.test.tsx src/pages/SettingsPage.test.tsx
```

Expected: FAIL because pages do not exist.

- [ ] **Step 3: Implement CheckoutPage**

Create `src/pages/CheckoutPage.tsx`:

```tsx
import { useReducer } from "react"
import { checkoutReducer, createInitialCheckoutState } from "../reducers/checkoutReducer"

const demoItems = [
  {
    kind: "product" as const,
    refId: "book",
    displayName: "新刊",
    productGenre: "book" as const,
    unitPrice: 1000,
  },
  {
    kind: "reservation" as const,
    refId: "book",
    displayName: "取り置き: 新刊",
    productGenre: "book" as const,
    unitPrice: 1000,
  },
]

export function CheckoutPage({ eventId }: { eventId: string }) {
  const [state, dispatch] = useReducer(checkoutReducer, eventId, createInitialCheckoutState)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">会計</h1>
      <div className="grid grid-cols-2 gap-3">
        {demoItems.map((item) => (
          <button
            key={`${item.kind}-${item.refId}`}
            type="button"
            onClick={() => dispatch({ type: "addLine", item })}
            className="min-h-24 rounded-md bg-white p-4 text-left shadow-sm ring-1 ring-slate-200"
          >
            <span className="block text-lg font-bold">{item.displayName}</span>
            <span className="mt-2 block text-sm text-slate-600">¥{item.unitPrice}</span>
          </button>
        ))}
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">会計明細</h2>
        <div className="mt-3 space-y-2">
          {state.lines.map((line) => (
            <div key={line.lineId} className="flex items-center justify-between gap-3">
              <span>{line.displayName} x{line.quantity}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label={`${line.displayName}を減らす`}
                  className="h-11 w-11 rounded-md border text-lg font-bold"
                  onClick={() => dispatch({ type: "decrementLine", lineId: line.lineId })}
                >
                  -
                </button>
                <button
                  type="button"
                  aria-label={`${line.displayName}を増やす`}
                  className="h-11 w-11 rounded-md border text-lg font-bold"
                  onClick={() => dispatch({ type: "incrementLine", lineId: line.lineId })}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" className="min-h-16 rounded-md border bg-white font-bold" onClick={() => dispatch({ type: "clear" })}>
          クリア
        </button>
        <button type="button" className="min-h-16 rounded-md border bg-white font-bold">
          Undo
        </button>
        <button type="button" className="min-h-16 rounded-md bg-emerald-700 font-bold text-white">
          確定 ¥{state.totalAmount}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement StatisticsPage and SettingsPage**

Create `src/pages/StatisticsPage.tsx`:

```tsx
const summary = [
  ["総売上", "¥0"],
  ["頒布数", "0"],
  ["平均単価", "¥0"],
  ["経費", "¥0"],
  ["利益", "¥0"],
]

export function StatisticsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">統計</h1>
      <div className="grid grid-cols-2 gap-3">
        {summary.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Create `src/pages/SettingsPage.tsx`:

```tsx
const csvButtons = ["売上サマリーCSV", "売上明細CSV", "商品別展開CSV", "経費CSV"]

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">設定</h1>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">CSV出力</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {csvButtons.map((label) => (
            <button key={label} type="button" className="rounded-md border px-3 py-3 font-semibold">
              {label}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">PWA更新</h2>
        <p className="mt-1 text-sm text-slate-600">更新がある場合はここに表示します。</p>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Wire pages into App**

Modify `src/App.tsx`:

```tsx
import { useState } from "react"
import { AppShell, type AppScreen } from "./components/AppShell"
import { CheckoutPage } from "./pages/CheckoutPage"
import { HomePage } from "./pages/HomePage"
import { ManagementPage } from "./pages/ManagementPage"
import { SettingsPage } from "./pages/SettingsPage"
import { StatisticsPage } from "./pages/StatisticsPage"

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("home")
  const selectedEventId = "event-1"

  return (
    <AppShell current={screen} onNavigate={setScreen}>
      {screen === "home" && <HomePage onNavigate={setScreen} />}
      {screen === "checkout" && <CheckoutPage eventId={selectedEventId} />}
      {screen === "stats" && <StatisticsPage />}
      {screen === "management" && <ManagementPage />}
      {screen === "settings" && <SettingsPage />}
    </AppShell>
  )
}
```

- [ ] **Step 6: Run screen tests**

Run:

```bash
npm run test -- src/pages/CheckoutPage.test.tsx src/pages/StatisticsPage.test.tsx src/pages/SettingsPage.test.tsx src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit main screens**

```bash
git add src/App.tsx src/pages/CheckoutPage.tsx src/pages/CheckoutPage.test.tsx src/pages/StatisticsPage.tsx src/pages/StatisticsPage.test.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "feat: add checkout stats settings screens"
```

---

### Task 11: PWA Update Hook And GitHub Pages CI/CD

**Files:**
- Create: `src/hooks/usePwaUpdate.ts`
- Modify: `src/pages/SettingsPage.tsx`
- Create: `.github/workflows/deploy-pages.yml`
- Test: `src/hooks/usePwaUpdate.test.tsx`

- [ ] **Step 1: Write PWA hook test**

Create `src/hooks/usePwaUpdate.test.tsx`:

```tsx
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { usePwaUpdate } from "./usePwaUpdate"

describe("usePwaUpdate", () => {
  it("returns disabled state when no update is available", () => {
    const { result } = renderHook(() => usePwaUpdate())

    expect(result.current.needRefresh).toBe(false)
    expect(result.current.offlineReady).toBe(false)
  })
})
```

- [ ] **Step 2: Run hook test and verify failure**

Run:

```bash
npm run test -- src/hooks/usePwaUpdate.test.tsx
```

Expected: FAIL because hook does not exist.

- [ ] **Step 3: Implement PWA update hook**

Create `src/hooks/usePwaUpdate.ts`:

```ts
import { useRegisterSW } from "virtual:pwa-register/react"

export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  })

  return {
    needRefresh,
    offlineReady,
    update: () => updateServiceWorker(true),
  }
}
```

- [ ] **Step 4: Wire update state into SettingsPage**

Modify `src/pages/SettingsPage.tsx`:

```tsx
import { usePwaUpdate } from "../hooks/usePwaUpdate"

const csvButtons = ["売上サマリーCSV", "売上明細CSV", "商品別展開CSV", "経費CSV"]

export function SettingsPage() {
  const pwa = usePwaUpdate()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">設定</h1>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">CSV出力</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {csvButtons.map((label) => (
            <button key={label} type="button" className="rounded-md border px-3 py-3 font-semibold">
              {label}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">PWA更新</h2>
        <p className="mt-1 text-sm text-slate-600">
          {pwa.offlineReady
            ? "オフライン起動の準備ができています。"
            : "更新がある場合はここに表示します。"}
        </p>
        {pwa.needRefresh && (
          <button type="button" className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-white" onClick={pwa.update}>
            更新する
          </button>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Add Vite PWA type shim if TypeScript requires it**

If `npm run build` reports `Cannot find module 'virtual:pwa-register/react'`, create `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
```

Then rerun the build command in Step 7.

- [ ] **Step 6: Add GitHub Pages workflow**

Create `.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 7: Run hook test and build**

Run:

```bash
npm run test -- src/hooks/usePwaUpdate.test.tsx
npm run build
```

Expected: PASS and `dist/` generated with PWA assets.

- [ ] **Step 8: Commit PWA and CI/CD**

```bash
git add .github/workflows/deploy-pages.yml src/hooks/usePwaUpdate.ts src/hooks/usePwaUpdate.test.tsx src/pages/SettingsPage.tsx src/vite-env.d.ts vite.config.ts
git commit -m "feat: add pwa update and pages workflow"
```

---

### Task 12: Final Integration Verification

**Files:**
- Modify only files required to fix verification failures from this task.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: exits 0 with no warnings because `--max-warnings=0` is configured.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: exits 0 and creates `dist/`.

- [ ] **Step 4: Inspect GitHub Pages base in build output**

Run:

```bash
Get-ChildItem -Recurse -File dist | Select-Object -ExpandProperty FullName
```

Expected: `dist/index.html`, manifest, service worker, and assets exist. If a built HTML asset path lacks `/event-sales-manager-pwa/`, fix `vite.config.ts` and rerun `npm run build`.

- [ ] **Step 5: Commit final verification fixes**

If no files changed, skip this commit. If files changed:

```bash
git add <changed-files>
git commit -m "fix: address final integration issues"
```

---

## Self-Review Notes

- Spec coverage: The plan covers scaffold, domain types, inventory calculation, set expansion, reservation handover, cancellation undo, Dexie schema, management/home/checkout/statistics/settings screens, CSV exports, PWA update behavior, and GitHub Pages CI/CD.
- Scope: This is a full MVP plan. Some screen tasks start with thin but testable UI and should be expanded during execution by following the domain and service tasks already defined.
- Placeholder scan: The plan avoids TBD/TODO/fill-in markers. Task 11 Step 5 is conditional with explicit code and a concrete build error trigger.
- Type consistency: `SaleLineKind`, `EventInventory.reservationMemo`, `kind: "reservation"`, `reservedStock`, and CSV column names match the Japanese design document.
