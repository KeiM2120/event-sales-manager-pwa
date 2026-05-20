import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  it("offers quick access to event-day screens", async () => {
    const onNavigate = vi.fn();
    render(<HomePage onNavigate={onNavigate} />);

    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "会計へ" }));
    expect(onNavigate).toHaveBeenCalledWith("checkout");
  });
});
