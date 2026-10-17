// Tipografia de placar em 2D (HTML): o texto na fonte display vira matriz de pontos de LED
// (máscara de pontos) com brilho por baixo. Mesma linguagem do placar 3D, mas nítida para contas.
import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {alpha, c, ds, ease, lerp, type, useSafe} from "../lib";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export const LedType: React.FC<{
  children: React.ReactNode;
  size: number;
  color?: string;
  /** 0–1: intensidade do brilho */
  glow?: number;
  style?: React.CSSProperties;
}> = ({children, size, color = "accent", glow = 1, style}) => {
  const dot = Math.max(6, Math.round(size / 17));
  const col = c(color);
  const mask = `radial-gradient(circle at center, #000 0 38%, transparent 47%)`;
  return (
    <div style={{position: "relative", display: "inline-block", whiteSpace: "nowrap", ...type("display", size, {color: col, lineHeight: 1}), ...style}}>
      <span aria-hidden style={{position: "absolute", inset: 0, filter: `blur(${size * 0.09}px)`, opacity: 0.55 * glow}}>
        {children}
      </span>
      <span
        style={{
          position: "relative",
          display: "inline-block",
          WebkitMaskImage: mask,
          maskImage: mask,
          WebkitMaskSize: `${dot}px ${dot}px`,
          maskSize: `${dot}px ${dot}px`,
          textShadow: `0 0 ${size * 0.04}px ${alpha(color, 0.9)}`,
        }}
      >
        {children}
      </span>
    </div>
  );
};

/** Close no painel: pontos de LED apagados, esmaecendo para as bordas. */
export const LedPanel: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const mask = "radial-gradient(ellipse 70% 55% at 50% 45%, #000 35%, transparent 80%)";
  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundImage: `radial-gradient(circle, ${alpha("surfaceAlt", 0.95)} 0 2.2px, transparent 2.8px)`,
        backgroundSize: "15px 15px",
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
};

const nf = (v: number, dec = 0) => new Intl.NumberFormat("pt-BR", {minimumFractionDigits: dec, maximumFractionDigits: dec}).format(v);

/**
 * A conta do ponto de equilíbrio montada com a fala, em duas "páginas" de fita:
 *   22.000 ÷ 12,88 = 1.709 /mês   →   1.709 ÷ 30 dias = 57 /dia
 */
export const ContaPlacar: React.FC<{
  at22: number;
  atDiv: number;
  at1709: number;
  atMes: number;
  at57: number;
  atEmpate: number;
}> = ({at22, atDiv, at1709, atMes, at57, atEmpate}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const t = frame / fps;
  const tw = (a: number, d = ds.motion.duration.base) => interpolate(t, [a, a + d], [0, 1], {...clamp, easing: ease.enter});
  const out = (a: number, d = ds.motion.duration.fast) => interpolate(t, [a, a + d], [0, 1], {...clamp, easing: ease.exit});

  const shift = atMes + 0.5; // virada de página: depois de "pedidos no mês"
  const pg = interpolate(t, [shift + 0.05, shift + 0.7], [0, 1], {...clamp, easing: ease.standard});
  const n1709 = Math.round(1709 * interpolate(t, [at1709, at1709 + 0.9], [0, 1], {...clamp, easing: ease.enter}));
  const e22 = tw(at22);
  const eDiv = tw(atDiv);
  const eRule1 = tw(at1709 - 0.1, 0.45);
  const e1709 = tw(at1709, 0.4);
  const eMes = tw(atMes);
  const eDiv30 = tw(shift + 0.5, 0.4); // entra depois que o 1.709 já subiu (não cruzam)
  const eRule2 = tw(at57 - 0.25, 0.4);
  const e57 = interpolate(t, [at57, at57 + 0.5], [0, 1], {...clamp, easing: ease.enter});
  const pop57 = Math.sin(interpolate(t, [at57 + 0.1, at57 + 0.55], [0, 1], clamp) * Math.PI) * 0.06;
  const eEmp = interpolate(t, [atEmpate, atEmpate + 0.28], [0, 1], {...clamp, easing: ease.enter});
  const dimTop = interpolate(t, [at57, at57 + 0.6], [1, 0.45], clamp);
  // as linhas de cima saem antes de o resultado subir (com fala rápida a virada de página fica curta)
  const leave1 = out(shift - 0.2, 0.28);

  const top = s.top + 80; // abaixo do selo "exemplo"
  const y = (v: number) => top + v;
  const row = (yy: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    position: "absolute",
    left: 0,
    right: 0,
    top: yy,
    display: "flex",
    justifyContent: "center",
    alignItems: "baseline",
    gap: 22,
    ...extra,
  });
  const label = (op: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    ...type("body", "small", {color: c("textMuted"), letterSpacing: "0.02em"}),
    opacity: op,
    ...extra,
  });
  const ruleW = 560;
  // operador em traço sólido (em pontos de LED o "÷" se confunde com "+")
  const op = (px: number): React.CSSProperties => ({...type("body", px * 0.62, {color: c("textMuted"), lineHeight: 1}), fontWeight: 800, marginRight: 6});
  // 1.709 viaja da página 1 (grande, em foco) para o topo da página 2 (menor, apoio)
  const y1709 = lerp(y(470), y(10), pg);
  const s1709 = lerp(1, 0.6, pg);
  const c1709 = pg > 0.5 ? "text" : "accent";

  return (
    <AbsoluteFill>
      <LedPanel />
      {/* página 1 */}
      <div style={{...row(y(20)), opacity: e22 * (1 - leave1), transform: `translateY(${(1 - e22) * 40 - leave1 * 80}px)`}}>
        <LedType size={150} color="text" glow={0.6}>
          22.000
        </LedType>
      </div>
      <div style={{...row(y(200)), opacity: eDiv * (1 - leave1), transform: `translateY(${(1 - eDiv) * 40 - leave1 * 80}px)`}}>
        <span style={op(150)}>÷</span>
        <LedType size={150} color="text" glow={0.6}>
          12,88
        </LedType>
      </div>
      <div
        style={{
          position: "absolute",
          top: y(395),
          left: (s.width - ruleW) / 2,
          width: ruleW,
          height: 6,
          background: c("textMuted"),
          transformOrigin: "center",
          transform: `scaleX(${eRule1})`,
          opacity: 0.7 * (1 - leave1),
        }}
      />
      {/* resultado do mês (viaja para o topo) */}
      <div style={{...row(y1709), opacity: e1709 * lerp(1, dimTop, pg), transform: `scale(${s1709 * (0.9 + 0.1 * e1709)})`, transformOrigin: "50% 0%"}}>
        <LedType size={220} color={c1709} glow={pg > 0.5 ? 0.5 : 1}>
          {nf(n1709)}
        </LedType>
      </div>
      <div style={{...row(lerp(y(700), y(150), pg)), ...label(eMes * lerp(1, dimTop, pg))}}>pedidos por mês</div>
      {/* página 2 */}
      <div style={{...row(y(250)), opacity: eDiv30 * dimTop, transform: `translateY(${(1 - eDiv30) * 40}px)`}}>
        <span style={op(130)}>÷</span>
        <LedType size={130} color="text" glow={0.6}>
          30
        </LedType>
        <span style={label(1, {fontSize: ds.typography.scale.body})}>dias</span>
      </div>
      <div
        style={{
          position: "absolute",
          top: y(420),
          left: (s.width - ruleW) / 2,
          width: ruleW,
          height: 6,
          background: c("textMuted"),
          transform: `scaleX(${eRule2})`,
          opacity: 0.7,
        }}
      />
      <div style={{...row(y(455)), opacity: e57, transform: `scale(${lerp(0.82, 1, e57) + pop57})`, transformOrigin: "50% 50%"}}>
        <LedType size={ds.typography.scale.hero * 1.25} color="accent">
          57
        </LedType>
      </div>
      <div style={{...row(y(455 + ds.typography.scale.hero * 1.25 + 10)), ...label(e57)}}>pedidos por dia</div>
      {/* carimbo */}
      <div style={{...row(y(455 + ds.typography.scale.hero * 1.25 + 90)), opacity: eEmp}}>
        <div
          style={{
            ...type("display", "h3", {color: c("negative")}),
            padding: "10px 26px 6px",
            border: `5px solid ${c("negative")}`,
            transform: `rotate(-5deg) scale(${lerp(1.5, 1, eEmp)})`,
          }}
        >
          Só pra empatar
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// Prancheta do técnico (giz branco sobre placa escura)
// ---------------------------------------------------------------------------------------------
const ChalkDefs: React.FC = () => (
  <svg width={0} height={0} style={{position: "absolute"}}>
    <filter id="giz" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={4} xChannelSelector="R" yChannelSelector="G" result="d" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.6 1.45" result="grao" />
      <feComposite in="d" in2="grao" operator="in" />
    </filter>
  </svg>
);

/** Traço de giz que se desenha. */
const ChalkPath: React.FC<{d: string; at: number; dur?: number; color?: string; width?: number; dash?: string}> = ({d, at, dur = 0.5, color = "text", width = 7, dash}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(frame / fps, [at, at + dur], [0, 1], {...clamp, easing: ease.standard});
  if (p <= 0) return null;
  return (
    <path
      d={d}
      fill="none"
      stroke={c(color)}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={dash ? undefined : "1 1"}
      strokeDashoffset={dash ? undefined : 1 - p}
      style={dash ? {opacity: p} : undefined}
    />
  );
};

/** Texto de giz "escrito" da esquerda para a direita. */
const ChalkText: React.FC<{children: React.ReactNode; at: number; style: React.CSSProperties; dur?: number}> = ({children, at, style, dur = 0.45}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(frame / fps, [at, at + dur], [0, 1], {...clamp, easing: ease.standard});
  return <div style={{...style, clipPath: `inset(-10% ${(1 - p) * 100}% -10% -2%)`, filter: "url(#giz)"}}>{children}</div>;
};

export type Jogada = {label: string; value: string; dir: "up" | "down"; at: number};

export const Prancheta: React.FC<{enterAt?: number; diagramAt: number; plays: Jogada[]}> = ({enterAt = 0, diagramAt, plays}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const t = frame / fps;
  const p = interpolate(t, [enterAt, enterAt + 0.8], [0, 1], {...clamp, easing: ease.enter});
  const W = 820;
  const Hh = 1000;
  const chalk = c("text");
  const drift = Math.sin(t * 0.6) * 0.6;
  const rowY = (i: number) => 300 + i * 225;
  return (
    <AbsoluteFill style={{alignItems: "center", paddingTop: s.top + 70, paddingRight: s.right - s.left}}>
      <ChalkDefs />
      <div
        style={{
          position: "relative",
          width: W,
          height: Hh,
          background: c("surface"),
          border: `16px solid ${c("surfaceAlt")}`,
          boxShadow: `0 40px 90px ${alpha("background", 0.9)}, inset 0 0 120px ${alpha("background", 0.55)}`,
          transform: `perspective(1800px) rotateX(${lerp(18, 5, p)}deg) rotateZ(${-1.2 + drift * 0.3}deg) translateY(${(1 - p) * 120}px)`,
          opacity: p,
        }}
      >
        {/* presilha */}
        <div style={{position: "absolute", top: -46, left: W / 2 - 130, width: 260, height: 64, background: c("primary"), boxShadow: `0 10px 24px ${alpha("background", 0.7)}`}} />
        <div style={{position: "absolute", top: -30, left: W / 2 - 60, width: 120, height: 22, background: c("secondary")}} />
        {/* campo apagado + esquema tático */}
        <svg width={W - 32} height={260} viewBox="0 0 828 340" style={{position: "absolute", left: 0, top: 24, filter: "url(#giz)"}}>
          <g opacity={0.22}>
            <rect x={40} y={20} width={748} height={300} fill="none" stroke={chalk} strokeWidth={4} />
            <line x1={414} y1={20} x2={414} y2={320} stroke={chalk} strokeWidth={4} />
            <circle cx={414} cy={170} r={60} fill="none" stroke={chalk} strokeWidth={4} />
          </g>
          {/* O = você, X = boletos; a jogada contorna a defesa */}
          {[
            [180, 110],
            [180, 240],
            [300, 175],
          ].map(([x, yy], i) => (
            <circle key={`o${i}`} cx={x} cy={yy} r={20} fill="none" stroke={chalk} strokeWidth={6} opacity={interpolate(t, [diagramAt + i * 0.08, diagramAt + i * 0.08 + 0.2], [0, 0.9], clamp)} />
          ))}
          {[
            [520, 120],
            [560, 230],
          ].map(([x, yy], i) => (
            <g key={`x${i}`} opacity={interpolate(t, [diagramAt + 0.25 + i * 0.08, diagramAt + 0.45 + i * 0.08], [0, 0.75], clamp)} stroke={c("negative")} strokeWidth={6} strokeLinecap="round">
              <line x1={x - 17} y1={yy - 17} x2={x + 17} y2={yy + 17} />
              <line x1={x + 17} y1={yy - 17} x2={x - 17} y2={yy + 17} />
            </g>
          ))}
          <ChalkPath d="M 320 175 C 420 175, 450 300, 600 290 S 700 180, 690 120" at={diagramAt + 0.4} dur={0.8} color="positive" width={7} />
          <ChalkPath d="M 668 136 L 690 112 L 708 140" at={diagramAt + 1.15} dur={0.2} color="positive" width={7} />
        </svg>
        {/* as três jogadas */}
        {plays.map((pl, i) => {
          const y0 = rowY(i);
          const arrow = pl.dir === "up" ? "M 45 92 L 45 16 M 18 42 L 45 14 L 72 42" : "M 45 14 L 45 90 M 18 64 L 45 92 L 72 64";
          const lineP = interpolate(t, [pl.at + 0.35, pl.at + 0.7], [0, 1], clamp);
          return (
            <div key={i} style={{position: "absolute", left: 50, right: 40, top: y0, height: 215}}>
              <svg width={90} height={110} style={{position: "absolute", left: 0, top: 84, filter: "url(#giz)"}}>
                <ChalkPath d={arrow} at={pl.at} dur={0.35} color="positive" width={9} />
              </svg>
              <ChalkText at={pl.at + 0.1} style={{position: "absolute", left: 120, top: 0, ...type("display", "h3", {color: alpha("text", 0.72), letterSpacing: "0.08em"})}}>
                {pl.label}
              </ChalkText>
              <ChalkText at={pl.at + 0.28} style={{position: "absolute", left: 116, top: 78, ...type("display", "h1", {color: chalk})}}>
                {pl.value}
              </ChalkText>
              <div style={{position: "absolute", left: 120, right: 0, top: 214, height: 3, background: alpha("text", 0.12), transform: `scaleX(${lineP})`, transformOrigin: "left"}} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// Prancheta com checklist (cada item se risca com a fala) + uma jogada alternativa ("ou …")
// ---------------------------------------------------------------------------------------------
export const PranchetaChecklist: React.FC<{
  enterAt?: number;
  diagramAt: number;
  items: {label: string; at: number}[];
  or?: {label: string; at: number; orAt: number};
  header?: {text: string; at: number};
}> = ({enterAt = 0, diagramAt, items, or, header}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const t = frame / fps;
  const p = interpolate(t, [enterAt, enterAt + 0.8], [0, 1], {...clamp, easing: ease.enter});
  const W = 820;
  const Hh = 1000;
  const chalk = c("text");
  const drift = Math.sin(t * 0.6) * 0.6;
  const rowY = (i: number) => 380 + i * 140;
  const orY = rowY(items.length) + 5;
  return (
    <AbsoluteFill style={{alignItems: "center", paddingTop: s.top + 70, paddingRight: s.right - s.left}}>
      <ChalkDefs />
      <div
        style={{
          position: "relative",
          width: W,
          height: Hh,
          background: c("surface"),
          border: `16px solid ${c("surfaceAlt")}`,
          boxShadow: `0 40px 90px ${alpha("background", 0.9)}, inset 0 0 120px ${alpha("background", 0.55)}`,
          transform: `perspective(1800px) rotateX(${lerp(18, 5, p)}deg) rotateZ(${-1.2 + drift * 0.3}deg) translateY(${(1 - p) * 120}px)`,
          opacity: p,
        }}
      >
        <div style={{position: "absolute", top: -46, left: W / 2 - 130, width: 260, height: 64, background: c("primary"), boxShadow: `0 10px 24px ${alpha("background", 0.7)}`}} />
        <div style={{position: "absolute", top: -30, left: W / 2 - 60, width: 120, height: 22, background: c("secondary")}} />
        <svg width={W - 32} height={260} viewBox="0 0 828 340" style={{position: "absolute", left: 0, top: 24, filter: "url(#giz)"}}>
          <g opacity={0.22}>
            <rect x={40} y={20} width={748} height={300} fill="none" stroke={chalk} strokeWidth={4} />
            <line x1={414} y1={20} x2={414} y2={320} stroke={chalk} strokeWidth={4} />
            <circle cx={414} cy={170} r={60} fill="none" stroke={chalk} strokeWidth={4} />
          </g>
          {[
            [180, 110],
            [180, 240],
            [300, 175],
          ].map(([x, yy], i) => (
            <circle key={`o${i}`} cx={x} cy={yy} r={20} fill="none" stroke={chalk} strokeWidth={6} opacity={interpolate(t, [diagramAt + i * 0.08, diagramAt + i * 0.08 + 0.2], [0, 0.9], clamp)} />
          ))}
          {[
            [520, 120],
            [560, 230],
          ].map(([x, yy], i) => (
            <g key={`x${i}`} opacity={interpolate(t, [diagramAt + 0.25 + i * 0.08, diagramAt + 0.45 + i * 0.08], [0, 0.75], clamp)} stroke={c("negative")} strokeWidth={6} strokeLinecap="round">
              <line x1={x - 17} y1={yy - 17} x2={x + 17} y2={yy + 17} />
              <line x1={x + 17} y1={yy - 17} x2={x - 17} y2={yy + 17} />
            </g>
          ))}
        </svg>
        {header && (
          <ChalkText at={header.at} dur={0.5} style={{position: "absolute", left: 60, top: 290, ...type("display", "h3", {color: alpha("text", 0.72), letterSpacing: "0.08em"})}}>
            {header.text}
          </ChalkText>
        )}
        {items.map((it, i) => (
          <div key={i} style={{position: "absolute", left: 60, right: 40, top: rowY(i), height: 130}}>
            <svg width={110} height={110} style={{position: "absolute", left: 0, top: 10, filter: "url(#giz)"}}>
              <ChalkPath d="M 12 12 L 92 12 L 92 92 L 12 92 Z" at={it.at - 0.05} dur={0.3} color="text" width={6} />
              <ChalkPath d="M 26 54 L 46 76 L 98 8" at={it.at + 0.2} dur={0.3} color="positive" width={10} />
            </svg>
            <ChalkText at={it.at + 0.05} style={{position: "absolute", left: 140, top: 14, ...type("display", "h2", {color: chalk})}}>
              {it.label}
            </ChalkText>
          </div>
        ))}
        {or && (
          <>
            <div style={{position: "absolute", left: 60, right: 40, top: orY, display: "flex", alignItems: "center", gap: 24, opacity: interpolate(t, [or.orAt, or.orAt + 0.3], [0, 1], clamp)}}>
              <div style={{flex: 1, height: 3, background: alpha("text", 0.25)}} />
              <div style={{...type("display", "h3", {color: alpha("text", 0.7), letterSpacing: "0.1em"}), filter: "url(#giz)"}}>ou</div>
              <div style={{flex: 1, height: 3, background: alpha("text", 0.25)}} />
            </div>
            <div style={{position: "absolute", left: 60, right: 40, top: orY + 80, height: 170}}>
              <svg width={150} height={150} style={{position: "absolute", left: 0, top: 6, filter: "url(#giz)"}}>
                <ChalkPath d="M 14 120 C 30 50, 80 30, 128 34" at={or.at} dur={0.4} color="positive" width={9} />
                <ChalkPath d="M 104 14 L 132 34 L 108 60" at={or.at + 0.35} dur={0.2} color="positive" width={9} />
              </svg>
              <ChalkText at={or.at + 0.15} style={{position: "absolute", left: 170, top: 0, ...type("display", "h1", {color: chalk})}}>
                {or.label}
              </ChalkText>
            </div>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// Selo "exemplo" (números ilustrativos): pequeno, texto suave, canto superior esquerdo — como o
// selo de "simulação" de uma transmissão. Janelas em segundos ABSOLUTOS, calculadas da fala.
// ---------------------------------------------------------------------------------------------
export const SeloExemplo: React.FC<{windows: [number, number][]}> = ({windows}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const t = frame / fps;
  const op = Math.max(0, ...windows.map(([a, b]) => Math.min(interpolate(t, [a, a + 0.3], [0, 1], clamp), interpolate(t, [b - 0.3, b], [1, 0], clamp))));
  if (op <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: s.top,
        left: s.left,
        opacity: op,
        ...type("body", "label", {color: c("textMuted"), textTransform: "uppercase", letterSpacing: "0.14em", lineHeight: 1}),
        padding: "10px 16px 9px",
        border: `2px solid ${alpha("textMuted", 0.45)}`,
      }}
    >
      exemplo
    </div>
  );
};
