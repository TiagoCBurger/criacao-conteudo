#!/usr/bin/env node
// Encontra, prepara e analisa a mídia do projeto (vídeos, áudios, imagens) para editar no Remotion.
//
//   npm run midia                                  → procura na pasta do projeto e prepara o que é novo ou mudou
//   npm run midia -- --pasta brutos                → só nesta pasta (relativa à raiz do projeto); pode repetir com vírgula
//   npm run midia -- listar                        → o que já está no registro
//   npm run midia -- ver <id> [--de 10 --ate 40] [--cada 1]   → prancha de um trecho em out/ver/ (para olhar de perto)
//   npm run midia -- quadro <id> 12.5[,30.2]       → quadro(s) em resolução cheia em out/ver/
//   npm run midia -- transcrever <id> [--stt openrouter] [--modelo …] [--idioma pt]
//   npm run midia -- transcrever <id> --alinhamento timeline.json [--desloc 0] [--sem-refinar]   → usa palavras já alinhadas
//        (timeline da skill video-explicativo-3d, .srt/.vtt, verbose_json do OpenAI/OpenRouter, ElevenLabs)
//   npm run midia -- remover <id>
//
// Opções: --sem-transcricao · --stt whisper|openrouter · --modelo <nome> · --idioma pt · --transcrever-audio
//         --leve (cópias de trabalho até 1080p, mais rápidas) · --forcar (refaz tudo) · --sem-cenas
//
// Para cada arquivo: cópia de trabalho em public/midia/<id>.mp4 (H.264, quadros constantes, HDR convertido,
// keyframe a cada 1 s), pôster, prancha de contato com tempos, forma de onda, loudness, silêncios, cortes de
// câmera e transcrição palavra a palavra. Tudo vai para src/midia/registro.json (versionado) e para a galeria.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {cfg, ffprobe, fmtBytes, fmtTime, loadRegistro, parseArgs, projectRoot, pubMidia, refinarComSilencios, root, run, runErr, saveRegistro, slugify, tipoDe} from "./lib/util.mjs";
import {carregarAlinhamento} from "./lib/alinhamento.mjs";
import {transcribeOpenRouter, transcribeWhisper} from "./lib/stt.mjs";

const {pos, opts} = parseArgs();
const cmd = pos[0] && !pos[0].startsWith("--") && ["listar", "ver", "quadro", "transcrever", "remover"].includes(pos[0]) ? pos[0] : "preparar";
const reg = loadRegistro();
const posix = (p) => p.split(path.sep).join("/");
const r2 = (x) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------- busca
const ignorar = new Set([...(cfg.ignorar ?? []), "node_modules", ".git"]);
const findMedia = (dirs) => {
  const found = [];
  const walk = (dir) => {
    let ents;
    try {
      ents = fs.readdirSync(dir, {withFileTypes: true});
    } catch {
      return;
    }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith(".") || ignorar.has(e.name) || path.resolve(p) === root) continue;
        // conferências dos estúdios (out/check, out/ver) não são mídia
        if (["check", "ver"].includes(e.name) && path.basename(dir) === "out") continue;
        // pastas geradas por outras ferramentas (Remotion public/out, caches) não são mídia bruta
        if (fs.existsSync(path.join(p, "remotion.config.ts")) || fs.existsSync(path.join(p, "studio.config.json"))) continue;
        walk(p);
      } else if (e.isFile() && tipoDe(e.name)) {
        if (fs.statSync(p).size < 2048) continue;
        found.push(p);
      }
    }
  };
  for (const d of dirs) walk(d);
  return found;
};

// ---------------------------------------------------------------- utilitários de mídia
const evalRate = (r) => {
  if (!r || r === "0/0") return 0;
  const [a, b] = r.split("/").map(Number);
  return b ? a / b : a;
};
const pickFps = (f) => {
  if (!f || !Number.isFinite(f)) return 30;
  const std = [24, 25, 30, 48, 50, 60, 120];
  return std.reduce((best, s) => (Math.abs(s - f) < Math.abs(best - f) ? s : best), 30);
};
const loudnessOf = (file) => {
  const {stderr} = runErr("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "ebur128", "-f", "null", "-"]);
  const m = stderr.match(/I:\s+(-?[\d.]+) LUFS/g);
  const v = m ? +m.pop().match(/-?[\d.]+/)[0] : NaN;
  return Number.isFinite(v) && v > -70 ? v : null;
};
const silencesOf = (file, loud) => {
  const thr = loud === null ? -40 : Math.max(-52, Math.min(-28, loud - 20));
  const {stderr} = runErr("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", `silencedetect=noise=${thr.toFixed(0)}dB:d=0.35`, "-f", "null", "-"]);
  const out = [];
  let start = null;
  for (const line of stderr.split("\n")) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    const e = line.match(/silence_end:\s*(-?[\d.]+)/);
    if (s) start = Math.max(0, +s[1]);
    if (e && start !== null) {
      out.push([r2(start), r2(+e[1])]);
      start = null;
    }
  }
  return out;
};
const drawTime = () => `drawtext=text='%{pts\\:hms}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=6`;
// primeiro quadro de cada intervalo, mantendo o tempo original (o rótulo bate com a imagem)
const every = (s) => `select='isnan(prev_selected_t)+gte(t-prev_selected_t,${s.toFixed(3)})'`;

/** Prancha de contato + cortes de câmera numa passada só. */
const analyzeVideo = (proxy, dir, dur, {cenas = true} = {}) => {
  const passo = Math.max(1, dur / 36);
  const rows = Math.max(1, Math.ceil(Math.ceil(dur / passo) / 6));
  const prancha = path.join(dir, "prancha.jpg");
  const build = (withText) => {
    const p = `${every(passo)}${withText ? `,${drawTime()}` : ""},tile=6x${rows}:padding=4:margin=4:color=0x161616`;
    const fc = cenas ? `[0:v]scale=320:-2,split=2[s][p];[s]select='gt(scene,0.33)',showinfo[sv];[p]${p}[pv]` : `[0:v]scale=320:-2,${p}[pv]`;
    const args = ["-hide_banner", "-nostats", "-y", "-i", proxy, "-filter_complex", fc];
    if (cenas) args.push("-map", "[sv]", "-f", "null", "-");
    args.push("-map", "[pv]", "-frames:v", "1", "-q:v", "4", prancha);
    return runErr("ffmpeg", args);
  };
  let r = build(true);
  if (r.status !== 0) r = build(false); // ffmpeg sem fontconfig/drawtext
  const cuts = [];
  for (const m of r.stderr.matchAll(/pts_time:([\d.]+)/g)) cuts.push(r2(+m[1]));
  return {prancha: fs.existsSync(prancha), cenas: cuts};
};

const poster = (proxy, dir, dur) => {
  const t = Math.min(Math.max(0.3, dur * 0.1), 5, Math.max(0, dur - 0.1));
  runErr("ffmpeg", ["-y", "-v", "error", "-ss", t.toFixed(2), "-i", proxy, "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "3", path.join(dir, "poster.jpg")]);
};
const waveform = (file, dir) => {
  runErr("ffmpeg", ["-y", "-v", "error", "-i", file, "-filter_complex", "aformat=channel_layouts=mono,showwavespic=s=1200x140:colors=0x9aa4b2", "-frames:v", "1", path.join(dir, "onda.png")]);
};

// ---------------------------------------------------------------- preparar um arquivo
const prepare = (src, prev) => {
  const tipo = tipoDe(src);
  const st = fs.statSync(src);
  const base = prev?.id ?? uniqueId(slugify(path.basename(src).replace(/\.[^.]+$/, "")));
  const dir = path.join(pubMidia, base);
  fs.mkdirSync(dir, {recursive: true});
  const entry = {id: base, tipo, origem: posix(path.relative(root, src)), tamanhoOrigem: st.size, mtimeOrigem: Math.round(st.mtimeMs)};
  const info = ffprobe(src);
  const v = info.streams.find((s) => s.codec_type === "video" && !s.disposition?.attached_pic);
  const a = info.streams.find((s) => s.codec_type === "audio");

  if (tipo === "imagem") {
    const ext = path.extname(src).toLowerCase();
    const web = /^\.(png|jpe?g|webp|gif|svg)$/.test(ext);
    const out = path.join(pubMidia, `${base}${web ? ext : ".jpg"}`);
    if (web) fs.copyFileSync(src, out);
    else run("ffmpeg", ["-y", "-v", "error", "-i", src, "-frames:v", "1", "-q:v", "2", out]);
    Object.assign(entry, {arquivo: `midia/${path.basename(out)}`, largura: v?.width ?? null, altura: v?.height ?? null});
    fs.copyFileSync(out, path.join(dir, `poster${path.extname(out) === ".svg" ? ".svg" : ".jpg"}`));
    entry.poster = `midia/${base}/poster${path.extname(out) === ".svg" ? ".svg" : ".jpg"}`;
    if (path.extname(out) !== ".svg" && path.extname(out) !== ".jpg") {
      runErr("ffmpeg", ["-y", "-v", "error", "-i", out, "-frames:v", "1", "-vf", "scale='min(640,iw)':-2", "-q:v", "3", path.join(dir, "poster.jpg")]);
    }
    return entry;
  }

  if (tipo === "audio") {
    const out = path.join(pubMidia, `${base}.m4a`);
    run("ffmpeg", ["-y", "-v", "error", "-i", src, "-vn", "-map_metadata", "-1", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", out]);
    const dur = +ffprobe(out).format.duration;
    const loud = loudnessOf(out);
    Object.assign(entry, {arquivo: `midia/${base}.m4a`, duracao: r2(dur), temAudio: true, loudness: loud, silencios: silencesOf(out, loud)});
    waveform(out, dir);
    entry.onda = `midia/${base}/onda.png`;
    return entry;
  }

  // vídeo
  if (!v) throw new Error("sem faixa de vídeo");
  const fpsSrc = evalRate(v.avg_frame_rate) || evalRate(v.r_frame_rate);
  const fps = pickFps(fpsSrc);
  const max = opts.leve ? 1920 : 3840;
  const hdr = ["arib-std-b67", "smpte2084"].includes(v.color_transfer);
  const sar = v.sample_aspect_ratio && v.sample_aspect_ratio !== "1:1" && v.sample_aspect_ratio !== "0:1" ? v.sample_aspect_ratio : null;
  const vf = [];
  if (hdr) vf.push("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv");
  if (sar) vf.push("scale='trunc(iw*sar/2)*2':ih,setsar=1");
  vf.push(`scale=w='if(gte(iw,ih),trunc(min(iw,${max})/2)*2,-2)':h='if(gte(iw,ih),-2,trunc(min(ih,${max})/2)*2)'`, `fps=${fps}`, "format=yuv420p");
  const out = path.join(pubMidia, `${base}.mp4`);
  const enc = (filters) => [
    "-y", "-v", "error", "-i", src, "-map", "0:v:0", "-map", "0:a:0?", "-map_metadata", "-1", "-sn", "-dn",
    "-vf", filters.join(","), "-c:v", "libx264", "-preset", opts.leve ? "veryfast" : "fast", "-crf", opts.leve ? "21" : "17",
    "-g", String(fps), "-keyint_min", String(fps), "-sc_threshold", "0", "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", out,
  ];
  let r = runErr("ffmpeg", enc(vf));
  if (r.status !== 0 && hdr) {
    // ffmpeg sem zscale: converte sem mapeamento de tons (cores podem ficar lavadas)
    entry.aviso = "HDR convertido sem tone mapping (ffmpeg sem zscale)";
    r = runErr("ffmpeg", enc(vf.slice(1)));
  }
  if (r.status !== 0) throw new Error(r.stderr.trim().split("\n").slice(-3).join(" "));
  const pinfo = ffprobe(out);
  const pv = pinfo.streams.find((s) => s.codec_type === "video");
  const temAudio = pinfo.streams.some((s) => s.codec_type === "audio");
  const dur = +pinfo.format.duration;
  Object.assign(entry, {
    arquivo: `midia/${base}.mp4`,
    duracao: r2(dur),
    largura: pv.width,
    altura: pv.height,
    fps,
    fpsOrigem: r2(fpsSrc),
    ...(hdr ? {hdr: true} : {}),
    temAudio,
  });
  if (temAudio) {
    entry.loudness = loudnessOf(out);
    entry.silencios = silencesOf(out, entry.loudness);
  }
  poster(out, dir, dur);
  entry.poster = `midia/${base}/poster.jpg`;
  const an = analyzeVideo(out, dir, dur, {cenas: !opts["sem-cenas"]});
  if (an.prancha) entry.prancha = `midia/${base}/prancha.jpg`;
  entry.cenas = an.cenas;
  if (temAudio) {
    waveform(out, dir);
    entry.onda = `midia/${base}/onda.png`;
  }
  return entry;
};

const uniqueId = (id) => {
  if (/^\d/.test(id)) id = `c-${id}`;
  let k = id, n = 2;
  while (reg.clipes[k]) k = `${id}-${n++}`;
  return k;
};

/** Ganho linear para levar a fala a -16 LUFS (limitado a ±12 dB). */
const gainFor = (loud) => (loud === null || loud === undefined ? 1 : +Math.min(4, Math.max(0.25, Math.pow(10, (-16 - loud) / 20))).toFixed(3));

const speechless = (e) => {
  if (!e.temAudio || !e.duracao) return true;
  if (e.loudness === null) return true;
  const sil = (e.silencios ?? []).reduce((n, [a, b]) => n + (b - a), 0);
  return sil / e.duracao > 0.93;
};

const transcribe = async (e) => {
  if (opts.alinhamento) {
    const res = carregarAlinhamento(path.resolve(String(opts.alinhamento)), +(opts.desloc ?? 0));
    res.idioma = opts.idioma ?? "pt";
    console.log(`  → ${e.id}: ${res.palavras.length} palavras de ${path.basename(String(opts.alinhamento))} (${res.fonte})`);
    // alinhamento que já vem ajustado (ex.: timeline da skill 3D): --sem-refinar evita reajustar pelos silêncios
    // do clipe, que num vídeo com efeitos sonoros podem estar cobertos
    e.transcricao = opts["sem-refinar"] ? {...res, refinado: true} : refinar(res, e);
    delete e.semFala;
    return;
  }
  const src = path.join(root, "public", e.arquivo);
  const stt = opts.stt ?? "whisper";
  const language = opts.idioma ?? "pt";
  const t0 = Date.now();
  process.stdout.write(`  → transcrevendo ${e.id} (${fmtTime(e.duracao)}, ${stt})… `);
  const res =
    stt === "openrouter"
      ? await transcribeOpenRouter(src, {model: opts.modelo ?? undefined, language, duracao: e.duracao, silencios: e.silencios})
      : await transcribeWhisper(src, {model: opts.modelo ?? "large-v3-turbo", language});
  console.log(`${res.palavras.length} palavras em ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (!res.palavras.length) {
    delete e.transcricao;
    e.semFala = true;
    return;
  }
  delete e.semFala;
  e.transcricao = refinar(res, e);
};

const refinar = (t, e) => ({...t, palavras: refinarComSilencios(t.palavras, e.silencios ?? [], e.duracao), refinado: true});

// ---------------------------------------------------------------- comandos
const table = () => {
  const rows = Object.values(reg.clipes);
  if (!rows.length) {
    console.log("registro vazio — rode `npm run midia` para procurar a mídia do projeto.");
    return;
  }
  console.log(`${"id".padEnd(28)} ${"tipo".padEnd(6)} ${"duração".padStart(8)}  ${"quadro".padEnd(10)} ${"fps".padStart(4)}  fala            origem`);
  for (const e of rows) {
    const q = e.largura ? `${e.largura}×${e.altura}` : "";
    const fala = e.transcricao ? `${e.transcricao.palavras.length} palavras` : e.semFala ? "sem fala" : e.temAudio ? "—" : e.tipo === "imagem" ? "" : "sem áudio";
    console.log(
      `${e.id.padEnd(28)} ${e.tipo.padEnd(6)} ${(e.duracao ? fmtTime(e.duracao) : "").padStart(8)}  ${q.padEnd(10)} ${String(e.fps ?? "").padStart(4)}  ${fala.padEnd(15)} ${e.origem}${e.ausente ? "  ⚠ origem não encontrada" : ""}`,
    );
  }
};

const need = (id) => {
  const e = reg.clipes[id];
  if (!e) {
    console.error(`✗ clipe "${id}" não está no registro. Disponíveis: ${Object.keys(reg.clipes).join(", ") || "nenhum"}`);
    process.exit(1);
  }
  return e;
};

const main = async () => {
  if (cmd === "listar") return table();

  if (cmd === "remover") {
    const e = need(pos[1]);
    delete reg.clipes[e.id];
    fs.rmSync(path.join(pubMidia, e.id), {recursive: true, force: true});
    fs.rmSync(path.join(root, "public", e.arquivo), {force: true});
    saveRegistro(reg);
    console.log(`✓ ${e.id} removido do registro (o arquivo original não foi tocado)`);
    return;
  }

  if (cmd === "ver" || cmd === "quadro") {
    const e = need(pos[1]);
    if (e.tipo !== "video") throw new Error(`${e.id} não é vídeo`);
    const src = path.join(root, "public", e.arquivo);
    const outDir = path.join(root, "out", "ver");
    fs.mkdirSync(outDir, {recursive: true});
    if (cmd === "quadro") {
      const times = String(pos[2] ?? opts.em ?? "").split(",").map(Number).filter((t) => Number.isFinite(t));
      if (!times.length) throw new Error("informe o(s) instante(s): npm run midia -- quadro <id> 12.5,30");
      for (const t of times) {
        const f = path.join(outDir, `${e.id}-t${t.toFixed(2)}.jpg`);
        run("ffmpeg", ["-y", "-v", "error", "-ss", String(t), "-i", src, "-frames:v", "1", "-vf", "scale='min(1080,iw)':-2", "-q:v", "2", f]);
        console.log(`✓ ${path.relative(process.cwd(), f)}`);
      }
      return;
    }
    const de = +(opts.de ?? 0), ate = Math.min(+(opts.ate ?? e.duracao), e.duracao);
    const cada = +(opts.cada ?? Math.max(0.5, (ate - de) / 24));
    const n = Math.max(1, Math.ceil((ate - de) / cada));
    const cols = Math.min(6, n);
    const f = path.join(outDir, `${e.id}-${de.toFixed(1)}-${ate.toFixed(1)}.jpg`);
    const mk = (txt) => runErr("ffmpeg", ["-y", "-v", "error", "-ss", String(de), "-t", String(ate - de), "-copyts", "-i", src, "-vf", `${every(cada)},scale=400:-2${txt ? `,${drawTime()}` : ""},tile=${cols}x${Math.ceil(n / cols)}:padding=4:margin=4:color=0x161616`, "-frames:v", "1", "-q:v", "3", f]);
    if (mk(true).status !== 0) mk(false);
    console.log(`✓ ${path.relative(process.cwd(), f)}  (${n} quadros, a cada ${cada.toFixed(2)}s, de ${fmtTime(de)} a ${fmtTime(ate)})`);
    return;
  }

  if (cmd === "transcrever") {
    const e = need(pos[1]);
    if (!e.temAudio) throw new Error(`${e.id} não tem áudio`);
    await transcribe(e);
    saveRegistro(reg);
    return;
  }

  // preparar
  const dirs = opts.pasta ? String(opts.pasta).split(",").map((d) => path.resolve(projectRoot, d)) : (cfg.pastasMidia ?? [".."]).map((d) => path.resolve(root, d));
  for (const d of dirs) if (!fs.existsSync(d)) throw new Error(`pasta não encontrada: ${d}`);
  console.log(`→ procurando mídia em ${dirs.map((d) => path.relative(process.cwd(), d) || ".").join(", ")}…`);
  const files = findMedia(dirs);
  const byOrigem = new Map(Object.values(reg.clipes).map((e) => [e.origem, e]));
  fs.mkdirSync(pubMidia, {recursive: true});
  let novos = 0, erros = 0;
  const seen = new Set();
  for (const src of files) {
    const rel = posix(path.relative(root, src));
    seen.add(rel);
    const prev = byOrigem.get(rel);
    const st = fs.statSync(src);
    const same = prev && prev.tamanhoOrigem === st.size && prev.mtimeOrigem === Math.round(st.mtimeMs);
    const proxyOk = prev && fs.existsSync(path.join(root, "public", prev.arquivo));
    if (same && proxyOk && !opts.forcar) continue;
    const t0 = Date.now();
    process.stdout.write(`  ${prev ? "↻" : "+"} ${rel} (${fmtBytes(st.size)})… `);
    try {
      const e = prepare(src, prev);
      if (same && prev.transcricao && !opts.forcar) e.transcricao = prev.transcricao;
      if (same && prev.semFala) e.semFala = true;
      if (e.loudness !== undefined) e.ganho = gainFor(e.loudness);
      reg.clipes[e.id] = e;
      saveRegistro(reg);
      novos++;
      const desc = e.tipo === "video" ? `${e.largura}×${e.altura} ${e.fps}fps ${fmtTime(e.duracao)}${e.hdr ? " HDR→SDR" : ""}${e.cenas?.length ? ` · ${e.cenas.length} corte(s) de câmera` : ""}` : e.tipo === "audio" ? fmtTime(e.duracao) : `${e.largura}×${e.altura}`;
      console.log(`${e.id} · ${desc} · ${((Date.now() - t0) / 1000).toFixed(0)}s${e.aviso ? `  ⚠ ${e.aviso}` : ""}`);
    } catch (err) {
      erros++;
      console.log(`✗ ${err.message}`);
    }
  }
  for (const e of Object.values(reg.clipes)) {
    if (e.transcricao && !e.transcricao.refinado) e.transcricao = refinar(e.transcricao, e);
    const abs = path.resolve(root, e.origem);
    if (!seen.has(e.origem) && !fs.existsSync(abs)) e.ausente = true;
    else delete e.ausente;
  }
  saveRegistro(reg);

  // transcrição (a parte lenta) depois que tudo já está visível
  if (!opts["sem-transcricao"]) {
    for (const e of Object.values(reg.clipes)) {
      if (e.transcricao || e.semFala || !e.temAudio) continue;
      if (e.tipo === "audio" && !opts["transcrever-audio"]) continue;
      if (speechless(e)) {
        e.semFala = true;
        continue;
      }
      try {
        await transcribe(e);
      } catch (err) {
        console.log(`✗ ${err.message}`);
        console.log("  (a edição funciona sem transcrição; legendas e cortes por fala ficam indisponíveis para este clipe)");
        break;
      }
      saveRegistro(reg);
    }
    saveRegistro(reg);
  }

  console.log(`\n✓ registro: ${Object.keys(reg.clipes).length} item(ns) · ${novos} preparado(s) agora${erros ? ` · ${erros} com erro` : ""}`);
  table();
  execFileSync(process.execPath, [path.join(root, "scripts", "galeria.mjs")], {stdio: "inherit"});
};

main().catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exit(1);
});
