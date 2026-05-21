import { buildProductMovementRows } from "./inventory";
import type { Expense, Sale } from "./types";

type CsvCell = string | number | boolean | undefined;

export function escapeCsvCell(value: CsvCell): string {
  const text = value === undefined ? "" : String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function buildCsv(rows: CsvCell[][]): string {
  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

export function buildSalesCsv(sales: Sale[]): string {
  return buildSalesDetailCsv(sales);
}

export function buildSalesDetailCsv(sales: Sale[]): string {
  return buildCsv([
    [
      "saleId",
      "datetime",
      "lineId",
      "kind",
      "refId",
      "displayName",
      "productGenre",
      "unitPrice",
      "quantity",
      "subtotal",
      "canceled",
      "componentProductIds",
      "componentQuantities",
    ],
    ...sales.flatMap((sale) =>
      sale.lines.map((line) => [
        sale.id,
        sale.datetime,
        line.lineId,
        line.kind,
        line.refId,
        line.displayName,
        line.productGenre,
        line.unitPrice,
        line.quantity,
        line.subtotal,
        sale.canceled,
        line.components?.map((component) => component.productId).join("|"),
        line.components?.map((component) => component.quantity).join("|"),
      ]),
    ),
  ]);
}

export function buildSalesSummaryCsv(sales: Sale[]): string {
  return buildCsv([
    [
      "saleId",
      "eventId",
      "datetime",
      "totalAmount",
      "totalQuantity",
      "canceled",
      "lineCount",
    ],
    ...sales.map((sale) => [
      sale.id,
      sale.eventId,
      sale.datetime,
      sale.totalAmount,
      sale.lines.reduce((total, line) => total + line.quantity, 0),
      sale.canceled,
      sale.lines.length,
    ]),
  ]);
}

export function buildProductMovementCsv(sales: Sale[]): string {
  return buildCsv([
    [
      "saleId",
      "datetime",
      "lineId",
      "sourceKind",
      "sourceRefId",
      "sourceDisplayName",
      "productId",
      "productName",
      "productGenre",
      "unitQuantity",
      "lineQuantity",
      "totalProductQuantity",
      "canceled",
    ],
    ...buildProductMovementRows(sales).map((row) => [
      row.saleId,
      row.datetime,
      row.lineId,
      row.sourceKind,
      row.sourceRefId,
      row.sourceDisplayName,
      row.productId,
      row.productName,
      row.productGenre,
      row.unitQuantity,
      row.lineQuantity,
      row.totalProductQuantity,
      row.canceled,
    ]),
  ]);
}

export function buildExpensesCsv(expenses: Expense[]): string {
  return buildCsv([
    ["expenseId", "eventId", "category", "payee", "amount", "memo"],
    ...expenses.map((expense) => [
      expense.id,
      expense.eventId,
      expense.category,
      expense.payee,
      expense.amount,
      expense.memo,
    ]),
  ]);
}
