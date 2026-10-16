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
 * O reconhecedor erra os tempos justamente perto das pausas: estica a palavra por cima do silêncio e, em voz
 * sintética, desloca frases inteiras. Os silêncios medidos no áudio são precisos, então eles mandam:
 * 1. cada pausa (≥ 0,2 s) é casada com um vão entre duas palavras — o mais próximo no tempo, de preferência
 *    depois de pontuação — por programação dinâmica (as pausas ficam em ordem; uma pausa pode ficar sem par,
 *    como uma respiração no meio da frase);
 * 2. as palavras de cada trecho entre pausas casadas são reescaladas para ocupar exatamente esse trecho.
 */
export const refinarComSilencios = (words, silences = [], duracao) => {
  const N = words.length;
  if (!N) return cleanWords(words);
  const P = silences.filter(([a, b]) => b - a >= 0.2).sort((x, y) => x[0] - y[0]);
  if (!P.length) return cleanWords(words);
  const fim = duracao ?? Math.max(words[N - 1].endMs / 1000, P[P.length - 1][1]);
  const ini = (i) => words[i].startMs / 1000, ter = (i) => words[i].endMs / 1000;
  const vaoT = (g) => (g === 0 ? ini(0) : g === N ? ter(N - 1) : (ter(g - 1) + ini(g)) / 2);
  const penal = (g) => {
    if (g === 0 || g === N) return 0;
    const t = words[g - 1].text;
    return /[.!?…]["'”)\]]*$/.test(t) ? 0 : /[,;:—]["'”)\]]*$/.test(t) ? 0.25 : 0.6;
  };
  const SEM_PAR = 0.7, JANELA = 3;
  const G = N + 1; // vãos 0..N; estado = último vão usado + 1 (0 = nenhum)
  let f = new Float64Array(G + 1).fill(Infinity);
  f[0] = 0;
  const volta = [];
  for (const [a, b] of P) {
    const meio = (a + b) / 2;
    const nf = new Float64Array(G + 1).fill(Infinity);
    const bk = new Int32Array(G + 1).fill(-2);
    for (let st = 0; st <= G; st++) if (f[st] + SEM_PAR < nf[st]) (nf[st] = f[st] + SEM_PAR), (bk[st] = -1);
    let melhor = Infinity, melhorSt = -1;
    for (let g = 0; g < G; g++) {
      if (f[g] < melhor) (melhor = f[g]), (melhorSt = g);
      const d = Math.abs(vaoT(g) - meio);
      if (d > JANELA || melhor === Infinity) continue;
      const custo = melhor + d + penal(g);
      if (custo < nf[g + 1]) (nf[g + 1] = custo), (bk[g + 1] = melhorSt);
    }
    volta.push(bk);
    f = nf;
  }
  let st = 0;
  for (let i = 1; i <= G; i++) if (f[i] < f[st]) st = i;
  const vaoDe = new Array(P.length).fill(-1);
  for (let k = P.length - 1; k >= 0; k--) {
    const b = volta[k][st];
    if (b === -1) continue;
    vaoDe[k] = st - 1;
    st = b;
  }
  const cortes = P.map(([a, b], k) => ({g: vaoDe[k], a, b})).filter((c) => c.g >= 0);
  const out = words.map((w) => ({...w}));
  let i0 = 0;
  for (let c = 0; c <= cortes.length; c++) {
    const i1 = c < cortes.length ? cortes[c].g : N;
    if (i1 > i0) {
      const T0 = c === 0 ? ini(i0) : cortes[c - 1].b;
      const T1 = c < cortes.length ? cortes[c].a : Math.min(fim, Math.max(ter(N - 1), T0 + 0.1));
      const s0 = ini(i0), e0 = ter(i1 - 1);
      if (e0 - s0 > 0.05) {
        const k = (T1 - T0) / (e0 - s0);
        for (let i = i0; i < i1; i++) (out[i].startMs = (T0 + (ini(i) - s0) * k) * 1000), (out[i].endMs = (T0 + (ter(i) - s0) * k) * 1000);
      } else {
        const peso = words.slice(i0, i1).reduce((n, w) => n + w.text.length + 1, 0);
        let t = T0;
        for (let i = i0; i < i1; i++) {
          const d = ((words[i].text.length + 1) / peso) * (T1 - T0);
          (out[i].startMs = t * 1000), (out[i].endMs = (t + d) * 1000);
          t += d;
        }
      }
    }
    i0 = i1;
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
