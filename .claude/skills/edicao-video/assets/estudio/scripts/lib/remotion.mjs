// Empacota o estúdio e resolve uma edição (o resumo vem do calculateMetadata da composição).
import {execFileSync} from "node:child_process";
import path from "node:path";
import {bundle} from "@remotion/bundler";
import {selectComposition} from "@remotion/renderer";
import {fmtTime, root} from "./util.mjs";

export const prepararEdicao = async (id) => {
  execFileSync(process.execPath, [path.join(root, "scripts", "sync-estilo.mjs")], {stdio: "inherit"});
  process.stdout.write("→ empacotando… ");
  const serveUrl = await bundle({entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public")});
  console.log("ok");
  let composition;
  try {
    composition = await selectComposition({serveUrl, id, inputProps: {}});
  } catch (e) {
    const msg = String(e.message ?? e);
    if (/Could not find composition/i.test(msg)) throw new Error(`edição "${id}" não existe. Crie com: npm run nova -- ${id}`);
    // erro do resolvedor (fala não encontrada, clipe inexistente…) vem embrulhado pelo Remotion
    const m = msg.match(/Error: ([^\n]+)/);
    throw new Error(m ? m[1] : msg.split("\n")[0]);
  }
  return {serveUrl, composition, resumo: composition.props?.resumo ?? null};
};

export const imprimirResumo = (id, r) => {
  if (!r) return;
  console.log(`\nEdição ${id} · ${r.largura}×${r.altura} · ${r.fps} fps · ${fmtTime(r.duracao)} · ${r.cortes.length} corte(s)`);
  console.log(`  #   saída            clipe                      origem              vel  transição        fala`);
  for (const c of r.cortes) {
    const fala = c.texto ? `"${c.texto.length > 52 ? `${c.texto.slice(0, 50)}…` : c.texto}"` : "";
    console.log(
      `  ${String(c.n).padEnd(3)} ${`${c.inicio.toFixed(2)}–${c.fim.toFixed(2)}`.padEnd(16)} ${(c.clipe + (c.id ? ` (${c.id})` : "")).padEnd(26)} ${`${c.de.toFixed(2)}–${c.ate.toFixed(2)}`.padEnd(19)} ${String(c.velocidade).padEnd(4)} ${(c.transicao || "—").padEnd(16)} ${fala}`,
    );
  }
  const k = r.contagem;
  console.log(`  textos: ${k.textos} · camadas: ${k.camadas} · zooms: ${k.zooms} · efeitos: ${k.efeitos} · sons: ${k.sons} · trilha: ${k.trilha ?? "—"} · áudios extras: ${k.audios} · legendas: ${r.legendas}`);
  if (r.avisos.length) {
    console.log("  avisos:");
    for (const a of r.avisos) console.log(`   ⚠ ${a}`);
  }
};

/** Legendas .srt a partir das palavras do vídeo final: um bloco por frase, até 2 linhas de ~42 caracteres. */
export const srtDe = (palavras) => {
  const fmt = (ms) => new Date(Math.max(0, ms)).toISOString().slice(11, 23).replace(".", ",");
  const cues = [];
  let cur = [];
  const len = (ws) => ws.reduce((n, w) => n + w.text.length + 1, 0);
  palavras.forEach((w, i) => {
    const next = palavras[i + 1];
    cur.push(w);
    const fim = /[.!?…]$/.test(w.text);
    const soft = /[,;:—]$/.test(w.text) || (next && next.startMs - w.endMs > 350);
    if (!next || fim || len(cur) > 84 || (soft && len(cur) > 42)) {
      cues.push(cur);
      cur = [];
    }
  });
  const wrap = (txt) => {
    if (txt.length <= 42) return txt;
    const ws = txt.split(" ");
    let best = 1, diff = Infinity;
    for (let k = 1; k < ws.length; k++) {
      const d = Math.abs(ws.slice(0, k).join(" ").length - ws.slice(k).join(" ").length);
      if (d < diff) (diff = d), (best = k);
    }
    return `${ws.slice(0, best).join(" ")}\n${ws.slice(best).join(" ")}`;
  };
  return cues.map((c, k) => `${k + 1}\n${fmt(c[0].startMs)} --> ${fmt(c[c.length - 1].endMs)}\n${wrap(c.map((w) => w.text).join(" "))}\n`).join("\n");
};
