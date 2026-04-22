"use client";
import { CELESTRAK_GROUPS } from "@/lib/categories";
import { useStore } from "@/hooks/useStore";
import { useTLEData } from "@/hooks/useTLEData";
import { cn } from "@/lib/utils";
import type { OrbitCategory } from "@/types/satellite";

function CategoryRow({ group }: { group: (typeof CELESTRAK_GROUPS)[number] }) {
  const { enabledCategories, toggleCategory } = useStore();
  const { satellites, isLoading, error } = useTLEData(group.id as OrbitCategory);
  const enabled = enabledCategories.has(group.id as OrbitCategory);

  return (
    <button
      onClick={() => toggleCategory(group.id as OrbitCategory)}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors w-full text-left",
        enabled
          ? "bg-slate-800/70 text-slate-100"
          : "text-slate-500 hover:bg-slate-800/40 hover:text-slate-300"
      )}
    >
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ background: enabled ? group.color : "#475569" }}
      />
      <span className="flex-1">{group.label}</span>
      {enabled && (
        <span className="text-[10px] tabular-nums text-slate-500 ml-auto">
          {isLoading ? "…" : error ? "err" : satellites.length}
        </span>
      )}
    </button>
  );
}

export function CategoryFilter() {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
        Categories
      </p>
      {CELESTRAK_GROUPS.map((group) => (
        <CategoryRow key={group.id} group={group} />
      ))}
    </div>
  );
}
