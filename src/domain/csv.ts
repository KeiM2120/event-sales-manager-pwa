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
  return buildCsv([
    [
      "saleId",
      "eventId",
      "datetime",
      "canceled",
      "totalAmount",
      "lineId",
      "kind",
      "refId",
      "displayName",
      "productGenre",
      "unitPrice",
      "quantity",
      "subtotal",
    ],
    ...sales.flatMap((sale) =>
      sale.lines.map((line) => [
        sale.id,
        sale.eventId,
        sale.datetime,
        sale.canceled,
        sale.totalAmount,
        line.lineId,
        line.kind,
        line.refId,
        line.displayName,
        line.productGenre,
        line.unitPrice,
        line.quantity,
        line.subtotal,
      ]),
    ),
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
