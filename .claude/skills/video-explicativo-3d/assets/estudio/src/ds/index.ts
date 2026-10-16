import {loadFont} from "@remotion/fonts";
import type {CSSProperties} from "react";
import {staticFile} from "remotion";
// Cópia gerada de design-system/tokens.json (npm run ds:sync). Não edite public/ds à mão.
import raw from "../../public/ds/tokens.json";
import type {FontRole, Tokens} from "./types";

export type {Tokens, FontRole} from "./types";

export const ds = raw as unknown as Tokens;

/** Arquivo do design system (fontes, logos, sons) servido a partir de public/ds/. */
export const dsFile = (path: string) => staticFile(`ds/${path.replace(/^\.?\//, "")}`);

type ColorRole = Exclude<keyof Tokens["color"], "data" | "gradient">;

/**
 * Resolve uma cor do design system. Aceita papel ("primary"), série de dados ("data.2"),
 * ou uma cor literal ("#fff", "rgba(...)") — use literais só quando o design system não cobre o caso.
 */
export const c = (role: ColorRole | `data.${number}` | string): string => {
  if (role.startsWith("data.")) {
    const i = Number(role.slice(5));
    const data = ds.color.data;
    return data[((i % data.length) + data.length) % data.length];
  }
  const v = (ds.color as Record<string, unknown>)[role];
  if (typeof v === "string") return v;
  return role;
};

/** Cor da série i da paleta de dados (cicla se houver mais séries que cores). */
export const dataColor = (i: number) => c(`data.${i}`);

/** Aplica transparência a uma cor hex (#rgb, #rrggbb) ou papel do design system. */
export const alpha = (color: string, a: number): string => {
  const hex = c(color);
  const m = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Mistura duas cores hex (t=0 → a, t=1 → b). */
export const mix = (a: string, b: string, t: number): string => {
  const pa = parseInt(c(a).slice(1), 16);
  const pb = parseInt(c(b).slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
};

export type TypeRole = "display" | "body" | "mono" | "accent";
export type TypeSize = keyof Tokens["typography"]["scale"];

const role = (r: TypeRole): FontRole =>
  (ds.typography[r] as FontRole | undefined) ?? ds.typography.body;

/** Estilo tipográfico completo de um papel + tamanho da escala do design system. */
export const type = (r: TypeRole, size: TypeSize | number, overrides: CSSProperties = {}): CSSProperties => {
  const f = role(r);
  const px = typeof size === "number" ? size : ds.typography.scale[size];
  return {
    fontFamily: `"${f.family}", ${f.fallback ?? "sans-serif"}`,
    fontWeight: f.weight,
    fontSize: px,
    lineHeight: f.lineHeight ?? 1.1,
    letterSpacing: f.letterSpacing !== undefined ? `${f.letterSpacing}em` : undefined,
    textTransform: f.textTransform && f.textTransform !== "none" ? f.textTransform : undefined,
    fontFeatureSettings: '"kern", "liga", "tnum"',
    ...overrides,
  };
};

/** URL do TTF de um papel tipográfico, para letreiros 3D. */
export const ttfFor = (r: TypeRole): string | null => {
  const f = role(r);
  if (f.ttf) return dsFile(f.ttf);
  const ttf = f.files.find((x) => /\.(ttf|otf)$/i.test(x.src));
  return ttf ? dsFile(ttf.src) : null;
};

// Carrega todas as fontes declaradas. loadFont já segura o render (delayRender) até a fonte existir.
const loaded = new Set<string>();
for (const r of ["display", "body", "mono", "accent"] as const) {
  const f = ds.typography[r] as FontRole | undefined;
  if (!f) continue;
  for (const file of f.files) {
    const key = `${f.family}|${file.weight}|${file.style ?? "normal"}`;
    if (loaded.has(key)) continue;
    loaded.add(key);
    loadFont({family: f.family, url: dsFile(file.src), weight: String(file.weight), style: file.style ?? "normal"});
  }
}

export const radius = (k: keyof Tokens["shape"]["radius"] = "md") =>
  ds.shape.corner === "sharp" ? 0 : ds.shape.corner === "pill" && k !== "sm" ? 999 : ds.shape.radius[k];
