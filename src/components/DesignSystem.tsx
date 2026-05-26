import type { ReactNode } from "react";

interface ScreenTitleProps {
  children: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

interface SurfaceCardProps {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
}

type StatusChipTone = "main" | "sub" | "accent" | "ok" | "warn" | "error" | "muted";

interface StatusChipProps {
  children: ReactNode;
  tone?: StatusChipTone;
}

interface HeroEventCardProps {
  eventName: string;
  circleSpace?: string;
  children?: ReactNode;
}

interface PrimaryActionBarProps {
  children: ReactNode;
  summary?: ReactNode;
}

type InlineActionButtonTone = "main" | "danger" | "neutral";

interface InlineActionButtonProps {
  children: ReactNode;
  tone?: InlineActionButtonTone;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
}

interface DangerCardProps {
  title: ReactNode;
  children: ReactNode;
}

const statusToneClasses: Record<StatusChipTone, string> = {
  main: "bg-[color:var(--color-main)]/15 text-[color:var(--color-main)]",
  sub: "bg-[color:var(--color-sub)]/35 text-[color:var(--color-text)]",
  accent: "bg-[color:var(--color-accent)]/20 text-[color:var(--color-text)]",
  ok: "bg-green-50 text-[color:var(--color-ok)]",
  warn: "bg-amber-50 text-[color:var(--color-warn)]",
  error: "bg-red-50 text-[color:var(--color-error)]",
  muted: "bg-slate-100 text-[color:var(--color-muted)]",
};

const buttonToneClasses: Record<InlineActionButtonTone, string> = {
  main: "bg-[color:var(--color-main)] text-white active:bg-[color:var(--color-main)]/90",
  danger: "bg-[color:var(--color-error)] text-white active:bg-[color:var(--color-error)]/90",
  neutral: "bg-white text-[color:var(--color-text)] ring-1 ring-slate-200 active:bg-slate-50",
};

export function ScreenTitle({ children, subtitle, action }: ScreenTitleProps) {
  return (
    <header className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate-one-line text-2xl font-bold leading-tight text-[color:var(--color-text)]">
          {children}
        </h1>
        {subtitle ? (
          <p className="truncate-one-line mt-1 text-sm font-medium text-[color:var(--color-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function SurfaceCard({ children, ariaLabel, className }: SurfaceCardProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={[
        "rounded-lg bg-[color:var(--color-card)] p-4 shadow-[var(--shadow-card)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}

export function StatusChip({ children, tone = "muted" }: StatusChipProps) {
  return (
    <span
      className={[
        "inline-flex min-h-7 max-w-full items-center rounded-full px-3 text-sm font-bold",
        statusToneClasses[tone],
      ].join(" ")}
    >
      <span className="truncate-one-line">{children}</span>
    </span>
  );
}

export function HeroEventCard({ eventName, circleSpace, children }: HeroEventCardProps) {
  return (
    <section className="rounded-lg bg-[color:var(--color-main)] p-5 text-white shadow-[var(--shadow-card)]">
      <h2 className="truncate-one-line text-3xl font-bold leading-tight">{eventName}</h2>
      {circleSpace ? <p className="truncate-one-line mt-2 text-base font-semibold">{circleSpace}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export function PrimaryActionBar({ children, summary }: PrimaryActionBarProps) {
  return (
    <section
      aria-label="主要操作"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_28px_rgb(23_32_51_/_0.10)] backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        {summary ? (
          <div className="truncate-one-line min-w-0 flex-1 text-sm font-bold text-[color:var(--color-text)]">
            {summary}
          </div>
        ) : null}
        <div className={summary ? "shrink-0" : "w-full"}>{children}</div>
      </div>
    </section>
  );
}

export function InlineActionButton({
  children,
  tone = "neutral",
  type = "button",
  onClick,
  disabled = false,
}: InlineActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-base font-bold disabled:cursor-not-allowed disabled:opacity-50",
        buttonToneClasses[tone],
      ].join(" ")}
    >
      <span className="truncate-one-line">{children}</span>
    </button>
  );
}

export function DangerCard({ title, children }: DangerCardProps) {
  return (
    <section className="rounded-lg border border-[color:var(--color-error)] bg-red-50 p-4 text-[color:var(--color-error)]">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="mt-2 text-sm font-medium">{children}</div>
    </section>
  );
}
