import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppShell, type AppScreen } from "./components/AppShell";
import { db as appDatabase, type EventSalesDatabase } from "./db/database";
import type { Bundle, Event, EventInventory, Product } from "./domain/types";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import {
  ManagementPage,
  type ManagementSection,
} from "./pages/ManagementPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatisticsPage } from "./pages/StatisticsPage";

interface AppProps {
  database?: EventSalesDatabase;
}

interface NavigateOptions {
  managementSection?: ManagementSection;
}

function App({ database = appDatabase }: AppProps) {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [managementSection, setManagementSection] =
    useState<ManagementSection>("products");
  const [managementNotice, setManagementNotice] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const navigationRequestId = useRef(0);
  const eventRecords =
    (useLiveQuery(() => database.events.toArray(), [database]) as
      | Event[]
      | undefined) ?? [];
  const events = eventRecords.filter((event) => !event.isHidden);
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

  async function handleNavigate(nextScreen: AppScreen, options?: NavigateOptions) {
    const requestId = navigationRequestId.current + 1;
    navigationRequestId.current = requestId;

    if (nextScreen === "management" && options?.managementSection) {
      setManagementSection(options.managementSection);
    }

    if (nextScreen === "checkout") {
      if (effectiveSelectedEventId === null) {
        setManagementSection("events");
        setManagementNotice("イベントを登録すると会計を開始できます。");
        setScreen("management");
        return;
      }

      const selectedEventInventoryCount = await database.eventInventories
        .where("eventId")
        .equals(effectiveSelectedEventId)
        .count();
      if (requestId !== navigationRequestId.current) {
        return;
      }

      if (selectedEventInventoryCount === 0) {
        setManagementSection("inventory");
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
        <ManagementPage
          database={database}
          initialSection={managementSection}
          notice={managementNotice}
        />
      )}
      {screen === "settings" && (
        <SettingsPage database={database} eventId={effectiveSelectedEventId ?? undefined} />
      )}
    </AppShell>
  );
}

export default App;
