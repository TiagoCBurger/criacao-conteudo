import {Center, Text} from "@react-three/drei";
import {useThree} from "@react-three/fiber";
import React, {useLayoutEffect, useMemo, useRef} from "react";
import {cancelRender, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import * as THREE from "three";
import {Font} from "three/examples/jsm/loaders/FontLoader.js";
import {SVGLoader} from "three/examples/jsm/loaders/SVGLoader.js";
import {TTFLoader} from "three/examples/jsm/loaders/TTFLoader.js";
import {c, ds, ttfFor, type TypeRole} from "../../ds";
import {ease} from "../motion";
import {ThemedMaterial, useFitScale, type V3} from "./scene";

// ---------------------------------------------------------------------------------------------
// Carregamento com delayRender: o frame só é capturado quando a fonte/SVG já existe.
// ---------------------------------------------------------------------------------------------
const fontCache = new Map<string, Promise<Font>>();
const loadTTF = (url: string) => {
  if (!fontCache.has(url)) {
    fontCache.set(
      url,
      new Promise<Font>((resolve, reject) => {
        new TTFLoader().load(url, (json) => resolve(new Font(json as never)), undefined, reject);
      }),
    );
  }
  return fontCache.get(url)!;
};

// Carregamento por Suspense (padrão do R3F): enquanto o recurso carrega, o componente "suspende" e o
// <ThreeCanvas> segura o frame com delayRender. NÃO crie delayRender em useState/render dentro da cena 3D:
// quando um vizinho suspende (ex.: <Text> do drei), o React descarta o render e o handle vaza → timeout.
type Entry = {status: "pending" | "done" | "error"; value?: unknown; error?: unknown; promise?: Promise<void>};
const assetCache = new Map<string, Entry>();
const useSuspenseAsset = <T,>(key: string, loader: () => Promise<T>): T => {
  const create = (): Entry => {
    const entry: Entry = {status: "pending"};
    entry.promise = loader().then(
      (v) => {
        entry.status = "done";
        entry.value = v;
      },
      (err) => {
        entry.status = "error";
        entry.error = err;
      },
    );
    assetCache.set(key, entry);
    return entry;
  };
  const e: Entry = assetCache.get(key) ?? create();
  if (e.status === "pending") throw e.promise;
  if (e.status === "error") {
    cancelRender(e.error instanceof Error ? e.error : new Error(String(e.error)));
    throw e.error;
  }
  return e.value as T;
};

// ---------------------------------------------------------------------------------------------
// Text3D — letreiro extrudado, letra a letra, com a fonte do design system.
//   <Text3D text="ENERGIA" size={1.1} depth={0.35} color="primary" delay={0.2} />
// Precisa de TTF/OTF no design system (typography.<role>.ttf ou um arquivo .ttf em files).
// ---------------------------------------------------------------------------------------------
export const Text3D: React.FC<{
  text: string;
  role?: TypeRole;
  size?: number;
  depth?: number;
  bevel?: number;
  color?: string;
  sideColor?: string;
  delay?: number;
  stagger?: number;
  anim?: "rise" | "flip" | "drop" | "none";
  position?: V3;
  rotation?: V3;
  lineHeight?: number;
  exitAt?: number;
  /** largura máxima (unidades 3D). Padrão: 86% da largura visível na profundidade do texto — nunca corta na borda do 9:16. */
  maxWidth?: number;
}> = ({
  text,
  role = "display",
  size = 1,
  depth = 0.3,
  bevel = 0.025,
  color = "primary",
  sideColor,
  delay = 0,
  stagger = 0.045,
  anim = "flip",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  lineHeight = 1.05,
  exitAt,
  maxWidth,
}) => {
  const url = ttfFor(role);
  if (!url) throw new Error(`Text3D: o papel tipográfico "${role}" não tem arquivo .ttf/.otf no design system.`);
  const font = useSuspenseAsset(`ttf:${url}`, () => loadTTF(url));
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const layout = useMemo(() => {
    const data = (font as unknown as {data: {resolution: number; glyphs: Record<string, {ha: number}>}}).data;
    const k = size / data.resolution;
    const lines = text.split("\n");
    const letters: {geo: THREE.ExtrudeGeometry; x: number; y: number; w: number; i: number}[] = [];
    let idx = 0;
    const widths: number[] = [];
    lines.forEach((line, li) => {
      let x = 0;
      const start = letters.length;
      for (const ch of line) {
        const g = data.glyphs[ch] ?? data.glyphs["?"];
        const adv = (g?.ha ?? data.resolution * 0.5) * k;
        if (ch.trim()) {
          const shapes = font.generateShapes(ch, size);
          const geo = new THREE.ExtrudeGeometry(shapes, {
            depth,
            bevelEnabled: bevel > 0,
            bevelThickness: bevel,
            bevelSize: bevel * 0.7,
            bevelSegments: 4,
            curveSegments: 10,
          });
          geo.computeBoundingBox();
          letters.push({geo, x, y: -li * size * lineHeight, w: adv, i: idx++});
        }
        x += adv;
      }
      widths.push(x);
      for (let j = start; j < letters.length; j++) letters[j].x -= x / 2; // centraliza cada linha
    });
    const h = lines.length * size * lineHeight;
    return {letters, h, width: Math.max(...widths)};
  }, [font, text, size, depth, bevel]);

  const e =
    exitAt === undefined ? 0 : interpolate(frame, [exitAt * fps, (exitAt + ds.motion.duration.fast) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.exit});

  const fit = useFitScale(layout.width, position, maxWidth);
  return (
    <group position={position} rotation={rotation} scale={[fit, fit, fit]}>
      <group position={[0, layout.h / 2 - size * 0.75, -depth / 2]}>
        {layout.letters.map((l) => {
          const p = anim === "none" ? 1 : spring({frame: frame - Math.round((delay + l.i * stagger) * fps), fps, config: ds.motion.spring.pop});
          const pc = Math.min(1, p);
          const bb = l.geo.boundingBox!;
          const cx = (bb.max.x + bb.min.x) / 2;
          const cy = (bb.max.y + bb.min.y) / 2;
          const rotX = anim === "flip" ? (1 - pc) * -Math.PI / 2 : 0;
          const dy = anim === "rise" ? (1 - pc) * -size * 1.2 : anim === "drop" ? (1 - pc) * size * 3 : 0;
          const s = Math.max(0.0001, (anim === "rise" || anim === "drop" ? 1 : pc) * (1 - e));
          return (
            <group key={l.i} position={[l.x + cx, l.y + cy + dy + e * size * 0.5, 0]} rotation={[rotX, 0, 0]} scale={[s, s, s]}>
              <mesh geometry={l.geo} position={[-cx, -cy, 0]} castShadow>
                {ds.three.material === "wire" ? (
                  // no look técnico o letreiro é luz: sólido emissivo na cor (contorno de fonte curva fica sujo)
                  <meshStandardMaterial color={c(color)} emissive={c(color)} emissiveIntensity={0.55} roughness={0.5} />
                ) : sideColor ? (
                  <>
                    <meshStandardMaterial attach="material-0" color={c(color)} roughness={0.4} />
                    <meshStandardMaterial attach="material-1" color={c(sideColor)} roughness={0.6} />
                  </>
                ) : (
                  <ThemedMaterial color={color} />
                )}
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Label3D — texto plano dentro da cena 3D (rótulo de bloco, eixo, etiqueta). Texto estático.
// Para números que mudam a cada frame, use HTML por cima (Counter) — re-tipografar no 3D pisca.
// ---------------------------------------------------------------------------------------------
export const Label3D: React.FC<{
  children: string;
  role?: TypeRole;
  size?: number;
  color?: string;
  position?: V3;
  rotation?: V3;
  anchorX?: "left" | "center" | "right";
  anchorY?: "top" | "middle" | "bottom";
  maxWidth?: number;
  delay?: number;
}> = ({children, role = "body", size = 0.32, color = "text", position = [0, 0, 0], rotation = [0, 0, 0], anchorX = "center", anchorY = "middle", maxWidth, delay = 0}) => {
  const url = ttfFor(role);
  const advance = useThree((s) => s.advance);
  // segura o frame do mount até o troika terminar de gerar o texto (onSync) e redesenha o canvas:
  // no render o frameloop é "never", então sem o advance o quadro seria capturado sem o texto.
  const st = useRef<{handle: number | null; synced: boolean}>({handle: null, synced: false});
  const release = () => {
    st.current.synced = true;
    if (st.current.handle !== null) {
      advance(performance.now());
      continueRender(st.current.handle);
      st.current.handle = null;
    }
  };
  useLayoutEffect(() => {
    if (!st.current.synced) st.current.handle = delayRender(`Label3D "${children}"`);
    return release;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - Math.round(delay * fps), fps, config: ds.motion.spring.enter});
  return (
    <Text
      font={url ?? undefined}
      fontSize={size}
      color={c(color)}
      position={position}
      rotation={rotation}
      anchorX={anchorX}
      anchorY={anchorY}
      maxWidth={maxWidth}
      fillOpacity={Math.min(1, p)}
      letterSpacing={ds.typography[role]?.letterSpacing ?? 0}
      onSync={release}
    >
      {children}
    </Text>
  );
};

// ---------------------------------------------------------------------------------------------
// SvgExtrude — transforma um SVG preenchido (logo, ícone sólido, pictograma) em objeto 3D.
//   <SvgExtrude src={dsFile("logos/simbolo.svg")} width={3} depth={0.4} />
// Usa as cores do SVG (keepColors) ou a cor do design system.
// ---------------------------------------------------------------------------------------------
export const SvgExtrude: React.FC<{
  src: string;
  width?: number;
  depth?: number;
  color?: string;
  keepColors?: boolean;
}> = ({src, width = 3, depth = 0.4, color = "primary", keepColors = false}) => {
  const data = useSuspenseAsset(`svg:${src}`, () =>
    fetch(src)
      .then((r) => r.text())
      .then((txt) => new SVGLoader().parse(txt)),
  );
  const shapes = useMemo(() => {
    const out: {geo: THREE.ExtrudeGeometry; color: string}[] = [];
    for (const path of data.paths) {
      const fill = (path.userData as {style?: {fill?: string}})?.style?.fill;
      if (fill === "none") continue;
      for (const shape of SVGLoader.createShapes(path)) {
        out.push({
          geo: new THREE.ExtrudeGeometry(shape, {depth: 100, bevelEnabled: true, bevelThickness: 6, bevelSize: 4, bevelSegments: 3, curveSegments: 16}),
          color: fill && fill !== "currentColor" ? `#${path.color.getHexString()}` : c(color),
        });
      }
    }
    const box = new THREE.Box3();
    out.forEach((s) => {
      s.geo.computeBoundingBox();
      box.union(s.geo.boundingBox!);
    });
    return {out, box};
  }, [data, color]);
  const w = shapes.box.max.x - shapes.box.min.x || 1;
  const k = width / w;
  return (
    <Center>
      <group scale={[k, -k, (depth / 100) * 1]}>
        {shapes.out.map((s, i) => (
          <mesh key={i} geometry={s.geo} castShadow>
            {keepColors ? <meshPhysicalMaterial color={s.color} roughness={0.35} clearcoat={0.6} /> : <ThemedMaterial color={color} />}
          </mesh>
        ))}
      </group>
    </Center>
  );
};
