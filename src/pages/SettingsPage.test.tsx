import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventSalesDatabase } from "../db/database";
import { SettingsPage } from "./SettingsPage";

const pwaState = vi.hoisted(() => ({
  current: {
    needRefresh: false,
    offlineReady: false,
    update: vi.fn(),
  },
}));

vi.mock("../hooks/usePwaUpdate", () => ({
  usePwaUpdate: () => pwaState.current,
}));

describe("SettingsPage", () => {
  let database: EventSalesDatabase;

  beforeEach(() => {
    database = new EventSalesDatabase(`settings-page-${crypto.randomUUID()}`);
    pwaState.current = {
      needRefresh: false,
      offlineReady: false,
      update: vi.fn(),
    };
  });

  afterEach(async () => {
    cleanup();
    await database.delete();
    database.close();
  });

  it("shows app state, CSV export, and dangerous operation sections", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "設定" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "アプリ状態" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "CSV出力" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "危険操作" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "売上サマリーCSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "売上詳細CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "頒布物移動CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "経費CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "収支CSV" })).toBeInTheDocument();
    expect(screen.getByText("バージョン")).toBeInTheDocument();
  });

  it("shows an update button when a PWA update is available", async () => {
    const update = vi.fn();
    pwaState.current = {
      needRefresh: true,
      offlineReady: true,
      update,
    };

    render(<SettingsPage />);

    await userEvent.click(screen.getByRole("button", { name: "更新する" }));

    expect(screen.getByText("オフライン")).toBeInTheDocument();
    expect(screen.getByText("利用可能")).toBeInTheDocument();
    expect(update).toHaveBeenCalledOnce();
  });

  it("exports five selected-event CSV files from saved data", async () => {
    const downloader = vi.fn();
    await database.sales.bulkPut([
      {
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
      },
      {
        id: "sale-canceled",
        eventId: "event-1",
        datetime: "2026-08-16T11:00:00+09:00",
        totalAmount: 9999,
        canceled: true,
        lines: [
          {
            lineId: "product:canceled",
            kind: "product",
            refId: "canceled",
            displayName: "取消分",
            productGenre: "book",
            unitPrice: 9999,
            quantity: 1,
            subtotal: 9999,
          },
        ],
      },
      {
        id: "sale-other",
        eventId: "event-2",
        datetime: "2026-08-16T12:00:00+09:00",
        totalAmount: 2000,
        canceled: false,
        lines: [],
      },
    ]);
    await database.expenses.bulkPut([
      {
        id: "expense-1",
        eventId: "event-1",
        category: "printing",
        payee: "印刷所",
        amount: 500,
      },
      {
        id: "expense-other",
        eventId: "event-2",
        category: "transport",
        payee: "交通機関",
        amount: 800,
      },
    ]);

    render(
      <SettingsPage database={database} eventId="event-1" downloader={downloader} />,
    );

    const salesSummaryButton = screen.getByRole("button", {
      name: "売上サマリーCSV",
    });
    expect(salesSummaryButton).toBeDisabled();

    await waitFor(() => expect(salesSummaryButton).toBeEnabled());

    await userEvent.click(salesSummaryButton);
    await userEvent.click(screen.getByRole("button", { name: "売上詳細CSV" }));
    await userEvent.click(screen.getByRole("button", { name: "頒布物移動CSV" }));
    await userEvent.click(screen.getByRole("button", { name: "経費CSV" }));
    await userEvent.click(screen.getByRole("button", { name: "収支CSV" }));

    expect(downloader).toHaveBeenCalledTimes(5);
    expect(downloader.mock.calls.map((call) => call[0])).toEqual([
      "sales-summary-event-1.csv",
      "sales-detail-event-1.csv",
      "product-movement-event-1.csv",
      "expenses-event-1.csv",
      "profit-loss-event-1.csv",
    ]);
    expect(downloader.mock.calls[0]?.[1]).toContain(
      "saleId,eventId,datetime,totalAmount,totalQuantity,canceled,lineCount",
    );
    expect(downloader.mock.calls[0]?.[1]).toContain(
      "sale-1,event-1,2026-08-16T10:00:00+09:00,1000,1,false,1",
    );
    expect(downloader.mock.calls[0]?.[1]).not.toContain("sale-other");
    expect(downloader.mock.calls[1]?.[1]).toContain(
      "sale-1,2026-08-16T10:00:00+09:00,product:book,product,book,新刊,book,1000,1,1000,false",
    );
    expect(downloader.mock.calls[2]?.[1]).toContain(
      "saleId,datetime,lineId,sourceKind",
    );
    expect(downloader.mock.calls[3]?.[1]).toContain(
      "expense-1,event-1,printing,印刷所,500,",
    );
    expect(downloader.mock.calls[3]?.[1]).not.toContain("expense-other");
    expect(downloader.mock.calls[4]?.[1]).toContain("売上,経費,利益");
    expect(downloader.mock.calls[4]?.[1]).toContain("1000,500,500");
    expect(downloader.mock.calls[4]?.[1]).toContain("printing,1,500");
  });

  it("opens a strong reset confirmation without requiring event-name typing", async () => {
    await database.events.put({
      id: "event-1",
      name: "コミティア150",
      eventDate: "2026-11-23",
      series: "other",
    });

    render(<SettingsPage database={database} eventId="event-1" />);

    await userEvent.click(
      await screen.findByRole("button", { name: "リセット確認へ" }),
    );

    expect(screen.getAllByText("コミティア150").length).toBeGreaterThan(0);
    expect(screen.getByText("リセット対象: 在庫・売上・経費")).toBeInTheDocument();
    expect(screen.getByText("残るデータ: イベント・頒布物・セット")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "リセットする" })).toBeEnabled();
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
    await database.bundles.put({
      id: "bundle-1",
      name: "セット",
      price: 1500,
      isActive: true,
    });
    await database.bundleItems.put({
      bundleId: "bundle-1",
      productId: "book-1",
      quantity: 1,
    });
    await database.eventInventories.bulkPut([
      { eventId: "event-1", productId: "book-1", initialStock: 30, reservedStock: 0 },
      { eventId: "event-2", productId: "book-1", initialStock: 40, reservedStock: 0 },
    ]);
    await database.sales.bulkPut([
      {
        id: "sale-1",
        eventId: "event-1",
        datetime: "2026-11-23T10:00:00+09:00",
        totalAmount: 1000,
        canceled: false,
        lines: [],
      },
      {
        id: "sale-2",
        eventId: "event-2",
        datetime: "2026-12-30T10:00:00+09:00",
        totalAmount: 1000,
        canceled: false,
        lines: [],
      },
    ]);
    await database.expenses.bulkPut([
      {
        id: "expense-1",
        eventId: "event-1",
        category: "printing",
        payee: "印刷所",
        amount: 500,
      },
      {
        id: "expense-2",
        eventId: "event-2",
        category: "transport",
        payee: "交通機関",
        amount: 800,
      },
    ]);

    render(<SettingsPage database={database} eventId="event-1" />);

    await userEvent.click(
      await screen.findByRole("button", { name: "リセット確認へ" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "リセットする" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "選択中イベントの在庫・売上・経費をリセットしました。",
    );
    expect(screen.queryByRole("button", { name: "リセットする" })).not.toBeInTheDocument();
    expect(await database.eventInventories.where("eventId").equals("event-1").count()).toBe(0);
    expect(await database.eventInventories.where("eventId").equals("event-2").count()).toBe(1);
    expect(await database.sales.where("eventId").equals("event-1").count()).toBe(0);
    expect(await database.sales.where("eventId").equals("event-2").count()).toBe(1);
    expect(await database.expenses.where("eventId").equals("event-1").count()).toBe(0);
    expect(await database.expenses.where("eventId").equals("event-2").count()).toBe(1);
    expect(await database.events.count()).toBe(2);
    expect(await database.products.count()).toBe(1);
    expect(await database.bundles.count()).toBe(1);
    expect(await database.bundleItems.count()).toBe(1);
  });

  it("disables selected-event reset while it is running", async () => {
    await database.events.put({
      id: "event-1",
      name: "コミティア150",
      eventDate: "2026-11-23",
      series: "other",
    });
    let finishReset: (() => void) | undefined;
    const resetOperationalData = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishReset = resolve;
        }),
    );

    render(
      <SettingsPage
        database={database}
        eventId="event-1"
        resetOperationalData={resetOperationalData}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "リセット確認へ" }),
    );
    const resetButton = screen.getByRole("button", { name: "リセットする" });

    await userEvent.click(resetButton);

    expect(resetOperationalData).toHaveBeenCalledTimes(1);
    expect(resetButton).toBeDisabled();

    await userEvent.click(resetButton);
    expect(resetOperationalData).toHaveBeenCalledTimes(1);

    finishReset?.();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "選択中イベントの在庫・売上・経費をリセットしました。",
    );
  });
});
