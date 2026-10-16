// EXEMPLO DE REFERÊNCIA — vídeo completo com HUD mínimo (juros compostos, ~27 s).
// Mesmo código renderiza nas direções editorial, cinematic e technical: só o design system muda.
// Padrões a copiar: uma mensagem por tela; o 3D carrega a ideia (Field → lajes → Ribbon → Text3D);
// câmera com orbit()+fitDistance(); textos que trocam com exitAt; legenda escondida quando o texto é a fala.

import React from "react";
import {AbsoluteFill, random, staticFile} from "remotion";
import type {VideoDef} from "../../config";
import {
  beats,
  Block,
  c,
  CameraRig,
  Counter,
  Explainer,
  Field,
  fitDistance,
  orbit,
  KineticText,
  Reveal,
  Ribbon,
  SafeArea,
  Scene3D,
  Sfx,
  Spin,
  Text3D,
  timeline,
  type,
  useBeat,
  useCue,
} from "../../lib";
import tlJson from "../../../public/videos/estilo/timeline.json";

// (src/videos/<slug>/index.tsx — timeline em public/videos/<slug>/timeline.json)
const SLUG = "estilo";
const tl = timeline(tlJson as never);
const B = beats(tl, [
  {id: "gancho", cue: 0},
  {id: "juro", cue: "O segredo se chama"},
  {id: "numeros", cue: "Com mil reais"},
  {id: "tempo", cue: "O ingrediente mais importante"},
]);

const growth = (x: number) => (Math.pow(1.01, x * 360) - 1) / (Math.pow(1.01, 360) - 1);

const Gancho: React.FC = () => {
  const virar = useCue("virar");
  const mil = useCue("trinta e seis mil");
  return (
    <AbsoluteFill>
      <Scene3D camera={{position: orbit([0, 1.3, -0.9], fitDistance(3.2, 4.6), 32, 10), target: [0, 1.3, -0.9]}} floorY={0}>
        <CameraRig
          keys={[
            {t: 0, position: orbit([0, 1.1, -0.9], fitDistance(3.2, 4.6) * 1.08, 38, 8), target: [0, 1.1, -0.9]},
            {t: 5, position: orbit([0, 1.5, -0.9], fitDistance(3.2, 4.6), 28, 12), target: [0, 1.5, -0.9]},
          ]}
        />
        <Field
          rows={8}
          cols={5}
          spacing={0.5}
          size={0.36}
          height={(r, k) => 0.12 + 3.4 * growth(r / 7) * (0.92 + random(`h${r}${k}`) * 0.16)}
          highlight={[[7, 2]]}
          delay={virar}
          duration={1.4}
          order="row"
        />
      </Scene3D>
      <SafeArea align="top">
        <Reveal delay={mil} preset="blur">
          <Counter to={36} prefix="R$ " suffix=" mil" size="hero" delay={mil} duration={0.9} color="text" />
        </Reveal>
      </SafeArea>
      <Sfx name="riser" at={Math.max(0, mil - 1.4)} volume={0.5} />
      <Sfx name="thud" at={mil + 0.9} volume={0.7} />
    </AbsoluteFill>
  );
};

const Juro: React.FC = () => {
  const title = useCue("juro sobre juro");
  const t = [useCue("o rendimento de cada"), useCue("passa a render"), useCue("também no mês"), useCue("seguinte")];
  const base = 0.5;
  const layers = [0.18, 0.24, 0.32, 0.44];
  let y = base;
  return (
    <AbsoluteFill>
      <Scene3D camera={{position: orbit([0, 1.25, 0], fitDistance(2.6, 3.6), 30, 22), target: [0, 1.25, 0]}} floorY={0}>
        <Spin speed={0.025}>
          <Block size={[1.8, base, 1.8]} position={[0, base / 2, 0]} color="primary" enter="rise" />
          {layers.map((h, i) => {
            const el = <Block key={i} size={[1.8, h - 0.02, 1.8]} position={[0, y + h / 2, 0]} color={i === layers.length - 1 ? "accent" : "secondary"} delay={t[i]} enter="drop" />;
            y += h;
            return el;
          })}
        </Spin>
      </Scene3D>
      <SafeArea align="top">
        <KineticText text={"Juro sobre\n*juro*."} size="h1" delay={title - 0.1} preset="mask" />
      </SafeArea>
      {t.map((x, i) => (
        <Sfx key={i} name="thud" at={x + 0.15} volume={0.35 + i * 0.1} />
      ))}
    </AbsoluteFill>
  );
};

const Numeros: React.FC = () => {
  const dez = useCue("três mil e trezentos");
  const trinta = useCue("Em trinta anos");
  const b = useBeat();
  const pts = Array.from({length: 31}, (_, i) => {
    const x = i / 30;
    return [-1.4 + x * 2.8, growth(x) * 3.6, -x * 0.8] as [number, number, number];
  });
  return (
    <AbsoluteFill>
      <Scene3D camera={{position: orbit([0, 1.5, -0.4], fitDistance(3.2, 4.4), 12, 6), target: [0, 1.5, -0.4]}} floor="grid" floorY={0}>
        <Ribbon points={pts.slice(0, 11)} delay={0.3} duration={dez - 0.3} radius={0.045} tip={false} color="textMuted" />
        <Ribbon points={pts} delay={dez - 0.2} duration={trinta - dez + 1.4} radius={0.055} color="accent" />
      </Scene3D>
      <SafeArea align="top">
        <div style={{position: "relative", height: 300, width: "100%"}}>
          <Reveal delay={dez} preset="rise" exitAt={trinta - 0.3} style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center"}}>
            <div style={type("body", "small", {color: c("textMuted"), textTransform: "uppercase", letterSpacing: "0.14em"})}>10 anos</div>
            <Counter to={3300} prefix="R$ " size="h1" delay={dez} duration={0.8} />
          </Reveal>
          <Reveal delay={trinta + 0.2} preset="rise" exitAt={b.duration - 0.2} style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center"}}>
            <div style={type("body", "small", {color: c("textMuted"), textTransform: "uppercase", letterSpacing: "0.14em"})}>30 anos</div>
            <Counter to={36} prefix="R$ " suffix=" mil" size="h1" delay={trinta + 0.2} duration={1.2} color="accent" />
          </Reveal>
        </div>
      </SafeArea>
      <Sfx name="ding" at={dez + 0.8} volume={0.5} />
      <Sfx name="riser" at={Math.max(0, trinta + 1.4 - 1.4)} volume={0.4} />
    </AbsoluteFill>
  );
};

const Tempo: React.FC = () => {
  const tempo = useCue("tempo");
  const cedo = useCue("comece cedo");
  return (
    <AbsoluteFill>
      <Scene3D camera={{position: orbit([0, 0.3, 0], fitDistance(3, 2.5), 0, 4), target: [0, 0.3, 0]}} floorY={-0.9}>
        <Spin speed={0.02} offset={-0.15}>
          <Text3D text="tempo" size={1.1} depth={0.35} color="accent" position={[0, 0.3, 0]} delay={tempo - 0.1} anim="rise" />
        </Spin>
      </Scene3D>
      <SafeArea align="bottom">
        <KineticText text="Comece cedo." size="h2" delay={cedo} preset="mask" />
      </SafeArea>
      <Sfx name="boom" at={tempo + 0.1} volume={0.5} />
    </AbsoluteFill>
  );
};

const Video: React.FC = () => (
  <Explainer
    tl={tl}
    audio={staticFile(`videos/${SLUG}/narracao.wav`)}
    hideCaptions={[[7.5, 8.8], [23.7, 26.5]]}
    scenes={[
      {beat: B[0], component: Gancho},
      {beat: B[1], component: Juro},
      {beat: B[2], component: Numeros},
      {beat: B[3], component: Tempo},
    ]}
  />
);

const def: VideoDef = {id: SLUG, component: Video, duration: B[B.length - 1].end};
export default def;
