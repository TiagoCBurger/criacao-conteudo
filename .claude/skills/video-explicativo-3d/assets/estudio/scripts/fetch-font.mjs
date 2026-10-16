#!/usr/bin/env node
// Baixa uma família do Google Fonts em TTF (serve para CSS e para letreiros 3D) para dentro do design system.
// Uso: node scripts/fetch-font.mjs "Space Grotesk" 500,700 [--out ../design-system/fonts]
// Imprime o trecho de tokens.json (files[]) para colar no papel tipográfico.
import fs from "node:fs";
import path from "node:path";

const [family, weightsArg = "400,700"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const oi = process.argv.indexOf("--out");
const out = path.resolve(oi > 0 ? process.argv[oi + 1] : "../design-system/fonts");
const italic = process.argv.includes("--italic");
if (!family) {
  console.error('uso: node scripts/fetch-font.mjs "Família" 400,700 [--out pasta] [--italic]');
  process.exit(1);
}
const weights = weightsArg.split(",").map((w) => w.trim());
const q = italic ? `ital,wght@${weights.map((w) => `0,${w}`).concat(weights.map((w) => `1,${w}`)).join(";")}` : `wght@${weights.join(";")}`;
const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:${q}`;
// Sem User-Agent de navegador moderno, a API devolve TTF (não woff2) — é o que queremos.
const css = await fetch(url).then((r) => {
  if (!r.ok) throw new Error(`Google Fonts respondeu ${r.status} para "${family}" (${url}). Confira o nome exato da família e os pesos disponíveis.`);
  return r.text();
});
const faces = [...css.matchAll(/font-style:\s*(\w+);\s*font-weight:\s*(\d+);[\s\S]*?url\((https:[^)]+\.ttf)\)/g)].map((m) => ({style: m[1], weight: +m[2], src: m[3]}));
if (!faces.length) throw new Error("nenhum TTF encontrado na resposta do Google Fonts");
fs.mkdirSync(out, {recursive: true});
const slug = family.replace(/\s+/g, "");
const files = [];
for (const f of faces) {
  const name = `${slug}-${f.weight}${f.style === "italic" ? "-italic" : ""}.ttf`;
  const buf = Buffer.from(await fetch(f.src).then((r) => r.arrayBuffer()));
  fs.writeFileSync(path.join(out, name), buf);
  files.push({src: `fonts/${name}`, weight: f.weight, ...(f.style === "italic" ? {style: "italic"} : {})});
  console.log(`✓ ${name} (${(buf.length / 1024).toFixed(0)} KB)`);
}
console.log("\nCole no papel tipográfico do tokens.json:");
console.log(JSON.stringify({family, files}, null, 2));
