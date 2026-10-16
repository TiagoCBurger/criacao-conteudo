import {evolvePath} from "@remotion/paths";
import type {LucideIcon} from "lucide-react";
import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {alpha, c, ds, radius, type} from "../../ds";
import {useSafe} from "../layout";
import {ease, lerp, revealStyle, type RevealPreset, useEnter, useExit} from "../motion";

// Blocos didáticos 2D. Ícones: importe de "lucide-react" (ex.: import {Brain} from "lucide-react").

// ---------------------------------------------------------------------------------------------
export const Card: React.FC<{
  children: React.ReactNode;
  delay?: number;
  preset?: RevealPreset;
  exitAt?: number;
  padding?: number;
  accent?: string;
  width?: number | string;
  style?: React.CSSProperties;
}> = ({children, delay = 0, preset = "rise", exitAt, padding = 44, accent, width, style}) => {
  const p = useEnter(delay);
  const e = useExit(exitAt);
  const st = ds.surface.style;
  const surface: React.CSSProperties =
    st === "glass"
      ? {
          background: alpha("surface", 0.55),
          backdropFilter: `blur(${ds.surface.blur ?? 24}px)`,
          border: `2px solid ${alpha("text", 0.12)}`,
        }
      : st === "outline"
        ? {background: "transparent", border: `${ds.shape.strokeWidth}px solid ${c(ds.color.border ?? "textMuted")}`}
        : st === "elevated"
          ? {background: c("surface"), boxShadow: ds.surface.shadow ?? "0 30px 80px rgba(0,0,0,0.35)"}
          : {background: c("surface")};
  return (
    <div
      style={{
        ...surface,
        borderRadius: radius("lg"),
        padding,
        width,
        position: "relative",
        overflow: "hidden",
        // overflow hidden faz o item flex poder encolher abaixo do conteúdo — impede o corte do texto
        flexShrink: 0,
        ...revealStyle(p, preset, e),
        ...style,
      }}
    >
      {accent && <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: 10, background: c(accent)}} />}
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
export const IconBadge: React.FC<{icon: LucideIcon; size?: number; color?: string; delay?: number; variant?: "solid" | "soft" | "ring"}> = ({
  icon: Icon,
  size = 140,
  color = "primary",
  delay = 0,
  variant = "soft",
}) => {
  const p = useEnter(delay, {spring: "pop"});
  const bg = variant === "solid" ? c(color) : variant === "soft" ? alpha(color, 0.16) : "transparent";
  const fg = variant === "solid" ? c(ds.color.textOnPrimary ?? "background") : c(color);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: ds.shape.corner === "pill" ? "50%" : radius("md"),
        background: bg,
        border: variant === "ring" ? `${ds.shape.strokeWidth}px solid ${c(color)}` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${p}) rotate(${(1 - p) * -20}deg)`,
        flexShrink: 0,
      }}
    >
      <Icon size={size * 0.52} color={fg} strokeWidth={Math.max(1.5, ds.shape.strokeWidth * 0.6)} />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Arrow — seta que se desenha. Coordenadas em px do próprio SVG (posicione o contêiner).
// ---------------------------------------------------------------------------------------------
export const Arrow: React.FC<{
  from: [number, number];
  to: [number, number];
  bend?: number;
  delay?: number;
  duration?: number;
  color?: string;
  width?: number;
  height?: number;
  dashed?: boolean;
}> = ({from, to, bend = 0, delay = 0, duration = 0.6, color = "textMuted", width = 1080, height = 1920, dashed = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
  const mx = (from[0] + to[0]) / 2 - (to[1] - from[1]) * bend;
  const my = (from[1] + to[1]) / 2 + (to[0] - from[0]) * bend;
  const d = `M ${from[0]} ${from[1]} Q ${mx} ${my} ${to[0]} ${to[1]}`;
  const evo = evolvePath(t, d);
  const ang = Math.atan2(to[1] - my, to[0] - mx);
  const head = 26;
  const sw = ds.shape.strokeWidth * 1.5;
  return (
    <svg width={width} height={height} style={{position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none"}}>
      <path
        d={d}
        fill="none"
        stroke={c(color)}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={dashed ? undefined : evo.strokeDasharray}
        strokeDashoffset={dashed ? undefined : evo.strokeDashoffset}
        style={dashed ? {strokeDasharray: "2 18", opacity: t} : undefined}
      />
      {t > 0.92 && (
        <path
          d={`M ${to[0] - head * Math.cos(ang - 0.45)} ${to[1] - head * Math.sin(ang - 0.45)} L ${to[0]} ${to[1]} L ${to[0] - head * Math.cos(ang + 0.45)} ${to[1] - head * Math.sin(ang + 0.45)}`}
          fill="none"
          stroke={c(color)}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={interpolate(t, [0.92, 1], [0, 1])}
        />
      )}
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------
// FlowSteps — processo passo a passo vertical. `at` = segundos em que cada passo entra (use useCue).
// O passo atual fica em destaque; os anteriores recuam. Conector se desenha entre eles.
// ---------------------------------------------------------------------------------------------
export const FlowSteps: React.FC<{
  steps: {title: string; detail?: string; icon?: LucideIcon}[];
  at?: number[];
  delay?: number;
  gapSec?: number;
  focus?: boolean;
  exitAt?: number;
}> = ({steps, at, delay = 0, gapSec = 0.6, focus = true, exitAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const times = at ?? steps.map((_, i) => delay + i * gapSec);
  const now = frame / fps;
  const active = times.reduce((acc, t, i) => (now >= t ? i : acc), -1);
  const e = useExit(exitAt);
  const badge = 104;
  return (
    <div style={{width: s.innerWidth, display: "flex", flexDirection: "column", gap: 0, opacity: 1 - e}}>
      {steps.map((st, i) => {
        const p = spring({frame: frame - Math.round(times[i] * fps), fps, config: ds.motion.spring.enter});
        const isActive = !focus || i === active;
        const dim = focus && i < active ? 0.45 : 1;
        const lineP =
          i < steps.length - 1
            ? interpolate(frame, [times[i] * fps + 6, times[i + 1] * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard})
            : 0;
        const Icon = st.icon;
        return (
          <div key={i} style={{display: "flex", gap: 36, opacity: Math.min(1, p * 1.3) * dim, transform: `translateX(${(1 - p) * 80}px)`}}>
            <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
              <div
                style={{
                  width: badge,
                  height: badge,
                  borderRadius: ds.shape.corner === "sharp" ? 0 : "50%",
                  background: isActive ? c("primary") : alpha("text", 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${lerp(0.5, 1, p)})`,
                  boxShadow: isActive && focus ? `0 0 0 ${12 * p}px ${alpha("primary", 0.18)}` : undefined,
                }}
              >
                {Icon ? (
                  <Icon size={badge * 0.5} color={c(isActive ? ds.color.textOnPrimary ?? "background" : "text")} strokeWidth={2.2} />
                ) : (
                  <span style={type("display", "h3", {color: c(isActive ? ds.color.textOnPrimary ?? "background" : "text")})}>{i + 1}</span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div style={{width: 6, flex: 1, minHeight: 70, background: alpha("text", 0.1), borderRadius: 3, overflow: "hidden"}}>
                  <div style={{width: "100%", height: `${lineP * 100}%`, background: c("primary")}} />
                </div>
              )}
            </div>
            <div style={{paddingTop: 14, paddingBottom: 48, flex: 1}}>
              <div style={type("display", "h3", {color: c("text")})}>{st.title}</div>
              {st.detail && <div style={type("body", "body", {color: c("textMuted"), marginTop: 10})}>{st.detail}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Compare — A vs B. Em 9:16 empilha (cima/baixo) por padrão; "columns" para itens curtos.
// ---------------------------------------------------------------------------------------------
export const Compare: React.FC<{
  a: {title: string; items: string[]; tone?: "negative" | "positive" | "neutral"};
  b: {title: string; items: string[]; tone?: "negative" | "positive" | "neutral"};
  delay?: number;
  bDelay?: number;
  layout?: "stack" | "columns";
  exitAt?: number;
}> = ({a, b, delay = 0, bDelay, layout = "stack", exitAt}) => {
  const s = useSafe();
  const vs = useEnter((bDelay ?? delay + 0.8) - 0.2, {spring: "pop"});
  const e = useExit(exitAt);
  const W = layout === "columns" ? (s.innerWidth - 40) / 2 : s.innerWidth;
  const side = (x: typeof a, d: number, dir: RevealPreset) => {
    const toneColor = x.tone === "negative" ? "negative" : x.tone === "positive" ? "positive" : "primary";
    return (
      <Card delay={d} preset={dir} accent={toneColor} width={W}>
        <div style={type("display", "h3", {color: c(toneColor), marginBottom: 20})}>{x.title}</div>
        {x.items.map((it, i) => (
          <CompareItem key={i} text={it} tone={x.tone} delay={d + 0.25 + i * 0.18} />
        ))}
      </Card>
    );
  };
  return (
    <div style={{display: "flex", flexDirection: layout === "columns" ? "row" : "column", gap: 40, alignItems: "center", position: "relative", opacity: 1 - e}}>
      {side(a, delay, layout === "columns" ? "left" : "rise")}
      <div
        style={{
          position: layout === "columns" ? "absolute" : "relative",
          left: layout === "columns" ? "50%" : undefined,
          top: layout === "columns" ? "50%" : undefined,
          transform: `${layout === "columns" ? "translate(-50%,-50%) " : ""}scale(${vs})`,
          margin: layout === "columns" ? 0 : "-70px 0",
          zIndex: 2,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: c("accent"),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...type("display", "h3", {color: c(ds.color.textOnPrimary ?? "background")}),
        }}
      >
        VS
      </div>
      {side(b, bDelay ?? delay + 0.8, layout === "columns" ? "right" : "rise")}
    </div>
  );
};

const CompareItem: React.FC<{text: string; tone?: string; delay: number}> = ({text, tone, delay}) => {
  const p = useEnter(delay);
  const mark = tone === "negative" ? "✕" : "✓";
  const col = tone === "negative" ? "negative" : tone === "positive" ? "positive" : "primary";
  return (
    <div style={{display: "flex", gap: 18, alignItems: "flex-start", marginTop: 14, ...revealStyle(p, "left", 0, 30)}}>
      <span style={type("display", "body", {color: c(col), width: 40})}>{mark}</span>
      <span style={type("body", "body", {color: c("text")})}>{text}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Callout — rótulo com linha-guia apontando para um ponto (anotar objeto 3D, imagem, gráfico).
// ---------------------------------------------------------------------------------------------
export const Callout: React.FC<{
  x: number;
  y: number;
  text: string;
  side?: "left" | "right";
  length?: number;
  delay?: number;
  color?: string;
}> = ({x, y, text, side = "right", length = 160, delay = 0, color = "accent"}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = interpolate(frame, [delay * fps, (delay + 0.45) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
  const textP = useEnter(delay + 0.3);
  const dir = side === "right" ? 1 : -1;
  const dot = spring({frame: frame - Math.round(delay * fps), fps, config: ds.motion.spring.pop});
  return (
    <>
      <div style={{position: "absolute", left: x - 14, top: y - 14, width: 28, height: 28, borderRadius: "50%", background: c(color), transform: `scale(${dot})`, boxShadow: `0 0 0 ${10 * dot}px ${alpha(color, 0.25)}`}} />
      <div style={{position: "absolute", left: side === "right" ? x : x - length * t, top: y - 2, width: length * t, height: 4, background: c(color), borderRadius: 2}} />
      <div
        style={{
          position: "absolute",
          top: y,
          left: side === "right" ? x + length + 20 : undefined,
          right: side === "left" ? 1080 - (x - length - 20) : undefined,
          transform: `translateY(-50%) translateX(${(1 - textP) * 20 * dir}px)`,
          opacity: textP,
          ...type("body", "body", {color: c("text"), fontWeight: 600, whiteSpace: "nowrap"}),
        }}
      >
        {text}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------------------------
export const Checklist: React.FC<{items: string[]; at?: number[]; delay?: number; gapSec?: number}> = ({items, at, delay = 0, gapSec = 0.5}) => {
  const s = useSafe();
  const times = at ?? items.map((_, i) => delay + i * gapSec);
  return (
    <div style={{width: s.innerWidth, display: "flex", flexDirection: "column", gap: 28}}>
      {items.map((it, i) => (
        <CheckRow key={i} text={it} t={times[i]} />
      ))}
    </div>
  );
};

const CheckRow: React.FC<{text: string; t: number}> = ({text, t}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = useEnter(t);
  const tick = interpolate(frame, [(t + 0.2) * fps, (t + 0.5) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
  const d = "M 14 34 L 28 48 L 54 18";
  const evo = evolvePath(tick, d);
  return (
    <div style={{display: "flex", alignItems: "center", gap: 28, ...revealStyle(p, "left", 0, 40)}}>
      <div style={{width: 72, height: 72, borderRadius: radius("sm"), background: mixBg(tick), border: `4px solid ${c("positive")}`, flexShrink: 0}}>
        <svg width={64} height={64} viewBox="0 0 68 68">
          <path d={d} fill="none" stroke={c(ds.color.textOnPrimary ?? "background")} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />
        </svg>
      </div>
      <span style={type("body", "h3", {color: c("text"), fontWeight: 600})}>{text}</span>
    </div>
  );
};

const mixBg = (t: number) => (t > 0 ? c("positive") : "transparent");
