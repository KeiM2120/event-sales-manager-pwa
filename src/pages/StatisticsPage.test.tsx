import "fake-indexeddb/auto";
import { cleanup, render, screen, within } from "@testing-library/react";
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

  it("shows Japanese section headings in the requested order", async () => {
    await seedStandardStats(database);

    render(<StatisticsPage database={database} eventId="event-1" />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "統計" }),
    ).toBeInTheDocument();
    const sectionHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);

    expect(sectionHeadings).toEqual([
      "客数・販売点数",
      "売上",
      "利益・収支",
      "頒布物ランキング",
      "ジャンル別",
      "売上履歴",
      "収支内訳",
    ]);
  });

  it("shows selected event statistics with line rankings, decomposed genres, history, and expenses", async () => {
    await seedStandardStats(database);

    render(<StatisticsPage database={database} eventId="event-1" />);

    expect(await screen.findByText("客数")).toBeInTheDocument();
    expect(await screen.findByText("1人")).toBeInTheDocument();
    expect(screen.getByText("販売点数")).toBeInTheDocument();
    expect(screen.getByText("3点")).toBeInTheDocument();
    expect(screen.getAllByText("2,500円").length).toBeGreaterThan(0);
    expect(screen.getByText("833円")).toBeInTheDocument();
    expect(screen.getAllByText("700円").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1,800円").length).toBeGreaterThan(0);

    const ranking = screen.getByRole("region", { name: "頒布物ランキング" });
    expect(within(ranking).getByText("新刊")).toBeInTheDocument();
    expect(within(ranking).getByText("おまとめセット")).toBeInTheDocument();
    expect(within(ranking).getByText("2点")).toBeInTheDocument();
    expect(within(ranking).getByText("1点")).toBeInTheDocument();

    const genres = screen.getByRole("region", { name: "ジャンル別" });
    expect(within(genres).getByText("本")).toBeInTheDocument();
    expect(within(genres).getByText("グッズ")).toBeInTheDocument();
    expect(within(genres).getAllByText("2点")).toHaveLength(2);

    const history = screen.getByRole("region", { name: "売上履歴" });
    expect(within(history).queryByText("sale-canceled")).not.toBeInTheDocument();
    expect(within(history).getByText("キャンセル")).toBeInTheDocument();
    expect(within(history).getByText("9,999円 / 1点")).toBeInTheDocument();
    expect(within(history).queryByText("sale-1")).not.toBeInTheDocument();
    expect(within(history).getByText("2,500円 / 3点")).toBeInTheDocument();

    const profitLoss = screen.getByRole("region", { name: "収支内訳" });
    expect(within(profitLoss).getByText("売上")).toBeInTheDocument();
    expect(within(profitLoss).getByText("2,500円")).toBeInTheDocument();
    expect(within(profitLoss).getByText("経費")).toBeInTheDocument();
    expect(within(profitLoss).getAllByText("700円")).toHaveLength(2);
    expect(within(profitLoss).getByText("印刷費 / 1件")).toBeInTheDocument();
    expect(within(profitLoss).getByText("利益")).toBeInTheDocument();
    expect(within(profitLoss).getByText("1,800円")).toBeInTheDocument();

    const profitLossRows = profitLoss.querySelectorAll("li");
    expect(profitLossRows[0]).not.toHaveClass("bg-slate-100");
    expect(profitLossRows[2]).not.toHaveClass("bg-slate-100");
    expect(profitLossRows[2]).toHaveClass("pl-5", "text-xs", "font-medium");

    const expenseBreakdownAmount = profitLossRows[2].querySelector(
      "span:last-child",
    );
    expect(expenseBreakdownAmount).toHaveClass(
      "text-xs",
      "font-medium",
      "text-[color:var(--color-muted)]",
    );
  });

  it("shows negative profit as red text with a triangle amount and no deficit chip", async () => {
    await database.sales.put({
      id: "sale-small",
      eventId: "event-1",
      datetime: "2026-08-16T10:00:00+09:00",
      totalAmount: 800,
      canceled: false,
      lines: [
        {
          lineId: "product:book",
          kind: "product",
          refId: "book",
          displayName: "コピー本",
          productGenre: "book",
          unitPrice: 800,
          quantity: 1,
          subtotal: 800,
        },
      ],
    });
    await database.expenses.put({
      id: "expense-large",
      eventId: "event-1",
      category: "transport",
      payee: "電車",
      amount: 2000,
    });

    render(<StatisticsPage database={database} eventId="event-1" />);

    await screen.findAllByText("▲1,200円");
    const profitLoss = screen.getByRole("region", { name: "収支内訳" });
    const profit = within(profitLoss).getByText("▲1,200円");

    expect(profit).toHaveClass("text-red-700");
    expect(screen.queryByText("赤字")).not.toBeInTheDocument();
  });
});

async function seedStandardStats(database: EventSalesDatabase): Promise<void> {
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
          lineId: "bundle:set",
          kind: "bundle",
          refId: "set",
          displayName: "おまとめセット",
          productGenre: "other",
          unitPrice: 500,
          quantity: 1,
          subtotal: 500,
          components: [
            {
              productId: "goods",
              productName: "アクリルキーホルダー",
              productGenre: "goods",
              quantity: 2,
            },
          ],
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
          lineId: "product:music",
          kind: "product",
          refId: "music",
          displayName: "旧譜",
          productGenre: "music",
          unitPrice: 9999,
          quantity: 1,
          subtotal: 9999,
        },
      ],
    },
  ]);
  await database.expenses.put({
    id: "expense-1",
    eventId: "event-1",
    category: "printing",
    payee: "印刷所",
    amount: 700,
  });
}
