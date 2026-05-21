import { buildProductMovementRows } from "./inventory";
import type { Expense, ProductGenre, Sale } from "./types";

export interface EventStatsInput {
  eventId: string;
  sales: Sale[];
  expenses: Expense[];
}

export interface EventStatsSummary {
  totalSales: number;
  totalQuantity: number;
  averageUnitPrice: number;
  totalExpenses: number;
  profit: number;
}

export interface GenreQuantity {
  productGenre: ProductGenre;
  quantity: number;
}

export interface ProductRankingRow {
  productId: string;
  displayName: string;
  quantity: number;
}

export interface SalesHistoryRow {
  saleId: string;
  datetime: string;
  totalAmount: number;
}

export interface EventStats {
  summary: EventStatsSummary;
  genreQuantities: GenreQuantity[];
  productRanking: ProductRankingRow[];
  salesHistory: SalesHistoryRow[];
}

export function calculateEventStats(input: EventStatsInput): EventStats {
  const activeSales = input.sales.filter(
    (sale) => sale.eventId === input.eventId && !sale.canceled,
  );
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
      Array.from(sumByProduct(movementRows).values()),
    ),
    salesHistory: activeSales
      .map((sale) => ({
        saleId: sale.id,
        datetime: sale.datetime,
        totalAmount: sale.totalAmount,
      }))
      .sort((a, b) => a.datetime.localeCompare(b.datetime)),
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

function sumByProduct(
  movementRows: ReturnType<typeof buildProductMovementRows>,
): Map<string, ProductRankingRow> {
  const rows = new Map<string, ProductRankingRow>();

  for (const row of movementRows) {
    const current = rows.get(row.productId);
    rows.set(row.productId, {
      productId: row.productId,
      displayName: current?.displayName ?? row.productName,
      quantity: (current?.quantity ?? 0) + row.totalProductQuantity,
    });
  }

  return rows;
}

function sortByQuantityDesc<T extends { quantity: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.quantity - a.quantity);
}
