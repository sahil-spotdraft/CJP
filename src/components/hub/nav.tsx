"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/hub/notification-bell";

const links = [
  { href: "/", label: "Feature Requests" },
  { href: "/analytics", label: "Analytics" },
  { href: "/retention", label: "Retention" },
  { href: "/consolidation", label: "Consolidation" },
  { href: "/cs-owners", label: "CS Owners" },
  { href: "/orgs", label: "Orgs" },
  { href: "/settings", label: "Settings" },
];

export function HubNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3.5">
        <div className="flex min-w-0 items-center gap-8">
          <Link
            href="/"
            className="font-display shrink-0 text-xl tracking-tight text-[var(--ink)]"
          >
            Moonshot
          </Link>
          <nav className="flex flex-wrap items-center gap-0.5" aria-label="Primary">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/" || pathname.startsWith("/product-requests")
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition",
                    active
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                      : "text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
