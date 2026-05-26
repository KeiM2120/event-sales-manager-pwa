import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { EventSalesDatabase } from "./db/database";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

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
      name: "イベント",
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
      name: "イベント",
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

    expect(await screen.findByRole("heading", { name: "イベント2" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "頒布物一覧" })).toBeInTheDocument();
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

  it("keeps newer navigation when checkout inventory guard resolves later", async () => {
    await database.events.put({
      id: "event-1",
      name: "イベント",
      eventDate: "2026-11-23",
      series: "other",
    });
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
    const deferredCount = createDeferred<number>();
    const originalWhereClause = database.eventInventories.where("eventId");
    const delayedWhereClause = {
      equals: (value: string) => {
        const collection = originalWhereClause.equals(value);
        return {
          ...collection,
          count: () => deferredCount.promise,
        } as unknown as ReturnType<typeof originalWhereClause.equals>;
      },
    } as unknown as typeof originalWhereClause;
    const whereSpy = vi.spyOn(database.eventInventories, "where") as unknown as {
      mockReturnValue: (value: typeof originalWhereClause) => void;
    };
    whereSpy.mockReturnValue(delayedWhereClause);

    render(<App database={database} />);

    await screen.findByLabelText("イベントを選択");
    await userEvent.click(screen.getByRole("button", { name: "会計" }));
    await userEvent.click(screen.getByRole("button", { name: "管理" }));

    expect(await screen.findByRole("heading", { name: "管理" })).toBeInTheDocument();

    await act(async () => {
      deferredCount.resolve(1);
      await deferredCount.promise;
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "管理" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("list", { name: "頒布物一覧" })).not.toBeInTheDocument();
  });

  it("opens the matching management tab from setup status rows", async () => {
    await database.events.put({
      id: "event-1",
      name: "イベント",
      eventDate: "2026-11-23",
      series: "other",
    });

    render(<App database={database} />);

    await userEvent.click(
      await screen.findByRole("button", { name: "イベントの管理タブへ" }),
    );

    expect(await screen.findByRole("heading", { name: "管理" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "イベントを追加" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "頒布物を追加" })).not.toBeInTheDocument();
  });

  it("reflects management event, product, bundle, and inventory inputs on checkout", async () => {
    render(<App database={database} />);

    await userEvent.click(screen.getByRole("button", { name: "管理" }));

    await userEvent.click(screen.getByRole("button", { name: "イベント" }));
    await openModal("イベントを追加");
    await userEvent.type(screen.getByLabelText("イベント名"), "コミティア150");
    await userEvent.type(screen.getByLabelText("開催日"), "2026-11-23");
    await userEvent.type(screen.getByLabelText("スペース"), "東1 う-01a");
    await submitModal("イベントを追加");
    expect(await screen.findByText("コミティア150")).toBeInTheDocument();
    expect(screen.getByText("東1 う-01a")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "頒布物" }));
    await openModal("頒布物を追加");
    await userEvent.type(screen.getByLabelText("頒布物名"), "テスト新刊");
    await userEvent.clear(screen.getByLabelText("価格"));
    await userEvent.type(screen.getByLabelText("価格"), "1200");
    await submitModal("頒布物を追加");
    expect(await screen.findByText("テスト新刊")).toBeInTheDocument();
    expect(screen.getByText("1,200円")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "セット" }));
    await openModal("セットを追加");
    await userEvent.type(screen.getByLabelText("セット名"), "会場限定セット");
    await userEvent.clear(screen.getByLabelText("セット価格"));
    await userEvent.type(screen.getByLabelText("セット価格"), "1500");
    await submitModal("セットを追加");
    expect(await screen.findByText("会場限定セット")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "在庫" }));
    await openModal("在庫を追加");
    await userEvent.clear(screen.getByLabelText("初期在庫"));
    await userEvent.type(screen.getByLabelText("初期在庫"), "30");
    await userEvent.clear(screen.getByLabelText("取り置き数"));
    await userEvent.type(screen.getByLabelText("取り置き数"), "4");
    await submitModal("在庫を追加");
    expect(await screen.findByText(/コミティア150 \/ テスト新刊/)).toBeInTheDocument();
    expect(screen.getByText("在庫30 / 取置4")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "会計" }));

    expect(await screen.findByRole("heading", { name: "コミティア150" })).toBeInTheDocument();
    expect(screen.getByText("東1 う-01a")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "テスト新刊を追加" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "テスト新刊" })).toHaveTextContent(
      "1,200円/残26",
    );
    expect(screen.getByRole("button", { name: "取り置き テスト新刊を追加" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "会場限定セットを追加" })).toBeInTheDocument();
  });
});

async function openModal(buttonName: string) {
  await userEvent.click(screen.getByRole("button", { name: buttonName }));
}

async function submitModal(buttonName: string) {
  await userEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: buttonName }),
  );
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
}
