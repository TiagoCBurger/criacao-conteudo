#!/usr/bin/env node
// Geração de imagens via OpenRouter (POST /api/v1/images) a partir de src/videos/<slug>/ia.json.
// Uso: node scripts/ia/imagens.mjs <slug> [--only nome1,nome2] [--force]
//
// ia.json:
// {
//   "imageModel": "google/gemini-3-pro-image",          // padrão para todas
//   "style": "…",                                        // sufixo de estilo comum (coerência da série)
//   "objectStyle": "…",                                  // sufixo das imagens com to3d (objeto isolado em fundo liso)
//   "images": [
//     {"name": "salao", "prompt": "…", "aspect_ratio": "9:16", "resolution": "2K", "relief": true},
//     {"name": "martelo", "prompt": "…", "aspect_ratio": "1:1", "to3d": true, "reference": "salao"}
//   ]
// }
// Saída: public/videos/<slug>/ia/img/<nome>.png (+ manifest.json com modelo, prompt e custo).
// "reference" passa uma imagem já gerada como referência visual (input_references), para manter o estilo.
import fs from "node:fs";
import path from "node:path";
import {post} from "./openrouter.mjs";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const specFile = path.join("src", "videos", slug ?? "", "ia.json");
if (!slug || !fs.existsSync(specFile)) {
  console.error("uso: node scripts/ia/imagens.mjs <slug> [--only a,b] [--force]  (precisa de src/videos/<slug>/ia.json)");
  process.exit(1);
}
const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
const only = opt("only")?.split(",");
const force = args.includes("--force");
const outDir = path.join("public", "videos", slug, "ia", "img");
fs.mkdirSync(outDir, {recursive: true});
const manifestFile = path.join(outDir, "manifest.json");
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : {};

const dataUrl = (file) => `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;

async function generate(img) {
  const model = img.model ?? spec.imageModel ?? "google/gemini-3-pro-image";
  // objetos que viram 3D usam objectStyle (fundo liso, objeto inteiro) — o TripoSR precisa disso
  const suffix = img.noStyle ? "" : img.to3d ? spec.objectStyle ?? spec.style : spec.style;
  const prompt = [img.prompt, suffix].filter(Boolean).join("\n\n");
  const body = {model, prompt, n: 1, output_format: "png"};
  if (img.aspect_ratio) body.aspect_ratio = img.aspect_ratio;
  if (img.resolution) body.resolution = img.resolution;
  if (img.background) body.background = img.background;
  if (img.seed !== undefined) body.seed = img.seed;
  const refs = [img.reference].flat().filter(Boolean);
  if (refs.length) {
    body.input_references = refs.map((r) => {
      const f = path.join(outDir, `${r}.png`);
      if (!fs.existsSync(f)) throw new Error(`referência "${r}" ainda não foi gerada (ordene ia.json)`);
      return {type: "image_url", image_url: {url: dataUrl(f)}};
    });
  }
  let json;
  try {
    json = await post("/images", body);
  } catch (e) {
    // alguns provedores recusam output_format/resolution: tenta de novo só com o essencial
    if (!/400/.test(String(e.message))) throw e;
    delete body.output_format;
    json = await post("/images", body);
  }
  const d = json.data?.[0];
  if (!d?.b64_json) throw new Error(`resposta sem imagem: ${JSON.stringify(json).slice(0, 400)}`);
  const buf = Buffer.from(d.b64_json, "base64");
  const file = path.join(outDir, `${img.name}.png`);
  // normaliza para PNG (alguns modelos devolvem JPEG/WebP mesmo pedindo PNG)
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, buf);
  const {spawnSync} = await import("node:child_process");
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", tmp, file]);
  if (r.status !== 0) fs.renameSync(tmp, file);
  else fs.rmSync(tmp);
  manifest[img.name] = {model, prompt, aspect_ratio: img.aspect_ratio, resolution: img.resolution, cost: json.usage?.cost, created: new Date().toISOString()};
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  return {file, cost: json.usage?.cost};
}

let total = 0;
for (const img of spec.images) {
  if (only && !only.includes(img.name)) continue;
  const file = path.join(outDir, `${img.name}.png`);
  if (fs.existsSync(file) && !force) {
    console.log(`• ${img.name}.png já existe`);
    continue;
  }
  process.stdout.write(`→ ${img.name} (${img.model ?? spec.imageModel})… `);
  const t = Date.now();
  const r = await generate(img);
  total += r.cost ?? 0;
  console.log(`✓ ${((Date.now() - t) / 1000).toFixed(0)}s${r.cost ? ` · US$ ${r.cost.toFixed(3)}` : ""}`);
}
if (total) console.log(`custo total desta rodada: US$ ${total.toFixed(3)}`);
