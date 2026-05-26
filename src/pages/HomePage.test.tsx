import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Bundle, Event, EventInventory, Product } from "../domain/types";
import { HomePage } from "./HomePage";

const events: Event[] = [
  {
    id: "event-1",
    name: "コミティア150",
    eventDate: "2026-11-23",
    series: "other",
    circleSpace: "東A-01a",
  },
  {
    id: "event-2",
    name: "文学フリマ東京",
    eventDate: "2026-12-06",
    series: "other",
    isClosed: true,
  },
];

const products: Product[] = [
  {
    id: "book-1",
    name: "新刊",
    productGenre: "book",
    defaultPrice: 1000,
    isActive: true,
  },
];

const bundles: Bundle[] = [];

const inventories: EventInventory[] = [
  {
    eventId: "event-1",
    productId: "book-1",
    initialStock: 40,
    reservedStock: 3,
  },
];

describe("HomePage", () => {
  it("shows selected event and keeps event switching available", async () => {
    const onEventChange = vi.fn();
    render(
      <HomePage
        events={events}
        products={products}
        bundles={bundles}
        inventories={inventories}
        selectedEventId="event-1"
        onEventChange={onEventChange}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument();
    expect(screen.getByText("選択中イベント")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "コミティア150" })).toBeInTheDocument();
    expect(screen.getByText("2026-11-23")).toBeInTheDocument();
    expect(screen.getByText("東A-01a")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("イベントを選択"), "event-2");

    expect(onEventChange).toHaveBeenCalledWith("event-2");
  });

  it("shows four setup rows and routes each row to the matching management tab", async () => {
    const onNavigate = vi.fn();
    render(
      <HomePage
        events={events}
        products={products}
        bundles={bundles}
        inventories={inventories}
        selectedEventId="event-1"
        onEventChange={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByText("セットアップ状況")).toBeInTheDocument();
    expect(screen.getByText("イベント")).toBeInTheDocument();
    expect(screen.getByText("頒布物")).toBeInTheDocument();
    expect(screen.getByText("セット")).toBeInTheDocument();
    expect(screen.getByText("在庫")).toBeInTheDocument();
    expect(screen.queryByText("会計可能状況")).not.toBeInTheDocument();
    expect(screen.getByText("セットは任意です")).toBeInTheDocument();
    expect(screen.getByText("2件")).toBeInTheDocument();
    expect(screen.getAllByText("1件")).toHaveLength(2);
    expect(screen.getByText("0件")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "イベントの管理タブへ" }));
    await userEvent.click(screen.getByRole("button", { name: "頒布物の管理タブへ" }));
    await userEvent.click(screen.getByRole("button", { name: "セットの管理タブへ" }));
    await userEvent.click(screen.getByRole("button", { name: "在庫の管理タブへ" }));

    expect(onNavigate).toHaveBeenNthCalledWith(1, "management", {
      managementSection: "events",
    });
    expect(onNavigate).toHaveBeenNthCalledWith(2, "management", {
      managementSection: "products",
    });
    expect(onNavigate).toHaveBeenNthCalledWith(3, "management", {
      managementSection: "bundles",
    });
    expect(onNavigate).toHaveBeenNthCalledWith(4, "management", {
      managementSection: "inventory",
    });
  });

  it("uses a bottom checkout button that is enabled only when checkout is ready", async () => {
    const onNavigate = vi.fn();
    const { rerender } = render(
      <HomePage
        events={events}
        products={products}
        bundles={bundles}
        inventories={inventories}
        selectedEventId="event-1"
        onEventChange={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "会計へ進む" }));
    expect(onNavigate).toHaveBeenCalledWith("checkout");

    rerender(
      <HomePage
        events={events}
        products={products}
        bundles={bundles}
        inventories={[]}
        selectedEventId="event-1"
        onEventChange={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByRole("button", { name: "会計へ進む" })).toBeDisabled();
  });
});
