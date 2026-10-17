#!/usr/bin/env node
// Pipeline de IA de um vídeo: narração (OpenRouter) → imagens (OpenRouter) → 3D (TripoSR local)
// → relevo 2.5D (Depth Anything local) → timeline da fala → trilha original (OpenRouter, Lyria).
// Uso: npm run ia -- <slug> [--script ../roteiros/<slug>.md] [--voice cedar]
//        [--sem-narracao] [--sem-imagens] [--sem-timeline] [--sem-trilha] [--force]
//
// Cada etapa pula o que já existe (rode de novo sem medo). --force refaz tudo.
// Resultado em public/videos/<slug>/ia/ e o índice public/videos/<slug>/ia/assets.json, que a cena
// lê para usar os modelos gerados (ou cair em geometria própria se algum faltar).
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
if (!slug) {
  console.error("uso: npm run ia -- <slug> [--script roteiro.md] [--voice cedar] [--sem-narracao] [--sem-imagens] [--sem-trilha] [--force]");
  process.exit(1);
}
const has = (f) => args.includes(`--${f}`);
const force = has("force") ? ["--force"] : [];
const script = opt("script", `../roteiros/${slug}.md`);
const base = path.join("public", "videos", slug, "ia");
const PY = path.join(".ia", "venv", "bin", "python");

const avisos = [];
// soft: a falha vira aviso e o pipeline segue (ex.: trilha sem saldo — o vídeo sai só com voz e efeitos)
const run = (cmd, a, {soft = false} = {}) => {
  console.log(`\n$ ${cmd} ${a.join(" ")}`);
  const r = spawnSync(cmd, a, {stdio: "inherit", env: process.env});
  if (r.status !== 0) {
    if (soft) return avisos.push(`${cmd} ${a.slice(0, 2).join(" ")} falhou (veja acima)`);
    console.error(`✗ falhou: ${cmd} ${a.join(" ")}`);
    process.exit(r.status ?? 1);
  }
};

// 1) narração
const wav = path.join(base, "narracao-openrouter.wav");
if (!has("sem-narracao")) {
  const a = ["scripts/ia/narracao.mjs", slug, "--script", script, ...force];
  if (opt("voice")) a.push("--voice", opt("voice"));
  if (opt("model")) a.push("--model", opt("model"));
  run("node", a);
}

// 2) imagens
const specFile = path.join("src", "videos", slug, "ia.json");
const spec = fs.existsSync(specFile) ? JSON.parse(fs.readFileSync(specFile, "utf8")) : {images: []};
spec.images ??= [];
const imgDir = path.join(base, "img");
if (!has("sem-imagens") && spec.images.length) run("node", ["scripts/ia/imagens.mjs", slug, ...force]);

// 3) 3D e 4) relevo (locais)
const to3d = spec.images.filter((i) => i.to3d && fs.existsSync(path.join(imgDir, `${i.name}.png`)));
const relief = spec.images.filter((i) => i.relief && fs.existsSync(path.join(imgDir, `${i.name}.png`)));
if ((to3d.length || relief.length) && !fs.existsSync(PY)) run("bash", ["scripts/ia/setup-3d.sh"]);
for (const i of to3d) {
  const o = i.to3d === true ? {} : i.to3d;
  const a = ["scripts/ia/imagem-para-3d.py", path.join(imgDir, `${i.name}.png`), "--out", path.join(base, "3d"), ...force];
  for (const [k, v] of Object.entries(o)) a.push(`--${k}`, String(v));
  run(PY, a);
}
if (relief.length) run(PY, ["scripts/ia/profundidade.py", ...relief.map((i) => path.join(imgDir, `${i.name}.png`)), "--out", imgDir, ...force]);

// 5) timeline da fala (a trilha precisa dela para ter a duração e a estrutura do vídeo)
if (fs.existsSync(wav) && !has("sem-timeline")) run("npm", ["run", "timeline", "--", slug, "--audio", wav, "--script", script]);

// 6) trilha original sob medida (mantém trilha.mp3 fornecida pelo usuário)
const tlFile = path.join("public", "videos", slug, "timeline.json");
if (!has("sem-trilha")) {
  if (fs.existsSync(tlFile)) run("node", ["scripts/ia/trilha.mjs", slug, ...force], {soft: true});
  else console.log("• trilha: sem timeline.json ainda — rode de novo depois da timeline");
}

// índice para as cenas
const assets = {models: {}, images: {}, reliefs: {}};
for (const i of spec.images) {
  const png = path.join(imgDir, `${i.name}.png`);
  if (!fs.existsSync(png)) continue;
  assets.images[i.name] = `videos/${slug}/ia/img/${i.name}.png`;
  const glb = path.join(base, "3d", `${i.name}.glb`);
  if (fs.existsSync(glb)) {
    const meta = JSON.parse(fs.readFileSync(path.join(base, "3d", `${i.name}.json`), "utf8"));
    assets.models[i.name] = {src: `videos/${slug}/ia/3d/${i.name}.glb`, size: meta.size};
  }
  const dep = path.join(imgDir, `${i.name}.profundidade.png`);
  if (fs.existsSync(dep)) assets.reliefs[i.name] = {image: assets.images[i.name], depth: `videos/${slug}/ia/img/${i.name}.profundidade.png`};
}
if (fs.existsSync(path.join("public", "videos", slug, "trilha.mp3"))) assets.music = `videos/${slug}/trilha.mp3`;
fs.mkdirSync(base, {recursive: true});
fs.writeFileSync(path.join(base, "assets.json"), JSON.stringify(assets, null, 2));
console.log(
  `\n✓ assets.json: ${Object.keys(assets.models).length} modelos 3D, ${Object.keys(assets.reliefs).length} relevos, ${Object.keys(assets.images).length} imagens${assets.music ? ", trilha" : ""}`,
);
if (avisos.length) console.log(`\n! pendências:\n${avisos.map((x) => `  - ${x}`).join("\n")}`);
