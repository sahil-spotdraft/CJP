import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className="text-eyebrow">{eyebrow}</p> : null}
        <h1
          className={cn(
            "font-display text-3xl tracking-tight text-[var(--ink)]",
            eyebrow && "mt-1",
          )}
        >
          {title}
        </h1>
        {description ? (
          <div className="mt-1 text-sm text-[var(--ink-muted)]">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
