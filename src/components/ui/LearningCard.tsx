"use client";
import { useEffect, useCallback } from "react";
import { useStore } from "@/hooks/useStore";
import { SHELL_DEFS } from "@/components/scene/OrbitalShells";

export function LearningCard() {
  const learningShell = useStore((s) => s.learningShell);
  const setLearningShell = useStore((s) => s.setLearningShell);

  const close = useCallback(() => setLearningShell(null), [setLearningShell]);

  const prev = useCallback(() => {
    if (learningShell === null) return;
    setLearningShell(learningShell === 0 ? SHELL_DEFS.length - 1 : learningShell - 1);
  }, [learningShell, setLearningShell]);

  const next = useCallback(() => {
    if (learningShell === null) return;
    setLearningShell(learningShell === SHELL_DEFS.length - 1 ? 0 : learningShell + 1);
  }, [learningShell, setLearningShell]);

  useEffect(() => {
    if (learningShell === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")      close();
      if (e.key === "ArrowLeft")   prev();
      if (e.key === "ArrowRight")  next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [learningShell, close, prev, next]);

  if (learningShell === null) return null;
  const shell = SHELL_DEFS[learningShell];
  if (!shell) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={close}
      />

      {/* Card */}
      <div
        className="absolute z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(92vw, 480px)",
          maxHeight: "min(90vh, 680px)",
          background: "rgba(2, 6, 23, 0.97)",
          border: `1px solid ${shell.color}30`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color accent bar */}
        <div style={{ height: 3, background: shell.color, opacity: 0.85, flexShrink: 0 }} />

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5">
          {/* Top row: shell type badge + close */}
          <div className="flex items-start justify-between mb-3">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ color: shell.color, background: `${shell.color}18`, border: `1px solid ${shell.color}30` }}
            >
              Orbital Shell
            </span>
            <button
              onClick={close}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors text-base leading-none -mt-0.5 -mr-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-white leading-snug mb-1" style={{ color: "#f8fafc" }}>
            {shell.label}
          </h2>
          <p className="text-xs text-slate-500 mb-4">{shell.altKm.toLocaleString()} km altitude above Earth&apos;s surface</p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <StatCard label="Orbital Period" value={shell.period} color={shell.color} />
            <StatCard label="Orbital Velocity" value={shell.velocity} color={shell.color} />
            <StatCard label="Altitude" value={`${shell.altKm.toLocaleString()} km`} color={shell.color} />
            <StatCard label="Inclination" value={shell.inclination} color={shell.color} />
          </div>

          {/* Body description */}
          <p className="text-slate-300 text-xs leading-relaxed mb-4">{shell.body}</p>

          {/* Did you know facts */}
          {shell.facts && shell.facts.length > 0 && (
            <div className="mb-4 rounded-xl p-3" style={{ background: `${shell.color}0d`, border: `1px solid ${shell.color}20` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: shell.color }}>
                Did you know?
              </p>
              <ul className="space-y-1.5">
                {shell.facts.map((fact, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                    <span style={{ color: shell.color, flexShrink: 0 }}>›</span>
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk */}
          {shell.risk && (
            <div className="flex items-start gap-2 text-xs text-slate-400 mb-4 rounded-lg p-2.5 bg-slate-800/50 border border-slate-700/40">
              <span className="text-amber-400 text-sm flex-shrink-0">⚠</span>
              <span>{shell.risk}</span>
            </div>
          )}

          {/* Examples */}
          <div className="text-xs text-slate-500">
            <span className="text-slate-400 font-semibold">Active examples: </span>
            <span className="leading-relaxed">{shell.examples}</span>
          </div>
        </div>

        {/* Navigation footer */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(148,163,184,0.10)" }}
        >
          <button
            onClick={prev}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-700/50"
          >
            ← Prev
          </button>

          {/* Dot indicators */}
          <div className="flex gap-1.5">
            {SHELL_DEFS.map((s, i) => (
              <button
                key={i}
                onClick={() => setLearningShell(i)}
                className="transition-all rounded-full"
                style={{
                  width: i === learningShell ? 20 : 6,
                  height: 6,
                  background: i === learningShell ? shell.color : "rgba(148,163,184,0.25)",
                }}
                aria-label={s.shortLabel}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-700/50"
          >
            Next →
          </button>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5 bg-slate-800/60 border border-slate-700/40">
      <div className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}
