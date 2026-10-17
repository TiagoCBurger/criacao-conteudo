// Barra do preço fatiada (2D, vertical): o 9:16 é alto, então a barra fica de pé e cada fatia ganha o rótulo
// colado ao lado (contiguidade espacial). Tudo em px do quadro 1080×1920; estado vem da cena (frame → valores).
import React from "react";
import {alpha, c, mix, type} from "../lib";

export type Seg = {
  value: number;
  color: string;
  /** 0–1 */
  opacity?: number;
  /** contorno tracejado (pedaço "que falta") em vez de preenchimento */
  ghost?: boolean;
  /** 0–1: brilho de destaque */
  glow?: number;
};

/** Barra empilhada de baixo para cima. `grow` revela a barra a partir da base (0–1). */
export const StackBar: React.FC<{
  x: number;
  width: number;
  bottom: number;
  k: number;
  segs: Seg[];
  grow?: number;
  gap?: number;
  opacity?: number;
}> = ({x, width, bottom, k, segs, grow = 1, gap = 6, opacity = 1}) => {
  const total = segs.reduce((n, s) => n + s.value, 0);
  const visible = total * Math.max(0, Math.min(1, grow));
  let acc = 0;
  return (
    <div style={{position: "absolute", left: 0, top: 0, width: "100%", height: "100%", opacity}}>
      {segs.map((s, i) => {
        const from = acc;
        acc += s.value;
        const shown = Math.max(0, Math.min(s.value, visible - from));
        if (shown <= 0) return null;
        const h = shown * k - (i > 0 ? gap : 0);
        const y = bottom - from * k - shown * k;
        const col = c(s.color);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width,
              height: Math.max(1, h),
              opacity: s.opacity ?? 1,
              background: s.ghost ? "transparent" : `linear-gradient(to bottom, ${mix(col, "text", 0.18)} 0, ${col} 10px, ${col} 100%)`,
              border: s.ghost ? `5px dashed ${col}` : undefined,
              boxSizing: "border-box",
              boxShadow: s.glow ? `0 0 ${60 * s.glow}px ${alpha(s.color, 0.55 * s.glow)}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};

/** Centro vertical (px) da fatia i de uma barra (para colar o rótulo). */
export const segCenter = (segs: {value: number}[], i: number, bottom: number, k: number) => {
  const from = segs.slice(0, i).reduce((n, s) => n + s.value, 0);
  return bottom - (from + segs[i].value / 2) * k;
};

/** Rótulo colado a uma fatia: nome (apoio) + valor (display). */
export const SegLabel: React.FC<{
  x: number;
  y: number;
  name: string;
  value: string;
  color?: string;
  size?: "h3" | "h2" | "h1";
  opacity?: number;
  /** 0–1: entrada (desliza da barra para fora) */
  p?: number;
  inline?: boolean;
}> = ({x, y, name, value, color = "text", size = "h3", opacity = 1, p = 1, inline = false}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(${(1 - p) * -30}px, -50%)`,
      opacity: opacity * p,
      display: "flex",
      flexDirection: inline ? "row" : "column",
      alignItems: inline ? "baseline" : "flex-start",
      gap: inline ? 18 : 0,
      whiteSpace: "nowrap",
    }}
  >
    <div style={type("body", "body", {color: c("textMuted"), lineHeight: 1.1})}>{name}</div>
    <div style={type("display", size, {color: c(color), lineHeight: 1})}>{value}</div>
  </div>
);
