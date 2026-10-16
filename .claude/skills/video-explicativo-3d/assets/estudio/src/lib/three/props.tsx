import {RoundedBox} from "@react-three/drei";
import React from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {art, c, ds, mix} from "../../ds";
import {useTime} from "../motion";
import {Appear, Solid, type Enter3D} from "./objects";
import {ThemedMaterial, type V3} from "./scene";

// "Atores" e cenários 3D estilizados, montados de primitivas com o material do design system.
// Servem para analogias e situações do cotidiano (cliente, garçom, usuário, cientista, loja, escritório).
// Personalize combinando: cor, acessório, objetos na mão (passe como children com posição local).

/**
 * Câmera isométrica para dioramas: alta, a 45°, fov fechado (pouca perspectiva).
 * `fit` = largura (unidades) do diorama que deve caber na largura do 9:16; `target` = centro da cena.
 *   <Scene3D camera={isoCamera({fit: 4, target: [0, -0.4, 0]})}>
 */
export const isoCamera = ({fit = 4, target = [0, 0, 0] as V3, fov = 22} = {}): {position: V3; fov: number; target: V3} => {
  // na vista isométrica um quadrado de lado w ocupa ~w·√2 na horizontal
  const need = fit * 1.45;
  const dist = need / (2 * Math.tan((fov * Math.PI) / 360) * (9 / 16));
  const k = dist / Math.sqrt(0.62 ** 2 + 0.55 ** 2 + 0.62 ** 2);
  return {position: [target[0] + k * 0.62, target[1] + k * 0.55, target[2] + k * 0.62], fov, target};
};

/** a mais escura entre texto e fundo — olhos e detalhes que precisam contrastar em qualquer tema */
const ink = () => {
  const lum = (h: string) => {
    const n = parseInt(c(h).slice(1), 16);
    return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114;
  };
  return lum("text") < lum("background") ? c("text") : c("background");
};

/**
 * Personagem estilizado. look="figure" (padrão, exceto playful): manequim esguio, sem rosto, ~1,6 de altura.
 * look="toy": boneco de corpo de "feijão" com olhos — só para marcas lúdicas/infantis.
 *   <Character color="secondary" accessory="tie" position={[0.8, 0, 0]} rotation={[0, -0.5, 0]} delay={useCue("garçom")} />
 */
export const Character: React.FC<{
  color?: string;
  skin?: string;
  accessory?: "none" | "tie" | "hat" | "apron" | "glasses" | "headset";
  accessoryColor?: string;
  position?: V3;
  rotation?: V3;
  scale?: number;
  delay?: number;
  enter?: Enter3D;
  exitAt?: number;
  /** "talk" faz a cabeça balançar de leve; "wave" acena com o braço direito */
  action?: "idle" | "talk" | "wave" | "point";
  /** tempo local (s) em que a ação começa */
  actionAt?: number;
  highlight?: boolean;
  /** "figure" = manequim esguio e monocromático, sem olhos (padrão fora do playful); "toy" = boneco fofo com olhos */
  look?: "figure" | "toy";
  children?: React.ReactNode;
  seed?: string;
}> = ({
  color = "primary",
  skin,
  accessory = "none",
  accessoryColor = "text",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  delay = 0,
  enter = "drop",
  exitAt,
  action = "idle",
  actionAt = 0,
  highlight = false,
  look,
  children,
  seed = "char",
}) => {
  const toy = (look ?? (art.direction === "playful" ? "toy" : "figure")) === "toy";
  // proporções: toy = cabeçudo e redondo; figure = alongado, cabeça pequena (escultórico)
  const P = toy
    ? {bodyR: 0.32, bodyL: 0.5, bodyY: 0.55, headR: 0.27, headY: 1.22, armX: 0.33, armY: 0.78, armR: 0.07, armL: 0.26, tieY: 0.88, tieZ: 0.3}
    : {bodyR: 0.19, bodyL: 0.95, bodyY: 0.67, headR: 0.155, headY: 1.42, armX: 0.21, armY: 1.02, armR: 0.042, armL: 0.5, tieY: 1.12, tieZ: 0.19};
  const t = useTime();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const head = skin ? c(skin) : toy ? mix(color, "#ffffff", 0.35) : c(color);
  const breathe = Math.sin(t * 2.2 + seed.length) * (toy ? 0.015 : 0.006);
  const act = interpolate(frame, [actionAt * fps, (actionAt + 0.3) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const talk = action === "talk" ? Math.sin(t * 9) * 0.06 * act : 0;
  const wave = action === "wave" ? (Math.sin(t * 8) * 0.5 + 1.9) * act : action === "point" ? 1.3 * act : 0;
  const eye = ink();
  return (
    <Appear position={position} rotation={rotation} scale={scale} delay={delay} enter={enter} exitAt={exitAt} seed={seed}>
      <group scale={[1, 1 + breathe, 1]}>
        {/* corpo */}
        <mesh position={[0, P.bodyY, 0]} castShadow>
          <capsuleGeometry args={[P.bodyR, P.bodyL, 8, 24]} />
          <ThemedMaterial color={color} emissive={highlight ? 0.25 : 0} />
        </mesh>
        {/* cabeça */}
        <group position={[0, P.headY, 0]} rotation={[talk, 0, talk * 0.5]}>
          <mesh castShadow>
            <sphereGeometry args={[P.headR, 32, 32]} />
            <ThemedMaterial color={head} />
          </mesh>
          {toy && [-0.09, 0.09].map((x) => (
            <mesh key={x} position={[x, 0.03, 0.245]}>
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshBasicMaterial color={eye} />
            </mesh>
          ))}
          {accessory === "hat" && (
            <mesh position={[0, P.headR, 0]} castShadow>
              <cylinderGeometry args={[P.headR * 0.75, P.headR * 0.9, P.headR, 24]} />
              <ThemedMaterial color={accessoryColor} />
            </mesh>
          )}
          {accessory === "glasses" &&
            [-0.09, 0.09].map((x) => (
              <mesh key={x} position={[x, 0.03, 0.26]}>
                <torusGeometry args={[0.06, 0.012, 8, 24]} />
                <meshStandardMaterial color={c(accessoryColor)} />
              </mesh>
            ))}
          {accessory === "headset" && (
            <mesh position={[0, 0.05, 0]} rotation={[0, 0, 0]}>
              <torusGeometry args={[P.headR * 1.08, 0.025, 8, 32, Math.PI]} />
              <ThemedMaterial color={accessoryColor} />
            </mesh>
          )}
        </group>
        {accessory === "tie" && (
          <group position={[0, P.tieY, P.tieZ]}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.06, 0, 0]} rotation={[0, 0, (s * Math.PI) / 2]}>
                <coneGeometry args={[0.05, 0.1, 3]} />
                <meshStandardMaterial color={c(accessoryColor)} />
              </mesh>
            ))}
          </group>
        )}
        {accessory === "apron" && (
          <mesh position={[0, P.bodyY - 0.05, P.bodyR - 0.01]}>
            <boxGeometry args={[P.bodyR * 1.3, P.bodyL, 0.02]} />
            <ThemedMaterial color={accessoryColor} />
          </mesh>
        )}
        {/* braço direito (acena/aponta) */}
        <group position={[P.armX, P.armY, 0]} rotation={[0, 0, wave]}>
          <mesh position={[0, -P.armL * 0.75, 0]} castShadow>
            <capsuleGeometry args={[P.armR, P.armL, 6, 12]} />
            <ThemedMaterial color={color} />
          </mesh>
        </group>
        {/* objetos na mão / extras, em coordenadas do personagem */}
        {children}
      </group>
    </Appear>
  );
};

/**
 * Diorama: base (e paredes opcionais) para montar uma cena isométrica.
 * Combine com <Scene3D camera={isoCamera()}>. Os filhos ficam sobre o piso (y = 0).
 */
export const Diorama: React.FC<{
  size?: [number, number];
  floorColor?: string;
  wallColor?: string;
  walls?: "none" | "back" | "corner";
  wallHeight?: number;
  position?: V3;
  delay?: number;
  children?: React.ReactNode;
}> = ({size = [4, 4], floorColor, wallColor, walls = "corner", wallHeight = 1.8, position = [0, -1, 0], delay = 0, children}) => {
  const [w, d] = size;
  // levemente separados do fundo em qualquer tema (claro ou escuro)
  const floor = floorColor ?? mix("surface", "text", 0.1);
  const wall = wallColor ?? mix("surface", "text", 0.18);
  return (
    <Appear position={position} delay={delay} enter="rise">
      <Solid size={[w, 0.2, d]} position={[0, -0.1, 0]} color={floor} />
      {walls !== "none" && (
        <Solid size={[w, wallHeight, 0.14]} position={[0, wallHeight / 2, -d / 2 + 0.07]} color={wall} />
      )}
      {walls === "corner" && (
        <Solid size={[0.14, wallHeight, d]} position={[-w / 2 + 0.07, wallHeight / 2, 0]} color={mix(wall, "#000000", 0.06)} />
      )}
      {children}
    </Appear>
  );
};

/** Celular 3D simples (corpo + tela colorida + barras de interface). Para telas detalhadas use <PhoneMock> em HTML. */
export const Phone3D: React.FC<{position?: V3; rotation?: V3; scale?: number; screen?: string; delay?: number; enter?: Enter3D; lit?: boolean}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  screen = "surface",
  delay = 0,
  enter = "rise",
  lit = false,
}) => (
  <Appear position={position} rotation={rotation} scale={scale} delay={delay} enter={enter} float={0.4} seed="phone">
    <RoundedBox args={[1, 2, 0.12]} radius={0.12} castShadow>
      <ThemedMaterial color="text" />
    </RoundedBox>
    <mesh position={[0, 0, 0.065]}>
      <planeGeometry args={[0.88, 1.84]} />
      <meshStandardMaterial color={c(screen)} emissive={c(screen)} emissiveIntensity={lit ? 0.6 : 0.15} />
    </mesh>
    {[0.55, 0.35, 0.15].map((y, i) => (
      <mesh key={y} position={[i === 0 ? 0 : -0.1, y, 0.07]}>
        <planeGeometry args={[i === 0 ? 0.6 : 0.5, 0.09]} />
        <meshBasicMaterial color={mix(screen, "text", 0.25)} />
      </mesh>
    ))}
    <mesh position={[0, -0.55, 0.07]}>
      <planeGeometry args={[0.6, 0.18]} />
      <meshBasicMaterial color={c("primary")} />
    </mesh>
  </Appear>
);
