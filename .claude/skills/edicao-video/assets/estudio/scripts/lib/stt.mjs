// Transcrição com tempo por palavra: whisper.cpp local (padrão) ou OpenRouter (--stt openrouter, usa a chave do .env).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {cleanWords, envVar, run, whisperCppWords} from "./util.mjs";

const WHISPER_VERSION = "1.7.6";

/** Áudio mono 16 kHz para o reconhecedor. */
const extract16k = (src, out, fmt = "wav") => {
  const args = ["-y", "-v", "error", "-i", src, "-vn", "-ac", "1", "-ar", "16000"];
  if (fmt === "mp3") args.push("-c:a", "libmp3lame", "-b:a", "48k");
  run("ffmpeg", [...args, out]);
};

export const transcribeWhisper = async (src, {model = "large-v3-turbo", language = "pt"} = {}) => {
  const {installWhisperCpp, downloadWhisperModel, transcribe} = await import("@remotion/install-whisper-cpp");
  // mesma instalação da skill video-explicativo-3d: compila 1x por máquina (~2–5 min)
  const wdir = process.env.ESTUDIO_WHISPER_DIR ?? path.join(os.homedir(), ".cache", "estudio-video", "whisper");
  fs.mkdirSync(path.dirname(wdir), {recursive: true});
  await installWhisperCpp({to: wdir, version: WHISPER_VERSION, printOutput: false});
  await downloadWhisperModel({model, folder: wdir, printOutput: false});
  const wav = path.join(os.tmpdir(), `stt-${process.pid}-${Date.now()}.wav`);
  extract16k(src, wav);
  try {
    const res = await transcribe({inputPath: wav, model, whisperPath: wdir, whisperCppVersion: WHISPER_VERSION, tokenLevelTimestamps: true, language, splitOnWord: true, printOutput: false});
    return {fonte: `whisper.cpp ${model}`, idioma: language, palavras: cleanWords(whisperCppWords(res))};
  } finally {
    fs.rmSync(wav, {force: true});
  }
};

/**
 * OpenRouter /api/v1/audio/transcriptions com verbose_json + palavras. O áudio vai em blocos de até ~8 min
 * (o provedor tem limite de 60 s de processamento por pedido), cortados no meio de silêncios quando possível.
 */
export const transcribeOpenRouter = async (src, {model = "openai/whisper-large-v3-turbo", language = "pt", duracao, silencios = []} = {}) => {
  const key = envVar("OPENROUTER_API_KEY");
  if (!key) throw new Error("OPENROUTER_API_KEY não encontrada (ambiente ou .env do projeto). Use --stt whisper ou crie o .env.");
  const base = (envVar("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const BLOCO = 480;
  const cortes = [0];
  while (duracao - cortes[cortes.length - 1] > BLOCO + 30) {
    const alvo = cortes[cortes.length - 1] + BLOCO;
    const s = silencios.filter(([a, b]) => b - a > 0.25 && Math.abs((a + b) / 2 - alvo) < 60).sort((x, y) => Math.abs((x[0] + x[1]) / 2 - alvo) - Math.abs((y[0] + y[1]) / 2 - alvo))[0];
    cortes.push(s ? (s[0] + s[1]) / 2 : alvo);
  }
  cortes.push(duracao);
  const palavras = [];
  let custo = 0;
  for (let i = 0; i < cortes.length - 1; i++) {
    const a = cortes[i], b = cortes[i + 1];
    const mp3 = path.join(os.tmpdir(), `stt-${process.pid}-${i}.mp3`);
    run("ffmpeg", ["-y", "-v", "error", "-ss", String(a), "-to", String(b), "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", mp3]);
    const data = fs.readFileSync(mp3).toString("base64");
    fs.rmSync(mp3, {force: true});
    let res;
    for (let tent = 1; tent <= 3; tent++) {
      const r = await fetch(`${base}/audio/transcriptions`, {
        method: "POST",
        headers: {Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "estudio-edicao"},
        body: JSON.stringify({model, input_audio: {data, format: "mp3"}, language, response_format: "verbose_json", timestamp_granularities: ["word", "segment"]}),
      });
      if (r.ok) {
        res = await r.json();
        break;
      }
      const msg = await r.text();
      if (tent === 3 || (r.status < 500 && r.status !== 429)) throw new Error(`OpenRouter STT ${r.status}: ${msg.slice(0, 400)}`);
      await new Promise((ok) => setTimeout(ok, 2000 * tent));
    }
    custo += res.usage?.cost ?? 0;
    let ws = res.words ?? res.segments?.flatMap((s) => s.words ?? []) ?? [];
    if (!ws.length && res.segments?.length) {
      // provedor sem palavras: distribui o texto de cada segmento pela duração dele
      for (const s of res.segments) {
        const parts = String(s.text).trim().split(/\s+/).filter(Boolean);
        const total = parts.reduce((n, p) => n + p.length + 1, 0);
        let t = s.start;
        for (const p of parts) {
          const d = ((p.length + 1) / total) * (s.end - s.start);
          ws.push({word: p, start: t, end: t + d});
          t += d;
        }
      }
    }
    for (const w of ws) palavras.push({text: String(w.word ?? w.text).trim(), startMs: (a + w.start) * 1000, endMs: (a + w.end) * 1000});
  }
  return {fonte: `openrouter ${model}`, idioma: language, palavras: cleanWords(palavras), ...(custo ? {custoUSD: +custo.toFixed(4)} : {})};
};
