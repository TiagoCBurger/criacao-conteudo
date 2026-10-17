// O pedido fatiado: um disco (o pedido de R$ 46) que perde fatias de custo, uma por palavra,
// até sobrar a fatia fina da margem, que acende. Determinístico (tudo a partir do frame).
import React, {useMemo} from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import * as THREE from "three";
import {ease, Glow, mix, ThemedMaterial, type V3} from "../lib";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

const wedgeGeometry = (r: number, h: number, a0: number, a1: number) => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(r * Math.cos(a0), r * Math.sin(a0));
  s.absarc(0, 0, r, a0, a1, false);
  s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, {depth: h, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 48});
  // deita a fatia no chão (extrusão para cima)
  g.rotateX(-Math.PI / 2);
  return g;
};

export type Slice = {
  /** fração do disco (0–1) */
  frac: number;
  /** instante (s, local) em que a fatia sai; ausente = fica */
  cutAt?: number;
  /** instante (s, local) em que a fatia que fica acende */
  litAt?: number;
};

/**
 * Disco fatiado. As fatias são distribuídas a partir de `start` (rad, no sentido anti-horário visto de cima).
 * A fatia que fica é desenhada voltada para a câmera quando `start` é escolhido de acordo.
 */
export const SlicedOrder: React.FC<{
  slices: Slice[];
  radius?: number;
  height?: number;
  start?: number;
  position?: V3;
  enterAt?: number;
}> = ({slices, radius = 1.2, height = 0.26, start = 0, position = [0, 0, 0], enterAt = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const geos = useMemo(() => {
    let a = start;
    return slices.map((s) => {
      const a0 = a;
      const a1 = a + s.frac * Math.PI * 2;
      a = a1;
      const mid = (a0 + a1) / 2;
      // direção da bissetriz no mundo: (cos, 0, -sin) por causa do rotateX
      return {geo: wedgeGeometry(radius, height, a0 + 0.006, a1 - 0.006), dir: [Math.cos(mid), 0, -Math.sin(mid)] as V3};
    });
  }, [slices, radius, height, start]);
  const enter = interpolate(t, [enterAt, enterAt + 0.9], [0, 1], {...clamp, easing: ease.enter});
  return (
    <group position={[position[0], position[1] - (1 - enter) * 0.6, position[2]]} scale={[0.85 + 0.15 * enter, 0.85 + 0.15 * enter, 0.85 + 0.15 * enter]}>
      {slices.map((s, i) => {
        const {geo, dir} = geos[i];
        let out = 0.035; // pequena folga entre as fatias
        let y = 0;
        let col = "primary";
        let emissive = 0;
        let sc = 1;
        let lit = 0;
        let fade = 1;
        if (s.cutAt !== undefined) {
          const k1 = interpolate(t, [s.cutAt, s.cutAt + 0.35], [0, 1], {...clamp, easing: ease.enter});
          const k2 = interpolate(t, [s.cutAt + 0.45, s.cutAt + 1.25], [0, 1], {...clamp, easing: ease.exit});
          out += k1 * 0.2 + k2 * 0.15;
          y = k1 * 0.06 - k2 * 1.2;
          col = mix("primary", "negative", k1);
          emissive = k1 * 0.12 * (1 - k2);
          sc = 1 - k2 * 0.55;
          fade = 1 - k2;
        }
        if (s.litAt !== undefined) {
          lit = interpolate(t, [s.litAt, s.litAt + 0.5], [0, 1], {...clamp, easing: ease.enter});
          out += lit * 0.08;
          y = lit * 0.14;
          col = mix("primary", "accent", lit);
          emissive = lit * 0.12;
        }
        if (sc <= 0.46 && s.cutAt !== undefined && t > s.cutAt + 1.25) return null;
        return (
          <group key={i} position={[dir[0] * out, y, dir[2] * out]} scale={[sc, sc, sc]}>
            <mesh geometry={geo} castShadow receiveShadow>
              <ThemedMaterial color={col} emissive={emissive} opacity={fade < 1 ? Math.max(0.001, fade) : undefined} />
            </mesh>
            {lit > 0 && <Glow position={[dir[0] * radius * 0.55, height + 0.25, dir[2] * radius * 0.55]} size={2.4} color="accent" intensity={0.55 * lit} />}
          </group>
        );
      })}
    </group>
  );
};
