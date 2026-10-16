#!/usr/bin/env node
// Gera public/videos/<slug>/timeline.json: cada palavra falada com início/fim (ms), seções do roteiro e notas.
//
// Uso:
//   node scripts/timeline.mjs <slug> --audio narracao.mp3 [--script roteiro.md] [--alignment arquivo]
//                             [--language pt] [--model small] [--no-normalize]
//
// --alignment aceita: ElevenLabs (TTS with-timestamps ou Speech-to-Text), OpenAI Whisper verbose_json,
//   whisper.cpp JSON, legendas .srt/.vtt, captions do Remotion ou outro timeline.json.
// Sem --alignment, transcreve com whisper.cpp (instala na 1ª vez em .whisper/, ~2–5 min).
// Com --script, as palavras saem com a grafia do roteiro (nomes, números, acentos) e os tempos da fala.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const slug = argv[0];
if (!slug || slug.startsWith("--") || !opt("audio")) {
  console.error("uso: node scripts/timeline.mjs <slug> --audio <arquivo> [--script roteiro.md] [--alignment arquivo] [--language pt] [--model small]");
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error("slug deve ter só letras minúsculas, números e hífens (ex.: como-funciona-a-memoria)");
  process.exit(1);
}
const audioIn = path.resolve(opt("audio"));
const scriptIn = opt("script") ? path.resolve(opt("script")) : null;
const alignIn = opt("alignment") ? path.resolve(opt("alignment")) : null;
const language = opt("language", "pt");
const outDir = path.join(root, "public", "videos", slug);
fs.mkdirSync(outDir, {recursive: true});

const run = (bin, args) => execFileSync(bin, args, {encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]});
const durationOf = (f) => +run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).trim();

// ---------------------------------------------------------------- áudio
if (!fs.existsSync(audioIn)) throw new Error(`áudio não encontrado: ${audioIn}`);
const audioOut = path.join(outDir, "narracao.wav");
if (flag("no-normalize")) {
  run("ffmpeg", ["-y", "-v", "error", "-i", audioIn, "-ar", "48000", audioOut]);
} else {
  // -16 LUFS / -1.5 dBTP: padrão de voz para redes; deixa espaço para efeitos e trilha
  run("ffmpeg", ["-y", "-v", "error", "-i", audioIn, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", audioOut]);
}
const durationMs = Math.round(durationOf(audioOut) * 1000);

// ---------------------------------------------------------------- roteiro
const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "secao";

/** Extrai o texto falado do roteiro. Títulos (#) viram seções; [colchetes], > citações, comentários e rótulos de cena são notas. */
const parseScript = (file) => {
  const raw = fs.readFileSync(file, "utf8");
  const sections = [];
  const words = [];
  let cur = null;
  const open = (title) => {
    cur = {id: slugify(title), title, notes: [], firstWord: words.length};
    if (sections.some((s) => s.id === cur.id)) cur.id += `-${sections.length + 1}`;
    sections.push(cur);
  };
  if (file.endsWith(".json")) {
    const j = JSON.parse(raw);
    const secs = Array.isArray(j) ? j : j.sections ?? j.cenas ?? j.scenes ?? [{title: "roteiro", text: j.text ?? j.texto ?? ""}];
    for (const s of secs) {
      open(s.title ?? s.titulo ?? s.id ?? `secao-${sections.length + 1}`);
      const notes = s.visual ?? s.notes ?? s.notas ?? s.direcao;
      if (notes) cur.notes.push(...(Array.isArray(notes) ? notes : [notes]));
      pushText(s.text ?? s.texto ?? s.narracao ?? s.narration ?? "");
    }
  } else {
    for (let line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      const h = t.match(/^#{1,6}\s+(.*)$/);
      if (h) {
        open(h[1].replace(/[*_`]/g, "").trim());
        continue;
      }
      if (!cur) open("abertura");
      if (/^(>|<!--|\/\/)/.test(t) || /^---+$/.test(t)) {
        cur.notes.push(t.replace(/^>\s*|<!--|-->|^\/\/\s*/g, "").trim());
        continue;
      }
      // rótulos de direção: "VISUAL: ...", "TELA: ...", "B-ROLL: ..." → notas
      const dir = t.match(/^\**\s*(visual|tela|b-?roll|cena|on-?screen|gr[aá]fico|lettering|texto na tela|sfx|som|trilha|m[uú]sica)\s*\**\s*[:—-]\s*(.*)$/i);
      if (dir) {
        cur.notes.push(`${dir[1]}: ${dir[2]}`);
        continue;
      }
      line = t.replace(/^(narra[cç][aã]o|narrador|locu[cç][aã]o|voz|vo|off)\s*[:—-]\s*/i, "");
      // colchetes e chaves = direção
      line = line.replace(/\[([^\]]*)\]|\{([^}]*)\}/g, (_, a, b) => {
        cur.notes.push((a ?? b).trim());
        return " ";
      });
      line = line.replace(/^[-*•]\s+|^\d+[.)]\s+/, "");
      pushText(line);
    }
  }
  function pushText(text) {
    // **negrito** / *itálico* do roteirista = ênfase falada. A pontuação colada depois do fechamento
    // (**todas as cores**.) pertence à última palavra — sem ela a legenda emenda frases.
    const re = /(\*\*|__|\*|_)(.+?)\1([^\s\p{L}\p{N}]*)|(\S+)/gu;
    let m;
    while ((m = re.exec(text))) {
      const em = m[2] !== undefined;
      const parts = (em ? m[2] : m[4]).split(/\s+/).filter(Boolean);
      if (em && m[3] && parts.length) parts[parts.length - 1] += m[3];
      for (const w of parts) {
        const clean = w.replace(/[`*_]/g, "");
        if (clean.replace(/[^\p{L}\p{N}]/gu, "").length === 0) {
          // pontuação solta ("—", ".") gruda na palavra anterior
          if (words.length && /[.!?;:,]/.test(clean)) words[words.length - 1].text += clean.replace(/[^.!?;:,]/g, "");
          continue;
        }
        words.push({text: clean, em, section: sections.length - 1});
      }
    }
  }
  return {sections, words};
};

// ---------------------------------------------------------------- alinhamentos externos
const fromCharAlignment = (chars, starts, ends) => {
  const out = [];
  let cur = null;
  chars.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = {text: "", startMs: Math.round(starts[i] * 1000), endMs: 0};
    cur.text += ch;
    cur.endMs = Math.round(ends[i] * 1000);
  });
  if (cur) out.push(cur);
  return out;
};

const distribute = (text, startMs, endMs) => {
  const ws = text.split(/\s+/).filter(Boolean);
  const total = ws.reduce((n, w) => n + w.length + 1, 0);
  let t = startMs;
  return ws.map((w) => {
    const d = ((w.length + 1) / total) * (endMs - startMs);
    const o = {text: w, startMs: Math.round(t), endMs: Math.round(t + d)};
    t += d;
    return o;
  });
};

const parseTime = (s) => {
  const m = s.trim().replace(",", ".").match(/(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)/);
  return m ? Math.round(((+m[1] || 0) * 3600 + +m[2] * 60 + +m[3]) * 1000) : 0;
};

const loadAlignment = (file) => {
  const raw = fs.readFileSync(file, "utf8");
  if (/\.(srt|vtt)$/i.test(file)) {
    const words = [];
    for (const block of raw.split(/\r?\n\r?\n/)) {
      const lines = block.split(/\r?\n/).filter(Boolean);
      const ti = lines.findIndex((l) => l.includes("-->"));
      if (ti < 0) continue;
      const [a, b] = lines[ti].split("-->");
      const text = lines.slice(ti + 1).join(" ").replace(/<[^>]+>/g, "");
      words.push(...distribute(text, parseTime(a), parseTime(b.trim().split(/\s+/)[0])));
    }
    return {words, source: "legendas"};
  }
  const j = JSON.parse(raw);
  const al = j.alignment ?? j.normalized_alignment;
  if (al?.characters) return {words: fromCharAlignment(al.characters, al.character_start_times_seconds, al.character_end_times_seconds), source: "elevenlabs-tts"};
  if (Array.isArray(j) && j[0]?.startMs !== undefined) return {words: j.map((c) => ({text: c.text.trim(), startMs: c.startMs, endMs: c.endMs})), source: "remotion-captions"};
  if (j.words?.[0]?.startMs !== undefined) return {words: j.words, source: j.source ?? "timeline"};
  if (j.words?.[0]?.type !== undefined)
    return {
      words: j.words.filter((w) => w.type === "word").map((w) => ({text: w.text.trim(), startMs: Math.round(w.start * 1000), endMs: Math.round(w.end * 1000)})),
      source: "elevenlabs-stt",
    };
  const oaWords = j.words ?? j.segments?.flatMap((s) => s.words ?? []);
  if (oaWords?.length && oaWords[0].word !== undefined)
    return {words: oaWords.map((w) => ({text: w.word.trim(), startMs: Math.round(w.start * 1000), endMs: Math.round(w.end * 1000)})), source: "openai-whisper"};
  if (j.transcription?.[0]?.offsets) return {words: whisperCppWords(j), source: "whisper.cpp"};
  throw new Error(`formato de alinhamento não reconhecido: ${file}`);
};

const whisperCppWords = (j) => {
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

const transcribe = async () => {
  const {installWhisperCpp, downloadWhisperModel, transcribe: tr} = await import("@remotion/install-whisper-cpp");
  const model = opt("model", scriptIn ? "small" : "large-v3-turbo");
  const version = "1.7.6";
  // instalação compartilhada entre projetos (compila 1x, ~2 min; modelo small ≈ 470 MB)
  const wdir = process.env.ESTUDIO_WHISPER_DIR ?? path.join(os.homedir(), ".cache", "estudio-video", "whisper");
  fs.mkdirSync(path.dirname(wdir), {recursive: true});
  console.log(`→ transcrevendo com whisper.cpp (${model})…`);
  await installWhisperCpp({to: wdir, version, printOutput: false});
  await downloadWhisperModel({model, folder: wdir, printOutput: false});
  const wav16 = path.join(outDir, ".narracao-16k.wav");
  run("ffmpeg", ["-y", "-v", "error", "-i", audioOut, "-ar", "16000", "-ac", "1", wav16]);
  const res = await tr({inputPath: wav16, model, whisperPath: wdir, whisperCppVersion: version, tokenLevelTimestamps: true, language, splitOnWord: true, printOutput: false});
  fs.rmSync(wav16, {force: true});
  return {words: whisperCppWords(res), source: `whisper.cpp ${model}`};
};

// ---------------------------------------------------------------- números por extenso (pt-BR)
// O reconhecimento escreve "20%" onde o roteiro diz "vinte por cento" (e vice-versa). Para alinhar,
// os dois lados são expandidos para palavras.
const UN = ["zero", "um", "dois", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEN = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
const extenso = (n) => {
  if (n < 20) return [UN[n]];
  if (n < 100) return n % 10 ? [DEZ[Math.floor(n / 10)], "e", UN[n % 10]] : [DEZ[n / 10]];
  if (n === 100) return ["cem"];
  if (n < 1000) return n % 100 ? [CEN[Math.floor(n / 100)], "e", ...extenso(n % 100)] : [CEN[n / 100]];
  if (n < 1e6) {
    const m = Math.floor(n / 1000), r = n % 1000;
    const head = m === 1 ? ["mil"] : [...extenso(m), "mil"];
    return r ? [...head, ...(r < 100 || r % 100 === 0 ? ["e"] : []), ...extenso(r)] : head;
  }
  if (n < 1e9) {
    const m = Math.floor(n / 1e6), r = n % 1e6;
    return [...extenso(m), m === 1 ? "milhao" : "milhoes", ...(r ? extenso(r) : [])];
  }
  return [String(n)];
};
/** "20%" → ["vinte","por","cento"]; "3,5" → ["tres","virgula","cinco"]; "R$10" → ["dez","reais"] */
const expandToken = (raw) => {
  const t = raw.toLowerCase().replace(/[“”"'()]/g, "");
  const m = t.match(/^(r\$|us\$|\$)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(%|º|ª|x|mil|bi|mi|k)?[.,!?;:]?$/);
  if (!m) return null;
  const int = parseInt(m[2].replace(/\./g, ""), 10);
  if (!Number.isFinite(int)) return null;
  const out = [...extenso(int)];
  if (m[3]) out.push("virgula", ...m[3].split("").map((d) => UN[+d]));
  if (m[4] === "%") out.push("por", "cento");
  if (m[4] === "mil" || m[4] === "k") out.push("mil");
  if (m[4] === "mi") out.push("milhoes");
  if (m[4] === "bi") out.push("bilhoes");
  if (m[1] === "r$") out.push("reais");
  if (m[1] === "us$" || m[1] === "$") out.push("dolares");
  return out;
};

// ---------------------------------------------------------------- alinhamento roteiro × fala
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

const lev = (a, b) => {
  const d = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
};
const sim = (a, b) => {
  if (!a || !b) return -1;
  if (a === b) return 2;
  if (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a))) return 1;
  const r = 1 - lev(a, b) / Math.max(a.length, b.length);
  return r >= 0.7 ? 1 : -1;
};

/** expande palavras em tokens normalizados; números viram extenso e dividem o tempo da palavra */
const expand = (words, timed) => {
  const toks = [];
  words.forEach((w, i) => {
    const parts = expandToken(w.text) ?? [norm(w.text)];
    parts.forEach((p, k) => {
      const tok = {t: norm(p), i};
      if (timed) {
        const d = (w.endMs - w.startMs) / parts.length;
        tok.startMs = Math.round(w.startMs + d * k);
        tok.endMs = Math.round(w.startMs + d * (k + 1));
      }
      toks.push(tok);
    });
  });
  return toks;
};

const alignToScript = (scriptWords, spokenWords, totalMs) => {
  const SA = expand(scriptWords, false);
  const spoken = expand(spokenWords, true);
  const A = SA.map((x) => x.t);
  const B = spoken.map((x) => x.t);
  const n = A.length, m = B.length, W = m + 1;
  const score = new Int32Array((n + 1) * W);
  const back = new Uint8Array((n + 1) * W);
  for (let i = 1; i <= n; i++) (score[i * W] = -i), (back[i * W] = 1);
  for (let j = 1; j <= m; j++) (score[j] = -j), (back[j] = 2);
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const s = sim(A[i - 1], B[j - 1]);
      const dg = score[(i - 1) * W + j - 1] + s, up = score[(i - 1) * W + j] - 1, lf = score[i * W + j - 1] - 1;
      if (dg >= up && dg >= lf) (score[i * W + j] = dg), (back[i * W + j] = s > 0 ? 3 : 0);
      else if (up >= lf) (score[i * W + j] = up), (back[i * W + j] = 1);
      else (score[i * W + j] = lf), (back[i * W + j] = 2);
    }
  const match = new Array(n).fill(-1);
  for (let i = n, j = m; i > 0 || j > 0; ) {
    const b = back[i * W + j];
    if (i > 0 && j > 0 && (b === 3 || b === 0)) {
      if (b === 3) match[i - 1] = j - 1;
      i--, j--;
    } else if (i > 0 && (b === 1 || j === 0)) i--;
    else j--;
  }
  // junta os tokens de volta em palavras do roteiro
  const out = scriptWords.map((w) => ({...w, matched: false, startMs: Infinity, endMs: -Infinity}));
  SA.forEach((tok, k) => {
    if (match[k] < 0) return;
    const o = out[tok.i];
    o.matched = true;
    o.startMs = Math.min(o.startMs, spoken[match[k]].startMs);
    o.endMs = Math.max(o.endMs, spoken[match[k]].endMs);
  });
  // palavras do roteiro sem par (números por extenso, cortes do locutor): distribui no intervalo vizinho
  for (let i = 0; i < out.length; ) {
    if (out[i].matched) {
      i++;
      continue;
    }
    let k = i;
    while (k < out.length && !out[k].matched) k++;
    const from = i > 0 ? out[i - 1].endMs : 0;
    const to = k < out.length ? out[k].startMs : Math.min(totalMs, from + (k - i) * 400);
    const run = out.slice(i, k);
    const total = run.reduce((s, w) => s + w.text.length + 1, 0);
    let t = from;
    for (const w of run) {
      const d = ((w.text.length + 1) / total) * Math.max(0, to - from);
      w.startMs = Math.round(t);
      w.endMs = Math.round(t + d);
      t += d;
    }
    i = k;
  }
  return {words: out, rate: out.filter((w) => w.matched).length / Math.max(1, out.length)};
};

// ---------------------------------------------------------------- principal
const main = async () => {
  const spoken = alignIn ? loadAlignment(alignIn) : await transcribe();
  if (!spoken.words.length) throw new Error("nenhuma palavra reconhecida na narração");
  // guarda o reconhecimento bruto para diagnóstico de cues
  fs.writeFileSync(path.join(outDir, ".fala-reconhecida.json"), JSON.stringify(spoken, null, 1));
  let words = spoken.words.map((w) => ({text: w.text, startMs: w.startMs, endMs: w.endMs}));
  let sections = [];
  let rate = null;
  if (scriptIn) {
    const sc = parseScript(scriptIn);
    const al = alignToScript(sc.words, words, durationMs);
    rate = al.rate;
    words = al.words.map((w) => ({text: w.text, startMs: w.startMs, endMs: w.endMs, ...(w.em ? {em: true} : {}), ...(w.matched ? {} : {estimated: true})}));
    sections = sc.sections
      .map((s, i) => {
        const ws = al.words.filter((w) => w.section === i);
        if (!ws.length) return null;
        return {id: s.id, title: s.title, startMs: ws[0].startMs, endMs: ws[ws.length - 1].endMs, notes: s.notes.filter(Boolean)};
      })
      .filter(Boolean);
  }
  // monotonia e duração mínima
  for (let i = 0; i < words.length; i++) {
    if (i > 0 && words[i].startMs < words[i - 1].startMs) words[i].startMs = words[i - 1].startMs;
    if (words[i].endMs < words[i].startMs + 60) words[i].endMs = words[i].startMs + 60;
  }
  const tl = {
    version: 1,
    audio: "narracao.wav",
    sourceAudio: path.relative(root, audioIn),
    ...(scriptIn ? {sourceScript: path.relative(root, scriptIn)} : {}),
    durationMs,
    language,
    source: spoken.source,
    ...(rate !== null ? {scriptMatch: +rate.toFixed(3)} : {}),
    words,
    sections,
  };
  fs.writeFileSync(path.join(outDir, "timeline.json"), JSON.stringify(tl, null, 1));

  // legendas .srt (bônus para subir na plataforma)
  const fmt = (ms) => new Date(ms).toISOString().slice(11, 23).replace(".", ",");
  const lines = [];
  for (let i = 0, k = 1; i < words.length; i += 6, k++) {
    const chunk = words.slice(i, i + 6);
    lines.push(`${k}\n${fmt(chunk[0].startMs)} --> ${fmt(chunk[chunk.length - 1].endMs)}\n${chunk.map((w) => w.text).join(" ")}\n`);
  }
  fs.writeFileSync(path.join(outDir, "legendas.srt"), lines.join("\n"));

  const wpm = words.length / (durationMs / 60000);
  console.log(`✓ public/videos/${slug}/timeline.json`);
  console.log(`  ${(durationMs / 1000).toFixed(1)}s · ${words.length} palavras · ${wpm.toFixed(0)} palavras/min · fonte: ${spoken.source}`);
  if (rate !== null) {
    console.log(`  roteiro × fala: ${(rate * 100).toFixed(0)}% das palavras casadas${rate < 0.8 ? "  ⚠ baixo — confira se o roteiro é o mesmo da narração" : ""}`);
  }
  if (sections.length) {
    console.log("  seções:");
    for (const s of sections) console.log(`   • ${s.id.padEnd(28)} ${(s.startMs / 1000).toFixed(2)}s → ${(s.endMs / 1000).toFixed(2)}s${s.notes.length ? `  (${s.notes.length} nota(s))` : ""}`);
  }
  const em = words.filter((w) => w.em).map((w) => w.text);
  if (em.length) console.log(`  ênfases do roteiro: ${em.join(", ")}`);
};

main().catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exit(1);
});
