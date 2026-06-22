import { Copy } from "lucide-react";

interface DuplicateBannerProps {
  count: number;
  onShowDuplicates: () => void;
}

export function DuplicateBanner({ count, onShowDuplicates }: DuplicateBannerProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-duplicate/20 bg-duplicate-soft px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-duplicate">
        <Copy className="h-4 w-4 shrink-0" />
        <span>
          <strong className="font-semibold">{count}</strong> compan{count === 1 ? "y" : "ies"} flagged
          as possible duplicate{count === 1 ? "" : "s"} by name. Records are never merged automatically.
        </span>
      </div>
      <button
        onClick={onShowDuplicates}
        className="shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium text-duplicate underline-offset-2 hover:underline"
      >
        Review
      </button>
    </div>
  );
}
