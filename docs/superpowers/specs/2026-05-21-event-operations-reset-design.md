# Event Operations UX and Event Reset Design

## Purpose

Event Sales Manager PWA should make the active event explicit, guide the user through setup before checkout, and allow safe cleanup of per-event operational data. The design prioritizes event-day safety and fast offline use on a single Android device.

## Scope

This design covers three areas:

- Home event operations UX.
- Settings reset for the selected event's operational data.
- Minimal domain/service boundaries for the new behavior.

This design does not include cloud sync, authentication, repository-wide refactoring, JSON import/export, person-level reservation management, or sample seed data.

## A. Event Operations UX

### Event Selection

The app will keep `selectedEventId` in `App` state. Home will show the selected event near the top of the screen. If more than one event exists, Home will provide a simple event switcher.

Checkout, statistics, and settings CSV export will all use the selected event. If the selected event no longer exists, the app will fall back to the first remaining event. If no event exists, checkout navigation will redirect to management with a setup notice.

### Setup Status

Home will show a detailed setup status for the current app data:

- Event registration.
- Product registration.
- Bundle registration.
- Inventory registration for the selected event.
- Checkout readiness.

Product, bundle, and inventory rows will show counts. Missing rows will guide the user to management.

Checkout is ready when all of the following are true:

- At least one event exists.
- At least one active product exists.
- The selected event has at least one inventory row.

Bundles are visible in setup status but are not required for checkout readiness.

## B. Selected Event Operational Reset

Settings will add a dangerous operation section for resetting only the selected event's operational data.

The reset deletes:

- `eventInventories` for the selected event.
- `sales` for the selected event.
- `expenses` for the selected event.

The reset preserves:

- Events.
- Products.
- Bundles.
- Bundle items.
- Data belonging to other events.

The reset requires a strong guard:

- The user must enter the selected event name exactly.
- The execute button is disabled until the input matches.
- The UI clearly states that the operation cannot be undone.
- After completion, Settings shows a success message.

After reset, Home setup status should naturally show the selected event as not checkout-ready because inventory is gone.

## C. Minimal Design Boundaries

The implementation will add focused domain/service boundaries only for the new behavior:

- `src/domain/setupStatus.ts`
  - Calculates setup rows and checkout readiness from events, products, bundles, and selected-event inventory.
  - Contains no React or Dexie dependencies.
- `src/services/eventResetService.ts`
  - Deletes selected-event operational data in a Dexie transaction.
  - Does not delete master data or other events' data.

Existing pages may continue to use Dexie live queries directly where already established. Full repository-layer refactoring is intentionally out of scope for this change.

## Testing Plan

Tests should cover:

- Home displays the selected event and can switch between multiple events.
- Home setup status reflects event, product, bundle, inventory, and checkout readiness.
- Checkout navigation redirects to management when there is no event or no selected-event inventory.
- Checkout, statistics, and settings receive the selected event.
- Reset confirmation stays disabled until the selected event name matches exactly.
- Reset deletes only selected-event inventory, sales, and expenses.
- Reset preserves products, bundles, bundle items, events, and other events' data.
- `setupStatus` domain logic independently covers required and optional setup rows.
- `eventResetService` independently covers transaction behavior and event scoping.

## Deferred Items

The following remain deferred:

- Repository-wide Dexie access refactor.
- JSON import/export.
- Sample seed data.
- Person-level reservation management.
- Additional reservation workflow design.
