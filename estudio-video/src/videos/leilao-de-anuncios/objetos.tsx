// Objetos do leilão. Cada um usa o modelo 3D gerado por IA (imagem OpenRouter → TripoSR) quando existe em
// public/videos/leilao-de-anuncios/ia/assets.json, e cai numa geometria própria quando não existe.
// Convenção (igual à do .glb normalizado): base em y=0, altura `h`, frente para +Z.
import React, {useMemo} from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import * as THREE from "three";
import {ease, GenModel, Glow, Relevo, ThemedMaterial, type GenAssets, type V3} from "../../lib";
import assetsJson from "../../../public/videos/leilao-de-anuncios/ia/assets.json";

export const A = assetsJson as unknown as GenAssets;

type ObjProps = {h: number; color?: string; emissive?: number; position?: V3; rotation?: V3; center?: boolean};

// ---------------------------------------------------------------- geometrias reserva
const Cyl: React.FC<{r: number; len: number; position?: V3; rotation?: V3; color: string; emissive?: number; seg?: number}> = ({
  r,
  len,
  position,
  rotation,
  color,
  emissive,
  seg = 48,
}) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <cylinderGeometry args={[r, r, len, seg]} />
    <ThemedMaterial color={color} emissive={emissive} />
  </mesh>
);

/** martelo em "T": cabo para baixo, cabeça horizontal no topo (como a imagem pedida no ia.json) */
const MarteloReserva: React.FC<{h: number; color: string; emissive?: number}> = ({h, color, emissive}) => (
  <group scale={h}>
    <Cyl r={0.045} len={0.72} position={[0, 0.36, 0]} color={color} emissive={emissive} />
    <Cyl r={0.13} len={0.46} position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 2]} color={color} emissive={emissive} />
    <Cyl r={0.136} len={0.04} position={[0.14, 0.85, 0]} rotation={[0, 0, Math.PI / 2]} color="secondary" />
    <Cyl r={0.136} len={0.04} position={[-0.14, 0.85, 0]} rotation={[0, 0, Math.PI / 2]} color="secondary" />
  </group>
);

/** moeda em pé, de frente para a câmera */
const MoedaReserva: React.FC<{h: number; color: string; emissive?: number}> = ({h, color, emissive}) => (
  <group scale={h}>
    <Cyl r={0.5} len={0.12} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} color={color} emissive={emissive} seg={64} />
    <mesh position={[0, 0.5, 0.062]}>
      <torusGeometry args={[0.32, 0.018, 12, 64]} />
      <ThemedMaterial color={color} emissive={emissive} />
    </mesh>
  </group>
);

/** lapidação brilhante simplificada: mesa no topo, pavilhão pontudo embaixo, facetas planas */
const JoiaReserva: React.FC<{h: number; color: string; emissive?: number}> = ({h, color, emissive}) => {
  const geo = useMemo(() => {
    const pts = [new THREE.Vector2(0.0001, 0), new THREE.Vector2(0.62, 0.6), new THREE.Vector2(0.62, 0.66), new THREE.Vector2(0.4, 0.92), new THREE.Vector2(0.0001, 0.92)];
    const g = new THREE.LatheGeometry(pts, 10).toNonIndexed();
    g.scale(1 / 0.92, 1 / 0.92, 1 / 0.92);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} scale={h} castShadow>
      <ThemedMaterial color={color} emissive={emissive} />
    </mesh>
  );
};

/** placa de lance: disco no topo, cabo embaixo */
const PlacaReserva: React.FC<{h: number; color: string; emissive?: number}> = ({h, color, emissive}) => (
  <group scale={h}>
    <Cyl r={0.04} len={0.42} position={[0, 0.21, 0]} color="secondary" />
    <Cyl r={0.29} len={0.035} position={[0, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]} color={color} emissive={emissive} seg={64} />
  </group>
);

// ---------------------------------------------------------------- objetos (gerado ou reserva)
export const Martelo: React.FC<ObjProps> = ({h, color = "primary", emissive = 0, ...p}) => (
  <GenModel asset={A.models.martelo} height={h} color={color} emissive={emissive} {...p} fallback={<MarteloReserva h={h} color={color} emissive={emissive} />} />
);
export const Moeda: React.FC<ObjProps> = ({h, color = "accent", emissive = 0, ...p}) => (
  <GenModel asset={A.models.moeda} height={h} color={color} emissive={emissive} {...p} fallback={<MoedaReserva h={h} color={color} emissive={emissive} />} />
);
export const Joia: React.FC<ObjProps> = ({h, color = "accent", emissive = 0, ...p}) => (
  <GenModel asset={A.models.joia} height={h} color={color} emissive={emissive} flat {...p} fallback={<JoiaReserva h={h} color={color} emissive={emissive} />} />
);
export const Placa: React.FC<ObjProps> = ({h, color = "primary", emissive = 0, ...p}) => (
  <GenModel asset={A.models.placa} height={h} color={color} emissive={emissive} {...p} fallback={<PlacaReserva h={h} color={color} emissive={emissive} />} />
);

// ---------------------------------------------------------------- martelo batendo
/**
 * Golpe do martelo com pivô na ponta do cabo. Em repouso (impacto) o cabo fica deitado para a esquerda e a
 * cabeça em pé sobre o bloco; antes disso ele sobe devagar (preparação) e desce acelerando.
 * `at` = segundo do impacto (local da cena). O bloco de batida fica sob a cabeça.
 */
export const GolpeMartelo: React.FC<{at: number; h?: number; position?: V3; rotationY?: number; from?: number}> = ({at, h = 1, position = [0, 0, 0], rotationY = 0, from = -1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const up = Math.PI / 2 - 1.05; // levantado
  const rest = Math.PI / 2; // cabo na horizontal
  // preparação: sobe um pouco mais; golpe: 0,22 s com aceleração; depois um repique pequeno
  const prep = interpolate(t, [from, at - 0.24], [up, up - 0.22], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
  const hit = interpolate(t, [at - 0.24, at], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.exit});
  const bounce = t > at ? Math.exp(-(t - at) * 9) * Math.sin((t - at) * 26) * 0.06 : 0;
  const angle = t < at - 0.24 ? prep : t < at ? prep + (rest - prep) * hit : rest - Math.abs(bounce);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* bloco de batida: sob a cabeça, que no impacto fica a ~0,85h para a esquerda do pivô */}
      <mesh position={[-0.88 * h, -0.27 * h, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2 * h, 0.22 * h, 0.12 * h, 48]} />
        <ThemedMaterial color="secondary" />
      </mesh>
      <group rotation={[0, 0, angle]}>
        <Martelo h={h} />
      </group>
    </group>
  );
};

/** Clarão do impacto: halo âmbar que acende de uma vez e some em ~0,7 s. */
export const Clarao: React.FC<{at: number; position: V3; size?: number}> = ({at, position, size = 2.4}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const k = interpolate(frame / fps, [at - 0.02, at + 0.04, at + 0.75], [0, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  if (k <= 0) return null;
  return <Glow position={position} size={size * (0.8 + 0.4 * k)} intensity={k} overlay />;
};

/** Salão de leilão: o cenário 2.5D gerado ou, sem ele, fileiras de cadeiras e um púlpito em silhueta. */
export const Salao: React.FC<{width: number; brightness: number; relief?: number}> = ({width, brightness, relief = 0.9}) => (
  <Relevo
    asset={A.reliefs.salao}
    width={width}
    aspect={16 / 9}
    relief={relief}
    brightness={brightness}
    fallback={<SalaoReserva width={width} />}
  />
);

const SalaoReserva: React.FC<{width: number}> = ({width}) => {
  const rows = [0, 1, 2, 3, 4, 5];
  return (
    <group position={[0, -width * 0.62, -2]}>
      {rows.map((r) =>
        [-1, 1].map((side) =>
          [0, 1, 2].map((k) => (
            <mesh key={`${r}-${side}-${k}`} position={[side * (0.35 + k * 0.32) * (width / 3), 0.18, 2.5 - r * 0.9]}>
              <boxGeometry args={[0.24, 0.36, 0.22]} />
              <ThemedMaterial color="surfaceAlt" />
            </mesh>
          )),
        ),
      )}
      <mesh position={[0, 0.45, -3.2]}>
        <boxGeometry args={[0.6, 0.9, 0.4]} />
        <ThemedMaterial color="secondary" />
      </mesh>
    </group>
  );
};
