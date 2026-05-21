import { useLiveQuery } from "dexie-react-hooks";
import { db as appDatabase, type EventSalesDatabase } from "../db/database";
import { calculateEventStats } from "../domain/stats";
import type { Expense, ProductGenre, Sale } from "../domain/types";

interface StatisticsPageProps {
  database?: EventSalesDatabase;
  eventId?: string;
}

const emptyStats = calculateEventStats({
  eventId: "event-1",
  expenses: [],
  sales: [],
});

export function StatisticsPage({
  database = appDatabase,
  eventId = "event-1",
}: StatisticsPageProps) {
  const sales =
    (useLiveQuery(() => database.sales.toArray(), [database]) as Sale[] | undefined) ??
    [];
  const expenses =
    (useLiveQuery(() => database.expenses.toArray(), [database]) as
      | Expense[]
      | undefined) ?? [];
  const stats =
    sales.length > 0 || expenses.length > 0
      ? calculateEventStats({ eventId, sales, expenses })
      : emptyStats;
  const summary = [
    ["総売上", formatYen(stats.summary.totalSales)],
    ["頒布数", String(stats.summary.totalQuantity)],
    ["平均単価", formatYen(stats.summary.averageUnitPrice)],
    ["経費", formatYen(stats.summary.totalExpenses)],
    ["利益", formatYen(stats.summary.profit)],
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">統計</h1>
      <div className="grid grid-cols-2 gap-3">
        {summary.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">商品ランキング</h2>
        {stats.productRanking.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">売上はまだありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stats.productRanking.map((row) => (
              <li
                key={row.productId}
                className="flex items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-sm"
              >
                <span>{row.displayName}</span>
                <span className="font-bold">{row.quantity}点</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">ジャンル別頒布数</h2>
        {stats.genreQuantities.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">売上はまだありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stats.genreQuantities.map((row) => (
              <li
                key={row.productGenre}
                className="flex items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-sm"
              >
                <span>{formatGenre(row.productGenre)}</span>
                <span className="font-bold">{row.quantity}点</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="font-bold">売上履歴</h2>
        {sales.filter((sale) => sale.eventId === eventId).length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">売上はまだありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sales
              .filter((sale) => sale.eventId === eventId)
              .sort((a, b) => a.datetime.localeCompare(b.datetime))
              .map((sale) => (
                <li
                  key={sale.id}
                  className="grid gap-1 rounded-md bg-slate-100 px-3 py-2 text-sm"
                >
                  <span className="font-bold">{sale.id}</span>
                  <span>
                    {formatYen(sale.totalAmount)} /{" "}
                    {sale.lines.reduce((total, line) => total + line.quantity, 0)}点
                  </span>
                  {sale.canceled && (
                    <span className="font-bold text-red-700">取消済み</span>
                  )}
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatYen(value: number): string {
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatGenre(genre: ProductGenre): string {
  return genre;
}
