import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {areaSegura, estiloFile, estilo, escalaTipo, raio} from "./estilo";
import {clipeSrc} from "./midia";
import {ClipeNoQuadro} from "./quadro";
import {filtroCss, type Plano} from "./resolver";
import {useEntrada, usePosicao, useSaida} from "./textos";
import type {Camada, Posicao} from "./tipos";

type CamadaPlano = Plano["camadas"][number];

const fps30 = (fps: number, s: number) => Math.round(s * fps);

/** B-roll em tela cheia (o áudio do corte principal continua por baixo). */
const Broll: React.FC<{c: Extract<Camada, {tipo: "broll"}> & CamadaPlano}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const cruz = c.transicao === "cruzar" ? fps30(fps, 0.25) : 0;
  const op = cruz ? interpolate(f, [0, cruz, c.frames - cruz, c.frames], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 1;
  const z = c.zoom === undefined ? {de: 1, para: 1.06} : typeof c.zoom === "number" ? {de: c.zoom, para: c.zoom} : c.zoom;
  return (
    <AbsoluteFill style={{opacity: op}}>
      <ClipeNoQuadro
        clipe={c.clipeInfo!}
        largura={W}
        altura={H}
        frames={c.frames}
        trim={fps30(fps, c.de ?? 0)}
        velocidade={c.velocidade ?? 1}
        volume={(c.volume ?? 0) * (c.clipeInfo!.ganho ?? 1)}
        mudo={!c.volume}
        enquadrar={c.enquadrar ?? "preencher"}
        foco={c.foco}
        zoom={z}
        filtro={filtroCss(c.filtro)}
      />
    </AbsoluteFill>
  );
};

/** Vídeo pequeno num canto, com cantos arredondados e sombra. */
const Pip: React.FC<{c: Extract<Camada, {tipo: "pip"}> & CamadaPlano}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const s = areaSegura(W, H);
  const k = escalaTipo(W, H);
  const cl = c.clipeInfo!;
  const w = (c.largura ?? 0.42) * W;
  const h = (w * (cl.altura ?? 9)) / (cl.largura ?? 16);
  const canto = c.canto ?? "sup-dir";
  const a = spring({frame: f, fps, config: estilo.motion.spring.enter});
  const saida = useSaida(c.frames);
  const pos: React.CSSProperties = {
    position: "absolute",
    width: w,
    height: h,
    ...(canto.startsWith("sup") ? {top: s.top} : {bottom: s.bottom + 140 * k}),
    ...(canto.endsWith("esq") ? {left: s.left} : {right: s.right}),
    borderRadius: raio("lg") * k,
    overflow: "hidden",
    boxShadow: `0 ${12 * k}px ${40 * k}px rgba(0,0,0,0.45)`,
    transform: `scale(${0.85 + 0.15 * a})`,
    opacity: Math.min(a * 1.5, saida),
  };
  return (
    <div style={pos}>
      <ClipeNoQuadro clipe={cl} largura={w} altura={h} frames={c.frames} trim={fps30(fps, c.de ?? 0)} velocidade={c.velocidade ?? 1} volume={(c.volume ?? 0) * (cl.ganho ?? 1)} mudo={!c.volume} />
    </div>
  );
};

/** Imagem do registro (ou o logo do estilo). */
const Imagem: React.FC<{c: Extract<Camada, {tipo: "imagem"}> & CamadaPlano}> = ({c}) => {
  const f = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  const saida = useSaida(c.frames);
  const src = c.logo ? estiloFile(estilo.brand.logo!) : clipeSrc(c.clipeInfo!);
  const anim = useEntrada(c.animacao ?? (c.cobrir ? "surgir" : "pop"));
  const pos = usePosicao(c.posicao as Posicao, c.logo ? "topo" : "centro");
  if (c.cobrir) {
    const kb = c.kenBurns === false ? 1 : interpolate(f, [0, c.frames], [1, 1.08], {easing: Easing.inOut(Easing.sin)});
    return (
      <AbsoluteFill style={{opacity: saida, ...anim}}>
        <AbsoluteFill style={{transform: `scale(${kb})`}}>
          <Img src={src} style={{width: W, height: H, objectFit: "cover"}} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const w = (c.largura ?? (c.logo ? 0.28 : 0.6)) * W;
  return (
    <AbsoluteFill style={{opacity: saida}}>
      <div style={pos}>
        <div style={anim}>
          <Img src={src} style={{width: w, height: "auto", display: "block", borderRadius: c.logo ? 0 : raio("md") * escalaTipo(W, H), boxShadow: c.logo ? undefined : "0 18px 50px rgba(0,0,0,0.4)"}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const CamadaNaTela: React.FC<{c: CamadaPlano}> = ({c}) => {
  if (c.tipo === "broll") return <Broll c={c} />;
  if (c.tipo === "pip") return <Pip c={c} />;
  if (c.tipo === "imagem") return <Imagem c={c} />;
  const Comp = c.componente;
  return (
    <AbsoluteFill>
      <Comp duracao={c.frames} {...(c.props ?? {})} />
    </AbsoluteFill>
  );
};
