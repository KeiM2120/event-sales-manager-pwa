# Event Sales Manager PWA MVP Implementation Design

## Purpose

Build the first usable MVP for Event Sales Manager PWA. The MVP should cover the planned specification broadly enough to be used at an event, while keeping the design local-first, offline-capable, and simple enough for reliable single-device Android operation.

The implementation should prioritize fast checkout, resilient IndexedDB persistence, derived inventory calculation, cancellation-based undo, event-day statistics, CSV export, and PWA offline startup with update notification.

## Scope

The MVP includes:

- Vite, React, TypeScript, TailwindCSS, Dexie, and vite-plugin-pwa setup.
- Independent screens for Home, Checkout, Statistics, Management, and Settings.
- Event, product, bundle, bundle item, event inventory, sale, and expense persistence.
- Guided setup from Home for event creation, product registration, optional bundle registration, inventory and reservation entry, then checkout.
- Manual management screens for events, products, bundles, event inventory, reservations, and expenses.
- Checkout for normal products, bundles, and reservation handovers.
- Sale cancellation through `canceled: true`, not physical deletion.
- Dynamic inventory calculation without persisting remaining stock.
- Statistics that exclude canceled sales.
- Four CSV exports: sales summary, sales lines, product-expanded sales, and expenses.
- PWA App Shell caching and user-controlled update notification.

The MVP excludes:

- Authentication, cloud sync, multi-device sync, Firebase, realtime communication, printers, barcode scanning, QR payments, and iOS-specific optimization.
- JSON import/export. CSV export is included; backup/restore JSON can be added later.
- Person-level reservation records. Reservations are managed per product with a count and optional memo.

## Architecture

Use a data-and-rules-first implementation approach. The app should establish domain logic and persistence boundaries before building rich screen behavior.

Recommended source layout:

```txt
src/
  components/
  pages/
  hooks/
  reducers/
  services/
  db/
  domain/
  utils/
```

Business rules belong in pure domain modules or service modules, not inside React components. React pages should load data, call services, dispatch reducer actions, and render state.

Key boundaries:

- `src/db/`: Dexie database definition, migrations, and repository-style functions.
- `src/domain/`: pure logic for inventory calculation, bundle expansion, statistics, CSV rows, and validation helpers.
- `src/reducers/`: checkout state reducer and other pure UI state reducers.
- `src/services/`: workflows that coordinate repositories and domain functions, such as checkout confirmation and reservation handover.
- `src/pages/`: independent Home, Checkout, Statistics, Management, and Settings screens.

## Data Model

Use the schema from `spec.md` as the baseline:

```ts
this.version(1).stores({
  events: "id,eventDate,series",
  products: "id,name,productGenre,isActive",
  bundles: "id,name,isActive",
  bundleItems: "[bundleId+productId],bundleId,productId",
  eventInventories: "[eventId+productId],eventId,productId",
  sales: "id,[eventId+datetime],eventId,datetime,canceled",
  expenses: "id,eventId,category",
})
```

Core records:

- `Event`: event name, date, series, and optional memo.
- `Product`: name, genre, default price, and active flag.
- `Bundle`: name, price, and active flag.
- `BundleItem`: bundle ID, product ID, and quantity.
- `EventInventory`: event ID, product ID, initial stock, reserved stock, and optional reservation memo.
- `Sale`: event ID, datetime, total amount, canceled flag, and sale lines.
- `Expense`: event ID, category, payee, amount, and optional memo.

Extend `EventInventory` with:

```ts
reservationMemo?: string
```

Use explicit sale line kinds:

```ts
type SaleLineKind = "product" | "bundle" | "reservation"
```

Sale lines must keep snapshots so later product or bundle edits do not rewrite historical sales. A sale line should keep display name, genre, unit price, quantity, subtotal, and bundle component snapshots when relevant.

## Inventory Rules

Never persist derived remaining stock.

Calculate remaining stock as:

```txt
remainingStock = initialStock - reservedStock - soldCount
```

`soldCount` is calculated from non-canceled sales only. Product sales and reservation sales count directly. Bundle sales count by expanding their components.

Canceled sales are excluded from inventory sold counts, statistics, and product rankings. The sale record remains in history with `canceled: true`.

## Checkout Flow

The Checkout screen is the primary event-day screen.

It displays large sale items for:

- Active products.
- Active bundles.
- Reservation handover entries shown as `取り置き: 商品名` for products where `reservedStock > 0`.

Tapping a sale item adds it to the current checkout state. Checkout state is held in React reducer state and does not need persistence.

Checkout lines support quantity changes with `-` and `+`. Pressing `-` when the quantity reaches `0` removes the line automatically. There is no separate per-line delete control. The Action Bar contains:

- `クリア`: clear the current checkout.
- `Undo`: cancel the latest non-canceled sale for the selected event.
- `確定`: validate and save the current checkout.

On confirmation:

1. Convert checkout state into a sale snapshot.
2. Reload current event inventory and sales from IndexedDB.
3. Validate normal products and bundles against dynamically calculated remaining stock.
4. Validate reservation lines against `reservedStock >= quantity`.
5. Save the sale in a Dexie transaction.
6. In the same transaction, subtract reservation quantities from `reservedStock`.
7. Clear checkout state after a successful save.

If validation fails, do not save the sale and do not mutate reserved stock. Show a concise message such as:

```txt
取り置き数が不足しています: 新刊 残り1 / 必要2
```

## Reservation Handover

Reservations are entered and edited in the Management screen as per-product reserved stock plus an optional memo.

Reservation handover happens from the Checkout screen through `取り置き: 商品名` sale items. Reservation sale lines use `kind: "reservation"` in history and sales-line CSV output. In statistics and product-expanded CSV output, reservation handovers count as normal product sales.

This keeps event-day operation fast while preserving enough history to distinguish normal sales from reservation handovers later.

## Screens

### Home

Home is the startup screen. It shows event selection, selected event state, setup progress, and entry points to the other screens.

When setup is incomplete, guide the user through:

1. Create event.
2. Register products.
3. Register bundles, skippable when no bundles are needed.
4. Enter inventory and reservations.
5. Start checkout.

### Checkout

Checkout is optimized for Android Chrome and event-day use. It should have large touch targets, readable prices, quantities, remaining stock, and a stable Action Bar.

Sale items include products, bundles, and reservation handover entries. Checkout summary lines use `-` and `+` quantity controls; quantity `0` removes the line.

### Management

Management is for preparation and corrections. It contains section switching for:

- Products.
- Bundles.
- Inventory and reservations.
- Events.
- Expenses.

Products support name, price, genre, and active/inactive state. Bundles support name, price, and component product quantities. Inventory supports initial stock, reserved stock, optional reservation memo, and derived remaining stock display.

### Statistics

Statistics show selected-event totals:

- Total sales.
- Distributed item count.
- Average unit price.
- Expenses.
- Profit.
- Genre ratio.
- Product ranking.
- Timeline history.

Canceled sales are excluded from totals, ratios, rankings, and profit. Timeline history should still show canceled sales with a clear canceled state.

### Settings

Settings contains CSV export, PWA update status, app information, and data reset.

Data reset must require explicit confirmation to reduce accidental event-day data loss. PWA updates must be user-controlled; the app should not automatically reload during checkout.

## CSV Exports

MVP exports four CSV files.

### Sales Summary CSV

One row per sale.

Columns:

```csv
saleId,eventId,datetime,totalAmount,totalQuantity,canceled,lineCount
```

### Sales Lines CSV

One row per sale line.

Columns:

```csv
saleId,datetime,lineId,kind,refId,displayName,productGenre,unitPrice,quantity,subtotal,canceled,componentProductIds,componentQuantities
```

Bundle lines keep their bundle identity and include component IDs and quantities. Reservation lines use `kind=reservation`.

### Product-Expanded Sales CSV

One row per actual product movement after expanding products, bundles, and reservations to product units.

Columns:

```csv
saleId,datetime,lineId,sourceKind,sourceRefId,sourceDisplayName,productId,productName,productGenre,unitQuantity,lineQuantity,totalProductQuantity,canceled
```

This CSV is intended for spreadsheet product-count analysis. For example, a bundle containing one book and one badge creates two product-expanded rows.

### Expenses CSV

One row per expense.

Columns:

```csv
expenseId,eventId,category,payee,amount,memo
```

## PWA Behavior

Use `vite-plugin-pwa` for installability, offline startup, and App Shell caching.

When an update is available, show a user-controlled update action in Settings or a common notification area. Do not force reload while the user is in checkout. Data remains in IndexedDB and must be usable offline after the first successful load.

## Error Handling

Error messages should be short and operational. Prefer messages that name the affected item and required count.

Examples:

- `在庫が不足しています: 新刊 残り1 / 必要2`
- `取り置き数が不足しています: 新刊 残り1 / 必要2`
- `保存できませんでした。もう一度試してください。`

IndexedDB write failures and PWA update failures should be recoverable through retry where practical.

## Testing And Verification

Prioritize tests for domain logic:

- Remaining stock calculation.
- Bundle expansion.
- Reservation handover validation and reserved stock decrement.
- Canceled sale exclusion.
- Statistics aggregation.
- CSV row generation.

Checkout reducer tests should cover:

- Add product, bundle, and reservation lines.
- Increment and decrement quantities.
- Remove a line when quantity reaches `0`.
- Clear checkout.

Before completing implementation, run available verification scripts:

```bash
npm run build
npm run lint
```

Run targeted tests if a test suite exists.

## Acceptance Criteria

The MVP is complete when:

- The app can be installed or opened as a PWA after setup.
- The app starts offline after the first successful load.
- A user can create an event from Home.
- A user can manually register products, bundles, inventory, reservations, and expenses.
- A user can select an event and perform checkout for normal products, bundles, and `取り置き: 商品名` reservation handovers.
- Checkout validates stock before saving.
- Reservation handover decrements reserved stock and creates a sale in the same transaction.
- Undo marks the latest sale as canceled without physical deletion.
- Statistics exclude canceled sales.
- The app can export sales summary, sales lines, product-expanded sales, and expenses CSV files.
- PWA update notification is visible and user-controlled.
