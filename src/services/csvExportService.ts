import {
  buildExpensesCsv,
  buildProductMovementCsv,
  buildProfitLossCsv,
  buildSalesDetailCsv,
  buildSalesSummaryCsv,
  type ProfitLossCsvInput,
} from "../domain/csv";
import type { Expense, Sale } from "../domain/types";

export interface DownloadCsvDependencies {
  document?: Document;
  url?: typeof URL;
}

export interface CsvExportOptions {
  filename: string;
  downloader?: (filename: string, csv: string) => void;
}

export function downloadCsv(
  filename: string,
  csv: string,
  dependencies: DownloadCsvDependencies = {},
): void {
  const documentRef = dependencies.document ?? document;
  const urlRef = dependencies.url ?? URL;
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const objectUrl = urlRef.createObjectURL(blob);
  const anchor = documentRef.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  documentRef.body.appendChild(anchor);
  anchor.click();
  documentRef.body.removeChild(anchor);
  urlRef.revokeObjectURL(objectUrl);
}

export function downloadSalesSummaryCsv(
  sales: Sale[],
  options: CsvExportOptions,
): void {
  exportCsv(options, buildSalesSummaryCsv(sales));
}

export function downloadSalesDetailCsv(
  sales: Sale[],
  options: CsvExportOptions,
): void {
  exportCsv(options, buildSalesDetailCsv(sales));
}

export function downloadProductMovementCsv(
  sales: Sale[],
  options: CsvExportOptions,
): void {
  exportCsv(options, buildProductMovementCsv(sales));
}

export function downloadExpensesCsv(
  expenses: Expense[],
  options: CsvExportOptions,
): void {
  exportCsv(options, buildExpensesCsv(expenses));
}

export function downloadProfitLossCsv(
  input: ProfitLossCsvInput,
  options: CsvExportOptions,
): void {
  exportCsv(options, buildProfitLossCsv(input));
}

function exportCsv(options: CsvExportOptions, csv: string): void {
  const downloader = options.downloader ?? downloadCsv;
  downloader(options.filename, csv);
}
