import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/status";
import { StatusValue } from "@/types";

type PipelineColor = ReturnType<typeof colorOf>;

function colorOf(status: StatusValue) {
  return STATUS_CONFIG[status].color;
}

// Every Tailwind class referenced below appears as a complete, literal
// string here (not built via template interpolation), so Tailwind's content
// scanner can actually find and generate them — dynamic class names like
// `bg-pipeline-${color}` would otherwise get purged from the production build.
const BADGE_CLASSES: Record<PipelineColor, string> = {
  gray: "bg-pipeline-gray-soft text-pipeline-gray border border-pipeline-gray/20",
  yellow: "bg-pipeline-yellow-soft text-pipeline-yellow border border-pipeline-yellow/20",
  blue: "bg-pipeline-blue-soft text-pipeline-blue border border-pipeline-blue/20",
  orange: "bg-pipeline-orange-soft text-pipeline-orange border border-pipeline-orange/20",
  teal: "bg-pipeline-teal-soft text-pipeline-teal border border-pipeline-teal/20",
  green: "bg-pipeline-green-soft text-pipeline-green border border-pipeline-green/20",
  red: "bg-pipeline-red-soft text-pipeline-red border border-pipeline-red/20",
  purple: "bg-pipeline-purple-soft text-pipeline-purple border border-pipeline-purple/20",
};

const DOT_CLASSES: Record<PipelineColor, string> = {
  gray: "bg-pipeline-gray",
  yellow: "bg-pipeline-yellow",
  blue: "bg-pipeline-blue",
  orange: "bg-pipeline-orange",
  teal: "bg-pipeline-teal",
  green: "bg-pipeline-green",
  red: "bg-pipeline-red",
  purple: "bg-pipeline-purple",
};

export function CrmStatusBadge({ status, className }: { status: StatusValue; className?: string }) {
  const config = STATUS_CONFIG[status];
  const color = colorOf(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium leading-5",
        BADGE_CLASSES[color],
        className
      )}
      title={config.description}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[color])} />
      {config.label}
    </span>
  );
}
