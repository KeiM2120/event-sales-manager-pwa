import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ManagementPage } from "./ManagementPage";

describe("ManagementPage", () => {
  it("switches management sections", async () => {
    render(<ManagementPage />);

    expect(screen.getByRole("heading", { name: "管理" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "在庫" }));
    expect(screen.getByText("在庫はイベント別に管理します")).toBeInTheDocument();
  });
});
