import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db as appDatabase, type EventSalesDatabase } from "../db/database";
import type { Event, Expense, Sale } from "../domain/types";
import { usePwaUpdate } from "../hooks/usePwaUpdate";
import {
  downloadExpensesCsv,
  downloadProductMovementCsv,
  downloadSalesDetailCsv,
  downloadSalesSummaryCsv,
  type CsvExportOptions,
} from "../services/csvExportService";
import { resetSelectedEventOperationalData } from "../services/eventResetService";

interface SettingsPageProps {
  database?: EventSalesDatabase;
  downloader?: CsvExportOptions["downloader"];
  eventId?: string;
  resetOperationalData?: (
    database: EventSalesDatabase,
    eventId: string,
  ) => Promise<unknown>;
}

export function SettingsPage({
  database = appDatabase,
  downloader,
  eventId = "event-1",
  resetOperationalData = resetSelectedEventOperationalData,
}: SettingsPageProps) {
  const pwa = usePwaUpdate();
  const [resetConfirmation, setResetConfirmation] = useState("");
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
  const selectedEvent = events.find((event) => event.id === eventId);
  const eventSales = sales.filter((sale) => sale.eventId === eventId);
  const eventExpenses = expenses.filter((expense) => expense.eventId === eventId);
  const canResetSelectedEvent =
    selectedEvent !== undefined &&
    resetConfirmation === selectedEvent.name &&
    !resetPending;
  const csvButtons = [
    {
      label: "売上サマリーCSV",
      onClick: () => {
        if (!csvLoaded) {
          return;
        }
        downloadSalesSummaryCsv(eventSales, {
          downloader,
          filename: `sales-summary-${eventId}.csv`,
        });
      },
    },
    {
      label: "売上明細CSV",
      onClick: () => {
        if (!csvLoaded) {
          return;
        }
        downloadSalesDetailCsv(eventSales, {
          downloader,
          filename: `sales-detail-${eventId}.csv`,
        });
      },
    },
    {
      label: "商品別展開CSV",
      onClick: () => {
        if (!csvLoaded) {
          return;
        }
        downloadProductMovementCsv(eventSales, {
          downloader,
          filename: `product-movement-${eventId}.csv`,
        });
      },
    },
    {
      label: "経費CSV",
      onClick: () => {
        if (!csvLoaded) {
          return;
        }
        downloadExpensesCsv(eventExpenses, {
          downloader,
          filename: `expenses-${eventId}.csv`,
        });
      },
    },
  ];

  async function handleResetSelectedEvent() {
    if (!selectedEvent || !canResetSelectedEvent || resetPending) {
      return;
    }

    setResetPending(true);
    setResetMessage(null);
    try {
      await resetOperationalData(database, selectedEvent.id);
      setResetConfirmation("");
      setResetMessage({
        kind: "success",
        text: "選択中イベントの運用データを初期化しました。",
      });
    } catch {
      setResetMessage({
        kind: "error",
        text: "選択中イベントの運用データを初期化できませんでした。もう一度お試しください。",
      });
    } finally {
      setResetPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">設定</h1>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">CSV出力</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {csvButtons.map((item) => (
            <button
              key={item.label}
              type="button"
              className="rounded-md border px-3 py-3 font-semibold disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              disabled={!csvLoaded}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">PWA更新</h2>
        <p className="mt-1 text-sm text-slate-600">
          {pwa.offlineReady
            ? "オフラインで利用できます。"
            : "更新がある場合はここに表示します。"}
        </p>
        {pwa.needRefresh && (
          <button
            type="button"
            className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-white"
            onClick={pwa.update}
          >
            更新する
          </button>
        )}
      </section>
      <section className="rounded-md border border-red-200 bg-white p-4">
        <h2 className="font-bold text-red-700">危険操作</h2>
        <p className="mt-1 text-sm text-slate-600">
          選択中イベントの在庫、売上、経費を削除します。この操作は元に戻せません。
        </p>
        <p className="mt-3 text-sm font-semibold">
          対象: {selectedEvent ? selectedEvent.name : "イベント未選択"}
        </p>
        <label className="mt-3 block text-sm font-semibold">
          確認のためイベント名を入力
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-3 text-base"
            value={resetConfirmation}
            onChange={(event) => {
              setResetConfirmation(event.target.value);
              setResetMessage(null);
            }}
          />
        </label>
        <button
          type="button"
          className="mt-3 rounded-md bg-red-700 px-3 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          disabled={!canResetSelectedEvent}
          onClick={handleResetSelectedEvent}
        >
          選択中イベントの運用データを初期化
        </button>
        {resetMessage && (
          <p
            className={`mt-3 text-sm font-semibold ${
              resetMessage.kind === "success" ? "text-green-700" : "text-red-700"
            }`}
            role="status"
          >
            {resetMessage.text}
          </p>
        )}
      </section>
    </div>
  );
}
