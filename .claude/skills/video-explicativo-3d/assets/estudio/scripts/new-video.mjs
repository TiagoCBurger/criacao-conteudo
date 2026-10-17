#!/usr/bin/env node
// Cria o esqueleto de um vídeo a partir do timeline.json: src/videos/<slug>/index.tsx + storyboard.md,
// e registra a composição. Rode depois de scripts/timeline.mjs.
// Uso: node scripts/new-video.mjs <slug>
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const slug = process.argv[2];
if (!slug) {
  console.error("uso: node scripts/new-video.mjs <slug>");
  process.exit(1);
}
const tlFile = path.join(root, "public", "videos", slug, "timeline.json");
if (!fs.existsSync(tlFile)) {
  console.error(`não existe ${path.relative(process.cwd(), tlFile)} — rode antes: node scripts/timeline.mjs ${slug} --audio … --script …`);
  process.exit(1);
}
const tl = JSON.parse(fs.readFileSync(tlFile, "utf8"));
const dir = path.join(root, "src", "videos", slug);
if (fs.existsSync(path.join(dir, "index.tsx"))) {
  console.error(`src/videos/${slug}/index.tsx já existe — não vou sobrescrever.`);
  process.exit(1);
}
fs.mkdirSync(dir, {recursive: true});

const pascal = (s) => s.replace(/(^|-)(\w)/g, (_, __, ch) => ch.toUpperCase()).replace(/[^A-Za-z0-9]/g, "");
const sections = tl.sections?.length ? tl.sections : [{id: "video", title: "Vídeo", startMs: 0, endMs: tl.durationMs, notes: []}];
const wordsIn = (s) => {
  const next = sections[sections.indexOf(s) + 1];
  const end = next ? next.startMs : Infinity;
  return tl.words.filter((w) => w.startMs >= s.startMs && w.startMs < end);
};
/** texto da seção com **ênfases** do roteiro agrupadas */
const spoken = (s) =>
  wordsIn(s)
    .map((w, i, a) => `${w.em && !a[i - 1]?.em ? "**" : ""}${w.text}${w.em && !a[i + 1]?.em ? "**" : ""}`)
    .join(" ");
const cueOf = (s, i) => {
  if (i === 0) return "0";
  // 3 primeiras palavras da seção — únicas o bastante para achar o ponto na fala
  const ws = wordsIn(s).slice(0, 3).map((w) => w.text.replace(/["“”]/g, ""));
  return JSON.stringify(ws.join(" "));
};

const scenes = sections
  .map(
    (s) => `// ${s.title} — ${(s.startMs / 1000).toFixed(1)}s → ${(s.endMs / 1000).toFixed(1)}s
// fala: "${wordsIn(s).map((w) => w.text).join(" ").slice(0, 220)}"
const ${pascal(s.id)}: React.FC = () => {
  return (
    <AbsoluteFill>
      <SafeArea>
        <KineticText text=${JSON.stringify(s.title)} size="h1" />
      </SafeArea>
    </AbsoluteFill>
  );
};`,
  )
  .join("\n\n");

// trilha (gerada pelo `npm run ia` ou fornecida): entra no Explainer se já existir em public/videos/<slug>/trilha.mp3
const hasMusic = fs.existsSync(path.join(root, "public", "videos", slug, "trilha.mp3"));
const musicLine = hasMusic
  ? `    music={staticFile(\`videos/\${SLUG}/trilha.mp3\`)}\n`
  : `    // music={staticFile(\`videos/\${SLUG}/trilha.mp3\`)}   // depois de gerar a trilha (npm run ia) ou receber uma\n`;

const code = `import React from "react";
import {AbsoluteFill, staticFile} from "remotion";
import type {VideoDef} from "../../config";
import {beats, Explainer, KineticText, SafeArea, timeline} from "../../lib";
import tlJson from "../../../public/videos/${slug}/timeline.json";

// Esqueleto gerado por new-video.mjs. Substitua as cenas seguindo o storyboard.md desta pasta.
const SLUG = "${slug}";
const tl = timeline(tlJson as never);

// Cenas ancoradas na fala. Ajuste/divida: uma ideia por cena, 2–6 s cada.
const B = beats(tl, [
${sections.map((s, i) => `  {id: ${JSON.stringify(s.id)}, cue: ${cueOf(s, i)}},`).join("\n")}
]);

${scenes}

const Video: React.FC = () => (
  <Explainer
    tl={tl}
    audio={staticFile(\`videos/\${SLUG}/narracao.wav\`)}
${musicLine}    scenes={[
${sections.map((s, i) => `      {beat: B[${i}], component: ${pascal(s.id)}},`).join("\n")}
    ]}
  />
);

const def: VideoDef = {id: SLUG, component: Video, duration: B[B.length - 1].end};
export default def;
`;
fs.writeFileSync(path.join(dir, "index.tsx"), code);

const sb = `# Storyboard — ${slug}

Duração da narração: ${(tl.durationMs / 1000).toFixed(1)} s · ${tl.words.length} palavras · fonte do tempo: ${tl.source}

> Preencha antes de codar. Uma linha por cena. "Âncora" = palavras exatas da fala onde a cena começa.
> "Visual" = o que o espectador VÊ (metáfora, objeto 3D, gráfico, tipografia). "Som" = efeitos e onde caem.

| # | Cena | Âncora (fala) | Tempo | Ideia (1 frase) | Visual | Texto na tela | Som |
|---|------|---------------|-------|-----------------|--------|---------------|-----|
${sections.map((s, i) => `| ${i + 1} | ${s.id} | ${i === 0 ? "(início)" : JSON.parse(cueOf(s, i))} | ${(s.startMs / 1000).toFixed(1)}–${(s.endMs / 1000).toFixed(1)}s |  |  |  |  |`).join("\n")}

## Fala por seção
${sections
  .map(
    (s) => `### ${s.title} (${(s.startMs / 1000).toFixed(1)}–${(s.endMs / 1000).toFixed(1)}s)
${spoken(s)}
${s.notes?.length ? `\nNotas do roteiro:\n${s.notes.map((n) => `- ${n}`).join("\n")}\n` : ""}`,
  )
  .join("\n")}
`;
fs.writeFileSync(path.join(dir, "storyboard.md"), sb);

// registro
const reg = path.join(root, "src", "videos", "index.ts");
let r = fs.readFileSync(reg, "utf8");
const varName = `v${pascal(slug)}`;
if (!r.includes(`"./${slug}"`)) {
  r = r.replace("// @imports", `// @imports\nimport ${varName} from "./${slug}";`).replace("  // @registro", `  // @registro\n  ${varName},`);
  fs.writeFileSync(reg, r);
}
console.log(`✓ src/videos/${slug}/index.tsx e storyboard.md criados · composição "${slug}" registrada`);
