// Owner workspace frame: left sidebar, breadcrumb top bar, content area.
// The prospect-facing talk page does not use this.
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { BuildingIcon, ChevronRight, GridIcon } from "@/components/icons";

type Crumb = { label: string; href?: string };

const NAV = [
  { key: "overview", label: "Overview", href: "/", icon: GridIcon },
  { key: "leads", label: "Leads", href: "/#leads", icon: BuildingIcon },
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
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-sidebar px-4 py-6 md:flex">
        <Link
          href="/"
          className="block px-2 text-[10px] font-medium tracking-wider text-muted uppercase"
        >
          AI sales workspace
        </Link>

        <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand-tint text-xs font-semibold text-brand">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="truncate text-sm font-medium">{name}</span>
        </div>

        <p className="mt-7 px-2 text-[10px] font-semibold tracking-wider text-faint uppercase">
          Workspace
        </p>
        <nav className="mt-2 space-y-0.5">
          {NAV.map(({ key, label, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active === key
                  ? "bg-brand-tint font-medium text-brand"
                  : "text-muted hover:bg-white hover:text-ink"
              }`}
            >
              <Icon />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-lg bg-[#e9ebe4] p-4">
          <p className="text-xs font-semibold">Built to work with you</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Your rep researches and rehearses. You make the final call.
          </p>
          <p className="mt-3 text-xs font-medium text-brand">
            Human approval is on
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-line bg-canvas px-4 sm:px-8">
          <nav className="flex min-w-0 items-center gap-2 text-sm">
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
                  <span className="truncate font-medium">{c.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
        </div>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
