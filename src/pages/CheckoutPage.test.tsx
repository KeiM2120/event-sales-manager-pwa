import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
});
