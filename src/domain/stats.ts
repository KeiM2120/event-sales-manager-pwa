import { buildProductMovementRows } from "./inventory";
import type {
  Expense,
  ExpenseCategory,
  ProductGenre,
  Sale,
  SaleLineKind,
} from "./types";

export interface EventStatsInput {
  eventId: string;
  sales: Sale[];
  expenses: Expense[];
}

export interface EventStatsSummary {
  totalSales: number;
  totalQuantity: number;
  customerCount: number;
  averageUnitPrice: number;
  totalExpenses: number;
  profit: number;
}

export interface GenreQuantity {
  productGenre: ProductGenre;
  quantity: number;
}

export interface ProductRankingRow {
  itemKey: string;
  displayName: string;
  kind: SaleLineKind;
  quantity: number;
}

export interface SalesHistoryRow {
  saleId: string;
  datetime: string;
  lineSummary: string;
  totalAmount: number;
  quantity: number;
  canceled: boolean;
}

export interface ExpenseBreakdownRow {
  category: ExpenseCategory;
  count: number;
  amount: number;
}

export interface EventStats {
  summary: EventStatsSummary;
  genreQuantities: GenreQuantity[];
  productRanking: ProductRankingRow[];
  salesHistory: SalesHistoryRow[];
  expenseBreakdown: ExpenseBreakdownRow[];
}

export function calculateEventStats(input: EventStatsInput): EventStats {
  const eventSales = input.sales.filter((sale) => sale.eventId === input.eventId);
  const activeSales = eventSales.filter((sale) => !sale.canceled);
  const expenses = input.expenses.filter(
    (expense) => expense.eventId === input.eventId,
  );
  const totalSales = activeSales.reduce(
    (total, sale) => total + sale.totalAmount,
    0,
  );
  const totalQuantity = activeSales.reduce(
    (total, sale) =>
      total +
      sale.lines.reduce((lineTotal, line) => lineTotal + line.quantity, 0),
    0,
  );
  const totalExpenses = expenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );
  const movementRows = buildProductMovementRows(activeSales).filter(
    (row) => !row.canceled,
  );

  return {
    summary: {
      totalSales,
      totalQuantity,
      customerCount: activeSales.length,
      averageUnitPrice:
        totalQuantity === 0 ? 0 : Math.round(totalSales / totalQuantity),
      totalExpenses,
      profit: totalSales - totalExpenses,
    },
    genreQuantities: sortByQuantityDesc(
      Array.from(sumByGenre(movementRows).entries()).map(
        ([productGenre, quantity]) => ({ productGenre, quantity }),
      ),
    ),
    productRanking: sortByQuantityDesc(
      Array.from(sumBySaleLine(activeSales).values()),
    ).slice(0, 5),
    salesHistory: eventSales
      .map((sale) => ({
        saleId: sale.id,
        datetime: sale.datetime,
        lineSummary: summarizeSaleLines(sale),
        totalAmount: sale.totalAmount,
        quantity: sumSaleLineQuantity(sale),
        canceled: sale.canceled,
      }))
      .sort((a, b) => b.datetime.localeCompare(a.datetime)),
    expenseBreakdown: sortByAmountDesc(
      Array.from(sumByExpenseCategory(expenses).values()),
    ),
  };
}

function sumByGenre(
  movementRows: ReturnType<typeof buildProductMovementRows>,
): Map<ProductGenre, number> {
  const quantities = new Map<ProductGenre, number>();

  for (const row of movementRows) {
    quantities.set(
      row.productGenre,
      (quantities.get(row.productGenre) ?? 0) + row.totalProductQuantity,
    );
  }

  return quantities;
}

function sumBySaleLine(sales: Sale[]): Map<string, ProductRankingRow> {
  const rows = new Map<string, ProductRankingRow>();

  for (const sale of sales) {
    for (const line of sale.lines) {
      const itemKey = `${line.kind}:${line.refId}`;
      const current = rows.get(itemKey);
      rows.set(itemKey, {
        itemKey,
        displayName: current?.displayName ?? line.displayName,
        kind: line.kind,
        quantity: (current?.quantity ?? 0) + line.quantity,
      });
    }
  }

  return rows;
}

function sumByExpenseCategory(
  expenses: Expense[],
): Map<ExpenseCategory, ExpenseBreakdownRow> {
  const rows = new Map<ExpenseCategory, ExpenseBreakdownRow>();

  for (const expense of expenses) {
    const current = rows.get(expense.category);
    rows.set(expense.category, {
      category: expense.category,
      count: (current?.count ?? 0) + 1,
      amount: (current?.amount ?? 0) + expense.amount,
    });
  }

  return rows;
}

function sumSaleLineQuantity(sale: Sale): number {
  return sale.lines.reduce((total, line) => total + line.quantity, 0);
}

function summarizeSaleLines(sale: Sale): string {
  return sale.lines
    .map((line) => `${line.displayName} ${line.quantity.toLocaleString("ja-JP")}点`)
    .join(" / ");
}

function sortByQuantityDesc<T extends { quantity: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.quantity - a.quantity);
}

function sortByAmountDesc<T extends { amount: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.amount - a.amount);
}
