import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders children and bottom navigation", async () => {
    const onNavigate = vi.fn();
    render(
      <AppShell current="home" onNavigate={onNavigate}>
        <p>ホーム本文</p>
      </AppShell>,
    );

    expect(screen.getByText("ホーム本文")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "会計" }));
    expect(onNavigate).toHaveBeenCalledWith("checkout");
  });
});
