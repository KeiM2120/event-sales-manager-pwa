import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CheckoutPage } from "./CheckoutPage";

describe("CheckoutPage", () => {
  it("adds a product and removes it by decrementing to zero", async () => {
    render(<CheckoutPage eventId="event-1" />);

    await userEvent.click(screen.getByRole("button", { name: "新刊 1000円" }));
    expect(screen.getByText("新刊 x1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "新刊を減らす" }));
    expect(screen.queryByText("新刊 x1")).not.toBeInTheDocument();
  });
});
