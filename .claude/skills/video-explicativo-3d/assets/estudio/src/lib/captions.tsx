import React, {useMemo} from "react";
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {alpha, c, ds, radius, type} from "../ds";
import {useSafe} from "./layout";
import type {Timeline, TimelineWord} from "./timeline";

// Legendas palavra a palavra, sincronizadas com a narração. A maioria assiste vertical sem som:
// a legenda é parte do design, não um acessório. Estilo vem de tokens.captions.

type Page = {words: TimelineWord[]; start: number; end: number};

const paginate = (words: TimelineWord[], maxWords: number, maxChars: number): Page[] => {
  const pages: Page[] = [];
  let cur: TimelineWord[] = [];
  const flush = () => {
    if (cur.length) pages.push({words: cur, start: cur[0].startMs / 1000, end: cur[cur.length - 1].endMs / 1000});
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const gap = prev ? (w.startMs - prev.endMs) / 1000 : 0;
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    if (cur.length >= maxWords || gap > 0.45 || (cur.length > 0 && chars > maxChars)) flush();
    cur.push(w);
    if (/[.!?;:]$/.test(w.text)) flush();
  });
  flush();
  // cada página fica até a próxima começar (máx. +0.6s de folga)
  return pages.map((p, i) => ({...p, end: Math.min(pages[i + 1]?.start ?? p.end + 0.6, p.end + 0.6)}));
};

export const Captions: React.FC<{
  tl: Timeline;
  /** intervalos (s, tempo absoluto) em que a legenda some — ex.: quando o mesmo texto já está grande na tela */
  hide?: [number, number][];
  position?: "bottom" | "center" | "top";
}> = ({tl, hide = [], position}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const cfg = ds.captions;
  // ~2 linhas de texto na largura útil
  const maxChars = Math.floor((s.innerWidth / (cfg.size * 0.58)) * 1.6);
  const pages = useMemo(() => paginate(tl.words, cfg.maxWords, maxChars), [tl, cfg.maxWords, maxChars]);
  if (!cfg.enabled) return null;
  const t = frame / fps;
  const page = pages.find((p) => t >= p.start - 0.05 && t < p.end);
  if (!page) return null;
  const hidden = hide.some(([a, b]) => t >= a && t < b);
  if (hidden) return null;

  const pos = position ?? cfg.position;
  const enter = spring({frame: frame - Math.round(page.start * fps), fps, config: ds.motion.spring.pop});
  const base = type(cfg.font, cfg.size, {
    textTransform: cfg.textTransform && cfg.textTransform !== "none" ? cfg.textTransform : undefined,
    lineHeight: 1.12,
  });
  const strokePx = cfg.stroke ?? 0;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        justifyContent: pos === "top" ? "flex-start" : pos === "center" ? "center" : "flex-end",
        alignItems: "center",
        paddingTop: s.top + 40,
        paddingBottom: s.bottom + 30,
        paddingLeft: s.left,
        paddingRight: s.right,
      }}
    >
      <div
        style={{
          ...base,
          textAlign: "center",
          maxWidth: s.innerWidth,
          transform: `scale(${interpolate(enter, [0, 1], [0.92, 1])}) translateY(${(1 - Math.min(1, enter)) * 16}px)`,
          opacity: Math.min(1, enter * 2),
          padding: cfg.box ? "18px 30px" : 0,
          background: cfg.box ? c(cfg.box) : "transparent",
          borderRadius: radius("md"),
        }}
      >
        {page.words.map((w, i) => {
          const ws = w.startMs / 1000;
          const we = w.endMs / 1000;
          const active = t >= ws && t < Math.max(we, ws + 0.12);
          const spoken = t >= ws;
          const pop = spring({frame: frame - Math.round(ws * fps), fps, config: ds.motion.spring.pop});
          const visible = cfg.style === "pop" ? spoken : true;
          // karaoke: já dito = texto, ainda por dizer = apagado, palavra atual = destaque
          const color =
            cfg.style === "minimal"
              ? c("text")
              : active
                ? c(cfg.highlight)
                : cfg.style === "karaoke" && !spoken
                  ? alpha("text", 0.55)
                  : c("text");
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                position: "relative",
                margin: "0 0.14em",
                color: cfg.style === "box" && active ? c(ds.color.textOnPrimary ?? "background") : color,
                opacity: visible ? 1 : 0,
                transform: `scale(${cfg.style === "pop" ? interpolate(Math.min(pop, 1.2), [0, 1], [0.6, 1]) : active ? 1.06 : 1})`,
                WebkitTextStroke: strokePx > 0 ? `${strokePx}px ${alpha("background", 0.95)}` : undefined,
                paintOrder: "stroke fill",
                textShadow: `0 6px 24px ${alpha("background", 0.6)}`,
              }}
            >
              {cfg.style === "box" && active && (
                <span style={{position: "absolute", inset: "-0.04em -0.16em", background: c(cfg.highlight), borderRadius: radius("sm"), zIndex: -1}} />
              )}
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
