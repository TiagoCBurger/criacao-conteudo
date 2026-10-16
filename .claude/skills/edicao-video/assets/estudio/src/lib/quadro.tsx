import {Video} from "@remotion/media";
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, useCurrentFrame} from "remotion";
import {cor} from "./estilo";
import {clipeSrc, type Clipe} from "./midia";
import type {Enquadramento, Foco} from "./tipos";

type VolumeFn = number | ((f: number) => number);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Caixa (left/top/width/height) do clipe dentro de um quadro W×H. */
export const caixaDoClipe = (W: number, H: number, cw: number, ch: number, modo: "cobrir" | "conter", z: number, foco: Foco) => {
  const s = (modo === "cobrir" ? Math.max(W / cw, H / ch) : Math.min(W / cw, H / ch)) * z;
  const dw = cw * s, dh = ch * s;
  const left = dw > W ? clamp(W / 2 - foco.x * dw, W - dw, 0) : (W - dw) / 2;
  const top = dh > H ? clamp(H / 2 - foco.y * dh, H - dh, 0) : (H - dh) / 2;
  return {left, top, width: dw, height: dh};
};

const Midia: React.FC<{
  c: Clipe;
  box: React.CSSProperties;
  trim: number;
  velocidade: number;
  volume: VolumeFn;
  mudo: boolean;
  filtro?: string | null;
  espelhar?: boolean;
}> = ({c, box, trim, velocidade, volume, mudo, filtro, espelhar}) => {
  const style: React.CSSProperties = {position: "absolute", ...box, filter: filtro ?? undefined, transform: espelhar ? "scaleX(-1)" : undefined};
  if (c.tipo === "imagem") return <Img src={clipeSrc(c)} style={{...style, objectFit: "fill"}} />;
  return <Video src={clipeSrc(c)} trimBefore={trim > 0 ? trim : undefined} playbackRate={velocidade} volume={mudo ? 0 : volume} muted={mudo} objectFit="fill" style={style} />;
};

/**
 * Um clipe ocupando um quadro W×H: enquadramento, foco, zoom ao longo do trecho, filtro.
 * `frames` é a duração do trecho (para o zoom {de, para}).
 */
export const ClipeNoQuadro: React.FC<{
  clipe: Clipe;
  largura: number;
  altura: number;
  frames: number;
  trim?: number;
  velocidade?: number;
  volume?: VolumeFn;
  mudo?: boolean;
  enquadrar?: Enquadramento;
  foco?: Foco;
  zoom?: {de: number; para: number};
  filtro?: string | null;
  espelhar?: boolean;
  fundo?: string;
}> = ({clipe: c, largura: W, altura: H, frames, trim = 0, velocidade = 1, volume = 1, mudo = false, enquadrar = "preencher", foco = {x: 0.5, y: 0.5}, zoom = {de: 1, para: 1}, filtro, espelhar, fundo = "background"}) => {
  const f = useCurrentFrame();
  const z = zoom.de === zoom.para ? zoom.de : interpolate(f, [0, Math.max(1, frames)], [zoom.de, zoom.para], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin)});
  const cw = c.largura ?? W, ch = c.altura ?? H;
  if (enquadrar === "desfocar") {
    const bg = caixaDoClipe(W, H, cw, ch, "cobrir", 1.12, {x: 0.5, y: 0.5});
    const fg = caixaDoClipe(W, H, cw, ch, "conter", z, foco);
    return (
      <AbsoluteFill style={{background: cor(fundo), overflow: "hidden"}}>
        <AbsoluteFill style={{filter: "blur(38px) brightness(0.55) saturate(1.15)"}}>
          <Midia c={c} box={bg} trim={trim} velocidade={velocidade} volume={0} mudo />
        </AbsoluteFill>
        <Midia c={c} box={fg} trim={trim} velocidade={velocidade} volume={volume} mudo={mudo} filtro={filtro} espelhar={espelhar} />
      </AbsoluteFill>
    );
  }
  const box = caixaDoClipe(W, H, cw, ch, enquadrar === "ajustar" ? "conter" : "cobrir", z, foco);
  return (
    <AbsoluteFill style={{background: cor(fundo), overflow: "hidden"}}>
      <Midia c={c} box={box} trim={trim} velocidade={velocidade} volume={volume} mudo={mudo} filtro={filtro} espelhar={espelhar} />
    </AbsoluteFill>
  );
};
