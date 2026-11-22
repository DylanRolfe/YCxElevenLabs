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
      className={`rounded-xl border border-line bg-white p-5 ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                {icon && <span className="text-muted">{icon}</span>}
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-muted">{subtitle}</p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-strong",
    secondary: "border border-line bg-white text-ink hover:bg-canvas",
    ghost: "text-brand hover:bg-brand-soft",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none";

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
      <span className="mb-1.5 block text-xs font-medium text-ink">
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
  tone?: "neutral" | "brand" | "solid";
}) {
  const styles = {
    neutral: "bg-[#efefea] text-muted",
    brand: "bg-brand-tint text-brand",
    solid: "bg-brand text-white",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${styles}`}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">
      {children}
    </p>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}
