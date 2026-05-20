import { useState } from "react";
import { AppShell, type AppScreen } from "./components/AppShell";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { ManagementPage } from "./pages/ManagementPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatisticsPage } from "./pages/StatisticsPage";

function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const selectedEventId = "event-1";

  return (
    <AppShell current={screen} onNavigate={setScreen}>
      {screen === "home" && <HomePage onNavigate={setScreen} />}
      {screen === "checkout" && <CheckoutPage eventId={selectedEventId} />}
      {screen === "stats" && <StatisticsPage />}
      {screen === "management" && <ManagementPage />}
      {screen === "settings" && <SettingsPage />}
    </AppShell>
  );
}

export default App;
