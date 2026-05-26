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
    <div className="min-h-screen bg-[color:var(--color-page)] pt-24 text-[color:var(--color-text)]">
      <main className="mx-auto min-h-screen w-full max-w-3xl p-4">{children}</main>
      <nav
        aria-label="画面切り替え"
        className="fixed inset-x-0 top-0 z-10 bg-[color:var(--color-page)] px-3 pb-3 pt-4"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 rounded-full bg-white p-1 shadow-[var(--shadow-card)]">
          {navigationItems.map((item) => {
            const isSelected = current === item.screen;

            return (
              <button
                key={item.screen}
                type="button"
                aria-current={isSelected ? "page" : undefined}
                onClick={() => onNavigate(item.screen)}
                className={
                  isSelected
                    ? "min-h-12 rounded-full bg-[color:var(--color-main)] px-2 text-sm font-bold text-white"
                    : "min-h-12 rounded-full px-2 text-sm font-bold text-[color:var(--color-muted)] active:bg-slate-50"
                }
              >
                <span className="truncate-one-line block">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
