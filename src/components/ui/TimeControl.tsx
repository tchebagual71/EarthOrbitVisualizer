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

// Compact label for narrow screens (hides the longer ones)
const SPEED_LABELS_SHORT: Record<TimeSpeed, string> = {
  0: "⏸",
  1: "1×",
  10: "10×",
  60: "1m",
  300: "5m",
  3600: "1h",
};

export function TimeControl() {
  const { simTime, playing, timeSpeed, setPlaying, setTimeSpeed } = useStore();

  // Short UTC string that fits on iPhone (drops day-of-week)
  const dateStr = simTime.toISOString().replace("T", " ").slice(0, 19) + " UTC";

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 px-3 sm:px-4 shadow-2xl"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
      }}
    >
      {/* Play/Pause — 44×44 touch target */}
      <button
        onClick={() => setPlaying(!playing)}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-white hover:text-blue-400 hover:bg-slate-700/50 active:bg-slate-700 transition-colors text-lg"
        title={playing ? "Pause" : "Play"}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? "⏸" : "▶"}
      </button>

      {/* Speed buttons */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {(TIME_SPEEDS.filter((s) => s > 0) as TimeSpeed[]).map((speed) => (
          <button
            key={speed}
            onClick={() => { setTimeSpeed(speed); setPlaying(true); }}
            className={cn(
              "rounded px-2 py-2.5 text-xs transition-colors font-mono min-h-[44px] min-w-[36px] sm:min-w-[40px]",
              timeSpeed === speed && playing
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 active:bg-slate-700"
            )}
            aria-label={`Speed ${SPEED_LABELS[speed]}`}
          >
            {/* Shorter label on very small screens */}
            <span className="sm:hidden">{SPEED_LABELS_SHORT[speed]}</span>
            <span className="hidden sm:inline">{SPEED_LABELS[speed]}</span>
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-slate-700" />

      {/* Clock — truncated on narrow screens */}
      <span className="font-mono text-xs text-slate-300 select-none tabular-nums hidden sm:block">
        {dateStr}
      </span>
      {/* Mobile: time only (HH:MM:SS UTC) */}
      <span className="font-mono text-xs text-slate-300 select-none tabular-nums sm:hidden">
        {dateStr.slice(11)}
      </span>
    </div>
  );
}
