// Importa um alinhamento pronto (palavras com tempo) em vez de transcrever: timeline.json da skill
// video-explicativo-3d (grafia do roteiro), OpenAI/OpenRouter verbose_json, whisper.cpp JSON, ElevenLabs
// (TTS with-timestamps ou Speech-to-Text), captions do Remotion ou legendas .srt/.vtt.
import fs from "node:fs";
import {cleanWords, whisperCppWords} from "./util.mjs";

const fromChars = (chars, starts, ends) => {
  const out = [];
  let cur = null;
  chars.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = {text: "", startMs: starts[i] * 1000, endMs: 0};
    cur.text += ch;
    cur.endMs = ends[i] * 1000;
  });
  if (cur) out.push(cur);
  return out;
};

const parseTime = (s) => {
  const m = s.trim().replace(",", ".").match(/(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)/);
  return m ? ((+m[1] || 0) * 3600 + +m[2] * 60 + +m[3]) * 1000 : 0;
};

/** Distribui o texto de uma legenda pela duração dela, proporcional ao tamanho das palavras. */
const distribute = (text, a, b) => {
  const ws = text.split(/\s+/).filter(Boolean);
  const total = ws.reduce((n, w) => n + w.length + 1, 0);
  let t = a;
  return ws.map((w) => {
    const d = ((w.length + 1) / total) * (b - a);
    const o = {text: w, startMs: t, endMs: t + d};
    t += d;
    return o;
  });
};

export const carregarAlinhamento = (file, desloc = 0) => {
  const raw = fs.readFileSync(file, "utf8");
  let words, fonte;
  if (/\.(srt|vtt)$/i.test(file)) {
    words = [];
    for (const block of raw.split(/\r?\n\r?\n/)) {
      const lines = block.split(/\r?\n/).filter(Boolean);
      const ti = lines.findIndex((l) => l.includes("-->"));
      if (ti < 0) continue;
      const [a, b] = lines[ti].split("-->");
      words.push(...distribute(lines.slice(ti + 1).join(" ").replace(/<[^>]+>/g, ""), parseTime(a), parseTime(b.trim().split(/\s+/)[0])));
    }
    fonte = "legendas";
  } else {
    const j = JSON.parse(raw);
    const al = j.alignment ?? j.normalized_alignment;
    if (al?.characters) (words = fromChars(al.characters, al.character_start_times_seconds, al.character_end_times_seconds)), (fonte = "elevenlabs-tts");
    else if (Array.isArray(j) && j[0]?.startMs !== undefined) (words = j.map((w) => ({text: w.text.trim(), startMs: w.startMs, endMs: w.endMs}))), (fonte = "remotion-captions");
    else if (j.words?.[0]?.startMs !== undefined) (words = j.words), (fonte = j.source ? `timeline (${j.source})` : "timeline");
    else if (j.words?.[0]?.type !== undefined) (words = j.words.filter((w) => w.type === "word").map((w) => ({text: w.text.trim(), startMs: w.start * 1000, endMs: w.end * 1000}))), (fonte = "elevenlabs-stt");
    else if ((j.words ?? j.segments?.flatMap((s) => s.words ?? []))?.[0]?.word !== undefined)
      (words = (j.words ?? j.segments.flatMap((s) => s.words ?? [])).map((w) => ({text: String(w.word).trim(), startMs: w.start * 1000, endMs: w.end * 1000}))), (fonte = j.fonte ?? "openai-verbose-json");
    else if (j.transcription?.[0]?.offsets) (words = whisperCppWords(j)), (fonte = "whisper.cpp");
    else throw new Error(`formato de alinhamento não reconhecido: ${file}`);
  }
  const d = desloc * 1000;
  return {fonte: `alinhamento ${fonte}`, palavras: cleanWords(words.map((w) => ({text: w.text, startMs: w.startMs + d, endMs: w.endMs + d})))};
};
