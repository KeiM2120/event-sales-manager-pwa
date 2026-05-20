import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatisticsPage } from "./StatisticsPage";

describe("StatisticsPage", () => {
  it("shows statistic labels", () => {
    render(<StatisticsPage />);

    expect(screen.getByRole("heading", { name: "統計" })).toBeInTheDocument();
    expect(screen.getByText("総売上")).toBeInTheDocument();
    expect(screen.getByText("利益")).toBeInTheDocument();
  });
});
