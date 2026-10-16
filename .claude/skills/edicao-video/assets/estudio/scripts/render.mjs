#!/usr/bin/env node
// Render final + masterização de loudness + capa + legendas .srt.
//   npm run render -- <id>                 → out/<id>.mp4, out/<id>-capa.jpg, out/<id>.srt
//   npm run render -- <id> --rascunho      → metade da resolução, para revisar ritmo rápido
//   npm run render -- <id> --capa 2.4      → instante da capa (padrão: `capa` da edição ou 1 s)
//   npm run render -- <id> --concurrency 4 · --sem-master (não mexe no áudio)
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {renderMedia} from "@remotion/renderer";
import {imprimirResumo, prepararEdicao, srtDe} from "./lib/remotion.mjs";
import {fmtBytes, fmtTime, parseArgs, root} from "./lib/util.mjs";

const {pos, opts} = parseArgs();
const id = pos[0];
if (!id) {
  console.error("uso: npm run render -- <id> [--rascunho] [--capa 2.4] [--concurrency N] [--sem-master]");
  process.exit(1);
}
const rascunho = !!opts.rascunho;

const main = async () => {
  const {serveUrl, composition, resumo} = await prepararEdicao(id);
  imprimirResumo(id, resumo);
  const outDir = path.join(root, "out");
  fs.mkdirSync(outDir, {recursive: true});
  const out = path.join(outDir, `${id}${rascunho ? "-rascunho" : ""}.mp4`);
  const conc = +(opts.concurrency ?? Math.max(1, Math.min(8, os.cpus().length)));
  const t0 = Date.now();
  let last = -1;
  console.log(`→ renderizando ${id} (${rascunho ? "rascunho" : "final"}, ${conc} abas)…`);
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: out,
    imageFormat: "jpeg",
    jpegQuality: rascunho ? 80 : 95,
    crf: rascunho ? 28 : 17,
    pixelFormat: "yuv420p",
    audioCodec: "aac",
    scale: rascunho ? 0.5 : 1,
    concurrency: conc,
    overwrite: true,
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        process.stdout.write(`\r  ${Math.round(progress * 100)}%`);
      }
    },
  });
  console.log("");
  // loudness: -14 LUFS / -1,5 dBTP (padrão de Reels, TikTok, Shorts e YouTube). Vídeo copiado sem recompressão.
  if (!opts["sem-master"]) {
    const p1 = spawnSync("ffmpeg", ["-hide_banner", "-i", out, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], {encoding: "utf8"}).stderr;
    const i0 = p1.lastIndexOf("{");
    if (i0 >= 0) {
      const m = JSON.parse(p1.slice(i0, p1.lastIndexOf("}") + 1));
      if (Number.isFinite(+m.input_i) && +m.input_i > -70) {
        const tmp = out.replace(/\.mp4$/, ".master.mp4");
        execFileSync("ffmpeg", ["-y", "-v", "error", "-i", out, "-c:v", "copy", "-af", `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp]);
        fs.renameSync(tmp, out);
      }
    }
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const capaT = opts.capa ?? resumo?.capa ?? 1.0;
  const capa = path.join(outDir, `${id}-capa.jpg`);
  spawnSync("ffmpeg", ["-y", "-v", "error", "-ss", String(capaT), "-i", out, "-frames:v", "1", "-q:v", "2", capa]);
  if (resumo?.palavras?.length) fs.writeFileSync(path.join(outDir, `${id}.srt`), srtDe(resumo.palavras));

  const lo = spawnSync("ffmpeg", ["-hide_banner", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], {encoding: "utf8"}).stderr;
  const I = +(lo.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0] ?? NaN);
  const TP = +(lo.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)?.[0] ?? NaN);
  const st = fs.statSync(out);
  console.log(`\n✓ ${path.relative(process.cwd(), out)}  ${fmtTime(resumo?.duracao ?? 0)} · ${fmtBytes(st.size)} · render ${secs}s`);
  console.log(`  capa: ${path.relative(process.cwd(), capa)}${resumo?.palavras?.length ? ` · legendas: ${path.relative(process.cwd(), path.join(outDir, `${id}.srt`))}` : ""}`);
  if (Number.isFinite(I)) console.log(`  áudio: ${I.toFixed(1)} LUFS${I < -16 || I > -12 ? "  ⚠ fora de −16…−12" : ""} · pico ${Number.isFinite(TP) ? TP.toFixed(1) : "?"} dBFS${TP > -0.5 ? "  ⚠ clipando" : ""}`);
  execFileSync(process.execPath, [path.join(root, "scripts", "galeria.mjs")], {stdio: "inherit"});
};

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
