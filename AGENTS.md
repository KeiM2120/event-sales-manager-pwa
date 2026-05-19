# Repository Guidelines

## Project Overview

This repository is for Event Sales Manager PWA, an offline-first React/TypeScript Progressive Web App for doujin and convention event sales management.

The app is intended for fast single-device operation on Android browsers during events. Prefer simple, resilient local-first behavior over backend-dependent designs.

## Tech Stack

- React
- TypeScript
- Vite
- TailwindCSS
- Dexie
- IndexedDB
- vite-plugin-pwa

## Product Principles

- Offline first.
- Android Chrome is the primary target; Android Firefox is secondary.
- Use large, touch-friendly controls suitable for busy event sales.
- Keep checkout interactions fast and tap-oriented.
- Do not introduce authentication, cloud sync, multi-device sync, Firebase, realtime communication, printers, barcode scanning, QR payments, or iOS-specific optimization unless explicitly requested.

## Domain Rules

- Do not persist derived remaining stock.
- Calculate remaining stock from initial stock, reserved stock, and non-canceled sold count.
- Sales are not physically deleted.
- Undo/cancel sales by marking records as canceled.
- Canceled sales must be excluded from sold counts and statistics.
- Reservation handover decrements reserved stock and creates a sale record.
- Sales records should keep snapshots so later product changes do not rewrite historical sales.

## Code Organization

When source files exist, prefer this structure:

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

Keep business rules out of React components. Put reusable domain logic in pure utility or domain/service modules.

## TypeScript Rules

- Use strict TypeScript.
- Do not use `any`.
- Prefer explicit domain types and discriminated unions where they make state transitions clearer.
- Keep reducers pure.
- Avoid unnecessary dependencies.

## UI Guidance

- Build the actual app workflow first, not a marketing landing page.
- Prioritize dense, readable operational UI over decorative composition.
- Use clear visual hierarchy, large tap targets, and stable layouts.
- Make common event-day actions reachable quickly.

## Persistence

- Use Dexie for IndexedDB access.
- Keep schema and migrations centralized under `src/db/`.
- Do not store data that can be reliably derived from event-sourced sales/history records.

## Verification

When scripts are available, run the relevant checks before finishing:

- `npm run build`
- `npm run lint`
- targeted tests if a test suite exists

If dependencies are not installed or scripts do not exist yet, state that clearly in the final response.

## Current Notes

- The repository currently contains project documentation but may not yet contain the Vite app scaffold.
- `spec.md` exists as an untracked file in the working tree as of initialization. Do not delete or overwrite it without explicit user approval.
- PowerShell may print a startup warning about `fnm` not being found. This warning is unrelated to repository behavior.
