// B-roll (vídeo gerado) tratado para o design system: gradeado (menos saturação e brilho), escurecido com o
// fundo da marca, vinheta, faixas cobertas no topo/base e zoom lento. <OffthreadVideo> é determinístico no render.
// Os clipes tocam em velocidade 1× (24 fps desacelerado trepida); cortes internos seguem as fronteiras limpas do clipe.
import React from "react";
import {AbsoluteFill, interpolate, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig} from "remotion";
import {alpha, c, ease} from "../lib";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type Clip = {
  src: string;
  /** início no tempo local da cena (s) */
  at: number;
  /** trecho do arquivo (s) */
  srcFrom: number;
  srcTo: number;
};

export const BrollPlate: React.FC<{
  clips: Clip[];
  /** pares [tempo local, opacidade] (interpolados) */
  opacity?: [number, number][];
  /** 0–1: véu na cor do fundo por cima de tudo */
  darken?: number;
  /** faixa do topo coberta pelo fundo: sólida até `top[0]` (fração da altura) e some em `top[1]` */
  top?: [number, number];
  /** escurecimento da base (atrás da legenda): começa em `bottom` (fração da altura) */
  bottom?: number;
  /** escala no início e no fim de `zoomDur` segundos */
  zoom?: [number, number];
  zoomDur?: number;
  /** ponto fixo do zoom (fração da altura) */
  originY?: number;
  /** desloca o quadro para baixo (px) */
  shiftY?: number;
  /** instante (local) em que a imagem começa a perder a cor */
  drainAt?: number;
  saturation?: number;
  brightness?: number;
}> = ({clips, opacity = [[0, 1]], darken = 0.25, top, bottom = 0.7, zoom = [1.04, 1.1], zoomDur = 5, originY = 0.7, shiftY = 0, drainAt, saturation = 0.82, brightness = 0.78}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const op =
    opacity.length === 1 ? opacity[0][1] : interpolate(t, opacity.map((o) => o[0]), opacity.map((o) => o[1]), {...clamp, easing: ease.standard});
  if (op <= 0.001) return null;
  const z = interpolate(t, [0, zoomDur], zoom, clamp);
  const drain = drainAt === undefined ? 0 : interpolate(t, [drainAt, drainAt + 0.7], [0, 1], {...clamp, easing: ease.standard});
  const sat = saturation * (1 - drain * 0.95);
  const br = brightness * (1 - drain * 0.35);
  return (
    <AbsoluteFill style={{opacity: op}}>
      <AbsoluteFill
        style={{
          transform: `translateY(${shiftY}px) scale(${z})`,
          transformOrigin: `50% ${originY * 100}%`,
          filter: `saturate(${sat}) brightness(${br}) contrast(1.06)`,
        }}
      >
        {clips.map((cl, i) => (
          <Sequence key={i} from={Math.round(cl.at * fps)} durationInFrames={Math.max(1, Math.round((cl.srcTo - cl.srcFrom) * fps))}>
            <OffthreadVideo src={cl.src} muted trimBefore={Math.round(cl.srcFrom * fps)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
          </Sequence>
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{background: alpha("background", darken)}} />
      {top && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(to bottom, ${c("background")} 0%, ${c("background")} ${top[0] * 100}%, ${alpha("background", 0)} ${top[1] * 100}%)`,
          }}
        />
      )}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${alpha("background", 0.92)} 0%, ${alpha("background", 0.75)} ${(1 - bottom) * 55}%, ${alpha("background", 0)} ${(1 - bottom) * 100}%)`,
        }}
      />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 85% 70% at 50% 62%, ${alpha("background", 0)} 45%, ${alpha("background", 0.85)} 100%)`}} />
    </AbsoluteFill>
  );
};
