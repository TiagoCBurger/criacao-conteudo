import {Audio} from "@remotion/media";
import React, {useMemo} from "react";
import {interpolate, Sequence, staticFile, useVideoConfig} from "remotion";
import {estilo} from "./estilo";
import {clipeSrc} from "./midia";
import {sfxInfo, type Plano} from "./resolver";

// Mixagem de referência (ganho linear): fala dos clipes normalizada em −16 LUFS = 1 · efeitos ≈ sound.sfxGain
// · trilha ≈ sound.musicGain, abaixando para sound.duckTo enquanto há fala. O render masteriza em −14 LUFS.

/** Envelope de fade final (multiplica todo o áudio). */
export const fadeFinalGain = (f: number, plano: Plano) =>
  plano.fadeFinal ? interpolate(f, [plano.frames - plano.fadeFinal, plano.frames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 1;

export const Sons: React.FC<{plano: Plano}> = ({plano}) => (
  <>
    {plano.sons.map((s, i) => {
      const src = s.src.sfx ? staticFile(`sfx/${sfxInfo(s.src.sfx).file}`) : clipeSrc(s.src.clipe!);
      const ganho = s.src.sfx ? estilo.sound.sfxGain : s.src.clipe?.ganho ?? 1;
      return (
        <Sequence key={i} from={s.inicio} durationInFrames={s.frames} layout="none" name={`som:${s.src.sfx ?? s.src.clipe?.id}`}>
          <Audio src={src} volume={(f) => ganho * s.volume * fadeFinalGain(s.inicio + f, plano)} playbackRate={s.velocidade} />
        </Sequence>
      );
    })}
  </>
);

/** Trilha com fade in/out e ducking automático sob as palavras do vídeo final. */
export const TrilhaSonora: React.FC<{plano: Plano}> = ({plano}) => {
  const {fps} = useVideoConfig();
  const t = plano.trilha!;
  // intervalos de fala em quadros, ordenados, para medir a distância até a fala mais próxima
  const fala = useMemo(() => plano.palavras.map((w) => [(w.startMs / 1000) * fps, (w.endMs / 1000) * fps] as const), [plano.palavras, fps]);
  const dist = (fr: number) => {
    let lo = 0, hi = fala.length - 1, best = Infinity;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const [a, b] = fala[mid];
      if (fr >= a && fr <= b) return 0;
      best = Math.min(best, fr < a ? a - fr : fr - b);
      if (fr < a) hi = mid - 1;
      else lo = mid + 1;
    }
    return best / fps;
  };
  const duck = estilo.sound.duckTo;
  return (
    <Sequence from={t.inicio} durationInFrames={t.frames} layout="none" name={`trilha:${t.clipe.id}`}>
      <Audio
        src={clipeSrc(t.clipe)}
        loop={t.loop}
        trimBefore={t.de > 0 ? Math.round(t.de * fps) : undefined}
        volume={(f) => {
          const env = t.ducking ? interpolate(dist(t.inicio + f), [0, 0.12, 0.55], [duck, duck, 1], {extrapolateRight: "clamp"}) : 1;
          const fade = Math.min(
            interpolate(f, [0, Math.max(1, t.fadeIn * fps)], [0, 1], {extrapolateRight: "clamp"}),
            interpolate(f, [t.frames - Math.max(1, t.fadeOut * fps), t.frames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
          );
          return t.volume * env * fade * fadeFinalGain(t.inicio + f, plano);
        }}
      />
    </Sequence>
  );
};

export const AudiosExtras: React.FC<{plano: Plano}> = ({plano}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {plano.audios.map((a, i) => (
        <Sequence key={i} from={a.inicio} durationInFrames={a.frames} layout="none" name={`audio:${a.clipe.id}`}>
          <Audio src={clipeSrc(a.clipe)} trimBefore={a.de > 0 ? Math.round(a.de * fps) : undefined} volume={(f) => a.volume * fadeFinalGain(a.inicio + f, plano)} />
        </Sequence>
      ))}
    </>
  );
};
