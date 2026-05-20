import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";
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

    await userEvent.click(screen.getByRole("button", { name: "閉じる" }));
    await userEvent.click(screen.getByRole("button", { name: "実行" }));
    await userEvent.click(screen.getByRole("button", { name: "数量を増やす" }));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
