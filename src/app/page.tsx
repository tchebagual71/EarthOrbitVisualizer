"use client";
import dynamic from "next/dynamic";
import { ControlPanel } from "@/components/ui/ControlPanel";
import { InfoPanel } from "@/components/ui/InfoPanel";
import { TimeControl } from "@/components/ui/TimeControl";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { Suspense } from "react";

// Three.js must be client-side only
const SceneCanvas = dynamic(
  () => import("@/components/scene/SceneCanvas").then((m) => m.SceneCanvas),
  { ssr: false, loading: () => <LoadingOverlay message="Initializing 3D scene…" /> }
);

export default function HomePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <Suspense fallback={<LoadingOverlay message="Initializing 3D scene…" />}>
        <SceneCanvas />
      </Suspense>

      {/* HUD overlays */}
      <ControlPanel />
      <InfoPanel />
      <TimeControl />
    </main>
  );
}
