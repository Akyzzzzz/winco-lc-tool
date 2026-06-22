import { Network } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink">
        <Network className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="font-display text-[19px] font-bold leading-tight tracking-tight text-ink">
          WINCO LC Assignment Tool
        </h1>
        <p className="text-[13px] text-muted">
          Deterministic Local Committee assignment from company headquarters
        </p>
      </div>
    </header>
  );
}
