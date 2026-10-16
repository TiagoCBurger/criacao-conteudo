import {ContactShadows, Environment, Grid, Lightformer} from "@react-three/drei";
import {useThree} from "@react-three/fiber";
import {ThreeCanvas} from "@remotion/three";
import React, {useLayoutEffect, useState} from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import * as THREE from "three";
import {art, c, ds, mix} from "../../ds";
import {ease, lerp, useDrift, useTime} from "../motion";

// Regras de ouro do 3D no Remotion:
//  1. Anime SOMENTE com useCurrentFrame()/useTime(). useFrame, clock e componentes do drei que
//     animam sozinhos (Float, Sparkles animado, MeshWobble...) quebram o render (quadros fora de ordem).
//  2. Nada de assets remotos (Environment preset baixa HDR da internet). Use Lightformers locais.
//  3. O canvas é transparente: o <Stage> (fundo da marca) aparece por trás; texto nítido fica no HTML por cima.

export type V3 = [number, number, number];

/**
 * Tamanho visível (unidades 3D) num plano a `distance` da câmera. Em 9:16 o quadro é ESTREITO:
 * com fov 32 a 9 unidades de distância, cabem ~2,9 de largura × ~5,2 de altura.
 * Use para posicionar e dimensionar objetos sem cortar nas bordas.
 */
export const viewSize = (distance: number, fov: number = ds.three.fov, aspect = 9 / 16) => {
  const height = 2 * distance * Math.tan((fov * Math.PI) / 360);
  return {width: height * aspect, height};
};

/**
 * Distância de câmera para um objeto de largura w × altura h ocupar `fill` do quadro 9:16.
 * Essencial com fov fechado (lente longa, 20–28°), que deixa tudo muito perto.
 *   const d = fitDistance(2.4, 3.6);   // pilha de 2,4 de largura e 3,6 de altura ocupando 70%
 */
export const fitDistance = (w: number, h: number, {fov = ds.three.fov, fill = 0.7, aspect = 9 / 16} = {}) => {
  const t = Math.tan((fov * Math.PI) / 360);
  return Math.max(w / (2 * t * aspect * fill), h / (2 * t * fill));
};

/**
 * Posição de câmera em órbita do alvo: azimute (graus, 0 = de frente, + = da direita) e elevação (graus, + = de cima).
 *   <Scene3D camera={{position: orbit([0, 1.5, 0], fitDistance(3, 4), 30, 15), target: [0, 1.5, 0]}}>
 */
export const orbit = (target: V3, distance: number, azimuth = 25, elevation = 15): V3 => {
  const a = (azimuth * Math.PI) / 180;
  const e = (elevation * Math.PI) / 180;
  return [target[0] + distance * Math.cos(e) * Math.sin(a), target[1] + distance * Math.sin(e), target[2] + distance * Math.cos(e) * Math.cos(a)];
};

/**
 * Escala (≤ 1) para um conteúdo de largura `contentWidth` caber em `margin` da largura visível
 * na profundidade de `position`. Calculada uma vez na montagem (não "respira" com a câmera).
 */
export const useFitScale = (contentWidth: number, position: V3 = [0, 0, 0], maxWidth?: number, margin = 0.86) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const [fitWidth] = useState(() => {
    if (maxWidth) return maxWidth;
    const dist = camera.position.distanceTo(new THREE.Vector3(...position));
    return viewSize(dist, camera.fov ?? ds.three.fov, camera.aspect || 9 / 16).width * margin;
  });
  return Math.min(1, fitWidth / Math.max(0.001, contentWidth));
};

/** Aponta a câmera para o alvo na montagem (sem CameraRig, a câmera do R3F olha reto para -z). */
const CameraAim: React.FC<{target: V3}> = ({target}) => {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateMatrixWorld();
    camera.userData.target = target;
  }, [camera, target[0], target[1], target[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

/**
 * Neblina que acompanha a câmera: a cada quadro, near/far = múltiplos da distância ATUAL câmera→alvo.
 * Assim um CameraRig que se afasta (ou chega perto) não afoga o assunto na névoa.
 * Fica depois dos filhos no Scene3D, então roda depois do CameraRig e antes do render do quadro.
 */
const FogFollow: React.FC<{k: {near: number; far: number}}> = ({k}) => {
  useCurrentFrame(); // re-executa a cada quadro
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    // lê na hora: a <fog> é anexada à cena no commit, depois do primeiro render deste componente
    const fog = scene.fog as THREE.Fog | null;
    if (!fog) return;
    const t = (camera.userData.target as V3 | undefined) ?? [0, 0, 0];
    const d = Math.max(0.01, camera.position.distanceTo(new THREE.Vector3(t[0], t[1], t[2])));
    fog.near = d * k.near;
    fog.far = d * k.far;
  });
  return null;
};

export const Scene3D: React.FC<{
  children: React.ReactNode;
  /** position/fov da câmera; target = para onde ela olha (padrão: origem). Com CameraRig, os keyframes mandam. */
  camera?: {position?: V3; fov?: number; target?: V3};
  floor?: "shadow" | "grid" | "none";
  floorY?: number;
  lighting?: Tokens3D["lighting"];
  /** neblina na cor do fundo; near/far em múltiplos da distância câmera→alvo (ex.: {near: 1.05, far: 2.4}),
   *  recalculada a cada quadro (acompanha o CameraRig). Padrão: tokens.three.fog; na direção "cinematic" liga sozinha.
   *  Cena com objetos espalhados em profundidade (órbitas, constelações): afrouxe ({near: 1.4, far: 3.5}) ou null. */
  fog?: {near: number; far: number} | null;
  style?: React.CSSProperties;
}> = ({children, camera, floor = "shadow", floorY = -1.5, lighting, fog: fogProp, style}) => {
  const {width, height} = useVideoConfig();
  const shadows = ds.three.shadows;
  // neblina relativa à distância câmera→alvo: near/far em múltiplos dessa distância (1 = no assunto).
  // Assim funciona igual com lente curta ou longa; o assunto fica nítido e o fundo some na névoa.
  const fogK = fogProp !== undefined ? fogProp : ds.three.fog !== undefined ? ds.three.fog : art.direction === "cinematic" ? {near: 1.05, far: 2.4} : null;
  const camPos = camera?.position ?? [0, 0.6, 9];
  const tgt = camera?.target ?? [0, 0, 0];
  const camDist = Math.hypot(camPos[0] - tgt[0], camPos[1] - tgt[1], camPos[2] - tgt[2]);
  const fog = fogK ? {near: camDist * fogK.near, far: camDist * fogK.far} : null;
  return (
    <AbsoluteFill style={style}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows={shadows}
        camera={{position: camera?.position ?? [0, 0.6, 9], fov: camera?.fov ?? ds.three.fov, near: 0.1, far: 200}}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: ds.three.exposure,
        }}
        style={{background: "transparent"}}
      >
        <CameraAim target={camera?.target ?? [0, 0, 0]} />
        <Lights mode={lighting ?? ds.three.lighting} />
        {fog && <fog attach="fog" args={[c(ds.color.background), fog.near, fog.far]} />}
        {children}
        {fogK && <FogFollow k={fogK} />}
        {floor === "shadow" && shadows && (
          <ContactShadows position={[0, floorY, 0]} opacity={0.5} scale={24} blur={2.4} far={8} resolution={512} color={mix("background", "#000000", 0.6)} />
        )}
        {floor === "grid" && (
          <Grid
            position={[0, floorY, 0]}
            args={[40, 40]}
            cellSize={0.5}
            cellThickness={0.6}
            cellColor={mix("background", "text", 0.12)}
            sectionSize={2.5}
            sectionThickness={1}
            sectionColor={mix("background", "primary", 0.45)}
            fadeDistance={22}
            fadeStrength={1.6}
            infiniteGrid
          />
        )}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

type Tokens3D = typeof ds.three;

/** Rig de luz conforme tokens.three.lighting + reflexos locais (Lightformers) para materiais brilhantes. */
export const Lights: React.FC<{mode: Tokens3D["lighting"]}> = ({mode}) => {
  const primary = c("primary");
  const accent = c("accent");
  const shadowMap = ds.three.shadows;
  const cfg = {
    studio: {amb: 0.45, key: 2.4, fill: 0.9, rim: 1.6, env: 1},
    soft: {amb: 0.8, key: 1.4, fill: 0.9, rim: 0.6, env: 0.8},
    dramatic: {amb: 0.12, key: 3.2, fill: 0.25, rim: 2.8, env: 0.6},
    flat: {amb: 1.6, key: 0.6, fill: 0.4, rim: 0, env: 0.3},
    // baixa luz: um cone de luz de cima (pools de luz), recorte forte na cor de acento, quase sem preenchimento
    noir: {amb: 0.08, key: 1.1, fill: 0.18, rim: 4, env: 0.7},
  }[mode];
  return (
    <>
      <ambientLight intensity={cfg.amb} />
      {mode === "noir" && (
        <spotLight
          position={[2.5, 9, 3]}
          angle={0.42}
          penumbra={0.85}
          intensity={16}
          decay={0}
          castShadow={shadowMap}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          color={mix(accent, "#ffffff", 0.82)}
        />
      )}
      <directionalLight
        position={[5, 8, 6]}
        intensity={cfg.key}
        castShadow={shadowMap}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-6, 2, 4]} intensity={cfg.fill} color={mix(primary, "#ffffff", 0.75)} />
      {cfg.rim > 0 && <directionalLight position={[0, 4, -8]} intensity={cfg.rim} color={mix(accent, "#ffffff", 0.35)} />}
      <Environment resolution={256} frames={1} environmentIntensity={cfg.env}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-6, 1, 1]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} color={mix(primary, "#ffffff", 0.6)} />
        <Lightformer form="rect" intensity={1.1} position={[6, 1, 1]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} color={mix(accent, "#ffffff", 0.6)} />
        <Lightformer form="ring" intensity={0.8} position={[0, 2, -6]} scale={4} />
      </Environment>
    </>
  );
};

/** Material com o acabamento do design system (tokens.three.material). */
export const ThemedMaterial: React.FC<{color?: string; emissive?: number; opacity?: number}> = ({color = "primary", emissive = 0, opacity}) => {
  const col = c(color);
  const t = ds.three;
  const transparent = opacity !== undefined && opacity < 1;
  const common = {color: col, transparent, opacity: opacity ?? 1, emissive: col, emissiveIntensity: emissive};
  switch (t.material) {
    case "glossy":
      return <meshPhysicalMaterial {...common} roughness={t.roughness ?? 0.22} metalness={t.metalness ?? 0} clearcoat={t.clearcoat ?? 1} clearcoatRoughness={0.12} />;
    case "glass":
      return (
        <meshPhysicalMaterial
          {...common}
          roughness={t.roughness ?? 0.06}
          metalness={0}
          transmission={0.92}
          thickness={1.2}
          ior={1.45}
          attenuationColor={col}
          attenuationDistance={2.5}
          clearcoat={1}
        />
      );
    case "metal":
      return <meshStandardMaterial {...common} roughness={t.roughness ?? 0.28} metalness={t.metalness ?? 0.92} />;
    case "clay":
      return <meshPhysicalMaterial {...common} roughness={t.roughness ?? 0.95} metalness={0} sheen={0.6} sheenRoughness={0.8} sheenColor={"#ffffff"} />;
    case "toon":
      return <meshToonMaterial color={col} transparent={transparent} opacity={opacity ?? 1} />;
    case "chrome":
      // espelhado: a cor tinge os reflexos; depende dos Lightformers do ambiente
      return <meshPhysicalMaterial {...common} roughness={t.roughness ?? 0.08} metalness={1} clearcoat={0.4} envMapIntensity={1.6} />;
    case "stone":
      // gesso/concreto/pedra: fosco absoluto, leve brilho de borda — o "escultórico" do editorial
      return <meshPhysicalMaterial {...common} roughness={t.roughness ?? 1} metalness={0} sheen={0.25} sheenRoughness={1} sheenColor={"#ffffff"} />;
    case "wire":
      // sólido escuro quase da cor do fundo; o desenho vem das arestas (<Edges>) adicionadas pelos objetos
      // polygonOffset empurra o preenchimento para trás: as linhas das arestas ficam sempre por cima
      return (
        <meshBasicMaterial color={mix("background", col, 0.12)} transparent opacity={opacity ?? 0.94} polygonOffset polygonOffsetFactor={2} polygonOffsetUnits={2} />
      );
    case "matte":
    default:
      return <meshStandardMaterial {...common} roughness={t.roughness ?? 0.82} metalness={t.metalness ?? 0} />;
  }
};

/**
 * Câmera com keyframes em segundos (tempo local da cena) + "respiração" do design system.
 *   <CameraRig keys={[{t: 0, position: [0, 1, 10]}, {t: 2.5, position: [3, 2, 7], target: [0, 0.5, 0]}]} />
 */
export const CameraRig: React.FC<{keys: {t: number; position: V3; target?: V3; fov?: number}[]; drift?: number}> = ({keys, drift = 1}) => {
  const {camera} = useThree();
  const time = useTime();
  const d = useDrift("camera", ds.motion.cameraDrift * drift, 0.12);
  let i = 0;
  while (i < keys.length - 1 && time > keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const span = Math.max(0.0001, b.t - a.t);
  const raw = Math.min(1, Math.max(0, (time - a.t) / span));
  const k = a === b ? 0 : ease.standard(raw);
  const pos = a.position.map((v, j) => lerp(v, b.position[j], k)) as V3;
  const ta = a.target ?? [0, 0, 0];
  const tb = b.target ?? ta;
  const tgt = ta.map((v, j) => lerp(v, tb[j], k)) as V3;
  const fov = lerp(a.fov ?? ds.three.fov, b.fov ?? a.fov ?? ds.three.fov, k);
  useLayoutEffect(() => {
    camera.position.set(pos[0] + d.x * 0.6, pos[1] + d.y * 0.4, pos[2]);
    camera.lookAt(tgt[0], tgt[1], tgt[2]);
    camera.userData.target = tgt;
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pc = camera as THREE.PerspectiveCamera;
      pc.fov = fov;
      pc.updateProjectionMatrix();
    }
  });
  return null;
};
