// Small shared UI pieces. Keep this file dumb: no data fetching.
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({
  title,
  subtitle,
  action,
  icon,
  children,
  className = "",
  id,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-2xl border border-line bg-panel p-5 ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-[15px] font-medium text-ink">
                {icon && <span className="text-muted">{icon}</span>}
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

// Shared so links can look like buttons too.
export const buttonClass = {
  base: "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
  primary: "bg-ink text-canvas hover:bg-white",
  secondary: "border border-line bg-raised text-ink hover:border-faint",
  ghost: "text-muted hover:bg-raised hover:text-ink",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      {...props}
      className={`${buttonClass.base} ${buttonClass[variant]} ${className}`}
    />
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-muted focus:ring-2 focus:ring-white/10 focus:outline-none";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "signal" | "solid";
}) {
  const styles = {
    neutral: "border-line bg-raised text-muted",
    signal: "border-signal/25 bg-signal/10 text-signal",
    solid: "border-ink bg-ink text-canvas",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${styles}`}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs text-faint">{children}</p>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {message}
    </p>
  );
}
