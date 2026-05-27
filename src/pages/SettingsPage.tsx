import { useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db as appDatabase, type EventSalesDatabase } from "../db/database";
import { calculateEventStats } from "../domain/stats";
import type { Event, Expense, Sale } from "../domain/types";
import { usePwaUpdate } from "../hooks/usePwaUpdate";
import {
  downloadExpensesCsv,
  downloadProductMovementCsv,
  downloadProfitLossCsv,
  downloadSalesDetailCsv,
  downloadSalesSummaryCsv,
  type CsvExportOptions,
} from "../services/csvExportService";
import { resetSelectedEventOperationalData } from "../services/eventResetService";
import {
  InlineActionButton,
  ScreenTitle,
  StatusChip,
  SurfaceCard,
} from "../components/DesignSystem";

interface SettingsPageProps {
  database?: EventSalesDatabase;
  downloader?: CsvExportOptions["downloader"];
  eventId?: string;
  resetOperationalData?: (
    database: EventSalesDatabase,
    eventId: string,
  ) => Promise<unknown>;
}

interface CsvButton {
  label: string;
  description: string;
  onClick: () => void;
}

const appVersion = import.meta.env.VITE_APP_VERSION ?? "0.1.0";

export function SettingsPage({
  database = appDatabase,
  downloader,
  eventId,
  resetOperationalData = resetSelectedEventOperationalData,
}: SettingsPageProps) {
  const pwa = usePwaUpdate();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetMessage, setResetMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const eventsQuery = useLiveQuery(() => database.events.toArray(), [database]) as
    | Event[]
    | undefined;
  const salesQuery = useLiveQuery(() => database.sales.toArray(), [database]) as
    | Sale[]
    | undefined;
  const expensesQuery = useLiveQuery(() => database.expenses.toArray(), [
    database,
  ]) as Expense[] | undefined;
  const events = eventsQuery ?? [];
  const sales = salesQuery ?? [];
  const expenses = expensesQuery ?? [];
  const csvLoaded = salesQuery !== undefined && expensesQuery !== undefined;
  const selectedEvent =
    eventId === undefined ? undefined : events.find((event) => event.id === eventId);
  const selectedEventId = selectedEvent?.id;
  const eventTargetLabel = selectedEvent?.name ?? "イベント未選択";
  const eventSales =
    selectedEventId === undefined
      ? []
      : sales.filter((sale) => sale.eventId === selectedEventId);
  const eventExpenses =
    selectedEventId === undefined
      ? []
      : expenses.filter((expense) => expense.eventId === selectedEventId);
  const eventStats =
    selectedEventId === undefined
      ? calculateEventStats({ eventId: "", sales: [], expenses: [] })
      : calculateEventStats({ eventId: selectedEventId, sales, expenses });
  const hasSelectedEvent = selectedEventId !== undefined;
  const canUseEventExports = csvLoaded && hasSelectedEvent;
  const canResetSelectedEvent = hasSelectedEvent && !resetPending;
  const csvButtons: CsvButton[] = [
    {
      label: "売上サマリーCSV",
      description: "会計単位の合計金額と点数",
      onClick: () => {
        if (!canUseEventExports || !selectedEventId) {
          return;
        }
        downloadSalesSummaryCsv(eventSales, {
          downloader,
          filename: `sales-summary-${selectedEventId}.csv`,
        });
      },
    },
    {
      label: "売上詳細CSV",
      description: "明細行と頒布物スナップショット",
      onClick: () => {
        if (!canUseEventExports || !selectedEventId) {
          return;
        }
        downloadSalesDetailCsv(eventSales, {
          downloader,
          filename: `sales-detail-${selectedEventId}.csv`,
        });
      },
    },
    {
      label: "頒布物移動CSV",
      description: "セットを頒布物単位に展開",
      onClick: () => {
        if (!canUseEventExports || !selectedEventId) {
          return;
        }
        downloadProductMovementCsv(eventSales, {
          downloader,
          filename: `product-movement-${selectedEventId}.csv`,
        });
      },
    },
    {
      label: "経費CSV",
      description: "選択中イベントの経費一覧",
      onClick: () => {
        if (!canUseEventExports || !selectedEventId) {
          return;
        }
        downloadExpensesCsv(eventExpenses, {
          downloader,
          filename: `expenses-${selectedEventId}.csv`,
        });
      },
    },
    {
      label: "収支CSV",
      description: "売上・経費・利益と経費カテゴリ別集計",
      onClick: () => {
        if (!canUseEventExports || !selectedEventId) {
          return;
        }
        downloadProfitLossCsv(
          {
            totalSales: eventStats.summary.totalSales,
            totalExpenses: eventStats.summary.totalExpenses,
            profit: eventStats.summary.profit,
            expenseBreakdown: eventStats.expenseBreakdown,
          },
          {
            downloader,
            filename: `profit-loss-${selectedEventId}.csv`,
          },
        );
      },
    },
  ];

  async function handleResetSelectedEvent() {
    if (!selectedEvent || resetPending) {
      return;
    }

    setResetPending(true);
    setResetMessage(null);
    try {
      await resetOperationalData(database, selectedEvent.id);
      setResetConfirmOpen(false);
      setResetMessage({
        kind: "success",
        text: "選択中イベントの在庫・売上・経費をリセットしました。",
      });
    } catch {
      setResetMessage({
        kind: "error",
        text: "選択中イベントの在庫・売上・経費をリセットできませんでした。もう一度お試しください。",
      });
    } finally {
      setResetPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <ScreenTitle subtitle={eventTargetLabel}>設定</ScreenTitle>

      <SurfaceCard ariaLabel="アプリ状態" className="space-y-3">
        <h2 className="text-base font-bold text-[color:var(--color-text)]">
          アプリ状態
        </h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <AppStateRow label="オフライン">
            <StatusChip tone={pwa.offlineReady ? "ok" : "muted"}>
              {pwa.offlineReady ? "利用可能" : "準備中"}
            </StatusChip>
          </AppStateRow>
          <AppStateRow label="PWA更新">
            <StatusChip tone={pwa.needRefresh ? "warn" : "muted"}>
              {pwa.needRefresh ? "更新あり" : "最新"}
            </StatusChip>
          </AppStateRow>
          <AppStateRow label="バージョン">
            <StatusChip tone="muted">{appVersion}</StatusChip>
          </AppStateRow>
        </dl>
        {pwa.needRefresh ? (
          <InlineActionButton tone="main" onClick={pwa.update}>
            更新する
          </InlineActionButton>
        ) : null}
      </SurfaceCard>

      <SurfaceCard ariaLabel="CSV出力" className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-[color:var(--color-text)]">
            CSV出力
          </h2>
          <p className="mt-1 text-sm font-medium text-[color:var(--color-muted)]">
            対象: {eventTargetLabel}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {csvButtons.map((item) => (
            <button
              key={item.label}
              type="button"
              aria-label={item.label}
              className="min-h-20 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left shadow-sm active:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              disabled={!canUseEventExports}
              onClick={item.onClick}
            >
              <span className="block text-base font-bold">{item.label}</span>
              <span className="mt-1 block text-sm font-medium text-[color:var(--color-muted)]">
                {item.description}
              </span>
            </button>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard
        ariaLabel="危険操作"
        className="space-y-3 border border-[color:var(--color-error)] bg-red-50"
      >
        <h2 className="text-base font-bold text-[color:var(--color-error)]">
          危険操作
        </h2>
        <p className="text-sm font-medium text-[color:var(--color-text)]">
          選択中イベントの在庫・売上・経費をリセットします。実行前にCSV出力をおすすめしますが、必須ではありません。
        </p>
        <p className="text-sm font-bold text-[color:var(--color-text)]">
          対象: {eventTargetLabel}
        </p>

        {!resetConfirmOpen ? (
          <InlineActionButton
            tone="danger"
            disabled={!canResetSelectedEvent}
            onClick={() => {
              setResetConfirmOpen(true);
              setResetMessage(null);
            }}
          >
            リセット確認へ
          </InlineActionButton>
        ) : (
          <div className="rounded-lg border border-red-200 bg-white p-3">
            <p className="text-sm font-bold text-[color:var(--color-text)]">
              {eventTargetLabel}
            </p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--color-error)]">
              リセット対象: 在庫・売上・経費
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">
              残るデータ: イベント・頒布物・セット
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <InlineActionButton
                tone="neutral"
                disabled={resetPending}
                onClick={() => setResetConfirmOpen(false)}
              >
                キャンセル
              </InlineActionButton>
              <InlineActionButton
                tone="danger"
                disabled={!canResetSelectedEvent}
                onClick={handleResetSelectedEvent}
              >
                リセットする
              </InlineActionButton>
            </div>
          </div>
        )}

        {resetMessage ? (
          <p
            className={`text-sm font-bold ${
              resetMessage.kind === "success" ? "text-green-700" : "text-red-700"
            }`}
            role="status"
          >
            {resetMessage.text}
          </p>
        ) : null}
      </SurfaceCard>
    </div>
  );
}

interface AppStateRowProps {
  label: string;
  children: ReactNode;
}

function AppStateRow({ label, children }: AppStateRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 sm:block">
      <dt className="text-sm font-bold text-[color:var(--color-muted)]">{label}</dt>
      <dd className="sm:mt-2">{children}</dd>
    </div>
  );
}
