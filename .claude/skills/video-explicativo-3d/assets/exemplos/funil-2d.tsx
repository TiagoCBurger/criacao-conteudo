// EXEMPLO DE REFERÊNCIA — modo 2D (art.medium = "2d"), funil de vendas (~23 s).
// Design system usado: assets/exemplos/funil-2d.tokens.json (técnico escuro, acento lima).
// Padrões a copiar: um gráfico contínuo atravessa a cena e muda de estado com a fala (Funnel + activeAt);
// rótulo único que troca (exitAt); fechamento errado→certo com strike + BlockWipe + FitText; legenda oculta
// quando o cartaz final é a própria fala.

import React from "react";
import {AbsoluteFill, staticFile} from "remotion";
import type {VideoDef} from "../../config";
import {
  beats,
  BlockWipe,
  DotField,
  Explainer,
  FitText,
  Funnel,
  KineticText,
  SafeArea,
  Sfx,
  timeline,
  useBeat,
  useCue,
  useSafe,
} from "../../lib";
import tlJson from "../../../public/videos/funil/timeline.json";

// Amostra 2D (art.medium = "2d"): funil de vendas. Uma mensagem por tela; o gráfico carrega a ideia.
const SLUG = "funil";
const tl = timeline(tlJson as never);
const B = beats(tl, [
  {id: "gancho", cue: 0},
  {id: "funil", cue: "Pense num funil"},
  {id: "fechamento", cue: "Muita gente tenta"},
]);

const Gancho: React.FC = () => {
  const dez = useCue("só dez");
  return (
    <AbsoluteFill>
      <SafeArea align="top" gap={56}>
        <div style={{height: 150, display: "flex", alignItems: "flex-end"}}>
          <KineticText text={"*10* em 1.000"} size="h1" delay={dez} align="center" />
        </div>
        <DotField count={1024} cols={32} lit={10} litAt={dez + 0.15} dimAt={dez} delay={0} />
      </SafeArea>
      <Sfx name="sparkle" at={dez + 0.15} volume={0.6} />
    </AbsoluteFill>
  );
};

const FunilCena: React.FC = () => {
  const b = useBeat();
  const topo = useCue("No topo");
  const cem = useCue("Cerca de cem");
  const fundo = useCue("E no fundo");
  const s = useSafe();
  const H = 900;
  return (
    <AbsoluteFill>
      <SafeArea align="top" gap={40}>
        <div style={{position: "relative", height: 150, width: s.innerWidth}}>
          <Label at={topo} until={cem} text="1.000 visitantes" />
          <Label at={cem} until={fundo} text={"*100* leads"} />
          <Label at={fundo} until={b.duration} text={"*10* clientes"} />
        </div>
        <Funnel
          stages={3}
          height={H}
          at={[0.1, 0.35, 0.6]}
          activeAt={[topo, cem, fundo]}
          flowFrom={topo - 0.2}
          rate={24}
          survive={[0.5, 0.42, 1]}
        />
      </SafeArea>
      <Sfx name="slide" at={0.1} volume={0.5} />
      <Sfx name="tick" at={topo} />
      <Sfx name="tick" at={cem} />
      <Sfx name="success" at={fundo + 0.2} volume={0.6} />
    </AbsoluteFill>
  );
};

const Label: React.FC<{at: number; until: number; text: string}> = ({at, until, text}) => (
  <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center"}}>
    <KineticText text={text} size="h2" delay={at} exitAt={until - 0.25} />
  </div>
);

const Fechamento: React.FC = () => {
  const mas = useCue("Mas o lucro");
  const tapar = useCue("tapar os vazamentos");
  return (
    <AbsoluteFill>
      <SafeArea align="center">
        <KineticText text={"Mais gente\n*no topo*"} size="h1" delay={0.1} emphasis="strike" emphasisAt={mas - 0.1} emphasisColor="negative" exitAt={mas + 0.25} />
      </SafeArea>
      <SafeArea align="center">
        <FitText lines={["TAPE OS", "*VAZAMENTOS*"]} delay={tapar - 0.15} />
      </SafeArea>
      <BlockWipe at={mas + 0.15} duration={0.75} color="accent" direction="up" />
      <Sfx name="whoosh" at={mas + 0.05} />
      <Sfx name="thud" at={tapar} volume={0.6} />
    </AbsoluteFill>
  );
};

const Video: React.FC = () => {
  return (
    <Explainer
      tl={tl}
      audio={staticFile(`videos/${SLUG}/narracao.wav`)}
      hideCaptions={[[tl.at("tapar os vazamentos") - 0.2, tl.duration + 2]]}
      scenes={[
        {beat: B[0], component: Gancho},
        {beat: B[1], component: FunilCena},
        {beat: B[2], component: Fechamento},
      ]}
    />
  );
};

const def: VideoDef = {id: SLUG, component: Video, duration: B[B.length - 1].end};
export default def;
