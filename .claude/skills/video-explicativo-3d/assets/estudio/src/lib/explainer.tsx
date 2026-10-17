import React from "react";
import {AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig} from "remotion";
import {c, ds} from "../ds";
import {Music, Narration, Sfx} from "./audio";
import {Captions} from "./captions";
import {Stage, Watermark} from "./layout";
import {ease} from "./motion";
import {type Beat, type Timeline, TimelineProvider} from "./timeline";

// <Explainer> monta o vídeo inteiro a partir da narração:
//   fundo contínuo da marca → cenas ancoradas nos beats (com transição) → legendas → marca → áudio.
// O fundo NÃO troca entre cenas: continuidade é o que faz o vídeo parecer uma peça só.

export type TransitionType = "fade" | "slide" | "push" | "zoom" | "wipe" | "blur" | "cut";

export type SceneDef = {
  beat: Beat;
  component: React.FC;
  /** transição de ENTRADA desta cena (padrão: tokens.motion.transition) */
  transition?: TransitionType;
  /** som da transição (padrão: tokens.sound.transitionSfx); null = sem som */
  transitionSfx?: string | null;
};

export const Explainer: React.FC<{
  tl: Timeline;
  audio: string;
  scenes: SceneDef[];
  music?: string;
  /** efeitos em tempo ABSOLUTO (s). Dentro das cenas, prefira <Sfx> com tempo local. */
  sfx?: {name: string; at: number; volume?: number}[];
  /** camada contínua por baixo das cenas (ex.: um objeto 3D que atravessa o vídeo todo) */
  under?: React.ReactNode;
  /** camada contínua por cima das cenas (abaixo das legendas) */
  over?: React.ReactNode;
  captions?: boolean;
  hideCaptions?: [number, number][];
}> = ({tl, audio, scenes, music, sfx = [], under, over, captions = true, hideCaptions}) => {
  const {fps} = useVideoConfig();
  const T = Math.round(ds.motion.transition.duration * fps);
  return (
    <AbsoluteFill>
      <Stage />
      {under}
      {scenes.map((s, i) => {
        const from = Math.round(s.beat.start * fps);
        const until = Math.round(s.beat.end * fps);
        const last = i === scenes.length - 1;
        const type = i === 0 ? "cut" : s.transition ?? ds.motion.transition.type;
        const nextType = last ? "cut" : scenes[i + 1].transition ?? ds.motion.transition.type;
        const C = s.component;
        return (
          <Sequence key={s.beat.id} from={from} durationInFrames={Math.max(1, until - from + (last ? 0 : T))} name={`cena:${s.beat.id}`}>
            <TimelineProvider tl={tl} beat={s.beat}>
              <SceneTransition enterType={type} exitType={nextType} T={T} exitAt={until - from}>
                <C />
              </SceneTransition>
            </TimelineProvider>
          </Sequence>
        );
      })}
      {over}
      {captions && <Captions tl={tl} hide={hideCaptions} />}
      <Watermark />
      <Narration src={audio} />
      {music && <Music src={music} tl={tl} />}
      {scenes.map((s, i) => {
        const name = s.transitionSfx === undefined ? ds.sound.transitionSfx : s.transitionSfx;
        if (i === 0 || !name) return null;
        return <Sfx key={`tsfx-${i}`} name={name} at={Math.max(0, s.beat.start - 0.12)} volume={0.8} />;
      })}
      {sfx.map((x, i) => (
        <Sfx key={`sfx-${i}`} name={x.name} at={x.at} volume={x.volume} />
      ))}
    </AbsoluteFill>
  );
};

/** Aplica a transição de entrada nos primeiros T frames e a de saída a partir de exitAt. */
const SceneTransition: React.FC<{children: React.ReactNode; enterType: TransitionType; exitType: TransitionType; T: number; exitAt: number}> = ({
  children,
  enterType,
  exitType,
  T,
  exitAt,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  // Transições de opacidade são escalonadas: quem sai some nos primeiros ~60% da janela e quem entra
  // aparece a partir de ~25% — evita duas cenas cheias sobrepostas (texto sobre 3D) no meio do corte.
  // "push" e "wipe" são espaciais e ficam simultâneas.
  const spatialIn = enterType === "push" || enterType === "wipe";
  const spatialOut = exitType === "push" || exitType === "wipe";
  const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
  const pin = enterType === "cut" ? 1 : interpolate(frame, [spatialIn ? 0 : T * 0.25, T], [0, 1], {...clamp, easing: ease.enter});
  const pout =
    exitType === "cut"
      ? frame >= exitAt
        ? 1
        : 0
      : interpolate(frame, [exitAt, exitAt + (spatialOut ? T : T * 0.6)], [0, 1], {...clamp, easing: ease.exit});
  const st: React.CSSProperties = {};
  const tf: string[] = [];
  let opacity = 1;
  // entrada
  switch (enterType) {
    case "fade":
      opacity *= pin;
      break;
    case "slide":
      opacity *= pin;
      tf.push(`translateY(${(1 - pin) * height * 0.12}px)`);
      break;
    case "push":
      tf.push(`translateY(${(1 - pin) * height}px)`);
      break;
    case "zoom":
      opacity *= pin;
      tf.push(`scale(${1.18 - 0.18 * pin})`);
      break;
    case "blur":
      opacity *= pin;
      st.filter = `blur(${(1 - pin) * 28}px)`;
      break;
    case "wipe":
      st.clipPath = `circle(${pin * 120}% at 50% 50%)`;
      break;
  }
  // saída
  switch (exitType) {
    case "cut":
      if (pout >= 1) opacity = 0;
      break;
    case "fade":
      opacity *= 1 - pout;
      break;
    case "wipe": {
      // a cena que sai ganha um furo do mesmo tamanho do círculo da que entra (mesma curva), senão as duas
      // aparecem sobrepostas dentro do círculo (as cenas têm fundo transparente)
      const pNext = interpolate(frame, [exitAt, exitAt + T], [0, 1], {...clamp, easing: ease.enter});
      if (pNext > 0) {
        const r = pNext * 1.2 * (Math.hypot(width, height) / Math.SQRT2);
        st.maskImage = `radial-gradient(circle at 50% 50%, transparent ${r}px, black ${r + 1}px)`;
        st.WebkitMaskImage = st.maskImage;
      }
      break;
    }
    case "slide":
      opacity *= 1 - pout;
      tf.push(`translateY(${-pout * height * 0.1}px)`);
      break;
    case "push":
      tf.push(`translateY(${-pout * height}px)`);
      break;
    case "zoom":
      opacity *= 1 - pout;
      tf.push(`scale(${1 - pout * 0.12})`);
      break;
    case "blur":
      opacity *= 1 - pout;
      st.filter = `${st.filter ?? ""} blur(${pout * 28}px)`;
      break;
  }
  const scene = <AbsoluteFill style={{...st, opacity, transform: tf.join(" ") || undefined}}>{children}</AbsoluteFill>;
  if (enterType !== "wipe" || pin <= 0 || pin >= 1) return scene;
  // borda do círculo no acento: deixa o wipe legível como movimento, mesmo quando a cena nova ainda está vazia
  const r = pin * 1.2 * (Math.hypot(width, height) / Math.SQRT2);
  return (
    <>
      {scene}
      <div
        style={{
          position: "absolute",
          left: width / 2 - r,
          top: height / 2 - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          border: `${Math.round(width * 0.012)}px solid ${c("accent")}`,
          opacity: 1 - pin,
          pointerEvents: "none",
        }}
      />
    </>
  );
};
