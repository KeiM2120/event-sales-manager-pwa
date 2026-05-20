import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsPage } from "./SettingsPage";

describe("SettingsPage", () => {
  it("shows CSV and PWA controls", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "設定" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "会計CSV" })).toBeInTheDocument();
    expect(screen.getByText("PWA更新")).toBeInTheDocument();
  });
});
