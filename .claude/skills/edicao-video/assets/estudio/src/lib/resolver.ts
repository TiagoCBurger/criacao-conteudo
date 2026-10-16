// Transforma a edição (cortes por tempo ou por fala, momentos ancorados em falas) num plano exato em quadros.
// É puro e determinístico: roda no Studio, no render e no `npm run check` (que imprime o resumo).
import manifest from "../../public/sfx/manifest.json";
import {estilo} from "./estilo";
import {clipe, type Clipe, type Palavra} from "./midia";
import type {AudioExtra, Camada, Corte, Direcao, Edicao, Efeito, Enquadramento, Filtro, Foco, Momento, Som, Texto, TipoTransicao, Transicao, ZoomMomento} from "./tipos";

const sounds = (manifest as unknown as {sounds: Record<string, {file: string; duration: number}>}).sounds;
export const sfxNames = Object.keys(sounds);
export const sfxInfo = (name: string) => sounds[name];

// ---------------------------------------------------------------- tipos do plano
export type Faixa = {inicio: number; frames: number};

export type CortePlano = Faixa & {
  n: number;
  id?: string;
  clipe: Clipe;
  /** segundos na origem */
  de: number;
  ate: number;
  /** trimBefore em quadros da composição */
  trim: number;
  velocidade: number;
  volume: number;
  mudo: boolean;
  enquadrar: Enquadramento;
  foco: Foco;
  zoom: {de: number; para: number};
  filtro: string | null;
  espelhar: boolean;
  entrada: {tipo: TipoTransicao; frames: number; direcao: Direcao} | null;
  saidaFrames: number;
  /** quadros de conteúdo (de→ate) e sobras de mídia usadas pelas transições antes/depois dele */
  conteudo: number;
  sobraAntes: number;
  sobraDepois: number;
  texto: string;
};

export type PalavraPlano = Palavra & {corte: number};

export type Plano = {
  largura: number;
  altura: number;
  fps: number;
  frames: number;
  fundo: string;
  cortes: CortePlano[];
  palavras: PalavraPlano[];
  textos: (Texto & Faixa)[];
  camadas: (Camada & Faixa & {indice: number; clipeInfo?: Clipe})[];
  zooms: (ZoomMomento & Faixa)[];
  efeitos: (Efeito & Faixa)[];
  sons: (Faixa & {src: {sfx?: string; clipe?: Clipe}; volume: number; velocidade: number; auto?: boolean})[];
  trilha: (Faixa & {clipe: Clipe; volume: number; ducking: boolean; de: number; fadeIn: number; fadeOut: number; loop: boolean}) | null;
  audios: (Faixa & {clipe: Clipe; de: number; volume: number})[];
  legendas: null | {estilo: "pop" | "karaoke" | "caixa" | "simples"; posicao: "baixo" | "centro" | "topo"; maxPalavras: number; tamanho: number; maiusculas: boolean; destaque: string[]; ocultar: Faixa[]};
  vinheta: number;
  fadeFinal: number;
  capa: number | null;
  avisos: string[];
};

// ---------------------------------------------------------------- utilidades
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

type Tok = {t: string; w: number};
const tokenize = (words: {text: string}[]): Tok[] => {
  const out: Tok[] = [];
  words.forEach((w, i) => {
    for (const t of norm(w.text).split(" ")) if (t) out.push({t, w: i});
  });
  return out;
};

/** Procura uma frase numa lista de palavras. Devolve índices da primeira e da última palavra. */
const findPhrase = (toks: Tok[], phrase: string, startTok = 0, occurrence = 1): {first: number; last: number; tok: number} | null => {
  const target = norm(phrase).split(" ").filter(Boolean);
  if (!target.length) return null;
  let seen = 0;
  for (let i = startTok; i <= toks.length - target.length; i++) {
    let ok = true;
    for (let j = 0; j < target.length; j++) {
      if (toks[i + j].t !== target[j]) {
        ok = false;
        break;
      }
    }
    if (ok && ++seen === occurrence) return {first: toks[i].w, last: toks[i + target.length - 1].w, tok: i};
  }
  return null;
};

const similar = (words: Palavra[], phrase: string, offsetS = 0) => {
  const first = norm(phrase).split(" ")[0] ?? "";
  const pref = first.slice(0, Math.min(3, first.length));
  return words
    .filter((w) => norm(w.text).startsWith(pref))
    .slice(0, 6)
    .map((w) => `"${w.text}" @${(w.startMs / 1000 + offsetS).toFixed(2)}s`)
    .join(", ");
};

const FILTROS: Record<string, string> = {
  quente: "sepia(0.16) saturate(1.12) hue-rotate(-5deg) contrast(1.04)",
  frio: "saturate(0.92) hue-rotate(10deg) brightness(1.02) contrast(1.04)",
  pb: "grayscale(1) contrast(1.12)",
  contraste: "contrast(1.14) saturate(1.1)",
  suave: "contrast(0.94) saturate(0.9) brightness(1.04)",
  vintage: "sepia(0.32) contrast(1.06) saturate(0.82) brightness(0.98)",
  noite: "brightness(0.84) saturate(0.78) hue-rotate(12deg) contrast(1.05)",
};
export const filtroCss = (f?: Filtro): string | null => (!f || f === "nenhum" ? null : typeof f === "object" ? f.css : FILTROS[f] ?? null);

const DUR_TRANS: Record<TipoTransicao, number> = {corte: 0, cruzar: 0.35, preto: 0.5, branco: 0.5, flash: 0.25, deslizar: 0.4, limpar: 0.45, zoom: 0.35, desfoque: 0.4, iris: 0.5};
const DUR_TEXTO: Record<Texto["tipo"], number> = {titulo: 2.4, texto: 2.5, rotulo: 3.5, destaque: 1.3};
const DUR_CAMADA: Record<Camada["tipo"], number> = {broll: 2.5, pip: 4, imagem: 2.5, componente: 3};
const DUR_EFEITO: Record<Efeito["tipo"], number> = {flash: 0.35, tremor: 0.4, pb: 2, desfoque: 1};

export const dimensoes = (f: Edicao["formato"] = "9:16") =>
  typeof f === "object" ? {largura: f.largura, altura: f.altura} : ({"9:16": {largura: 1080, altura: 1920}, "16:9": {largura: 1920, altura: 1080}, "1:1": {largura: 1080, altura: 1080}, "4:5": {largura: 1080, altura: 1350}} as const)[f];

// ---------------------------------------------------------------- resolvedor
export const resolver = (ed: Edicao): Plano => {
  const avisos: string[] = [];
  const {largura, altura} = dimensoes(ed.formato);
  const fps = ed.fps ?? 30;
  const F = (s: number) => Math.round(s * fps);
  if (!ed.cortes?.length) throw new Error("a edição precisa de pelo menos um corte em `cortes`");

  // 1) cortes
  const cortes: CortePlano[] = [];
  ed.cortes.forEach((c: Corte, i) => {
    const n = i + 1;
    const ctx = `corte ${n}${c.id ? ` ("${c.id}")` : ""}`;
    const cl = clipe(c.clipe, ["video", "imagem"]);
    const vel = Math.min(4, Math.max(0.25, c.velocidade ?? 1));
    let de = 0, ate = cl.duracao ?? c.duracao ?? 3;
    let texto = "";
    if (cl.tipo === "imagem") {
      ate = c.duracao ?? 3;
    } else {
      const dur = cl.duracao ?? 0;
      const words = cl.transcricao?.palavras ?? [];
      const toks = tokenize(words);
      const [fA, fD] = typeof c.folga === "number" ? [c.folga, c.folga] : c.folga ?? [0.1, 0.16];
      const aposIdx = c.apos !== undefined ? toks.findIndex((t) => words[t.w].startMs / 1000 >= c.apos!) : 0;
      const fromTok = aposIdx < 0 ? toks.length : aposIdx;
      let deTok = fromTok;
      if (typeof c.de === "string") {
        if (!words.length) throw new Error(`${ctx}: o clipe "${cl.id}" não tem transcrição; use segundos em \`de\` ou rode \`npm run midia -- transcrever ${cl.id}\``);
        const m = findPhrase(toks, c.de, fromTok);
        if (!m) throw new Error(`${ctx}: fala de início "${c.de}" não encontrada em "${cl.id}"${c.apos !== undefined ? ` após ${c.apos}s` : ""}. Parecidas: ${similar(words, c.de) || "nenhuma"}. Veja \`npm run cortes -- ${cl.id}\``);
        const prev = words[m.first - 1];
        de = Math.max(words[m.first].startMs / 1000 - fA, prev ? prev.endMs / 1000 + 0.01 : 0);
        de = Math.min(de, words[m.first].startMs / 1000);
        deTok = m.tok;
      } else if (typeof c.de === "number") de = c.de;
      if (typeof c.ate === "string") {
        if (!words.length) throw new Error(`${ctx}: o clipe "${cl.id}" não tem transcrição; use segundos em \`ate\``);
        const m = findPhrase(toks, c.ate, deTok);
        if (!m) throw new Error(`${ctx}: fala de fim "${c.ate}" não encontrada em "${cl.id}" depois do início. Parecidas: ${similar(words, c.ate) || "nenhuma"}. Veja \`npm run cortes -- ${cl.id}\``);
        const next = words[m.last + 1];
        ate = Math.min(words[m.last].endMs / 1000 + fD, next ? next.startMs / 1000 - 0.01 : dur);
        ate = Math.max(ate, words[m.last].endMs / 1000);
      } else if (typeof c.ate === "number") ate = c.ate;
      if (de < 0 || de >= dur) throw new Error(`${ctx}: início ${de.toFixed(2)}s fora do clipe "${cl.id}" (0–${dur.toFixed(2)}s)`);
      if (ate > dur + 0.05) {
        avisos.push(`${ctx}: fim ${ate.toFixed(2)}s passa do fim do clipe (${dur.toFixed(2)}s); ajustado`);
        ate = dur;
      }
      ate = Math.min(ate, dur);
      if (ate <= de) throw new Error(`${ctx}: fim (${ate.toFixed(2)}s) precisa ser depois do início (${de.toFixed(2)}s)`);
      texto = words
        .filter((w) => (w.startMs + w.endMs) / 2000 >= de && (w.startMs + w.endMs) / 2000 <= ate)
        .map((w) => w.text)
        .join(" ");
    }
    const frames = Math.max(1, Math.round(((ate - de) / vel) * fps));
    const livreAntes = cl.tipo === "imagem" ? Infinity : Math.floor((de * fps) / vel);
    const livreDepois = cl.tipo === "imagem" ? Infinity : Math.floor((((cl.duracao ?? ate) - ate) * fps) / vel);
    if (frames < fps * 0.3) avisos.push(`${ctx}: só ${(frames / fps).toFixed(2)}s — curto demais para ser lido`);
    const z = c.zoom === undefined ? {de: 1, para: 1} : typeof c.zoom === "number" ? {de: c.zoom, para: c.zoom} : c.zoom;
    const tr: Transicao = i === 0 ? "corte" : c.transicao ?? ed.transicaoPadrao ?? "corte";
    const trObj = typeof tr === "string" ? {tipo: tr} : tr;
    const tf = trObj.tipo === "corte" ? 0 : F(trObj.duracao ?? DUR_TRANS[trObj.tipo]);
    cortes.push({
      n,
      id: c.id,
      clipe: cl,
      de,
      ate,
      trim: F(de),
      velocidade: vel,
      volume: (c.volume ?? 1) * (cl.ganho ?? 1),
      mudo: !!c.mudo || !cl.temAudio,
      enquadrar: c.enquadrar ?? ed.enquadrar ?? "preencher",
      foco: c.foco ?? {x: 0.5, y: 0.5},
      zoom: z,
      filtro: filtroCss(c.filtro),
      espelhar: !!c.espelhar,
      entrada: tf > 0 ? {tipo: trObj.tipo, frames: tf, direcao: ("direcao" in trObj && trObj.direcao) || "esquerda"} : null,
      saidaFrames: 0,
      conteudo: frames,
      sobraAntes: 0,
      sobraDepois: 0,
      texto,
      inicio: 0,
      frames,
      livreAntes,
      livreDepois,
    } as CortePlano & {livreAntes: number; livreDepois: number});
  });

  // 2) posições na saída. Uma transição de T quadros fica centrada no ponto de corte e usa mídia de sobra
  //    (antes do `de` do corte que entra, depois do `ate` do que sai), como num editor: não come fala.
  for (let i = 1; i < cortes.length; i++) {
    const c = cortes[i] as CortePlano & {livreAntes: number};
    const prev = cortes[i - 1] as CortePlano & {livreDepois: number};
    if (!c.entrada) continue;
    const max = Math.min(prev.conteudo, c.conteudo) - 1;
    if (c.entrada.frames > max) {
      avisos.push(`corte ${c.n}: transição "${c.entrada.tipo}" maior que um dos cortes; reduzida para ${(Math.max(0, max) / fps).toFixed(2)}s`);
      c.entrada.frames = Math.max(0, max);
      if (c.entrada.frames === 0) {
        c.entrada = null;
        continue;
      }
    }
    const T = c.entrada.frames;
    let antes = Math.min(Math.ceil(T / 2), c.livreAntes);
    const depois = Math.min(T - antes, prev.livreDepois);
    antes = Math.min(T - depois, c.livreAntes);
    c.sobraAntes = antes;
    prev.sobraDepois = depois;
    if (T - antes - depois > 2) avisos.push(`corte ${c.n}: sem mídia de sobra para a transição; ela cobre ${((T - antes - depois) / fps).toFixed(2)}s de conteúdo`);
  }
  for (let i = 0; i < cortes.length; i++) {
    const c = cortes[i];
    c.frames = c.sobraAntes + c.conteudo + c.sobraDepois;
    c.trim = Math.max(0, F(c.de) - Math.round(c.sobraAntes * c.velocidade));
    const prev = cortes[i - 1];
    const t = c.entrada?.frames ?? 0;
    if (prev) prev.saidaFrames = t;
    c.inicio = prev ? prev.inicio + prev.frames - t : 0;
  }
  for (const c of cortes) {
    delete (c as Partial<{livreAntes: number; livreDepois: number}>).livreAntes;
    delete (c as Partial<{livreAntes: number; livreDepois: number}>).livreDepois;
  }
  const last = cortes[cortes.length - 1];
  const total = last.inicio + last.frames;

  // 3) palavras no tempo de saída
  const palavras: PalavraPlano[] = [];
  for (const c of cortes) {
    const ws = c.clipe.transcricao?.palavras ?? [];
    const ini = (c.inicio + c.sobraAntes) / fps;
    for (const w of ws) {
      const mid = (w.startMs + w.endMs) / 2000;
      if (mid < c.de || mid > c.ate) continue;
      const s = Math.max(w.startMs / 1000, c.de), e = Math.min(w.endMs / 1000, c.ate);
      palavras.push({text: w.text, startMs: Math.round((ini + (s - c.de) / c.velocidade) * 1000), endMs: Math.round((ini + (e - c.de) / c.velocidade) * 1000), corte: c.n});
    }
  }

  // 4) momentos
  const corteRef = (ref: number | string, ctx: string) => {
    const c = typeof ref === "number" ? cortes[ref - 1] : cortes.find((x) => x.id === ref);
    if (!c) throw new Error(`${ctx}: corte ${JSON.stringify(ref)} não existe (há ${cortes.length}; use o número 1–${cortes.length} ou o id)`);
    return c;
  };
  let toksOut: Tok[] | null = null;
  const t = (m: Momento, ctx: string): number => {
    if (typeof m === "number") return m;
    if ("fala" in m) {
      const pool = m.corte !== undefined ? palavras.filter((w) => w.corte === corteRef(m.corte!, ctx).n) : palavras;
      const toks = m.corte !== undefined ? tokenize(pool) : (toksOut ??= tokenize(palavras));
      const r = findPhrase(toks, m.fala, 0, m.ocorrencia ?? 1);
      if (!r) throw new Error(`${ctx}: fala "${m.fala}" não aparece no vídeo final${m.corte !== undefined ? ` (corte ${m.corte})` : ""}. Parecidas: ${similar(pool, m.fala) || "nenhuma"}. Ela pode ter ficado fora dos cortes.`);
      return (m.fim ? pool[r.last].endMs : pool[r.first].startMs) / 1000 + (m.desloc ?? 0);
    }
    const c = corteRef(m.corte, ctx);
    const ini = (c.inicio + c.sobraAntes) / fps, fim = ini + c.conteudo / fps;
    return (m.fim ? fim - (m.em ?? 0) : ini + (m.em ?? 0)) + (m.desloc ?? 0);
  };
  const janela = (j: {em: Momento; duracao?: number; ate?: Momento}, padrao: number, ctx: string): Faixa => {
    const a = Math.max(0, t(j.em, ctx));
    const b = j.ate !== undefined ? t(j.ate, ctx) : a + (j.duracao ?? padrao);
    let inicio = F(a), fim = F(b);
    if (inicio >= total) throw new Error(`${ctx}: começa em ${a.toFixed(2)}s, depois do fim do vídeo (${(total / fps).toFixed(2)}s)`);
    if (fim > total) fim = total;
    if (fim <= inicio) throw new Error(`${ctx}: fim antes do início`);
    return {inicio, frames: fim - inicio};
  };

  const textos = (ed.textos ?? []).map((x, i) => ({...x, ...janela(x, DUR_TEXTO[x.tipo], `textos[${i}] (${x.tipo})`)}));
  const camadas = (ed.camadas ?? []).map((x, i) => {
    const ctx = `camadas[${i}] (${x.tipo})`;
    const fx = janela(x, DUR_CAMADA[x.tipo], ctx);
    let clipeInfo: Clipe | undefined;
    if (x.tipo === "broll" || x.tipo === "pip") {
      clipeInfo = clipe(x.clipe, "video");
      const de = x.de ?? 0;
      const need = de + (fx.frames / fps) * (x.velocidade ?? 1);
      if (need > (clipeInfo.duracao ?? 0) + 0.05) avisos.push(`${ctx}: "${x.clipe}" tem ${clipeInfo.duracao}s; a partir de ${de}s não cobre ${(fx.frames / fps).toFixed(2)}s (o último quadro fica parado)`);
    }
    if (x.tipo === "imagem") {
      if (!x.logo && !x.clipe) throw new Error(`${ctx}: informe \`clipe\` (id de uma imagem do registro) ou \`logo: true\``);
      if (x.clipe) clipeInfo = clipe(x.clipe, ["imagem", "video"]);
      if (x.logo && !estilo.brand.logo) throw new Error(`${ctx}: o estilo não tem logo (brand.logo no design system)`);
    }
    return {...x, ...fx, indice: i, clipeInfo};
  });
  const zooms = (ed.zooms ?? []).map((x, i) => ({...x, ...janela(x, 1.2, `zooms[${i}]`)}));
  const efeitos = (ed.efeitos ?? []).map((x, i) => ({...x, ...janela(x, DUR_EFEITO[x.tipo], `efeitos[${i}] (${x.tipo})`)}));

  // 5) sons
  const sons: Plano["sons"] = [];
  const addSom = (s: Som, ctx: string, auto = false) => {
    let src: {sfx?: string; clipe?: Clipe};
    let dur: number;
    if (s.sfx) {
      const info = sounds[s.sfx];
      if (!info) throw new Error(`${ctx}: efeito "${s.sfx}" não existe. Disponíveis: ${sfxNames.join(", ")}`);
      src = {sfx: s.sfx};
      dur = info.duration;
    } else if (s.clipe) {
      const cl = clipe(s.clipe, ["audio", "video"]);
      src = {clipe: cl};
      dur = cl.duracao ?? 1;
    } else throw new Error(`${ctx}: informe \`sfx\` ou \`clipe\``);
    const vel = s.velocidade ?? 1;
    const inicio = Math.max(0, F(t(s.em, ctx)));
    if (inicio >= total) return avisos.push(`${ctx}: depois do fim do vídeo; ignorado`);
    sons.push({inicio, frames: Math.min(total - inicio, Math.ceil((dur / vel) * fps) + 2), src, volume: s.volume ?? 1, velocidade: vel, auto});
  };
  (ed.sons ?? []).forEach((s, i) => addSom(s, `sons[${i}]`));
  const somPadrao = ed.somTransicao === false ? null : ed.somTransicao ?? estilo.sound.transitionSfx ?? null;
  for (const c of cortes) {
    if (!c.entrada) continue;
    const tr = ed.cortes[c.n - 1].transicao ?? ed.transicaoPadrao;
    const nome = typeof tr === "object" && tr.som !== undefined ? tr.som : somPadrao;
    if (!nome) continue;
    if (!sounds[nome]) {
      avisos.push(`som de transição "${nome}" não existe na biblioteca`);
      continue;
    }
    addSom({sfx: nome, em: Math.max(0, (c.inicio - 3) / fps), volume: 0.7}, `transição do corte ${c.n}`, true);
  }

  // 6) trilha e áudios extras
  let trilha: Plano["trilha"] = null;
  if (ed.trilha) {
    const tr = ed.trilha;
    const cl = clipe(tr.clipe, ["audio", "video"]);
    const fx = janela({em: tr.em ?? 0, ate: tr.ate ?? total / fps}, 0, "trilha");
    trilha = {...fx, clipe: cl, volume: tr.volume ?? estilo.sound.musicGain, ducking: tr.ducking ?? true, de: tr.de ?? 0, fadeIn: tr.fadeIn ?? 0.6, fadeOut: tr.fadeOut ?? 1.5, loop: tr.loop ?? true};
    if (!trilha.loop && (cl.duracao ?? 0) - trilha.de < fx.frames / fps) avisos.push(`trilha "${cl.id}" acaba antes do vídeo (use loop: true ou uma trilha mais longa)`);
  }
  const audios = (ed.audios ?? []).map((a: AudioExtra, i) => {
    const cl = clipe(a.clipe, ["audio", "video"]);
    const de = a.de ?? 0;
    const ate = Math.min(a.ate ?? cl.duracao ?? 0, cl.duracao ?? 0);
    const inicio = F(t(a.em, `audios[${i}]`));
    const frames = Math.min(total - inicio, F(ate - de));
    if (frames <= 0) throw new Error(`audios[${i}]: fora do vídeo`);
    if (a.legendar !== false) {
      for (const w of cl.transcricao?.palavras ?? []) {
        const s = w.startMs / 1000;
        if (s < de || s > ate) continue;
        palavras.push({text: w.text, startMs: Math.round((inicio / fps + s - de) * 1000), endMs: Math.round((inicio / fps + Math.min(w.endMs / 1000, ate) - de) * 1000), corte: 0});
      }
    }
    return {inicio, frames, clipe: cl, de, volume: (a.volume ?? 1) * (cl.ganho ?? 1)};
  });
  palavras.sort((a, b) => a.startMs - b.startMs);

  // 7) legendas
  const cap = estilo.captions;
  let legendas: Plano["legendas"] = null;
  if (ed.legendas !== false && cap.enabled) {
    const L = ed.legendas || {};
    const mapa: Record<string, "pop" | "karaoke" | "caixa" | "simples"> = {pop: "pop", karaoke: "karaoke", box: "caixa", caixa: "caixa", minimal: "simples", simples: "simples"};
    const est = L.estilo ?? mapa[cap.style] ?? "pop";
    const posMap: Record<string, "baixo" | "centro" | "topo"> = {bottom: "baixo", center: "centro", top: "topo"};
    legendas = {
      estilo: est,
      posicao: L.posicao ?? posMap[cap.position] ?? "baixo",
      maxPalavras: L.maxPalavras ?? (est === "pop" ? cap.maxWords ?? 3 : 7),
      tamanho: L.tamanho ?? cap.size,
      maiusculas: L.maiusculas ?? cap.textTransform === "uppercase",
      destaque: (L.destaque ?? []).map(norm),
      ocultar: (L.ocultar ?? []).map((o, i) => {
        const a = F(t(o.de, `legendas.ocultar[${i}]`)), b = F(t(o.ate, `legendas.ocultar[${i}]`));
        return {inicio: a, frames: Math.max(1, b - a)};
      }),
    };
    if (!palavras.length) {
      if (ed.legendas) avisos.push("legendas pedidas, mas nenhum clipe usado tem transcrição");
      legendas = null;
    }
  }

  const fadeFinal = ed.fadeFinal ?? 0;
  return {
    largura,
    altura,
    fps,
    frames: total,
    fundo: ed.fundo ?? "background",
    cortes,
    palavras,
    textos,
    camadas,
    zooms,
    efeitos,
    sons,
    trilha,
    audios,
    legendas,
    vinheta: ed.vinheta ?? 0,
    fadeFinal: F(fadeFinal),
    capa: ed.capa ?? null,
    avisos,
  };
};

/** Resumo serializável para o `npm run check` e o render (tabela de cortes, palavras para .srt, avisos). */
export const resumo = (p: Plano) => ({
  largura: p.largura,
  altura: p.altura,
  fps: p.fps,
  frames: p.frames,
  duracao: +(p.frames / p.fps).toFixed(2),
  cortes: p.cortes.map((c) => ({
    n: c.n,
    id: c.id ?? null,
    clipe: c.clipe.id,
    de: +c.de.toFixed(2),
    ate: +c.ate.toFixed(2),
    inicio: +((c.inicio + c.sobraAntes) / p.fps).toFixed(2),
    fim: +((c.inicio + c.sobraAntes + c.conteudo) / p.fps).toFixed(2),
    velocidade: c.velocidade,
    transicao: c.entrada ? `${c.entrada.tipo} ${(c.entrada.frames / p.fps).toFixed(2)}s` : "",
    enquadrar: c.enquadrar,
    texto: c.texto,
  })),
  contagem: {textos: p.textos.length, camadas: p.camadas.length, sons: p.sons.length, zooms: p.zooms.length, efeitos: p.efeitos.length, trilha: p.trilha ? p.trilha.clipe.id : null, audios: p.audios.length},
  legendas: p.legendas ? `${p.legendas.estilo} · ${p.palavras.length} palavras` : "desligadas",
  palavras: p.palavras.map((w) => ({text: w.text, startMs: w.startMs, endMs: w.endMs})),
  capa: p.capa,
  avisos: p.avisos,
});
export type Resumo = ReturnType<typeof resumo>;
