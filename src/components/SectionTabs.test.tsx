import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SectionTabs } from "./SectionTabs";

describe("SectionTabs", () => {
  it("switches between provided sections", async () => {
    const onChange = vi.fn();
    render(
      <SectionTabs
        value="products"
        onChange={onChange}
        items={[
          { value: "products", label: "頒布物" },
          { value: "events", label: "イベント" },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "イベント" }));
    expect(onChange).toHaveBeenCalledWith("events");
  });
});
