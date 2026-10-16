#!/usr/bin/env node
// Cria uma edição: src/edicoes/<slug>/edicao.tsx + registro em src/edicoes/index.ts.
// Uso: npm run nova -- <slug> [--clipe id1,id2] [--formato 9:16|16:9|1:1|4:5]
import fs from "node:fs";
import path from "node:path";
import {fmtTime, loadRegistro, parseArgs, root} from "./lib/util.mjs";

const {pos, opts} = parseArgs();
const slug = pos[0];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error("uso: npm run nova -- <slug> [--clipe id1,id2] [--formato 9:16]   (slug: letras minúsculas, números e hífens)");
  process.exit(1);
}
const reg = loadRegistro();
const videos = Object.values(reg.clipes).filter((c) => c.tipo === "video");
if (!videos.length) {
  console.error("✗ o registro não tem vídeos. Rode `npm run midia` antes (ele procura os vídeos da pasta do projeto).");
  process.exit(1);
}
const ids = opts.clipe ? String(opts.clipe).split(",") : [videos[0].id];
for (const id of ids) {
  if (!reg.clipes[id]) {
    console.error(`✗ clipe "${id}" não está no registro. Disponíveis: ${Object.keys(reg.clipes).join(", ")}`);
    process.exit(1);
  }
}
const formato = opts.formato ?? "9:16";
const dir = path.join(root, "src", "edicoes", slug);
const file = path.join(dir, "edicao.tsx");
if (fs.existsSync(file)) {
  console.error(`✗ ${path.relative(process.cwd(), file)} já existe`);
  process.exit(1);
}
fs.mkdirSync(dir, {recursive: true});

const linhaCorte = (id) => {
  const c = reg.clipes[id];
  const fala = c.transcricao?.palavras?.slice(0, 8).map((w) => w.text).join(" ");
  return `    {clipe: "${id}", de: 0, ate: ${c.duracao ?? 3}}, // ${fmtTime(c.duracao ?? 0)}${fala ? ` · "${fala}…"` : ""}`;
};

const src = `import {defineEdicao} from "../../lib";

// Edição "${slug}". Antes de mexer nos cortes: \`npm run cortes -- <clipe>\` mostra a fala em frases com tempos
// e sugere cortes sem pausas e sem takes repetidos. Confira com \`npm run check -- ${slug}\`.
export default defineEdicao("${slug}", {
  formato: "${formato}",
  cortes: [
${ids.map(linhaCorte).join("\n")}
  ],
  // legendas: {estilo: "pop"},           // padrão vem do estilo; false desliga
  // textos: [{tipo: "titulo", texto: "…", em: 0.2, duracao: 2.2}],
  // camadas: [{tipo: "broll", clipe: "…", em: {fala: "…"}, duracao: 2.5}],
  // zooms: [{em: {fala: "…"}, escala: 1.15, duracao: 1.2}],
  // sons: [{sfx: "pop", em: {fala: "…"}}],
  // trilha: {clipe: "…"},
});
`;
fs.writeFileSync(file, src);

// registro
const regFile = path.join(root, "src", "edicoes", "index.ts");
let idx = fs.readFileSync(regFile, "utf8");
const varName = `e_${slug.replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase()).replace(/-/g, "")}`;
if (!idx.includes("// @imports") || !idx.includes("// @registro")) {
  console.error("✗ src/edicoes/index.ts sem os marcadores // @imports e // @registro");
  process.exit(1);
}
idx = idx.replace("// @imports", `// @imports\nimport ${varName} from "./${slug}/edicao";`);
idx = idx.replace("  // @registro", `  // @registro\n  ${varName},`);
fs.writeFileSync(regFile, idx);
console.log(`✓ ${path.relative(process.cwd(), file)} (${formato}, ${ids.length} corte(s))`);
console.log(`  próximos: npm run cortes -- ${ids[0]}  →  edite os cortes  →  npm run check -- ${slug}  →  npm run render -- ${slug}`);
