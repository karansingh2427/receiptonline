import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function TopBar({
  showExport,
  onExport,
  exporting,
  right,
}: {
  showExport?: boolean;
  onExport?: () => void;
  exporting?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-foreground/90 bg-paper/95 px-4 pb-3 pt-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <Link to="/app" className="flex items-center gap-2 no-underline">
          <div className="grid size-9 place-items-center rounded-xl bg-ink text-paper">
            <span className="text-[15px] font-bold leading-none">R</span>
          </div>
          <div className="leading-none">
            <p className="text-[15px] font-semibold tracking-tight text-ink">Renovi</p>
            <p className="mt-0.5 text-[10px] text-ink-soft">Flat renovation · receipts</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {right}
          {showExport && (
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-panel px-3 py-2 text-[12px] font-semibold text-ink ring-1 ring-ink/15 transition",
                exporting ? "opacity-60" : "active:scale-95",
              )}
            >
              <span className="inline-block size-1.5 rounded-full bg-good" />
              {exporting ? "Exporting…" : "Export"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
