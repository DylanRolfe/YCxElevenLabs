// The report shown after the call: what the prospect needs, their real
// objection next to the one the panel predicted, and the next step.
import { Card, Eyebrow, Pill } from "@/components/ui";
import type { Lead } from "@/lib/types";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <dd className="mt-1 text-sm">{value || "Not captured"}</dd>
    </div>
  );
}

export function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Card
      title="Lead card"
      subtitle="What the call surfaced, next to what the rehearsal predicted."
      action={<Pill tone="solid">Call complete</Pill>}
      className="border-ink/30"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line p-3">
          <Eyebrow>Predicted objection (rehearsal)</Eyebrow>
          <p className="mt-1 text-sm">
            {lead.predicted_objection || "No prediction"}
          </p>
        </div>
        <div className="rounded-lg bg-raised p-3">
          <Eyebrow>Real objection (call)</Eyebrow>
          <p className="mt-1 text-sm">
            {lead.call_objection || "Not captured"}
          </p>
        </div>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Row label="Need" value={lead.call_need} />
        <Row label="Next step" value={lead.call_next_step} />
        <Row label="Interest" value={lead.call_interest} />
        <Row label="Summary" value={lead.call_summary} />
      </dl>
    </Card>
  );
}
