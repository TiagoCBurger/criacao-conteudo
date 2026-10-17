#!/usr/bin/env node
// Trilha original por IA via OpenRouter (Lyria 3, do Google), sob medida para o vídeo.
// Uso: node scripts/ia/trilha.mjs <slug> [--model google/lyria-3-pro-preview] [--force]
//
// Precisa de public/videos/<slug>/timeline.json (a duração e as seções da fala definem a música):
// pede uma faixa instrumental com a duração exata do vídeo e uma estrutura com marcações de tempo
// que acompanham as seções do roteiro (gancho tenso → desenvolvimento → fechamento com batida final).
// O estilo sai do design system (direção de arte + personalidade de movimento) e pode ser ajustado em
// src/videos/<slug>/ia.json → "music": {"style": "…", "bpm": 92, "sections": {"<id-da-seção>": "…"}, "model": "…"}.
//
// Saída: public/videos/<slug>/trilha.mp3 (exatamente a duração do vídeo, −16 LUFS, pronta para o <Music>,
// que abaixa a trilha sob a fala) + ia/trilha-original.* e ia/trilha.json (modelo, prompt, custo).
// Se já existe uma trilha.mp3 que NÃO foi gerada aqui (fornecida pelo usuário), ela é mantida.
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {post, readSSE} from "./openrouter.mjs";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
if (!slug) {
  console.error("uso: node scripts/ia/trilha.mjs <slug> [--model google/lyria-3-pro-preview] [--force]");
  process.exit(1);
}
const force = args.includes("--force");
const vdir = path.join("public", "videos", slug);
const iaDir = path.join(vdir, "ia");
const out = path.join(vdir, "trilha.mp3");
const meta = path.join(iaDir, "trilha.json");
if (fs.existsSync(out) && !fs.existsSync(meta)) {
  console.log(`• ${out} foi fornecida pelo usuário — mantida (apague-a para gerar uma trilha)`);
  process.exit(0);
}
if (fs.existsSync(out) && !force) {
  console.log(`• ${out} já existe (use --force para gerar de novo)`);
  process.exit(0);
}
const tlFile = path.join(vdir, "timeline.json");
if (!fs.existsSync(tlFile)) {
  console.error(`✗ falta ${tlFile} — rode a timeline antes (a trilha é cortada na medida da fala)`);
  process.exit(1);
}
const tl = JSON.parse(fs.readFileSync(tlFile, "utf8"));
const specFile = path.join("src", "videos", slug, "ia.json");
const music = fs.existsSync(specFile) ? JSON.parse(fs.readFileSync(specFile, "utf8")).music ?? {} : {};
const studio = JSON.parse(fs.readFileSync("studio.config.json", "utf8"));
const tokens = JSON.parse(fs.readFileSync(path.join(studio.designSystem, "tokens.json"), "utf8"));

const TAIL = 1.2; // = cauda padrão do beats(): o vídeo termina 1,2 s depois da última palavra
const D = Math.round((tl.durationMs / 1000 + TAIL) * 10) / 10;
const model = opt("model", music.model ?? (D > 30 ? "google/lyria-3-pro-preview" : "google/lyria-3-clip-preview"));

// ---------------------------------------------------------------- prompt
const ESTILO = {
  cinematic: "dark, elegant modern cinematic score: deep sub-bass pulses, muted analog synth pads, a sparse felt-piano motif, subtle ticking percussion, warm tape texture",
  technical: "precise minimal electronic score: clean arpeggiated synths, tight glitchy percussion, analytical and focused, crisp transients",
  editorial: "refined, warm and light score: soft piano, plucked strings, brushed percussion, airy and sophisticated",
  playful: "playful, bouncy score: marimba, pizzicato strings, light claps and shakers, cheerful",
};
const ENERGIA = {
  calm: "calm and steady",
  confident: "confident, assured, quietly driving",
  energetic: "energetic and propulsive",
  precise: "precise and controlled",
  playful: "light and playful",
};
const BPM = {calm: 80, confident: 92, energetic: 118, precise: 100, playful: 110};
const dir = tokens.art?.direction ?? "editorial";
const pers = tokens.motion?.personality ?? "confident";
const style = music.style ?? `${ESTILO[dir] ?? ESTILO.editorial}; ${ENERGIA[pers] ?? ENERGIA.confident}`;
const bpm = music.bpm ?? BPM[pers] ?? 92;

const mmss = (s) => {
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const secs = tl.sections?.length ? tl.sections : [{id: "video", title: "Vídeo", startMs: 0, endMs: tl.durationMs}];
const roleOf = (i, n) =>
  i === 0
    ? "hook: immediate intrigue and tension from the very first second, sparse pulse, a low impact hit early on"
    : i === n - 1
      ? "resolution: warm, confident lift; land on a final strong hit, then a short natural tail (no fade-out loop)"
      : i >= n - 2
        ? "peak: fullest arrangement, steady drive, but still leaving room for the voice"
        : i === 1
          ? "groove settles in: steady pulse, first layers enter"
          : "development: add one layer or variation, keep momentum";
const structure = secs
  .map((s, i) => {
    const a = i === 0 ? 0 : s.startMs / 1000;
    const b = i === secs.length - 1 ? D : secs[i + 1].startMs / 1000;
    return `[${mmss(a)} - ${mmss(b)}] ${s.title}: ${music.sections?.[s.id] ?? roleOf(i, secs.length)}`;
  })
  .join("\n");

const prompt =
  music.prompt ??
  `Create a ${Math.round(D)}-second instrumental background track for a narrated vertical explainer video (Reels/TikTok).
Instrumental only: no vocals, no lyrics, no singing, no spoken words, no choir.
Style: ${style}.
Tempo: ${bpm} BPM, steady and consistent so edits feel on-beat.
Mix for voice-over: the narration sits on top, so keep the 1–4 kHz range open, avoid a busy lead melody, no sudden loud drops or silences in the middle.
Exact length: ${Math.round(D)} seconds, ending cleanly at the end with a final hit and a short tail.
Structure:
${structure}`;

// ---------------------------------------------------------------- pedido (com variações de formato)
const sniff = (b) =>
  b.subarray(0, 4).toString("latin1") === "RIFF"
    ? "wav"
    : b.subarray(0, 3).toString("latin1") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)
      ? "mp3"
      : b.subarray(0, 4).toString("latin1") === "fLaC"
        ? "flac"
        : b.subarray(0, 4).toString("latin1") === "OggS"
          ? "ogg"
          : b.subarray(4, 8).toString("latin1") === "ftyp"
            ? "m4a"
            : null;

// procura áudio em qualquer formato de resposta: delta.audio.data, message.audio.data, partes de conteúdo
// com tipo de áudio, ou data URLs "data:audio/…;base64,…"
function collect(node, keyPath, sink) {
  if (node == null) return;
  if (typeof node === "string") {
    const m = node.match(/^data:audio\/[\w.+-]+;base64,(.*)$/s);
    if (m) sink.b64.push(m[1]);
    else if (/audio/i.test(keyPath) && /(^|\.)data$/.test(keyPath)) sink.b64.push(node);
    else if (/\.audio$/.test(keyPath) && node.length > 512 && /^[A-Za-z0-9+/=\s]+$/.test(node.slice(0, 512))) sink.b64.push(node);
    else if (/(^|\.)(content|text|transcript)$/.test(keyPath) && !/audio/i.test(keyPath)) sink.text += node;
    return;
  }
  if (Array.isArray(node)) return node.forEach((x, i) => collect(x, `${keyPath}[${i}]`, sink));
  if (typeof node === "object") {
    const tag = typeof node.type === "string" && /audio/i.test(node.type) ? ".audio" : "";
    for (const [k, v] of Object.entries(node)) collect(v, `${keyPath}${tag}.${k}`, sink);
  }
}

const log = [];
async function attempt(extra) {
  const body = {model, messages: [{role: "user", content: prompt}], modalities: ["text", "audio"], stream: true, ...extra};
  const sink = {b64: [], text: "", usage: null};
  if (body.stream) {
    const res = await post("/chat/completions", body, {stream: true});
    await readSSE(res, (ev) => {
      if (log.length < 400) log.push(JSON.stringify(ev, (k, v) => (typeof v === "string" && v.length > 200 ? `${v.slice(0, 60)}…(${v.length})` : v)));
      if (ev.error) throw new Error(JSON.stringify(ev.error));
      if (ev.usage) sink.usage = ev.usage;
      for (const ch of ev.choices ?? []) collect(ch.delta ?? ch.message, "delta", sink);
    });
  } else {
    const json = await post("/chat/completions", body);
    log.push(JSON.stringify(json, (k, v) => (typeof v === "string" && v.length > 200 ? `${v.slice(0, 60)}…(${v.length})` : v)));
    sink.usage = json.usage;
    for (const ch of json.choices ?? []) collect(ch.message, "message", sink);
  }
  return sink;
}

console.log(`→ trilha: ${model} · ${D}s · ${bpm} BPM · direção ${dir}/${pers}`);
const variants = [{}, {audio: {format: "wav"}}, {audio: {format: "mp3"}}, {stream: false}];
let got = null;
let lastErr = null;
for (const v of variants) {
  try {
    const r = await attempt(v);
    if (r.b64.length) {
      got = r;
      break;
    }
    lastErr = new Error("resposta sem áudio");
  } catch (e) {
    lastErr = e;
    if (!/400|422|audio|modalit|format|stream/i.test(String(e.message))) break; // erro que outra variação não resolve
  }
}
fs.mkdirSync(iaDir, {recursive: true});
if (!got) {
  const dbg = path.join(iaDir, "trilha-resposta.txt");
  fs.writeFileSync(dbg, `${String(lastErr?.message ?? lastErr)}\n\n${log.join("\n")}`);
  console.error(`✗ o modelo não devolveu áudio (${String(lastErr?.message ?? lastErr).slice(0, 200)}). Resposta salva em ${dbg}`);
  process.exit(1);
}
const buf = Buffer.concat(got.b64.map((s) => Buffer.from(s, "base64")));
const ext = sniff(buf);
if (!ext) {
  const raw = path.join(iaDir, "trilha-original.bin");
  fs.writeFileSync(raw, buf);
  console.error(`✗ formato de áudio desconhecido (${buf.length} bytes) — salvo em ${raw}`);
  process.exit(1);
}
for (const f of fs.readdirSync(iaDir)) if (f.startsWith("trilha-original.")) fs.rmSync(path.join(iaDir, f));
const orig = path.join(iaDir, `trilha-original.${ext}`);
fs.writeFileSync(orig, buf);

// ---------------------------------------------------------------- medida exata + loudness
const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", orig], {encoding: "utf8"});
const len = parseFloat(probe.stdout) || 0;
const fade = Math.min(2.5, D * 0.08);
// mais longa: corta em D com fade curto; mais curta: termina no final natural e completa com silêncio
const af =
  len > D + 0.05
    ? `atrim=0:${D},afade=t=out:st=${(D - fade).toFixed(2)}:d=${fade.toFixed(2)},loudnorm=I=-16:TP=-1.5:LRA=11`
    : `loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=0:${D}`;
const ff = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", orig, "-af", af, "-ar", "48000", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k", out], {encoding: "utf8"});
if (ff.status !== 0) {
  console.error(`✗ ffmpeg: ${ff.stderr}`);
  process.exit(1);
}
fs.writeFileSync(
  meta,
  JSON.stringify({model, prompt, bpm, style, seconds: D, originalSeconds: +len.toFixed(2), format: ext, text: got.text.trim() || undefined, usage: got.usage, created: new Date().toISOString()}, null, 2),
);
const cost = got.usage?.cost;
console.log(`✓ ${out} (${D}s; original ${len.toFixed(1)}s ${ext}${cost ? ` · US$ ${cost.toFixed(3)}` : ""})`);
if (len && len < D - 3) console.log(`! a faixa veio ${(D - len).toFixed(1)}s mais curta que o vídeo — termina antes e fica em silêncio; gere de novo com --force se incomodar`);
