// Confete da comemoração que cai e "murcha": até `wiltAt` flutua colorido; depois perde a cor,
// para de balançar e despenca. Posição de cada papel é uma função fechada do tempo (determinística).
import React, {useMemo} from "react";
import {interpolate, random, useCurrentFrame, useVideoConfig} from "remotion";
import * as THREE from "three";
import {c, ease, mix} from "../lib";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export const Confetti: React.FC<{
  burstAt: number;
  wiltAt: number;
  count?: number;
  colors?: string[];
  area?: [number, number, number];
  top?: number;
  floor?: number;
}> = ({burstAt, wiltAt, count = 90, colors = ["accent", "positive", "text"], area = [3.4, 1.2, 1.4], top = 1.6, floor = -2}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const geo = useMemo(() => new THREE.PlaneGeometry(0.13, 0.075), []);
  const pieces = useMemo(
    () =>
      Array.from({length: count}, (_, i) => ({
        x: (random(`cx${i}`) - 0.5) * area[0],
        y: top + random(`cy${i}`) * area[1],
        z: 0.35 + random(`cz${i}`) * area[2],
        v: 0.45 + random(`cv${i}`) * 0.35,
        w: 2 + random(`cw${i}`) * 3,
        ph: random(`cp${i}`) * Math.PI * 2,
        rx: (random(`rx${i}`) - 0.5) * 9,
        rz: (random(`rz${i}`) - 0.5) * 7,
        delay: random(`cd${i}`) * 0.35,
        col: colors[i % colors.length],
      })),
    [count, area, top, colors],
  );
  if (t < burstAt) return null;
  const wilt = interpolate(t, [wiltAt, wiltAt + 0.6], [0, 1], {...clamp, easing: ease.standard});
  return (
    <group>
      {pieces.map((p, i) => {
        const tt = Math.max(0, t - burstAt - p.delay);
        if (tt <= 0) return null;
        // estouro: sobe um pouco e abre; depois cai devagar balançando
        const pop = interpolate(tt, [0, 0.35], [0, 1], {...clamp, easing: ease.enter});
        const tw = Math.max(0, t - wiltAt); // depois de murchar: gravidade
        const y = p.y + pop * 0.35 - tt * p.v * (1 - wilt * 0.4) - tw * tw * 2.4;
        const flutter = Math.sin(tt * p.w + p.ph) * 0.12 * (1 - wilt);
        const x = p.x * (0.6 + 0.4 * pop) + flutter;
        if (y < floor) return null;
        const col = mix(c(p.col), c("secondary"), wilt);
        const spin = 1 - wilt * 0.85;
        const fade = interpolate(y, [floor, floor + 0.6], [0, 1], clamp);
        return (
          <mesh
            key={i}
            geometry={geo}
            position={[x, y, p.z]}
            rotation={[p.ph + tt * p.rx * spin, tt * 1.3 * spin, p.ph * 0.5 + tt * p.rz * spin]}
            scale={[1, 1 - wilt * 0.35, 1]}
          >
            <meshStandardMaterial
              color={col}
              emissive={col}
              emissiveIntensity={0.35 * (1 - wilt)}
              roughness={0.7}
              side={THREE.DoubleSide}
              transparent
              opacity={fade * (1 - wilt * 0.35)}
            />
          </mesh>
        );
      })}
    </group>
  );
};
