import {evolvePath, getLength, getPointAtLength} from "@remotion/paths";
import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {alpha, c, dataColor, ds, mix, radius, type} from "../../ds";
import {useSafe} from "../layout";
import {ease, lerp, useEnter, useExit} from "../motion";

// Gráficos didáticos: poucos dados, um destaque, rótulo direto (sem legenda separada),
// valor que conta junto com a barra. Em 9:16, barras horizontais leem melhor que colunas.

export type Datum = {label: string; value: number; color?: string; highlight?: boolean};

const fmt = (v: number, decimals = 0, prefix = "", suffix = "") =>
  prefix + new Intl.NumberFormat("pt-BR", {minimumFractionDigits: decimals, maximumFractionDigits: decimals}).format(v) + suffix;

const useGrow = (delay: number, i: number, step: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - Math.round((delay + i * step) * fps), fps, config: ds.motion.spring.soft});
};

const colorFor = (d: Datum, i: number, anyHighlight: boolean) =>
  d.color ? c(d.color) : anyHighlight ? (d.highlight ? c("accent") : alpha("textMuted", 0.55)) : dataColor(i);

// ---------------------------------------------------------------------------------------------
export const BarChart: React.FC<{
  data: Datum[];
  delay?: number;
  stagger?: number;
  max?: number;
  width?: number;
  barHeight?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  exitAt?: number;
}> = ({data, delay = 0, stagger = 0.12, max, width, barHeight = 64, decimals = 0, prefix = "", suffix = "", exitAt}) => {
  const s = useSafe();
  const W = width ?? s.innerWidth;
  const m = max ?? Math.max(...data.map((d) => d.value));
  const anyH = data.some((d) => d.highlight);
  const e = useExit(exitAt);
  return (
    <div style={{width: W, display: "flex", flexDirection: "column", gap: barHeight * 0.55, opacity: 1 - e}}>
      {data.map((d, i) => (
        <BarRow key={i} d={d} i={i} W={W} m={m} anyH={anyH} delay={delay} stagger={stagger} h={barHeight} decimals={decimals} prefix={prefix} suffix={suffix} />
      ))}
    </div>
  );
};

const BarRow: React.FC<{d: Datum; i: number; W: number; m: number; anyH: boolean; delay: number; stagger: number; h: number; decimals: number; prefix: string; suffix: string}> = ({
  d,
  i,
  W,
  m,
  anyH,
  delay,
  stagger,
  h,
  decimals,
  prefix,
  suffix,
}) => {
  const g = useGrow(delay, i, stagger);
  const appear = useEnter(delay + i * stagger);
  const col = colorFor(d, i, anyH);
  return (
    <div style={{opacity: appear, transform: `translateY(${(1 - appear) * 30}px)`}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12}}>
        <span style={type("body", "body", {color: c(d.highlight || !anyH ? "text" : "textMuted"), fontWeight: 600})}>{d.label}</span>
        <span style={type("display", "h3", {color: d.highlight || !anyH ? c("text") : c("textMuted"), fontVariantNumeric: "tabular-nums"})}>
          {fmt(d.value * g, decimals, prefix, suffix)}
        </span>
      </div>
      <div style={{width: W, height: h, background: alpha("text", 0.08), borderRadius: radius("sm"), overflow: "hidden"}}>
        <div
          style={{
            width: `${(d.value / m) * 100 * g}%`,
            height: "100%",
            background: col,
            borderRadius: radius("sm"),
            boxShadow: d.highlight ? `0 0 40px ${alpha(col, 0.55)}` : undefined,
          }}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
export const ColumnChart: React.FC<{
  data: Datum[];
  delay?: number;
  stagger?: number;
  height?: number;
  width?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** tamanho do valor no topo (padrão: h1 com até 3 colunas, h3 com mais) */
  valueSize?: "hero" | "h1" | "h2" | "h3";
  exitAt?: number;
}> = ({data, delay = 0, stagger = 0.12, height = 720, width, decimals = 0, prefix = "", suffix = "", valueSize, exitAt}) => {
  const s = useSafe();
  const W = width ?? s.innerWidth;
  const m = Math.max(...data.map((d) => d.value));
  const anyH = data.some((d) => d.highlight);
  const gap = data.length <= 3 ? 64 : 28;
  const bw = Math.min(300, (W - gap * (data.length - 1)) / data.length);
  const vs = valueSize ?? (data.length <= 3 ? "h1" : "h3");
  const e = useExit(exitAt);
  return (
    <div style={{width: W, height: height + 220, display: "flex", alignItems: "flex-end", justifyContent: "center", gap, opacity: 1 - e}}>
      {data.map((d, i) => (
        <Column key={i} d={d} i={i} bw={bw} H={height} m={m} anyH={anyH} delay={delay} stagger={stagger} decimals={decimals} prefix={prefix} suffix={suffix} vs={vs} />
      ))}
    </div>
  );
};

const Column: React.FC<{d: Datum; i: number; bw: number; H: number; m: number; anyH: boolean; delay: number; stagger: number; decimals: number; prefix: string; suffix: string; vs: "hero" | "h1" | "h2" | "h3"}> = ({
  d,
  i,
  bw,
  H,
  m,
  anyH,
  delay,
  stagger,
  decimals,
  prefix,
  suffix,
  vs,
}) => {
  const g = useGrow(delay, i, stagger);
  const col = colorFor(d, i, anyH);
  return (
    <div style={{width: bw, display: "flex", flexDirection: "column", alignItems: "center", gap: 14}}>
      <span style={type("display", vs, {color: d.highlight ? c("accent") : c(!anyH ? "text" : "textMuted"), opacity: Math.min(1, g * 2), fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap"})}>
        {fmt(d.value * g, decimals, prefix, suffix)}
      </span>
      <div style={{width: bw, height: Math.max(6, (d.value / m) * H * g), background: col, borderRadius: `${radius("md")}px ${radius("md")}px 0 0`, boxShadow: d.highlight ? `0 0 60px ${alpha(col, 0.45)}` : undefined}} />
      <span style={type("body", "body", {color: c(d.highlight || !anyH ? "text" : "textMuted"), textAlign: "center", opacity: Math.min(1, g * 2), lineHeight: 1.15})}>{d.label}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
export const LineChart: React.FC<{
  data: {label: string; value: number}[];
  delay?: number;
  duration?: number;
  width?: number;
  height?: number;
  color?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** índices que ganham marcador com valor */
  marks?: number[];
  exitAt?: number;
}> = ({data, delay = 0, duration = 1.8, width, height = 640, color = "primary", decimals = 0, prefix = "", suffix = "", marks, exitAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const W = width ?? s.innerWidth;
  const pad = 24;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals);
  const x = (i: number) => pad + (i / (data.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2);
  const pts = data.map((d, i) => [x(i), y(d.value)] as const);
  // curva suave (Catmull-Rom → Bézier)
  let path = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    path += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  const t = interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
  const len = getLength(path);
  const head = getPointAtLength(path, Math.max(0.01, len * t)) ?? {x: pts[0][0], y: pts[0][1]};
  const evo = evolvePath(t, path);
  const area = `${path} L ${pts[pts.length - 1][0]} ${height} L ${pts[0][0]} ${height} Z`;
  const gridIn = useEnter(delay - 0.3);
  const e = useExit(exitAt);
  const col = c(color);
  const showMarks = marks ?? [data.length - 1];
  return (
    <div style={{position: "relative", width: W, height: height + 70, opacity: 1 - e}}>
      <svg width={W} height={height} style={{overflow: "visible"}}>
        <defs>
          <linearGradient id="lc-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity={0.35} />
            <stop offset="100%" stopColor={col} stopOpacity={0} />
          </linearGradient>
          <clipPath id="lc-clip">
            <rect x={0} y={-50} width={head.x} height={height + 100} />
          </clipPath>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={0} x2={W * gridIn} y1={pad + g * (height - pad * 2)} y2={pad + g * (height - pad * 2)} stroke={alpha("text", 0.08)} strokeWidth={2} />
        ))}
        <path d={area} fill="url(#lc-area)" clipPath="url(#lc-clip)" />
        <path d={path} fill="none" stroke={col} strokeWidth={ds.shape.strokeWidth * 2} strokeLinecap="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />
        {t > 0 && t < 1 && <circle cx={head.x} cy={head.y} r={14} fill={col} />}
        {showMarks.map((i) => {
          const at = i / (data.length - 1);
          const p = interpolate(t, [Math.max(0, at - 0.02), Math.min(1, at + 0.05)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
          return (
            <g key={i} opacity={p} transform={`translate(${pts[i][0]} ${pts[i][1]}) scale(${lerp(0.4, 1, p)})`}>
              <circle r={22} fill={c("background")} stroke={col} strokeWidth={8} />
            </g>
          );
        })}
      </svg>
      {showMarks.map((i) => {
        const at = i / (data.length - 1);
        const p = interpolate(t, [Math.max(0, at - 0.02), Math.min(1, at + 0.08)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
        const left = Math.min(W - 120, Math.max(120, pts[i][0]));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top: pts[i][1] - 120,
              transform: `translate(-50%, ${(1 - p) * 20}px)`,
              opacity: p,
              ...type("display", "h3", {color: c("text"), whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums"}),
            }}
          >
            {fmt(data[i].value, decimals, prefix, suffix)}
          </div>
        );
      })}
      <div style={{position: "absolute", top: height + 18, left: 0, right: 0, display: "flex", justifyContent: "space-between", opacity: gridIn}}>
        <span style={type("body", "small", {color: c("textMuted")})}>{data[0].label}</span>
        <span style={type("body", "small", {color: c("textMuted")})}>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
export const Donut: React.FC<{
  value: number;
  total?: number;
  delay?: number;
  duration?: number;
  size?: number;
  thickness?: number;
  color?: string;
  suffix?: string;
  label?: string;
  exitAt?: number;
}> = ({value, total = 100, delay = 0, duration = 1.4, size = 620, thickness = 64, color = "accent", suffix = "%", label, exitAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.enter});
  const appear = useEnter(delay - 0.2);
  const e = useExit(exitAt);
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const frac = (value / total) * t;
  return (
    <div style={{position: "relative", width: size, height: size, opacity: appear * (1 - e), transform: `scale(${lerp(0.85, 1, appear)}) rotate(${(1 - appear) * -30}deg)`}}>
      <svg width={size} height={size} style={{transform: "rotate(-90deg)"}}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={alpha("text", 0.1)} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={c(color)}
          strokeWidth={thickness}
          strokeLinecap={ds.shape.corner === "sharp" ? "butt" : "round"}
          strokeDasharray={`${C * frac} ${C}`}
        />
      </svg>
      <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}>
        <div style={type("display", "hero", {color: c("text"), fontVariantNumeric: "tabular-nums"})}>{fmt(value * t, 0, "", suffix)}</div>
        {label && <div style={type("body", "body", {color: c("textMuted"), marginTop: 8, textAlign: "center", maxWidth: size * 0.6})}>{label}</div>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Pictogram — "3 em cada 10": grade de ícones que se preenche. Ótimo para proporções.
// ---------------------------------------------------------------------------------------------
export const Pictogram: React.FC<{
  total: number;
  filled: number;
  cols?: number;
  delay?: number;
  stagger?: number;
  size?: number;
  color?: string;
  shape?: "dot" | "square" | "person";
  exitAt?: number;
}> = ({total, filled, cols = 10, delay = 0, stagger = 0.03, size, color = "accent", shape = "dot", exitAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const cell = size ?? Math.floor(s.innerWidth / cols);
  const e = useExit(exitAt);
  return (
    <div style={{display: "grid", gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap: 0, opacity: 1 - e}}>
      {Array.from({length: total}).map((_, i) => {
        const p = spring({frame: frame - Math.round((delay + i * stagger * (10 / cols)) * fps), fps, config: ds.motion.spring.pop});
        const on = i < filled;
        const fillP = spring({frame: frame - Math.round((delay + total * stagger * 0.5 + i * stagger) * fps), fps, config: ds.motion.spring.enter});
        const off = mix("background", "text", 0.18);
        const col = on ? mix(off, color, Math.min(1, fillP)) : off;
        const inner = cell * 0.72;
        return (
          <div key={i} style={{width: cell, height: cell, display: "flex", alignItems: "center", justifyContent: "center"}}>
            {shape === "person" ? (
              <svg width={inner} height={inner} viewBox="0 0 24 24" style={{transform: `scale(${p})`}}>
                <circle cx={12} cy={6.5} r={4.2} fill={col} />
                <path d="M3.5 22c0-5 3.8-8.6 8.5-8.6s8.5 3.6 8.5 8.6z" fill={col} />
              </svg>
            ) : (
              <div style={{width: inner, height: inner, borderRadius: shape === "dot" ? "50%" : radius("sm") / 2, background: col, transform: `scale(${p})`}} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
export const ProgressBar: React.FC<{value: number; delay?: number; duration?: number; width?: number; height?: number; color?: string; label?: string}> = ({
  value,
  delay = 0,
  duration = 1.2,
  width,
  height = 40,
  color = "primary",
  label,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const W = width ?? s.innerWidth;
  const t = interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.enter});
  return (
    <div style={{width: W}}>
      {label && (
        <div style={{display: "flex", justifyContent: "space-between", marginBottom: 12, ...type("body", "body", {color: c("text")})}}>
          <span>{label}</span>
          <span style={{fontVariantNumeric: "tabular-nums"}}>{fmt(value * t)}%</span>
        </div>
      )}
      <div style={{height, borderRadius: radius("lg"), background: alpha("text", 0.1), overflow: "hidden"}}>
        <div style={{width: `${value * t}%`, height: "100%", borderRadius: radius("lg"), background: c(color)}} />
      </div>
    </div>
  );
};
