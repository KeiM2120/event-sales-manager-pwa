import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventSalesDatabase } from "../db/database";
import { SettingsPage } from "./SettingsPage";

describe("SettingsPage", () => {
  let database: EventSalesDatabase;

  beforeEach(() => {
    database = new EventSalesDatabase(`settings-page-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    cleanup();
    await database.delete();
    database.close();
  });

  it("shows CSV and PWA controls", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "設定" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "売上サマリーCSV" })).toBeInTheDocument();
    expect(screen.getByText("PWA更新")).toBeInTheDocument();
  });

  it("exports the four MVP CSV files from saved data", async () => {
    const downloader = vi.fn();
    await database.sales.put({
      id: "sale-1",
      eventId: "event-1",
      datetime: "2026-08-16T10:00:00+09:00",
      totalAmount: 1000,
      canceled: false,
      lines: [
        {
          lineId: "product:book",
          kind: "product",
          refId: "book",
          displayName: "新刊",
          productGenre: "book",
          unitPrice: 1000,
          quantity: 1,
          subtotal: 1000,
        },
      ],
    });
    await database.expenses.put({
      id: "expense-1",
      eventId: "event-1",
      category: "printing",
      payee: "印刷所",
      amount: 500,
    });

    render(
      <SettingsPage database={database} eventId="event-1" downloader={downloader} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "売上サマリーCSV" }));
    await userEvent.click(screen.getByRole("button", { name: "売上明細CSV" }));
    await userEvent.click(screen.getByRole("button", { name: "商品別展開CSV" }));
    await userEvent.click(screen.getByRole("button", { name: "経費CSV" }));

    expect(downloader).toHaveBeenCalledTimes(4);
    expect(downloader.mock.calls.map((call) => call[0])).toEqual([
      "sales-summary-event-1.csv",
      "sales-detail-event-1.csv",
      "product-movement-event-1.csv",
      "expenses-event-1.csv",
    ]);
    expect(downloader.mock.calls[0]?.[1]).toContain(
      "saleId,eventId,datetime,totalAmount,totalQuantity,canceled,lineCount",
    );
    expect(downloader.mock.calls[2]?.[1]).toContain(
      "saleId,datetime,lineId,sourceKind",
    );
  });

  it("keeps event reset disabled until the selected event name matches", async () => {
    await database.events.put({
      id: "event-1",
      name: "コミティア150",
      eventDate: "2026-11-23",
      series: "other",
    });

    render(<SettingsPage database={database} eventId="event-1" />);

    const resetButton = await screen.findByRole("button", {
      name: "選択中イベントの運用データを初期化",
    });
    expect(resetButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText("確認のためイベント名を入力"), "コミティア149");
    expect(resetButton).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("確認のためイベント名を入力"));
    await userEvent.type(screen.getByLabelText("確認のためイベント名を入力"), "コミティア150");
    expect(resetButton).toBeEnabled();
  });

  it("resets only selected-event operational data from settings", async () => {
    await database.events.bulkPut([
      { id: "event-1", name: "コミティア150", eventDate: "2026-11-23", series: "other" },
      { id: "event-2", name: "コミケ105", eventDate: "2026-12-30", series: "comic-market" },
    ]);
    await database.products.put({
      id: "book-1",
      name: "新刊",
      productGenre: "book",
      defaultPrice: 1000,
      isActive: true,
    });
    await database.bundles.put({ id: "bundle-1", name: "セット", price: 1500, isActive: true });
    await database.bundleItems.put({ bundleId: "bundle-1", productId: "book-1", quantity: 1 });
    await database.eventInventories.bulkPut([
      { eventId: "event-1", productId: "book-1", initialStock: 30, reservedStock: 0 },
      { eventId: "event-2", productId: "book-1", initialStock: 40, reservedStock: 0 },
    ]);
    await database.sales.put({
      id: "sale-1",
      eventId: "event-1",
      datetime: "2026-11-23T10:00:00+09:00",
      totalAmount: 1000,
      canceled: false,
      lines: [],
    });
    await database.expenses.put({
      id: "expense-1",
      eventId: "event-1",
      category: "printing",
      payee: "印刷所",
      amount: 500,
    });

    render(<SettingsPage database={database} eventId="event-1" />);

    await userEvent.type(
      await screen.findByLabelText("確認のためイベント名を入力"),
      "コミティア150",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "選択中イベントの運用データを初期化" }),
    );

    expect(await screen.findByText("選択中イベントの運用データを初期化しました。")).toBeInTheDocument();
    expect(await database.eventInventories.where("eventId").equals("event-1").count()).toBe(0);
    expect(await database.eventInventories.where("eventId").equals("event-2").count()).toBe(1);
    expect(await database.sales.where("eventId").equals("event-1").count()).toBe(0);
    expect(await database.expenses.where("eventId").equals("event-1").count()).toBe(0);
    expect(await database.events.count()).toBe(2);
    expect(await database.products.count()).toBe(1);
    expect(await database.bundles.count()).toBe(1);
    expect(await database.bundleItems.count()).toBe(1);
  });
});
