// The report shown after the call: what the prospect needs, their real
// objection next to the one the panel predicted, and the next step.
import { Card } from "@/components/ui";
import type { Lead } from "@/lib/types";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value || "Not captured"}</dd>
    </div>
  );
}

export function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Card title="Lead card" className="border-emerald-300">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-violet-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
            Predicted objection (rehearsal)
          </p>
          <p className="mt-1 text-sm">
            {lead.predicted_objection || "No prediction"}
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Real objection (call)
          </p>
          <p className="mt-1 text-sm">
            {lead.call_objection || "Not captured"}
          </p>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Row label="Need" value={lead.call_need} />
        <Row label="Next step" value={lead.call_next_step} />
        <Row label="Interest" value={lead.call_interest} />
        <Row label="Summary" value={lead.call_summary} />
      </dl>
    </Card>
  );
}
