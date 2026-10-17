import {useGLTF, useTexture} from "@react-three/drei";
import React, {useMemo} from "react";
import {staticFile} from "remotion";
import * as THREE from "three";
import {c, ds} from "../../ds";
import {ThemedMaterial, type V3} from "./scene";

// Ativos gerados por IA (npm run ia -- <slug>): modelos 3D do TripoSR e cenários 2.5D (imagem + profundidade).
// O índice fica em public/videos/<slug>/ia/assets.json; a cena importa o JSON e passa a entrada aqui.
// Sem a entrada (geração não rodou ou falhou), os componentes usam o `fallback` — o vídeo sempre renderiza.

export type GenModelAsset = {src: string; size: [number, number, number]};
export type ReliefAsset = {image: string; depth: string};
export type GenAssets = {
  models: Record<string, GenModelAsset>;
  images: Record<string, string>;
  reliefs: Record<string, ReliefAsset>;
};

const firstGeometry = (scene: THREE.Object3D) => {
  let g: THREE.BufferGeometry | null = null;
  scene.traverse((o) => {
    if (!g && (o as THREE.Mesh).isMesh) g = (o as THREE.Mesh).geometry as THREE.BufferGeometry;
  });
  if (!g) throw new Error("GLB sem malha");
  return g as THREE.BufferGeometry;
};

const Loaded: React.FC<{
  asset: GenModelAsset;
  scale: number;
  color: string;
  emissive: number;
  look: "ds" | "gerada" | "tingida";
  flat: boolean;
}> = ({asset, scale, color, emissive, look, flat}) => {
  // useDraco=false: nada de decodificador remoto (os GLB do TripoSR não são comprimidos)
  const gltf = useGLTF(staticFile(asset.src), false);
  const geometry = useMemo(() => {
    const g = firstGeometry(gltf.scene).clone();
    if (flat) {
      const ng = g.toNonIndexed();
      ng.computeVertexNormals();
      return ng;
    }
    g.computeVertexNormals();
    return g;
  }, [gltf, flat]);
  const hasColors = !!geometry.getAttribute("color");
  return (
    <mesh geometry={geometry} scale={scale} castShadow receiveShadow>
      {look === "ds" || !hasColors ? (
        <ThemedMaterial color={color} emissive={emissive} />
      ) : (
        <meshStandardMaterial
          vertexColors
          color={look === "tingida" ? c(color) : "white"}
          emissive={c(color)}
          emissiveIntensity={emissive}
          roughness={ds.three.roughness ?? 0.35}
          metalness={look === "tingida" ? 0.6 : 0.2}
          flatShading={flat}
        />
      )}
    </mesh>
  );
};

/**
 * Modelo 3D gerado (imagem → TripoSR). O .glb vem normalizado: Y para cima, base em y=0, maior dimensão = 1.
 * `height` define a altura final (ou `width`, a largura). `look`:
 *  - "ds" (padrão): material do design system na cor `color` — coerente com o resto da série;
 *  - "gerada": as cores que o TripoSR tirou da imagem; "tingida": cores geradas × `color`, mais metálico.
 * `flat` deixa as faces facetadas (joias, cristais). `center` põe o centro (e não a base) na origem.
 */
export const GenModel: React.FC<{
  asset?: GenModelAsset;
  height?: number;
  width?: number;
  color?: string;
  emissive?: number;
  look?: "ds" | "gerada" | "tingida";
  flat?: boolean;
  center?: boolean;
  position?: V3;
  rotation?: V3;
  /** geometria própria quando o modelo não existe — construa com a base em y=0 e a altura `height` */
  fallback?: React.ReactNode;
}> = ({asset, height, width, color = "primary", emissive = 0, look = "ds", flat = false, center = false, position, rotation, fallback = null}) => {
  const scale = asset ? (width !== undefined ? width / asset.size[0] : (height ?? 1) / asset.size[1]) : 1;
  const h = asset ? asset.size[1] * scale : height ?? 1;
  return (
    <group position={position} rotation={rotation}>
      <group position={[0, center ? -h / 2 : 0, 0]}>
        {asset ? <Loaded asset={asset} scale={scale} color={color} emissive={emissive} look={look} flat={flat} /> : fallback}
      </group>
    </group>
  );
};

/**
 * Cenário 2.5D: a imagem gerada projetada numa malha densa deslocada pelo mapa de profundidade (claro = perto).
 * A câmera pode andar alguns graus (push-in, deslize lateral) com paralaxe real. Fica de frente para +Z,
 * centrado em `position`; `width` em unidades (a altura segue a proporção da imagem, `aspect` = altura/largura).
 * `relief` = quanto o mais perto avança em direção à câmera (em unidades). `brightness` 0–1 escurece/acende.
 * Não recebe luz nem neblina: a imagem já vem iluminada. Use `fog={null}` no Scene3D se o relevo estiver longe.
 */
export const Relevo: React.FC<{
  asset?: ReliefAsset;
  width: number;
  aspect?: number;
  relief?: number;
  brightness?: number;
  position?: V3;
  segments?: number;
  fallback?: React.ReactNode;
}> = ({asset, fallback = null, ...rest}) => (asset ? <ReliefMesh asset={asset} {...rest} /> : <group position={rest.position}>{fallback}</group>);

const ReliefMesh: React.FC<{
  asset: ReliefAsset;
  width: number;
  aspect?: number;
  relief?: number;
  brightness?: number;
  position?: V3;
  segments?: number;
}> = ({asset, width, aspect = 16 / 9, relief = 0.6, brightness = 1, position = [0, 0, 0], segments = 320}) => {
  const [map, depth] = useTexture([staticFile(asset.image), staticFile(asset.depth)]);
  useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    depth.colorSpace = THREE.NoColorSpace;
  }, [map, depth]);
  const black = useMemo(() => new THREE.Color(0, 0, 0), []);
  const white = useMemo(() => new THREE.Color(1, 1, 1), []);
  const h = width * aspect;
  return (
    <mesh position={[position[0], position[1], position[2] - relief / 2]}>
      <planeGeometry args={[width, h, segments, Math.round(segments * aspect)]} />
      <meshStandardMaterial
        color={black}
        emissive={white}
        emissiveMap={map}
        emissiveIntensity={brightness}
        displacementMap={depth}
        displacementScale={relief}
        roughness={1}
        metalness={0}
        envMapIntensity={0}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
};
