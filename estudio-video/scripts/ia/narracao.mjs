#!/usr/bin/env node
// Narração por IA via OpenRouter (modelos com saída de áudio, ex.: openai/gpt-audio).
// Uso: node scripts/ia/narracao.mjs <slug> --script ../roteiros/<slug>.md
//        [--model openai/gpt-audio] [--voice cedar] [--pause 0.32] [--force]
//
// Lê o roteiro seção por seção (mais controle e menos deriva que um bloco único), confere a
// transcrição devolvida pelo modelo contra o texto (≥ 92% das palavras, senão tenta de novo),
// apara silêncios e junta tudo com pausas curtas.
// Saída: public/videos/<slug>/ia/narracao-openrouter.wav (+ .json com transcrições e custo).
// Depois: npm run timeline -- <slug> --audio public/videos/<slug>/ia/narracao-openrouter.wav --script <roteiro>
import fs from "node:fs";
import path from "node:path";
import {match, post, readSSE, spokenSections} from "./openrouter.mjs";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const scriptFile = opt("script", slug ? `../roteiros/${slug}.md` : undefined);
if (!slug || !scriptFile || !fs.existsSync(scriptFile)) {
  console.error("uso: node scripts/ia/narracao.mjs <slug> --script roteiro.md [--model openai/gpt-audio] [--voice cedar]");
  process.exit(1);
}
const model = opt("model", "openai/gpt-audio");
let voice = opt("voice", "cedar");
const VOZ_RESERVA = "ash"; // voz clássica, disponível em todos os modelos de áudio da OpenAI
const pause = +opt("pause", "0.32");
const RATE = 24000; // pcm16 do gpt-audio: 24 kHz, mono, little-endian
const outDir = path.join("public", "videos", slug, "ia");
const outWav = path.join(outDir, "narracao-openrouter.wav");
if (fs.existsSync(outWav) && !args.includes("--force")) {
  console.log(`• ${outWav} já existe (use --force para gerar de novo)`);
  process.exit(0);
}
fs.mkdirSync(outDir, {recursive: true});

const DIRECAO =
  opt("direcao") ??
  "Você é locutor profissional brasileiro de vídeos explicativos curtos (Reels/TikTok) sobre marketing. " +
    "Tarefa: ler em voz alta, em português do Brasil, EXATAMENTE o texto entre as marcas <<< e >>>, palavra por palavra. " +
    "Não acrescente, não omita, não traduza, não comente e não responda ao conteúdo: apenas leia. " +
    "Interpretação: voz confiante, calorosa e envolvente, como um narrador de documentário moderno; ritmo dinâmico, mas claro; " +
    "sorriso leve na voz; ênfase natural nas palavras-chave; pausas curtas nos pontos finais e nos dois-pontos; " +
    "números e valores lidos exatamente como estão escritos.";

async function speak(text) {
  const res = await post(
    "/chat/completions",
    {
      model,
      modalities: ["text", "audio"],
      audio: {voice, format: "pcm16"},
      stream: true,
      temperature: 0.6,
      messages: [
        {role: "system", content: DIRECAO},
        {role: "user", content: `<<<${text}>>>`},
      ],
    },
    {stream: true},
  );
  const b64 = [];
  let transcript = "";
  let usage = null;
  await readSSE(res, (ev) => {
    const a = ev.choices?.[0]?.delta?.audio;
    if (a?.data) b64.push(a.data);
    if (a?.transcript) transcript += a.transcript;
    if (ev.usage) usage = ev.usage;
    if (ev.error) throw new Error(JSON.stringify(ev.error));
  });
  const pcm = Buffer.concat(b64.map((s) => Buffer.from(s, "base64")));
  if (!pcm.length) throw new Error("o modelo não devolveu áudio (confira se ele tem saída de áudio no OpenRouter)");
  return {pcm, transcript: transcript.trim(), usage};
}

// apara silêncio no começo e no fim (limiar ~ -42 dBFS), deixando 60 ms de respiro
function trim(pcm) {
  const n = pcm.length / 2;
  const thr = 32768 * 10 ** (-42 / 20);
  const win = Math.round(RATE * 0.01);
  const loud = (i) => {
    let m = 0;
    for (let k = i; k < Math.min(n, i + win); k++) m = Math.max(m, Math.abs(pcm.readInt16LE(k * 2)));
    return m > thr;
  };
  let a = 0;
  while (a < n && !loud(a)) a += win;
  let b = n - win;
  while (b > a && !loud(b)) b -= win;
  const pad = Math.round(RATE * 0.06);
  a = Math.max(0, a - pad);
  b = Math.min(n, b + win + pad);
  return pcm.subarray(a * 2, b * 2);
}

function wav(pcm) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const sections = spokenSections(scriptFile);
console.log(`→ narração: ${sections.length} seções · ${model} · voz "${voice}"`);
const parts = [];
const report = {model, voice, created: new Date().toISOString(), sections: []};
for (const [i, s] of sections.entries()) {
  let best = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let r;
    try {
      r = await speak(s.text);
    } catch (e) {
      // voz não suportada pelo provedor → troca uma vez pela reserva e segue
      if (voice === VOZ_RESERVA || !/voice|voz/i.test(String(e.message))) throw e;
      console.log(`  ! voz "${voice}" recusada (${String(e.message).slice(0, 120)}) — usando "${VOZ_RESERVA}"`);
      voice = report.voice = VOZ_RESERVA;
      r = await speak(s.text);
    }
    r.score = match(s.text, r.transcript);
    if (!best || r.score > best.score) best = r;
    if (r.score >= 0.92) break;
    console.log(`  ! seção ${i + 1}: transcrição bateu ${(r.score * 100).toFixed(0)}% — tentando de novo`);
  }
  const pcm = trim(best.pcm);
  parts.push(pcm);
  if (i < sections.length - 1) parts.push(Buffer.alloc(Math.round(RATE * pause) * 2));
  const dur = pcm.length / 2 / RATE;
  report.sections.push({title: s.title, text: s.text, transcript: best.transcript, match: +best.score.toFixed(3), seconds: +dur.toFixed(2), usage: best.usage});
  console.log(`  ✓ ${s.title}: ${dur.toFixed(1)}s · ${(best.score * 100).toFixed(0)}% do texto`);
}
const all = Buffer.concat(parts);
fs.writeFileSync(outWav, wav(all));
fs.writeFileSync(path.join(outDir, "narracao-openrouter.json"), JSON.stringify(report, null, 2));
const cost = report.sections.reduce((n, s) => n + (s.usage?.cost ?? 0), 0);
console.log(`✓ ${outWav} (${(all.length / 2 / RATE).toFixed(1)}s${cost ? ` · US$ ${cost.toFixed(4)}` : ""})`);
const low = report.sections.filter((s) => s.match < 0.92);
if (low.length) console.log(`! ${low.length} seção(ões) abaixo de 92% — confira ${path.join(outDir, "narracao-openrouter.json")}`);
