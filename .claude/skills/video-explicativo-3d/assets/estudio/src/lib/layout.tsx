import React from "react";
import {AbsoluteFill, Img, useCurrentFrame, useVideoConfig} from "remotion";
import {alpha, c, ds, dsFile} from "../ds";
import {useDrift} from "./motion";

/**
 * Margens seguras do 9:16. Reels/TikTok/Shorts cobrem o topo (status, abas) e principalmente
 * a base (legenda do post, botões) e a lateral direita (curtir/comentar). Conteúdo importante fica dentro.
 */
export const useSafe = () => {
  const {width, height} = useVideoConfig();
  const k = width / 1080;
  const s = ds.layout.safe;
  return {
    top: s.top * k,
    bottom: s.bottom * k,
    left: s.left * k,
    right: s.right * k,
    width,
    height,
    /** largura útil */
    innerWidth: width - (s.left + s.right) * k,
    /** altura útil */
    innerHeight: height - (s.top + s.bottom) * k,
  };
};

/** Fundo da marca: cor/gradiente/padrão + brilho que respira + granulação + vinheta. */
export const Stage: React.FC<{children?: React.ReactNode; tone?: "default" | "alt" | "primary"; glow?: boolean}> = ({
  children,
  tone = "default",
  glow = true,
}) => {
  const {width, height} = useVideoConfig();
  const frame = useCurrentFrame();
  const d = useDrift("stage", 1, 0.08);
  const bg = tone === "primary" ? c("primary") : tone === "alt" ? c(ds.color.backgroundAlt ?? "background") : c("background");
  const b = ds.background;
  const g = ds.color.gradient;
  const base =
    b.style === "gradient" && g
      ? `linear-gradient(${g.angle ?? 160}deg, ${g.from}, ${g.to})`
      : bg;
  const patternOpacity = b.patternOpacity ?? 0.08;
  const glowColor = ds.color.glow ?? ds.color.primary;
  // intensidade do brilho do fundo: token background.glow (0–1); padrão mais contido em grade/pontos
  const glowAmount = ds.background.glow ?? (b.style === "radial" || b.style === "gradient" ? 0.32 : 0.16);
  return (
    <AbsoluteFill style={{background: base, overflow: "hidden"}}>
      {glow && (b.style === "radial" || b.style === "grid" || b.style === "dots" || b.style === "gradient") && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${50 + d.x * 12}% ${28 + d.y * 8}%, ${alpha(glowColor, glowAmount)} 0%, ${alpha(
              glowColor,
              0,
            )} 55%)`,
          }}
        />
      )}
      {b.style === "grid" && (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${alpha("text", patternOpacity)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(
              "text",
              patternOpacity,
            )} 1px, transparent 1px)`,
            backgroundSize: `${width / 12}px ${width / 12}px`,
            backgroundPosition: `${d.x * 20}px ${(frame * 0.4) % (width / 12)}px`,
            maskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 80%)",
          }}
        />
      )}
      {b.style === "dots" && (
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(${alpha("text", patternOpacity * 2)} 2px, transparent 2.5px)`,
            backgroundSize: `${width / 18}px ${width / 18}px`,
            maskImage: "radial-gradient(ellipse at 50% 45%, black 25%, transparent 75%)",
          }}
        />
      )}
      {children}
      {(b.vignette ?? 0) > 0 && (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            background: `radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,${b.vignette}) 100%)`,
          }}
        />
      )}
      {(b.grain ?? 0) > 0 && <Grain amount={b.grain!} width={width} height={height} />}
    </AbsoluteFill>
  );
};

/** Granulação de filme, muda a cada 2 frames (determinística). */
export const Grain: React.FC<{amount: number; width: number; height: number}> = ({amount, width, height}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 24;
  return (
    <svg width={width} height={height} style={{position: "absolute", inset: 0, opacity: amount, mixBlendMode: "overlay", pointerEvents: "none"}}>
      <filter id={`grain-${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
    </svg>
  );
};

/** Área de conteúdo dentro das margens seguras. Por padrão empilha e centraliza. */
export const SafeArea: React.FC<{
  children: React.ReactNode;
  align?: "center" | "top" | "bottom";
  gap?: number;
  style?: React.CSSProperties;
  /** reserva espaço para as legendas na base */
  reserveCaptions?: boolean;
}> = ({children, align = "center", gap = ds.layout.gap, style, reserveCaptions = true}) => {
  const s = useSafe();
  const captionsSpace = reserveCaptions && ds.captions.enabled && ds.captions.position === "bottom" ? ds.captions.size * 3.2 : 0;
  const hasMark = ds.brand.watermark !== "none" && Boolean(ds.brand.logo || ds.brand.logoOnDark || ds.brand.handle);
  const markTop = hasMark && ds.brand.watermark.startsWith("top") ? 84 : 0;
  const markBottom = hasMark && ds.brand.watermark === "bottom" ? 84 : 0;
  return (
    <AbsoluteFill
      style={{
        paddingTop: s.top + markTop,
        paddingBottom: s.bottom + Math.max(captionsSpace, markBottom),
        paddingLeft: s.left,
        paddingRight: s.right,
        display: "flex",
        flexDirection: "column",
        justifyContent: align === "top" ? "flex-start" : align === "bottom" ? "flex-end" : "center",
        alignItems: "center",
        gap,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Sobreposição de debug com as zonas seguras — use em stills de checagem, nunca no render final. */
export const SafeZonesDebug: React.FC = () => {
  const s = useSafe();
  const z = (st: React.CSSProperties) => <div style={{position: "absolute", background: "rgba(255,0,80,0.25)", ...st}} />;
  return (
    <AbsoluteFill style={{pointerEvents: "none"}}>
      {z({top: 0, left: 0, right: 0, height: s.top})}
      {z({bottom: 0, left: 0, right: 0, height: s.bottom})}
      {z({top: s.top, bottom: s.bottom, left: 0, width: s.left})}
      {z({top: s.top, bottom: s.bottom, right: 0, width: s.right})}
    </AbsoluteFill>
  );
};

/** Logo/assinatura discreta da marca, conforme tokens.brand.watermark. */
export const Watermark: React.FC<{opacity?: number}> = ({opacity = 0.85}) => {
  const s = useSafe();
  const w = ds.brand.watermark;
  const logo = ds.brand.logoOnDark ?? ds.brand.logo;
  if (w === "none" || (!logo && !ds.brand.handle)) return null;
  // dentro da área segura (nunca sob a interface do app); SafeArea reserva espaço para ela
  const pos: React.CSSProperties =
    w === "top-left"
      ? {top: s.top, left: s.left}
      : w === "top-right"
        ? {top: s.top, right: s.right}
        : {bottom: s.bottom, left: 0, right: 0, justifyContent: "center"};
  return (
    <div style={{position: "absolute", display: "flex", alignItems: "center", gap: 16, opacity, ...pos}}>
      {logo ? (
        <Img src={dsFile(logo)} style={{height: 56, width: "auto"}} />
      ) : (
        <span style={{color: c("textMuted"), fontFamily: ds.typography.body.family, fontSize: 30, fontWeight: 600}}>
          {ds.brand.handle}
        </span>
      )}
    </div>
  );
};
