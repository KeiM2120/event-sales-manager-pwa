import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CheckoutPage } from "./CheckoutPage";

describe("CheckoutPage", () => {
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
    expect(checkoutDetails).toHaveClass("h-[20vh]");
    expect(checkoutDetailLines).toHaveClass("overflow-y-auto");
    expect(checkoutDetailLines).toHaveTextContent("新刊 x1");
  });
});
