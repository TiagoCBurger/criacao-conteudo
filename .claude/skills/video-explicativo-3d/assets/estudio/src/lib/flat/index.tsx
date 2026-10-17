import {fitText} from "@remotion/layout-utils";
import {evolvePath} from "@remotion/paths";
import React, {useEffect, useState} from "react";
import {AbsoluteFill, continueRender, delayRender, interpolate, random, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {alpha, c, ds, mix, type, type TypeRole} from "../../ds";
import {useSafe} from "../layout";
import {ease, useExit, useTime} from "../motion";

// Kit 2D (art.medium = "2d"): motion graphics planos — tipografia que ocupa a tela, formas e traços que se
// desenham, blocos de cor que varrem, fluxos de pontos. A mesma disciplina do 3D: uma mensagem por tela,
// um acento por quadro, movimento com intenção.

/** Re-renderiza quando as fontes terminam de carregar (medidas de texto dependem delas). */
const useFontsReady = () => {
  const [ready, setReady] = useState(() => typeof document === "undefined" || document.fonts.status === "loaded");
  useEffect(() => {
    if (ready) return;
    const h = delayRender("fontes para medir texto");
    document.fonts.ready.then(() => {
      setReady(true);
      continueRender(h);
    });
  }, [ready]);
  return ready;
};

// ---------------------------------------------------------------------------------------------
// FitText — cada linha ocupa exatamente a largura útil (cartaz suíço). Linhas curtas ficam enormes.
//   <FitText lines={["TAPE OS", "*VAZAMENTOS*"]} delay={…} />    (*…* = linha em acento)
// ---------------------------------------------------------------------------------------------
export const FitText: React.FC<{
  lines: string[];
  role?: TypeRole;
  width?: number;
  maxSize?: number;
  color?: string;
  accent?: string;
  delay?: number;
  stagger?: number;
  exitAt?: number;
  gap?: number;
  align?: "left" | "center";
}> = ({lines, role = "display", width, maxSize = 360, color = "text", accent = "accent", delay = 0, stagger = 0.12, exitAt, gap = 0, align = "left"}) => {
  useFontsReady();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const W = width ?? s.innerWidth;
  const base = type(role, 100);
  const e = useExit(exitAt);
  return (
    <div style={{width: W, display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap, opacity: 1 - e}}>
      {lines.map((raw, i) => {
        const em = /^\*.*\*$/.test(raw);
        const text = em ? raw.slice(1, -1) : raw;
        let size = 100;
        try {
          size = fitText({
            text,
            withinWidth: W,
            fontFamily: String(base.fontFamily),
            fontWeight: base.fontWeight as number,
            letterSpacing: base.letterSpacing as string | undefined,
            textTransform: (base.textTransform as "uppercase" | undefined) ?? undefined,
            validateFontIsLoaded: false,
          }).fontSize;
        } catch {
          size = 100;
        }
        size = Math.min(maxSize, size * 0.98);
        const p = spring({frame: frame - Math.round((delay + i * stagger) * fps), fps, config: ds.motion.spring.enter});
        // a folga em cima (compensada na margem) deixa os acentos de "É", "Ê", "Ã" fora do recorte quando a linha
        // está no lugar, e o deslocamento de 130% os mantém escondidos antes da entrada
        const folga = size * 0.2;
        return (
          <div key={i} style={{overflow: "hidden", lineHeight: 0.92, paddingTop: folga, marginTop: -folga, paddingBottom: size * 0.04}}>
            <div style={{...base, fontSize: size, lineHeight: 0.92, color: c(em ? accent : color), whiteSpace: "nowrap", opacity: p < 0.001 ? 0 : 1, transform: `translateY(${(1 - p) * 130}%) translateY(${-e * 20}px)`}}>{text}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// BlockWipe — bloco de cor que varre a tela (cobre e revela). Use como pontuação visual de virada.
// ---------------------------------------------------------------------------------------------
export const BlockWipe: React.FC<{at: number; duration?: number; color?: string; direction?: "up" | "down" | "left" | "right"}> = ({
  at,
  duration = 0.7,
  color = "accent",
  direction = "up",
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = interpolate(frame, [at * fps, (at + duration) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  if (t <= 0 || t >= 1) return null;
  const inP = ease.enter(Math.min(1, t * 2));
  const outP = ease.exit(Math.max(0, t * 2 - 1));
  const a = (1 - inP) * 100;
  const b = outP * 100;
  const clip =
    direction === "up"
      ? `inset(${a}% 0 ${b}% 0)`
      : direction === "down"
        ? `inset(${b}% 0 ${a}% 0)`
        : direction === "left"
          ? `inset(0 ${b}% 0 ${a}%)`
          : `inset(0 ${a}% 0 ${b}%)`;
  return <AbsoluteFill style={{background: c(color), clipPath: clip, zIndex: 50}} />;
};

// ---------------------------------------------------------------------------------------------
// DrawPath — qualquer traço SVG que se desenha (setas, sublinhados, contornos, gráficos à mão).
// ---------------------------------------------------------------------------------------------
export const DrawPath: React.FC<{d: string; width: number; height: number; delay?: number; duration?: number; color?: string; stroke?: number; style?: React.CSSProperties}> = ({
  d,
  width,
  height,
  delay = 0,
  duration = 0.8,
  color = "text",
  stroke,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
  const evo = evolvePath(t, d);
  return (
    <svg width={width} height={height} style={{overflow: "visible", ...style}}>
      <path d={d} fill="none" stroke={c(color)} strokeWidth={stroke ?? ds.shape.strokeWidth * 1.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------
// DotField — muitos pontos (população), alguns acendem. "10 em 1.000" visível de verdade.
// ---------------------------------------------------------------------------------------------
export const DotField: React.FC<{
  count: number;
  cols: number;
  lit?: number;
  litAt?: number;
  dimAt?: number;
  delay?: number;
  width?: number;
  color?: string;
  litColor?: string;
  seed?: string;
}> = ({count, cols, lit = 0, litAt = 0, dimAt, delay = 0, width, color = "text", litColor = "accent", seed = "dots"}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const W = width ?? s.innerWidth;
  const cell = W / cols;
  const rows = Math.ceil(count / cols);
  // escolhe quais acendem de forma determinística e espalhada
  const litSet = new Set<number>();
  for (let k = 0; litSet.size < lit && k < lit * 20; k++) litSet.add(Math.floor(random(`${seed}-${k}`) * count));
  const dim = dimAt === undefined ? 0 : interpolate(frame, [dimAt * fps, (dimAt + 0.6) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return (
    <svg width={W} height={rows * cell}>
      {Array.from({length: count}).map((_, i) => {
        const r = Math.floor(i / cols);
        const k = i % cols;
        const appear = interpolate(frame, [(delay + (r / rows) * 0.8 + random(`${seed}a${i}`) * 0.25) * fps, (delay + (r / rows) * 0.8 + 0.35) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
        const isLit = litSet.has(i);
        const litP = isLit ? spring({frame: frame - Math.round(litAt * fps), fps, config: ds.motion.spring.pop}) : 0;
        const op = appear * (isLit ? 1 : 1 - dim * 0.75);
        const col = isLit && litP > 0.05 ? c(litColor) : mix("background", color, 0.55);
        return <circle key={i} cx={k * cell + cell / 2} cy={r * cell + cell / 2} r={cell * 0.28 * (1 + litP * 0.6)} fill={col} opacity={op} />;
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------
// Funnel — funil 2D com etapas que se desenham e um fluxo de pontos que entra no topo, vaza nas
// bordas a cada etapa e sai pelo fundo em acento. survive[i] = fração que passa da etapa i para a próxima.
// ---------------------------------------------------------------------------------------------
export const Funnel: React.FC<{
  stages: number;
  at?: number[];
  delay?: number;
  width?: number;
  height?: number;
  active?: number;
  activeAt?: number[];
  flowFrom?: number;
  flowTo?: number;
  rate?: number;
  survive?: number[];
  color?: string;
  accent?: string;
  seed?: string;
}> = ({stages, at, delay = 0, width, height = 980, activeAt, flowFrom = 0, flowTo, rate = 16, survive, color = "text", accent = "accent", seed = "funnel"}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = useTime();
  const s = useSafe();
  const W = width ?? s.innerWidth;
  const H = height;
  const shrink = (k: number) => 1 - (k / stages) * 0.86; // largura relativa na fronteira k
  const stageH = H / stages;
  const halfW = (y: number) => (W / 2) * shrink(Math.min(stages, Math.max(0, y / stageH)));
  const times = at ?? Array.from({length: stages}, (_, i) => delay + i * 0.35);
  const surv = survive ?? Array.from({length: stages}, () => 0.35);
  const activeIdx = activeAt ? activeAt.reduce((acc, a, i) => (t >= a ? i : acc), -1) : -1;

  const paths = Array.from({length: stages}, (_, i) => {
    const y0 = i * stageH;
    const y1 = (i + 1) * stageH;
    const a0 = (W / 2) * shrink(i);
    const a1 = (W / 2) * shrink(i + 1);
    const cx = W / 2;
    return `M ${cx - a0} ${y0} L ${cx + a0} ${y0} L ${cx + a1} ${y1} L ${cx - a1} ${y1} Z`;
  });

  // partículas determinísticas
  const speed = H / 1.7; // px/s
  const dots: React.ReactNode[] = [];
  const end = flowTo ?? Infinity;
  const first = Math.max(0, Math.floor((t - 3) * rate));
  const last = Math.floor((Math.min(t, end) - flowFrom) * rate);
  for (let i = first; i <= last; i++) {
    const ti = flowFrom + i / rate;
    if (ti > t || ti < flowFrom) continue;
    const age = t - ti;
    const xoff = random(`${seed}x${i}`) * 1.6 - 0.8;
    // em qual etapa esta partícula vaza (stages = sai pelo fundo)
    let leakAt = stages;
    for (let k = 0; k < stages; k++) {
      if (random(`${seed}s${i}-${k}`) > surv[k]) {
        leakAt = k;
        break;
      }
    }
    const yLeak = (leakAt + 0.65) * stageH;
    const y = age * speed;
    let x: number;
    let yy = y;
    let op = 1;
    let col = mix("background", color, 0.75);
    let r = 9;
    if (leakAt < stages && y > yLeak) {
      // vazou: sai de lado e some
      const dt = (y - yLeak) / speed;
      const side = xoff < 0 ? -1 : 1;
      x = W / 2 + side * (halfW(yLeak) + dt * 520);
      yy = yLeak + dt * 140;
      op = Math.max(0, 1 - dt * 1.6);
      col = mix("background", color, 0.35);
    } else if (leakAt === stages && y > H) {
      // passou por tudo: cai pelo fundo em acento
      const dt = (y - H) / speed;
      x = W / 2 + xoff * halfW(H) * 0.8;
      yy = H + dt * speed * 0.6;
      op = Math.max(0, 1 - dt * 1.2);
      col = c(accent);
      r = 12;
    } else {
      x = W / 2 + xoff * halfW(y) * 0.85;
      if (leakAt === stages && y > H * 0.7) col = c(accent);
    }
    if (op <= 0.01 || yy < 0) continue;
    dots.push(<circle key={i} cx={x} cy={yy} r={r} fill={col} opacity={op} />);
  }

  return (
    <svg width={W} height={H + 220} style={{overflow: "visible"}}>
      {paths.map((d, i) => {
        const p = interpolate(frame, [times[i] * fps, (times[i] + 0.7) * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
        const evo = evolvePath(p, d);
        const isActive = i === activeIdx;
        return (
          <g key={i}>
            <path d={d} fill={isActive ? alpha(accent, 0.1) : alpha(color, 0.03 * p)} />
            <path
              d={d}
              fill="none"
              stroke={isActive ? c(accent) : alpha(color, 0.55)}
              strokeWidth={isActive ? ds.shape.strokeWidth * 1.4 : ds.shape.strokeWidth}
              strokeLinejoin="round"
              strokeDasharray={evo.strokeDasharray}
              strokeDashoffset={evo.strokeDashoffset}
            />
          </g>
        );
      })}
      {dots}
    </svg>
  );
};

/** Posição (px, relativo ao topo do Funnel) do centro vertical da etapa i — para alinhar rótulos HTML. */
export const funnelStageY = (i: number, stages: number, height = 980) => (i + 0.5) * (height / stages);

// ---------------------------------------------------------------------------------------------
// Shape2D — forma de acento (círculo, quadrado, anel, linha) que entra com escala/desenho.
// ---------------------------------------------------------------------------------------------
export const Shape2D: React.FC<{kind?: "circle" | "square" | "ring" | "line"; size?: number; color?: string; delay?: number; exitAt?: number; style?: React.CSSProperties}> = ({
  kind = "circle",
  size = 200,
  color = "accent",
  delay = 0,
  exitAt,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - Math.round(delay * fps), fps, config: ds.motion.spring.enter});
  const e = useExit(exitAt);
  const k = p * (1 - e);
  const sw = ds.shape.strokeWidth * 2;
  return (
    <div style={{width: size, height: kind === "line" ? sw : size, ...style}}>
      {kind === "circle" && <div style={{width: size, height: size, borderRadius: "50%", background: c(color), transform: `scale(${k})`}} />}
      {kind === "square" && <div style={{width: size, height: size, background: c(color), transform: `scale(${k}) rotate(${(1 - p) * 45}deg)`}} />}
      {kind === "ring" && (
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - sw} fill="none" stroke={c(color)} strokeWidth={sw} strokeDasharray={`${Math.PI * (size - 2 * sw) * k} 9999`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </svg>
      )}
      {kind === "line" && <div style={{width: size * k, height: sw, background: c(color)}} />}
    </div>
  );
};
