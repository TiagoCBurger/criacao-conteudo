#!/usr/bin/env node
// Sincroniza o design system do projeto para dentro do estúdio (public/ds) e prepara a biblioteca de sons (public/sfx).
// Roda sozinho antes de studio/render/still. A fonte da verdade continua sendo a pasta do design system.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {validateDesignSystem} from "./validate-ds.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "studio.config.json"), "utf8"));
const dsDir = path.resolve(root, cfg.designSystem);

const {errors, warnings, tokens} = validateDesignSystem(dsDir);
warnings.forEach((w) => console.log(`⚠ ${w}`));
if (errors.length) {
  errors.forEach((e) => console.log(`✗ ${e}`));
  console.log(`\nCorrija ${path.relative(process.cwd(), dsDir)}/tokens.json (ou rode scripts/validate-ds.mjs) antes de renderizar.`);
  process.exit(1);
}

// 1) design system → public/ds
const pub = path.join(root, "public", "ds");
fs.rmSync(pub, {recursive: true, force: true});
fs.cpSync(dsDir, pub, {recursive: true, filter: (src) => !/\.(md|pdf|fig|sketch|ai|psd)$/i.test(src)});

// 2) sons: biblioteca gerada na paleta da marca + sons próprios por cima
const sfxDir = path.join(root, "public", "sfx");
const manifestFile = path.join(sfxDir, "manifest.json");
const palette = tokens.sound.palette ?? "soft";
let manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : null;
if (!manifest || manifest.palette !== palette || manifest.generatedBy !== "gen-sfx.mjs") {
  fs.rmSync(sfxDir, {recursive: true, force: true});
  execFileSync(process.execPath, [path.join(here, "gen-sfx.mjs"), "--palette", palette, "--out", sfxDir], {stdio: "inherit"});
  manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
}
for (const [k, v] of Object.entries(manifest.sounds)) if (v.source === "marca") delete manifest.sounds[k];

const durationOf = (file) => {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], {encoding: "utf8"});
    return +(+out.trim()).toFixed(3);
  } catch {
    return 2;
  }
};
if (tokens.sound.library) {
  const lib = path.join(dsDir, tokens.sound.library);
  if (fs.existsSync(lib)) {
    for (const f of fs.readdirSync(lib)) {
      if (!/\.(wav|mp3|ogg|m4a|aac)$/i.test(f)) continue;
      const name = f.replace(/\.[^.]+$/, "");
      const dest = `marca-${f}`;
      fs.copyFileSync(path.join(lib, f), path.join(sfxDir, dest));
      manifest.sounds[name] = {file: dest, duration: durationOf(path.join(sfxDir, dest)), description: "som da marca", source: "marca"};
    }
  }
}
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
console.log(`✓ design system "${tokens.meta.name}" sincronizado · ${Object.keys(manifest.sounds).length} efeitos sonoros`);
