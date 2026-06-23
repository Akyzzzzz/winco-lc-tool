import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SECTOR_VALUES, SectorValue } from "@/types";

interface SectorDistributionCardProps {
  distribution: Record<SectorValue, number> | null;
  isLoading: boolean;
}

export function SectorDistributionCard({ distribution, isLoading }: SectorDistributionCardProps) {
  const total = distribution ? SECTOR_VALUES.reduce((sum, s) => sum + distribution[s], 0) : 0;

  const rows = SECTOR_VALUES.map((sector) => ({
    sector,
    count: distribution?.[sector] ?? 0,
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sector Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[230px] w-full" />
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted">No companies yet.</p>
        ) : (
          <ul className="flex max-h-[230px] flex-col gap-2.5 overflow-auto">
            {rows.map(({ sector, count }) => {
              const pct = total === 0 ? 0 : Math.round((count / total) * 100);
              return (
                <li key={sector} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 truncate text-[13px] text-ink">{sector}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-14 shrink-0 text-right text-[12px] tabular-nums text-muted">
                    {count} · {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
