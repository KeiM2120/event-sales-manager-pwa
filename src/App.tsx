import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppShell, type AppScreen } from "./components/AppShell";
import { db as appDatabase, type EventSalesDatabase } from "./db/database";
import type { Bundle, Event, EventInventory, Product } from "./domain/types";
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
  const events =
    (useLiveQuery(() => database.events.toArray(), [database]) as
      | Event[]
      | undefined) ?? [];
  const products =
    (useLiveQuery(() => database.products.toArray(), [database]) as
      | Product[]
      | undefined) ?? [];
  const bundles =
    (useLiveQuery(() => database.bundles.toArray(), [database]) as
      | Bundle[]
      | undefined) ?? [];
  const eventInventories =
    (useLiveQuery(() => database.eventInventories.toArray(), [database]) as
      | EventInventory[]
      | undefined) ?? [];
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;
  const effectiveSelectedEventId = selectedEvent?.id ?? null;

  useEffect(() => {
    if (selectedEventId !== effectiveSelectedEventId) {
      setSelectedEventId(effectiveSelectedEventId);
    }
  }, [effectiveSelectedEventId, selectedEventId]);

  async function handleNavigate(nextScreen: AppScreen) {
    if (nextScreen === "checkout") {
      if (effectiveSelectedEventId === null) {
        setManagementNotice("イベントを登録すると会計を開始できます。");
        setScreen("management");
        return;
      }

      const selectedEventInventoryCount = await database.eventInventories
        .where("eventId")
        .equals(effectiveSelectedEventId)
        .count();
      if (selectedEventInventoryCount === 0) {
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
          inventories={eventInventories}
          selectedEventId={effectiveSelectedEventId}
          onEventChange={setSelectedEventId}
          onNavigate={handleNavigate}
        />
      )}
      {screen === "checkout" && effectiveSelectedEventId !== null && (
        <CheckoutPage database={database} eventId={effectiveSelectedEventId} />
      )}
      {screen === "stats" && effectiveSelectedEventId !== null && (
        <StatisticsPage database={database} eventId={effectiveSelectedEventId} />
      )}
      {screen === "management" && (
        <ManagementPage database={database} notice={managementNotice} />
      )}
      {screen === "settings" && effectiveSelectedEventId !== null && (
        <SettingsPage database={database} eventId={effectiveSelectedEventId} />
      )}
    </AppShell>
  );
}

export default App;
