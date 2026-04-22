"use client";
import { useStore } from "@/hooks/useStore";
import { TIME_SPEEDS, type TimeSpeed } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SPEED_LABELS: Record<TimeSpeed, string> = {
  0: "⏸",
  1: "1×",
  10: "10×",
  60: "1m/s",
  300: "5m/s",
  3600: "1h/s",
};

export function TimeControl() {
  const { simTime, playing, timeSpeed, setPlaying, setTimeSpeed } = useStore();

  const dateStr = simTime.toUTCString().replace(" GMT", " UTC");

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 px-4 py-2 shadow-2xl">
      {/* Play/Pause */}
      <button
        onClick={() => setPlaying(!playing)}
        className="text-white hover:text-blue-400 transition-colors text-lg w-7 text-center"
        title={playing ? "Pause" : "Play"}
      >
        {playing ? "⏸" : "▶"}
      </button>

      {/* Speed buttons */}
      <div className="flex items-center gap-1">
        {(TIME_SPEEDS.filter((s) => s > 0) as TimeSpeed[]).map((speed) => (
          <button
            key={speed}
            onClick={() => { setTimeSpeed(speed); setPlaying(true); }}
            className={cn(
              "rounded px-2 py-0.5 text-xs transition-colors font-mono",
              timeSpeed === speed && playing
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/50"
            )}
          >
            {SPEED_LABELS[speed]}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-slate-700" />

      {/* Clock */}
      <span className="font-mono text-xs text-slate-300 select-none tabular-nums">
        {dateStr}
      </span>
    </div>
  );
}
