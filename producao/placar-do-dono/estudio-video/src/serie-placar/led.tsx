// Placar de LED de estádio (objeto recorrente da série "Placar do Dono").
// O painel é uma matriz de pontos desenhada num CanvasTexture a partir da fonte display do design system:
// o texto é rasterizado em baixa resolução (1 pixel = 1 LED) e cada pixel vira um ponto aceso, com brilho.
// Tudo é função dos props (que vêm do frame): determinístico, sem relógio.
import React, {useMemo} from "react";
import * as THREE from "three";
import {c, ds, Glow, mix, Particles, Solid, type V3} from "../lib";

// ---------------------------------------------------------------------------------------------
// Fonte no canvas: o <canvas> só desenha com a fonte da marca depois que ela carregou.
// Carregamento por Suspense (o ThreeCanvas segura o frame), como os assets da biblioteca.
// ---------------------------------------------------------------------------------------------
type Entry = {status: "pending" | "done" | "error"; value?: unknown; error?: unknown; promise?: Promise<void>};
const cache = new Map<string, Entry>();
const useSuspense = <T,>(key: string, loader: () => Promise<T>): T => {
  let e = cache.get(key);
  if (!e) {
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
    cache.set(key, entry);
    e = entry;
  }
  if (e.status === "pending") throw e.promise;
  if (e.status === "error") throw e.error;
  return e.value as T;
};

const FAMILY = ds.typography.display.family;
const WEIGHT = ds.typography.display.weight;
const fontSpec = (px: number) => `${WEIGHT} ${px}px "${FAMILY}", ${ds.typography.display.fallback ?? "sans-serif"}`;

const loadLedFont = async () => {
  for (let i = 0; i < 80; i++) {
    const faces = await document.fonts.load(fontSpec(40), "0123456789×");
    if (faces.length > 0) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  // razão altura-de-maiúscula / tamanho da fonte, para posicionar pelo "olho" dos caracteres
  const cv = document.createElement("canvas");
  const g = cv.getContext("2d")!;
  g.font = fontSpec(100);
  const m = g.measureText("H0");
  return m.actualBoundingBoxAscent / 100;
};

// ---------------------------------------------------------------------------------------------
// Conteúdo do painel, em unidades de LED (coluna, linha).
// ---------------------------------------------------------------------------------------------
export type LedText = {
  text: string;
  /** centro horizontal (align center), ou borda (left/right), em colunas */
  x: number;
  /** centro vertical das maiúsculas, em linhas */
  y: number;
  /** altura das maiúsculas, em LEDs */
  size: number;
  color: string;
  /** 0–1: brilho */
  level?: number;
  align?: CanvasTextAlign;
  /** espaçamento extra entre letras, em LEDs */
  tracking?: number;
};
export type LedRect = {x: number; y: number; w: number; h: number; color: string; level?: number};

const rgba = (hex: string, a: number) => {
  const n = parseInt(c(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// Grade de LEDs apagados (fundo do painel), em cache por tamanho.
const gridCache = new Map<string, HTMLCanvasElement>();
const offGrid = (cols: number, rows: number, P: number, rad: number) => {
  const key = `${cols}x${rows}x${P}`;
  let cv = gridCache.get(key);
  if (cv) return cv;
  cv = document.createElement("canvas");
  cv.width = cols * P;
  cv.height = rows * P;
  const g = cv.getContext("2d")!;
  g.fillStyle = c("background");
  g.fillRect(0, 0, cv.width, cv.height);
  g.beginPath();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = x * P + P / 2;
      const cy = y * P + P / 2;
      g.moveTo(cx + rad, cy);
      g.arc(cx, cy, rad, 0, Math.PI * 2);
    }
  }
  g.fillStyle = mix("background", "surfaceAlt", 0.55);
  g.fill();
  gridCache.set(key, cv);
  return cv;
};
const haloCache = new Map<string, HTMLCanvasElement>();
const haloCanvas = (W: number, H: number) => {
  const key = `${W}x${H}`;
  let cv = haloCache.get(key);
  if (!cv) {
    cv = document.createElement("canvas");
    cv.width = Math.round(W / 4);
    cv.height = Math.round(H / 4);
    haloCache.set(key, cv);
  }
  return cv;
};

const drawPanel = (
  out: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  cols: number,
  rows: number,
  P: number,
  capRatio: number,
  texts: LedText[],
  rects: LedRect[],
  heat: number,
) => {
  const m = mask.getContext("2d", {willReadFrequently: true})!;
  m.clearRect(0, 0, cols, rows);
  for (const r of rects) {
    m.globalAlpha = r.level ?? 1;
    m.fillStyle = c(r.color);
    m.fillRect(r.x, r.y, r.w, r.h);
  }
  for (const t of texts) {
    if (!t.text) continue;
    const px = t.size / capRatio;
    m.globalAlpha = t.level ?? 1;
    m.fillStyle = c(t.color);
    m.font = fontSpec(px);
    m.textAlign = t.align ?? "center";
    m.textBaseline = "alphabetic";
    (m as unknown as {letterSpacing: string}).letterSpacing = `${t.tracking ?? 0}px`;
    m.fillText(t.text, t.x, t.y + t.size / 2);
  }
  m.globalAlpha = 1;
  const data = m.getImageData(0, 0, cols, rows).data;

  const g = out.getContext("2d")!;
  const W = cols * P;
  const H = rows * P;
  const rad = P * 0.36;
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.filter = "none";
  // fundo + LEDs apagados (a grade que dá a cara de painel): desenhado uma vez e reaproveitado
  g.drawImage(offGrid(cols, rows, P, rad), 0, 0);
  // halo: a própria máscara desfocada, somada por cima. O desfoque é feito em 1/4 da resolução e
  // ampliado (é suave por natureza, o resultado é o mesmo e custa ~16× menos no render por software)
  const halo = haloCanvas(W, H);
  const hg = halo.getContext("2d")!;
  const k = 4;
  g.save();
  g.globalCompositeOperation = "lighter";
  g.imageSmoothingEnabled = true;
  for (const [blur, a] of [
    [P * 1.4, 0.5 + heat * 0.4],
    [P * 4, 0.28 + heat * 0.3],
  ] as const) {
    hg.globalCompositeOperation = "source-over";
    hg.filter = "none";
    hg.clearRect(0, 0, halo.width, halo.height);
    hg.imageSmoothingEnabled = true;
    hg.filter = `blur(${blur / k}px)`;
    hg.drawImage(mask, 0, 0, cols, rows, 0, 0, halo.width, halo.height);
    g.globalAlpha = a;
    g.drawImage(halo, 0, 0, halo.width, halo.height, 0, 0, W, H);
  }
  g.restore();
  // LEDs acesos (cor + núcleo quente)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const a = data[i + 3] / 255;
      if (a < 0.08) continue;
      const cx = x * P + P / 2;
      const cy = y * P + P / 2;
      const lvl = Math.min(1, a * 1.15);
      g.beginPath();
      g.arc(cx, cy, rad * 1.04, 0, Math.PI * 2);
      g.fillStyle = `rgba(${data[i]}, ${data[i + 1]}, ${data[i + 2]}, ${lvl})`;
      g.fill();
      g.beginPath();
      g.arc(cx - rad * 0.15, cy - rad * 0.15, rad * 0.5, 0, Math.PI * 2);
      g.fillStyle = rgba("text", lvl * (0.32 + heat * 0.4));
      g.fill();
    }
  }
};

/** Face do painel como textura. Redesenha quando o conteúdo muda (o conteúdo é função do frame). */
const useLedTexture = (cols: number, rows: number, texts: LedText[], rects: LedRect[], heat: number) => {
  const capRatio = useSuspense("led-font", loadLedFont);
  const P = 12;
  const {out, mask, tex} = useMemo(() => {
    const o = document.createElement("canvas");
    o.width = cols * P;
    o.height = rows * P;
    const mk = document.createElement("canvas");
    mk.width = cols;
    mk.height = rows;
    const t = new THREE.CanvasTexture(o);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return {out: o, mask: mk, tex: t};
  }, [cols, rows]);
  const sig = JSON.stringify([texts, rects, Math.round(heat * 100)]);
  useMemo(() => {
    drawPanel(out, mask, cols, rows, P, capRatio, texts, rects, heat);
    tex.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, out, mask, tex, capRatio]);
  return tex;
};

// ---------------------------------------------------------------------------------------------
// O placar 3D: caixa fosca, moldura, painel de LED, dois pilares e a luz que o painel joga no entorno.
// position = centro do painel.
// ---------------------------------------------------------------------------------------------
export const Scoreboard: React.FC<{
  texts: LedText[];
  rects?: LedRect[];
  width?: number;
  cols?: number;
  rows?: number;
  position?: V3;
  rotation?: V3;
  /** 0–1: "esquenta" o painel (flash de gol) */
  heat?: number;
  /** pontos de brilho âmbar sobre o painel (em colunas/linhas), para o brilho vazar para a cena */
  glows?: {x: number; y: number; size: number; color?: string; intensity?: number}[];
  posts?: number;
}> = ({texts, rects = [], width = 3.2, cols = 104, rows = 60, position = [0, 0, 0], rotation = [0, 0, 0], heat = 0, glows = [], posts = 2.4}) => {
  const tex = useLedTexture(cols, rows, texts, rects, heat);
  const W = width;
  const H = (width * rows) / cols;
  const m = 0.13; // margem da caixa em volta do painel
  const depth = 0.34;
  const toWorld = (x: number, y: number): V3 => [(x / cols - 0.5) * W, (0.5 - y / rows) * H, 0.05];
  return (
    <group position={position} rotation={rotation}>
      {/* caixa */}
      <Solid size={[W + m * 2, H + m * 2, depth]} position={[0, 0, -depth / 2]} color="surface" />
      {/* moldura em relevo */}
      <Solid size={[W + m * 2, 0.05, 0.08]} position={[0, H / 2 + m - 0.025, 0.02]} color="surfaceAlt" />
      <Solid size={[W + m * 2, 0.05, 0.08]} position={[0, -H / 2 - m + 0.025, 0.02]} color="surfaceAlt" />
      <Solid size={[0.05, H + m * 2, 0.08]} position={[-W / 2 - m + 0.025, 0, 0.02]} color="surfaceAlt" />
      <Solid size={[0.05, H + m * 2, 0.08]} position={[W / 2 + m - 0.025, 0, 0.02]} color="surfaceAlt" />
      {/* painel */}
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* pilares */}
      {posts > 0 &&
        [-1, 1].map((s) => (
          <Solid key={s} size={[0.13, posts, 0.13]} position={[s * W * 0.3, -H / 2 - m - posts / 2, -depth / 2]} color="surface" />
        ))}
      {/* luz do painel no entorno (moldura, pilares, chão) */}
      <pointLight position={[0, -H * 0.2, 0.9]} intensity={1.2 + heat * 2.5} distance={4} decay={2} color={c("accent")} />
      {glows.map((g, i) => (
        <Glow key={i} position={toWorld(g.x, g.y)} size={g.size} color={g.color ?? "accent"} intensity={g.intensity ?? 0.35} />
      ))}
    </group>
  );
};

/** Estádio à noite: torres de holofote frias no alto, ao fundo, + poeira no ar. */
export const Stadium: React.FC<{y?: number; z?: number; dust?: boolean; lamps?: boolean; xs?: number[]}> = ({y = 4.3, z = -8, dust = true, lamps = true, xs = [-5.4, -2.2, 2.2, 5.4]}) => {
  const lamp = mix("glow", "text", 0.55);
  return (
    <group>
      {(lamps ? xs : []).map((x, k) => (
        <group key={k} position={[x, y + (k % 2 === 0 ? 0 : 0.35), z]} rotation={[0.15, -x * 0.05, 0]}>
          {[0, 1, 2, 3].map((cx) =>
            [0, 1].map((cy) => (
              <mesh key={`${cx}-${cy}`} position={[(cx - 1.5) * 0.19, (cy - 0.5) * 0.19, 0]}>
                <boxGeometry args={[0.13, 0.13, 0.04]} />
                <meshBasicMaterial color={lamp} toneMapped={false} fog={false} transparent opacity={0.85} />
              </mesh>
            )),
          )}
          <Glow position={[0, 0, 0.2]} size={5} color="glow" intensity={0.38} />
          <Glow position={[0, 0, 0.3]} size={1.6} color={lamp} intensity={0.4} />
        </group>
      ))}
      {dust && <Particles count={70} spread={[9, 7, 6]} size={0.022} colors={["glow"]} opacity={0.3} seed="estadio" />}
    </group>
  );
};
