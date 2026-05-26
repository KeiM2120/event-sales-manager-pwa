interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <section
      role="alertdialog"
      aria-label={title}
      className="rounded-md border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-slate-700">{message}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="min-h-12 rounded-md border font-bold" onClick={onCancel}>
          キャンセル
        </button>
        <button
          type="button"
          className="min-h-12 rounded-md bg-slate-900 font-bold text-white"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </section>
  );
}
