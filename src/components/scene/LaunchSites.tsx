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
        <Html distanceFactor={14} occlude style={{ pointerEvents: "none", whiteSpace: "nowrap" }}>
          <div style={{
            background: `${baseColor}1a`,
            border: `1px solid ${baseColor}50`,
            borderRadius: 4,
            padding: "1px 5px",
            color: baseColor,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            transform: "translate(-50%, -220%)",
            backdropFilter: "blur(4px)",
            whiteSpace: "nowrap",
          }}>
            {site.shortName}
          </div>
        </Html>
      )}

      {/* Hover / selected tooltip */}
      {isActive && (
        <Html
          distanceFactor={12}
          occlude
          style={{ pointerEvents: selected ? "auto" : "none" }}
        >
          <div style={{
            background: "rgba(2,6,23,0.96)",
            border: `1px solid ${baseColor}55`,
            borderRadius: 10,
            padding: "9px 13px",
            color: "#f1f5f9",
            fontSize: 11,
            minWidth: 200,
            maxWidth: 265,
            boxShadow: `0 6px 32px rgba(0,0,0,0.85), 0 0 0 1px ${baseColor}15`,
            backdropFilter: "blur(12px)",
            transform: "translate(-50%, calc(-100% - 18px))",
          }}>
            {/* Type badge + coords */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{
                background: `${baseColor}22`,
                color: baseColor,
                border: `1px solid ${baseColor}55`,
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}>
                {SITE_TYPE_LABEL[site.type]}
              </span>
              <span style={{ color: "#475569", fontSize: 9 }}>
                {Math.abs(site.lat).toFixed(2)}°{site.lat >= 0 ? "N" : "S"}{" "}
                {Math.abs(site.lon).toFixed(2)}°{site.lon >= 0 ? "E" : "W"}
              </span>
            </div>

            {/* Name */}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#f8fafc", marginBottom: 2, lineHeight: 1.3 }}>
              {site.name}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: selected ? 0 : 0 }}>
              {site.country} · {site.agency} · est.&nbsp;{site.firstLaunch}
            </div>

            {/* Description expands on click */}
            {selected && (
              <>
                <div style={{ borderTop: "1px solid rgba(148,163,184,0.12)", margin: "7px 0" }} />
                <div style={{ color: "#cbd5e1", fontSize: 10, lineHeight: 1.65 }}>
                  {site.description}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelected(false); }}
                  style={{
                    marginTop: 8,
                    background: "rgba(148,163,184,0.08)",
                    border: "1px solid rgba(148,163,184,0.18)",
                    borderRadius: 4,
                    color: "#64748b",
                    fontSize: 9,
                    padding: "2px 8px",
                    cursor: "pointer",
                    display: "block",
                    width: "100%",
                  }}
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
