import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("switches between top-level screens", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "会計" }));
    expect(screen.getByRole("heading", { name: "会計" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "管理" }));
    expect(screen.getByRole("heading", { name: "管理" })).toBeInTheDocument();
  });
});
