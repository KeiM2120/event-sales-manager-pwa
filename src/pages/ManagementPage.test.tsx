import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
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
    expect(screen.queryByText("削除用イベント / 2026-08-17")).not.toBeInTheDocument();

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
    expect(screen.queryByText(/削除用セット \/ 100円/)).not.toBeInTheDocument();

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
