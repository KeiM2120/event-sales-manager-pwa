import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db as appDatabase, type EventSalesDatabase } from "../db/database";
import { calculateEventStats } from "../domain/stats";
import type { Expense, ExpenseCategory, ProductGenre, Sale } from "../domain/types";

interface StatisticsPageProps {
  database?: EventSalesDatabase;
  eventId?: string;
}

interface StatTileProps {
  label: string;
  value: string;
  valueClassName?: string;
}

const emptyStats = calculateEventStats({
  eventId: "event-1",
  expenses: [],
  sales: [],
});

const genreLabels: Record<ProductGenre, string> = {
  "doujinshi-illustration": "同人誌/イラスト",
  "doujinshi-manga": "同人誌/マンガ",
  "doujinshi-anthology": "同人誌/合同",
  "doujinshi-other": "同人誌/その他",
  "goods-acrylic": "グッズ/アクリル",
  "goods-paper": "グッズ/紙",
  "goods-sticker": "グッズ/ステッカー",
  "goods-fabric": "グッズ/布",
  "goods-other": "グッズ/その他",
  digital: "デジタル頒布物",
  other: "その他",
  book: "本",
  goods: "グッズ",
  music: "音楽",
  software: "ソフト",
};

const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  "goods-production": "グッズ作成費",
  "event-participation": "イベント参加費",
  lodging: "宿泊・滞在費",
  shipping: "搬出入費",
  "booth-supply": "ブース用備品",
  food: "飲食費",
  promotion: "宣伝・販売費",
  outsourcing: "外注費",
  printing: "印刷費",
  transport: "交通費",
  space: "参加費",
  supply: "備品費",
  other: "その他費",
};

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
  const profitClassName =
    stats.summary.profit < 0 ? "text-red-700" : "text-[color:var(--color-ok)]";

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold leading-tight text-[color:var(--color-text)]">
          統計
        </h1>
      </header>

      <StatsSection title="客数・販売点数">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="客数" value={`${stats.summary.customerCount}人`} />
          <StatTile label="販売点数" value={`${stats.summary.totalQuantity}点`} />
        </div>
      </StatsSection>

      <StatsSection title="売上">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="総売上" value={formatYen(stats.summary.totalSales)} />
          <StatTile label="平均単価" value={formatYen(stats.summary.averageUnitPrice)} />
        </div>
      </StatsSection>

      <StatsSection title="利益・収支">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="経費" value={formatYen(stats.summary.totalExpenses)} />
          <StatTile
            label="利益"
            value={formatProfit(stats.summary.profit)}
            valueClassName={profitClassName}
          />
        </div>
      </StatsSection>

      <StatsSection title="頒布物ランキング">
        {stats.productRanking.length === 0 ? (
          <EmptyMessage>売上はまだありません。</EmptyMessage>
        ) : (
          <ul className="space-y-2">
            {stats.productRanking.map((row) => (
              <li
                key={row.itemKey}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-slate-100 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-medium">{row.displayName}</span>
                <span className="shrink-0 font-bold">{formatQuantity(row.quantity)}</span>
              </li>
            ))}
          </ul>
        )}
      </StatsSection>

      <StatsSection title="ジャンル別">
        {stats.genreQuantities.length === 0 ? (
          <EmptyMessage>売上はまだありません。</EmptyMessage>
        ) : (
          <ul className="space-y-2">
            {stats.genreQuantities.map((row) => (
              <li
                key={row.productGenre}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-slate-100 px-3 py-2 text-sm"
              >
                <span className="font-medium">{formatGenre(row.productGenre)}</span>
                <span className="font-bold">{formatQuantity(row.quantity)}</span>
              </li>
            ))}
          </ul>
        )}
      </StatsSection>

      <StatsSection title="売上履歴">
        {stats.salesHistory.length === 0 ? (
          <EmptyMessage>売上はまだありません。</EmptyMessage>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {stats.salesHistory.map((sale) => (
              <li
                key={sale.saleId}
                className={[
                  "grid min-h-14 gap-1 rounded-md px-3 py-2 text-sm",
                  sale.canceled
                    ? "bg-slate-100 text-slate-500"
                    : "bg-[color:var(--color-sub)]/25 text-[color:var(--color-text)]",
                ].join(" ")}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-bold">
                    {formatSaleDatetime(sale.datetime)}
                  </span>
                  {sale.canceled ? (
                    <span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600">
                      キャンセル
                    </span>
                  ) : null}
                </div>
                <span className="truncate">{sale.lineSummary}</span>
                <span className="text-[color:var(--color-muted)]">
                  {formatYen(sale.totalAmount)} / {formatQuantity(sale.quantity)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </StatsSection>

      <StatsSection title="収支内訳">
        <ul className="divide-y divide-slate-100">
          <ProfitLossRow label="売上" value={formatYen(stats.summary.totalSales)} />
          <ProfitLossRow label="経費" value={formatYen(stats.summary.totalExpenses)} />
          {stats.expenseBreakdown.map((row) => (
            <ProfitLossRow
              key={row.category}
              label={formatExpenseBreakdownLabel(row.category, row.count)}
              value={formatYen(row.amount)}
              tone="detail"
            />
          ))}
          {stats.expenseBreakdown.length === 0 ? (
            <li className="pl-3 py-1.5 text-sm font-medium text-[color:var(--color-muted)]">
              経費カテゴリはまだありません。
            </li>
          ) : null}
          <ProfitLossRow
            label="利益"
            value={formatProfit(stats.summary.profit)}
            valueClassName={profitClassName}
          />
        </ul>
      </StatsSection>
    </div>
  );
}

function StatsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-md border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-base font-bold text-[color:var(--color-text)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StatTile({ label, value, valueClassName }: StatTileProps) {
  return (
    <div className="rounded-md bg-slate-100 p-3">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p
        className={[
          "mt-1 text-2xl font-bold leading-tight",
          valueClassName ?? "text-[color:var(--color-text)]",
        ]
          .join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyMessage({ children }: { children: ReactNode }) {
  return <p className="text-sm font-medium text-slate-600">{children}</p>;
}

function ProfitLossRow({
  label,
  value,
  valueClassName,
  tone = "summary",
}: {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
  tone?: "summary" | "detail";
}) {
  const isDetail = tone === "detail";
  return (
    <li
      className={[
        "flex items-center justify-between gap-3 py-1.5",
        isDetail
          ? "min-h-7 pl-5 text-xs font-medium text-[color:var(--color-muted)]"
          : "min-h-8 text-sm font-bold text-[color:var(--color-text)]",
      ].join(" ")}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span
        className={[
          "shrink-0",
          isDetail ? "text-xs font-medium text-[color:var(--color-muted)]" : "",
          valueClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </span>
    </li>
  );
}

function formatYen(value: number): string {
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatProfit(value: number): string {
  return value < 0 ? `▲${formatYen(Math.abs(value))}` : formatYen(value);
}

function formatQuantity(value: number): string {
  return `${value.toLocaleString("ja-JP")}点`;
}

function formatSaleDatetime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatGenre(genre: ProductGenre): string {
  return genreLabels[genre];
}

function formatExpenseBreakdownLabel(
  category: ExpenseCategory,
  count: number,
): string {
  return `${expenseCategoryLabels[category]} / ${count.toLocaleString(
    "ja-JP",
  )}件`;
}
