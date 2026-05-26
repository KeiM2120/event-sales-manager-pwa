import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

  it("shows compact 頒布物 cards and plus minus controls", async () => {
    render(<CheckoutPage eventId="event-1" />);

    const productList = screen.getByRole("list", { name: "頒布物一覧" });
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

  it("renders event hero, Japanese labels, card tones, and accessible full names", async () => {
    await seedCheckoutDatabase(database);
    render(<CheckoutPage database={database} eventId="event-1" />);

    expect(await screen.findByText("コミティア150")).toBeInTheDocument();
    expect(screen.getByText("東A-01a")).toBeInTheDocument();
    expect(screen.queryByText("会計中イベント")).not.toBeInTheDocument();

    const normalCard = screen.getByRole("listitem", { name: "新刊" });
    expect(normalCard).toHaveClass("border-l-[6px]");
    expect(normalCard).toHaveClass("border-l-[color:var(--color-sub)]");
    expect(within(normalCard).getByText("残1")).toBeInTheDocument();

    const reservationCard = screen.getByRole("listitem", { name: "取り置き 新刊" });
    expect(reservationCard).toHaveClass("bg-[color:var(--color-sub)]/20");
    expect(within(reservationCard).getByText("予約")).toBeInTheDocument();
    expect(within(reservationCard).getByText("残1")).toBeInTheDocument();

    const bundleCard = screen.getByRole("listitem", { name: "新刊セット" });
    expect(bundleCard).toHaveClass("border-l-[color:var(--color-accent)]");
    expect(within(bundleCard).getByText("残1")).toBeInTheDocument();

    expect(
      screen.getByLabelText("とても長い頒布物名サンプル完全版の全文"),
    ).toHaveTextContent("とても長い頒布物名サンプル完全版");
  });

  it("keeps sold out rows subdued and lower unless already selected", async () => {
    await seedCheckoutDatabase(database);
    render(<CheckoutPage database={database} eventId="event-1" />);

    await screen.findByRole("listitem", { name: "新刊" });
    const cards = screen.getAllByRole("listitem");
    const soldOutCard = screen.getByRole("listitem", { name: "完売本" });

    expect(within(soldOutCard).getByText("売切")).toBeInTheDocument();
    expect(soldOutCard).toHaveClass("bg-slate-100");
    expect(cards.at(-1)).toBe(soldOutCard);
  });

  it("caps product, reservation, and bundle additions at derived max quantities", async () => {
    await seedCheckoutDatabase(database);
    render(<CheckoutPage database={database} eventId="event-1" />);

    await screen.findByRole("button", { name: "新刊を追加" });
    await userEvent.click(screen.getByRole("button", { name: "新刊を追加" }));
    await userEvent.click(screen.getByRole("button", { name: "新刊を増やす" }));
    await userEvent.click(screen.getByRole("button", { name: "取り置き 新刊を追加" }));
    await userEvent.click(screen.getByRole("button", { name: "取り置き 新刊を増やす" }));
    await userEvent.click(screen.getByRole("button", { name: "新刊セットを追加" }));
    await userEvent.click(screen.getByRole("button", { name: "新刊セットを増やす" }));

    expect(screen.getByText("新刊 x1")).toBeInTheDocument();
    expect(screen.getByText("取り置き 新刊 x1")).toBeInTheDocument();
    expect(screen.getByText("新刊セット x1")).toBeInTheDocument();
    expect(screen.getByText("合計 3点")).toBeInTheDocument();
  });

  it("keeps selected details above total and confirm in the fixed bottom area", async () => {
    render(<CheckoutPage eventId="event-1" />);

    await userEvent.click(screen.getByRole("button", { name: "新刊を追加" }));
    const checkoutActions = screen.getByRole("group", { name: "会計操作" });
    const selectedLines = screen.getByRole("list", { name: "選択中の明細" });

    expect(checkoutActions).toHaveClass("fixed");
    expect(checkoutActions).toHaveClass("bottom-0");
    expect(screen.getByText("選択中").closest("ul")).toBeNull();
    expect(selectedLines).toHaveClass("max-h-32");
    expect(selectedLines).toHaveClass("overflow-y-auto");
    expect(within(selectedLines).getByText("1,000円")).toBeInTheDocument();
    expect(checkoutActions.textContent).toMatch(/選択中[\s\S]*新刊 x1[\s\S]*合計 1点[\s\S]*会計を確定/);
    expect(checkoutActions).toHaveTextContent("クリア");
    expect(checkoutActions).toHaveTextContent("取消");
  });

  it("scrolls selected details to the bottom when an item is added", async () => {
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

  it("disables confirm until a line is selected, then saves and clears current lines", async () => {
    await seedCheckoutDatabase(database);
    render(<CheckoutPage database={database} eventId="event-1" />);

    const disabledConfirm = screen.getByRole("button", { name: "会計を確定 0円" });
    expect(disabledConfirm).toBeDisabled();

    await screen.findByRole("button", { name: "新刊を追加" });
    await userEvent.click(screen.getByRole("button", { name: "新刊を追加" }));
    const confirmButton = screen.getByRole("button", { name: "会計を確定 1,000円" });
    expect(confirmButton).toBeEnabled();
    await userEvent.click(confirmButton);

    await waitFor(async () => {
      await expect(database.sales.count()).resolves.toBe(2);
    });
    expect(screen.queryByText("新刊 x1")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("会計を保存しました");
  });

  it("does not save duplicate sales while confirmation is already running", async () => {
    await seedCheckoutDatabase(database);
    render(<CheckoutPage database={database} eventId="event-1" />);

    await screen.findByRole("button", { name: "新刊を追加" });
    await userEvent.click(screen.getByRole("button", { name: "新刊を追加" }));
    const confirmButton = screen.getByRole("button", { name: "会計を確定 1,000円" });
    await userEvent.dblClick(confirmButton);

    await waitFor(async () => {
      await expect(database.sales.count()).resolves.toBe(2);
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

    await userEvent.click(screen.getByRole("button", { name: "取消" }));

    await waitFor(async () => {
      await expect(database.sales.get("sale-latest")).resolves.toMatchObject({
        canceled: true,
      });
    });
    await expect(database.sales.get("sale-old")).resolves.toMatchObject({
      canceled: false,
    });
    expect(screen.getByRole("status")).toHaveTextContent("直近の売上を取り消しました");
  });
});

async function seedCheckoutDatabase(database: EventSalesDatabase) {
  await database.events.put({
    id: "event-1",
    name: "コミティア150",
    eventDate: "2026-11-23",
    series: "other",
    circleSpace: "東A-01a",
  });
  await database.products.bulkPut([
    {
      id: "book",
      name: "新刊",
      productGenre: "book",
      defaultPrice: 1000,
      isActive: true,
    },
    {
      id: "goods",
      name: "グッズ",
      productGenre: "goods",
      defaultPrice: 500,
      isActive: true,
    },
    {
      id: "long-name",
      name: "とても長い頒布物名サンプル完全版",
      productGenre: "book",
      defaultPrice: 1200,
      isActive: true,
    },
    {
      id: "sold-out",
      name: "完売本",
      productGenre: "book",
      defaultPrice: 900,
      isActive: true,
    },
  ]);
  await database.eventInventories.bulkPut([
    {
      eventId: "event-1",
      productId: "book",
      initialStock: 3,
      reservedStock: 1,
    },
    {
      eventId: "event-1",
      productId: "goods",
      initialStock: 4,
      reservedStock: 0,
    },
    {
      eventId: "event-1",
      productId: "long-name",
      initialStock: 5,
      reservedStock: 0,
    },
    {
      eventId: "event-1",
      productId: "sold-out",
      initialStock: 1,
      reservedStock: 0,
    },
  ]);
  await database.bundles.put({
    id: "bundle-1",
    name: "新刊セット",
    price: 1400,
    isActive: true,
  });
  await database.bundleItems.bulkPut([
    {
      bundleId: "bundle-1",
      productId: "book",
      quantity: 1,
    },
    {
      bundleId: "bundle-1",
      productId: "goods",
      quantity: 2,
    },
  ]);
  await database.sales.put({
    id: "sale-existing",
    eventId: "event-1",
    datetime: "2026-08-16T08:00:00+09:00",
    totalAmount: 1900,
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
      {
        lineId: "product:sold-out",
        kind: "product",
        refId: "sold-out",
        displayName: "完売本",
        productGenre: "book",
        unitPrice: 900,
        quantity: 1,
        subtotal: 900,
      },
    ],
  });
}
