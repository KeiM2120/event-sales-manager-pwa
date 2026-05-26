import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders children and top navigation", async () => {
    const onNavigate = vi.fn();
    render(
      <AppShell current="home" onNavigate={onNavigate}>
        <p>ホーム本文</p>
      </AppShell>,
    );

    expect(screen.getByText("ホーム本文")).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "画面切り替え" });
    expect(navigation).toHaveClass("top-0");
    expect(navigation).not.toHaveClass("bottom-0");
    expect(screen.getByRole("button", { name: "ホーム" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "統計" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "管理" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "設定" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "会計" }));
    expect(onNavigate).toHaveBeenCalledWith("checkout");
  });
});
