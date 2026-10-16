import {Edges} from "@react-three/drei";
import React, {useMemo} from "react";
import {interpolate, random, useCurrentFrame, useVideoConfig} from "remotion";
import * as THREE from "three";
import {c, edges3d} from "../../ds";
import {ease} from "../motion";
import {Glow} from "./fx";
import {ThemedMaterial, type V3} from "./scene";

// Formas "de vitrine" para direções editorial/cinematográfica/técnica: em vez de mascotes e objetos fofos,
// volumes abstratos que carregam a ideia (quantidade, crescimento, escala, ordem).

/**
 * Campo de pilares (paisagem de dados). Cada pilar cresce até height(r, c). Linha 0 = frente (perto da câmera).
 * Bom para "muito", "crescimento", "multidão de dados", "um entre muitos" (com highlight).
 *   <Field rows={8} cols={5} height={(r, c) => 0.2 + r * 0.25} highlight={[[7, 2]]} delay={useCue("trinta anos")} />
 */
export const Field: React.FC<{
  rows?: number;
  cols?: number;
  spacing?: number;
  size?: number;
  height: (r: number, c: number) => number;
  delay?: number;
  duration?: number;
  order?: "wave" | "row" | "random" | "together";
  color?: string;
  highlight?: [number, number][];
  highlightColor?: string;
  position?: V3;
  rotation?: V3;
}> = ({rows = 6, cols = 5, spacing = 0.46, size = 0.34, height, delay = 0, duration = 1.2, order = "wave", color = "surfaceAlt", highlight = [], highlightColor = "accent", position = [0, 0, 0], rotation = [0, 0, 0]}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const withEdges = edges3d();
  const w = (cols - 1) * spacing;
  const d = (rows - 1) * spacing;
  const isHi = (r: number, k: number) => highlight.some(([a, b]) => a === r && b === k);
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const off =
        order === "together" ? 0 : order === "row" ? r * 0.08 : order === "random" ? random(`f${r}-${k}`) * 0.6 : (r + Math.abs(k - (cols - 1) / 2)) * 0.05;
      const p = interpolate(frame, [(delay + off) * fps, (delay + off + duration) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.enter});
      const h = Math.max(0.004, height(r, k) * p);
      const hi = isHi(r, k);
      cells.push(
        <mesh key={`${r}-${k}`} geometry={geo} position={[-w / 2 + k * spacing, h / 2, d / 2 - r * spacing]} scale={[size, h, size]} castShadow receiveShadow>
          <ThemedMaterial color={hi ? highlightColor : color} emissive={hi ? 0.35 * p : 0} />
          {withEdges && <Edges color={c(hi ? highlightColor : "textMuted")} lineWidth={hi ? 2.5 : 1.2} threshold={20} />}
        </mesh>,
      );
      if (hi && p > 0.6) cells.push(<Glow key={`g${r}-${k}`} position={[-w / 2 + k * spacing, h + 0.1, d / 2 - r * spacing]} size={1.4} color={highlightColor} intensity={(p - 0.6) * 2} />);
    }
  }
  return (
    <group position={position} rotation={rotation}>
      {cells}
    </group>
  );
};

/**
 * Fita/tubo que se desenha ao longo de pontos — curva de crescimento em 3D, trajeto, fluxo.
 * A ponta pode brilhar (tip). Combine com um piso em grade e câmera baixa para drama.
 */
export const Ribbon: React.FC<{
  points: V3[];
  radius?: number;
  color?: string;
  delay?: number;
  duration?: number;
  tip?: boolean;
  position?: V3;
}> = ({points, radius = 0.05, color = "accent", delay = 0, duration = 1.6, tip = true, position = [0, 0, 0]}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), [points]);
  const geo = useMemo(() => {
    if (t <= 0.001) return null;
    const n = Math.max(2, Math.round(64 * t));
    const pts = Array.from({length: n + 1}, (_, i) => curve.getPoint((i / n) * t));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, radius, 12, false);
  }, [curve, t, radius]);
  if (!geo) return null;
  const head = curve.getPoint(t);
  return (
    <group position={position}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color={c(color)} emissive={c(color)} emissiveIntensity={0.6} roughness={0.35} toneMapped={false} />
      </mesh>
      {tip && (
        <>
          <mesh position={head}>
            <sphereGeometry args={[radius * 2.2, 24, 24]} />
            <meshBasicMaterial color={c(color)} toneMapped={false} />
          </mesh>
          <Glow position={[head.x, head.y, head.z]} size={radius * 28} color={color} />
        </>
      )}
    </group>
  );
};
