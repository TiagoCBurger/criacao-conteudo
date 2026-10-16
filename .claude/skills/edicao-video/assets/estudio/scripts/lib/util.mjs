// Utilitários compartilhados pelos scripts do estúdio de edição.
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const cfg = JSON.parse(fs.readFileSync(path.join(root, "estudio.config.json"), "utf8"));
export const projectRoot = path.resolve(root, "..");
export const pubMidia = path.join(root, "public", "midia");
export const registroFile = path.join(root, "src", "midia", "registro.json");

/** Argumentos: posicionais + --chave valor + --flag. */
export const parseArgs = (argv = process.argv.slice(2)) => {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        opts[k] = next;
        i++;
      } else opts[k] = true;
    } else pos.push(a);
  }
  return {pos, opts};
};

export const run = (bin, args, opts = {}) => execFileSync(bin, args, {encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28, ...opts});
/** Roda e devolve stderr (ffmpeg escreve as análises ali). Não lança erro. */
export const runErr = (bin, args) => {
  const r = spawnSync(bin, args, {encoding: "utf8", maxBuffer: 1 << 28});
  return {status: r.status, stderr: r.stderr ?? "", stdout: r.stdout ?? ""};
};

export const hasBin = (bin) => spawnSync(bin, ["-version"], {stdio: "ignore"}).status === 0;

export const ffprobe = (file) => {
  const out = run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]);
  return JSON.parse(out);
};

export const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "clipe";

export const fmtTime = (s) => {
  if (!Number.isFinite(s)) return "?";
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return m ? `${m}:${r.toFixed(1).padStart(4, "0")}` : `${r.toFixed(1)}s`;
};

export const fmtBytes = (n) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(0)} MB` : `${Math.ceil(n / 1e3)} KB`);

export const loadRegistro = () => {
  if (!fs.existsSync(registroFile)) return {versao: 1, clipes: {}};
  return JSON.parse(fs.readFileSync(registroFile, "utf8"));
};

export const saveRegistro = (reg) => {
  fs.mkdirSync(path.dirname(registroFile), {recursive: true});
  const ordered = {versao: 1, atualizado: new Date().toISOString(), clipes: Object.fromEntries(Object.entries(reg.clipes).sort(([a], [b]) => a.localeCompare(b)))};
  fs.writeFileSync(registroFile, JSON.stringify(ordered, null, 1));
};

/** Lê OPENROUTER_API_KEY (ou outra) do ambiente ou do .env mais próximo, subindo a partir do projeto. */
export const envVar = (name) => {
  if (process.env[name]) return process.env[name];
  for (let dir = projectRoot; ; dir = path.dirname(dir)) {
    for (const f of [".env.local", ".env"]) {
      const p = path.join(dir, f);
      if (!fs.existsSync(p)) continue;
      for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && m[1] === name) return m[2].replace(/^(['"])(.*)\1$/, "$2").trim();
      }
    }
    if (dir === path.dirname(dir)) return undefined;
  }
};

export const EXT = {
  video: /\.(mp4|mov|m4v|mkv|webm|avi|mts|m2ts|3gp|mxf|wmv|flv)$/i,
  audio: /\.(mp3|wav|m4a|aac|flac|ogg|opus|aif|aiff|wma)$/i,
  imagem: /\.(png|jpe?g|webp|gif|heic|heif|tiff?|bmp|svg|avif)$/i,
};
export const tipoDe = (file) => (EXT.video.test(file) ? "video" : EXT.audio.test(file) ? "audio" : EXT.imagem.test(file) ? "imagem" : null);

/** Palavras do whisper.cpp (tokens) → palavras com início/fim em ms. */
export const whisperCppWords = (j) => {
  const out = [];
  for (const item of j.transcription) {
    const txt = item.text;
    if (!txt.trim() || /^\s*\[.*\]\s*$/.test(txt)) continue;
    if (/^\s/.test(txt) || out.length === 0) out.push({text: txt.trim(), startMs: item.offsets.from, endMs: item.offsets.to});
    else {
      const last = out[out.length - 1];
      last.text += txt.trim();
      last.endMs = item.offsets.to;
    }
  }
  return out;
};

/**
 * O reconhecedor costuma esticar as palavras por cima das pausas (o fim de "pessoal." vai até a próxima
 * palavra). Os silêncios medidos no áudio corrigem as bordas: é nelas que os cortes acontecem.
 */
export const refinarComSilencios = (words, silences = []) => {
  const out = words.map((w) => ({...w}));
  for (const w of out) {
    let s = w.startMs / 1000, e = w.endMs / 1000;
    for (const [a, b] of silences) {
      if (b <= s || a >= e) continue;
      if (a <= s && b >= e) {
        // palavra inteira dentro do silêncio: vai para a borda mais próxima
        const c = (s + e) / 2, d = Math.max(0.08, Math.min(0.4, e - s));
        if (c - a < b - c) (e = a), (s = Math.max(0, a - d));
        else (s = b), (e = b + d);
      } else if (a > s && b >= e) e = a;
      else if (a <= s && b < e) s = b;
      else if (a - s >= e - b) e = a;
      else s = b;
    }
    w.startMs = Math.round(s * 1000);
    w.endMs = Math.round(e * 1000);
  }
  // palavras empurradas para a mesma borda: em sequência, sem sobrepor
  for (let i = 1; i < out.length; i++) {
    if (out[i].startMs < out[i - 1].endMs) out[i].startMs = Math.min(out[i - 1].endMs, out[i].endMs - 40);
  }
  // as que ficaram espremidas (< 70 ms) dividem o tempo com a vizinha encostada, pelo número de letras
  const dur = (w) => w.endMs - w.startMs;
  for (let i = 0; i < out.length; ) {
    if (dur(out[i]) >= 70) {
      i++;
      continue;
    }
    let j = i;
    while (j < out.length && dur(out[j]) < 70) j++;
    const prev = out[i - 1], next = out[j];
    const gapAntes = prev ? out[i].startMs - prev.endMs : Infinity;
    const gapDepois = next ? next.startMs - out[j - 1].endMs : Infinity;
    let grupo = null;
    if (prev && gapAntes < 50 && gapDepois >= gapAntes) grupo = out.slice(i - 1, j);
    else if (next && gapDepois < 50) grupo = out.slice(i, j + 1);
    if (grupo) {
      const a = grupo[0].startMs, b = grupo[grupo.length - 1].endMs;
      const peso = grupo.reduce((n, w) => n + w.text.length + 1, 0);
      let t = a;
      for (const w of grupo) {
        const d = ((w.text.length + 1) / peso) * (b - a);
        w.startMs = Math.round(t);
        w.endMs = Math.round(t + d);
        t += d;
      }
    }
    i = j;
  }
  return cleanWords(out);
};

/** Normaliza palavras: monotônicas, duração mínima, sem vazios. */
export const cleanWords = (words) => {
  const out = words.filter((w) => w.text && w.text.replace(/[^\p{L}\p{N}]/gu, "").length > 0).map((w) => ({text: w.text.trim(), startMs: Math.round(w.startMs), endMs: Math.round(w.endMs)}));
  for (let i = 0; i < out.length; i++) {
    if (i > 0 && out[i].startMs < out[i - 1].startMs) out[i].startMs = out[i - 1].startMs;
    if (out[i].endMs < out[i].startMs + 40) out[i].endMs = out[i].startMs + 40;
  }
  return out;
};
