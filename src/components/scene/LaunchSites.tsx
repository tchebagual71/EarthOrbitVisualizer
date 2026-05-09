"use client";
import { useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { LAUNCH_SITES, getLaunchSiteScenePos, type LaunchSite } from "@/lib/launchsites";

const DOT_RADIUS = 0.045;
const COLOR_IDLE = new THREE.Color("#f59e0b");
const COLOR_HOVER = new THREE.Color("#ff6b00");

export function LaunchSites() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<LaunchSite | null>(null);

  return (
    <group>
      {LAUNCH_SITES.map((site) => {
        const pos = getLaunchSiteScenePos(site);
        const isHovered = hoveredId === site.id;
        const isSelected = selectedSite?.id === site.id;

        return (
          <group key={site.id} position={[pos.x, pos.y, pos.z]}>
            {/* Glow ring */}
            <mesh>
              <sphereGeometry args={[DOT_RADIUS * 1.8, 8, 8]} />
              <meshBasicMaterial
                color={COLOR_HOVER}
                transparent
                opacity={isHovered || isSelected ? 0.25 : 0.08}
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
              <meshBasicMaterial color={isHovered || isSelected ? COLOR_HOVER : COLOR_IDLE} />
            </mesh>

            {/* Tooltip */}
            {(isHovered || isSelected) && (
              <Html
                distanceFactor={12}
                style={{ pointerEvents: isSelected ? "auto" : "none" }}
              >
                <div
                  style={{
                    background: "rgba(15,23,42,0.92)",
                    border: "1px solid rgba(245,158,11,0.5)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    color: "#f1f5f9",
                    fontSize: 11,
                    minWidth: 180,
                    maxWidth: 240,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.7)",
                    backdropFilter: "blur(8px)",
                    transform: "translateY(-110%)",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#f59e0b", marginBottom: 2 }}>
                    {site.shortName}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 4 }}>{site.name}</div>
                  <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 6 }}>
                    {site.country} · {site.agency} · est. {site.firstLaunch}
                  </div>
                  {isSelected && (
                    <>
                      <div style={{ color: "#cbd5e1", fontSize: 10, lineHeight: 1.5 }}>
                        {site.description}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 9, marginTop: 4 }}>
                        {site.lat.toFixed(2)}°{site.lat >= 0 ? "N" : "S"},{" "}
                        {Math.abs(site.lon).toFixed(2)}°{site.lon >= 0 ? "E" : "W"}
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
