import type { AppScreen } from "../components/AppShell";
import { buildSetupStatus } from "../domain/setupStatus";
import type { Bundle, Event, EventInventory, Product } from "../domain/types";

interface HomePageProps {
  events?: Event[];
  products?: Product[];
  bundles?: Bundle[];
  inventories?: EventInventory[];
  selectedEventId?: string | null;
  onEventChange?: (eventId: string) => void;
  onNavigate: (screen: AppScreen) => void;
}

const quickActions: Array<{ label: string; screen: AppScreen; body: string }> = [
  { label: "会計へ", screen: "checkout", body: "頒布中の会計をすぐ始める" },
  { label: "統計へ", screen: "stats", body: "売上と頒布数を確認する" },
  { label: "管理へ", screen: "management", body: "商品・在庫・イベントを編集する" },
];

const statusStyles = {
  complete: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  missing: "bg-rose-50 text-rose-700 ring-rose-200",
} as const;

export function HomePage({
  events = [],
  products = [],
  bundles = [],
  inventories = [],
  selectedEventId = null,
  onEventChange = () => undefined,
  onNavigate,
}: HomePageProps) {
  const setupStatus = buildSetupStatus({
    events,
    products,
    bundles,
    inventories,
    selectedEventId,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ホーム</h1>

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold">選択中イベント</h2>
          {setupStatus.selectedEvent ? (
            <p className="mt-1 text-sm text-slate-600">
              {setupStatus.selectedEvent.name} / {setupStatus.selectedEvent.eventDate}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-600">イベントを登録してください。</p>
          )}
        </div>

        {events.length > 0 ? (
          <label className="block text-sm font-bold text-slate-700">
            イベントを選択
            <select
              className="mt-2 min-h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base"
              value={setupStatus.selectedEvent?.id ?? ""}
              onChange={(event) => onEventChange(event.target.value)}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">セットアップ状態</h2>
        <div className="grid gap-2">
          {setupStatus.rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onNavigate("management")}
              className="min-h-16 rounded-md border border-slate-200 p-3 text-left"
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-bold">{row.label}</span>
                  <span className="mt-1 block text-sm text-slate-600">{row.detail}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {row.count !== undefined ? (
                    <span className="text-sm font-bold text-slate-700">{row.count}件</span>
                  ) : null}
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold ring-1 ${
                      statusStyles[row.state]
                    }`}
                  >
                    {row.required ? "必須" : "任意"}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

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
