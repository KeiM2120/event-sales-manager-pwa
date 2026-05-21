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
  },
  {
    id: "event-2",
    name: "文学フリマ東京",
    eventDate: "2026-12-06",
    series: "other",
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
  it("offers quick access to event-day screens with new props", async () => {
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

    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "会計へ" }));
    expect(onNavigate).toHaveBeenCalledWith("checkout");
  });

  it("shows and changes the selected event", async () => {
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

    expect(screen.getByText("コミティア150")).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText("イベントを選択"),
      "event-2",
    );

    expect(onEventChange).toHaveBeenCalledWith("event-2");
  });

  it("shows detailed setup status", async () => {
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

    expect(screen.getByText("セットアップ状態")).toBeInTheDocument();
    expect(screen.getByText("イベント")).toBeInTheDocument();
    expect(screen.getByText("商品")).toBeInTheDocument();
    expect(screen.getByText("セット")).toBeInTheDocument();
    expect(screen.getByText("在庫")).toBeInTheDocument();
    expect(screen.getByText("会計可能状態")).toBeInTheDocument();
    expect(screen.getByText("セットは任意です")).toBeInTheDocument();
    expect(screen.getByText("会計を開始できます")).toBeInTheDocument();
    expect(screen.getByText("2件")).toBeInTheDocument();
    expect(screen.getAllByText("1件")).toHaveLength(2);
    expect(screen.getByText("0件")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "商品の管理タブへ" }));
    expect(onNavigate).toHaveBeenCalledWith("management", {
      managementSection: "products",
    });
  });

  it("routes setup status rows to their matching management tabs", async () => {
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

    await userEvent.click(screen.getByRole("button", { name: "イベントの管理タブへ" }));
    await userEvent.click(screen.getByRole("button", { name: "商品の管理タブへ" }));
    await userEvent.click(screen.getByRole("button", { name: "セットの管理タブへ" }));
    await userEvent.click(screen.getByRole("button", { name: "在庫の管理タブへ" }));
    await userEvent.click(
      screen.getByRole("button", { name: "会計可能状態の管理タブへ" }),
    );

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
    expect(onNavigate).toHaveBeenNthCalledWith(5, "management", {
      managementSection: "inventory",
    });
  });
});
