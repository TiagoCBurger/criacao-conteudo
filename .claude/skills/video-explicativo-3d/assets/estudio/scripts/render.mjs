#!/usr/bin/env node
// Render final + capa + legendas + checagem de loudness.
// Uso: node scripts/render.mjs <id> [--draft] [--poster 1.0] [--concurrency 4] [--gl angle|swangle]
//   --draft: metade da resolução e compressão maior, para revisar ritmo rápido.
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const argv = process.argv.slice(2);
const id = argv[0];
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
if (!id || id.startsWith("--")) {
  console.error("uso: node scripts/render.mjs <id> [--draft] [--poster 1.0] [--concurrency N] [--gl angle|swangle]");
  process.exit(1);
}
const draft = argv.includes("--draft");
const gl = opt("gl", fs.existsSync("/dev/dri/renderD128") ? "angle" : "swangle");
const conc = opt("concurrency", String(Math.max(1, Math.min(8, os.cpus().length))));
const outDir = path.join(root, "out");
fs.mkdirSync(outDir, {recursive: true});
const out = path.join(outDir, `${id}${draft ? "-rascunho" : ""}.mp4`);

execFileSync(process.execPath, [path.join(here, "sync-ds.mjs")], {stdio: "inherit"});

const t0 = Date.now();
const args = ["remotion", "render", id, out, `--gl=${gl}`, `--concurrency=${conc}`, "--log=error"];
if (draft) args.push("--scale=0.5", "--crf=28");
console.log(`→ renderizando ${id} (${draft ? "rascunho" : "final"}, gl=${gl}, ${conc} abas)…`);
const r = spawnSync("npx", args, {cwd: root, stdio: "inherit"});
if (r.status !== 0) process.exit(r.status ?? 1);
// masterização de loudness (2 passadas, linear): -14 LUFS / -1.5 dBTP, padrão de Reels/TikTok/Shorts.
// O vídeo é copiado sem recompressão; só o áudio é reprocessado.
if (!argv.includes("--no-master")) {
  const pass1 = spawnSync("ffmpeg", ["-hide_banner", "-i", out, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], {encoding: "utf8"}).stderr;
  const m = JSON.parse(pass1.slice(pass1.lastIndexOf("{"), pass1.lastIndexOf("}") + 1));
  const tmp = out.replace(/\.mp4$/, ".master.mp4");
  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-i", out, "-c:v", "copy",
    "-af", `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp,
  ]);
  fs.renameSync(tmp, out);
}
const secs = ((Date.now() - t0) / 1000).toFixed(0);

// capa (frame escolhido) para thumbnail da plataforma
const poster = path.join(outDir, `${id}-capa.jpg`);
execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", opt("poster", "1.0"), "-i", out, "-frames:v", "1", "-q:v", "2", poster]);

// legendas .srt ao lado do vídeo
const srt = path.join(root, "public", "videos", id, "legendas.srt");
if (fs.existsSync(srt)) fs.copyFileSync(srt, path.join(outDir, `${id}.srt`));

// loudness do mix final (alvo para redes: -14 a -16 LUFS, pico ≤ -1 dBTP)
const lo = spawnSync("ffmpeg", ["-hide_banner", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], {encoding: "utf8"}).stderr;
const I = +(lo.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0] ?? NaN);
const TP = +(lo.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)?.[0] ?? NaN);
const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "csv=p=0", out], {encoding: "utf8"}).trim().split(",");

console.log(`\n✓ ${path.relative(process.cwd(), out)}  ${(+probe[0]).toFixed(1)}s · ${(+probe[1] / 1e6).toFixed(1)} MB · render ${secs}s`);
console.log(`  capa: ${path.relative(process.cwd(), poster)}`);
if (!Number.isNaN(I)) {
  const okI = I >= -16 && I <= -12;
  const okP = Number.isNaN(TP) || TP <= -0.5;
  console.log(`  áudio: ${I.toFixed(1)} LUFS${okI ? "" : "  ⚠ fora de -16…-12"} · pico ${Number.isNaN(TP) ? "?" : TP.toFixed(1)} dBFS${okP ? "" : "  ⚠ clipando"}`);
}
