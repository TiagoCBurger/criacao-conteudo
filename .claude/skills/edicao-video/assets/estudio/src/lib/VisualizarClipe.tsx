import React, {useMemo} from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {Legendas} from "./legendas";
import {clipe} from "./midia";
import {ClipeNoQuadro} from "./quadro";
import type {Plano} from "./resolver";

// Composição de conferência (pasta "Midia" no Studio): o clipe inteiro com timecode, fala reconhecida,
// silêncios (cinza) e cortes de câmera (amarelo) numa barra. Serve para achar trechos antes de editar.

/** mm:ss.cc (segundos com centésimos, como no registro e nos scripts) */
const tc = (s: number) => {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${(s - m * 60).toFixed(2).padStart(5, "0")}`;
};

export const VisualizarClipe: React.FC<{id: string}> = ({id}) => {
  const c = clipe(id, "video");
  const f = useCurrentFrame();
  const {fps, width: W, height: H, durationInFrames} = useVideoConfig();
  const t = f / fps;
  const barH = Math.round(H * 0.012) + 6;
  const fs = Math.round(Math.min(W, H) * 0.038);
  const plano = useMemo(
    () =>
      ({
        palavras: (c.transcricao?.palavras ?? []).map((w) => ({...w, corte: 0})),
        legendas: {estilo: "karaoke", posicao: "baixo", maxPalavras: 8, tamanho: fs * 1.25, maiusculas: false, destaque: [], ocultar: []},
      }) as unknown as Plano,
    [c, fs],
  );
  const dur = c.duracao ?? durationInFrames / fps;
  return (
    <AbsoluteFill style={{background: "#0c0d10"}}>
      <ClipeNoQuadro clipe={c} largura={W} altura={H} frames={durationInFrames} enquadrar="ajustar" fundo="#0c0d10" />
      <div style={{position: "absolute", left: 16, top: 14, color: "#fff", fontFamily: "Inter, sans-serif", fontSize: fs, fontWeight: 800, textShadow: "0 2px 8px #000"}}>
        {tc(t)} <span style={{fontWeight: 600, opacity: 0.7, fontSize: fs * 0.6}}>· {c.id} · {c.largura}×{c.altura}</span>
      </div>
      {plano.palavras.length ? <Legendas plano={plano} /> : null}
      <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: barH, background: "#2a2d34"}}>
        {(c.silencios ?? []).map(([a, b], i) => (
          <div key={i} style={{position: "absolute", left: `${(a / dur) * 100}%`, width: `${((b - a) / dur) * 100}%`, top: 0, bottom: 0, background: "#55595f"}} />
        ))}
        {(c.cenas ?? []).map((s, i) => (
          <div key={`s${i}`} style={{position: "absolute", left: `${(s / dur) * 100}%`, width: 3, top: 0, bottom: 0, background: "#ffd23f"}} />
        ))}
        <div style={{position: "absolute", left: `${(t / dur) * 100}%`, width: 4, top: -6, bottom: 0, background: "#fff"}} />
      </div>
    </AbsoluteFill>
  );
};
