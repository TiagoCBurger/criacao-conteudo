#!/usr/bin/env node
// Geração de mídia com IA pelo OpenRouter: vídeo, imagem, narração, música, efeitos sonoros e transcrição.
// Sem dependências (Node 20+). A chave vem de OPENROUTER_API_KEY no ambiente ou no .env do projeto.
//
//   node or.mjs catalogo [video|imagem|voz|musica|transcricao] [--busca texto] [--atualizar] [--json]
//   node or.mjs modelo <id>                                → capacidades completas de um modelo
//   node or.mjs escolher video --duracao 8 --formato 9:16 [--resolucao 1080p] [--audio] [--inicio] [--fim]
//                         [--ref-imagem] [--ref-video] [--ref-audio] [--prioridade qualidade|custo|velocidade|equilibrio]
//   node or.mjs escolher imagem [--editar] [--transparente] [--svg] [--refs 4] [--resolucao 4K] [--formato 9:16]
//   node or.mjs escolher voz [--idioma pt-BR]
//   node or.mjs video "<prompt>" [--modelo] [--duracao] [--formato] [--resolucao] [--audio|--sem-audio] [--inicio img]
//                         [--fim img] [--ref arquivo …] [--seed] [--continuar <job>] [--saida] [--simular] [--limite 3]
//   node or.mjs retomar <job-id | arquivo.job.json>
//   node or.mjs imagem "<prompt>" [--modelo] [--formato] [--resolucao] [--ref img …] [--fundo transparente] [--n 2] [--saida]
//   node or.mjs voz "<texto>" | --arquivo roteiro.txt [--modelo] [--voz] [--instrucoes "…"] [--velocidade 1] [--saida]
//   node or.mjs voz --comparar "<frase de teste>"         → a mesma frase em várias vozes pt-BR para escolher de ouvido
//   node or.mjs voz "<texto>" --modelo heygen/heygen-voice-1 --clonar amostra.wav [--texto-amostra "…"]  → voz clonada
//   node or.mjs musica "<prompt>" [--modelo google/lyria-3-pro-preview|google/lyria-3-clip-preview] [--imagem ref] [--saida]
//   node or.mjs som "<descrição do efeito>" [--saida]      → efeito sonoro / ambiência (Seed Audio)
//   node or.mjs transcrever <áudio|vídeo> [--modelo] [--idioma pt] [--saida x.json]   → palavras com tempo
//   node or.mjs saldo                                      → créditos e uso da chave
//   node or.mjs config                                     → padrões efetivos (midia-ia/config.json)
//
// Tudo o que é gerado vai para midia-ia/<tipo>/ na raiz do projeto, com um .json ao lado (prompt, modelo,
// parâmetros, custo) e uma linha em midia-ia/registro.jsonl. Antes de gastar, o custo é estimado; acima do
// limite (padrão US$ 3) o script recusa sem --confirmar. --simular mostra o pedido sem chamar a API.
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ---------------------------------------------------------------- argumentos
const argv = process.argv.slice(2);
const pos = [];
const opts = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    const next = argv[i + 1];
    const v = next !== undefined && !next.startsWith("--") ? (i++, next) : true;
    if (opts[k] === undefined) opts[k] = v;
    else opts[k] = [].concat(opts[k], v);
  } else pos.push(a);
}
const list = (v) => (v === undefined ? [] : [].concat(v).flatMap((x) => (x === true ? [] : String(x).split(",").map((s) => s.trim()).filter(Boolean))));
const num = (v, d) => (v === undefined || v === true ? d : Number(v));

// ---------------------------------------------------------------- projeto, chave, config
const findUp = (start, test) => {
  for (let d = path.resolve(start); ; d = path.dirname(d)) {
    if (test(d)) return d;
    if (d === path.dirname(d)) return null;
  }
};
const projeto = findUp(process.cwd(), (d) => fs.existsSync(path.join(d, ".env")) || fs.existsSync(path.join(d, "midia-ia")) || fs.existsSync(path.join(d, ".git"))) ?? process.cwd();
const midiaDir = path.join(projeto, "midia-ia");

const envVar = (name) => {
  if (process.env[name]) return process.env[name];
  for (let d = process.cwd(); ; d = path.dirname(d)) {
    for (const f of [".env.local", ".env"]) {
      const p = path.join(d, f);
      if (!fs.existsSync(p)) continue;
      for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && m[1] === name) return m[2].replace(/\s+#.*$/, "").replace(/^(['"])(.*)\1$/, "$2").trim();
      }
    }
    if (d === path.dirname(d)) return undefined;
  }
};
const BASE = (envVar("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
const ORIGIN = new URL(BASE).origin;

let chaveLida = null;
const chave = () => {
  if (chaveLida) return chaveLida;
  const k = envVar("OPENROUTER_API_KEY");
  if (!k) {
    fail(
      "OPENROUTER_API_KEY não encontrada. Crie um arquivo .env na raiz do projeto com a linha\n" +
        "  OPENROUTER_API_KEY=sk-or-v1-…\n" +
        "(chave em https://openrouter.ai/keys) e confira se .env está no .gitignore.",
    );
  }
  // .env com chave fora do .gitignore vaza no próximo commit
  const envFile = findUp(process.cwd(), (d) => fs.existsSync(path.join(d, ".env")));
  if (envFile && fs.existsSync(path.join(envFile, ".git"))) {
    const gi = fs.existsSync(path.join(envFile, ".gitignore")) ? fs.readFileSync(path.join(envFile, ".gitignore"), "utf8") : "";
    if (!/^\s*\/?\.env(\*|\.\*)?\s*$/m.test(gi)) warn(`o .env de ${envFile} não está no .gitignore — adicione a linha ".env" antes de commitar`);
  }
  chaveLida = k;
  return k;
};

const CONFIG_PADRAO = {
  limiteUSD: 3,
  video: {modelo: "bytedance/seedance-2.0", rascunho: "bytedance/seedance-2.0-fast", resolucao: "720p", formato: "9:16", duracao: 5},
  imagem: {modelo: "google/gemini-3.1-flash-image", formato: "9:16", resolucao: "2K"},
  voz: {modelo: "microsoft/mai-voice-2.1", voz: "pt-BR-Luana:MAI-Voice-2.1", instrucoes: null},
  musica: {modelo: "google/lyria-3-pro-preview"},
  som: {modelo: "bytedance-seed/seed-audio-1-0"},
  transcricao: {modelo: "openai/whisper-large-v3-turbo", idioma: "pt"},
};
const merge = (a, b) => {
  if (!b || typeof b !== "object" || Array.isArray(b)) return b === undefined ? a : b;
  const o = {...a};
  for (const [k, v] of Object.entries(b)) o[k] = a && typeof a[k] === "object" && a[k] && !Array.isArray(a[k]) ? merge(a[k], v) : v;
  return o;
};
const cfgFile = path.join(midiaDir, "config.json");
const CFG = merge(CONFIG_PADRAO, fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, "utf8")) : {});

// ---------------------------------------------------------------- saída
const C = process.stdout.isTTY ? {d: "\x1b[2m", b: "\x1b[1m", y: "\x1b[33m", r: "\x1b[31m", g: "\x1b[32m", x: "\x1b[0m"} : {d: "", b: "", y: "", r: "", g: "", x: ""};
function fail(msg) {
  console.error(`${C.r}✗${C.x} ${msg}`);
  process.exit(1);
}
function warn(msg) {
  console.error(`${C.y}⚠${C.x} ${msg}`);
}
const usd = (v) => (v === null || v === undefined || !Number.isFinite(v) ? "?" : v < 0.01 ? `US$ ${v.toFixed(4)}` : `US$ ${v.toFixed(2)}`);
const slug = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "item";
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const saidaPara = (tipo, nome, ext) => {
  if (opts.saida && opts.saida !== true) {
    const p = path.resolve(String(opts.saida));
    fs.mkdirSync(path.dirname(p), {recursive: true});
    return path.extname(p) ? p : `${p}.${ext}`;
  }
  const dir = path.join(midiaDir, tipo);
  fs.mkdirSync(dir, {recursive: true});
  return path.join(dir, `${stamp()}-${slug(nome)}.${ext}`);
};
const registrar = (arquivo, info) => {
  const meta = {data: new Date().toISOString(), arquivo: path.relative(projeto, arquivo), ...info};
  fs.writeFileSync(`${arquivo}.json`, JSON.stringify(meta, null, 2));
  fs.mkdirSync(midiaDir, {recursive: true});
  fs.appendFileSync(path.join(midiaDir, "registro.jsonl"), JSON.stringify(meta) + "\n");
};
const rel = (p) => path.relative(process.cwd(), p) || p;

// ---------------------------------------------------------------- HTTP
const headers = (json = true) => ({Authorization: `Bearer ${chave()}`, ...(json ? {"Content-Type": "application/json"} : {}), "HTTP-Referer": "https://github.com/TiagoCBurger/cria-o-de-conte-do", "X-Title": "criacao-de-conteudo"});
const errorText = async (r) => {
  const t = await r.text();
  try {
    const j = JSON.parse(t);
    const e = j.error ?? j;
    return `${e.message ?? t}${e.metadata ? ` ${JSON.stringify(e.metadata).slice(0, 600)}` : ""}`;
  } catch {
    return t.slice(0, 800);
  }
};
const DICAS = {401: "chave inválida ou ausente", 402: "sem créditos — adicione em https://openrouter.ai/credits", 403: "limite de gasto da chave ou acesso bloqueado", 404: "modelo inexistente ou sem provedor para este pedido", 413: "arquivo grande demais — reduza ou use uma URL pública", 429: "muitos pedidos — espere um pouco"};
const api = async (p, {method = "GET", body, auth = true, raw = false, tentativas = 3} = {}) => {
  for (let t = 1; ; t++) {
    let r;
    try {
      r = await fetch(p.startsWith("http") ? p : `${BASE}${p}`, {method, headers: auth ? headers(body !== undefined) : body !== undefined ? {"Content-Type": "application/json"} : {}, body: body === undefined ? undefined : JSON.stringify(body)});
    } catch (e) {
      if (t < tentativas) {
        await sleep(1500 * t);
        continue;
      }
      throw new Error(`falha de rede: ${e.message}`);
    }
    if (r.ok) return raw ? r : r.json();
    const retry = r.status === 429 || r.status >= 500;
    const msg = await errorText(r);
    if (retry && t < tentativas) {
      await sleep(2000 * t);
      continue;
    }
    throw new Error(`HTTP ${r.status}${DICAS[r.status] ? ` (${DICAS[r.status]})` : ""}: ${msg}`);
  }
};
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

// ---------------------------------------------------------------- catálogo (cache de 6 h)
const cacheDir = path.join(os.homedir(), ".cache", "midia-ia-openrouter");
const cached = async (nome, url) => {
  fs.mkdirSync(cacheDir, {recursive: true});
  const f = path.join(cacheDir, `${nome}-${new URL(BASE).host.replace(/[^a-z0-9]+/gi, "_")}.json`);
  if (!opts.atualizar && fs.existsSync(f) && Date.now() - fs.statSync(f).mtimeMs < 6 * 3600e3) return JSON.parse(fs.readFileSync(f, "utf8"));
  const j = await api(url, {auth: false});
  const data = j.data ?? j;
  fs.writeFileSync(f, JSON.stringify(data));
  return data;
};
const catVideo = () => cached("videos", "/videos/models");
const catImagem = () => cached("imagens", "/images/models");
const catTodos = () => cached("modelos", "/models?output_modalities=all");

// ---------------------------------------------------------------- arquivos → URLs
const MIME = {png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", flac: "audio/flac"};
const tipoArquivo = (p) => {
  const e = path.extname(p).slice(1).toLowerCase();
  const m = MIME[e];
  return m ? m.split("/")[0] : null;
};
/** URL pública passa direto; arquivo local vira data URL (base64). */
const urlDe = (p) => {
  if (/^https?:\/\//.test(p) || p.startsWith("data:")) return p;
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) fail(`arquivo não encontrado: ${p}`);
  const e = path.extname(abs).slice(1).toLowerCase();
  const mime = MIME[e];
  if (!mime) fail(`formato não suportado: ${p} (use ${Object.keys(MIME).join(", ")})`);
  const size = fs.statSync(abs).size;
  if (size > 15e6) warn(`${p} tem ${(size / 1e6).toFixed(0)} MB; acima de ~15 MB o provedor pode recusar (413). Uma URL pública evita isso.`);
  return `data:${mime};base64,${fs.readFileSync(abs).toString("base64")}`;
};
const semDados = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => (typeof v === "string" && v.startsWith("data:") ? `${v.slice(0, 32)}…(${Math.round((v.length * 3) / 4 / 1024)} KB)` : v)));
const extDeBytes = (buf, padrao = "bin") => {
  const h = buf.subarray(0, 12);
  if (h.toString("ascii", 0, 4) === "RIFF" && h.toString("ascii", 8, 12) === "WAVE") return "wav";
  if (h.toString("ascii", 0, 3) === "ID3" || (h[0] === 0xff && (h[1] & 0xe0) === 0xe0)) return "mp3";
  if (h.toString("ascii", 0, 4) === "OggS") return "ogg";
  if (h.toString("ascii", 0, 4) === "fLaC") return "flac";
  if (h.toString("ascii", 4, 8) === "ftyp") return /^(M4A|M4B)/.test(h.toString("ascii", 8, 12)) ? "m4a" : "mp4";
  if (h[0] === 0x89 && h.toString("ascii", 1, 4) === "PNG") return "png";
  if (h[0] === 0xff && h[1] === 0xd8) return "jpg";
  if (h.toString("ascii", 0, 4) === "RIFF" && h.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (h.toString("ascii", 0, 5).toLowerCase().startsWith("<svg") || h.toString("ascii", 0, 5) === "<?xml") return "svg";
  return padrao;
};

// ---------------------------------------------------------------- vídeo: capacidades, custo, escolha
const RES_CURTO = {"360p": 360, "480p": 480, "720p": 720, "768p": 768, "1080p": 1080, "1k": 1024, "2k": 1440, "4k": 2160};
const RES_ORDEM = ["360p", "480p", "720p", "768p", "1080p", "1k", "2k", "4k"];
const dimsDe = (res, ar = "16:9") => {
  const s = RES_CURTO[String(res).toLowerCase()] ?? 720;
  const [a, b] = String(ar).split(":").map(Number);
  if (!a || !b) return {w: Math.round((s * 16) / 9), h: s};
  return a >= b ? {w: Math.round((s * a) / b), h: s} : {w: s, h: Math.round((s * b) / a)};
};
const tarefaVideo = (m) => (/video-edit|aleph/.test(m.id) ? "editar" : /upscale/.test(m.id) ? "upscale" : /avatar/.test(m.id) ? "avatar" : "gerar");

/**
 * Estima o custo de um vídeo a partir de pricing_skus (as unidades variam por provedor):
 * duration_seconds* = US$/s · cents_per_*second* = centavos/s · video_tokens* = US$/token (ByteDance: tokens ≈ L×A×24/1024 por segundo).
 */
const custoVideo = (m, {duracao, resolucao, formato = "16:9", audio = false, refVideo = false, modo = "texto", nImagens = 0}) => {
  const k = m.pricing_skus ?? {};
  const r = String(resolucao ?? "720p").toLowerCase();
  const has = (key) => k[key] !== undefined && Number.isFinite(+k[key]);
  const pick = (...keys) => keys.find(has);
  const aud = audio ? "with_audio" : "without_audio";
  let porSeg = null, base = null;
  const tok = pick(refVideo && `video_tokens_${r}_with_video_input`, `video_tokens_${r}`, refVideo && "video_tokens_with_video_input", !audio && "video_tokens_without_audio", "video_tokens");
  if (tok) {
    const {w, h} = dimsDe(r, formato);
    porSeg = ((w * h * 24) / 1024) * +k[tok];
    base = tok;
  } else {
    const mode = modo === "imagem" ? "image_to_video" : modo === "referencia" ? "reference" : "text_to_video";
    const s = pick(`${mode}_duration_seconds_${r}`, modo === "referencia" && `reference_duration_seconds_${r}`, `duration_seconds_${aud}_${r}`, `duration_seconds_${r}`, `duration_seconds_${aud}`, "duration_seconds");
    if (s) {
      porSeg = +k[s];
      base = s;
    } else {
      const c = pick(`cents_per_video_output_second_${r}`, `cents_per_second_output_${r}`, "cents_per_second_output");
      if (c) {
        porSeg = +k[c] / 100;
        base = c;
      }
    }
  }
  if (porSeg === null) return {total: null, porSeg: null, base: null};
  let total = porSeg * duracao;
  if (has("cents_per_image_input") && nImagens) total += (+k.cents_per_image_input / 100) * nImagens;
  if (has("reference_input_images") && nImagens && modo === "referencia") total += +k.reference_input_images * nImagens;
  if (has("minimum_cents_per_generation")) total = Math.max(total, +k.minimum_cents_per_generation / 100);
  return {total, porSeg, base};
};

const nivelVelocidade = (id) => (/fast|lite|mini|turbo|flash|std/.test(id) ? 1 : /pro|max|prime/.test(id) ? 0.35 : 0.6);
const nivelQualidade = (m) => {
  const res = Math.max(0, ...(m.supported_resolutions ?? []).map((x) => RES_ORDEM.indexOf(String(x).toLowerCase())));
  const tier = /fast|lite|mini|turbo|std|flash/.test(m.id) ? -0.25 : /pro|max|prime/.test(m.id) ? 0.1 : 0;
  return Math.min(1, Math.max(0, res / (RES_ORDEM.length - 1) + 0.25 + tier));
};

const escolherVideo = async () => {
  const [models, todos] = await Promise.all([catVideo(), catTodos()]);
  const inMod = Object.fromEntries(todos.map((m) => [m.id, m.architecture?.input_modalities ?? []]));
  const req = {
    duracao: num(opts.duracao, CFG.video.duracao),
    formato: opts.formato ?? CFG.video.formato,
    resolucao: opts.resolucao === true ? undefined : opts.resolucao,
    audio: !!opts.audio,
    inicio: !!opts.inicio,
    fim: !!opts.fim,
    refImagem: !!opts["ref-imagem"],
    refVideo: !!opts["ref-video"],
    refAudio: !!opts["ref-audio"],
    seed: !!opts.seed,
    tarefa: opts.tarefa ?? "gerar",
  };
  const pesos = {qualidade: {q: 0.6, c: 0.25, v: 0.15}, custo: {q: 0.25, c: 0.6, v: 0.15}, velocidade: {q: 0.15, c: 0.3, v: 0.55}, equilibrio: {q: 0.4, c: 0.35, v: 0.25}}[opts.prioridade ?? "equilibrio"];
  if (!pesos) fail("--prioridade: qualidade | custo | velocidade | equilibrio");
  const out = [];
  for (const m of models) {
    const motivos = [];
    if (tarefaVideo(m) !== req.tarefa) continue;
    if (m.supported_durations && !m.supported_durations.includes(req.duracao)) motivos.push(`duração ${req.duracao}s (aceita ${resumoLista(m.supported_durations)})`);
    if (m.supported_aspect_ratios && !m.supported_aspect_ratios.includes(req.formato)) motivos.push(`formato ${req.formato}`);
    const resolucoes = (m.supported_resolutions ?? []).map((x) => String(x).toLowerCase());
    const res = req.resolucao ? String(req.resolucao).toLowerCase() : resolucoes.includes("720p") ? "720p" : resolucoes[0] ?? "720p";
    if (req.resolucao && resolucoes.length && !resolucoes.includes(res)) motivos.push(`resolução ${req.resolucao} (tem ${m.supported_resolutions.join("/")})`);
    if (req.audio && m.generate_audio !== true) motivos.push("áudio nativo");
    if (req.inicio && !(m.supported_frame_images ?? []).includes("first_frame")) motivos.push("primeiro quadro");
    if (req.fim && !(m.supported_frame_images ?? []).includes("last_frame")) motivos.push("último quadro");
    if (req.refVideo && !(inMod[m.id] ?? []).includes("video")) motivos.push("referência de vídeo");
    if (req.refAudio && !(inMod[m.id] ?? []).includes("audio")) motivos.push("referência de áudio");
    if (req.refImagem && !(inMod[m.id] ?? []).includes("image")) motivos.push("referência de imagem");
    if (req.seed && m.seed !== true) motivos.push("seed");
    const custo = custoVideo(m, {duracao: req.duracao, resolucao: res, formato: req.formato, audio: req.audio, refVideo: req.refVideo, modo: req.inicio || req.fim ? "imagem" : req.refImagem ? "referencia" : "texto"});
    out.push({m, res, custo, motivos});
  }
  const ok = out.filter((x) => !x.motivos.length);
  const custos = ok.map((x) => x.custo.total).filter(Number.isFinite);
  const [cmin, cmax] = [Math.min(...custos), Math.max(...custos)];
  for (const x of ok) {
    const c = Number.isFinite(x.custo.total) ? (cmax === cmin ? 1 : 1 - (x.custo.total - cmin) / (cmax - cmin)) : 0.3;
    x.score = pesos.q * nivelQualidade(x.m) + pesos.c * c + pesos.v * nivelVelocidade(x.m.id);
  }
  ok.sort((a, b) => b.score - a.score);
  if (opts.json) return console.log(JSON.stringify({pedido: req, candidatos: ok.map((x) => ({id: x.m.id, score: +x.score.toFixed(3), resolucao: x.res, custoUSD: x.custo.total, base: x.custo.base})), descartados: out.filter((x) => x.motivos.length).map((x) => ({id: x.m.id, falta: x.motivos}))}, null, 1));
  console.log(`${C.b}Vídeo${C.x} ${req.duracao}s · ${req.formato}${req.resolucao ? ` · ${req.resolucao}` : ""}${req.audio ? " · com áudio" : ""}${req.inicio ? " · 1º quadro" : ""}${req.fim ? " · último quadro" : ""}${req.refImagem ? " · ref. imagem" : ""}${req.refVideo ? " · ref. vídeo" : ""}${req.refAudio ? " · ref. áudio" : ""} · prioridade ${opts.prioridade ?? "equilibrio"}`);
  if (!ok.length) console.log("  nenhum modelo atende a tudo — veja o que falta abaixo e afrouxe um requisito (duração e resolução costumam ser o problema).");
  ok.slice(0, num(opts.top, 8)).forEach((x, i) => {
    console.log(`  ${i === 0 ? `${C.g}→${C.x}` : " "} ${x.m.id.padEnd(34)} ${x.res.padEnd(6)} ≈ ${usd(x.custo.total).padEnd(10)} ${C.d}${x.custo.porSeg ? `(${usd(x.custo.porSeg)}/s)` : "(custo não estimado)"} · áudio ${x.m.generate_audio ? "sim" : "não"} · ${(x.m.supported_frame_images ?? []).join("+") || "sem quadros"} · ${resumoLista(x.m.supported_durations)}s${C.x}`);
  });
  const desc = out.filter((x) => x.motivos.length);
  if (desc.length && opts.todos) {
    console.log(`${C.d}  fora:${C.x}`);
    for (const x of desc) console.log(`${C.d}    ${x.m.id.padEnd(34)} falta: ${x.motivos.join(", ")}${C.x}`);
  } else if (desc.length) console.log(`${C.d}  (${desc.length} modelo(s) não atendem; --todos mostra o motivo)${C.x}`);
  console.log(`${C.d}  Custo estimado pela tabela do OpenRouter; o real vem no fim da geração. Qualidade é heurística (resolução + nível do modelo) — veja references/modelos.md.${C.x}`);
};
const resumoLista = (l) => {
  if (!l?.length) return "?";
  const s = [...l].sort((a, b) => a - b);
  const contiguo = s.every((v, i) => i === 0 || v - s[i - 1] === 1);
  return contiguo && s.length > 2 ? `${s[0]}–${s[s.length - 1]}` : s.join("/");
};

// ---------------------------------------------------------------- vídeo: gerar, acompanhar, baixar
const gerarVideo = async () => {
  const prompt = pos[1];
  const modeloId = opts.modelo ?? (opts.rascunho ? CFG.video.rascunho : CFG.video.modelo);
  const models = await catVideo();
  const m = models.find((x) => x.id === modeloId);
  if (!m) fail(`modelo de vídeo "${modeloId}" não está no catálogo. Veja: node or.mjs catalogo video`);
  const body = {model: m.id};
  if (prompt) body.prompt = prompt;
  const erros = [];
  const duracao = num(opts.duracao, m.supported_durations?.includes(CFG.video.duracao) ? CFG.video.duracao : m.supported_durations?.[0]);
  if (duracao !== undefined && !opts.continuar) {
    if (m.supported_durations && !m.supported_durations.includes(duracao)) erros.push(`duração ${duracao}s não aceita (aceita ${resumoLista(m.supported_durations)})`);
    body.duration = duracao;
  }
  const formato = opts.formato ?? CFG.video.formato;
  if (m.supported_aspect_ratios) {
    if (!m.supported_aspect_ratios.includes(formato)) erros.push(`formato ${formato} não aceito (${m.supported_aspect_ratios.join(", ")})`);
    else body.aspect_ratio = formato;
  }
  const resolucoes = m.supported_resolutions ?? [];
  let resolucao = opts.resolucao ?? CFG.video.resolucao;
  if (resolucoes.length) {
    const achada = resolucoes.find((r) => r.toLowerCase() === String(resolucao).toLowerCase());
    if (!achada) {
      if (opts.resolucao) erros.push(`resolução ${resolucao} não aceita (${resolucoes.join(", ")})`);
      else resolucao = resolucoes.includes("720p") ? "720p" : resolucoes[resolucoes.length - 1];
    } else resolucao = achada;
    body.resolution = resolucao;
  }
  if (opts.audio || opts["sem-audio"]) {
    if (opts.audio && m.generate_audio === false) erros.push("este modelo não gera áudio (generate_audio: false)");
    body.generate_audio = !!opts.audio;
  } else if (m.generate_audio) body.generate_audio = false;
  if (opts.seed !== undefined) {
    if (m.seed !== true) warn("este modelo não garante seed; o valor pode ser ignorado");
    body.seed = Number(opts.seed);
  }
  const frames = [];
  for (const [flag, tipo] of [["inicio", "first_frame"], ["fim", "last_frame"]]) {
    if (!opts[flag]) continue;
    if (!(m.supported_frame_images ?? []).includes(tipo)) erros.push(`não aceita ${tipo} (--${flag})`);
    frames.push({type: "image_url", image_url: {url: urlDe(String(opts[flag]))}, frame_type: tipo});
  }
  if (frames.length) body.frame_images = frames;
  const refs = list(opts.ref).map((p) => {
    const t = tipoArquivo(p) ?? (/\.(mp4|mov|webm)(\?|$)/i.test(p) ? "video" : /\.(mp3|wav|m4a)(\?|$)/i.test(p) ? "audio" : "image");
    const url = urlDe(p);
    return t === "video" ? {type: "video_url", video_url: {url}} : t === "audio" ? {type: "audio_url", audio_url: {url}} : {type: "image_url", image_url: {url}};
  });
  if (refs.length) body.input_references = refs;
  if (refs.length && frames.length) warn("com --inicio/--fim e --ref juntos o OpenRouter trata o pedido como imagem→vídeo e o provedor pode ignorar as referências");
  if (opts.continuar) body.previous_job_id = String(opts.continuar);
  if (opts.provedor) body.provider = {options: JSON.parse(String(opts.provedor))};
  if (erros.length) fail(`pedido incompatível com ${m.id}:\n  - ${erros.join("\n  - ")}\nVeja as opções: node or.mjs modelo ${m.id}`);

  const est = custoVideo(m, {duracao: body.duration ?? 5, resolucao: body.resolution, formato: body.aspect_ratio, audio: !!body.generate_audio, refVideo: refs.some((r) => r.type === "video_url"), modo: frames.length ? "imagem" : refs.length ? "referencia" : "texto", nImagens: frames.length + refs.filter((r) => r.type === "image_url").length});
  console.log(`${C.b}${m.id}${C.x} · ${body.duration ?? "?"}s · ${body.aspect_ratio ?? "?"} · ${body.resolution ?? "?"}${body.generate_audio ? " · com áudio" : ""}${frames.length ? ` · ${frames.map((f) => f.frame_type).join("+")}` : ""}${refs.length ? ` · ${refs.length} referência(s)` : ""}`);
  console.log(`  custo estimado: ${usd(est.total)}${est.base ? ` ${C.d}(${est.base})${C.x}` : ""}`);
  if (opts.simular) return console.log(JSON.stringify(semDados(body), null, 2));
  limiteDeCusto(est.total, "vídeo");

  const saida = saidaPara("videos", prompt ?? m.id, "mp4");
  const job = await api("/videos", {method: "POST", body});
  const jobFile = `${saida}.job.json`;
  fs.writeFileSync(jobFile, JSON.stringify({id: job.id, polling_url: job.polling_url, modelo: m.id, prompt, pedido: semDados(body), estimativaUSD: est.total, saida: path.relative(projeto, saida)}, null, 2));
  console.log(`  job ${C.b}${job.id}${C.x} enviado (${job.status}). Leva de 30 s a alguns minutos.`);
  console.log(`  ${C.d}se for interrompido: node or.mjs retomar ${rel(jobFile)}${C.x}`);
  await acompanhar(job, jobFile);
};

const limiteDeCusto = (total, oque) => {
  const limite = num(opts.limite, CFG.limiteUSD);
  if (opts.confirmar) return;
  if (total === null) fail(`não consegui estimar o custo deste ${oque}. Confira o preço com \`node or.mjs modelo <id>\` e rode de novo com --confirmar.`);
  if (total > limite) fail(`custo estimado ${usd(total)} acima do limite (${usd(limite)}). Confirme com a pessoa e rode com --confirmar (ou --limite ${Math.ceil(total)}).`);
};

const acompanhar = async (job, jobFile) => {
  const meta = JSON.parse(fs.readFileSync(jobFile, "utf8"));
  const saida = path.resolve(projeto, meta.saida);
  const t0 = Date.now();
  const maxMin = num(opts["espera-max"], 30);
  let st = job;
  let ultimo = st.status;
  while (!["completed", "failed", "cancelled", "expired"].includes(st.status)) {
    if (Date.now() - t0 > maxMin * 60e3) fail(`ainda ${st.status} depois de ${maxMin} min. Continue depois com: node or.mjs retomar ${rel(jobFile)}`);
    await sleep(Date.now() - t0 < 60e3 ? 8000 : 15000);
    const url = st.polling_url ? new URL(st.polling_url, ORIGIN).href : `${BASE}/videos/${job.id}`;
    st = {...st, ...(await api(url))};
    if (st.status !== ultimo) {
      console.log(`  ${((Date.now() - t0) / 1000).toFixed(0)}s · ${st.status}`);
      ultimo = st.status;
    }
  }
  if (st.status !== "completed") fail(`geração ${st.status}: ${st.error ?? "sem detalhe do provedor"}`);
  const n = Math.max(1, st.unsigned_urls?.length ?? st.urls?.length ?? 1);
  const arquivos = [];
  for (let i = 0; i < n; i++) {
    const destino = n > 1 ? saida.replace(/\.mp4$/, `-${i + 1}.mp4`) : saida;
    let buf = null;
    const tentativas = [st.urls?.[i] && {url: st.urls[i], auth: false}, st.unsigned_urls?.[i] && {url: new URL(st.unsigned_urls[i], ORIGIN).href, auth: true}, {url: `${BASE}/videos/${job.id}/content?index=${i}`, auth: true}].filter(Boolean);
    for (const t of tentativas) {
      try {
        const r = await fetch(t.url, {headers: t.auth && t.url.startsWith(ORIGIN) ? {Authorization: `Bearer ${chave()}`} : {}});
        if (r.ok) {
          buf = Buffer.from(await r.arrayBuffer());
          break;
        }
      } catch {}
    }
    if (!buf) fail(`concluído, mas não consegui baixar a saída ${i}. Tente: node or.mjs retomar ${rel(jobFile)}`);
    fs.writeFileSync(destino, buf);
    arquivos.push(destino);
  }
  const custo = st.usage?.cost ?? null;
  for (const a of arquivos) registrar(a, {tipo: "video", modelo: meta.modelo, prompt: meta.prompt, pedido: meta.pedido, job: job.id, generation_id: st.generation_id, custoUSD: custo, estimativaUSD: meta.estimativaUSD});
  fs.rmSync(jobFile, {force: true});
  for (const a of arquivos) console.log(`${C.g}✓${C.x} ${rel(a)}  ${descreverMidia(a)}`);
  console.log(`  custo: ${usd(custo)}${meta.estimativaUSD ? ` (estimado ${usd(meta.estimativaUSD)})` : ""}`);
};

const descreverMidia = (f) => {
  try {
    const j = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", f], {encoding: "utf8"}));
    const v = j.streams.find((s) => s.codec_type === "video");
    const a = j.streams.some((s) => s.codec_type === "audio");
    return `${C.d}${v ? `${v.width}×${v.height} ` : ""}${(+j.format.duration).toFixed(1)}s${v ? (a ? " · com áudio" : " · sem áudio") : ""}${C.x}`;
  } catch {
    return `${C.d}${(fs.statSync(f).size / 1e6).toFixed(1)} MB${C.x}`;
  }
};

const retomar = async () => {
  const alvo = pos[1];
  if (!alvo) fail("uso: node or.mjs retomar <job-id | arquivo.job.json>");
  let jobFile = alvo.endsWith(".json") ? path.resolve(alvo) : null;
  if (!jobFile) {
    const dir = path.join(midiaDir, "videos");
    const f = fs.existsSync(dir) ? fs.readdirSync(dir).find((x) => x.endsWith(".job.json") && JSON.parse(fs.readFileSync(path.join(dir, x), "utf8")).id === alvo) : null;
    if (f) jobFile = path.join(dir, f);
    else {
      jobFile = path.join(dir, `${stamp()}-${slug(alvo)}.mp4.job.json`);
      fs.mkdirSync(dir, {recursive: true});
      fs.writeFileSync(jobFile, JSON.stringify({id: alvo, polling_url: `/api/v1/videos/${alvo}`, saida: path.relative(projeto, jobFile.replace(/\.job\.json$/, ""))}, null, 2));
    }
  }
  if (!fs.existsSync(jobFile)) fail(`não encontrei ${alvo}`);
  const meta = JSON.parse(fs.readFileSync(jobFile, "utf8"));
  console.log(`→ acompanhando ${meta.id}…`);
  await acompanhar({id: meta.id, polling_url: meta.polling_url, status: "pending"}, jobFile);
};

// ---------------------------------------------------------------- imagem
const gerarImagem = async () => {
  const prompt = pos[1];
  if (!prompt) fail('uso: node or.mjs imagem "<prompt>" [--modelo] [--formato 9:16] [--resolucao 2K] [--ref img] [--fundo transparente] [--n 2]');
  const modeloId = opts.modelo ?? CFG.imagem.modelo;
  const models = await catImagem();
  const m = models.find((x) => x.id === modeloId);
  if (!m) fail(`modelo de imagem "${modeloId}" não está no catálogo. Veja: node or.mjs catalogo imagem`);
  const sp = m.supported_parameters ?? {};
  const body = {model: m.id, prompt};
  const erros = [];
  const enumOk = (k, v) => !sp[k] || sp[k].type !== "enum" || sp[k].values.map(String).includes(String(v));
  const set = (k, v, nome, explicito) => {
    if (v === undefined || v === true) return;
    if (!sp[k]) {
      if (explicito) erros.push(`${nome} não é aceito por este modelo`);
      return;
    }
    if (!enumOk(k, v)) {
      if (explicito) erros.push(`${nome} "${v}" não aceito (${sp[k].values.join(", ")})`);
      return;
    }
    body[k] = v;
  };
  set("aspect_ratio", opts.formato ?? CFG.imagem.formato, "formato", !!opts.formato);
  set("resolution", opts.resolucao ?? CFG.imagem.resolucao, "resolução", !!opts.resolucao);
  set("background", opts.fundo === "transparente" ? "transparent" : opts.fundo, "fundo", !!opts.fundo);
  set("quality", opts.qualidade, "qualidade", true);
  set("output_format", opts["formato-saida"], "formato de saída", true);
  if (opts.n) set("n", Number(opts.n), "n", true);
  if (opts.seed !== undefined) set("seed", Number(opts.seed), "seed", true);
  const refs = list(opts.ref);
  if (refs.length) {
    const r = sp.input_references;
    if (!r) erros.push("este modelo não aceita imagens de referência (edição)");
    else if (r.max !== undefined && refs.length > r.max) erros.push(`no máximo ${r.max} referência(s)`);
    body.input_references = refs.map((p) => ({type: "image_url", image_url: {url: urlDe(p)}}));
  } else if (sp.input_references?.min > 0) erros.push(`este modelo exige pelo menos ${sp.input_references.min} imagem de referência (--ref)`);
  if (opts.provedor) body.provider = {options: JSON.parse(String(opts.provedor))};
  if (erros.length) fail(`pedido incompatível com ${m.id}:\n  - ${erros.join("\n  - ")}\nVeja: node or.mjs modelo ${m.id}`);
  console.log(`${C.b}${m.id}${C.x}${body.aspect_ratio ? ` · ${body.aspect_ratio}` : ""}${body.resolution ? ` · ${body.resolution}` : ""}${refs.length ? ` · ${refs.length} referência(s)` : ""}${body.background ? ` · fundo ${body.background}` : ""}`);
  if (opts.simular) return console.log(JSON.stringify(semDados(body), null, 2));
  const res = await api("/images", {method: "POST", body});
  const imgs = res.data ?? [];
  if (!imgs.length) fail(`resposta sem imagem: ${JSON.stringify(res).slice(0, 400)}`);
  const custo = res.usage?.cost ?? null;
  const base = saidaPara("imagens", prompt, "png");
  imgs.forEach((im, i) => {
    const buf = Buffer.from(im.b64_json, "base64");
    const ext = im.media_type?.includes("svg") ? "svg" : extDeBytes(buf, "png");
    const f = base.replace(/\.[^./\\]+$/, "") + `${imgs.length > 1 ? `-${i + 1}` : ""}.${ext}`;
    fs.writeFileSync(f, buf);
    registrar(f, {tipo: "imagem", modelo: m.id, prompt, pedido: semDados(body), custoUSD: imgs.length > 1 && custo ? custo / imgs.length : custo});
    console.log(`${C.g}✓${C.x} ${rel(f)}`);
  });
  console.log(`  custo: ${usd(custo)}`);
};

// ---------------------------------------------------------------- voz (TTS)
const pedacos = (texto, max) => {
  if (texto.length <= max) return [texto];
  const frases = texto.match(/[^.!?…\n]+[.!?…]*\s*|\n+/g) ?? [texto];
  const out = [];
  let cur = "";
  for (const f of frases) {
    if ((cur + f).length > max && cur) {
      out.push(cur.trim());
      cur = "";
    }
    cur += f;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};
// limites publicados: Eleven v3 5.000 · Eleven v4/Multilingual v2 10.000 · Seed Audio 3.000. Os demais não
// publicam; 2.500 é conservador. Se o provedor recusar por tamanho, o trecho é dividido ao meio e reenviado.
const LIMITE_CHARS = (id) => (/eleven-v4|multilingual-v2/.test(id) ? 9000 : /eleven-v3/.test(id) ? 4500 : /eleven-(flash|turbo)/.test(id) ? 9000 : /seed-audio/.test(id) ? 2800 : 2500);
const ttsAdaptativo = async (body, texto) => {
  try {
    return [await tts({...body, input: texto})];
  } catch (e) {
    if (!/HTTP 400|HTTP 413/.test(e.message) || !/long|length|limit|caracter|character|too many|exceed/i.test(e.message) || texto.length < 200) throw e;
    const meio = texto.lastIndexOf(". ", Math.floor(texto.length / 2)) + 1 || Math.floor(texto.length / 2);
    return [...(await ttsAdaptativo(body, texto.slice(0, meio).trim())), ...(await ttsAdaptativo(body, texto.slice(meio).trim()))];
  }
};

/** Converte PCM cru (s16le) em WAV. */
const pcmParaWav = (pcm, rate = 24000, ch = 1) => {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(ch, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * ch * 2, 28);
  h.writeUInt16LE(ch * 2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
};

const tts = async (body) => {
  const r = await api("/audio/speech", {method: "POST", body, raw: true});
  const ct = r.headers.get("content-type") ?? "";
  let buf = Buffer.from(await r.arrayBuffer());
  if (/pcm/.test(ct) || body.response_format === "pcm") {
    const rate = +(ct.match(/rate=(\d+)/)?.[1] ?? 24000), ch = +(ct.match(/channels=(\d+)/)?.[1] ?? 1);
    buf = pcmParaWav(buf, rate, ch);
  }
  return {buf, ext: extDeBytes(buf, "mp3"), gen: r.headers.get("x-generation-id")};
};

const juntar = (arquivos, destino) => {
  const lista = path.join(os.tmpdir(), `juntar-${process.pid}.txt`);
  fs.writeFileSync(lista, arquivos.map((a) => `file '${a.replace(/'/g, "'\\''")}'`).join("\n"));
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lista, "-c:a", "libmp3lame", "-b:a", "192k", destino]);
  fs.rmSync(lista, {force: true});
  if (r.status !== 0) fail(`ffmpeg não conseguiu juntar os trechos: ${r.stderr}`);
};

const voz = async () => {
  if (opts.comparar) return compararVozes();
  let texto = pos[1];
  if (opts.arquivo) texto = fs.readFileSync(path.resolve(String(opts.arquivo)), "utf8");
  if (!texto) fail('uso: node or.mjs voz "<texto>" | --arquivo roteiro.txt [--modelo] [--voz] [--instrucoes "…"]');
  texto = limparRoteiro(texto, !!opts.arquivo, !!opts["manter-tags"]);
  const modelo = opts.modelo ?? CFG.voz.modelo;
  const todos = await catTodos();
  const m = todos.find((x) => x.id === modelo);
  if (!m || !(m.architecture?.output_modalities ?? []).includes("speech")) fail(`"${modelo}" não é um modelo de voz do catálogo. Veja: node or.mjs catalogo voz`);
  const vozes = m.supported_voices ?? [];
  const amostras = list(opts.clonar);
  let v = amostras.length ? undefined : opts.voz ?? (modelo === CFG.voz.modelo ? CFG.voz.voz : undefined) ?? undefined;
  if (v && vozes.length && !vozes.includes(v)) fail(`voz "${v}" não existe em ${modelo}. Opções: ${vozes.slice(0, 40).join(", ")}${vozes.length > 40 ? "…" : ""}`);
  if (!v && vozes.length && !amostras.length) {
    v = vozes.find((x) => /pt-BR/i.test(x)) ?? vozes[0];
    warn(`sem --voz; usando "${v}"`);
  }
  // clonagem: 1–3 amostras da voz (com consentimento do dono), cada uma com a transcrição opcional
  let refs;
  if (amostras.length) {
    if (amostras.length > 3) fail("--clonar aceita no máximo 3 amostras");
    const textos = list(opts["texto-amostra"]);
    refs = amostras.flatMap((a, i) => [{type: "input_audio", input_audio: {data: urlDe(a)}}, ...(textos[i] ? [{type: "text", text: textos[i]}] : [])]);
    warn("clonagem de voz: use só com autorização da pessoa dona da voz. Modelos com suporte: heygen/heygen-voice-1, bytedance-seed/seed-audio-1-0, mistralai/voxtral-mini-tts-2603 (veja api.md)");
  }
  const instr = opts.instrucoes ?? (modelo === CFG.voz.modelo ? CFG.voz.instrucoes : null);
  const partes = pedacos(texto, LIMITE_CHARS(modelo));
  const preco = +(m.pricing?.prompt ?? 0);
  const est = preco * texto.length;
  console.log(`${C.b}${modelo}${C.x} · voz ${v ?? "padrão"} · ${texto.length} caracteres${partes.length > 1 ? ` em ${partes.length} partes` : ""} · ≈ ${usd(est)}`);
  const body0 = {model: modelo, response_format: "mp3", ...(v ? {voice: v} : {}), ...(refs ? {input_references: refs} : {}), ...(instr ? {instructions: instr} : {}), ...(opts.velocidade ? {speed: Number(opts.velocidade)} : {})};
  if (opts.simular) return console.log(JSON.stringify(semDados({...body0, input: partes.map((p) => p.slice(0, 80) + (p.length > 80 ? "…" : ""))}), null, 2));
  limiteDeCusto(est, "áudio");
  const saida = saidaPara("narracao", opts.arquivo ? path.basename(String(opts.arquivo)).replace(/\.[^.]+$/, "") : texto.slice(0, 40), "mp3");
  const tmp = [];
  for (const [i, p] of partes.entries()) {
    process.stdout.write(`  parte ${i + 1}/${partes.length}… `);
    const res = await ttsAdaptativo(body0, p);
    res.forEach(({buf, ext}, k) => {
      const f = path.join(os.tmpdir(), `voz-${process.pid}-${i}-${k}.${ext}`);
      fs.writeFileSync(f, buf);
      tmp.push(f);
    });
    console.log(res.length > 1 ? `ok (dividida em ${res.length})` : "ok");
  }
  if (tmp.length === 1 && tmp[0].endsWith(".mp3")) fs.copyFileSync(tmp[0], saida);
  else juntar(tmp, saida);
  tmp.forEach((f) => fs.rmSync(f, {force: true}));
  registrar(saida, {tipo: "narracao", modelo, voz: v ?? (amostras.length ? `clonada de ${amostras.map((a) => path.basename(a)).join(", ")}` : null), instrucoes: instr, caracteres: texto.length, custoEstimadoUSD: +est.toFixed(4), texto: texto.length > 4000 ? `${texto.slice(0, 4000)}…` : texto});
  console.log(`${C.g}✓${C.x} ${rel(saida)}  ${descreverMidia(saida)}`);
  console.log(`  ${C.d}para alinhar palavra a palavra: node or.mjs transcrever ${rel(saida)}${C.x}`);
};

/** Tira de um roteiro em Markdown o que não é falado: títulos, [direção], > notas, rótulos VISUAL:/TELA:. */
const limparRoteiro = (t, markdown, manterTags = false) => {
  if (!markdown) return t.trim();
  return t
    .split(/\r?\n/)
    .filter((l) => !/^\s*(#|>|<!--|\/\/|---)/.test(l) && !/^\s*\**\s*(visual|tela|b-?roll|cena|sfx|som|trilha|m[uú]sica|gr[aá]fico|lettering)\s*\**\s*[:—-]/i.test(l))
    .map((l) => (manterTags ? l : l.replace(/\[[^\]]*\]|\{[^}]*\}/g, " ")).replace(/^\s*(narra[cç][aã]o|narrador|locu[cç][aã]o|voz|vo|off)\s*[:—-]\s*/i, "").replace(/[*_`]/g, ""))
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const compararVozes = async () => {
  const frase = typeof opts.comparar === "string" ? opts.comparar : pos[1] ?? "Oi! Hoje eu vou te mostrar, em menos de um minuto, como deixar seus vídeos muito mais profissionais.";
  const todos = await catTodos();
  const candidatos = [
    {modelo: "microsoft/mai-voice-2.1", voz: "pt-BR-Luana:MAI-Voice-2.1"},
    {modelo: "microsoft/mai-voice-2.1", voz: "pt-BR-Caio:MAI-Voice-2.1"},
    {modelo: "elevenlabs/eleven-v3", voz: "sarah"},
    {modelo: "elevenlabs/eleven-v3", voz: "george"},
    {modelo: "google/gemini-3.8-flash-tts", voz: "Kore", instrucoes: "Português do Brasil, tom caloroso e animado, ritmo de criador de conteúdo"},
    {modelo: "google/gemini-3.8-flash-tts", voz: "Puck", instrucoes: "Português do Brasil, tom confiante e claro"},
    {modelo: "fish-audio/s2.1-pro", voz: null, instrucoes: "português brasileiro, animado"},
    {modelo: "hexgrad/kokoro-82m", voz: "pf_dora"},
  ].filter((c) => {
    const m = todos.find((x) => x.id === c.modelo);
    return m && (!c.voz || !(m.supported_voices ?? []).length || m.supported_voices.includes(c.voz));
  });
  const dir = path.join(midiaDir, "narracao", `comparar-${stamp()}`);
  console.log(`${C.b}Comparando ${candidatos.length} vozes${C.x} com: "${frase}"`);
  if (opts.simular) return candidatos.forEach((c) => console.log(`  ${c.modelo} · ${c.voz ?? "padrão"}`));
  fs.mkdirSync(dir, {recursive: true});
  for (const c of candidatos) {
    const nome = `${slug(c.modelo.split("/")[1])}-${slug(c.voz ?? "padrao")}`;
    try {
      const {buf, ext} = await tts({model: c.modelo, input: frase, response_format: "mp3", ...(c.voz ? {voice: c.voz} : {}), ...(c.instrucoes ? {instructions: c.instrucoes} : {})});
      const f = path.join(dir, `${nome}.${ext}`);
      fs.writeFileSync(f, buf);
      console.log(`  ${C.g}✓${C.x} ${rel(f)}`);
    } catch (e) {
      console.log(`  ${C.r}✗${C.x} ${c.modelo} · ${c.voz}: ${e.message.slice(0, 160)}`);
    }
  }
  fs.writeFileSync(path.join(dir, "vozes.json"), JSON.stringify({frase, candidatos}, null, 2));
  console.log(`\nOuça os arquivos e grave a escolhida em ${rel(cfgFile)}: {"voz": {"modelo": "…", "voz": "…", "instrucoes": "…"}}`);
};

// ---------------------------------------------------------------- música (Lyria, via chat com saída de áudio)
const musica = async () => {
  const prompt = pos[1];
  if (!prompt) fail('uso: node or.mjs musica "<gênero, clima, BPM, instrumentos, estrutura; instrumental?>" [--modelo] [--imagem ref]');
  const modelo = opts.modelo ?? CFG.musica.modelo;
  const todos = await catTodos();
  const m = todos.find((x) => x.id === modelo);
  if (!m || !(m.architecture?.output_modalities ?? []).includes("audio")) fail(`"${modelo}" não gera áudio. Opções: ${todos.filter((x) => (x.architecture?.output_modalities ?? []).includes("audio")).map((x) => x.id).join(", ")}`);
  const content = opts.imagem ? [{type: "text", text: prompt}, {type: "image_url", image_url: {url: urlDe(String(opts.imagem))}}] : prompt;
  const est = /lyria-3-clip/.test(modelo) ? 0.04 : /lyria-3-pro/.test(modelo) ? 0.08 : null;
  console.log(`${C.b}${modelo}${C.x} · ≈ ${usd(est)}`);
  const body = {model: modelo, messages: [{role: "user", content}], modalities: ["text", "audio"], stream: true};
  if (opts.seed !== undefined) body.seed = Number(opts.seed);
  if (opts.simular) return console.log(JSON.stringify(semDados(body), null, 2));
  if (est !== null) limiteDeCusto(est, "música");
  const enviar = async (b) => api("/chat/completions", {method: "POST", body: b, raw: true});
  let r;
  try {
    r = await enviar(body);
  } catch (e) {
    if (!/HTTP 400/.test(e.message)) throw e;
    r = await enviar({...body, audio: {format: "mp3"}});
  }
  const {audio, texto, custo} = await lerAudioStream(r);
  if (!audio.length) fail(`o modelo não devolveu áudio. Texto: ${texto.slice(0, 300) || "(vazio)"}`);
  const buf = Buffer.from(audio, "base64");
  const saida = saidaPara("musica", prompt, extDeBytes(buf, "mp3"));
  fs.writeFileSync(saida, buf);
  if (texto.trim()) fs.writeFileSync(saida.replace(/\.[^.]+$/, ".letra.txt"), texto.trim() + "\n");
  registrar(saida, {tipo: "musica", modelo, prompt, custoUSD: custo ?? null, letra: texto.trim() || null});
  console.log(`${C.g}✓${C.x} ${rel(saida)}  ${descreverMidia(saida)}${texto.trim() ? `\n  letra/descrição: ${rel(saida.replace(/\.[^.]+$/, ".letra.txt"))}` : ""}`);
  console.log(`  custo: ${usd(custo ?? est)}`);
};

/** Lê SSE (ou JSON) de chat completions e junta o áudio em base64. */
const lerAudioStream = async (r) => {
  const ct = r.headers.get("content-type") ?? "";
  let audio = "", texto = "", custo = null;
  const consumir = (j) => {
    if (j.usage?.cost !== undefined) custo = j.usage.cost;
    for (const ch of j.choices ?? []) {
      const d = ch.delta ?? ch.message ?? {};
      if (d.audio?.data) audio += d.audio.data;
      if (d.audio?.transcript) texto += d.audio.transcript;
      if (typeof d.content === "string") texto += d.content;
      if (Array.isArray(d.content))
        for (const p of d.content) {
          const b64 = p.audio?.data ?? p.input_audio?.data ?? p.output_audio?.data;
          if (b64) audio += b64;
          if (p.type === "text" && p.text) texto += p.text;
        }
    }
  };
  if (!ct.includes("event-stream")) {
    consumir(await r.json());
    return {audio, texto, custo};
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    buf += dec.decode(value, {stream: true});
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const j = JSON.parse(data);
        if (j.error) fail(`erro do provedor: ${j.error.message ?? JSON.stringify(j.error)}`);
        consumir(j);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  return {audio, texto, custo};
};

// ---------------------------------------------------------------- efeito sonoro (Seed Audio pelo endpoint de voz)
const som = async () => {
  const desc = pos[1];
  if (!desc) fail('uso: node or.mjs som "<descrição: o que soa, material, distância, duração; sem vozes>"');
  const modelo = opts.modelo ?? CFG.som.modelo;
  const todos = await catTodos();
  const m = todos.find((x) => x.id === modelo);
  const porSeg = +(m?.pricing?.completion ?? 0.0025);
  console.log(`${C.b}${modelo}${C.x} · efeito sonoro · ≈ ${usd(porSeg * 10)} por 10 s gerados`);
  const body = {model: modelo, input: desc, response_format: "mp3"};
  if (opts.simular) return console.log(JSON.stringify(body, null, 2));
  const {buf, ext} = await tts(body);
  const saida = saidaPara("sfx", desc, ext);
  fs.writeFileSync(saida, buf);
  registrar(saida, {tipo: "sfx", modelo, prompt: desc});
  console.log(`${C.g}✓${C.x} ${rel(saida)}  ${descreverMidia(saida)}`);
};

// ---------------------------------------------------------------- transcrição (palavras com tempo)
const transcrever = async () => {
  const arq = pos[1];
  if (!arq || !fs.existsSync(arq)) fail("uso: node or.mjs transcrever <áudio ou vídeo> [--modelo] [--idioma pt] [--saida x.json]");
  const modelo = opts.modelo ?? CFG.transcricao.modelo;
  const idioma = opts.idioma ?? CFG.transcricao.idioma;
  const dur = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq], {encoding: "utf8"}).trim();
  const BLOCO = 480;
  const words = [], segments = [];
  let texto = "", custo = 0;
  console.log(`${C.b}${modelo}${C.x} · ${dur.toFixed(1)}s · ${idioma}`);
  if (opts.simular) return;
  for (let a = 0; a < dur; a += BLOCO) {
    const b = Math.min(dur, a + BLOCO);
    const mp3 = path.join(os.tmpdir(), `stt-${process.pid}-${a}.mp3`);
    execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", String(a), "-to", String(b), "-i", arq, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", mp3]);
    const data = fs.readFileSync(mp3).toString("base64");
    fs.rmSync(mp3, {force: true});
    const res = await api("/audio/transcriptions", {method: "POST", body: {model: modelo, input_audio: {data, format: "mp3"}, language: idioma, response_format: "verbose_json", timestamp_granularities: ["word", "segment"]}});
    custo += res.usage?.cost ?? 0;
    texto += (texto ? " " : "") + (res.text ?? "").trim();
    for (const w of res.words ?? res.segments?.flatMap((s) => s.words ?? []) ?? []) words.push({word: String(w.word ?? w.text).trim(), start: +(a + w.start).toFixed(3), end: +(a + w.end).toFixed(3)});
    for (const s of res.segments ?? []) segments.push({start: +(a + s.start).toFixed(3), end: +(a + s.end).toFixed(3), text: s.text});
    if (b < dur) process.stdout.write(`  ${Math.round((b / dur) * 100)}%\r`);
  }
  if (!words.length) warn("o provedor não devolveu palavras com tempo (só texto/segmentos); tente outro --modelo, ex. openai/whisper-large-v3");
  const out = opts.saida && opts.saida !== true ? path.resolve(String(opts.saida)) : arq.replace(/\.[^.]+$/, ".palavras.json");
  // formato OpenAI verbose_json: aceito pelo --alignment da skill video-explicativo-3d
  fs.writeFileSync(out, JSON.stringify({text: texto, language: idioma, duration: dur, words, segments, fonte: `openrouter ${modelo}`}, null, 1));
  console.log(`${C.g}✓${C.x} ${rel(out)} · ${words.length} palavras · custo ${usd(custo)}`);
};

// ---------------------------------------------------------------- catálogo e modelo
const catalogo = async () => {
  const tipo = pos[1] ?? "todos";
  const busca = opts.busca ? String(opts.busca).toLowerCase() : null;
  const filtra = (arr) => (busca ? arr.filter((m) => `${m.id} ${m.name ?? ""} ${m.description ?? ""}`.toLowerCase().includes(busca)) : arr);
  const linha = (...c) => console.log(c.join(" "));
  if (tipo === "video" || tipo === "todos") {
    const ms = filtra(await catVideo());
    if (opts.json) return console.log(JSON.stringify(ms, null, 1));
    console.log(`${C.b}Vídeo (${ms.length})${C.x}  ${C.d}custo ≈ 5 s em 720p (ou a menor resolução), sem áudio${C.x}`);
    for (const m of ms) {
      const r = (m.supported_resolutions ?? []).map((x) => x.toLowerCase()).includes("720p") ? "720p" : (m.supported_resolutions ?? ["720p"])[0];
      const c = custoVideo(m, {duracao: 5, resolucao: r, formato: "9:16"});
      linha(`  ${m.id.padEnd(36)}`, `${tarefaVideo(m).padEnd(7)}`, `${resumoLista(m.supported_durations).padEnd(7)}s`, `${(m.supported_resolutions ?? []).join("/").padEnd(22)}`, `áudio ${m.generate_audio ? "sim" : "não"}`.padEnd(10), `${(m.supported_frame_images ?? []).join("+").padEnd(22)}`, `≈ ${usd(c.total)}`);
    }
  }
  if (tipo === "imagem" || tipo === "todos") {
    const ms = filtra(await catImagem());
    if (opts.json) return console.log(JSON.stringify(ms, null, 1));
    console.log(`${C.b}Imagem (${ms.length})${C.x}`);
    for (const m of ms) {
      const sp = m.supported_parameters ?? {};
      const v = (k) => (sp[k]?.type === "enum" ? sp[k].values.join("/") : sp[k] ? "sim" : "—");
      linha(`  ${m.id.padEnd(40)}`, `refs ${sp.input_references ? `${sp.input_references.min ?? 0}–${sp.input_references.max ?? "?"}` : "—"}`.padEnd(10), `res ${v("resolution")}`.padEnd(24), `fundo ${v("background")}`.padEnd(30), sp.output_format ? `saída ${v("output_format")}` : "");
    }
  }
  if (["voz", "musica", "transcricao", "todos"].includes(tipo)) {
    const todos = await catTodos();
    const sel = (mod) => filtra(todos.filter((m) => (m.architecture?.output_modalities ?? []).includes(mod)));
    if (tipo === "voz" || tipo === "todos") {
      const ms = sel("speech");
      if (opts.json) return console.log(JSON.stringify(ms, null, 1));
      console.log(`${C.b}Voz / TTS (${ms.length})${C.x}  ${C.d}preço por 1.000 caracteres${C.x}`);
      for (const m of ms) {
        const pt = (m.supported_voices ?? []).filter((x) => /pt[-_]?(br|pt)|^p[fm]_/i.test(x));
        linha(`  ${m.id.padEnd(40)}`, `${usd(+(m.pricing?.prompt ?? 0) * 1000).padEnd(11)}`, `${(m.supported_voices ?? []).length} vozes`.padEnd(10), pt.length ? `pt: ${pt.join(", ")}` : "");
      }
    }
    if (tipo === "musica" || tipo === "todos") {
      const ms = sel("audio");
      if (opts.json) return console.log(JSON.stringify(ms, null, 1));
      console.log(`${C.b}Música e áudio (${ms.length})${C.x}`);
      for (const m of ms) linha(`  ${m.id.padEnd(40)}`, (m.description ?? "").slice(0, 90));
    }
    if (tipo === "transcricao" || tipo === "todos") {
      const ms = sel("transcription");
      if (opts.json) return console.log(JSON.stringify(ms, null, 1));
      console.log(`${C.b}Transcrição (${ms.length})${C.x}`);
      for (const m of ms) linha(`  ${m.id.padEnd(48)}`, `${usd(+(m.pricing?.prompt ?? 0) * 60)}/min`);
    }
  }
  if (!["video", "imagem", "voz", "musica", "transcricao", "todos"].includes(tipo)) fail("tipos: video | imagem | voz | musica | transcricao | todos");
  const tres = (await catTodos()).filter((m) => (m.architecture?.output_modalities ?? []).some((o) => /3d|mesh|glb/i.test(o)));
  if (tipo === "todos") console.log(`${C.b}3D (malhas .glb)${C.x}: ${tres.length ? tres.map((m) => m.id).join(", ") : "nenhum modelo no catálogo do OpenRouter hoje — veja references/3d.md"}`);
};

const modelo = async () => {
  const id = pos[1];
  if (!id) fail("uso: node or.mjs modelo <id>");
  const [v, im, todos] = await Promise.all([catVideo(), catImagem(), catTodos()]);
  const mv = v.find((x) => x.id === id), mi = im.find((x) => x.id === id), mt = todos.find((x) => x.id === id);
  if (!mv && !mi && !mt) fail(`"${id}" não está no catálogo. Procure com: node or.mjs catalogo todos --busca ${id.split("/").pop()}`);
  if (mt) console.log(`${C.b}${mt.name}${C.x} (${id})\n${mt.description}\n  entrada: ${(mt.architecture?.input_modalities ?? []).join(", ")} → saída: ${(mt.architecture?.output_modalities ?? []).join(", ")}`);
  if (mv) {
    console.log(`  tarefa: ${tarefaVideo(mv)} · durações: ${resumoLista(mv.supported_durations)}s · resoluções: ${(mv.supported_resolutions ?? []).join(", ") || "—"} · formatos: ${(mv.supported_aspect_ratios ?? []).join(", ") || "—"}`);
    console.log(`  quadros: ${(mv.supported_frame_images ?? []).join(", ") || "—"} · áudio nativo: ${mv.generate_audio ?? "?"} · seed: ${mv.seed ?? "?"}`);
    console.log(`  preços (pricing_skus): ${JSON.stringify(mv.pricing_skus)}`);
    console.log(`  parâmetros do provedor: ${(mv.allowed_passthrough_parameters ?? []).join(", ") || "—"}`);
    for (const r of mv.supported_resolutions ?? []) {
      const c = custoVideo(mv, {duracao: 5, resolucao: r, formato: "9:16"});
      console.log(`  ≈ 5 s em ${r}: ${usd(c.total)}${c.base ? ` ${C.d}(${c.base})${C.x}` : ""}`);
    }
  }
  if (mi) {
    console.log(`  parâmetros: ${Object.entries(mi.supported_parameters ?? {}).map(([k, s]) => `${k}=${s.type === "enum" ? s.values.join("/") : s.type === "range" ? `${s.min}–${s.max}` : s.type}`).join(" · ")}`);
    try {
      const ep = await api(`/images/models/${id}/endpoints`, {auth: false});
      for (const e of ep.data?.endpoints ?? ep.endpoints ?? []) console.log(`  provedor ${e.provider_name ?? e.provider_slug}: ${JSON.stringify(e.pricing ?? {}).slice(0, 200)}`);
    } catch {}
  }
  if (mt?.supported_voices?.length) console.log(`  vozes (${mt.supported_voices.length}): ${mt.supported_voices.join(", ")}`);
  if (mt && !mv && !mi) console.log(`  preço: ${JSON.stringify(Object.fromEntries(Object.entries(mt.pricing ?? {}).filter(([, x]) => x !== "0")))}`);
};

const escolherImagem = async () => {
  const ms = await catImagem();
  const precisa = {editar: !!opts.editar, transparente: !!opts.transparente, svg: !!opts.svg, refs: num(opts.refs, opts.editar ? 1 : 0), resolucao: opts.resolucao, formato: opts.formato};
  const ok = [];
  for (const m of ms) {
    const sp = m.supported_parameters ?? {};
    const falta = [];
    if ((precisa.editar || precisa.refs) && !(sp.input_references && (sp.input_references.max ?? 0) >= Math.max(1, precisa.refs))) falta.push(`${precisa.refs || 1}+ referência(s)`);
    if (!precisa.editar && !precisa.refs && sp.input_references?.min > 0) falta.push("exige referência");
    if (precisa.transparente && !(sp.background?.values ?? []).includes("transparent")) falta.push("fundo transparente");
    if (precisa.svg && !(sp.output_format?.values ?? []).includes("svg")) falta.push("SVG");
    if (!precisa.svg && sp.output_format?.values?.length === 1 && sp.output_format.values[0] === "svg") falta.push("só gera SVG");
    if (precisa.resolucao && sp.resolution && !sp.resolution.values.map(String).includes(String(precisa.resolucao))) falta.push(`resolução ${precisa.resolucao}`);
    if (precisa.formato && sp.aspect_ratio && !sp.aspect_ratio.values.includes(precisa.formato)) falta.push(`formato ${precisa.formato}`);
    if (!falta.length) ok.push(m);
  }
  console.log(`${C.b}Imagem${C.x} ${Object.entries(precisa).filter(([, v]) => v).map(([k, v]) => (v === true ? k : `${k} ${v}`)).join(" · ") || "(sem requisitos)"} → ${ok.length} modelo(s)`);
  for (const m of ok.slice(0, num(opts.top, 15))) console.log(`  ${m.id.padEnd(42)} ${C.d}${(m.description ?? "").slice(0, 100)}${C.x}`);
  console.log(`${C.d}  Para escolher entre eles por finalidade (texto na imagem, fotorrealismo, consistência, rapidez), veja references/modelos.md.${C.x}`);
};

const escolherVoz = async () => {
  const todos = await catTodos();
  const idioma = String(opts.idioma ?? "pt-BR");
  const ms = todos.filter((m) => (m.architecture?.output_modalities ?? []).includes("speech"));
  console.log(`${C.b}Voz${C.x} para ${idioma}:`);
  for (const m of ms) {
    const vs = m.supported_voices ?? [];
    const nativas = vs.filter((v) => v.toLowerCase().includes(idioma.toLowerCase()) || (/^pt/i.test(idioma) && /^p[fm]_/.test(v)));
    const multi = /multilingual|\d+\+? languages|languages/i.test(m.description ?? "") || /gemini.*tts/.test(m.id);
    if (!nativas.length && !multi) continue;
    const preco = +(m.pricing?.prompt ?? 0) > 0 ? `${usd(+m.pricing.prompt * 1000)}/1k car.` : `${usd(+(m.pricing?.completion ?? 0))}/s gerado`;
    console.log(`  ${m.id.padEnd(40)} ${preco.padEnd(20)} ${nativas.length ? `vozes nativas: ${nativas.join(", ")}` : `${C.d}multilíngue (${vs.length || "sem lista de"} vozes; sotaque varia)${C.x}`}`);
  }
  console.log(`${C.d}  Melhor jeito de decidir: node or.mjs voz --comparar "uma frase do seu roteiro" e ouvir.${C.x}`);
};

const saldo = async () => {
  const k = await api("/key");
  const d = k.data ?? k;
  console.log(`chave: ${d.label ?? "?"} · uso total ${usd(d.usage)}${d.limit !== null && d.limit !== undefined ? ` de ${usd(d.limit)} (resta ${usd(d.limit_remaining ?? d.limit - d.usage)})` : " · sem limite de gasto"}${d.usage_daily !== undefined ? ` · hoje ${usd(d.usage_daily)}` : ""}`);
  try {
    const c = await api("/credits");
    const cd = c.data ?? c;
    console.log(`créditos da conta: ${usd(cd.total_credits - cd.total_usage)} disponíveis (comprados ${usd(cd.total_credits)}, usados ${usd(cd.total_usage)})`);
  } catch {}
};

// ---------------------------------------------------------------- principal
const main = async () => {
  const cmd = pos[0];
  switch (cmd) {
    case "catalogo":
      return catalogo();
    case "modelo":
      return modelo();
    case "escolher":
      return pos[1] === "imagem" ? escolherImagem() : pos[1] === "voz" ? escolherVoz() : pos[1] === "video" || !pos[1] ? escolherVideo() : fail("escolher: video | imagem | voz");
    case "video":
      return gerarVideo();
    case "retomar":
      return retomar();
    case "imagem":
      return gerarImagem();
    case "voz":
      return voz();
    case "musica":
      return musica();
    case "som":
      return som();
    case "transcrever":
      return transcrever();
    case "saldo":
      return saldo();
    case "config":
      return console.log(JSON.stringify({projeto, saida: rel(midiaDir), config: fs.existsSync(cfgFile) ? rel(cfgFile) : "(padrões — crie midia-ia/config.json para fixar escolhas do projeto)", ...CFG}, null, 2));
    default:
      console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1).filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith("//"))).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  }
};

main().catch((e) => fail(e.message));
