#!/usr/bin/env node
// Conferência sem renderizar o vídeo inteiro: tabela de cortes (com a fala de cada um) + prancha de quadros.
//   npm run check -- <id>                  → resumo + prancha (um quadro a cada 1,5 s) em out/check/<id>/prancha.jpg
//   npm run check -- <id> --every 1        → intervalo da prancha
//   npm run check -- <id> --at 3.2,7.9     → instantes exatos em resolução cheia
//   npm run check -- <id> --safe           → desenha as zonas de interface (vermelho) e a faixa da legenda (amarelo)
//   npm run check -- <id> --so-resumo      → só a tabela (rápido)
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {openBrowser, renderStill} from "@remotion/renderer";
import {imprimirResumo, prepararEdicao} from "./lib/remotion.mjs";
import {parseArgs, root} from "./lib/util.mjs";

const {pos, opts} = parseArgs();
const id = pos[0];
if (!id) {
  console.error("uso: npm run check -- <id> [--every 1.5 | --at 1.2,3.4] [--safe] [--so-resumo]");
  process.exit(1);
}

const main = async () => {
  const {serveUrl, composition, resumo} = await prepararEdicao(id);
  imprimirResumo(id, resumo);
  if (opts["so-resumo"]) return;
  const fps = composition.fps;
  const dur = composition.durationInFrames / fps;
  const atList = opts.at ? String(opts.at).split(",").map(Number) : null;
  const every = +(opts.every ?? 1.5);
  const times = atList ?? Array.from({length: Math.floor(dur / every) + 1}, (_, i) => +(i * every + 0.25).toFixed(2)).filter((t) => t < dur);
  const scale = atList ? 1 : 0.5;
  const outDir = path.join(root, "out", "check", id);
  fs.rmSync(outDir, {recursive: true, force: true});
  fs.mkdirSync(outDir, {recursive: true});
  const tokens = JSON.parse(fs.readFileSync(path.join(root, "public", "estilo", "tokens.json"), "utf8"));
  const browser = await openBrowser("chrome");
  const files = [];
  for (const [i, t] of times.entries()) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(t * fps));
    const file = path.join(outDir, `${String(i).padStart(3, "0")}-t${t.toFixed(2)}.jpg`);
    await renderStill({composition, serveUrl, output: file, frame, puppeteerInstance: browser, scale, imageFormat: "jpeg", jpegQuality: 88});
    const filters = [];
    if (opts.safe && composition.height > composition.width * 1.3) {
      const k = (composition.width / 1080) * scale;
      const s = tokens.layout.safe;
      const W = composition.width * scale, H = composition.height * scale;
      filters.push(`drawbox=x=0:y=0:w=${W}:h=${s.top * k}:color=red@0.16:t=fill`, `drawbox=x=0:y=${H - s.bottom * k}:w=${W}:h=${s.bottom * k}:color=red@0.16:t=fill`, `drawbox=x=${W - s.right * k}:y=0:w=${s.right * k}:h=${H}:color=red@0.12:t=fill`);
      const ch = tokens.captions.size * 2.8 * k;
      filters.push(`drawbox=x=0:y=${H - s.bottom * k - ch}:w=${W}:h=${ch}:color=yellow@0.5:t=3`);
    }
    if (!atList) filters.push(`drawtext=text='${t.toFixed(2)}s':x=12:y=12:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8`);
    if (filters.length) {
      const tmp = file.replace(".jpg", ".tmp.jpg");
      const run = (fl) => {
        try {
          execFileSync("ffmpeg", ["-y", "-v", "error", "-i", file, "-vf", fl.join(","), tmp]);
          fs.renameSync(tmp, file);
          return true;
        } catch {
          return false;
        }
      };
      if (!run(filters)) run(filters.filter((x) => !x.startsWith("drawtext")));
    }
    files.push(file);
    process.stdout.write(`\r  ${i + 1}/${times.length} quadros`);
  }
  await browser.close({silent: true});
  console.log("");
  if (!atList) {
    const cols = composition.width > composition.height ? 4 : 6;
    const rows = Math.ceil(files.length / cols);
    const list = path.join(os.tmpdir(), `check-${id}-${Date.now()}.txt`);
    fs.writeFileSync(list, files.map((f) => `file '${f}'\nduration 1`).join("\n"));
    const sheet = path.join(outDir, "prancha.jpg");
    const w = composition.width > composition.height ? 420 : 270;
    execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", `scale=${w}:-1,tile=${cols}x${rows}:padding=6:margin=6:color=0x202020`, "-frames:v", "1", "-q:v", "3", sheet]);
    fs.rmSync(list, {force: true});
    console.log(`✓ prancha: ${path.relative(process.cwd(), sheet)}  (${files.length} quadros de ${dur.toFixed(1)}s) — abra e confira com o checklist`);
  } else {
    console.log(`✓ ${files.length} quadro(s) em ${path.relative(process.cwd(), outDir)}`);
  }
};

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
