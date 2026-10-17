// Boletos como "time adversário": papéis de pé, com faixa coral e código de barras,
// que saem da neblina e entram em campo em fila. Determinístico (tudo a partir do frame).
import {Line} from "@react-three/drei";
import React, {useMemo} from "react";
import {interpolate, random, useCurrentFrame, useVideoConfig} from "remotion";
import {c, ease, Glow, Solid, type V3} from "../lib";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

/** Um boleto de pé. Origem na base, face para +z. */
export const Boleto: React.FC<{seed: string; glow?: number; w?: number; h?: number}> = ({seed, glow = 0, w = 0.66, h = 1.3}) => {
  const d = 0.024;
  const bars = useMemo(() => {
    const out: {x: number; w: number}[] = [];
    let x = -w * 0.4;
    while (x < w * 0.4) {
      const bw = 0.006 + random(`${seed}-b${out.length}`) * 0.016;
      out.push({x: x + bw / 2, w: bw});
      x += bw + 0.006 + random(`${seed}-g${out.length}`) * 0.01;
    }
    return out;
  }, [seed, w]);
  return (
    <group>
      <Solid size={[w, h, d]} position={[0, h / 2, 0]} color="text" />
      {/* faixa do banco */}
      <Solid size={[w, 0.12, d + 0.008]} position={[0, h - 0.06, 0]} color="negative" emissive={0.1 + glow * 0.9} />
      {/* campos */}
      {[0.66, 0.56, 0.46].map((y, i) => (
        <Solid key={i} size={[w * (i === 1 ? 0.42 : 0.58), 0.02, d + 0.004]} position={[-w * 0.5 + 0.06 + (w * (i === 1 ? 0.42 : 0.58)) / 2, h * y, 0]} color="textMuted" />
      ))}
      {/* valor */}
      <Solid size={[w * 0.28, 0.07, d + 0.004]} position={[w * 0.5 - 0.05 - w * 0.14, h * 0.56, 0]} color="secondary" />
      {/* código de barras */}
      {bars.map((b, i) => (
        <Solid key={i} size={[b.w, 0.13, d + 0.004]} position={[b.x, 0.14, 0]} color="background" />
      ))}
      {glow > 0 && <Glow position={[0, h - 0.06, 0.05]} size={0.6} color="negative" intensity={0.3 * glow} />}
    </group>
  );
};

/**
 * Fila de boletos entrando em campo. Cada um sai de `from` e caminha até o seu lugar na fila,
 * com um leve balanço de passo que assenta na chegada.
 */
export const BoletoLineup: React.FC<{
  count?: number;
  start?: number;
  step?: number;
  travel?: number;
  slot: (i: number) => V3;
  from: V3;
  face: number;
  glowAt?: number;
}> = ({count = 6, start = 0, step = 0.3, travel = 1.3, slot, from, face, glowAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const glow = glowAt === undefined ? 0 : interpolate(t, [glowAt, glowAt + 0.4], [0, 1], {...clamp, easing: ease.enter});
  return (
    <group>
      {Array.from({length: count}, (_, i) => {
        const t0 = start + i * step;
        // ritmo de caminhada (acelera e desacelera), não um "zunido" de entrada
        const k = interpolate(t, [t0, t0 + travel], [0, 1], {...clamp, easing: ease.standard});
        const to = slot(i);
        const p: V3 = [from[0] + (to[0] - from[0]) * k, 0, from[2] + (to[2] - from[2]) * k];
        const walking = 1 - k;
        const phase = (t - t0) * 3.2;
        const bob = Math.abs(Math.sin(phase * Math.PI)) * 0.05 * walking;
        const sway = Math.sin(phase * Math.PI) * 0.07 * walking;
        const settle = interpolate(t, [t0 + travel * 0.8, t0 + travel * 1.15], [0, 1], clamp);
        const lean = Math.sin(settle * Math.PI) * -0.05;
        if (t < t0) return null;
        // stagger de brilho: a onda coral corre a fila
        const g = Math.max(0, Math.min(1, glow * 1.6 - i * 0.12));
        return (
          <group key={i} position={[p[0], p[1] + bob, p[2]]} rotation={[lean, face, sway]}>
            <Boleto seed={`boleto-${i}`} glow={g} />
          </group>
        );
      })}
    </group>
  );
};

/** Gramado à noite: só as linhas de giz (meio-campo e círculo central), apagadas na neblina. */
export const PitchLines: React.FC<{y?: number; size?: [number, number]}> = ({y = 0.002, size = [9, 14]}) => {
  const [w, l] = size;
  const circle = useMemo(() => Array.from({length: 97}, (_, i) => [Math.cos((i / 96) * Math.PI * 2) * 1.6, y, Math.sin((i / 96) * Math.PI * 2) * 1.6] as V3), [y]);
  const col = c("text");
  return (
    <group>
      <Line points={[[-w / 2, y, 0], [w / 2, y, 0]]} color={col} lineWidth={2.2} transparent opacity={0.22} />
      <Line points={[[-w / 2, y, -l / 2], [-w / 2, y, l / 2]]} color={col} lineWidth={2.2} transparent opacity={0.16} />
      <Line points={[[w / 2, y, -l / 2], [w / 2, y, l / 2]]} color={col} lineWidth={2.2} transparent opacity={0.16} />
      <Line points={circle} color={col} lineWidth={2.2} transparent opacity={0.22} />
      <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.06, 24]} />
        <meshBasicMaterial color={c("text")} transparent opacity={0.3} />
      </mesh>
    </group>
  );
};
