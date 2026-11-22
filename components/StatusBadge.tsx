import type { LeadStatus } from "@/lib/types";

const STYLES: Record<LeadStatus, string> = {
  found: "bg-slate-100 text-slate-700",
  drafted: "bg-amber-100 text-amber-800",
  rehearsed: "bg-violet-100 text-violet-800",
  approved: "bg-blue-100 text-blue-800",
  sent: "bg-cyan-100 text-cyan-800",
  talked: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STYLES[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}
