// Campo de hambúrgueres estilizados (pão, carne, pão) em grade — "100 lanches".
// Instanciado (3 malhas para 100 lanches) para o render por software; cor e posição de cada um vêm do frame.
import React, {useLayoutEffect, useMemo, useRef} from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import * as THREE from "three";
import {c, ds, ease, mix} from "../lib";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const BUN = mix("accent", "secondary", 0.5);
const PATTY = mix("negative", "background", 0.72);

export const BurgerField: React.FC<{
  rows?: number;
  cols?: number;
  spacing?: number;
  /** entrada em onda */
  enterAt: number;
  /** índices (ordem de leitura, linha 0 = frente) que viram "de graça" */
  lost: (i: number) => boolean;
  lostAt: number;
}> = ({rows = 10, cols = 10, spacing = 0.42, enterAt, lost, lostAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const n = rows * cols;
  const refs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
  const geos = useMemo(
    () => [
      new THREE.CylinderGeometry(0.15, 0.14, 0.05, 28), // pão de baixo
      new THREE.CylinderGeometry(0.155, 0.155, 0.055, 28), // carne
      new THREE.SphereGeometry(0.15, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), // pão de cima (cúpula)
    ],
    [],
  );
  const mats = useMemo(
    () => [0, 1, 2].map(() => new THREE.MeshStandardMaterial({roughness: ds.three.roughness ?? 0.8, metalness: 0})),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const w = (cols - 1) * spacing;
    const d = (rows - 1) * spacing;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const k = i % cols;
      const x = -w / 2 + k * spacing;
      const z = d / 2 - r * spacing;
      const off = (r + Math.abs(k - (cols - 1) / 2) * 0.6) * 0.045;
      const p = interpolate(t, [enterAt + off, enterAt + off + 0.55], [0, 1], {...clamp, easing: ease.enter});
      const isLost = lost(i);
      const lostOff = isLost ? (rows - 1 - r) * 0.05 + k * 0.012 : 0;
      const L = isLost ? interpolate(t, [lostAt + lostOff, lostAt + lostOff + 0.45], [0, 1], {...clamp, easing: ease.standard}) : 0;
      const sink = L * 0.07;
      const s = Math.max(0.0001, p) * (1 - L * 0.12);
      const y0 = (1 - p) * 0.6 - sink;
      // pão e carne em tons apagados derivados da paleta (âmbar/coral misturados ao neutro): lê como lanche
      // sem gastar o acento; o coral pleno fica só para os "de graça"
      const parts = [
        {y: 0.025, color: mix(BUN, "negative", L)},
        {y: 0.075, color: mix(PATTY, "negative", L * 0.8)},
        {y: 0.1, color: mix(BUN, "negative", L)},
      ];
      parts.forEach((pt, j) => {
        dummy.position.set(x, y0 + pt.y * s, z);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        const m = refs[j].current;
        if (!m) return;
        m.setMatrixAt(i, dummy.matrix);
        col.set(c(pt.color));
        if (L > 0) col.multiplyScalar(1 - L * 0.35);
        m.setColorAt(i, col);
      });
    }
    refs.forEach((rf) => {
      if (!rf.current) return;
      rf.current.instanceMatrix.needsUpdate = true;
      if (rf.current.instanceColor) rf.current.instanceColor.needsUpdate = true;
    });
  });

  return (
    <group>
      {geos.map((g, j) => (
        <instancedMesh key={j} ref={refs[j]} args={[g, mats[j], n]} castShadow receiveShadow />
      ))}
    </group>
  );
};
