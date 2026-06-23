import { STATUS_VALUES, StatusValue } from "@/types";

// ============================================================================
// CRM STATUS PIPELINE
// ============================================================================

/** Resolves a raw sheet cell value into a valid StatusValue, defaulting to EMPTY. */
export function resolveStatus(raw: string): StatusValue {
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, "_");
  const match = STATUS_VALUES.find((v) => v === trimmed);
  return match ?? "EMPTY";
}

export function isValidStatus(value: string): value is StatusValue {
  return (STATUS_VALUES as readonly string[]).includes(value);
}

interface StatusConfig {
  label: string;
  /** Tailwind color token suffix, e.g. "gray" -> bg-pipeline-gray-soft / text-pipeline-gray */
  color: "gray" | "yellow" | "blue" | "orange" | "teal" | "green" | "red" | "purple";
  description: string;
}

// Per the brief's color spec, plus "teal" for MEETING_SCHEDULED (not listed
// in the original 7 colors — there are 8 statuses, so a distinct color was
// added between IN_CONTACT (orange) and APPROVED (green) for the funnel's
// penultimate stage).
export const STATUS_CONFIG: Record<StatusValue, StatusConfig> = {
  EMPTY: { label: "Empty", color: "gray", description: "No outreach started yet." },
  MAIL_TO_SEND: { label: "Mail to Send", color: "yellow", description: "Queued for first outreach." },
  MAIL_SENT: { label: "Mail Sent", color: "blue", description: "Outreach sent, awaiting response." },
  IN_CONTACT: { label: "In Contact", color: "orange", description: "Actively corresponding." },
  MEETING_SCHEDULED: { label: "Meeting Scheduled", color: "teal", description: "A meeting has been booked." },
  APPROVED: { label: "Approved", color: "green", description: "Partnership approved." },
  REJECTED: { label: "Rejected", color: "red", description: "Declined or not proceeding." },
  ON_HOLD: { label: "On Hold", color: "purple", description: "Paused — revisit later." },
};

/**
 * Controlled state-machine transitions. Each status lists which statuses it
 * may move to next. ON_HOLD and REJECTED act as safety valves reachable
 * from most active stages; ON_HOLD can resume back into any active stage.
 */
const TRANSITIONS: Record<StatusValue, StatusValue[]> = {
  EMPTY: ["MAIL_TO_SEND", "ON_HOLD"],
  MAIL_TO_SEND: ["MAIL_SENT", "ON_HOLD", "REJECTED"],
  MAIL_SENT: ["IN_CONTACT", "ON_HOLD", "REJECTED"],
  IN_CONTACT: ["MEETING_SCHEDULED", "ON_HOLD", "REJECTED"],
  MEETING_SCHEDULED: ["APPROVED", "REJECTED", "ON_HOLD"],
  APPROVED: ["ON_HOLD"],
  REJECTED: ["MAIL_TO_SEND"], // allow reopening a previously-rejected lead
  ON_HOLD: ["MAIL_TO_SEND", "MAIL_SENT", "IN_CONTACT", "MEETING_SCHEDULED"],
};

/** Valid next statuses from the current one (always includes staying the same). */
export function getAllowedNextStatuses(current: StatusValue): StatusValue[] {
  return [current, ...(TRANSITIONS[current] ?? [])];
}

/** Whether moving from `from` to `to` is a legal state-machine transition. */
export function canTransition(from: StatusValue, to: StatusValue): boolean {
  if (from === to) return true;
  return (TRANSITIONS[from] ?? []).includes(to);
}

/** Pipeline stage order, used for funnel/conversion math and sorting. */
export const PIPELINE_ORDER: StatusValue[] = [
  "EMPTY",
  "MAIL_TO_SEND",
  "MAIL_SENT",
  "IN_CONTACT",
  "MEETING_SCHEDULED",
  "APPROVED",
];
