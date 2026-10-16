import {Audio} from "@remotion/media";
import React from "react";
import {interpolate, Sequence, staticFile, useVideoConfig} from "remotion";
import manifest from "../../public/sfx/manifest.json";
import {ds} from "../ds";
import type {Timeline} from "./timeline";

// Mixagem de referência (ganho linear, narração = 1):
//   narração 1.0 · efeitos ≈ tokens.sound.sfxGain (0.3–0.6) · trilha ≈ tokens.sound.musicGain (0.08–0.18), abaixando para duckTo durante a fala.

type Manifest = {sounds: Record<string, {file: string; duration: number; description?: string}>};
const sounds = (manifest as Manifest).sounds;

export const sfxNames = Object.keys(sounds);

/** URL de um efeito sonoro da biblioteca (public/sfx: gerada + sons da marca por cima). */
export const sfxUrl = (name: string) => {
  const s = sounds[name];
  if (!s) throw new Error(`Efeito "${name}" não existe. Disponíveis: ${sfxNames.join(", ")}`);
  return staticFile(`sfx/${s.file}`);
};

/** Narração principal — a referência de volume e de tempo do vídeo. */
export const Narration: React.FC<{src: string; volume?: number}> = ({src, volume = 1}) => <Audio src={src} volume={volume} />;

/**
 * Efeito sonoro em `at` segundos (tempo local da Sequence em que está).
 * Sincronize com o evento visual: o "impacto" do som deve cair no frame em que o objeto pousa/aparece.
 */
export const Sfx: React.FC<{name: string; at: number; volume?: number; rate?: number}> = ({name, at, volume = 1, rate = 1}) => {
  const {fps} = useVideoConfig();
  const s = sounds[name];
  if (!s) throw new Error(`Efeito "${name}" não existe. Disponíveis: ${sfxNames.join(", ")}`);
  const from = Math.max(0, Math.round(at * fps));
  return (
    <Sequence from={from} durationInFrames={Math.max(1, Math.ceil((s.duration / rate) * fps) + 2)} layout="none" name={`sfx:${name}`}>
      <Audio src={sfxUrl(name)} volume={ds.sound.sfxGain * volume} playbackRate={rate} />
    </Sequence>
  );
};

/** Trilha de fundo com fade in/out e ducking automático sob a fala. */
export const Music: React.FC<{src: string; tl: Timeline; volume?: number; fadeIn?: number; fadeOut?: number; loop?: boolean}> = ({
  src,
  tl,
  volume = ds.sound.musicGain,
  fadeIn = 0.8,
  fadeOut = 1.5,
  loop = true,
}) => {
  const {fps, durationInFrames} = useVideoConfig();
  const words = tl.words;
  const speaking = (t: number) => {
    // distância (s) até a palavra mais próxima — binário seria melhor, mas a lista é pequena
    let best = Infinity;
    for (const w of words) {
      const a = w.startMs / 1000;
      const b = w.endMs / 1000;
      if (t >= a && t <= b) return 0;
      best = Math.min(best, t < a ? a - t : t - b);
      if (a > t + 2) break;
    }
    return best;
  };
  return (
    <Audio
      src={src}
      loop={loop}
      volume={(f) => {
        const t = f / fps;
        const env = interpolate(speaking(t), [0, 0.15, 0.6], [ds.sound.duckTo, ds.sound.duckTo, 1], {extrapolateRight: "clamp"});
        const fade = Math.min(
          interpolate(f, [0, fadeIn * fps], [0, 1], {extrapolateRight: "clamp"}),
          interpolate(f, [durationInFrames - fadeOut * fps, durationInFrames], [1, 0], {extrapolateLeft: "clamp"}),
        );
        return volume * env * fade;
      }}
    />
  );
};
