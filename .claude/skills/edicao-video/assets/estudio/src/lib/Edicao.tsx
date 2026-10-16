import {linearTiming, TransitionSeries} from "@remotion/transitions";
import React, {useMemo} from "react";
import {AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig} from "remotion";
import {AudiosExtras, fadeFinalGain, Sons, TrilhaSonora} from "./audio";
import {CamadaNaTela} from "./camadas";
import {cor} from "./estilo";
import {Legendas} from "./legendas";
import {ClipeNoQuadro} from "./quadro";
import {resolver, type CortePlano, type Plano} from "./resolver";
import {TextoNaTela} from "./textos";
import type {Edicao} from "./tipos";
import {apresentacao} from "./transicoes";

const CorteNaTela: React.FC<{c: CortePlano; plano: Plano}> = ({c, plano}) => {
  const {width: W, height: H} = useVideoConfig();
  const entra = c.entrada?.frames ?? 0;
  const sai = c.saidaFrames;
  // áudio cruza junto com a imagem nas transições; cortes secos não têm rampa
  const volume = (f: number) => {
    const a = entra ? interpolate(f, [0, entra], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 1;
    const b = sai ? interpolate(f, [c.frames - sai, c.frames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 1;
    return c.volume * a * b * fadeFinalGain(c.inicio + f, plano);
  };
  return (
    <ClipeNoQuadro
      clipe={c.clipe}
      largura={W}
      altura={H}
      frames={c.frames}
      trim={c.trim}
      velocidade={c.velocidade}
      volume={volume}
      mudo={c.mudo}
      enquadrar={c.enquadrar}
      foco={c.foco}
      zoom={c.zoom}
      filtro={c.filtro}
      espelhar={c.espelhar}
      fundo={plano.fundo}
    />
  );
};

const Principal: React.FC<{plano: Plano}> = ({plano}) => {
  const {fps, width: W, height: H} = useVideoConfig();
  return (
    <TransitionSeries>
      {plano.cortes.flatMap((c, i) => {
        const els: React.ReactNode[] = [];
        if (c.entrada) {
          els.push(<TransitionSeries.Transition key={`t${i}`} presentation={apresentacao(c.entrada.tipo, c.entrada.direcao, W, H)} timing={linearTiming({durationInFrames: c.entrada.frames})} />);
        }
        els.push(
          <TransitionSeries.Sequence key={`c${i}`} durationInFrames={c.frames} premountFor={fps} name={`${c.n} · ${c.clipe.id} ${c.de.toFixed(1)}–${c.ate.toFixed(1)}s`}>
            <CorteNaTela c={c} plano={plano} />
          </TransitionSeries.Sequence>,
        );
        return els;
      })}
    </TransitionSeries>
  );
};

/** Zoom de ênfase, tremor e filtros de momento aplicados à "câmera" (vídeo principal + b-roll). */
const useCamera = (plano: Plano) => {
  const f = useCurrentFrame();
  let escala = 1;
  let origem = "50% 50%";
  let tx = 0, ty = 0;
  const filtros: string[] = [];
  for (const z of plano.zooms) {
    const l = f - z.inicio;
    if (l < 0 || l >= z.frames) continue;
    const ramp = z.entrada === "suave" ? interpolate(l, [0, 7, z.frames - 7, z.frames], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 1;
    escala *= 1 + ((z.escala ?? 1.12) - 1) * ramp;
    if (z.foco) origem = `${z.foco.x * 100}% ${z.foco.y * 100}%`;
  }
  for (const e of plano.efeitos) {
    const l = f - e.inicio;
    if (l < 0 || l >= e.frames) continue;
    const p = l / e.frames;
    const k = e.intensidade ?? 1;
    if (e.tipo === "tremor") {
      const amp = 22 * k * (1 - p);
      tx += Math.sin(l * 2.7) * amp;
      ty += Math.cos(l * 3.3) * amp * 0.7;
      escala *= 1 + 0.03 * k;
    }
    if (e.tipo === "pb") filtros.push(`grayscale(${Math.min(1, k)}) contrast(1.1)`);
    if (e.tipo === "desfoque") filtros.push(`blur(${(12 * k * Math.sin(Math.PI * p)).toFixed(2)}px)`);
  }
  return {transform: `translate(${tx}px, ${ty}px) scale(${escala})`, transformOrigin: origem, filter: filtros.length ? filtros.join(" ") : undefined};
};

const Flashes: React.FC<{plano: Plano}> = ({plano}) => {
  const f = useCurrentFrame();
  const op = plano.efeitos
    .filter((e) => e.tipo === "flash" && f >= e.inicio && f < e.inicio + e.frames)
    .reduce((m, e) => Math.max(m, Math.pow(1 - (f - e.inicio) / e.frames, 2) * Math.min(1, e.intensidade ?? 0.85)), 0);
  return op > 0 ? <AbsoluteFill style={{background: "#fff", opacity: op}} /> : null;
};

const FadeFinal: React.FC<{plano: Plano}> = ({plano}) => {
  const f = useCurrentFrame();
  const g = fadeFinalGain(f, plano);
  return g < 1 ? <AbsoluteFill style={{background: "#000", opacity: 1 - g}} /> : null;
};

export const PlanoNaTela: React.FC<{plano: Plano}> = ({plano}) => {
  const camera = useCamera(plano);
  return (
    <AbsoluteFill style={{background: cor(plano.fundo), overflow: "hidden"}}>
      <AbsoluteFill style={camera}>
        <Principal plano={plano} />
        {plano.camadas
          .filter((c) => c.tipo === "broll")
          .map((c) => (
            <Sequence key={`b${c.indice}`} from={c.inicio} durationInFrames={c.frames} premountFor={30} name={`b-roll ${c.indice}`}>
              <CamadaNaTela c={c} />
            </Sequence>
          ))}
      </AbsoluteFill>
      {plano.vinheta > 0 ? <AbsoluteFill style={{background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${0.75 * plano.vinheta}) 100%)`}} /> : null}
      <Flashes plano={plano} />
      {plano.camadas
        .filter((c) => c.tipo !== "broll")
        .map((c) => (
          <Sequence key={`c${c.indice}`} from={c.inicio} durationInFrames={c.frames} premountFor={30} name={`${c.tipo} ${c.indice}`}>
            <CamadaNaTela c={c} />
          </Sequence>
        ))}
      {plano.textos.map((t, i) => (
        <Sequence key={`t${i}`} from={t.inicio} durationInFrames={t.frames} name={`${t.tipo} ${i}`}>
          <TextoNaTela t={t} />
        </Sequence>
      ))}
      {plano.legendas ? <Legendas plano={plano} /> : null}
      <Sons plano={plano} />
      {plano.trilha ? <TrilhaSonora plano={plano} /> : null}
      <AudiosExtras plano={plano} />
      <FadeFinal plano={plano} />
    </AbsoluteFill>
  );
};

/** Renderiza uma edição (o plano é recalculado a partir da definição — é puro e rápido). */
export const EdicaoNaTela: React.FC<{edicao: Edicao}> = ({edicao}) => {
  const plano = useMemo(() => resolver(edicao), [edicao]);
  return <PlanoNaTela plano={plano} />;
};
