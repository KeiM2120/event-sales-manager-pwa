import type { AppScreen } from "../components/AppShell";
import {
  HeroEventCard,
  InlineActionButton,
  PrimaryActionBar,
  ScreenTitle,
  StatusChip,
  SurfaceCard,
} from "../components/DesignSystem";
import { buildSetupStatus } from "../domain/setupStatus";
import type { SetupStatusRowId, SetupStatusState } from "../domain/setupStatus";
import type { Bundle, Event, EventInventory, Product } from "../domain/types";
import type { ManagementSection } from "./ManagementPage";

interface HomeNavigateOptions {
  managementSection?: ManagementSection;
}

interface HomePageProps {
  events?: Event[];
  products?: Product[];
  bundles?: Bundle[];
  inventories?: EventInventory[];
  selectedEventId?: string | null;
  onEventChange?: (eventId: string) => void;
  onNavigate: (screen: AppScreen, options?: HomeNavigateOptions) => void;
}

const setupManagementSections = {
  events: "events",
  products: "products",
  bundles: "bundles",
  inventory: "inventory",
} as const satisfies Record<SetupStatusRowId, ManagementSection>;

const statusTones = {
  complete: "ok",
  warning: "warn",
  missing: "error",
} as const satisfies Record<SetupStatusState, "ok" | "warn" | "error">;

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
  const selectedEvent = setupStatus.selectedEvent;

  return (
    <div className="space-y-4 pb-24">
      <ScreenTitle>ホーム</ScreenTitle>

      <SurfaceCard ariaLabel="選択中イベント" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[color:var(--color-text)]">選択中イベント</h2>
          {selectedEvent?.isClosed ? <StatusChip tone="muted">閉会済み</StatusChip> : null}
        </div>

        {selectedEvent ? (
          <HeroEventCard eventName={selectedEvent.name} circleSpace={selectedEvent.circleSpace}>
            <div className="flex flex-wrap gap-2">
              <StatusChip tone="sub">{selectedEvent.eventDate}</StatusChip>
              {selectedEvent.isClosed ? <StatusChip tone="muted">閉会済み</StatusChip> : null}
            </div>
          </HeroEventCard>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-medium text-[color:var(--color-muted)]">
            イベントを登録してください。
          </div>
        )}

        {events.length > 0 ? (
          <label className="block text-sm font-bold text-[color:var(--color-text)]">
            イベントを選択
            <select
              aria-label="イベントを選択"
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
              value={selectedEvent?.id ?? ""}
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
      </SurfaceCard>

      <SurfaceCard ariaLabel="セットアップ状況" className="space-y-3">
        <h2 className="text-base font-bold text-[color:var(--color-text)]">セットアップ状況</h2>
        <div className="grid gap-2">
          {setupStatus.rows.map((row) => (
            <button
              key={row.id}
              type="button"
              aria-label={`${row.label}の管理タブへ`}
              onClick={() =>
                onNavigate("management", {
                  managementSection: setupManagementSections[row.id],
                })
              }
              className="min-h-16 rounded-lg border border-slate-200 bg-white p-3 text-left active:bg-slate-50"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-base font-bold text-[color:var(--color-text)]">
                    {row.label}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-[color:var(--color-muted)]">
                    {row.detail}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {row.count !== undefined ? (
                    <span className="text-sm font-bold text-[color:var(--color-text)]">
                      {row.count}件
                    </span>
                  ) : null}
                  <StatusChip tone={statusTones[row.state]}>
                    {row.required ? "必須" : "任意"}
                  </StatusChip>
                </span>
              </span>
            </button>
          ))}
        </div>
      </SurfaceCard>

      <PrimaryActionBar>
        <InlineActionButton
          tone="main"
          onClick={() => onNavigate("checkout")}
          disabled={!setupStatus.checkoutReady}
        >
          会計へ進む
        </InlineActionButton>
      </PrimaryActionBar>
    </div>
  );
}
