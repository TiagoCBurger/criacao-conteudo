import {loadFont} from "@remotion/fonts";
import type {CSSProperties} from "react";
import {staticFile} from "remotion";
// Gerado por `npm run estilo`: estilo/padrao.json + design-system/tokens.json do projeto por cima. Não edite à mão.
import raw from "../../public/estilo/tokens.json";

export type FontFile = {src: string; weight: number; style?: "normal" | "italic"};
export type FontRole = {family: string; fallback?: string; weight: number; files: FontFile[]; letterSpacing?: number; lineHeight?: number; textTransform?: "none" | "uppercase" | "lowercase"};
type Spring = {damping?: number; stiffness?: number; mass?: number};

export type Estilo = {
  meta: {name: string};
  color: Record<string, string | string[] | Record<string, unknown>> & {background: string; text: string; textMuted: string; accent: string; primary: string; surface: string};
  typography: {display: FontRole; body: FontRole; mono?: FontRole; accent?: FontRole; scale: Record<"hero" | "h1" | "h2" | "h3" | "body" | "small" | "label", number>};
  shape: {radius: {sm: number; md: number; lg: number}; corner?: "rounded" | "sharp" | "pill"};
  layout: {margin: number; safe: {top: number; bottom: number; left: number; right: number}};
  motion: {spring: {enter: Spring; pop: Spring; soft?: Spring}};
  captions: {enabled: boolean; style: string; position: "bottom" | "center" | "top"; maxWords: number; size: number; font: "display" | "body" | "accent"; textTransform?: "none" | "uppercase"; highlight: string; box?: string; stroke?: number};
  brand: {logo?: string; logoOnDark?: string; handle?: string};
  sound: {palette: string; sfxGain: number; musicGain: number; duckTo: number; transitionSfx?: string | null};
};

export const estilo = raw as unknown as Estilo;

/** Arquivo do estilo (fontes, logo) servido de public/estilo/. */
export const estiloFile = (p: string) => staticFile(`estilo/${p.replace(/^\.?\//, "")}`);

/** Cor do estilo por papel ("accent", "text"…) ou literal ("#fff"). */
export const cor = (papel: string): string => {
  const v = estilo.color[papel];
  return typeof v === "string" ? v : papel;
};

/** Cor com transparência (aceita papel do estilo ou hex). */
export const alpha = (color: string, a: number): string => {
  const hex = cor(color);
  const m = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export type PapelTipo = "display" | "body" | "mono" | "accent";
export type TamanhoTipo = keyof Estilo["typography"]["scale"];

/** Estilo tipográfico de um papel do estilo, num tamanho da escala (px no quadro de 1080 de largura) ou em px. */
export const tipo = (papel: PapelTipo, tamanho: TamanhoTipo | number, extra: CSSProperties = {}): CSSProperties => {
  const f = (estilo.typography[papel] as FontRole | undefined) ?? estilo.typography.body;
  const px = typeof tamanho === "number" ? tamanho : estilo.typography.scale[tamanho];
  return {
    fontFamily: `"${f.family}", ${f.fallback ?? "sans-serif"}`,
    fontWeight: f.weight,
    fontSize: px,
    lineHeight: f.lineHeight ?? 1.1,
    letterSpacing: f.letterSpacing !== undefined ? `${f.letterSpacing}em` : undefined,
    textTransform: f.textTransform && f.textTransform !== "none" ? f.textTransform : undefined,
    ...extra,
  };
};

export const raio = (k: "sm" | "md" | "lg" = "md") => (estilo.shape.corner === "sharp" ? 0 : estilo.shape.corner === "pill" && k !== "sm" ? 999 : estilo.shape.radius[k]);

// carrega as fontes declaradas; loadFont segura o render até a fonte existir
const carregadas = new Set<string>();
for (const papel of ["display", "body", "mono", "accent"] as const) {
  const f = estilo.typography[papel] as FontRole | undefined;
  if (!f?.files) continue;
  for (const file of f.files) {
    const key = `${f.family}|${file.weight}|${file.style ?? "normal"}`;
    if (carregadas.has(key)) continue;
    carregadas.add(key);
    loadFont({family: f.family, url: estiloFile(file.src), weight: String(file.weight), style: file.style ?? "normal"});
  }
}

/**
 * Área segura do quadro (px). No vertical usa layout.safe do estilo (interface de Reels/TikTok/Shorts:
 * topo, base e faixa direita com botões), escalado para a largura; nos outros formatos, uma margem de 5%.
 */
export const areaSegura = (w: number, h: number) => {
  if (h > w * 1.3) {
    const k = w / 1080;
    const s = estilo.layout.safe;
    return {top: s.top * k, bottom: s.bottom * k, left: s.left * k, right: s.right * k};
  }
  const m = Math.round(Math.min(w, h) * 0.05);
  return {top: m, bottom: m, left: m, right: m};
};

/** Fator de escala da tipografia: a escala do estilo é para o lado menor do quadro = 1080 px. */
export const escalaTipo = (w: number, h: number) => Math.min(w, h) / 1080;
