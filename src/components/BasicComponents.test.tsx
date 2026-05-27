import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  DangerCard,
  HeroEventCard,
  InlineActionButton,
  PrimaryActionBar,
  ScreenTitle,
  StatusChip,
  SurfaceCard,
} from "./DesignSystem";
import { EmptyState } from "./EmptyState";
import { ErrorBanner } from "./ErrorBanner";
import { Modal } from "./Modal";
import { NumberField } from "./NumberField";

describe("basic components", () => {
  it("renders empty and error states", () => {
    render(
      <>
        <EmptyState title="未登録" body="まだデータがありません" />
        <ErrorBanner message="保存に失敗しました" />
      </>,
    );

    expect(screen.getByText("未登録")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("保存に失敗しました");
  });

  it("handles modal, confirm dialog, and number field actions", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const onChange = vi.fn();

    render(
      <>
        <Modal title="編集" onClose={onClose}>
          本文
        </Modal>
        <ConfirmDialog
          title="確認"
          message="実行しますか"
          confirmLabel="実行"
          onCancel={onClose}
          onConfirm={onConfirm}
        />
        <NumberField label="数量" value={1} min={0} onChange={onChange} />
      </>,
    );

    const modal = screen.getByRole("dialog", { name: "編集" });
    expect(modal).toHaveClass("max-h-[calc(100vh-2rem)]");
    expect(modal.querySelector(".overflow-y-auto")).toHaveTextContent("本文");
    await userEvent.click(screen.getByRole("button", { name: "閉じる" }));
    await userEvent.click(screen.getByRole("button", { name: "実行" }));
    expect(screen.queryByRole("button", { name: "数量を減らす" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "数量を増やす" })).not.toBeInTheDocument();

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalled();
  });

  it("lets zero-valued number fields be replaced without keeping the leading zero", async () => {
    const onChange = vi.fn();

    render(<NumberField label="価格" value={0} min={0} onChange={onChange} />);

    const input = screen.getByRole("spinbutton", { name: "価格" });

    await userEvent.click(input);
    expect(input).toHaveValue(null);

    await userEvent.type(input, "1200");

    expect(onChange).toHaveBeenLastCalledWith(1200);
    expect(input).toHaveValue(1200);
  });

  it("normalizes an empty number field on blur to a non-zero minimum", async () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <NumberField label="取り置き数" value={5} min={3} onChange={onChange} />,
    );

    const input = screen.getByRole("spinbutton", { name: "取り置き数" });

    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.tab();

    expect(onChange).toHaveBeenLastCalledWith(3);

    rerender(<NumberField label="取り置き数" value={3} min={3} onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByRole("spinbutton", { name: "取り置き数" })).toHaveValue(3);
    });
  });

  it("normalizes an empty number field on blur to zero when minimum is omitted", async () => {
    const onChange = vi.fn();

    const { rerender } = render(<NumberField label="追加数" value={0} onChange={onChange} />);

    const input = screen.getByRole("spinbutton", { name: "追加数" });

    await userEvent.click(input);
    await userEvent.tab();

    expect(onChange).toHaveBeenLastCalledWith(0);

    rerender(<NumberField label="追加数" value={0} onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByRole("spinbutton", { name: "追加数" })).toHaveValue(0);
    });
  });

  it("renders design system cards and status chips with accessible labels", () => {
    render(
      <>
        <SurfaceCard ariaLabel="売上サマリー">
          <ScreenTitle subtitle="本日の会場">イベント管理</ScreenTitle>
          <StatusChip tone="ok">準備完了</StatusChip>
        </SurfaceCard>
        <HeroEventCard eventName="コミックマーケット" circleSpace="東A-01a" />
        <DangerCard title="在庫不足">残数を確認してください</DangerCard>
      </>,
    );

    expect(screen.getByRole("region", { name: "売上サマリー" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "イベント管理" })).toBeInTheDocument();
    expect(screen.getByText("本日の会場")).toBeInTheDocument();
    expect(screen.getByText("準備完了")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "コミックマーケット" })).toBeInTheDocument();
    expect(screen.getByText("東A-01a")).toBeInTheDocument();
    expect(screen.queryByText("開催イベント")).not.toBeInTheDocument();
    expect(screen.getByText("在庫不足")).toBeInTheDocument();
  });

  it("renders fixed bottom action area and inline actions", () => {
    render(
      <PrimaryActionBar summary="合計 1,500円">
        <InlineActionButton tone="main">会計する</InlineActionButton>
      </PrimaryActionBar>,
    );

    expect(screen.getByRole("region", { name: "主要操作" })).toHaveClass("fixed");
    expect(screen.getByText("合計 1,500円")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "会計する" })).toBeInTheDocument();
  });
});
