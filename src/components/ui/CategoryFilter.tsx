"use client";
import { CELESTRAK_GROUPS } from "@/lib/categories";
import { useStore } from "@/hooks/useStore";
import { cn } from "@/lib/utils";

export function CategoryFilter() {
  const { enabledCategories, toggleCategory } = useStore();

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
        Categories
      </p>
      {CELESTRAK_GROUPS.map((group) => {
        const enabled = enabledCategories.has(group.id);
        return (
          <button
            key={group.id}
            onClick={() => toggleCategory(group.id)}
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
            {group.label}
          </button>
        );
      })}
    </div>
  );
}
