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

    await userEvent.click(screen.getByRole("button", { name: "イベント" }));
    await userEvent.type(screen.getByLabelText("イベント名"), "コミックマーケット");
    await userEvent.type(screen.getByLabelText("開催日"), "2026-08-16");
    await userEvent.click(screen.getByRole("button", { name: "イベントを追加" }));
    expect(await screen.findByText("コミックマーケット / 2026-08-16")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "在庫" }));
    await userEvent.clear(screen.getByLabelText("初期在庫"));
    await userEvent.type(screen.getByLabelText("初期在庫"), "20");
    await userEvent.clear(screen.getByLabelText("取り置き数"));
    await userEvent.type(screen.getByLabelText("取り置き数"), "3");
    await userEvent.type(screen.getByLabelText("取り置きメモ"), "田中さん");
    await userEvent.click(screen.getByRole("button", { name: "在庫を追加" }));
    expect(await screen.findByText("コミックマーケット / 新刊 / 在庫20 / 取置3 / 田中さん")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "経費" }));
    await userEvent.type(screen.getByLabelText("支払先"), "印刷所");
    await userEvent.clear(screen.getByLabelText("金額"));
    await userEvent.type(screen.getByLabelText("金額"), "5000");
    await userEvent.click(screen.getByRole("button", { name: "経費を追加" }));
    expect(await screen.findByText("印刷所 / 5000円")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "セット" }));
    await userEvent.type(screen.getByLabelText("セット名"), "新刊セット");
    await userEvent.clear(screen.getByLabelText("セット価格"));
    await userEvent.type(screen.getByLabelText("セット価格"), "1200");
    await userEvent.clear(screen.getByLabelText("構成数量"));
    await userEvent.type(screen.getByLabelText("構成数量"), "2");
    await userEvent.click(screen.getByRole("button", { name: "セットを追加" }));
    expect(await screen.findByText("新刊セット / 1200円 / 新刊 x2")).toBeInTheDocument();

    await expect(database.products.count()).resolves.toBe(1);
    await expect(database.events.count()).resolves.toBe(1);
    await expect(database.eventInventories.count()).resolves.toBe(1);
    await expect(database.expenses.count()).resolves.toBe(1);
    await expect(database.bundles.count()).resolves.toBe(1);
    await expect(database.eventInventories.toArray()).resolves.toMatchObject([
      { reservationMemo: "田中さん" },
    ]);
    await expect(database.bundleItems.toArray()).resolves.toMatchObject([
      { quantity: 2 },
    ]);
  });
});
