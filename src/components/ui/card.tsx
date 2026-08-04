import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  title,
  children,
  action,
  className,
  padded = true,
}: Readonly<{
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  padded?: boolean;
}>) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]",
        padded && "p-5",
        className,
      )}
    >
      {title || action ? (
        <div className={cn("flex items-start justify-between gap-3", padded ? "" : "px-5 pt-5")}>
          {title ? <h2 className="font-display text-xl text-[var(--ink)]">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className={cn(title || action ? (padded ? "mt-4" : "mt-4 px-5 pb-5") : undefined)}>
        {children}
      </div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  warn,
  active,
  onClick,
  interactiveLabel,
}: Readonly<{
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
  active?: boolean;
  onClick?: () => void;
  /** Shown when interactive (e.g. "Select" / "Filtering") */
  interactiveLabel?: boolean;
}>) {
  const shell = cn(
    "rounded-[var(--radius-xl)] border bg-[var(--surface)] p-4 text-left transition",
    active
      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]"
      : "border-[var(--border)]",
    onClick && !active && "hover:border-[var(--accent)] hover:bg-[var(--surface-2)]",
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-label">{label}</p>
        {interactiveLabel && onClick ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
            {active ? "Filtering" : "Select"}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1 font-display text-3xl font-semibold tracking-tight",
          warn ? "text-[var(--warning)]" : "text-[var(--ink)]",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--ink-muted)]">{hint}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shell}>
        {body}
      </button>
    );
  }

  return <div className={shell}>{body}</div>;
}
