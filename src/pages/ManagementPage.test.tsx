import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

  it("replaces zero in management number inputs instead of appending after it", async () => {
    render(<ManagementPage database={database} initialSection="products" />);

    await userEvent.click(screen.getByRole("button", { name: "頒布物を追加" }));

    const priceInput = screen.getByRole("spinbutton", { name: "価格" });
    expect(screen.queryByRole("button", { name: "価格を減らす" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "価格を増やす" })).not.toBeInTheDocument();

    await userEvent.click(priceInput);
    await userEvent.type(priceInput, "1200");

    expect(priceInput).toHaveDisplayValue("1200");
  });

  it("shows list-first management tabs and opens the product modal from the fixed add button", async () => {
    render(<ManagementPage database={database} />);

    expect(screen.getByRole("heading", { name: "管理" })).toBeInTheDocument();
    await screen.findByText("頒布物はまだありません。");
    expect(screen.getAllByRole("button").slice(0, 5).map((button) => button.textContent)).toEqual([
      "イベント",
      "頒布物",
      "セット",
      "在庫",
      "経費",
    ]);
    expect(screen.queryByLabelText("頒布物名")).not.toBeInTheDocument();

    const actionBar = screen.getByRole("region", { name: "主要操作" });
    expect(actionBar).toHaveClass("fixed");
    await userEvent.click(screen.getByRole("button", { name: "頒布物を追加" }));

    expect(screen.getByRole("dialog", { name: "頒布物を追加" })).toBeInTheDocument();
    expect(screen.getByLabelText("頒布物名")).toBeInTheDocument();
  });

  it("opens the requested management section", async () => {
    render(<ManagementPage database={database} initialSection="events" />);

    await screen.findByText("イベントはまだありません。");
    expect(screen.getByRole("button", { name: "イベントを追加" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "頒布物を追加" })).not.toBeInTheDocument();
  });

  it("offers the configured event series choices", async () => {
    render(<ManagementPage database={database} initialSection="events" />);

    await openModal("イベントを追加");
    const seriesSelect = screen.getByLabelText("種別");
    if (!(seriesSelect instanceof HTMLSelectElement)) {
      throw new Error("series target was not a select");
    }

    expect(Array.from(seriesSelect.options).map((option) => option.text)).toEqual([
      "コミックマーケット",
      "同人イベント一次創作",
      "同人イベント二次創作/オンリー",
      "その他",
    ]);
  });

  it("offers the configured product genre choices", async () => {
    render(<ManagementPage database={database} />);

    await openModal("頒布物を追加");
    const genreSelect = screen.getByLabelText("ジャンル");
    if (!(genreSelect instanceof HTMLSelectElement)) {
      throw new Error("product genre target was not a select");
    }

    expect(Array.from(genreSelect.options).map((option) => option.text)).toEqual([
      "同人誌/イラスト",
      "同人誌/マンガ",
      "同人誌/合同",
      "同人誌/その他",
      "グッズ/アクリル",
      "グッズ/紙",
      "グッズ/ステッカー",
      "グッズ/布",
      "グッズ/その他",
      "デジタル頒布物",
      "その他",
    ]);
  });

  it("offers the configured expense category choices", async () => {
    render(<ManagementPage database={database} initialSection="expenses" />);

    await openModal("経費を追加");
    const categorySelect = screen.getByLabelText("カテゴリ");
    if (!(categorySelect instanceof HTMLSelectElement)) {
      throw new Error("expense category target was not a select");
    }

    expect(Array.from(categorySelect.options).map((option) => option.text)).toEqual([
      "印刷費",
      "グッズ作成費",
      "イベント参加費",
      "交通費",
      "宿泊・滞在費",
      "搬出入費",
      "ブース用備品",
      "飲食費",
      "宣伝・販売費",
      "外注費",
      "その他",
    ]);
  });

  it("hides an event non-destructively and keeps closed state editable only in the modal", async () => {
    await database.events.put({
      id: "event-1",
      name: "削除対象イベント",
      eventDate: "2026-11-23",
      series: "other",
      circleSpace: "東A-01a",
      isClosed: true,
    });

    render(<ManagementPage database={database} initialSection="events" />);

    expect(await screen.findByText("削除対象イベント")).toBeInTheDocument();
    expect(screen.getByText("2026-11-23")).toBeInTheDocument();
    expect(screen.getByText("東A-01a")).toBeInTheDocument();
    expect(screen.getByText("その他")).toBeInTheDocument();
    expect(screen.getByText("終了済み")).toBeInTheDocument();
    expect(screen.queryByLabelText("イベント終了")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "削除対象イベントを編集" }));
    expect(screen.getByRole("dialog", { name: "イベントを編集" })).toBeInTheDocument();
    expect(screen.getByLabelText("イベント終了")).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "閉じる" }));

    await userEvent.click(screen.getByRole("button", { name: "削除対象イベントを削除" }));
    expect(
      await screen.findByText("イベントを非表示にしました。売上や経費の履歴は削除されません。"),
    ).toBeInTheDocument();
    expect(screen.queryByText("削除対象イベント")).not.toBeInTheDocument();
    await expect(database.events.count()).resolves.toBe(1);
    await expect(database.events.get("event-1")).resolves.toMatchObject({
      id: "event-1",
      isHidden: true,
    });
  });

  it("disables product deletion with visible blocker reasons", async () => {
    await database.events.bulkPut([
      {
        id: "event-open",
        name: "通常イベント",
        eventDate: "2026-08-16",
        series: "other",
      },
      {
        id: "event-closed",
        name: "終了済みイベント",
        eventDate: "2026-11-23",
        series: "other",
        isClosed: true,
      },
    ]);
    await database.products.bulkPut([
      {
        id: "inventory-product",
        name: "在庫あり頒布物",
        productGenre: "book",
        defaultPrice: 1000,
        isActive: true,
      },
      {
        id: "bundle-product",
        name: "セット構成頒布物",
        productGenre: "goods",
        defaultPrice: 500,
        isActive: true,
      },
      {
        id: "sold-product",
        name: "売上済み頒布物",
        productGenre: "book",
        defaultPrice: 1200,
        isActive: true,
      },
    ]);
    await database.eventInventories.put({
      eventId: "event-open",
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
    await database.sales.put({
      id: "sale-1",
      eventId: "event-closed",
      datetime: "2026-11-23T10:00:00+09:00",
      totalAmount: 1200,
      canceled: false,
      lines: [
        {
          lineId: "product:sold-product",
          kind: "product",
          refId: "sold-product",
          displayName: "売上済み頒布物",
          productGenre: "book",
          unitPrice: 1200,
          quantity: 1,
          subtotal: 1200,
        },
      ],
    });

    render(<ManagementPage database={database} />);

    await screen.findByText("在庫あり頒布物");
    expect(screen.getAllByText("在庫・セットで使われているため削除できません")).toHaveLength(2);
    expect(screen.getByText("終了済みイベントの売上に含まれるため削除できません")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "在庫あり頒布物を削除" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "セット構成頒布物を削除" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "売上済み頒布物を削除" })).toBeDisabled();
    await expect(database.products.count()).resolves.toBe(3);
  });

  it("adds, edits, and deletes master data through modals", async () => {
    render(<ManagementPage database={database} />);

    await screen.findByText("頒布物はまだありません。");
    await openModal("頒布物を追加");
    await userEvent.type(screen.getByLabelText("頒布物名"), "新刊");
    await userEvent.clear(screen.getByLabelText("価格"));
    await userEvent.type(screen.getByLabelText("価格"), "1000");
    await submitModal("頒布物を追加");
    expect(await screen.findByText("新刊")).toBeInTheDocument();
    expect(screen.getByText("1,000円")).toBeInTheDocument();

    await openModal("頒布物を追加");
    await userEvent.type(screen.getByLabelText("頒布物名"), "グッズ");
    await userEvent.clear(screen.getByLabelText("価格"));
    await userEvent.type(screen.getByLabelText("価格"), "500");
    await submitModal("頒布物を追加");
    await userEvent.click(screen.getByRole("button", { name: "グッズを編集" }));
    await userEvent.clear(screen.getByLabelText("頒布物名"));
    await userEvent.type(screen.getByLabelText("頒布物名"), "グッズ改");
    await submitModal("頒布物を更新");
    expect(await screen.findByText("グッズ改")).toBeInTheDocument();

    await openModal("頒布物を追加");
    await userEvent.type(screen.getByLabelText("頒布物名"), "削除用頒布物");
    await userEvent.clear(screen.getByLabelText("価格"));
    await userEvent.type(screen.getByLabelText("価格"), "100");
    await submitModal("頒布物を追加");
    expect(await screen.findByText("削除用頒布物")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "削除用頒布物を削除" }));
    expect(screen.queryByText("削除用頒布物")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "イベント" }));
    await openModal("イベントを追加");
    await userEvent.type(screen.getByLabelText("イベント名"), "コミックマーケット");
    await userEvent.type(screen.getByLabelText("開催日"), "2026-08-16");
    await userEvent.type(screen.getByLabelText("スペース"), "東A-01a");
    await submitModal("イベントを追加");
    expect(
      await screen.findByRole("heading", { name: "コミックマーケット" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "コミックマーケットを編集" }));
    await userEvent.clear(screen.getByLabelText("イベント名"));
    await userEvent.type(screen.getByLabelText("イベント名"), "コミックマーケット106");
    await userEvent.clear(screen.getByLabelText("スペース"));
    await userEvent.type(screen.getByLabelText("スペース"), "東B-02b");
    await submitModal("イベントを更新");
    expect(await screen.findByText("コミックマーケット106")).toBeInTheDocument();
    expect(screen.getByText("東B-02b")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "在庫" }));
    await openModal("在庫を追加");
    await userEvent.clear(screen.getByLabelText("初期在庫"));
    await userEvent.type(screen.getByLabelText("初期在庫"), "20");
    await userEvent.clear(screen.getByLabelText("取り置き数"));
    await userEvent.type(screen.getByLabelText("取り置き数"), "3");
    await userEvent.type(screen.getByLabelText("取り置きメモ"), "田中さん");
    await submitModal("在庫を追加");
    expect(await screen.findByText(/コミックマーケット106/)).toBeInTheDocument();
    expect(screen.getByText("在庫20 / 取置3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /コミックマーケット106の在庫を編集/ }));
    await userEvent.clear(screen.getByLabelText("初期在庫"));
    await userEvent.type(screen.getByLabelText("初期在庫"), "25");
    await submitModal("在庫を更新");
    expect(await screen.findByText("在庫25 / 取置3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "経費" }));
    await openModal("経費を追加");
    await userEvent.type(screen.getByLabelText("支払先"), "印刷所");
    await userEvent.clear(screen.getByLabelText("金額"));
    await userEvent.type(screen.getByLabelText("金額"), "5000");
    await submitModal("経費を追加");
    expect(await screen.findByText("印刷所")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "印刷所を編集" }));
    await userEvent.clear(screen.getByLabelText("金額"));
    await userEvent.type(screen.getByLabelText("金額"), "6000");
    await submitModal("経費を更新");
    expect(await screen.findByText("6,000円")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "セット" }));
    await openModal("セットを追加");
    await userEvent.type(screen.getByLabelText("セット名"), "新刊セット");
    await userEvent.clear(screen.getByLabelText("セット価格"));
    await userEvent.type(screen.getByLabelText("セット価格"), "1200");
    await selectOptionByText(screen.getByLabelText("構成頒布物1"), "新刊");
    await userEvent.clear(screen.getByLabelText("構成数量1"));
    await userEvent.type(screen.getByLabelText("構成数量1"), "2");
    await userEvent.click(screen.getByRole("button", { name: "構成頒布物を追加" }));
    await selectOptionByText(screen.getByLabelText("構成頒布物2"), "グッズ改");
    await userEvent.clear(screen.getByLabelText("構成数量2"));
    await userEvent.type(screen.getByLabelText("構成数量2"), "3");
    await userEvent.click(screen.getByRole("button", { name: "構成頒布物を追加" }));
    await userEvent.click(screen.getByRole("button", { name: "構成頒布物3を取り消し" }));
    expect(screen.queryByLabelText("構成頒布物3")).not.toBeInTheDocument();
    await submitModal("セットを追加");
    expect(await screen.findByText("新刊セット")).toBeInTheDocument();
    expect(screen.getByText(/新刊 x2/)).toBeInTheDocument();
    expect(screen.getByText(/グッズ改 x3/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "新刊セットを編集" }));
    await userEvent.clear(screen.getByLabelText("セット価格"));
    await userEvent.type(screen.getByLabelText("セット価格"), "1300");
    await submitModal("セットを更新");
    expect(await screen.findByText("1,300円")).toBeInTheDocument();

    await expect(database.products.count()).resolves.toBe(2);
    await expect(database.events.count()).resolves.toBe(1);
    await expect(database.eventInventories.count()).resolves.toBe(1);
    await expect(database.expenses.count()).resolves.toBe(1);
    await expect(database.bundles.count()).resolves.toBe(1);
    await expect(database.events.toArray()).resolves.toMatchObject([
      { circleSpace: "東B-02b", name: "コミックマーケット106" },
    ]);
    await expect(database.eventInventories.toArray()).resolves.toMatchObject([
      { initialStock: 25, reservationMemo: "田中さん" },
    ]);
    const savedBundleItems = await database.bundleItems.toArray();
    expect(savedBundleItems).toHaveLength(2);
    expect(savedBundleItems.map((item) => item.quantity).sort()).toEqual([2, 3]);
  }, 15000);

  it("shows derived bundle availability cards on the inventory tab", async () => {
    await database.events.put({
      id: "event-1",
      name: "コミックマーケット",
      eventDate: "2026-08-16",
      series: "comic-market",
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
    ]);
    await database.eventInventories.bulkPut([
      { eventId: "event-1", productId: "book", initialStock: 6, reservedStock: 0 },
      { eventId: "event-1", productId: "goods", initialStock: 2, reservedStock: 0 },
    ]);
    await database.bundles.bulkPut([
      { id: "bundle-1", name: "新刊セット", price: 1200, isActive: true },
      { id: "bundle-zero", name: "完売セット", price: 1800, isActive: true },
    ]);
    await database.bundleItems.bulkPut([
      { bundleId: "bundle-1", productId: "book", quantity: 2 },
      { bundleId: "bundle-1", productId: "goods", quantity: 1 },
      { bundleId: "bundle-zero", productId: "missing", quantity: 1 },
    ]);

    render(<ManagementPage database={database} initialSection="inventory" />);

    expect(await screen.findByText("新刊セット")).toBeInTheDocument();
    expect(screen.getByText("取扱可能数 2")).toBeInTheDocument();
    expect(screen.getAllByText("セット内容はセットタブで編集")).toHaveLength(2);
    expect(screen.getByText("完売セット").closest("li")).toHaveClass("bg-slate-100");
    expect(screen.queryByRole("button", { name: "新刊セットを編集" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "新刊セットを削除" })).not.toBeInTheDocument();
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
