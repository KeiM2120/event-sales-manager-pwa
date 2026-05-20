import type { ReactNode } from "react";

export type AppScreen = "home" | "checkout" | "stats" | "management" | "settings";

interface AppShellProps {
  current: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  children: ReactNode;
}

const navigationItems: Array<{ screen: AppScreen; label: string }> = [
  { screen: "home", label: "ホーム" },
  { screen: "checkout", label: "会計" },
  { screen: "stats", label: "統計" },
  { screen: "management", label: "管理" },
  { screen: "settings", label: "設定" },
];

export function AppShell({ current, onNavigate, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-100 pb-20 text-slate-950">
      <main className="mx-auto min-h-screen w-full max-w-3xl p-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 p-2">
          {navigationItems.map((item) => (
            <button
              key={item.screen}
              type="button"
              aria-current={current === item.screen ? "page" : undefined}
              onClick={() => onNavigate(item.screen)}
              className={
                current === item.screen
                  ? "min-h-14 rounded-md bg-slate-900 px-2 text-sm font-bold text-white"
                  : "min-h-14 rounded-md px-2 text-sm font-semibold text-slate-700"
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
