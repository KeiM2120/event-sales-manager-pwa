import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center bg-slate-950/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col rounded-md bg-white p-4 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" className="min-h-11 rounded-md px-3 font-bold" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="mt-4 overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}
