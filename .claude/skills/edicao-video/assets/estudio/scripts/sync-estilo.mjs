#!/usr/bin/env node
// Monta o estilo do estúdio em public/estilo/tokens.json: o padrão neutro (estilo/padrao.json) com o
// design system do projeto por cima (design-system/tokens.json, o mesmo formato da skill video-explicativo-3d).
// Também gera a biblioteca de efeitos sonoros em public/sfx. Roda sozinho antes de studio/typecheck/check/render.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "estudio.config.json"), "utf8"));
const dsDir = path.resolve(root, cfg.designSystem ?? "../design-system");
const pub = path.join(root, "public", "estilo");

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const merge = (a, b) => {
  if (!isObj(a) || !isObj(b)) return b === undefined ? a : b;
  const out = {...a};
  for (const [k, v] of Object.entries(b)) out[k] = merge(a[k], v);
  return out;
};

const padrao = JSON.parse(fs.readFileSync(path.join(root, "estilo", "padrao.json"), "utf8"));
fs.rmSync(pub, {recursive: true, force: true});
fs.mkdirSync(pub, {recursive: true});
fs.cpSync(path.join(root, "estilo"), path.join(pub, "padrao"), {recursive: true, filter: (s) => !s.endsWith(".json")});

let tokens = padrao;
let origem = "padrão neutro (sem design-system/tokens.json)";
const dsFile = path.join(dsDir, "tokens.json");
if (fs.existsSync(dsFile)) {
  let ds;
  try {
    ds = JSON.parse(fs.readFileSync(dsFile, "utf8"));
  } catch (e) {
    console.error(`✗ ${path.relative(process.cwd(), dsFile)} não é JSON válido: ${e.message}`);
    process.exit(1);
  }
  fs.cpSync(dsDir, path.join(pub, "ds"), {recursive: true, filter: (s) => !/\.(md|pdf|fig|sketch|ai|psd|mp4|mov)$/i.test(s)});
  // arquivos do design system ficam em public/estilo/ds/: corrige os caminhos das fontes e do logo
  const typography = {...(ds.typography ?? {})};
  for (const [k, role] of Object.entries(typography)) {
    if (!isObj(role) || !Array.isArray(role.files)) continue;
    typography[k] = {...role, files: role.files.map((f) => ({...f, src: `ds/${String(f.src).replace(/^\.?\//, "")}`}))};
  }
  const brand = {...(ds.brand ?? {})};
  for (const k of ["logo", "logoOnDark"]) if (brand[k]) brand[k] = `ds/${String(brand[k]).replace(/^\.?\//, "")}`;
  const sound = {...(ds.sound ?? {})};
  if (sound.library) sound.library = path.join(dsDir, sound.library);
  // só os campos que a edição usa; o resto do design system (3D, direção de arte…) não se aplica aqui
  const picked = {meta: ds.meta, color: ds.color, typography, shape: ds.shape, layout: ds.layout, motion: {spring: ds.motion?.spring}, captions: ds.captions, brand, sound};
  // uma fonte do design system substitui a padrão inteira (não mistura arquivos de famílias diferentes)
  tokens = merge(padrao, picked);
  for (const k of Object.keys(typography)) if (isObj(typography[k])) tokens.typography[k] = typography[k];
  origem = `design system "${ds.meta?.name ?? path.basename(dsDir)}" (${path.relative(root, dsFile)})`;
}

const avisos = [];
for (const [k, role] of Object.entries(tokens.typography)) {
  if (!isObj(role) || !Array.isArray(role.files)) continue;
  for (const f of role.files) if (!fs.existsSync(path.join(pub, f.src))) avisos.push(`fonte ${k} sem arquivo: ${f.src}`);
}
for (const k of ["logo", "logoOnDark"]) if (tokens.brand?.[k] && !fs.existsSync(path.join(pub, tokens.brand[k]))) avisos.push(`brand.${k} não encontrado: ${tokens.brand[k]}`);
const library = tokens.sound.library;
delete tokens.sound.library;
fs.writeFileSync(path.join(pub, "tokens.json"), JSON.stringify(tokens, null, 2));

// sons: biblioteca sintetizada na paleta do estilo + sons da marca (sound.library) por cima
const sfxDir = path.join(root, "public", "sfx");
const manifestFile = path.join(sfxDir, "manifest.json");
const palette = tokens.sound.palette ?? "crisp";
let manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : null;
if (!manifest || manifest.palette !== palette || manifest.generatedBy !== "gen-sfx.mjs") {
  fs.rmSync(sfxDir, {recursive: true, force: true});
  execFileSync(process.execPath, [path.join(here, "gen-sfx.mjs"), "--palette", palette, "--out", sfxDir], {stdio: ["ignore", "ignore", "inherit"]});
  manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
}
for (const [k, v] of Object.entries(manifest.sounds)) if (v.source === "marca") delete manifest.sounds[k];
if (library && fs.existsSync(library)) {
  for (const f of fs.readdirSync(library)) {
    if (!/\.(wav|mp3|ogg|m4a|aac)$/i.test(f)) continue;
    const name = f.replace(/\.[^.]+$/, "");
    const dest = `marca-${f}`;
    fs.copyFileSync(path.join(library, f), path.join(sfxDir, dest));
    let duration = 2;
    try {
      duration = +(+execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(sfxDir, dest)], {encoding: "utf8"}).trim()).toFixed(3);
    } catch {}
    manifest.sounds[name] = {file: dest, duration, description: "som da marca", source: "marca"};
  }
}
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

// o registro de mídia precisa existir para o TypeScript compilar, mesmo antes do primeiro `npm run midia`
const reg = path.join(root, "src", "midia", "registro.json");
if (!fs.existsSync(reg)) {
  fs.mkdirSync(path.dirname(reg), {recursive: true});
  fs.writeFileSync(reg, JSON.stringify({versao: 1, clipes: {}}, null, 1));
}

avisos.forEach((a) => console.log(`⚠ ${a}`));
console.log(`✓ estilo: ${origem} · ${Object.keys(manifest.sounds).length} efeitos sonoros (${palette})`);
