import {Line, RoundedBox} from "@react-three/drei";
import React, {useMemo} from "react";
import {interpolate, random, spring, useCurrentFrame, useVideoConfig} from "remotion";
import * as THREE from "three";
import {c, dataColor, ds, mix} from "../../ds";
import {ease, useDrift, useTime} from "../motion";
import {ThemedMaterial, useFitScale, type V3} from "./scene";

export type Enter3D = "drop" | "scale" | "rise" | "spin" | "flip" | "none";

/**
 * Entrada/saída/flutuação para qualquer grupo 3D. Todos os objetos da biblioteca usam isto.
 *   <Appear delay={0.4} enter="drop" float><mesh>...</mesh></Appear>
 */
export const Appear: React.FC<{
  children: React.ReactNode;
  delay?: number;
  enter?: Enter3D;
  exitAt?: number;
  float?: boolean | number;
  position?: V3;
  rotation?: V3;
  scale?: number;
  seed?: string;
}> = ({children, delay = 0, enter = "scale", exitAt, float = false, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, seed = "appear"}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = enter === "none" ? 1 : spring({frame: frame - Math.round(delay * fps), fps, config: ds.motion.spring.pop});
  const e =
    exitAt === undefined
      ? 0
      : interpolate(frame, [exitAt * fps, (exitAt + ds.motion.duration.fast) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.exit});
  const fl = typeof float === "number" ? float : float ? 1 : 0;
  const d = useDrift(seed, fl, 0.35);
  const pc = Math.min(1, p);
  const over = Math.max(0, p - 1);
  let pos: V3 = [...position];
  let rot: V3 = [...rotation];
  let sc: V3 = [scale, scale, scale];
  switch (enter) {
    case "drop":
      pos = [pos[0], pos[1] + (1 - pc) * 5, pos[2]];
      sc = [scale * (1 + over * 0.5), scale * (1 - over * 0.9), scale * (1 + over * 0.5)];
      break;
    case "rise":
      pos = [pos[0], pos[1] - (1 - pc) * 3, pos[2]];
      sc = [scale * pc, scale * pc, scale * pc];
      break;
    case "spin":
      rot = [rot[0], rot[1] + (1 - pc) * Math.PI * 1.2, rot[2]];
      sc = [scale * p, scale * p, scale * p];
      break;
    case "flip":
      rot = [rot[0] + (1 - pc) * -Math.PI * 0.6, rot[1], rot[2]];
      sc = [scale * pc, scale * pc, scale * pc];
      break;
    case "scale":
      sc = [scale * p, scale * p, scale * p];
      break;
  }
  const out = 1 - e;
  return (
    <group
      position={[pos[0] + d.x * 0.15, pos[1] + d.y * 0.2 - e * 0.6, pos[2]]}
      rotation={[rot[0] + d.r * 0.08, rot[1] + d.x * 0.12, rot[2]]}
      scale={[Math.max(0.0001, sc[0] * out), Math.max(0.0001, sc[1] * out), Math.max(0.0001, sc[2] * out)]}
    >
      {children}
    </group>
  );
};

/** Bloco chanfrado (o "tijolo" dos diagramas 3D: camadas, pilhas, módulos, cubos de dados). */
export const Block: React.FC<{
  size?: V3;
  color?: string;
  position?: V3;
  rotation?: V3;
  delay?: number;
  enter?: Enter3D;
  exitAt?: number;
  float?: boolean | number;
  bevel?: number;
  emissive?: number;
  seed?: string;
  children?: React.ReactNode;
}> = ({size = [1, 1, 1], color = "primary", bevel, emissive, children, ...rest}) => (
  <Appear {...rest} seed={rest.seed ?? `block-${color}-${size.join("x")}`}>
    <RoundedBox args={size} radius={Math.min(bevel ?? ds.three.bevel, Math.min(...size) / 2 - 0.001)} smoothness={4} castShadow receiveShadow>
      <ThemedMaterial color={color} emissive={emissive} />
    </RoundedBox>
    {children}
  </Appear>
);

/** Esfera/orbe (átomos, nós de rede, planetas, "ideias"). */
export const Orb: React.FC<{radius?: number; color?: string; position?: V3; delay?: number; enter?: Enter3D; exitAt?: number; float?: boolean | number; emissive?: number}> = ({
  radius = 0.6,
  color = "accent",
  emissive,
  ...rest
}) => (
  <Appear {...rest} seed={`orb-${color}-${radius}`}>
    <mesh castShadow>
      <sphereGeometry args={[radius, 64, 64]} />
      <ThemedMaterial color={color} emissive={emissive} />
    </mesh>
  </Appear>
);

/** Gira os filhos continuamente (voltas por segundo), de forma determinística. */
export const Spin: React.FC<{children: React.ReactNode; speed?: number; axis?: "x" | "y" | "z"; offset?: number}> = ({children, speed = 0.08, axis = "y", offset = 0}) => {
  const t = useTime();
  const a = offset + t * speed * Math.PI * 2;
  return <group rotation={[axis === "x" ? a : 0, axis === "y" ? a : 0, axis === "z" ? a : 0]}>{children}</group>;
};

/** Partículas ambientes (poeira de luz no ar). Sutis por padrão — são textura, não assunto. Determinísticas por seed. */
export const Particles: React.FC<{count?: number; spread?: V3; size?: number; colors?: string[]; seed?: string; opacity?: number}> = ({
  count = 70,
  spread = [8, 14, 6],
  size = 0.028,
  colors = ["text"],
  seed = "particles",
  opacity = 0.35,
}) => {
  const t = useTime();
  const items = useMemo(
    () =>
      Array.from({length: count}, (_, i) => ({
        x: (random(`${seed}x${i}`) - 0.5) * spread[0],
        y: (random(`${seed}y${i}`) - 0.5) * spread[1],
        z: (random(`${seed}z${i}`) - 0.5) * spread[2] - 2,
        s: size * (0.4 + random(`${seed}s${i}`) * 1.2),
        sp: 0.05 + random(`${seed}v${i}`) * 0.12,
        col: colors ? c(colors[i % colors.length]) : dataColor(i),
      })),
    [count, seed, size, spread, colors],
  );
  return (
    <group>
      {items.map((p, i) => (
        <mesh key={i} position={[p.x + Math.sin(t * p.sp * 3 + i) * 0.2, ((p.y + t * p.sp + spread[1] / 2) % spread[1]) - spread[1] / 2, p.z]}>
          <sphereGeometry args={[p.s, 8, 8]} />
          <meshBasicMaterial color={p.col} transparent opacity={opacity} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

/** Ligação que se desenha entre pontos 3D (fluxos, redes, causa → efeito). */
export const Connector3D: React.FC<{
  from: V3;
  to: V3;
  lift?: number;
  delay?: number;
  duration?: number;
  color?: string;
  width?: number;
  dashed?: boolean;
}> = ({from, to, lift = 1, delay = 0, duration = 0.7, color = "accent", width = 6, dashed = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
  const pts = useMemo(() => {
    const mid = new THREE.Vector3((from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + lift, (from[2] + to[2]) / 2);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...from), mid, new THREE.Vector3(...to));
    return curve.getPoints(64);
  }, [from, to, lift]);
  const n = Math.max(2, Math.round(pts.length * t));
  if (t <= 0) return null;
  return <Line points={pts.slice(0, n)} color={c(color)} lineWidth={width} dashed={dashed} dashSize={0.2} gapSize={0.12} />;
};

/** Gráfico de colunas 3D. Altura em unidades 3D; valores e rótulos ficam melhores em HTML por cima. */
export const Bars3D: React.FC<{
  data: {label: string; value: number; color?: string; highlight?: boolean}[];
  delay?: number;
  stagger?: number;
  maxHeight?: number;
  barWidth?: number;
  gap?: number;
  position?: V3;
  exitAt?: number;
}> = ({data, delay = 0, stagger = 0.12, maxHeight = 3.2, barWidth = 0.8, gap = 0.4, position = [0, -1.5, 0], exitAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = Math.max(...data.map((d) => d.value));
  const total = data.length * barWidth + (data.length - 1) * gap;
  const anyH = data.some((d) => d.highlight);
  const e =
    exitAt === undefined ? 0 : interpolate(frame, [exitAt * fps, (exitAt + ds.motion.duration.fast) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const fit = useFitScale(total + 0.4, position);
  return (
    <group position={position} scale={[fit, fit, fit]}>
      {data.map((d, i) => {
        const g = spring({frame: frame - Math.round((delay + i * stagger) * fps), fps, config: ds.motion.spring.soft}) * (1 - e);
        const h = Math.max(0.02, (d.value / m) * maxHeight * g);
        const x = -total / 2 + barWidth / 2 + i * (barWidth + gap);
        const col = d.color ?? (anyH ? (d.highlight ? "accent" : mix(ds.color.surfaceAlt ?? "surface", "textMuted", 0.35)) : `data.${i}`);
        return (
          <RoundedBox
            key={i}
            args={[barWidth, h, barWidth]}
            radius={Math.min(ds.three.bevel, h / 2 - 0.001, barWidth / 2 - 0.001)}
            smoothness={3}
            position={[x, h / 2, 0]}
            castShadow
            receiveShadow
          >
            <ThemedMaterial color={col} />
          </RoundedBox>
        );
      })}
    </group>
  );
};

/** Converte posição 3D em px de tela — para ancorar rótulos HTML (Callout, valores) em objetos 3D. */
export const projectToScreen = (p: V3, cam: {position: V3; target?: V3; fov: number}, width: number, height: number) => {
  const camera = new THREE.PerspectiveCamera(cam.fov, width / height, 0.1, 200);
  camera.position.set(...cam.position);
  camera.lookAt(...(cam.target ?? [0, 0, 0]));
  camera.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(camera);
  return {x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height};
};
