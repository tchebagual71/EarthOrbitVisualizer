"use client";
import { useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  LAUNCH_SITES,
  getLaunchSiteScenePos,
  SITE_TYPE_COLOR,
  SITE_TYPE_LABEL,
  type LaunchSite,
} from "@/lib/launchsites";

const DOT_RADIUS = 0.045;

export function LaunchSites() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<LaunchSite | null>(null);

  return (
    <group>
      {LAUNCH_SITES.map((site) => {
        const pos = getLaunchSiteScenePos(site);
        const isHovered = hoveredId === site.id;
        const isSelected = selectedSite?.id === site.id;
        const baseColor = SITE_TYPE_COLOR[site.type];
        const dotColor = new THREE.Color(baseColor);

        return (
          <group key={site.id} position={[pos.x, pos.y, pos.z]}>
            {/* Glow halo */}
            <mesh>
              <sphereGeometry args={[DOT_RADIUS * 1.9, 8, 8]} />
              <meshBasicMaterial
                color={dotColor}
                transparent
                opacity={isHovered || isSelected ? 0.28 : 0.07}
                depthWrite={false}
              />
            </mesh>

            {/* Core dot */}
            <mesh
              onPointerOver={(e) => { e.stopPropagation(); setHoveredId(site.id); }}
              onPointerOut={() => setHoveredId(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSite(isSelected ? null : site);
              }}
            >
              <sphereGeometry args={[DOT_RADIUS, 8, 8]} />
              <meshBasicMaterial
                color={isHovered || isSelected ? new THREE.Color("#ffffff") : dotColor}
              />
            </mesh>

            {/* Tooltip */}
            {(isHovered || isSelected) && (
              <Html
                distanceFactor={12}
                style={{ pointerEvents: isSelected ? "auto" : "none" }}
              >
                <div
                  style={{
                    background: "rgba(15,23,42,0.94)",
                    border: `1px solid ${baseColor}55`,
                    borderRadius: 10,
                    padding: "8px 12px",
                    color: "#f1f5f9",
                    fontSize: 11,
                    minWidth: 190,
                    maxWidth: 250,
                    boxShadow: "0 4px 28px rgba(0,0,0,0.75)",
                    backdropFilter: "blur(10px)",
                    transform: "translateY(-110%)",
                  }}
                >
                  {/* Type badge + short name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span
                      style={{
                        background: `${baseColor}30`,
                        color: baseColor,
                        border: `1px solid ${baseColor}60`,
                        borderRadius: 4,
                        padding: "1px 5px",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {SITE_TYPE_LABEL[site.type]}
                    </span>
                    <span style={{ color: baseColor, fontWeight: 700, fontSize: 12 }}>
                      {site.shortName}
                    </span>
                  </div>

                  {/* Full name */}
                  <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 3 }}>
                    {site.name}
                  </div>

                  {/* Meta */}
                  <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: isSelected ? 6 : 0 }}>
                    {site.country} · {site.agency} · est.&nbsp;{site.firstLaunch}
                  </div>

                  {/* Description (only when selected) */}
                  {isSelected && (
                    <>
                      <div style={{ borderTop: "1px solid rgba(148,163,184,0.15)", margin: "6px 0" }} />
                      <div style={{ color: "#cbd5e1", fontSize: 10, lineHeight: 1.6 }}>
                        {site.description}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 9, marginTop: 5 }}>
                        {Math.abs(site.lat).toFixed(4)}°{site.lat >= 0 ? "N" : "S"},{" "}
                        {Math.abs(site.lon).toFixed(4)}°{site.lon >= 0 ? "E" : "W"}
                      </div>
                    </>
                  )}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
