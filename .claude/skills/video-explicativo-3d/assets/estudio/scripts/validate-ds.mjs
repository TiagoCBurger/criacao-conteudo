#!/usr/bin/env node
// Valida design-system/tokens.json para vídeo: estrutura, arquivos de fonte, contraste e legibilidade.
// Uso: node scripts/validate-ds.mjs [caminho/para/design-system]
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const REQUIRED_COLORS = ["background", "surface", "text", "textMuted", "primary", "secondary", "accent", "positive", "negative"];
const HEX = /^#([0-9a-f]{6})$/i;

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
export const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

export const validateDesignSystem = (dsDir) => {
  const errors = [];
  const warnings = [];
  const file = path.join(dsDir, "tokens.json");
  if (!fs.existsSync(file)) return {errors: [`não encontrei ${file}`], warnings, tokens: null};
  let t;
  try {
    t = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return {errors: [`tokens.json inválido: ${e.message}`], warnings, tokens: null};
  }
  const need = (obj, keys, where) => keys.forEach((k) => obj?.[k] === undefined && errors.push(`falta ${where}.${k}`));
  need(t, ["meta", "color", "typography", "shape", "layout", "surface", "background", "motion", "three", "captions", "brand", "sound"], "tokens");
  if (errors.length) return {errors, warnings, tokens: t};

  // cores
  for (const k of REQUIRED_COLORS) {
    if (!t.color[k]) errors.push(`falta color.${k}`);
    else if (!HEX.test(t.color[k])) errors.push(`color.${k} = "${t.color[k]}" — use hex de 6 dígitos (#RRGGBB)`);
  }
  for (const k of ["backgroundAlt", "surfaceAlt", "border", "textOnPrimary", "warning", "glow"]) {
    if (t.color[k] && !HEX.test(t.color[k])) errors.push(`color.${k} deve ser #RRGGBB`);
  }
  if (!Array.isArray(t.color.data) || t.color.data.length < 3) errors.push("color.data precisa de ao menos 3 cores (paleta de gráficos)");
  else t.color.data.forEach((v, i) => !HEX.test(v) && errors.push(`color.data[${i}] deve ser #RRGGBB`));
  if (errors.length) return {errors, warnings, tokens: t};

  const bg = t.color.background;
  const checks = [
    ["text", bg, 7, 4.5, "texto principal sobre o fundo"],
    ["textMuted", bg, 4.5, 3, "texto secundário sobre o fundo"],
    ["primary", bg, 3, 2, "cor primária (elementos grandes) sobre o fundo"],
    ["accent", bg, 3, 2, "destaque sobre o fundo"],
    ["text", t.color.surface, 4.5, 3, "texto sobre cards (surface)"],
  ];
  for (const [k, against, good, min, label] of checks) {
    const r = contrast(t.color[k], against);
    if (r < min) errors.push(`contraste baixo (${r.toFixed(2)}:1) — ${label}. Mínimo ${min}:1, ideal ${good}:1`);
    else if (r < good) warnings.push(`contraste ${r.toFixed(2)}:1 — ${label} (ideal ≥ ${good}:1 em tela de celular)`);
  }
  const onP = t.color.textOnPrimary ?? bg;
  const rp = contrast(onP, t.color.primary);
  if (rp < 3) warnings.push(`textOnPrimary sobre primary tem ${rp.toFixed(2)}:1 — selos/pílulas ficarão ilegíveis; defina color.textOnPrimary`);
  const hl = t.captions?.highlight ?? "accent";
  const hlHex = t.color[hl] ?? (HEX.test(hl) ? hl : null);
  if (hlHex && t.captions?.style === "box") {
    // no estilo "box" a palavra ativa é textOnPrimary sobre uma caixa na cor de destaque
    if (contrast(onP, hlHex) < 3) warnings.push(`legenda "box": textOnPrimary sobre ${hl} tem pouco contraste`);
  } else if (hlHex && contrast(hlHex, bg) < 3) warnings.push(`destaque da legenda (${hl}) com pouco contraste sobre o fundo`);

  // tipografia
  for (const role of ["display", "body"]) {
    const f = t.typography[role];
    if (!f) {
      errors.push(`falta typography.${role}`);
      continue;
    }
    if (!f.family || !f.weight || !Array.isArray(f.files) || f.files.length === 0) errors.push(`typography.${role} precisa de family, weight e files[]`);
  }
  for (const role of ["display", "body", "mono", "accent"]) {
    const f = t.typography[role];
    if (!f) continue;
    for (const ff of f.files ?? []) {
      if (!fs.existsSync(path.join(dsDir, ff.src))) errors.push(`arquivo de fonte não existe: ${ff.src} (typography.${role})`);
    }
    if (f.ttf && !fs.existsSync(path.join(dsDir, f.ttf))) errors.push(`typography.${role}.ttf não existe: ${f.ttf}`);
  }
  const d = t.typography.display;
  if (d && !d.ttf && !(d.files ?? []).some((x) => /\.(ttf|otf)$/i.test(x.src))) {
    warnings.push("typography.display sem .ttf/.otf — Text3D (letreiro 3D) e Label3D não vão funcionar com a fonte da marca");
  }
  const sc = t.typography.scale ?? {};
  for (const k of ["hero", "h1", "h2", "h3", "body", "small", "label"]) if (!sc[k]) errors.push(`falta typography.scale.${k}`);
  if (sc.body && sc.body < 38) warnings.push(`typography.scale.body = ${sc.body}px — no celular, abaixo de ~40px fica difícil de ler`);
  if (sc.small && sc.small < 28) warnings.push(`typography.scale.small = ${sc.small}px — muito pequeno para 9:16`);
  if (t.captions?.size && t.captions.size < 52) warnings.push(`captions.size = ${t.captions.size}px — legendas verticais costumam usar 56–80px`);

  // motion
  const m = t.motion;
  for (const k of ["standard", "enter", "exit"]) {
    const e = m.easing?.[k];
    if (!Array.isArray(e) || e.length !== 4) errors.push(`motion.easing.${k} deve ser [x1, y1, x2, y2]`);
  }
  for (const k of ["enter", "pop", "soft"]) if (!m.spring?.[k]) errors.push(`falta motion.spring.${k}`);
  if (!m.duration?.base) errors.push("falta motion.duration.{fast,base,slow} (segundos)");
  if (m.duration?.base > 5) errors.push("motion.duration está em segundos, não frames (ex.: base: 0.5)");
  if (!m.transition?.type) errors.push("falta motion.transition.{type,duration}");

  // marca
  for (const k of ["logo", "logoOnDark"]) {
    if (t.brand?.[k] && !fs.existsSync(path.join(dsDir, t.brand[k]))) errors.push(`brand.${k} não existe: ${t.brand[k]}`);
  }
  if (t.sound?.library && !fs.existsSync(path.join(dsDir, t.sound.library))) warnings.push(`sound.library "${t.sound.library}" não existe — usando só os sons gerados`);

  const safe = t.layout?.safe;
  if (safe && (safe.bottom < 250 || safe.top < 150)) warnings.push("layout.safe pequeno demais para Reels/TikTok (recomendado: top ≥ 200, bottom ≥ 320, right ≥ 100)");

  return {errors, warnings, tokens: t};
};

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(process.argv[2] ?? "../design-system");
  const {errors, warnings} = validateDesignSystem(dir);
  warnings.forEach((w) => console.log(`⚠ ${w}`));
  errors.forEach((e) => console.log(`✗ ${e}`));
  if (errors.length) {
    console.log(`\n${errors.length} erro(s) em ${dir}/tokens.json`);
    process.exit(1);
  }
  console.log(`✓ design system válido (${dir})${warnings.length ? ` — ${warnings.length} aviso(s)` : ""}`);
}
