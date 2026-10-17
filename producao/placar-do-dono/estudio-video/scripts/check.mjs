#!/usr/bin/env node
// Conferência visual sem renderizar o vídeo inteiro: stills em instantes escolhidos + prancha de contato.
// Uso:
//   node scripts/check.mjs <id>                    → a cada 1.5s, prancha em out/check/<id>/prancha.jpg
//   node scripts/check.mjs <id> --every 1          → intervalo em segundos
//   node scripts/check.mjs <id> --at 0.5,3.2,7.8   → instantes exatos, em resolução cheia
//   node scripts/check.mjs <id> --safe             → desenha as zonas seguras do 9:16 por cima
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bundle} from "@remotion/bundler";
import {openBrowser, renderStill, selectComposition} from "@remotion/renderer";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const argv = process.argv.slice(2);
const id = argv[0];
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
if (!id || id.startsWith("--")) {
  console.error("uso: node scripts/check.mjs <id-da-composição> [--every 1.5 | --at 1.2,3.4] [--safe]");
  process.exit(1);
}
execFileSync(process.execPath, [path.join(here, "sync-ds.mjs")], {stdio: "inherit"});

const gl = opt("gl", fs.existsSync("/dev/dri/renderD128") ? "angle" : "swangle");
const atList = opt("at") ? opt("at").split(",").map(Number) : null;
const scale = atList ? 1 : 0.5;
const outDir = path.join(root, "out", "check", id);
fs.rmSync(outDir, {recursive: true, force: true});
fs.mkdirSync(outDir, {recursive: true});

console.log("→ empacotando…");
const serveUrl = await bundle({entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public")});
const chromiumOptions = {gl};
// adaptação local: navegador do sistema (ex.: /opt/pw-browsers) em vez de baixar o do Remotion
const browserExecutable = process.env.BROWSER_EXECUTABLE || null;
const composition = await selectComposition({serveUrl, id, chromiumOptions, browserExecutable});
const fps = composition.fps;
const dur = composition.durationInFrames / fps;
const times = atList ?? Array.from({length: Math.floor(dur / +opt("every", 1.5)) + 1}, (_, i) => +(i * +opt("every", 1.5) + 0.25).toFixed(2)).filter((t) => t < dur);
const browser = await openBrowser("chrome", {chromiumOptions, browserExecutable});

const ds = JSON.parse(fs.readFileSync(path.join(root, "public", "ds", "tokens.json"), "utf8"));
const fontFile = (() => {
  const dir = path.join(root, "public", "ds", "fonts");
  const f = fs.existsSync(dir) ? fs.readdirSync(dir).find((x) => /\.(ttf|otf)$/i.test(x)) : null;
  return f ? path.join(dir, f) : null;
})();

const files = [];
for (const [i, t] of times.entries()) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * fps));
  const file = path.join(outDir, `${String(i).padStart(3, "0")}-t${t.toFixed(2)}.jpg`);
  await renderStill({composition, serveUrl, output: file, frame, puppeteerInstance: browser, chromiumOptions, browserExecutable, scale, imageFormat: "jpeg", jpegQuality: 88});
  const filters = [];
  if (argv.includes("--safe")) {
    const k = scale;
    const s = ds.layout.safe;
    const W = composition.width * k, H = composition.height * k;
    filters.push(
      `drawbox=x=0:y=0:w=${W}:h=${s.top * k}:color=red@0.16:t=fill`,
      `drawbox=x=0:y=${H - s.bottom * k}:w=${W}:h=${s.bottom * k}:color=red@0.16:t=fill`,
      `drawbox=x=${W - s.right * k}:y=0:w=${s.right * k}:h=${H}:color=red@0.12:t=fill`,
    );
    // faixa da legenda (amarela): o 3D e os textos da cena não devem entrar aqui
    const cap = ds.captions;
    if (cap?.enabled && cap.position === "bottom") {
      const ch = cap.size * 3.2 * k;
      filters.push(`drawbox=x=0:y=${H - s.bottom * k - ch}:w=${W}:h=${ch}:color=yellow@0.5:t=3`);
    }
  }
  if (fontFile && !atList) filters.push(`drawtext=fontfile=${fontFile}:text='${t.toFixed(2)}s':x=14:y=14:fontsize=30:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8`);
  if (filters.length) {
    const tmp = file.replace(".jpg", ".tmp.jpg");
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", file, "-vf", filters.join(","), tmp]);
    fs.renameSync(tmp, file);
  }
  files.push(file);
  process.stdout.write(`\r  ${i + 1}/${times.length} stills`);
}
await browser.close({silent: true});
console.log("");

if (!atList) {
  const cols = 6;
  const rows = Math.ceil(files.length / cols);
  const list = path.join(os.tmpdir(), `check-${id}-${Date.now()}.txt`);
  fs.writeFileSync(list, files.map((f) => `file '${f}'\nduration 1`).join("\n"));
  const sheet = path.join(outDir, "prancha.jpg");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", `scale=270:-1,tile=${cols}x${rows}:padding=6:margin=6:color=0x202020`, "-frames:v", "1", "-q:v", "3", sheet]);
  fs.rmSync(list, {force: true});
  console.log(`✓ prancha: ${path.relative(process.cwd(), sheet)}  (${files.length} quadros, ${dur.toFixed(1)}s)`);
} else {
  console.log(`✓ ${files.length} still(s) em ${path.relative(process.cwd(), outDir)}`);
}
