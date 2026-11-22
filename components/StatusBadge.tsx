import { Pill } from "@/components/ui";
import type { LeadStatus } from "@/lib/types";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  found: "Found",
  drafted: "Drafted",
  rehearsed: "Needs approval",
  approved: "Approved",
  sent: "Sent",
  talked: "Talked",
};

// What the owner (or the pipeline) does next for a lead in each status.
export const NEXT_STEP: Record<LeadStatus, { label: string; yours: boolean }> =
  {
    found: { label: "Draft email", yours: true },
    drafted: { label: "Rehearse on buyer panel", yours: false },
    rehearsed: { label: "Review and approve", yours: true },
    approved: { label: "Send email", yours: true },
    sent: { label: "Waiting for the call", yours: false },
    talked: { label: "Read lead card", yours: true },
  };

const TONE: Record<LeadStatus, "neutral" | "brand" | "solid"> = {
  found: "neutral",
  drafted: "neutral",
  rehearsed: "brand",
  approved: "brand",
  sent: "neutral",
  talked: "solid",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Pill tone={TONE[status] ?? "neutral"}>
      {STATUS_LABEL[status] ?? status}
    </Pill>
  );
}
