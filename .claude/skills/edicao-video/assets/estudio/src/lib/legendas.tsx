import React, {useMemo} from "react";
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {alpha, areaSegura, cor, escalaTipo, estilo, raio, tipo} from "./estilo";
import type {Plano, PalavraPlano} from "./resolver";

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

type Pagina = {ws: PalavraPlano[]; ini: number; fim: number};

/** Agrupa as palavras em "páginas" de legenda: quebra em pontuação, pausa ou no máximo de palavras. */
export const paginar = (ws: PalavraPlano[], max: number): Pagina[] => {
  const pages: Pagina[] = [];
  let cur: PalavraPlano[] = [];
  ws.forEach((w, i) => {
    cur.push(w);
    const next = ws[i + 1];
    const pausa = next ? next.startMs - w.endMs : Infinity;
    if (!next || cur.length >= max || /[.!?…,;:]$/.test(w.text) || pausa > 320) {
      pages.push({ws: cur, ini: cur[0].startMs, fim: cur[cur.length - 1].endMs});
      cur = [];
    }
  });
  for (let i = 0; i < pages.length; i++) {
    const next = pages[i + 1];
    pages[i].fim = Math.min(pages[i].fim + 450, next ? next.ini : Infinity);
  }
  return pages;
};

export const Legendas: React.FC<{plano: Plano}> = ({plano}) => {
  const L = plano.legendas!;
  const f = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const pages = useMemo(() => paginar(plano.palavras, L.maxPalavras), [plano.palavras, L.maxPalavras]);
  const ms = (f / fps) * 1000;
  if (L.ocultar.some((o) => f >= o.inicio && f < o.inicio + o.frames)) return null;
  const page = pages.find((p) => ms >= p.ini && ms < p.fim);
  if (!page) return null;

  const k = escalaTipo(W, H);
  const s = areaSegura(W, H);
  const size = L.tamanho * k;
  const stroke = (estilo.captions.stroke ?? 0) * k;
  const pageFrame = f - Math.round((page.ini / 1000) * fps);
  const entra = spring({frame: pageFrame, fps, config: estilo.motion.spring.pop, durationInFrames: 8});
  const destaque = new Set(L.destaque);
  const hl = cor(estilo.captions.highlight || "accent");
  const ativa = page.ws.findIndex((w, i) => ms >= w.startMs && (i === page.ws.length - 1 || ms < page.ws[i + 1].startMs));

  const pos: React.CSSProperties =
    L.posicao === "topo" ? {top: s.top} : L.posicao === "centro" ? {top: H * 0.6 - size} : {bottom: s.bottom};
  const textStyle: React.CSSProperties = {
    ...tipo(estilo.captions.font, size),
    lineHeight: 1.12,
    textTransform: L.maiusculas ? "uppercase" : "none",
    color: cor("text"),
    textShadow: L.estilo === "caixa" ? undefined : `0 ${3 * k}px ${14 * k}px rgba(0,0,0,0.6)`,
    WebkitTextStroke: stroke && L.estilo !== "caixa" ? `${stroke}px rgba(0,0,0,0.9)` : undefined,
    paintOrder: "stroke fill",
  };

  return (
    <AbsoluteFill style={{pointerEvents: "none"}}>
      <div style={{position: "absolute", left: s.left, right: s.right, display: "flex", justifyContent: "center", ...pos}}>
        <div
          style={{
            ...textStyle,
            textAlign: "center",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: "0.32em",
            transform: L.estilo === "pop" ? `scale(${0.88 + 0.12 * entra})` : undefined,
            opacity: L.estilo === "pop" ? Math.min(1, entra * 3) : 1,
            ...(L.estilo === "caixa" ? {background: alpha(estilo.captions.box ?? "background", 0.82), padding: `${0.18 * size}px ${0.38 * size}px`, borderRadius: raio("sm") * k} : {}),
            maxWidth: "100%",
          }}
        >
          {page.ws.map((w, i) => {
            const on = i === ativa && L.estilo !== "simples";
            const forte = destaque.has(norm(w.text));
            const wf = f - Math.round((w.startMs / 1000) * fps);
            const pop = L.estilo === "pop" && on ? 1 + 0.045 * spring({frame: wf, fps, config: estilo.motion.spring.pop, durationInFrames: 6}) - 0.045 * spring({frame: wf - 6, fps, durationInFrames: 8}) : 1;
            return (
              <span key={i} style={{display: "inline-block", color: on || forte ? hl : undefined, transform: `scale(${pop})`, opacity: L.estilo === "karaoke" && ms < w.startMs ? 0.72 : 1}}>
                {w.text}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
