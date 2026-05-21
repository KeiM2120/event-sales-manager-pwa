import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { EventSalesDatabase } from "./db/database";

describe("App", () => {
  let database: EventSalesDatabase;

  beforeEach(() => {
    database = new EventSalesDatabase(`app-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    cleanup();
    await database.delete();
    database.close();
  });

  it("switches between top-level screens", async () => {
    await database.events.put({
      id: "event-1",
      name: "イベント1",
      eventDate: "2026-11-23",
      series: "other",
    });

    render(<App database={database} />);

    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "統計" }));
    expect(screen.getByRole("heading", { name: "統計" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "管理" }));
    expect(screen.getByRole("heading", { name: "管理" })).toBeInTheDocument();
  });

  it("guides checkout navigation to management when no inventory is registered", async () => {
    await database.events.put({
      id: "event-1",
      name: "イベント1",
      eventDate: "2026-11-23",
      series: "other",
    });

    render(<App database={database} />);

    await userEvent.click(screen.getByRole("button", { name: "会計" }));

    expect(await screen.findByRole("heading", { name: "管理" })).toBeInTheDocument();
    expect(screen.getByText("在庫を登録すると会計を開始できます。")).toBeInTheDocument();
  });

  it("guides checkout navigation to management when no event is registered", async () => {
    render(<App database={database} />);

    await userEvent.click(screen.getByRole("button", { name: "会計" }));

    expect(await screen.findByRole("heading", { name: "管理" })).toBeInTheDocument();
    expect(screen.getByText("イベントを登録すると会計を開始できます。")).toBeInTheDocument();
  });

  it("uses the selected event for checkout navigation guards", async () => {
    await database.events.bulkPut([
      { id: "event-1", name: "イベント1", eventDate: "2026-11-23", series: "other" },
      { id: "event-2", name: "イベント2", eventDate: "2026-12-30", series: "comic-market" },
    ]);
    await database.products.put({
      id: "book-1",
      name: "新刊",
      productGenre: "book",
      defaultPrice: 1000,
      isActive: true,
    });
    await database.eventInventories.put({
      eventId: "event-2",
      productId: "book-1",
      initialStock: 30,
      reservedStock: 0,
    });

    render(<App database={database} />);

    await userEvent.selectOptions(await screen.findByLabelText("イベントを選択"), "event-2");
    await userEvent.click(screen.getByRole("button", { name: "会計" }));

    expect(await screen.findByRole("heading", { name: "会計" })).toBeInTheDocument();
    expect(screen.getByText("イベント2 / 2026-12-30")).toBeInTheDocument();
  });

  it("redirects checkout when the selected event has no inventory", async () => {
    await database.events.bulkPut([
      { id: "event-1", name: "イベント1", eventDate: "2026-11-23", series: "other" },
      { id: "event-2", name: "イベント2", eventDate: "2026-12-30", series: "comic-market" },
    ]);
    await database.products.put({
      id: "book-1",
      name: "新刊",
      productGenre: "book",
      defaultPrice: 1000,
      isActive: true,
    });
    await database.eventInventories.put({
      eventId: "event-1",
      productId: "book-1",
      initialStock: 30,
      reservedStock: 0,
    });

    render(<App database={database} />);

    await userEvent.selectOptions(await screen.findByLabelText("イベントを選択"), "event-2");
    await userEvent.click(screen.getByRole("button", { name: "会計" }));

    expect(await screen.findByRole("heading", { name: "管理" })).toBeInTheDocument();
    expect(screen.getByText("在庫を登録すると会計を開始できます。")).toBeInTheDocument();
  });

  it("reflects management event, product, bundle, and inventory inputs on checkout", async () => {
    render(<App database={database} />);

    await userEvent.click(screen.getByRole("button", { name: "管理" }));

    await userEvent.click(screen.getByRole("button", { name: "イベント" }));
    await userEvent.type(screen.getByLabelText("イベント名"), "コミティア150");
    await userEvent.type(screen.getByLabelText("開催日"), "2026-11-23");
    await userEvent.type(screen.getByLabelText("サークルスペース"), "東1 え-01a");
    await userEvent.click(screen.getByRole("button", { name: "イベントを追加" }));
    expect(await screen.findByText("コミティア150 / 2026-11-23 / 東1 え-01a")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "商品" }));
    await userEvent.type(screen.getByLabelText("商品名"), "テスト新刊");
    await userEvent.clear(screen.getByLabelText("価格"));
    await userEvent.type(screen.getByLabelText("価格"), "1200");
    await userEvent.click(screen.getByRole("button", { name: "商品を追加" }));
    expect(await screen.findByText("テスト新刊 / 1200円")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "セット" }));
    await userEvent.type(screen.getByLabelText("セット名"), "会場限定セット");
    await userEvent.clear(screen.getByLabelText("セット価格"));
    await userEvent.type(screen.getByLabelText("セット価格"), "1500");
    await userEvent.click(screen.getByRole("button", { name: "セットを追加" }));
    expect(await screen.findByText(/会場限定セット \/ 1500円/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "在庫" }));
    await userEvent.clear(screen.getByLabelText("初期在庫"));
    await userEvent.type(screen.getByLabelText("初期在庫"), "30");
    await userEvent.clear(screen.getByLabelText("取り置き数"));
    await userEvent.type(screen.getByLabelText("取り置き数"), "4");
    await userEvent.click(screen.getByRole("button", { name: "在庫を追加" }));
    expect(
      await screen.findByText(/コミティア150 \/ テスト新刊 \/ 在庫30 \/ 取置4/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "会計" }));

    expect(await screen.findByRole("heading", { name: "会計" })).toBeInTheDocument();
    expect(screen.getByText("コミティア150 / 2026-11-23 / 東1 え-01a")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "テスト新刊を追加" })).toBeInTheDocument();
    expect(
      screen.getAllByText((content) =>
        content.includes("1200円 / 初期 30 / 残り 26 / 取置 4"),
      ),
    ).toHaveLength(2);
    expect(screen.getByRole("button", { name: "取り置き テスト新刊を追加" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "会場限定セットを追加" })).toBeInTheDocument();
  });
});
