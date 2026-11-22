// Owner workspace frame: top bar with nav, breadcrumb on nested pages,
// content area. The prospect-facing talk page does not use this.
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ChevronRight, LogoMark } from "@/components/icons";

type Crumb = { label: string; href?: string };

const NAV = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "leads", label: "Leads", href: "/#leads" },
] as const;

export function AppShell({
  crumbs,
  active,
  workspace,
  children,
}: {
  crumbs: Crumb[];
  active?: (typeof NAV)[number]["key"];
  workspace?: string | null;
  children: ReactNode;
}) {
  const name = workspace?.trim() || "Your business";
  // A trail only helps once you are below the top level.
  const nested = crumbs.some((c) => c.href);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/80 px-4 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 sm:gap-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-medium tracking-tight"
          >
            <LogoMark size={18} />
            <span className="hidden min-[400px]:inline">Rehearsal Rep</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            {NAV.map(({ key, label, href }) => (
              <Link
                key={key}
                href={href}
                aria-current={active === key ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  active === key ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-4">
            <p className="hidden items-center gap-2 text-xs text-muted md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
              Nothing sends without your approval
            </p>
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-raised py-1 pr-3 pl-1">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-canvas">
                {name.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[9rem] truncate text-sm">{name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {nested && (
          <nav
            aria-label="Breadcrumb"
            className="mx-auto mb-6 flex max-w-6xl min-w-0 items-center gap-2 text-sm"
          >
            {crumbs.map((c, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <ChevronRight size={14} className="shrink-0 text-faint" />
                )}
                {c.href ? (
                  <Link
                    href={c.href}
                    className="truncate text-muted hover:text-ink"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate">{c.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
        )}
        {children}
      </main>
    </div>
  );
}
