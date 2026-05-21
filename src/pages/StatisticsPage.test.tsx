import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EventSalesDatabase } from "../db/database";
import { StatisticsPage } from "./StatisticsPage";

describe("StatisticsPage", () => {
  let database: EventSalesDatabase;

  beforeEach(() => {
    database = new EventSalesDatabase(`statistics-page-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    cleanup();
    await database.delete();
    database.close();
  });

  it("shows statistic labels", () => {
    render(<StatisticsPage />);

    expect(screen.getByRole("heading", { name: "統計" })).toBeInTheDocument();
    expect(screen.getByText("総売上")).toBeInTheDocument();
    expect(screen.getByText("利益")).toBeInTheDocument();
  });

  it("shows selected event statistics from saved sales and expenses", async () => {
    await database.sales.bulkPut([
      {
        id: "sale-1",
        eventId: "event-1",
        datetime: "2026-08-16T10:00:00+09:00",
        totalAmount: 2500,
        canceled: false,
        lines: [
          {
            lineId: "product:book",
            kind: "product",
            refId: "book",
            displayName: "新刊",
            productGenre: "book",
            unitPrice: 1000,
            quantity: 2,
            subtotal: 2000,
          },
          {
            lineId: "product:goods",
            kind: "product",
            refId: "goods",
            displayName: "グッズ",
            productGenre: "goods",
            unitPrice: 500,
            quantity: 1,
            subtotal: 500,
          },
        ],
      },
      {
        id: "sale-canceled",
        eventId: "event-1",
        datetime: "2026-08-16T11:00:00+09:00",
        totalAmount: 9999,
        canceled: true,
        lines: [],
      },
    ]);
    await database.expenses.put({
      id: "expense-1",
      eventId: "event-1",
      category: "printing",
      payee: "印刷所",
      amount: 700,
    });

    render(<StatisticsPage database={database} eventId="event-1" />);

    expect(await screen.findByText("2,500円")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("833円")).toBeInTheDocument();
    expect(screen.getByText("700円")).toBeInTheDocument();
    expect(screen.getByText("1,800円")).toBeInTheDocument();
    expect(screen.getByText("新刊")).toBeInTheDocument();
    expect(screen.getAllByText("2点").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("book")).toBeInTheDocument();
    expect(screen.getByText("goods")).toBeInTheDocument();
    expect(screen.getByText("sale-1")).toBeInTheDocument();
    expect(screen.getByText("2,500円 / 3点")).toBeInTheDocument();
    expect(screen.getByText("sale-canceled")).toBeInTheDocument();
    expect(screen.getByText("取消済み")).toBeInTheDocument();
    expect(screen.getByText("9,999円 / 0点")).toBeInTheDocument();
  });
});
