# Event Sales Manager PWA

Comic market / doujin event sales management Progressive Web App (PWA).

Designed for offline-first operation during events such as Comic Market (コミックマーケット), M3, technical book fairs, and other doujin conventions.

---

# Features

- Offline-first sales management
- Fast tap-based checkout flow
- Product / bundle sales support
- Event-specific inventory management
- Reservation stock management
- Undo(cancel) sales history
- Statistics and analytics
- Expense tracking
- JSON export/import
- CSV export
- Android smartphone optimized UI
- PWA install support

---

# Target Environment

## Primary

- Android Chrome

## Secondary

- Android Firefox

---

# Tech Stack

- React
- TypeScript
- Vite
- TailwindCSS
- Dexie
- IndexedDB
- vite-plugin-pwa

---

# Core Design Philosophy

- Offline first
- Single device operation
- Fast UI interaction during events
- Large touch-friendly buttons
- Event sourcing oriented sales history
- Derived inventory calculation
- Snapshot-based sales records
- Avoid unnecessary backend dependencies

---

# Inventory Policy

Remaining stock is NOT persisted.

Remaining stock is dynamically calculated from:

```txt
remainingStock =
initialStock
- reservedStock
- soldCount
````

Canceled sales are excluded from soldCount.

---

# Reservation Policy

Reservations are managed as reserved stock counts.

When reservation items are handed over:

```txt
reservedStock--
+ create Sale record
```

Reservation handovers are included in sales statistics.

---

# Sales Policy

* Physical delete is NOT allowed
* Undo is implemented using:

  * `canceled = true`
* All sales can be canceled
* Inventory restoration is NOT directly performed
* Inventory is recalculated dynamically

---

# Project Structure

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

---

# Planned Screens

## Checkout Screen

Main sales operation screen.

Features:

* Product grid
* Checkout summary
* Undo
* Confirm sale
* Remaining stock display

---

## Statistics Screen

Features:

* Total sales
* Product ranking
* Genre ratio
* Expense summary
* Timeline history

---

## Management Screen

Features:

* Product management
* Bundle management
* Inventory management
* Event management
* Expense management

---

# Database

IndexedDB via Dexie.

Schema is defined in:

```txt
src/db/
```

---

# PWA Requirements

* Installable
* Offline capable
* Fast startup
* App Shell caching

---

# Non-goals

The following are intentionally out of scope for the prototype:

* Cloud sync
* Multi-device sync
* Authentication
* Firebase
* Realtime communication
* Receipt printers
* Barcode scanning
* QR payments
* iOS optimization

---

# Development Rules

* TypeScript strict mode required
* Never use `any`
* Keep business logic outside React components
* Prefer pure utility functions
* Avoid unnecessary dependencies
* Keep components small and focused
* Do not persist derived data
* Use snapshots for sales records

---

# Setup

## Install dependencies

```bash
npm install
```

## Start development server

```bash
npm run dev
```

## Build

```bash
npm run build
```

---

# License

MIT
```
```

テスト
