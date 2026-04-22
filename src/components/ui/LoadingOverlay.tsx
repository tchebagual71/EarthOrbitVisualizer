"use client";

interface Props {
  message?: string;
}

export function LoadingOverlay({ message = "Loading…" }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#000008] z-50">
      <div className="relative mb-6">
        <div className="h-16 w-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full bg-blue-900/30" />
        </div>
      </div>
      <p className="text-slate-300 text-sm font-medium">{message}</p>
      <p className="text-slate-500 text-xs mt-1">Earth Orbit Visualizer</p>
    </div>
  );
}
