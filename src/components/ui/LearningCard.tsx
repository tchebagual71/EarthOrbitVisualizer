"use client";
import { useStore } from "@/hooks/useStore";
import { SHELL_DEFS } from "@/components/scene/OrbitalShells";

export function LearningCard() {
  const { learningShell, setLearningShell } = useStore();

  if (learningShell === null) return null;
  const shell = SHELL_DEFS[learningShell];
  if (!shell) return null;

  return (
    <div
      className="absolute z-30 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-600/60 shadow-2xl p-4 text-sm"
      style={{
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "min(90vw, 380px)",
        width: "100%",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-3">
          <div className="text-xs text-slate-400 mb-1 uppercase tracking-widest font-semibold">
            Orbital Shell
          </div>
          <h2 className="font-bold text-white text-base leading-snug">{shell.label}</h2>
        </div>
        <button
          onClick={() => setLearningShell(null)}
          className="flex h-11 w-11 -mt-1 -mr-1 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors text-lg"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-3 py-2 border-y border-slate-700/60">
        <Stat label="Period" value={shell.period} />
        <Stat label="Velocity" value={shell.velocity} />
        <Stat label="Altitude" value={`${shell.altKm.toLocaleString()} km`} />
      </div>

      {/* Description */}
      <p className="text-slate-300 text-xs leading-relaxed mb-3">{shell.body}</p>

      {/* Examples */}
      <div className="text-xs text-slate-500">
        <span className="text-slate-400 font-semibold">Examples: </span>
        {shell.examples}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-white font-mono text-xs font-semibold">{value}</div>
    </div>
  );
}
