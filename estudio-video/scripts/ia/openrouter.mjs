// Cliente mínimo do OpenRouter usado pelos scripts de IA (narração e imagens).
// A chave vem de OPENROUTER_API_KEY (variável de ambiente — nunca escreva a chave em arquivo versionado).
import fs from "node:fs";
import path from "node:path";

export const API = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

export const key = () => {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k) {
    console.error(
      "✗ OPENROUTER_API_KEY não está definida.\n" +
        "  Adicione a chave nas configurações do ambiente (variável OPENROUTER_API_KEY) e abra uma sessão nova.",
    );
    process.exit(2);
  }
  return k;
};

export const headers = () => ({
  Authorization: `Bearer ${key()}`,
  "Content-Type": "application/json",
  "HTTP-Referer": "https://github.com/TiagoCBurger/criacao-conteudo",
  "X-Title": "estudio-video",
});

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// POST com novas tentativas em 429/5xx (backoff exponencial)
export async function post(endpoint, body, {tries = 4, stream = false} = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${API}${endpoint}`, {method: "POST", headers: headers(), body: JSON.stringify(body)});
    if (res.ok) return stream ? res : res.json();
    last = `${res.status} ${await res.text().catch(() => "")}`.slice(0, 800);
    if (res.status !== 429 && res.status < 500) break;
    await sleep(2000 * 2 ** i);
  }
  throw new Error(`OpenRouter ${endpoint}: ${last}`);
}

// Lê um corpo SSE ("data: {...}") e chama onEvent(json) para cada evento.
export async function readSSE(res, onEvent) {
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, {stream: true});
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        onEvent(JSON.parse(data));
      } catch {
        /* comentário/keep-alive */
      }
    }
  }
}

// Roteiro .md → seções faladas [{title, text}] (mesmas regras do timeline.mjs: notas de direção ficam de fora)
export function spokenSections(file) {
  const raw = fs.readFileSync(file, "utf8");
  const out = [];
  let cur = null;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const h = t.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      cur = {title: h[1].replace(/[*_`]/g, "").trim(), text: ""};
      out.push(cur);
      continue;
    }
    if (!cur) out.push((cur = {title: "abertura", text: ""}));
    if (/^(>|<!--|\/\/)/.test(t) || /^---+$/.test(t)) continue;
    if (/^\**\s*(visual|tela|b-?roll|cena|on-?screen|gr[aá]fico|lettering|texto na tela|sfx|som|trilha|m[uú]sica)\s*\**\s*[:—-]/i.test(t)) continue;
    const spoken = t
      .replace(/^(narra[cç][aã]o|narrador|locu[cç][aã]o|voz|vo|off)\s*[:—-]\s*/i, "")
      .replace(/\[[^\]]*\]|\{[^}]*\}/g, " ")
      .replace(/^[-*•]\s+|^\d+[.)]\s+/, "")
      .replace(/[*_`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (spoken) cur.text += (cur.text ? " " : "") + spoken;
  }
  return out.filter((s) => s.text);
}

export const words = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

// fração das palavras do texto original que aparecem, em ordem, na transcrição (LCS / tamanho)
export function match(a, b) {
  const x = words(a);
  const y = words(b);
  const dp = Array.from({length: x.length + 1}, () => new Array(y.length + 1).fill(0));
  for (let i = 1; i <= x.length; i++)
    for (let j = 1; j <= y.length; j++) dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return x.length ? dp[x.length][y.length] / Math.max(x.length, y.length) : 0;
}

export const ensureDir = (p) => fs.mkdirSync(path.dirname(p), {recursive: true});
