import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "duplicate";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-canvas text-muted border border-border",
  accent: "bg-accent/10 text-accent border border-accent/20",
  success: "bg-success-soft text-success border border-success/20",
  warning: "bg-warning-soft text-warning border border-warning/25",
  danger: "bg-danger-soft text-danger border border-danger/20",
  duplicate: "bg-duplicate-soft text-duplicate border border-duplicate/20",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium leading-5",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
