import {noise2D} from "@remotion/noise";
import type {CSSProperties} from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {ds} from "../ds";

// Toda animação é função do frame. Nada de CSS transition/animation, setTimeout ou relógio do three.js:
// o render é feito frame a frame, fora de ordem e em paralelo — só o frame é confiável.

export const ease = {
  standard: Easing.bezier(...ds.motion.easing.standard),
  enter: Easing.bezier(...ds.motion.easing.enter),
  exit: Easing.bezier(...ds.motion.easing.exit),
  linear: Easing.linear,
};

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Converte segundos em frames no fps atual. */
export const useSec = () => {
  const {fps} = useVideoConfig();
  return (s: number) => Math.round(s * fps);
};

/** Tempo local (segundos) dentro da Sequence atual. */
export const useTime = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return frame / fps;
};

type SpringName = keyof typeof ds.motion.spring;

/**
 * Progresso 0→1 de entrada com a mola do design system, começando `delay` segundos após o início da cena.
 * "enter" = padrão elegante; "pop" = com overshoot para elementos pequenos; "soft" = lento e macio.
 */
export const useEnter = (delay = 0, opts: {spring?: SpringName; duration?: number} = {}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({
    frame: frame - Math.round(delay * fps),
    fps,
    config: ds.motion.spring[opts.spring ?? "enter"],
    durationInFrames: opts.duration ? Math.round(opts.duration * fps) : undefined,
  });
};

/** Progresso 0→1 entre `start` e `start + duration` (segundos) com a curva do design system. */
export const useTween = (start: number, duration: number = ds.motion.duration.base, easing = ease.standard) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = start * fps;
  return interpolate(frame, [s, s + Math.max(1, duration * fps)], [0, 1], {...clamp, easing});
};

/** Progresso 0→1 de saída a partir de `at` segundos. Use `1 - exit` para multiplicar opacidade/escala. */
export const useExit = (at: number | undefined, duration: number = ds.motion.duration.fast) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (at === undefined) return 0;
  const s = at * fps;
  return interpolate(frame, [s, s + Math.max(1, duration * fps)], [0, 1], {...clamp, easing: ease.exit});
};

/** Atraso do item i numa sequência (segundos). */
export const stagger = (i: number, base = 0, step = ds.motion.stagger) => base + i * step;

/** Movimento contínuo, suave e determinístico — evita quadros "congelados". */
export const useDrift = (seed: string, amount = 1, speed = 0.18) => {
  const t = useTime();
  return {
    x: noise2D(seed + "x", t * speed, 0) * amount,
    y: noise2D(seed + "y", 0, t * speed) * amount,
    r: noise2D(seed + "r", t * speed, t * speed) * amount,
  };
};

export type RevealPreset = "rise" | "fall" | "fade" | "scale" | "pop" | "blur" | "left" | "right" | "mask";

/** Estilo CSS de entrada para um progresso p (0→1) e saída e (0→1). */
export const revealStyle = (p: number, preset: RevealPreset = "rise", e = 0, distance = 60): CSSProperties => {
  const vis = Math.min(1, Math.max(0, p)) * (1 - e);
  const inv = 1 - p;
  switch (preset) {
    case "fade":
      return {opacity: vis};
    case "scale":
      return {opacity: vis, transform: `scale(${lerp(0.86, 1, p) - e * 0.06})`};
    case "pop":
      return {opacity: Math.min(1, p * 2) * (1 - e), transform: `scale(${p * (1 - e * 0.3)})`};
    case "blur":
      return {opacity: vis, filter: `blur(${inv * 18 + e * 12}px)`, transform: `scale(${lerp(1.06, 1, p)})`};
    case "left":
      return {opacity: vis, transform: `translateX(${-inv * distance - e * distance * 0.5}px)`};
    case "right":
      return {opacity: vis, transform: `translateX(${inv * distance + e * distance * 0.5}px)`};
    case "fall":
      return {opacity: vis, transform: `translateY(${-inv * distance + e * distance * 0.5}px)`};
    case "mask":
      return {clipPath: `inset(${inv * 100}% 0 0 0)`, opacity: 1 - e, transform: `translateY(${inv * distance * 0.4}px)`};
    case "rise":
    default:
      return {opacity: vis, transform: `translateY(${inv * distance - e * distance * 0.5}px)`};
  }
};
