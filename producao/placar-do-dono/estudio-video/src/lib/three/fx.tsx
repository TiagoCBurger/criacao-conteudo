import React, {useMemo} from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import * as THREE from "three";
import {c} from "../../ds";
import {ease} from "../motion";
import type {V3} from "./scene";

// Efeitos de "luz" baratos e determinísticos (sem pós-processamento): brilho aditivo, atmosfera e feixe.
// São o que dá cara cinematográfica a uma cena 3D — use para dar foco (o objeto que importa brilha),
// não como enfeite em tudo.

let glowTex: THREE.Texture | null = null;
const glowTexture = () => {
  if (glowTex) return glowTex;
  const s = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d")!;
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.18, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.14)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  glowTex = new THREE.CanvasTexture(cv);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
};

/**
 * Halo de luz aditivo (sol, lâmpada, objeto "ativo", ponto de energia).
 * `overlay`: ignora o teste de profundidade. Use para um ponto SOBRE uma superfície (cidade num globo,
 * marcador numa peça): sem isso, a superfície corta metade do halo e sobra um disco escuro.
 */
export const Glow: React.FC<{position?: V3; size?: number; color?: string; intensity?: number; delay?: number; duration?: number; overlay?: boolean}> = ({
  position = [0, 0, 0],
  size = 2,
  color = "accent",
  intensity = 1,
  delay,
  duration = 0.6,
  overlay = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p =
    delay === undefined ? 1 : interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.enter});
  const tex = useMemo(glowTexture, []);
  if (p <= 0) return null;
  return (
    <sprite position={position} scale={[size * (0.6 + 0.4 * p), size * (0.6 + 0.4 * p), 1]} renderOrder={10}>
      <spriteMaterial
        map={tex}
        color={c(color)}
        transparent
        opacity={Math.min(1, intensity * p)}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={!overlay}
        fog={false}
        toneMapped={false}
      />
    </sprite>
  );
};

/** Atmosfera (brilho de borda/fresnel) em volta de uma esfera — planetas, células, bolhas. */
export const Atmosphere: React.FC<{radius: number; color?: string; position?: V3; thickness?: number; intensity?: number}> = ({
  radius,
  color = "primary",
  position = [0, 0, 0],
  thickness = 0.12,
  intensity = 1.2,
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {uColor: {value: new THREE.Color(c(color))}, uIntensity: {value: intensity}},
        vertexShader: `varying vec3 vN; varying vec3 vV;
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 uColor; uniform float uIntensity; varying vec3 vN; varying vec3 vV;
          void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); gl_FragColor = vec4(uColor * uIntensity, f); }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [color, intensity],
  );
  return (
    <mesh position={position} material={mat}>
      <sphereGeometry args={[radius * (1 + thickness), 64, 64]} />
    </mesh>
  );
};

/** Feixe de luz que se estende de `from` até `to` (raio de sol, laser, fluxo de dados). */
export const LightBeam: React.FC<{from: V3; to: V3; width?: number; color?: string; delay?: number; duration?: number; intensity?: number}> = ({
  from,
  to,
  width = 0.08,
  color = "text",
  delay = 0,
  duration = 0.6,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
  const tex = useMemo(glowTexture, []);
  if (t <= 0) return null;
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const end = a.clone().lerp(b, t);
  const mid = a.clone().add(end).multiplyScalar(0.5);
  const len = a.distanceTo(end);
  const dir = end.clone().sub(a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <group>
      <mesh position={mid} quaternion={q} renderOrder={9}>
        <cylinderGeometry args={[width, width, len, 16, 1, true]} />
        <meshBasicMaterial color={c(color)} transparent opacity={0.9 * intensity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={mid} quaternion={q} renderOrder={8}>
        <cylinderGeometry args={[width * 4, width * 4, len, 16, 1, true]} />
        <meshBasicMaterial color={c(color)} transparent opacity={0.18 * intensity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <sprite position={end} scale={[width * 10, width * 10, 1]} renderOrder={10}>
        <spriteMaterial map={tex} color={c(color)} transparent opacity={intensity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
};
