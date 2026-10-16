import {fade} from "@remotion/transitions/fade";
import {iris} from "@remotion/transitions/iris";
import {slide} from "@remotion/transitions/slide";
import {wipe} from "@remotion/transitions/wipe";
import type {TransitionPresentation, TransitionPresentationComponentProps} from "@remotion/transitions";
import React from "react";
import {AbsoluteFill} from "remotion";
import type {Direcao, TipoTransicao} from "./tipos";

// Transições em CSS (sem WebGL): rodam em qualquer máquina, inclusive sem GPU.

/** Mergulho numa cor: a cena sai para a cor e a próxima nasce dela. */
const Mergulho: React.FC<TransitionPresentationComponentProps<{cor: string; brilho: boolean}>> = ({children, presentationDirection, presentationProgress: p, passedProps}) => {
  if (presentationDirection === "exiting") {
    const k = Math.min(1, p * 2);
    return (
      <AbsoluteFill style={{background: passedProps.cor}}>
        <AbsoluteFill style={{opacity: 1 - k, filter: passedProps.brilho ? `brightness(${1 + k * 1.5})` : undefined}}>{children}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const k = Math.max(0, p * 2 - 1);
  return <AbsoluteFill style={{opacity: k, filter: passedProps.brilho ? `brightness(${1 + (1 - k) * 1.5})` : undefined}}>{children}</AbsoluteFill>;
};

/** Zoom: a cena que sai avança para a câmera, a que entra chega de perto e assenta. */
const Zoom: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({children, presentationDirection, presentationProgress: p}) => {
  const e = 1 - Math.pow(1 - p, 3);
  if (presentationDirection === "exiting") return <AbsoluteFill style={{transform: `scale(${1 + e * 0.35})`, opacity: 1 - e}}>{children}</AbsoluteFill>;
  return <AbsoluteFill style={{transform: `scale(${1.3 - e * 0.3})`, opacity: Math.min(1, e * 1.6)}}>{children}</AbsoluteFill>;
};

/** Cruzamento com desfoque. */
const Desfoque: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({children, presentationDirection, presentationProgress: p}) => {
  if (presentationDirection === "exiting") return <AbsoluteFill style={{filter: `blur(${p * 24}px)`}}>{children}</AbsoluteFill>;
  return <AbsoluteFill style={{opacity: p, filter: `blur(${(1 - p) * 24}px)`}}>{children}</AbsoluteFill>;
};

const dirSlide = (d: Direcao) => ({esquerda: "from-right", direita: "from-left", cima: "from-bottom", baixo: "from-top"} as const)[d];

/** Apresentação do @remotion/transitions para um tipo de transição da edição. */
export const apresentacao = (tipo: TipoTransicao, direcao: Direcao, w: number, h: number): TransitionPresentation<any> => {
  switch (tipo) {
    case "cruzar":
      return fade();
    case "preto":
      return {component: Mergulho, props: {cor: "#000", brilho: false}};
    case "branco":
      return {component: Mergulho, props: {cor: "#fff", brilho: false}};
    case "flash":
      return {component: Mergulho, props: {cor: "#fff", brilho: true}};
    case "deslizar":
      return slide({direction: dirSlide(direcao)});
    case "limpar":
      return wipe({direction: dirSlide(direcao)});
    case "zoom":
      return {component: Zoom, props: {}};
    case "desfoque":
      return {component: Desfoque, props: {}};
    case "iris":
      return iris({width: w, height: h});
    default:
      return fade();
  }
};
