import type { AppScreen } from "../components/AppShell";

interface HomePageProps {
  onNavigate: (screen: AppScreen) => void;
}

const quickActions: Array<{ label: string; screen: AppScreen; body: string }> = [
  { label: "会計へ", screen: "checkout", body: "頒布中の会計をすぐ始める" },
  { label: "統計へ", screen: "stats", body: "売上と頒布数を確認する" },
  { label: "管理へ", screen: "management", body: "商品・在庫・イベントを編集する" },
];

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ホーム</h1>
      <div className="grid gap-3">
        {quickActions.map((action) => (
          <button
            key={action.screen}
            type="button"
            aria-label={action.label}
            onClick={() => onNavigate(action.screen)}
            className="min-h-20 rounded-md bg-white p-4 text-left shadow-sm ring-1 ring-slate-200"
          >
            <span className="block text-lg font-bold">{action.label}</span>
            <span className="mt-1 block text-sm text-slate-600">{action.body}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
