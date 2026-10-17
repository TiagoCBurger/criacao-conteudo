import type {Caption} from "@remotion/captions";
import React, {createContext, useContext} from "react";

// A narração manda no tempo. Cenas, entradas e efeitos são ancorados em palavras faladas
// (timeline.json gerado por scripts/timeline.mjs), nunca em segundos "chutados".

export type TimelineWord = {text: string; startMs: number; endMs: number};
export type TimelineSection = {id: string; title?: string; startMs: number; endMs: number};
export type TimelineJson = {
  version: number;
  audio: string;
  durationMs: number;
  language?: string;
  source?: string;
  words: TimelineWord[];
  sections?: TimelineSection[];
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%$€£,.]+/gu, " ")
    .replace(/(?<!\d)[,.]|[,.](?!\d)/g, " ")
    .trim();

export type CueOpts = {
  /** só procura depois deste instante (segundos) */
  after?: number;
  /** 1 = primeira ocorrência (padrão), 2 = segunda... */
  occurrence?: number;
  /** "start" = quando a frase começa a ser dita (padrão); "end" = quando termina */
  edge?: "start" | "end";
};

export type Timeline = ReturnType<typeof timeline>;

export const timeline = (json: TimelineJson) => {
  const words = json.words;
  const normWords = words.map((w) => norm(w.text));
  const duration = json.durationMs / 1000;

  const find = (phrase: string, opts: CueOpts = {}) => {
    const target = norm(phrase).split(" ").filter(Boolean);
    if (target.length === 0) throw new Error(`cue vazio`);
    let seen = 0;
    const occurrence = opts.occurrence ?? 1;
    for (let i = 0; i < normWords.length; i++) {
      if (opts.after !== undefined && words[i].startMs / 1000 < opts.after) continue;
      let ok = true;
      for (let j = 0; j < target.length; j++) {
        if (normWords[i + j] !== target[j]) {
          ok = false;
          break;
        }
      }
      if (ok && ++seen === occurrence) return {first: i, last: i + target.length - 1};
    }
    const hint = words
      .map((w, i) => ({w, i}))
      .filter(({i}) => normWords[i].startsWith(target[0].slice(0, 3)))
      .slice(0, 6)
      .map(({w}) => `"${w.text}" @${(w.startMs / 1000).toFixed(2)}s`)
      .join(", ");
    throw new Error(
      `cue não encontrado na narração: "${phrase}"${opts.after ? ` (após ${opts.after}s)` : ""}. ` +
        `Use as palavras exatamente como estão em timeline.json. Parecidas: ${hint || "nenhuma"}`,
    );
  };

  return {
    json,
    words,
    /** duração da narração em segundos */
    duration,
    /** instante (s) em que a frase é dita */
    at: (phrase: string, opts: CueOpts = {}) => {
      const {first, last} = find(phrase, opts);
      return opts.edge === "end" ? words[last].endMs / 1000 : words[first].startMs / 1000;
    },
    /** fim (s) da frase */
    end: (phrase: string, opts: CueOpts = {}) => words[find(phrase, opts).last].endMs / 1000,
    /** palavras (com tempos) entre dois instantes */
    between: (from: number, to: number) =>
      words.filter((w) => w.startMs / 1000 >= from && w.startMs / 1000 < to),
    /** início (s) de uma seção marcada no roteiro */
    section: (id: string) => {
      const s = json.sections?.find((x) => x.id === id);
      if (!s) throw new Error(`seção "${id}" não existe em timeline.json`);
      return {start: s.startMs / 1000, end: s.endMs / 1000};
    },
    /** legendas no formato @remotion/captions */
    captions: (): Caption[] =>
      words.map((w, i) => ({
        text: (i === 0 ? "" : " ") + w.text,
        startMs: w.startMs,
        endMs: w.endMs,
        timestampMs: (w.startMs + w.endMs) / 2,
        confidence: 1,
      })),
  };
};

export type Beat = {id: string; start: number; end: number; index: number};

/**
 * Transforma uma lista de cenas ancoradas em frases faladas em intervalos contínuos (segundos).
 * Cada cena vai do seu cue até o cue da próxima; a última vai até o fim da narração + `tail`.
 * `lead` adianta a entrada visual alguns décimos antes da fala (o olho precisa chegar antes do ouvido).
 */
export const beats = (
  tl: Timeline,
  list: {id: string; cue: string | number; opts?: CueOpts}[],
  {tail = 1.2, lead = 0.12}: {tail?: number; lead?: number} = {},
): Beat[] => {
  const starts = list.map((b, i) => {
    if (i === 0) return 0;
    const t = typeof b.cue === "number" ? b.cue : tl.at(b.cue, b.opts);
    return Math.max(0, t - lead);
  });
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] <= starts[i - 1]) {
      throw new Error(`cenas fora de ordem: "${list[i].id}" (${starts[i].toFixed(2)}s) começa antes de "${list[i - 1].id}"`);
    }
  }
  return list.map((b, i) => ({
    id: b.id,
    index: i,
    start: starts[i],
    end: i < list.length - 1 ? starts[i + 1] : tl.duration + tail,
  }));
};

type Ctx = {tl: Timeline; beat: Beat | null};
const TimelineCtx = createContext<Ctx | null>(null);

export const TimelineProvider: React.FC<{tl: Timeline; beat?: Beat | null; children: React.ReactNode}> = ({
  tl,
  beat = null,
  children,
}) => <TimelineCtx.Provider value={{tl, beat}}>{children}</TimelineCtx.Provider>;

export const useTimeline = () => {
  const ctx = useContext(TimelineCtx);
  if (!ctx) throw new Error("useTimeline precisa estar dentro de <TimelineProvider> (o <Explainer> já fornece)");
  return ctx;
};

/**
 * Atraso local (segundos, relativo ao início da cena atual) até a frase ser dita.
 * Use direto como `delay` dos componentes: <KineticText delay={useCue("vinte por cento")} />
 */
export const useCue = (phrase: string, opts: CueOpts = {}) => {
  const {tl, beat} = useTimeline();
  return tl.at(phrase, {after: beat?.start, ...opts}) - (beat?.start ?? 0);
};

/** Duração (s) da cena atual. */
export const useBeat = () => {
  const {beat, tl} = useTimeline();
  const b = beat ?? {id: "full", index: 0, start: 0, end: tl.duration};
  return {...b, duration: b.end - b.start};
};
