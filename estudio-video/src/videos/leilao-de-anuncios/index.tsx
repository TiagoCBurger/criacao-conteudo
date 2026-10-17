// Leilão de anúncios — por que quem paga mais nem sempre aparece primeiro (Google Ads e Meta).
// Ativos gerados por IA: narração (OpenRouter), imagens (OpenRouter) → modelos 3D (TripoSR) e cenário 2.5D
// (Depth Anything). Rode `npm run ia -- leilao-de-anuncios` para gerar/atualizar; veja storyboard.md.
import {Search} from "lucide-react";
import React from "react";
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import type {VideoDef} from "../../config";
import {
  alpha,
  Appear,
  beats,
  c,
  CameraRig,
  ds,
  ease,
  Explainer,
  Eyebrow,
  frameSafe,
  Glow,
  KineticText,
  LightBeam,
  Particles,
  Phone3D,
  projectToScreen,
  radius,
  Reveal,
  SafeArea,
  Scene3D,
  Sfx,
  Solid,
  Spin,
  ThemedMaterial,
  timeline,
  type,
  TypeOn,
  useBeat,
  useCue,
  useEnter,
  useTime,
  useTween,
  type V3,
} from "../../lib";
import tlJson from "../../../public/videos/leilao-de-anuncios/timeline.json";
import {Clarao, GolpeMartelo, Joia, Moeda, Placa, Salao} from "./objetos";

const SLUG = "leilao-de-anuncios";
const tl = timeline(tlJson as never);

const B = beats(tl, [
  {id: "gancho", cue: 0},
  {id: "disputa", cue: "Cada anunciante dá"},
  {id: "qualidade", cue: "E qualidade aqui"},
  {id: "exemplo", cue: "Num exemplo simplificado"},
  {id: "preco", cue: "E ela nem paga"},
  {id: "meta", cue: "No Instagram e no Facebook"},
  {id: "fechamento", cue: "Moral do leilão"},
]);

const FOV = ds.three.fov;
const W = 1080;
const H = 1920;

// ---------------------------------------------------------------------------------------------
// 1. Gancho — salão 2.5D, busca digitando, martelo bate em "leilão"
const Gancho: React.FC = () => {
  const leilao = useCue("um leilão");
  const antes = useCue("Antes de a página");
  const carregar = useCue("carregar", {edge: "end"});
  const quem = useCue("E quem paga");
  const b = useBeat();
  const impact = leilao + 0.28;
  const t = useTime();
  const bright = interpolate(t, [0, 0.8, impact, impact + 0.5], [0.42, 0.6, 0.6, 0.72], {extrapolateRight: "clamp"});
  const load = interpolate(t, [antes, carregar], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
  return (
    <AbsoluteFill>
      <Scene3D camera={{position: [0.1, 0.05, 10.8], target: [0, 0, 0]}} fog={null} floor="none">
        <CameraRig
          keys={[
            {t: 0, position: [0.12, 0.06, 10.8], target: [0, 0, 0]},
            {t: b.duration, position: [-0.1, -0.06, 9.3], target: [0, -0.05, 0]},
          ]}
        />
        <Salao width={3.3} brightness={bright} />
        <GolpeMartelo at={impact} from={0} h={0.72} position={[0.42, -0.12, 4.2]} rotationY={-0.25} />
        <Clarao at={impact} position={[-0.2, -0.38, 4.4]} size={1.8} />
      </Scene3D>
      <Sombra />
      <SafeArea align="top">
        <div style={{position: "relative", width: "100%", height: 260}}>
          <Reveal delay={0} preset="rise" exitAt={leilao + 0.1} style={{position: "absolute", inset: 0, display: "flex", justifyContent: "center"}}>
            <BarraBusca />
          </Reveal>
          <Reveal delay={antes - 0.05} preset="fade" exitAt={quem - 0.15} style={{position: "absolute", left: 0, right: 0, top: 70}}>
            <div style={{height: 6, width: "100%", background: alpha("text", 0.12), borderRadius: radius("sm"), overflow: "hidden"}}>
              <div style={{height: "100%", width: `${load * 100}%`, background: c("accent"), boxShadow: `0 0 24px ${alpha("accent", 0.8)}`}} />
            </div>
          </Reveal>
          <div style={{position: "absolute", inset: 0}}>
            <KineticText text={"Quem paga mais\n*nem sempre* ganha."} size="h2" delay={quem - 0.05} preset="mask" />
          </div>
        </div>
      </SafeArea>
      <Sfx name="typing" at={0.15} volume={0.35} />
      <Sfx name="riser" at={Math.max(0, impact - 1.4)} volume={0.45} />
      <Sfx name="boom" at={impact} volume={0.7} />
      <Sfx name="swish" at={antes} volume={0.35} />
    </AbsoluteFill>
  );
};

/** escurece topo e base sobre o cenário 2.5D: título e legenda sempre legíveis */
const Sombra: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, ${alpha("background", 0.8)} 0%, ${alpha("background", 0)} 17%, ${alpha("background", 0)} 71%, ${alpha("background", 0.9)} 86%)`,
    }}
  />
);

const BarraBusca: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 22,
      padding: "26px 36px",
      width: 760,
      background: alpha("surface", 0.86),
      border: `2px solid ${c("border")}`,
      borderRadius: 999,
      boxShadow: `0 20px 60px ${alpha("background", 0.7)}`,
    }}
  >
    <Search size={44} color={c("textMuted")} strokeWidth={2.4} />
    <TypeOn text="tênis de corrida" delay={0.15} cps={14} role="body" size="body" color="text" />
  </div>
);

// ---------------------------------------------------------------------------------------------
// 2. A disputa — placas de lance sobem, moedas (lances) pousam, a joia (qualidade) entra
const PLACAS: {x: number; z: number; ry: number}[] = [
  {x: -0.95, z: -0.45, ry: 0.3},
  {x: 0, z: 0.1, ry: 0},
  {x: 0.95, z: -0.45, ry: -0.3},
];

const Disputa: React.FC = () => {
  const cada = useCue("Cada anunciante");
  const lance = useCue("um lance pelo");
  const naoOlha = useCue("não olha só");
  const combina = useCue("combina o lance");
  const qual = useCue("qualidade do anúncio");
  const b = useBeat();
  const t = useTime();
  const apagou = t >= naoOlha + 0.2;
  const a = frameSafe({center: [0, 0.85, -0.1], size: [2.9, 1.9, 1.2], azimuth: -6, elevation: 10, fill: 0.9});
  const z = frameSafe({center: [0, 0.7, 0.3], size: [2.6, 1.8, 1.4], azimuth: 6, elevation: 12, fill: 0.92});
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floorY={0}>
        <CameraRig keys={[{t: 0, ...a}, {t: b.duration, ...z}]} />
        <Particles count={50} spread={[6, 5, 4]} seed="disputa" />
        {PLACAS.map((p, i) => (
          <Appear key={i} delay={cada + i * 0.16} enter="rise" position={[p.x, 0, p.z]} rotation={[0, p.ry, 0]} seed={`placa${i}`}>
            <Placa h={1.3} />
            <Appear delay={lance + i * 0.12} enter="drop" position={[0, 1.36, 0]} float={0.3} seed={`moeda${i}`}>
              <Spin speed={0.12} offset={i}>
                <Moeda h={0.36} center color={apagou ? "secondary" : "accent"} emissive={apagou ? 0 : 0.25} />
              </Spin>
            </Appear>
          </Appear>
        ))}
        <Appear delay={qual - 0.15} enter="rise" position={[0, 0.05, 1.0]} float={0.4} seed="joia-disputa">
          <Spin speed={0.06}>
            <Joia h={0.72} emissive={0.4} />
          </Spin>
        </Appear>
        <Glow position={[0, 0.45, 0.6]} size={2.2} delay={qual} duration={0.8} intensity={0.8} />
      </Scene3D>
      <SafeArea align="top">
        <KineticText text={"Lance × *Qualidade*"} size="h2" delay={combina - 0.05} preset="mask" />
      </SafeArea>
      {PLACAS.map((_, i) => (
        <Sfx key={`t${i}`} name="thud" at={cada + i * 0.16 + 0.2} volume={0.3 + i * 0.05} rate={1 + i * 0.05} />
      ))}
      <Sfx name="pop" at={lance + 0.2} volume={0.45} />
      <Sfx name="pop" at={lance + 0.44} volume={0.35} rate={1.1} />
      <Sfx name="sparkle" at={qual + 0.1} volume={0.5} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 3. Qualidade — a joia acende a cada um dos três sinais (feixes de luz)
const FEIXES: {from: V3; to: V3}[] = [
  {from: [-2.6, 2.9, -0.8], to: [-0.12, 0.18, 0]},
  {from: [2.7, 2.3, -0.6], to: [0.14, 0.12, 0]},
  {from: [0.3, -3.0, 1.2], to: [0, -0.32, 0.05]},
];

const Qualidade: React.FC = () => {
  const tres = useCue("três coisas");
  const k = [useCue("a chance de você"), useCue("o quanto o anúncio"), useCue("se a página")];
  const b = useBeat();
  const level = useTween(k[0] + 0.3, 0.6) + useTween(k[1] + 0.3, 0.6) + useTween(k[2] + 0.3, 0.6);
  const a = frameSafe({center: [0, 0, 0], size: [1.9, 1.7, 1.9], azimuth: -16, elevation: 8, fill: 0.74});
  const z = frameSafe({center: [0, 0, 0], size: [1.9, 1.7, 1.9], azimuth: 14, elevation: 14, fill: 0.8});
  const labels = ["CTR\nesperada", "Relevância\ndo anúncio", "Experiência\nna *página*"];
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floor="none" fog={{near: 1.1, far: 3.2}}>
        <CameraRig keys={[{t: 0, ...a}, {t: b.duration, ...z}]} />
        <Particles count={60} spread={[5, 6, 4]} seed="qualidade" />
        <Glow position={[0, 0, -0.5]} size={2.2 + level * 0.9} intensity={0.35 + level * 0.2} />
        <Spin speed={0.045}>
          <Joia h={1.5} center emissive={0.1 + level * 0.28} />
        </Spin>
        {FEIXES.map((f, i) => (
          <LightBeam key={i} from={f.from} to={f.to} width={0.03} color="text" delay={k[i]} duration={0.45} intensity={0.85} />
        ))}
      </Scene3D>
      <SafeArea align="top">
        <div style={{position: "relative", width: "100%", height: 280}}>
          <div style={{position: "absolute", inset: 0, display: "flex", justifyContent: "center"}}>
            <Reveal delay={tres - 0.1} preset="pop" exitAt={k[0] - 0.25}>
              <div style={type("display", "hero", {color: c("text")})}>3</div>
            </Reveal>
          </div>
          {labels.map((txt, i) => (
            <div key={i} style={{position: "absolute", inset: 0}}>
              <KineticText text={txt} size="h2" delay={k[i] - 0.05} preset="mask" exitAt={i < 2 ? k[i + 1] - 0.25 : undefined} />
            </div>
          ))}
        </div>
      </SafeArea>
      <Sfx name="tick" at={tres} volume={0.4} />
      {k.map((at, i) => (
        <Sfx key={i} name={i === 2 ? "ding" : "tick"} at={at + 0.35} volume={0.4 + i * 0.08} rate={1 + i * 0.06} />
      ))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 4. O exemplo — Ana (R$ 4 × 10 = 40) × Bruno (R$ 8 × 3 = 24)
const CAM4 = frameSafe({center: [0, 1.05, 0.25], size: [2.7, 2.3, 1.9], azimuth: 0, elevation: 9, fill: 0.86});
const CAM4_PERTO = frameSafe({center: [0, 0.32, 0.4], size: [2.7, 0.8, 1.9], azimuth: 0, elevation: 13, fill: 0.92});
type Cam = {position: V3; target: V3};
type Key = {t: number} & Cam;
/** mesma interpolação do CameraRig (sem deriva), para ancorar rótulos HTML numa câmera que se move */
const camAt = (keys: Key[], t: number): Cam => {
  let i = 0;
  while (i < keys.length - 1 && t > keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const k = a === b ? 0 : ease.standard(Math.min(1, Math.max(0, (t - a.t) / Math.max(0.0001, b.t - a.t))));
  const l = (u: V3, v: V3) => u.map((x, j) => x + (v[j] - x) * k) as V3;
  return {position: l(a.position, b.position), target: l(a.target, b.target)};
};
const ESCALA = 0.05; // altura da coluna por ponto
const COL = {ana: {x: -0.78, pts: 40}, bruno: {x: 0.78, pts: 24}};

const Coluna: React.FC<{x: number; h: number; at: number; color: string; emissive: number}> = ({x, h, at, color, emissive}) => {
  const p = useTween(at, 1.1, ease.enter);
  return (
    <group position={[x, 0.1, 0]} scale={[1, Math.max(0.001, p), 1]}>
      <Solid size={[0.62, h, 0.62]} position={[0, h / 2, 0]} color={color} emissive={emissive} />
    </group>
  );
};

/** rótulo HTML colado no topo da coluna (acompanha o crescimento) */
const Rotulo: React.FC<{cam: Cam; x: number; h: number; growAt: number; nameAt: number; name: string; parts: {text: string; at: number}[]; pts: number; color: string; muted: boolean}> = ({
  cam,
  x,
  h,
  growAt,
  nameAt,
  name,
  parts,
  pts,
  color,
  muted,
}) => {
  const p = useTween(growAt, 1.1, ease.enter);
  const top = projectToScreen([x, 0.1 + h * p + 0.08, 0], {...cam, fov: FOV}, W, H);
  return (
    <div
      style={{
        position: "absolute",
        left: top.x - 260,
        width: 520,
        top: top.y - 250,
        height: 236,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 6,
      }}
    >
      <Reveal delay={growAt} preset="pop">
        <Counterzinho to={pts} at={growAt} color={muted ? "textMuted" : color} />
      </Reveal>
      <Reveal delay={nameAt} preset="rise">
        <div style={type("body", "small", {color: c(muted ? "textMuted" : "text"), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em"})}>{name}</div>
      </Reveal>
      <div style={{display: "flex", gap: 12, minHeight: 40}}>
        {parts.map((pt, i) => (
          <Reveal key={i} delay={pt.at} preset="rise">
            <span style={type("mono", "small", {color: c("textMuted")})}>{pt.text}</span>
          </Reveal>
        ))}
      </div>
    </div>
  );
};

/** contador compacto (o Counter da biblioteca pulsa no fim; aqui o número cresce junto com a coluna) */
const Counterzinho: React.FC<{to: number; at: number; color: string}> = ({to, at, color}) => {
  const p = useTween(at, 1.1, ease.enter);
  return <div style={type("display", "h1", {color: c(color), fontVariantNumeric: "tabular-nums"})}>{Math.round(to * p)}</div>;
};

const Exemplo: React.FC = () => {
  const anaNome = useCue("a Ana dá");
  const anaLance = useCue("quatro reais");
  const anaNota = useCue("qualidade dez");
  const anaPts = useCue("Quarenta pontos");
  const brunoNome = useCue("O Bruno");
  const brunoLance = useCue("oito reais");
  const brunoNota = useCue("nota três");
  const brunoPts = useCue("Vinte e quatro");
  const primeiro = useCue("fica em primeiro");
  const t = useTime();
  const venceu = t >= primeiro;
  const acende = useTween(primeiro, 0.6);
  const hA = COL.ana.pts * ESCALA;
  const hB = COL.bruno.pts * ESCALA;
  const keys: Key[] = [
    {t: 0, ...CAM4_PERTO},
    {t: anaPts - 0.2, ...CAM4_PERTO},
    {t: anaPts + 1.3, ...CAM4},
  ];
  const cam = camAt(keys, t);
  return (
    <AbsoluteFill>
      <Scene3D camera={CAM4_PERTO} floorY={0}>
        <CameraRig keys={keys} drift={0} />
        {/* pedestais */}
        {[COL.ana.x, COL.bruno.x].map((x, i) => (
          <Appear key={i} delay={0.05 + i * 0.12} enter="rise" position={[x, 0.05, 0]} seed={`ped${i}`}>
            <Solid size={[1.05, 0.1, 1.05]} color="surfaceAlt" />
          </Appear>
        ))}
        <Coluna x={COL.ana.x} h={hA} at={anaPts} color={venceu ? "accent" : "primary"} emissive={0.35 * acende} />
        <Coluna x={COL.bruno.x} h={hB} at={brunoPts} color={venceu ? "secondary" : "primary"} emissive={0} />
        {venceu && <Glow position={[COL.ana.x, hA * 0.7, -0.3]} size={2.6} delay={primeiro} duration={0.6} intensity={0.55} />}
        {/* lance (moeda) e nota (joia) na frente de cada pedestal, no tamanho do valor */}
        <Appear delay={anaLance} enter="drop" position={[-1.12, 0, 0.85]} seed="ana-moeda">
          <Moeda h={0.3} color="primary" />
        </Appear>
        <Appear delay={anaNota} enter="drop" position={[-0.56, 0, 0.85]} seed="ana-joia">
          <Joia h={0.56} color="primary" emissive={0.05} />
        </Appear>
        <Appear delay={brunoLance} enter="drop" position={[0.52, 0, 0.85]} seed="bruno-moeda">
          <Moeda h={0.58} color="primary" />
        </Appear>
        <Appear delay={brunoNota} enter="drop" position={[1.04, 0, 0.85]} seed="bruno-joia">
          <Joia h={0.24} color="primary" emissive={0.05} />
        </Appear>
      </Scene3D>
      <AbsoluteFill>
        <Rotulo
          cam={cam}
          x={COL.ana.x}
          h={hA}
          growAt={anaPts}
          nameAt={anaNome}
          name="Ana"
          parts={[
            {text: "R$ 4", at: anaLance},
            {text: "× 10", at: anaNota},
          ]}
          pts={COL.ana.pts}
          color={venceu ? "accent" : "text"}
          muted={false}
        />
        <Rotulo
          cam={cam}
          x={COL.bruno.x}
          h={hB}
          growAt={brunoPts}
          nameAt={brunoNome}
          name="Bruno"
          parts={[
            {text: "R$ 8", at: brunoLance},
            {text: "× 3", at: brunoNota},
          ]}
          pts={COL.bruno.pts}
          color="text"
          muted={venceu}
        />
      </AbsoluteFill>
      <SafeArea align="top">
        <Eyebrow text="exemplo simplificado" variant="line" color="textMuted" delay={0.1} exitAt={anaNome - 0.2} />
      </SafeArea>
      {[anaLance, anaNota, brunoLance, brunoNota].map((at, i) => (
        <Sfx key={i} name="pop" at={at + 0.25} volume={0.4} rate={0.95 + i * 0.05} />
      ))}
      <Sfx name="slide" at={anaPts} volume={0.4} />
      <Sfx name="slide" at={brunoPts} volume={0.35} rate={0.92} />
      <Sfx name="success" at={primeiro + 0.1} volume={0.5} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 5. O preço — R$ 4,00 → R$ 2,41 (paga só o necessário para superar o Bruno)
const Preco: React.FC = () => {
  const quatro = useCue("os quatro reais");
  const pagaSo = useCue("Paga só");
  const fim = useCue("centavos", {edge: "end"});
  const b = useBeat();
  const t = useTime();
  const k = interpolate(t, [pagaSo + 0.2, fim - 0.1], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.standard});
  const valor = 4 - (4 - 2.41) * k;
  const chegou = t >= fim - 0.1;
  const s = 1 - 0.36 * k;
  const a = frameSafe({center: [0, 0, 0], size: [1.7, 1.7, 0.4], azimuth: 0, elevation: 4, fill: 0.74});
  const z = frameSafe({center: [0, 0, 0], size: [1.7, 1.7, 0.4], azimuth: 0, elevation: 6, fill: 0.84});
  const txt = new Intl.NumberFormat("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(valor);
  const pop = useEnter(fim - 0.1, {spring: "pop"});
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floor="none">
        <CameraRig keys={[{t: 0, ...a}, {t: b.duration, ...z}]} />
        <Glow position={[0, 0, -0.6]} size={2.8} intensity={0.45} />
        <group scale={s}>
          <Spin speed={0.08} offset={-0.1}>
            <Moeda h={1.7} center emissive={0.12} />
          </Spin>
        </group>
      </Scene3D>
      <SafeArea align="top">
        <Reveal delay={quatro - 0.05} preset="blur">
          <div
            style={type("display", "hero", {
              color: c(chegou ? "accent" : "text"),
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              fontSize: ds.typography.scale.hero * 0.72,
              transform: `scale(${1 + (chegou ? Math.sin(Math.min(1, pop) * Math.PI) * 0.06 : 0)})`,
            })}
          >
            <span style={{fontSize: "0.5em", color: c("textMuted"), marginRight: 18}}>R$</span>
            {txt}
          </div>
        </Reveal>
      </SafeArea>
      <Sfx name="tick" at={pagaSo + 0.3} volume={0.3} />
      <Sfx name="tick" at={pagaSo + 1.3} volume={0.3} rate={1.08} />
      <Sfx name="ding" at={fim - 0.05} volume={0.55} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 6. Na Meta — celular no centro; lance, ação e qualidade orbitam e acendem um por vez
const Meta: React.FC = () => {
  const logica = useCue("a lógica é parecida");
  const cues = [useCue("pesa o lance"), useCue("a pessoa agir"), useCue("qualidade do anúncio")];
  const b = useBeat();
  const t = useTime();
  const ativo = cues.reduce((n, at, i) => (t >= at ? i : n), -1);
  const a = frameSafe({center: [0, 0.1, 0], size: [2.2, 2.5, 1.6], azimuth: -10, elevation: 10, fill: 0.95});
  const z = frameSafe({center: [0, 0.1, 0], size: [2.2, 2.5, 1.6], azimuth: 12, elevation: 14, fill: 1});
  const R = 1.0;
  const itens = [0, 1, 2].map((i) => {
    const ang = (i / 3) * Math.PI * 2 + 0.5;
    return [Math.sin(ang) * R, [0.7, 0.05, -0.6][i], Math.cos(ang) * R] as V3;
  });
  const col = (i: number) => (ativo === i ? "accent" : "primary");
  const em = (i: number) => (ativo === i ? 0.55 : 0.04);
  const words = ["Lance", "ação", "qualidade"];
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floor="none" fog={{near: 1.1, far: 2.8}}>
        <CameraRig keys={[{t: 0, ...a}, {t: b.duration, ...z}]} />
        <Particles count={40} spread={[5, 5, 4]} seed="meta" />
        <Phone3D position={[0, 0.1, 0]} rotation={[0, -0.22, 0]} scale={1.15} lit delay={0} enter="rise" />
        <Spin speed={0.05}>
          <Appear delay={0.15} enter="scale" position={itens[0]} seed="m0">
            <Moeda h={0.5} center color={col(0)} emissive={em(0)} />
          </Appear>
          <Appear delay={0.25} enter="scale" position={itens[1]} seed="m1">
            <Acao on={ativo === 1} at={cues[1]} />
          </Appear>
          <Appear delay={0.35} enter="scale" position={itens[2]} seed="m2">
            <Joia h={0.5} center color={col(2)} emissive={em(2)} />
          </Appear>
        </Spin>
      </Scene3D>
      <SafeArea align="top">
        <div style={{position: "relative", width: "100%", height: 200}}>
          <div style={{position: "absolute", inset: 0}}>
            <KineticText text="Mesma lógica." size="h2" delay={logica - 0.05} preset="mask" exitAt={cues[0] - 0.25} />
          </div>
          <div style={{position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 18, flexWrap: "nowrap"}}>
            {words.map((w, i) => (
              <React.Fragment key={w}>
                {i > 0 && (
                  <Reveal delay={cues[i] - 0.1} preset="fade">
                    <span style={type("display", "h3", {color: c("textMuted")})}>+</span>
                  </Reveal>
                )}
                <Reveal delay={cues[i] - 0.05} preset="rise">
                  <span style={type("display", "h3", {color: c(ativo === i ? "accent" : "text")})}>{w}</span>
                </Reveal>
              </React.Fragment>
            ))}
          </div>
        </div>
      </SafeArea>
      {cues.map((at, i) => (
        <Sfx key={i} name="pop" at={at + 0.05} volume={0.4} rate={1 + i * 0.07} />
      ))}
    </AbsoluteFill>
  );
};

/** "ação": um toque — esfera com uma onda que se expande quando a fala chega nela */
const Acao: React.FC<{on: boolean; at: number}> = ({on, at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const r = ((frame / fps - at) % 1.2) / 1.2;
  const showRing = on && frame / fps >= at;
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.2, 48, 48]} />
        <ThemedMaterial color={on ? "accent" : "primary"} emissive={on ? 0.6 : 0.04} />
      </mesh>
      {showRing && (
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={0.2 + r * 0.9}>
          <torusGeometry args={[0.5, 0.012, 8, 64]} />
          <meshBasicMaterial color={c("accent")} transparent opacity={(1 - r) * 0.8} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// 7. Fechamento — volta ao salão; a joia na luz; o martelo bate em "dinheiro"
const Fechamento: React.FC = () => {
  const rel = useCue("relevância vale");
  const dinheiro = useCue("dinheiro");
  const antes = useCue("Antes de aumentar");
  const melhore = useCue("melhore o anúncio");
  const b = useBeat();
  const t = useTime();
  const impact = dinheiro + 0.22;
  const bright = interpolate(t, [0, 0.8, impact, impact + 0.6], [0.5, 0.66, 0.66, 0.8], {extrapolateRight: "clamp"});
  return (
    <AbsoluteFill>
      <Scene3D camera={{position: [-0.1, 0.0, 10.6], target: [0, 0, 0]}} fog={null} floor="none">
        <CameraRig
          keys={[
            {t: 0, position: [-0.12, 0.02, 10.6], target: [0, -0.05, 0]},
            {t: b.duration, position: [0.08, -0.04, 9.7], target: [0, -0.1, 0]},
          ]}
        />
        <Salao width={3.3} brightness={bright} />
        <Glow position={[-0.25, -0.25, 2.8]} size={1.6} intensity={0.55} />
        <Appear delay={0.1} enter="rise" position={[-0.25, -0.55, 3.2]} float={0.3} seed="joia-final">
          <Spin speed={0.04}>
            <Joia h={0.5} emissive={0.45} />
          </Spin>
        </Appear>
        <GolpeMartelo at={impact} from={0} h={0.5} position={[0.62, -0.3, 3.2]} rotationY={-0.25} />
        <Clarao at={impact} position={[0.19, -0.48, 3.4]} size={1.5} />
      </Scene3D>
      <Sombra />
      <SafeArea align="top">
        <div style={{position: "relative", width: "100%", height: 260}}>
          <div style={{position: "absolute", inset: 0}}>
            <KineticText text={"Relevância\nvale *dinheiro*."} size="h1" delay={rel - 0.05} preset="mask" exitAt={antes - 0.1} />
          </div>
          <div style={{position: "absolute", inset: 0}}>
            <KineticText text={"Melhore\no *anúncio*."} size="h1" delay={melhore - 0.1} preset="mask" />
          </div>
        </div>
      </SafeArea>
      <Sfx name="riser" at={Math.max(0, impact - 1.4)} volume={0.4} />
      <Sfx name="boom" at={impact} volume={0.6} />
      <Sfx name="swell" at={Math.max(0, b.duration - 2.4)} volume={0.35} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
const Video: React.FC = () => (
  <Explainer
    tl={tl}
    audio={staticFile(`videos/${SLUG}/narracao.wav`)}
    hideCaptions={[
      [tl.at("E quem paga"), tl.at("Cada anunciante")],
      [tl.at("relevância vale"), tl.at("Antes de aumentar")],
      [tl.at("melhore o anúncio"), tl.duration + 5],
    ]}
    scenes={[
      {beat: B[0], component: Gancho},
      {beat: B[1], component: Disputa},
      {beat: B[2], component: Qualidade},
      {beat: B[3], component: Exemplo},
      {beat: B[4], component: Preco},
      {beat: B[5], component: Meta},
      {beat: B[6], component: Fechamento, transition: "fade"},
    ]}
  />
);

const def: VideoDef = {id: SLUG, component: Video, duration: B[B.length - 1].end};
export default def;
