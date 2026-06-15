"use client";
import { useEffect, useState } from "react";

const SEEN_KEY = "eov-hint-seen";

// A one-time, non-blocking gesture hint for first-time visitors. Auto-dismisses
// on the first interaction or after a few seconds, and never shows again.
export function FirstRunHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* private mode / storage disabled — just show it this session */
    }
    if (seen) return;

    setVisible(true);
    const dismiss = () => {
      setVisible(false);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
    };
    const timer = setTimeout(dismiss, 8000);
    window.addEventListener("pointerdown", dismiss, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", dismiss);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 px-3"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 4.5rem)" }}
    >
      <div className="animate-pulse rounded-full border border-slate-700/50 bg-slate-900/85 px-4 py-2 text-center text-xs text-slate-300 shadow-xl backdrop-blur-md">
        Drag to rotate · scroll or pinch to zoom · tap a satellite to inspect
      </div>
    </div>
  );
}
