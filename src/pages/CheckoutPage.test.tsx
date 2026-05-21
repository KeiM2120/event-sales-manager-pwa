import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventSalesDatabase } from "../db/database";
import { CheckoutPage } from "./CheckoutPage";

describe("CheckoutPage", () => {
  let database: EventSalesDatabase;

  beforeEach(() => {
    database = new EventSalesDatabase(`checkout-page-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    cleanup();
    await database.delete();
    database.close();
  });

  it("shows product items in one column with row and plus minus controls", async () => {
    render(<CheckoutPage eventId="event-1" />);

    const productList = screen.getByRole("list", { name: "商品一覧" });
    expect(productList).toHaveClass("grid-cols-1");

    await userEvent.click(screen.getByRole("button", { name: "新刊を追加" }));
    expect(screen.getByText("新刊 x1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "新刊を増やす" }));
    expect(screen.getByText("新刊 x2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "新刊を減らす" }));
    expect(screen.getByText("新刊 x1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "新刊を減らす" }));
    expect(screen.queryByText("新刊 x1")).not.toBeInTheDocument();
  });

  it("includes existing books, goods, and their reservation test items", async () => {
    render(<CheckoutPage eventId="event-1" />);

    const itemNames = ["既刊A", "既刊B", "グッズA", "グッズB"];
    for (const itemName of itemNames) {
      expect(
        screen.getByRole("button", { name: `${itemName}を追加` }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: `取り置き ${itemName}を追加` }),
      ).toBeInTheDocument();
    }

    await userEvent.click(screen.getByRole("button", { name: "既刊Aを追加" }));
    await userEvent.click(
      screen.getByRole("button", { name: "取り置き グッズBを増やす" }),
    );

    expect(screen.getByText("既刊A x1")).toBeInTheDocument();
    expect(screen.getByText("取り置き グッズB x1")).toBeInTheDocument();
  });

  it("keeps clear undo and confirm actions fixed at the bottom", () => {
    render(<CheckoutPage eventId="event-1" />);

    const checkoutActions = screen.getByRole("group", { name: "会計操作" });
    expect(checkoutActions).toHaveClass("fixed");
    expect(checkoutActions).toHaveClass("bottom-0");
    expect(checkoutActions).toHaveTextContent("クリア");
    expect(checkoutActions).toHaveTextContent("Undo");
    expect(checkoutActions).toHaveTextContent("確定 0円");
  });

  it("pins checkout details above the bottom actions with an internal scroll area", async () => {
    render(<CheckoutPage eventId="event-1" />);

    await userEvent.click(screen.getByRole("button", { name: "新刊を追加" }));
    const checkoutDetails = screen.getByRole("region", { name: "会計内容" });
    const checkoutDetailLines = screen.getByRole("list", { name: "会計明細" });

    expect(checkoutDetails).toHaveClass("fixed");
    expect(checkoutDetails).toHaveClass("bottom-20");
    expect(checkoutDetails).toHaveClass("h-[30vh]");
    expect(checkoutDetailLines).toHaveClass("overflow-y-auto");
    expect(checkoutDetailLines).toHaveClass("mt-1");
    expect(checkoutDetailLines).toHaveClass("space-y-1");
    expect(checkoutDetailLines).toHaveTextContent("新刊 x1");
    expect(screen.getByText("新刊 x1").closest("li")).toHaveClass("py-1");
  });

  it("scrolls checkout details to the bottom when an item is added", async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    render(<CheckoutPage eventId="event-1" />);

    await userEvent.click(screen.getByRole("button", { name: "新刊を追加" }));

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    });
  });

  it("confirms checkout to sales and clears current lines", async () => {
    await seedCheckoutDatabase(database);
    render(<CheckoutPage database={database} eventId="event-1" />);

    await screen.findByRole("button", { name: "新刊を追加" });
    await userEvent.click(screen.getByRole("button", { name: "新刊を追加" }));
    await userEvent.click(screen.getByRole("button", { name: "確定 1000円" }));

    await waitFor(async () => {
      await expect(database.sales.count()).resolves.toBe(1);
    });
    expect(screen.queryByText("新刊 x1")).not.toBeInTheDocument();
    expect(screen.getByText("保存しました。")).toBeInTheDocument();
  });

  it("does not save duplicate sales while confirmation is already running", async () => {
    await seedCheckoutDatabase(database);
    render(<CheckoutPage database={database} eventId="event-1" />);

    await screen.findByRole("button", { name: "新刊を追加" });
    await userEvent.click(screen.getByRole("button", { name: "新刊を追加" }));
    const confirmButton = screen.getByRole("button", { name: "確定 1000円" });
    await Promise.all([userEvent.click(confirmButton), userEvent.click(confirmButton)]);

    await waitFor(async () => {
      await expect(database.sales.count()).resolves.toBe(1);
    });
  });

  it("undoes the latest active sale without deleting it", async () => {
    await seedCheckoutDatabase(database);
    await database.sales.bulkPut([
      {
        id: "sale-old",
        eventId: "event-1",
        datetime: "2026-08-16T09:00:00+09:00",
        totalAmount: 1000,
        canceled: false,
        lines: [],
      },
      {
        id: "sale-latest",
        eventId: "event-1",
        datetime: "2026-08-16T10:00:00+09:00",
        totalAmount: 1000,
        canceled: false,
        lines: [],
      },
    ]);
    render(<CheckoutPage database={database} eventId="event-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));

    await waitFor(async () => {
      await expect(database.sales.get("sale-latest")).resolves.toMatchObject({
        canceled: true,
      });
    });
    await expect(database.sales.get("sale-old")).resolves.toMatchObject({
      canceled: false,
    });
    expect(screen.getByText("直近の売上を取り消しました。")).toBeInTheDocument();
  });
});

async function seedCheckoutDatabase(database: EventSalesDatabase) {
  await database.events.put({
    id: "event-1",
    name: "コミティア150",
    eventDate: "2026-11-23",
    series: "other",
  });
  await database.products.put({
    id: "book",
    name: "新刊",
    productGenre: "book",
    defaultPrice: 1000,
    isActive: true,
  });
  await database.eventInventories.put({
    eventId: "event-1",
    productId: "book",
    initialStock: 10,
    reservedStock: 0,
  });
}
