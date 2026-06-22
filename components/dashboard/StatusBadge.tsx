import { CheckCircle2, CircleSlash, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AssignmentStatus } from "@/types";

const STATUS_CONFIG: Record<
  AssignmentStatus,
  { tone: "success" | "danger" | "warning"; icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  Assigned: { tone: "success", icon: CheckCircle2, label: "Assigned" },
  Unmatched: { tone: "danger", icon: CircleSlash, label: "Unmatched" },
  "Manual Review Required": { tone: "warning", icon: AlertTriangle, label: "Manual Review" },
};

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge tone={config.tone}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
