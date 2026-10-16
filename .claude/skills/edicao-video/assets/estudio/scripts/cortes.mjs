#!/usr/bin/env node
// Lê a fala de um clipe em frases (com tempos) e sugere cortes: tira pausas longas, vícios ("é…", "hum")
// e takes repetidos (fica o último, que costuma ser o bom). A saída é um trecho pronto para colar em `cortes`.
//
//   npm run cortes -- <clipe>                 → frases + sugestão
//   npm run cortes -- <clipe> --pausa 0.45    → pausa (s) que separa frases e vira corte (padrão 0.5)
//   npm run cortes -- <clipe> --de 30 --ate 90 → só um trecho do clipe
//   npm run cortes -- <clipe> --manter-tudo   → não descarta retomadas nem vícios (só tira as pausas)
//   npm run cortes -- <clipe> --json          → dados em JSON
// Sem transcrição, usa os silêncios detectados no `npm run midia`.
import {fmtTime, loadRegistro, parseArgs} from "./lib/util.mjs";

const {pos, opts} = parseArgs();
const id = pos[0];
const reg = loadRegistro();
const c = reg.clipes[id];
if (!c) {
  console.error(`uso: npm run cortes -- <clipe>. Disponíveis: ${Object.keys(reg.clipes).join(", ") || "nenhum (rode npm run midia)"}`);
  process.exit(1);
}
const pausa = +(opts.pausa ?? 0.5);
const [fA, fD] = String(opts.folga ?? "0.1,0.16").split(",").map(Number);
const de = +(opts.de ?? 0), ate = +(opts.ate ?? c.duracao);
const r2 = (x) => Math.round(x * 100) / 100;
const norm = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const VICIOS = new Set(["e", "eh", "ee", "ah", "ahn", "an", "hum", "hm", "hmm", "uh", "um", "uhm", "tipo", "ne", "entao", "assim", "aham", "ok", "bom", "enfim"]);

const words = (c.transcricao?.palavras ?? []).filter((w) => w.startMs / 1000 >= de && w.endMs / 1000 <= ate + 0.05);

if (!words.length) {
  // só silêncios: trechos com som entre silêncios
  const sil = (c.silencios ?? []).filter(([a, b]) => b > de && a < ate);
  const keep = [];
  let t = de;
  for (const [a, b] of sil) {
    if (b - a < pausa) continue;
    if (a - t > 0.25) keep.push([Math.max(de, t - fA), Math.min(ate, a + fD)]);
    t = b;
  }
  if (ate - t > 0.25) keep.push([Math.max(de, t - fA), ate]);
  const total = keep.reduce((n, [a, b]) => n + b - a, 0);
  if (opts.json) {
    console.log(JSON.stringify({clipe: id, fonte: "silencios", cortes: keep.map(([a, b]) => ({de: r2(a), ate: r2(b)}))}, null, 1));
    process.exit(0);
  }
  console.log(`${id}: sem transcrição — sugestão pelos silêncios (≥ ${pausa}s). ${fmtTime(ate - de)} → ${fmtTime(total)}`);
  console.log(`(para cortar pela fala: npm run midia -- transcrever ${id})\n`);
  console.log("  cortes: [");
  for (const [a, b] of keep) console.log(`    {clipe: "${id}", de: ${r2(a)}, ate: ${r2(b)}},`);
  console.log("  ],");
  process.exit(0);
}

// frases
const frases = [];
let cur = [];
words.forEach((w, i) => {
  cur.push(w);
  const next = words[i + 1];
  const gap = next ? (next.startMs - w.endMs) / 1000 : Infinity;
  if (!next || gap >= pausa || (/[.!?…]$/.test(w.text) && gap >= 0.15) || cur.length >= 30) {
    frases.push({ws: cur, ini: cur[0].startMs / 1000, fim: cur[cur.length - 1].endMs / 1000});
    cur = [];
  }
});
frases.forEach((f, i) => {
  f.n = i + 1;
  f.texto = f.ws.map((w) => w.text).join(" ");
  f.toks = norm(f.texto).split(" ").filter(Boolean);
  f.vicio = f.toks.every((t) => VICIOS.has(t));
});
// retomadas: a frase começa igual a uma das próximas 3 (o locutor recomeçou) → fica a última
for (let i = 0; i < frases.length; i++) {
  const a = frases[i];
  if (a.vicio || a.toks.length < 2) continue;
  const k = Math.min(3, a.toks.length);
  for (let j = i + 1; j <= Math.min(frases.length - 1, i + 3); j++) {
    const b = frases[j];
    if (b.toks.slice(0, k).join(" ") === a.toks.slice(0, k).join(" ")) {
      a.retomada = j + 1;
      break;
    }
  }
}

const manterTudo = !!opts["manter-tudo"];
const mantidas = frases.filter((f) => manterTudo || (!f.vicio && !f.retomada));
// junta frases mantidas vizinhas (sem nada descartado entre elas) quando a pausa é curta
const cortes = [];
for (const f of mantidas) {
  const last = cortes[cortes.length - 1];
  const contigua = last && last.frases[last.frases.length - 1].n === f.n - 1;
  if (contigua && f.ini - last.fim < pausa) {
    last.fim = f.fim;
    last.frases.push(f);
  } else cortes.push({ini: f.ini, fim: f.fim, frases: [f]});
}
const wordsAll = c.transcricao.palavras;
for (const k of cortes) {
  const iFirst = wordsAll.indexOf(k.frases[0].ws[0]);
  const lastF = k.frases[k.frases.length - 1];
  const iLast = wordsAll.indexOf(lastF.ws[lastF.ws.length - 1]);
  const prev = wordsAll[iFirst - 1], next = wordsAll[iLast + 1];
  k.de = r2(Math.max(k.ini - fA, prev ? prev.endMs / 1000 + 0.01 : 0));
  k.ate = r2(Math.max(k.fim, Math.min(k.fim + fD, next ? next.startMs / 1000 - 0.01 : c.duracao)));
  k.de = Math.min(k.de, r2(k.ini));
}

const total = cortes.reduce((n, k) => n + k.ate - k.de, 0);
if (opts.json) {
  console.log(JSON.stringify({clipe: id, frases: frases.map(({n, ini, fim, texto, vicio, retomada}) => ({n, ini: r2(ini), fim: r2(fim), texto, vicio, retomada})), cortes: cortes.map((k) => ({de: k.de, ate: k.ate, frases: k.frases.map((f) => f.n)}))}, null, 1));
  process.exit(0);
}

console.log(`${id} · ${fmtTime(c.duracao)} · ${words.length} palavras · fonte: ${c.transcricao.fonte}\n`);
console.log("Frases (✕ = sugerido descartar):");
for (const f of frases) {
  const flag = f.vicio ? "✕ vício" : f.retomada ? `✕ retomada (repete na f${f.retomada})` : "";
  console.log(`  ${(f.vicio || f.retomada) && !manterTudo ? "✕" : " "} f${String(f.n).padEnd(3)} ${f.ini.toFixed(2).padStart(7)}–${f.fim.toFixed(2).padEnd(7)} ${f.texto}${flag ? `   [${flag}]` : ""}`);
}
console.log(`\nSugestão: ${cortes.length} corte(s) · ${fmtTime(ate - de)} → ${fmtTime(total)} (${Math.round((1 - total / (ate - de)) * 100)}% a menos)`);
console.log("Revise: as retomadas são palpites (compare as frases), e cortes muito próximos podem virar um só.\n");
console.log("  cortes: [");
for (const k of cortes) {
  const txt = k.frases.map((f) => f.texto).join(" ");
  console.log(`    {clipe: "${id}", de: ${k.de}, ate: ${k.ate}}, // f${k.frases.map((f) => f.n).join(",f")}: "${txt.length > 70 ? `${txt.slice(0, 67)}…` : txt}"`);
}
console.log("  ],");
