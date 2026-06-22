import { Building2, CheckCircle2, CircleSlash, AlertTriangle, MapPinned } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardStats } from "@/types";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  activeFilter: string | null;
  onFilterClick: (filter: string | null) => void;
}

export function SummaryCards({ stats, isLoading, activeFilter, onFilterClick }: SummaryCardsProps) {
  const cards = [
    {
      key: "all",
      label: "Total Companies",
      value: stats?.totalCompanies,
      icon: Building2,
      accent: "text-ink",
      iconBg: "bg-ink/5",
    },
    {
      key: "Assigned",
      label: "Assigned",
      value: stats?.assignedCompanies,
      icon: CheckCircle2,
      accent: "text-success",
      iconBg: "bg-success-soft",
    },
    {
      key: "Unmatched",
      label: "Unmatched",
      value: stats?.unmatchedCompanies,
      icon: CircleSlash,
      accent: "text-danger",
      iconBg: "bg-danger-soft",
    },
    {
      key: "Manual Review Required",
      label: "Manual Review",
      value: stats?.manualReviewCompanies,
      icon: AlertTriangle,
      accent: "text-warning",
      iconBg: "bg-warning-soft",
    },
    {
      key: "lcs",
      label: "Total LCs",
      value: stats?.totalLcs,
      icon: MapPinned,
      accent: "text-accent",
      iconBg: "bg-accent/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isClickable = card.key === "all" || card.key !== "lcs";
        const isActive = activeFilter === card.key || (card.key === "all" && activeFilter === null);

        return (
          <Card
            key={card.key}
            onClick={() => {
              if (!isClickable) return;
              onFilterClick(card.key === "all" ? null : card.key);
            }}
            className={cn(
              "transition-all",
              isClickable && "cursor-pointer hover:-translate-y-0.5 hover:shadow-popover",
              isActive && isClickable && "ring-2 ring-accent/40"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium uppercase tracking-wide text-muted">
                  {card.label}
                </span>
                <span className={cn("rounded-lg p-1.5", card.iconBg)}>
                  <Icon className={cn("h-3.5 w-3.5", card.accent)} />
                </span>
              </div>
              {isLoading ? (
                <Skeleton className="mt-2 h-8 w-16" />
              ) : (
                <p className={cn("mt-1 font-display text-[28px] font-bold tabular-nums tracking-tight", card.accent)}>
                  {card.value ?? 0}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
