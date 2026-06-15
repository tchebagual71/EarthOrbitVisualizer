"use client";
import dynamic from "next/dynamic";
import { ControlPanel } from "@/components/ui/ControlPanel";
import { InfoPanel } from "@/components/ui/InfoPanel";
import { TimeControl } from "@/components/ui/TimeControl";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { SearchPanel } from "@/components/ui/SearchPanel";
import { LearningCard } from "@/components/ui/LearningCard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useStore } from "@/hooks/useStore";
import { Suspense, useEffect } from "react";

const SceneCanvas = dynamic(
  () => import("@/components/scene/SceneCanvas").then((m) => m.SceneCanvas),
  { ssr: false, loading: () => <LoadingOverlay message="Initializing 3D scene…" /> }
);

function SceneCrashFallback() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#000008] px-6 text-center">
      <p className="text-slate-200 text-sm font-medium">The 3D scene crashed.</p>
      <p className="text-slate-500 text-xs max-w-sm">
        This usually means WebGL is unavailable or the graphics context was lost.
        Reloading the page normally fixes it.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-100 border border-slate-700 hover:bg-slate-700 transition-colors"
      >
        Reload
      </button>
    </div>
  );
}

export default function HomePage() {
  // Preferences are persisted with skipHydration to avoid SSR/client markup
  // mismatches — rehydrate once after mount instead.
  useEffect(() => {
    void useStore.persist.rehydrate();
  }, []);

  return (
    <main className="relative h-dvh w-screen overflow-hidden touch-manipulation">
      <ErrorBoundary fallback={<SceneCrashFallback />}>
        <Suspense fallback={<LoadingOverlay message="Initializing 3D scene…" />}>
          <SceneCanvas />
        </Suspense>
      </ErrorBoundary>

      {/* HUD overlays */}
      <ControlPanel />
      <InfoPanel />
      <TimeControl />
      <SearchPanel />
      <LearningCard />
    </main>
  );
}
