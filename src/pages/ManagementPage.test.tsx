import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EventSalesDatabase } from "../db/database";
import { ManagementPage } from "./ManagementPage";

describe("ManagementPage", () => {
  let database: EventSalesDatabase;

  beforeEach(() => {
    database = new EventSalesDatabase(`management-page-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    cleanup();
    await database.delete();
    database.close();
  });

  it("switches management sections", async () => {
    render(<ManagementPage database={database} />);

    expect(screen.getByRole("heading", { name: "管理" })).toBeInTheDocument();
    await screen.findByText("商品はまだありません。");
    expect(screen.getAllByRole("button").slice(0, 5).map((button) => button.textContent)).toEqual([
      "イベント",
      "商品",
      "セット",
      "在庫",
      "経費",
    ]);
    await userEvent.click(screen.getByRole("button", { name: "在庫" }));
    expect(
      screen.getByRole("button", { name: "在庫を追加" }),
    ).toBeInTheDocument();
  });

  it("opens the requested management section", async () => {
    render(<ManagementPage database={database} initialSection="events" />);

    expect(await screen.findByRole("button", { name: "イベントを追加" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "商品を追加" })).not.toBeInTheDocument();
  });

  it("warns and hides an event instead of deleting it", async () => {
    await database.events.put({
      id: "event-1",
      name: "削除対象イベント",
      eventDate: "2026-11-23",
      series: "other",
    });

    render(<ManagementPage database={database} initialSection="events" />);

    expect(await screen.findByText("削除対象イベント / 2026-11-23")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "削除対象イベントを削除" }));

    expect(await screen.findByText("イベントを非表示にしました。売上や経費の履歴は保持されています。")).toBeInTheDocument();
    expect(screen.queryByText("削除対象イベント / 2026-11-23")).not.toBeInTheDocument();
    await expect(database.events.count()).resolves.toBe(1);
    await expect(database.events.get("event-1")).resolves.toMatchObject({
      id: "event-1",
      isHidden: true,
    });
  });

  it("blocks product deletion when inventory or bundle items reference it", async () => {
    await database.events.put({
      id: "event-1",
      name: "イベント",
      eventDate: "2026-11-23",
      series: "other",
    });
    await database.products.bulkPut([
      {
        id: "inventory-product",
        name: "在庫あり商品",
        productGenre: "book",
        defaultPrice: 1000,
        isActive: true,
      },
      {
        id: "bundle-product",
        name: "セット構成商品",
        productGenre: "goods",
        defaultPrice: 500,
        isActive: true,
      },
    ]);
    await database.eventInventories.put({
      eventId: "event-1",
      productId: "inventory-product",
      initialStock: 10,
      reservedStock: 0,
    });
    await database.bundles.put({
      id: "bundle-1",
      name: "セット",
      price: 1200,
      isActive: true,
    });
    await database.bundleItems.put({
      bundleId: "bundle-1",
      productId: "bundle-product",
      quantity: 1,
    });

    render(<ManagementPage database={database} />);

    await screen.findByText("在庫あり商品 / 1000円");
    await userEvent.click(screen.getByRole("button", { name: "在庫あり商品を削除" }));
    expect(screen.getByText("在庫で使われている商品は削除できません。")).toBeInTheDocument();
    await expect(database.products.get("inventory-product")).resolves.toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "セット構成商品を削除" }));
    expect(screen.getByText("セットで使われている商品は削除できません。")).toBeInTheDocument();
    await expect(database.products.get("bundle-product")).resolves.toBeTruthy();
  });

  it("saves event closed state and blocks deleting products sold in closed events", async () => {
    await database.events.put({
      id: "event-1",
      name: "終了済みイベント",
      eventDate: "2026-11-23",
      series: "other",
      isClosed: true,
    });
    await database.products.put({
      id: "sold-product",
      name: "売上済み商品",
      productGenre: "book",
      defaultPrice: 1000,
      isActive: true,
    });
    await database.sales.put({
      id: "sale-1",
      eventId: "event-1",
      datetime: "2026-11-23T10:00:00+09:00",
      totalAmount: 1000,
      canceled: false,
      lines: [
        {
          lineId: "product:sold-product",
          kind: "product",
          refId: "sold-product",
          displayName: "売上済み商品",
          productGenre: "book",
          unitPrice: 1000,
          quantity: 1,
          subtotal: 1000,
        },
      ],
    });

    render(<ManagementPage database={database} />);

    await screen.findByText("売上済み商品 / 1000円");
    await userEvent.click(screen.getByRole("button", { name: "売上済み商品を削除" }));

    expect(
      screen.getByText("終了済みイベントの売上に含まれる商品は削除できません。"),
    ).toBeInTheDocument();
    await expect(database.products.get("sold-product")).resolves.toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "イベント" }));
    await userEvent.click(screen.getByRole("button", { name: "終了済みイベントを編集" }));
    expect(screen.getByLabelText("イベント終了")).toBeChecked();
    await userEvent.click(screen.getByLabelText("イベント終了"));
    await userEvent.click(screen.getByRole("button", { name: "イベントを更新" }));
    await expect(database.events.get("event-1")).resolves.toMatchObject({
      isClosed: false,
    });
  });

  it("adds product, event, inventory, expense, and bundle master data", async () => {
    render(<ManagementPage database={database} />);

    await screen.findByText("商品はまだありません。");
    await userEvent.type(screen.getByLabelText("商品名"), "新刊");
    await userEvent.clear(screen.getByLabelText("価格"));
    await userEvent.type(screen.getByLabelText("価格"), "1000");
    await userEvent.click(screen.getByRole("button", { name: "商品を追加" }));
    expect(await screen.findByText("新刊 / 1000円")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("商品名"), "グッズ");
    await userEvent.clear(screen.getByLabelText("価格"));
    await userEvent.type(screen.getByLabelText("価格"), "500");
    await userEvent.click(screen.getByRole("button", { name: "商品を追加" }));
    expect(await screen.findByText("グッズ / 500円")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "グッズを編集" }));
    await userEvent.clear(screen.getByLabelText("商品名"));
    await userEvent.type(screen.getByLabelText("商品名"), "グッズ改");
    await userEvent.click(screen.getByRole("button", { name: "商品を更新" }));
    expect(await screen.findByText("グッズ改 / 500円")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("商品名"), "削除用商品");
    await userEvent.clear(screen.getByLabelText("価格"));
    await userEvent.type(screen.getByLabelText("価格"), "100");
    await userEvent.click(screen.getByRole("button", { name: "商品を追加" }));
    expect(await screen.findByText("削除用商品 / 100円")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "削除用商品を削除" }));
    expect(screen.queryByText("削除用商品 / 100円")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "イベント" }));
    await userEvent.type(screen.getByLabelText("イベント名"), "コミックマーケット");
    await userEvent.type(screen.getByLabelText("開催日"), "2026-08-16");
    await userEvent.type(screen.getByLabelText("サークルスペース"), "東A-01a");
    await userEvent.click(screen.getByRole("button", { name: "イベントを追加" }));
    expect(
      await screen.findByText("コミックマーケット / 2026-08-16 / 東A-01a"),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "コミックマーケットを編集" }),
    );
    await userEvent.clear(screen.getByLabelText("イベント名"));
    await userEvent.type(screen.getByLabelText("イベント名"), "コミックマーケット106");
    await userEvent.clear(screen.getByLabelText("サークルスペース"));
    await userEvent.type(screen.getByLabelText("サークルスペース"), "東B-02b");
    await userEvent.click(screen.getByRole("button", { name: "イベントを更新" }));
    expect(
      await screen.findByText("コミックマーケット106 / 2026-08-16 / 東B-02b"),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("イベント名"), "削除用イベント");
    await userEvent.type(screen.getByLabelText("開催日"), "2026-08-17");
    await userEvent.click(screen.getByRole("button", { name: "イベントを追加" }));
    expect(await screen.findByText("削除用イベント / 2026-08-17")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "削除用イベントを削除" }),
    );
    await waitFor(() => {
      expect(screen.queryByText("削除用イベント / 2026-08-17")).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "在庫" }));
    await userEvent.clear(screen.getByLabelText("初期在庫"));
    await userEvent.type(screen.getByLabelText("初期在庫"), "20");
    await userEvent.clear(screen.getByLabelText("取り置き数"));
    await userEvent.type(screen.getByLabelText("取り置き数"), "3");
    await userEvent.type(screen.getByLabelText("取り置きメモ"), "田中さん");
    await userEvent.click(screen.getByRole("button", { name: "在庫を追加" }));
    expect(
      await screen.findByText(/コミックマーケット106 \/ .+ \/ 在庫20 \/ 取置3 \/ 田中さん/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /在庫を編集$/ }));
    await userEvent.clear(screen.getByLabelText("初期在庫"));
    await userEvent.type(screen.getByLabelText("初期在庫"), "25");
    await userEvent.click(screen.getByRole("button", { name: "在庫を更新" }));
    expect(
      await screen.findByText(/コミックマーケット106 \/ .+ \/ 在庫25 \/ 取置3 \/ 田中さん/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "経費" }));
    await userEvent.type(screen.getByLabelText("支払先"), "印刷所");
    await userEvent.clear(screen.getByLabelText("金額"));
    await userEvent.type(screen.getByLabelText("金額"), "5000");
    await userEvent.click(screen.getByRole("button", { name: "経費を追加" }));
    expect(await screen.findByText("印刷所 / 5000円")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "印刷所を編集" }));
    await userEvent.clear(screen.getByLabelText("金額"));
    await userEvent.type(screen.getByLabelText("金額"), "6000");
    await userEvent.click(screen.getByRole("button", { name: "経費を更新" }));
    expect(await screen.findByText("印刷所 / 6000円")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("支払先"), "削除用経費");
    await userEvent.clear(screen.getByLabelText("金額"));
    await userEvent.type(screen.getByLabelText("金額"), "300");
    await userEvent.click(screen.getByRole("button", { name: "経費を追加" }));
    expect(await screen.findByText("削除用経費 / 300円")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "削除用経費を削除" }));
    expect(screen.queryByText("削除用経費 / 300円")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "セット" }));
    await userEvent.type(screen.getByLabelText("セット名"), "新刊セット");
    await userEvent.clear(screen.getByLabelText("セット価格"));
    await userEvent.type(screen.getByLabelText("セット価格"), "1200");
    await selectOptionByText(screen.getByLabelText("構成商品1"), "新刊");
    await userEvent.clear(screen.getByLabelText("構成数量1"));
    await userEvent.type(screen.getByLabelText("構成数量1"), "2");
    await userEvent.click(screen.getByRole("button", { name: "構成商品を追加" }));
    await selectOptionByText(screen.getByLabelText("構成商品2"), "グッズ改");
    await userEvent.clear(screen.getByLabelText("構成数量2"));
    await userEvent.type(screen.getByLabelText("構成数量2"), "3");
    await userEvent.click(screen.getByRole("button", { name: "構成商品を追加" }));
    await userEvent.click(screen.getByRole("button", { name: "構成商品3を取り消し" }));
    expect(screen.queryByLabelText("構成商品3")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "セットを追加" }));
    expect(
      await screen.findByText((content) =>
        content.includes("新刊セット / 1200円 /") &&
        content.includes("新刊 x2") &&
        content.includes("グッズ改 x3"),
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "新刊セットを編集" }));
    await userEvent.clear(screen.getByLabelText("セット価格"));
    await userEvent.type(screen.getByLabelText("セット価格"), "1300");
    await userEvent.click(screen.getByRole("button", { name: "セットを更新" }));
    expect(
      await screen.findByText((content) =>
        content.includes("新刊セット / 1300円 /") &&
        content.includes("新刊 x2") &&
        content.includes("グッズ改 x3"),
      ),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("セット名"), "削除用セット");
    await userEvent.clear(screen.getByLabelText("セット価格"));
    await userEvent.type(screen.getByLabelText("セット価格"), "100");
    await userEvent.click(screen.getByRole("button", { name: "セットを追加" }));
    expect(await screen.findByText(/削除用セット \/ 100円/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "削除用セットを削除" }));
    await waitFor(() => {
      expect(screen.queryByText(/削除用セット \/ 100円/)).not.toBeInTheDocument();
    });

    await expect(database.products.count()).resolves.toBe(2);
    await expect(database.events.count()).resolves.toBe(2);
    await expect(database.eventInventories.count()).resolves.toBe(1);
    await expect(database.expenses.count()).resolves.toBe(1);
    await expect(database.bundles.count()).resolves.toBe(1);
    const visibleEvents = (await database.events.toArray()).filter(
      (event) => !event.isHidden,
    );
    expect(visibleEvents).toMatchObject([
      { circleSpace: "東B-02b", name: "コミックマーケット106" },
    ]);
    await expect(database.eventInventories.toArray()).resolves.toMatchObject([
      { initialStock: 25, reservationMemo: "田中さん" },
    ]);
    const savedBundleItems = await database.bundleItems.toArray();
    expect(savedBundleItems).toHaveLength(2);
    expect(savedBundleItems.map((item) => item.quantity).sort()).toEqual([2, 3]);
  }, 15000);
});

async function selectOptionByText(element: HTMLElement, text: string) {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`${text} option target was not a select`);
  }

  const option = Array.from(element.options).find(
    (candidate) => candidate.textContent === text,
  );
  if (!option) {
    throw new Error(`${text} option was not found`);
  }

  await userEvent.selectOptions(element, option.value);
}
