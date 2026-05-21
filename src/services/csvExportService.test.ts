import { describe, expect, it, vi } from "vitest";
import {
  downloadCsv,
  downloadExpensesCsv,
  downloadProductMovementCsv,
  downloadSalesDetailCsv,
  downloadSalesSummaryCsv,
} from "./csvExportService";
import { makeExpense, makeSale } from "../test/fixtures";

describe("csvExportService", () => {
  it("downloads CSV text with a UTF-8 BOM and cleans up the object URL", async () => {
    const click = vi.fn();
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const anchor = {
      click,
      download: "",
      href: "",
    } as unknown as HTMLAnchorElement;
    const documentLike = {
      body: {
        appendChild,
        removeChild,
      },
      createElement: vi.fn(() => anchor),
    } as unknown as Document;
    const urlLike = {
      createObjectURL: vi.fn(() => "blob:csv"),
      revokeObjectURL: vi.fn(),
    } as unknown as typeof URL;

    downloadCsv("sales.csv", "a,b", {
      document: documentLike,
      url: urlLike,
    });

    expect(urlLike.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const blob = vi.mocked(urlLike.createObjectURL).mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe("text/csv;charset=utf-8");
    await expect(readBlobBytes(blob)).resolves.toEqual([
      0xef,
      0xbb,
      0xbf,
      0x61,
      0x2c,
      0x62,
    ]);
    expect(anchor.download).toBe("sales.csv");
    expect(anchor.href).toBe("blob:csv");
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledOnce();
    expect(removeChild).toHaveBeenCalledWith(anchor);
    expect(urlLike.revokeObjectURL).toHaveBeenCalledWith("blob:csv");
  });

  it("wraps each CSV domain exporter with a download filename", () => {
    const downloaded: Array<{ filename: string; csv: string }> = [];
    const downloader = (filename: string, csv: string) => {
      downloaded.push({ filename, csv });
    };
    const sales = [makeSale({ totalAmount: 1000 })];
    const expenses = [makeExpense({ amount: 300 })];

    downloadSalesSummaryCsv(sales, { filename: "summary.csv", downloader });
    downloadSalesDetailCsv(sales, { filename: "detail.csv", downloader });
    downloadProductMovementCsv(sales, {
      filename: "movement.csv",
      downloader,
    });
    downloadExpensesCsv(expenses, { filename: "expenses.csv", downloader });

    expect(downloaded.map((item) => item.filename)).toEqual([
      "summary.csv",
      "detail.csv",
      "movement.csv",
      "expenses.csv",
    ]);
    expect(downloaded[0]?.csv).toContain(
      "saleId,eventId,datetime,totalAmount,totalQuantity,canceled,lineCount",
    );
    expect(downloaded[1]?.csv).toContain(
      "saleId,datetime,lineId,kind,refId,displayName,productGenre,unitPrice,quantity,subtotal,canceled,componentProductIds,componentQuantities",
    );
    expect(downloaded[2]?.csv).toContain(
      "saleId,datetime,lineId,sourceKind",
    );
    expect(downloaded[3]?.csv).toContain("expenseId,eventId,category");
  });
});

function readBlobBytes(blob: Blob): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)));
    });
    reader.addEventListener("error", () => {
      reject(reader.error);
    });
    reader.readAsArrayBuffer(blob);
  });
}
