import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {alpha, c, ds, radius, type, type TypeRole, type TypeSize} from "../../ds";
import {ease, lerp, revealStyle, type RevealPreset, useEnter, useExit} from "../motion";

// ---------------------------------------------------------------------------------------------
// Reveal — embrulha qualquer coisa com entrada/saída do design system.
// ---------------------------------------------------------------------------------------------
export const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  preset?: RevealPreset;
  exitAt?: number;
  distance?: number;
  spring?: "enter" | "pop" | "soft";
  style?: React.CSSProperties;
}> = ({children, delay = 0, preset = "rise", exitAt, distance, spring: sp, style}) => {
  const p = useEnter(delay, {spring: sp ?? (preset === "pop" ? "pop" : "enter")});
  const e = useExit(exitAt);
  return <div style={{...revealStyle(p, preset, e, distance), ...style}}>{children}</div>;
};

// ---------------------------------------------------------------------------------------------
// KineticText — título/frase com entrada palavra a palavra. *Asteriscos* marcam a ênfase.
//   <KineticText text={"O cérebro usa\n*20%* da energia"} size="h1" />
// ---------------------------------------------------------------------------------------------
type Token = {word: string; em: boolean; line: number; tail: string};

const tokenize = (text: string): Token[] => {
  const out: Token[] = [];
  text.split("\n").forEach((line, li) => {
    let em = false;
    for (const raw of line.split(/\s+/).filter(Boolean)) {
      let w = raw;
      let tail = "";
      if (w.startsWith("*")) {
        em = true;
        w = w.slice(1);
      }
      // fecha ênfase mesmo com pontuação depois: *inteiro*.  *isso*?!
      const m = w.match(/^(.*?)\*([^\p{L}\p{N}]*)$/u);
      const closes = Boolean(m);
      if (m) {
        w = m[1];
        tail = m[2];
      }
      out.push({word: w, em, line: li, tail});
      if (closes) em = false;
    }
  });
  return out;
};

export type EmphasisStyle = "color" | "marker" | "underline" | "outline";

export const KineticText: React.FC<{
  text: string;
  role?: TypeRole;
  size?: TypeSize | number;
  color?: string;
  emphasis?: EmphasisStyle;
  emphasisColor?: string;
  delay?: number;
  /** segundos entre palavras (padrão: stagger do design system) */
  stagger?: number;
  preset?: "mask" | "rise" | "blur" | "pop" | "fade";
  exitAt?: number;
  align?: "center" | "left" | "right";
  maxWidth?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  role = "display",
  size = "h1",
  color = "text",
  emphasis = "color",
  emphasisColor = "accent",
  delay = 0,
  stagger,
  preset = "mask",
  exitAt,
  align = "center",
  maxWidth,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tokens = tokenize(text);
  const step = stagger ?? ds.motion.stagger;
  const lines = Math.max(...tokens.map((t) => t.line)) + 1;
  const e = useExit(exitAt);
  const base = type(role, size, {color: c(color)});

  return (
    <div style={{...base, textAlign: align, maxWidth, ...style, opacity: 1 - e, transform: `translateY(${-e * 30}px)`}}>
      {Array.from({length: lines}).map((_, li) => (
        <div key={li} style={{display: "block"}}>
          {tokens
            .map((t, i) => ({...t, i}))
            .filter((t) => t.line === li)
            .map((t) => {
              const p = spring({
                frame: frame - Math.round((delay + t.i * step) * fps),
                fps,
                config: ds.motion.spring[preset === "pop" ? "pop" : "enter"],
              });
              const emP = t.em
                ? interpolate(frame, [(delay + t.i * step + 0.18) * fps, (delay + t.i * step + 0.18 + ds.motion.duration.base) * fps], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: ease.standard,
                  })
                : 0;
              const inner: React.CSSProperties =
                preset === "mask"
                  ? {transform: `translateY(${(1 - p) * 105}%)`, display: "inline-block"}
                  : {...revealStyle(p, preset === "fade" ? "fade" : preset === "blur" ? "blur" : preset === "pop" ? "pop" : "rise"), display: "inline-block"};
              const wordColor = t.em && emphasis === "color" ? c(emphasisColor) : undefined;
              return (
                <span
                  key={t.i}
                  style={{
                    display: "inline-block",
                    overflow: preset === "mask" ? "hidden" : "visible",
                    verticalAlign: "top",
                    paddingBottom: preset === "mask" ? "0.08em" : 0,
                    marginBottom: preset === "mask" ? "-0.08em" : 0,
                  }}
                >
                  <span style={{...inner, position: "relative", color: wordColor}}>
                    {t.em && emphasis === "marker" && (
                      <span
                        style={{
                          position: "absolute",
                          left: "-0.08em",
                          right: "-0.08em",
                          top: "12%",
                          bottom: "4%",
                          background: c(emphasisColor),
                          borderRadius: radius("sm"),
                          transform: `scaleX(${emP})`,
                          transformOrigin: "left center",
                          zIndex: 0,
                        }}
                      />
                    )}
                    {t.em && emphasis === "underline" && (
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: "0.02em",
                          height: "0.09em",
                          background: c(emphasisColor),
                          borderRadius: 99,
                          transform: `scaleX(${emP})`,
                          transformOrigin: "left center",
                        }}
                      />
                    )}
                    <span
                      style={{
                        position: "relative",
                        zIndex: 1,
                        color: t.em && emphasis === "marker" ? c(ds.color.textOnPrimary ?? "background") : wordColor,
                        WebkitTextStroke: t.em && emphasis === "outline" ? `0.03em ${c(emphasisColor)}` : undefined,
                        WebkitTextFillColor: t.em && emphasis === "outline" ? "transparent" : undefined,
                      }}
                    >
                      {t.word}
                    </span>
                    {t.tail}
                  </span>
                  {" "}
                </span>
              );
            })}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Counter — número que conta até o valor (pt-BR, algarismos tabulares).
// ---------------------------------------------------------------------------------------------
export const Counter: React.FC<{
  to: number;
  from?: number;
  delay?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  role?: TypeRole;
  size?: TypeSize | number;
  color?: string;
  locale?: string;
  style?: React.CSSProperties;
}> = ({to, from = 0, delay = 0, duration = 1.4, decimals = 0, prefix = "", suffix = "", role = "display", size = "hero", color = "text", locale = "pt-BR", style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.enter,
  });
  const appear = useEnter(delay, {spring: "pop"});
  const settle = spring({frame: frame - Math.round((delay + duration) * fps), fps, config: ds.motion.spring.pop});
  const v = lerp(from, to, t);
  const txt = new Intl.NumberFormat(locale, {minimumFractionDigits: decimals, maximumFractionDigits: decimals}).format(v);
  return (
    <div
      style={{
        ...type(role, size, {color: c(color), fontVariantNumeric: "tabular-nums"}),
        opacity: Math.min(1, appear * 1.5),
        transform: `scale(${lerp(0.7, 1, appear) * (1 + Math.sin(settle * Math.PI) * 0.06)})`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {prefix}
      {txt}
      {suffix}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Eyebrow — rótulo curto acima de títulos ("PASSO 2", "POR QUE ISSO IMPORTA").
// ---------------------------------------------------------------------------------------------
export const Eyebrow: React.FC<{text: string; delay?: number; color?: string; variant?: "pill" | "line" | "plain"; exitAt?: number}> = ({
  text,
  delay = 0,
  color = "primary",
  variant = "pill",
  exitAt,
}) => {
  const p = useEnter(delay);
  const e = useExit(exitAt);
  const lab = type("body", "label", {
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    fontWeight: 700,
    color: variant === "pill" ? c(ds.color.textOnPrimary ?? "background") : c(color),
  });
  return (
    <div style={{display: "flex", alignItems: "center", gap: 18, ...revealStyle(p, "rise", e, 24)}}>
      {variant === "line" && <div style={{width: 64 * p, height: 4, borderRadius: 4, background: c(color)}} />}
      <div
        style={{
          ...lab,
          padding: variant === "pill" ? "12px 26px" : 0,
          background: variant === "pill" ? c(color) : "transparent",
          borderRadius: radius("lg"),
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Lettering — palavra de impacto com tratamento tipográfico, letra a letra.
//   effect: "stack" (extrusão em camadas), "outline" (contorno que se preenche),
//           "gradient" (preenchimento em gradiente), "glow" (brilho), "solid"
// ---------------------------------------------------------------------------------------------
export const Lettering: React.FC<{
  text: string;
  effect?: "stack" | "outline" | "gradient" | "glow" | "solid";
  role?: TypeRole;
  size?: TypeSize | number;
  color?: string;
  depthColor?: string;
  delay?: number;
  stagger?: number;
  exitAt?: number;
  style?: React.CSSProperties;
}> = ({text, effect = "stack", role = "display", size = "hero", color = "primary", depthColor, delay = 0, stagger = 0.035, exitAt, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const e = useExit(exitAt);
  const base = type(role, size);
  const px = typeof base.fontSize === "number" ? base.fontSize : 120;
  const depth = Math.round(px * 0.09);
  const dc = c(depthColor ?? "secondary");
  const fillP = interpolate(frame, [(delay + 0.3) * fps, (delay + 0.3 + ds.motion.duration.slow) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.standard,
  });
  return (
    <div style={{...base, display: "flex", justifyContent: "center", whiteSpace: "pre", opacity: 1 - e, ...style}}>
      {text.split("").map((ch, i) => {
        const p = spring({frame: frame - Math.round((delay + i * stagger) * fps), fps, config: ds.motion.spring.pop});
        const d = Math.round(depth * Math.min(1, p));
        const shadow =
          effect === "stack"
            ? Array.from({length: d}, (_, k) => `${k + 1}px ${k + 1}px 0 ${dc}`).join(", ")
            : effect === "glow"
              ? `0 0 ${px * 0.12}px ${alpha(color, 0.7 * p)}, 0 0 ${px * 0.4}px ${alpha(color, 0.35 * p)}`
              : undefined;
        const fill: React.CSSProperties =
          effect === "gradient"
            ? {
                backgroundImage: `linear-gradient(${120 + fillP * 60}deg, ${c("primary")}, ${c("accent")})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }
            : effect === "outline"
              ? {
                  WebkitTextStroke: `${Math.max(2, px * 0.025)}px ${c(color)}`,
                  color: "transparent",
                  backgroundImage: `linear-gradient(0deg, ${c(color)} ${fillP * 100}%, transparent ${fillP * 100}%)`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                }
              : {color: c(color)};
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              ...fill,
              textShadow: shadow,
              transform: `translate(${-d * 0.5}px, ${(1 - p) * px * 0.6 - d * 0.5}px) rotate(${(1 - p) * -8}deg)`,
              opacity: Math.min(1, p * 1.4),
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// TypeOn — máquina de escrever (para código, buscas, prompts).
// ---------------------------------------------------------------------------------------------
export const TypeOn: React.FC<{text: string; delay?: number; cps?: number; role?: TypeRole; size?: TypeSize | number; color?: string; cursor?: boolean}> = ({
  text,
  delay = 0,
  cps = 22,
  role = "mono",
  size = "body",
  color = "text",
  cursor = true,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - delay * fps) / fps) * cps)));
  const blink = Math.floor(frame / (fps * 0.5)) % 2 === 0;
  return (
    <div style={type(ds.typography.mono ? role : "body", size, {color: c(color), whiteSpace: "pre-wrap"})}>
      {text.slice(0, n)}
      {cursor && <span style={{opacity: blink || n < text.length ? 1 : 0, color: c("accent")}}>▍</span>}
    </div>
  );
};
