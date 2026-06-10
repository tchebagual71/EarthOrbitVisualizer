"use client";
import { useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  LAUNCH_SITES,
  getLaunchSiteScenePos,
  SITE_TYPE_COLOR,
  SITE_TYPE_LABEL,
  type LaunchSite,
} from "@/lib/launchsites";
import { useStore } from "@/hooks/useStore";

const DOT_RADIUS = 0.055;
const CLICK_RADIUS = 0.14; // invisible larger sphere for easier clicking

interface MarkerProps {
  site: LaunchSite;
  showLabels: boolean;
}

function SiteMarker({ site, showLabels }: MarkerProps) {
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  const baseColor = SITE_TYPE_COLOR[site.type];
  const pos = getLaunchSiteScenePos(site);
  const isActive = hovered || selected;

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[DOT_RADIUS * 2.2, 8, 8]} />
        <meshBasicMaterial
          color={new THREE.Color(baseColor)}
          transparent
          opacity={isActive ? 0.3 : 0.09}
          depthWrite={false}
        />
      </mesh>

      {/* Visible dot */}
      <mesh>
        <sphereGeometry args={[DOT_RADIUS, 8, 8]} />
        <meshBasicMaterial color={new THREE.Color(isActive ? "#ffffff" : baseColor)} />
      </mesh>

      {/* Invisible larger hit area for easier clicking */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); setSelected((s) => !s); }}
      >
        <sphereGeometry args={[CLICK_RADIUS, 6, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Persistent name label — visible when zoomed in close */}
      {showLabels && (
        <Html distanceFactor={14} occlude className="pointer-events-none whitespace-nowrap">
          <div
            className="-translate-x-1/2 -translate-y-[220%] whitespace-nowrap rounded border px-[5px] py-px text-[9px] font-bold uppercase tracking-[0.04em] backdrop-blur-sm"
            style={{ background: `${baseColor}1a`, borderColor: `${baseColor}50`, color: baseColor }}
          >
            {site.shortName}
          </div>
        </Html>
      )}

      {/* Hover / selected tooltip */}
      {isActive && (
        <Html
          distanceFactor={12}
          occlude
          className={selected ? "pointer-events-auto" : "pointer-events-none"}
        >
          <div
            className="-translate-x-1/2 translate-y-[calc(-100%-18px)] min-w-[200px] max-w-[265px] rounded-[10px] border bg-[rgba(2,6,23,0.96)] px-[13px] py-[9px] text-[11px] text-slate-100 backdrop-blur-xl"
            style={{
              borderColor: `${baseColor}55`,
              boxShadow: `0 6px 32px rgba(0,0,0,0.85), 0 0 0 1px ${baseColor}15`,
            }}
          >
            {/* Type badge + coords */}
            <div className="mb-1 flex items-center gap-1.5">
              <span
                className="rounded border px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.06em]"
                style={{ background: `${baseColor}22`, color: baseColor, borderColor: `${baseColor}55` }}
              >
                {SITE_TYPE_LABEL[site.type]}
              </span>
              <span className="text-[9px] text-slate-600">
                {Math.abs(site.lat).toFixed(2)}°{site.lat >= 0 ? "N" : "S"}{" "}
                {Math.abs(site.lon).toFixed(2)}°{site.lon >= 0 ? "E" : "W"}
              </span>
            </div>

            {/* Name */}
            <div className="mb-0.5 text-xs font-bold leading-snug text-slate-50">
              {site.name}
            </div>
            <div className="text-[10px] text-slate-400">
              {site.country} · {site.agency} · est.&nbsp;{site.firstLaunch}
            </div>

            {/* Description expands on click */}
            {selected && (
              <>
                <div className="my-[7px] border-t border-slate-400/10" />
                <div className="text-[10px] leading-[1.65] text-slate-300">
                  {site.description}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelected(false); }}
                  className="mt-2 block w-full cursor-pointer rounded border border-slate-400/20 bg-slate-400/10 px-2 py-0.5 text-[9px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  close ×
                </button>
              </>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

export function LaunchSites() {
  const enabledSiteTypes = useStore((s) => s.enabledSiteTypes);
  const [showLabels, setShowLabels] = useState(false);
  const camDistRef = useRef(25);
  const labelStateRef = useRef(false);

  useFrame(({ camera }) => {
    const d = camera.position.length();
    if (Math.abs(d - camDistRef.current) > 0.4) {
      camDistRef.current = d;
      const shouldShow = d < 13;
      if (shouldShow !== labelStateRef.current) {
        labelStateRef.current = shouldShow;
        setShowLabels(shouldShow);
      }
    }
  });

  const visibleSites = LAUNCH_SITES.filter((s) => enabledSiteTypes.has(s.type));

  return (
    <group>
      {visibleSites.map((site) => (
        <SiteMarker key={site.id} site={site} showLabels={showLabels} />
      ))}
    </group>
  );
}
