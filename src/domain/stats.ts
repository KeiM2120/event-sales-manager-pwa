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
      Array.from(sumByGenre(activeSales).entries()).map(
        ([productGenre, quantity]) => ({ productGenre, quantity }),
      ),
    ),
    productRanking: sortByQuantityDesc(
      Array.from(sumByProduct(activeSales).values()),
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

function sumByGenre(sales: Sale[]): Map<ProductGenre, number> {
  const quantities = new Map<ProductGenre, number>();

  for (const sale of sales) {
    for (const line of sale.lines) {
      quantities.set(
        line.productGenre,
        (quantities.get(line.productGenre) ?? 0) + line.quantity,
      );
    }
  }

  return quantities;
}

function sumByProduct(sales: Sale[]): Map<string, ProductRankingRow> {
  const rows = new Map<string, ProductRankingRow>();

  for (const sale of sales) {
    for (const line of sale.lines) {
      const current = rows.get(line.refId);
      rows.set(line.refId, {
        productId: line.refId,
        displayName: current?.displayName ?? line.displayName,
        quantity: (current?.quantity ?? 0) + line.quantity,
      });
    }
  }

  return rows;
}

function sortByQuantityDesc<T extends { quantity: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.quantity - a.quantity);
}
