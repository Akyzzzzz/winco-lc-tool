"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { STATUS_CONFIG } from "@/lib/status";
import { STATUS_VALUES, StatusValue } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PipelineColor = ReturnType<typeof colorOf>;
function colorOf(status: StatusValue) {
  return STATUS_CONFIG[status].color;
}

// Raw CSS color functions (not Tailwind classes) since recharts needs an
// actual color value for SVG fill — these still resolve through the same
// --pipeline-* CSS variables defined in app/globals.css, so the chart always
// matches the badges elsewhere in the UI.
const COLOR_VARS: Record<PipelineColor, string> = {
  gray: "rgb(var(--pipeline-gray))",
  yellow: "rgb(var(--pipeline-yellow))",
  blue: "rgb(var(--pipeline-blue))",
  orange: "rgb(var(--pipeline-orange))",
  teal: "rgb(var(--pipeline-teal))",
  green: "rgb(var(--pipeline-green))",
  red: "rgb(var(--pipeline-red))",
  purple: "rgb(var(--pipeline-purple))",
};

interface StatusDistributionChartProps {
  distribution: Record<StatusValue, number> | null;
  isLoading: boolean;
}

export function StatusDistributionChart({ distribution, isLoading }: StatusDistributionChartProps) {
  const data = STATUS_VALUES.map((status) => ({
    status,
    label: STATUS_CONFIG[status].label,
    count: distribution?.[status] ?? 0,
    color: COLOR_VARS[colorOf(status)],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[230px] w-full" />
        ) : (
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="rgb(var(--border))" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "rgb(var(--muted))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={116}
                  tick={{ fontSize: 12, fill: "rgb(var(--ink))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgb(var(--canvas))" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid rgb(var(--border))",
                    fontSize: 12,
                    boxShadow: "none",
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {data.map((d) => (
                    <Cell key={d.status} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
