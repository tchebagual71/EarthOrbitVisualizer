"use client";
import { CELESTRAK_GROUPS } from "@/lib/categories";
import { useStore } from "@/hooks/useStore";
import { useTLEData } from "@/hooks/useTLEData";
import { cn } from "@/lib/utils";
import type { OrbitCategory } from "@/types/satellite";

function CategoryRow({ group }: { group: (typeof CELESTRAK_GROUPS)[number] }) {
  const enabledCategories = useStore((s) => s.enabledCategories);
  const toggleCategory = useStore((s) => s.toggleCategory);
  const enabled = enabledCategories.has(group.id as OrbitCategory);
  const { satellites, isLoading, error, retry } = useTLEData(group.id as OrbitCategory, enabled);

  return (
    <div
      className={cn(
        "flex items-center rounded-md min-h-[44px] text-sm transition-colors w-full",
        enabled
          ? "bg-slate-800/70 text-slate-100"
          : "text-slate-500 hover:bg-slate-800/40 hover:text-slate-300 active:bg-slate-800/60"
      )}
    >
      <button
        onClick={() => toggleCategory(group.id as OrbitCategory)}
        aria-pressed={enabled}
        // 44px min height for Apple HIG touch target
        className="flex flex-1 items-center gap-2 px-2 min-h-[44px] text-left"
      >
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ background: enabled ? group.color : "#475569" }}
        />
        <span className="flex-1">{group.label}</span>
        {enabled && !error && (
          <span className="text-[10px] tabular-nums text-slate-500 ml-auto">
            {isLoading ? "…" : satellites.length}
          </span>
        )}
      </button>
      {enabled && error && (
        <button
          onClick={retry}
          className="mr-1.5 rounded px-1.5 py-1 text-[10px] text-red-400 hover:text-red-200 hover:bg-red-900/40 transition-colors flex-shrink-0"
          title={`Failed to load: ${error.message}`}
          aria-label={`Retry loading ${group.label}`}
        >
          ⟳ retry
        </button>
      )}
    </div>
  );
}

export function CategoryFilter() {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1 px-2">
        Categories
      </p>
      {CELESTRAK_GROUPS.map((group) => (
        <CategoryRow key={group.id} group={group} />
      ))}
    </div>
  );
}
