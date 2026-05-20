import { useState } from "react";
import { AppShell, type AppScreen } from "./components/AppShell";

const screenTitles: Record<AppScreen, string> = {
  home: "ホーム",
  checkout: "会計",
  stats: "統計",
  management: "管理",
  settings: "設定",
};

function App() {
  const [screen, setScreen] = useState<AppScreen>("home");

  return (
    <AppShell current={screen} onNavigate={setScreen}>
      <h1 className="text-2xl font-bold">{screenTitles[screen]}</h1>
    </AppShell>
  );
}

export default App;
