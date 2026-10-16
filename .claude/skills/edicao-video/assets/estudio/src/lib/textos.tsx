import React from "react";
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {alpha, areaSegura, cor, escalaTipo, estilo, raio, tipo, type TamanhoTipo} from "./estilo";
import type {Animacao, Posicao, Texto} from "./tipos";

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** Opacidade de saída: some nos últimos ~0,2 s da janela. */
export const useSaida = (frames: number, dur = 6) => {
  const f = useCurrentFrame();
  return interpolate(f, [frames - dur, frames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
};

/** Faixa reservada às legendas embaixo (px), para textos e rótulos não colidirem com elas. */
export const faixaLegenda = (W: number, H: number) => estilo.captions.size * escalaTipo(W, H) * 2.8;

/** Caixa de posicionamento (absoluta) dentro da área segura. */
export const usePosicao = (posicao: Posicao, padrao: Posicao): React.CSSProperties => {
  const {width: W, height: H} = useVideoConfig();
  const s = areaSegura(W, H);
  const p = posicao ?? padrao;
  const base: React.CSSProperties = {position: "absolute", left: s.left, right: s.right, display: "flex", justifyContent: "center", textAlign: "center"};
  if (typeof p === "object") return {position: "absolute", left: p.x * W, top: p.y * H, transform: "translate(-50%, -50%)", textAlign: "center", width: W - s.left - s.right};
  if (p === "topo") return {...base, top: s.top + 12};
  if (p === "baixo") return {...base, bottom: s.bottom + faixaLegenda(W, H)};
  return {...base, top: 0, bottom: 0, alignItems: "center"};
};

const springCfg = (k: "enter" | "pop") => estilo.motion.spring[k];

/** Estilo de entrada de um elemento (índice i para escalonar palavras). */
export const useEntrada = (anim: Animacao, i = 0) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = anim === "palavras" ? i * 3 : 0;
  const s = spring({frame: f - d, fps, config: springCfg(anim === "pop" ? "pop" : "enter")});
  switch (anim) {
    case "nenhuma":
    case "digitar":
      return {};
    case "pop":
      return {transform: `scale(${0.55 + 0.45 * s})`, opacity: Math.min(1, s * 2)};
    case "subir":
      return {transform: `translateY(${(1 - s) * 70}px)`, opacity: s};
    case "surgir":
      return {transform: `scale(${0.96 + 0.04 * s})`, opacity: s};
    default:
      return {transform: `translateY(${(1 - s) * 34}px)`, opacity: s, display: "inline-block"};
  }
};

const sombra = (k: number) => `0 ${4 * k}px ${26 * k}px rgba(0,0,0,0.55), 0 ${1 * k}px ${3 * k}px rgba(0,0,0,0.5)`;

const Palavra: React.FC<{texto: string; i: number; anim: Animacao; destaque: boolean; corBase: string}> = ({texto, i, anim, destaque, corBase}) => {
  const st = useEntrada(anim, i);
  return <span style={{display: "inline-block", whiteSpace: "pre", color: destaque ? cor("accent") : corBase, ...st}}>{texto}</span>;
};

const Digitar: React.FC<{texto: string}> = ({texto}) => {
  const f = useCurrentFrame();
  const n = Math.min(texto.length, Math.floor(f * 1.4));
  return (
    <span>
      {texto.slice(0, n)}
      <span style={{opacity: f % 16 < 8 && n < texto.length ? 1 : 0}}>▍</span>
    </span>
  );
};

const tam = (t: TamanhoTipo | number | undefined, padrao: TamanhoTipo, k: number) => (typeof t === "number" ? t : estilo.typography.scale[t ?? padrao]) * k;

export const TextoNaTela: React.FC<{t: Texto & {frames: number}}> = ({t}) => {
  const {width: W, height: H} = useVideoConfig();
  const k = escalaTipo(W, H);
  const saida = useSaida(t.frames);
  const pos = usePosicao(t.posicao as Posicao, t.tipo === "titulo" ? "topo" : t.tipo === "rotulo" ? "baixo" : "centro");

  if (t.tipo === "rotulo") return <Rotulo nome={t.nome} descricao={t.descricao} saida={saida} k={k} />;

  const anim: Animacao = t.animacao ?? (t.tipo === "titulo" ? "palavras" : t.tipo === "destaque" ? "pop" : "surgir");
  const corBase = cor(("cor" in t && t.cor) || (t.tipo === "destaque" ? "accent" : "text"));
  // destaque é a ênfase da cena: bem maior que um título
  const size = tam(t.tamanho, t.tipo === "titulo" ? "h1" : t.tipo === "destaque" ? "hero" : "h3", k) * (t.tipo === "destaque" && t.tamanho === undefined ? 1.8 : 1);
  const papel = t.tipo === "texto" ? "body" : "display";
  const destaques = new Set(("destaque" in t && t.destaque ? t.destaque : []).flatMap((d) => d.split(/\s+/)).map(norm));
  const style: React.CSSProperties = {...tipo(papel, size), color: corBase, textShadow: t.tipo === "texto" && t.caixa ? undefined : sombra(k), maxWidth: "100%"};
  const conteudo =
    anim === "digitar" ? (
      <Digitar texto={t.texto} />
    ) : anim === "palavras" ? (
      t.texto.split(/(\s+)/).map((w, i) => (w.trim() ? <Palavra key={i} texto={w} i={i / 2} anim={anim} destaque={destaques.has(norm(w))} corBase={corBase} /> : w))
    ) : (
      t.texto
    );
  const caixa = t.tipo === "texto" && t.caixa;
  return (
    <AbsoluteFill style={{opacity: saida}}>
      <div style={pos}>
        <Envoltorio anim={anim}>
          <div style={{...style, ...(caixa ? {background: alpha("surface", 0.88), padding: `${0.35 * size}px ${0.6 * size}px`, borderRadius: raio("md") * k} : {})}}>{conteudo}</div>
        </Envoltorio>
      </div>
    </AbsoluteFill>
  );
};

const Envoltorio: React.FC<{anim: Animacao; children: React.ReactNode}> = ({anim, children}) => {
  const st = useEntrada(anim === "palavras" || anim === "digitar" ? "nenhuma" : anim);
  return <div style={{...st, display: "inline-block"}}>{children}</div>;
};

/** Lower third: barra de acento + nome + descrição, entrando da esquerda. */
const Rotulo: React.FC<{nome: string; descricao?: string; saida: number; k: number}> = ({nome, descricao, saida, k}) => {
  const f = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const s = areaSegura(W, H);
  const a = spring({frame: f, fps, config: springCfg("enter")});
  const b = spring({frame: f - 5, fps, config: springCfg("enter")});
  return (
    <AbsoluteFill style={{opacity: saida}}>
      <div style={{position: "absolute", left: s.left, bottom: s.bottom + faixaLegenda(W, H) + 16 * k, display: "flex", alignItems: "stretch", gap: 16 * k}}>
        <div style={{width: 8 * k, borderRadius: 4 * k, background: cor("accent"), transform: `scaleY(${a})`, transformOrigin: "bottom"}} />
        <div style={{background: alpha("background", 0.72), borderRadius: raio("sm") * k, padding: `${14 * k}px ${22 * k}px`, clipPath: `inset(0 ${(1 - a) * 100}% 0 0)`}}>
          <div style={{...tipo("display", "h3", {fontSize: estilo.typography.scale.h3 * k}), color: cor("text"), whiteSpace: "nowrap"}}>{nome}</div>
          {descricao ? <div style={{...tipo("body", "small", {fontSize: estilo.typography.scale.small * k}), color: cor("textMuted"), opacity: b, marginTop: 4 * k, whiteSpace: "nowrap"}}>{descricao}</div> : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
