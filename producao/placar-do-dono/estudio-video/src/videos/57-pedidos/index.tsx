import React from "react";
import {AbsoluteFill, Easing, interpolate, staticFile} from "remotion";
import type {VideoDef} from "../../config";
import {
  beats,
  c,
  CameraRig,
  Counter,
  Explainer,
  frameSafe,
  KineticText,
  Reveal,
  SafeArea,
  Scene3D,
  Sfx,
  timeline,
  type,
  useCue,
  useTime,
} from "../../lib";
import tlJson from "../../../public/videos/57-pedidos/timeline.json";
import {BoletoLineup, PitchLines} from "./boletos";
import {Confetti} from "./confete";
import {type LedRect, type LedText, Scoreboard, Stadium} from "./led";
import {SlicedOrder} from "./pedido";
import {ContaPlacar, Prancheta, SeloExemplo} from "./placar2d";

const SLUG = "57-pedidos";
const tl = timeline(tlJson as never);

// Cenas ancoradas na fala (nunca em segundos): sobrevivem à regravação da narração.
const B = beats(tl, [
  {id: "gancho", cue: 0},
  {id: "quanto-sobra", cue: "Pega um pedido"},
  {id: "os-boletos", cue: "E isso nem"},
  {id: "a-conta", cue: "Vinte e dois mil divididos"},
  {id: "o-dia-bom", cue: "Aquele dia de"},
  {id: "a-virada", cue: "Pra virar o"},
  {id: "meta-45", cue: "Juntos a meta"},
  {id: "cta", cue: "Comenta PLACAR"},
]);

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

// ---------------------------------------------------------------------------------------------
// Layout do placar "VOCÊ × BOLETOS" (unidades de LED: 120 colunas × 90 linhas)
// ---------------------------------------------------------------------------------------------
const COLS = 120;
const ROWS = 90;
const BOARD_W = 3;
const BOARD_H = (BOARD_W * ROWS) / COLS;
const POSTS = 2.2;
const FLOOR_Y = -BOARD_H / 2 - 0.13 - POSTS;
const L = 31; // centro da coluna "VOCÊ"
const R = 89; // centro da coluna "BOLETOS"

const versus = ({
  you,
  them,
  top,
  youLevel = 1,
  themLevel = 1,
  themColor = "accent",
  youColor = "accent",
}: {
  you: string;
  them: string;
  top?: string;
  youLevel?: number;
  themLevel?: number;
  themColor?: string;
  youColor?: string;
}): {texts: LedText[]; rects: LedRect[]} => ({
  texts: [
    ...(top ? [{text: top, x: COLS / 2, y: 10, size: 7, color: "textMuted", level: 0.9, tracking: 1}] : []),
    {text: "VOCÊ", x: L, y: 26, size: 11, color: "text", tracking: 1},
    {text: "BOLETOS", x: R, y: 26, size: 11, color: "text", tracking: 1},
    {text: you, x: L, y: 61, size: 40, color: youColor, level: youLevel},
    {text: "×", x: COLS / 2, y: 59, size: 24, color: "textMuted", level: 0.85},
    {text: them, x: R, y: 61, size: 40, color: themColor, level: themLevel},
  ],
  rects: [
    {x: L - 13, y: 35, w: 26, h: 1, color: "positive", level: 0.9},
    {x: R - 21, y: 35, w: 42, h: 1, color: "negative", level: 0.9},
  ],
});

/** Câmera do placar: contra-plongée leve, enquadrada para a faixa livre do 9:16. */
// center.x > 0 desloca o placar um pouco para a esquerda: a borda direita fica fora da coluna de botões do app
const boardCam = (fill: number, azimuth: number, elevation = -7, title = false) =>
  frameSafe({center: [0.08, 0, 0], size: [BOARD_W + 0.3, BOARD_H + 0.3, 0.4], azimuth, elevation, fill, title});

// ---------------------------------------------------------------------------------------------
// 1. Gancho — o dia já começa perdendo de 57 a 0
// ---------------------------------------------------------------------------------------------
const Gancho: React.FC = () => {
  const t = useTime();
  const c57 = useCue("cinquenta e sete");
  const zero = useCue("a zero");
  // o placar dos boletos sobe sozinho enquanto a voz fala e crava 57 na palavra
  // acelera até o fim: os boletos "marcam" cada vez mais rápido e o 57 cai junto com a palavra
  const k = interpolate(t, [0.3, c57 + 0.04], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const n = Math.round(57 * k);
  const flash = interpolate(t, [c57, c57 + 0.12, c57 + 1.1], [0, 1, 0.15], clamp);
  const b = versus({you: "0", them: String(n), top: "1º TEMPO"});
  const a = boardCam(0.72, -14);
  const z = boardCam(0.78, -7);
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floorY={FLOOR_Y}>
        <CameraRig keys={[{t: 0, ...a}, {t: zero + 0.8, ...z}]} />
        <Stadium />
        <Scoreboard
          texts={b.texts}
          rects={b.rects}
          width={BOARD_W}
          cols={COLS}
          rows={ROWS}
          posts={POSTS}
          heat={flash}
          glows={[{x: R, y: 61, size: 1.6 + flash * 1.2, intensity: 0.25 + flash * 0.4}]}
        />
      </Scene3D>
      <Sfx name="riser" at={Math.max(0, c57 - 1.4)} volume={0.55} />
      <Sfx name="boom" at={c57 + 0.12} volume={0.45} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// Bloco de número no terço superior (abaixo do selo "exemplo")
// ---------------------------------------------------------------------------------------------
const TopBlock: React.FC<{children: React.ReactNode}> = ({children}) => (
  <SafeArea align="top" style={{paddingTop: 300}} gap={8}>
    <div style={{position: "relative", width: "100%", height: 260}}>{children}</div>
  </SafeArea>
);
const layer: React.CSSProperties = {position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center"};
const subLabel = type("body", "body", {color: c("textMuted")});

// ---------------------------------------------------------------------------------------------
// 2. Quanto sobra — de R$ 46, sobram R$ 12,88
// ---------------------------------------------------------------------------------------------
const KEEP = 0.28;
const COST = (1 - KEEP) / 4; // as 4 fatias de custo são desenhadas iguais: o kit não traz a divisão dos 72%
const QuantoSobra: React.FC = () => {
  const r46 = useCue("quarenta e seis reais");
  const cuts = [useCue("insumo"), useCue("embalagem"), useCue("app"), useCue("imposto")];
  const sobram = useCue("sobram");
  const v1288 = useCue("doze e oitenta e oito");
  const a = frameSafe({center: [0.08, 0.1, 0], size: [2.5, 0.35, 2.5], azimuth: 12, elevation: 40, fill: 0.74});
  const b = frameSafe({center: [0.08, 0.1, 0], size: [2.5, 0.35, 2.5], azimuth: 30, elevation: 44, fill: 0.78});
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floorY={0}>
        <CameraRig keys={[{t: 0, ...a}, {t: v1288 + 1.2, ...b}]} />
        {/* a fatia que fica (28%) começa voltada para a câmera; as de custo seguem em volta */}
        <SlicedOrder
          start={-Math.PI / 2 - KEEP * Math.PI}
          slices={[{frac: KEEP, litAt: sobram}, ...cuts.map((at) => ({frac: COST, cutAt: at}))]}
          enterAt={0}
        />
      </Scene3D>
      <TopBlock>
        <Reveal delay={r46 - 0.08} preset="blur" exitAt={sobram - 0.15} style={layer}>
          <Counter to={46} prefix="R$ " size="h1" delay={r46 - 0.08} duration={0.55} color="text" />
        </Reveal>
        <Reveal delay={v1288 - 0.1} preset="pop" style={layer}>
          <Counter from={12.88} to={12.88} decimals={2} prefix="R$ " size="h1" delay={v1288 - 0.1} duration={0.01} color="accent" />
          <div style={{...subLabel, marginTop: 14}}>28% do pedido</div>
        </Reveal>
      </TopBlock>
      <Sfx name="pop" at={r46 + 0.05} volume={0.7} />
      {cuts.map((at, i) => (
        <Sfx key={i} name="swish" at={at + 0.05} volume={0.75 - i * 0.1} rate={[1, 1.08, 0.94, 1.12][i]} />
      ))}
      <Sfx name="sparkle" at={sobram + 0.15} volume={0.7} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 3. Os boletos — o time adversário entra em campo
// ---------------------------------------------------------------------------------------------
const N_BOLETOS = 5;
const OsBoletos: React.FC = () => {
  const v22 = useCue("vinte e dois mil");
  const fixo = useCue("custo fixo do mês");
  const step = 0.3;
  const travel = 1.3;
  // fila de lado, como time perfilado; o 1º boleto vai até a ponta esquerda
  const slot = (i: number): [number, number, number] => [-1.2 + i * 0.6, 0, 0.3 - 0.3 * i];
  const a = frameSafe({center: [0.08, 0.65, -0.3], size: [3.2, 1.3, 1.3], azimuth: 14, elevation: 8, fill: 0.84});
  const b = frameSafe({center: [0.08, 0.65, -0.3], size: [3.2, 1.3, 1.3], azimuth: 24, elevation: 12, fill: 0.88});
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floorY={0}>
        <CameraRig keys={[{t: 0, ...a}, {t: fixo + 1.2, ...b}]} />
        <PitchLines />
        <BoletoLineup count={N_BOLETOS} start={0} step={step} travel={travel} slot={slot} from={[4.6, 0, -3.2]} face={0.32} glowAt={v22} />
      </Scene3D>
      <TopBlock>
        <Reveal delay={v22 - 0.08} preset="blur" style={layer}>
          <div style={type("display", "h1", {color: c("negative")})}>R$ 22 mil</div>
        </Reveal>
        <Reveal delay={fixo - 0.05} preset="rise" distance={24} style={{...layer, top: 160}}>
          <div style={subLabel}>custo fixo por mês</div>
        </Reveal>
      </TopBlock>
      <Sfx name="thud" at={travel * 0.9} volume={0.45} />
      {[1, 2, 3].map((i) => (
        <Sfx key={i} name="tick" at={i * step + travel * 0.9} volume={0.35} rate={0.9 + i * 0.05} />
      ))}
      <Sfx name="thud" at={(N_BOLETOS - 1) * step + travel * 0.9} volume={0.5} />
      <Sfx name="thud" at={v22 + 0.05} volume={0.75} rate={0.85} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 4. A conta — em tipografia de placar
// ---------------------------------------------------------------------------------------------
const AConta: React.FC = () => {
  const at22 = useCue("Vinte e dois mil");
  const atDiv = useCue("divididos por");
  const at1709 = useCue("mil setecentos e nove");
  const atMes = useCue("pedidos no mês");
  const at57 = useCue("Cinquenta e sete por dia");
  const atEmpate = useCue("Só pra empatar");
  return (
    <AbsoluteFill>
      <ContaPlacar at22={at22} atDiv={atDiv} at1709={at1709} atMes={atMes} at57={at57} atEmpate={atEmpate} />
      <Sfx name="tick" at={at22 + 0.05} volume={0.5} />
      <Sfx name="tick" at={atDiv + 0.1} volume={0.45} rate={1.1} />
      <Sfx name="ding" at={at1709 + 0.85} volume={0.5} />
      <Sfx name="slide" at={atMes + 0.5} volume={0.5} />
      <Sfx name="thud" at={at57 + 0.1} volume={0.7} />
      <Sfx name="sparkle" at={at57 + 0.25} volume={0.45} />
      <Sfx name="thud" at={atEmpate + 0.22} volume={0.55} rate={1.2} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 5. O dia bom — 40 pedidos comemorados ainda é derrota
// ---------------------------------------------------------------------------------------------
const ODiaBom: React.FC = () => {
  const t = useTime();
  const q40 = useCue("quarenta pedidos");
  const perdeu = useCue("Perdeu");
  const c57 = useCue("cinquenta e sete");
  const k = interpolate(t, [q40, q40 + 0.75], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const you = Math.round(40 * k);
  const burst = q40 + 0.8;
  const youLevel = interpolate(t, [perdeu, perdeu + 0.5], [1, 0.32], clamp);
  const celebrate = interpolate(t, [burst, burst + 0.15, burst + 0.9], [0, 0.8, 0.1], clamp);
  const flash = interpolate(t, [c57, c57 + 0.12, c57 + 0.9], [0, 1, 0.25], clamp);
  const b = versus({you: String(you), them: "57", youLevel});
  const a = boardCam(0.72, 12);
  const z = boardCam(0.77, 5);
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floorY={FLOOR_Y}>
        <CameraRig keys={[{t: 0, ...a}, {t: perdeu + 1.6, ...z}]} />
        <Stadium />
        <Scoreboard
          texts={b.texts}
          rects={b.rects}
          width={BOARD_W}
          cols={COLS}
          rows={ROWS}
          posts={POSTS}
          heat={Math.max(celebrate * 0.6, flash)}
          glows={[
            {x: L, y: 61, size: 1.4 + celebrate, intensity: (0.15 + celebrate * 0.35) * youLevel},
            {x: R, y: 61, size: 1.4 + flash * 1.2, intensity: 0.2 + flash * 0.4},
          ]}
        />
        <Confetti burstAt={burst} wiltAt={perdeu} top={0.9} area={[3.2, 1.1, 1.3]} floor={-2.2} />
      </Scene3D>
      <Sfx name="pop" at={burst} volume={0.6} />
      <Sfx name="sparkle" at={burst + 0.1} volume={0.6} />
      <Sfx name="reverse" at={Math.max(0, perdeu - 0.55)} volume={0.35} />
      <Sfx name="error" at={perdeu + 0.15} volume={0.45} />
      <Sfx name="thud" at={c57 + 0.1} volume={0.6} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 6. A virada — três jogadas na prancheta
// ---------------------------------------------------------------------------------------------
const AVirada: React.FC = () => {
  const virar = useCue("virar o jogo");
  const combo = useCue("combo");
  const ficha = useCue("ficha técnica");
  const osso = useCue("custo fixo no osso");
  return (
    <AbsoluteFill>
      <Prancheta
        enterAt={0}
        diagramAt={virar}
        plays={[
          {label: "Ticket", value: "R$ 50", dir: "up", at: combo},
          {label: "Margem", value: "30%", dir: "up", at: ficha},
          {label: "Fixo", value: "R$ 20 mil", dir: "down", at: osso},
        ]}
      />
      <Sfx name="whoosh-soft" at={virar + 0.4} volume={0.4} />
      {[combo, ficha, osso].map((at, i) => (
        <React.Fragment key={i}>
          <Sfx name="swish" at={at} volume={0.55} rate={1 + i * 0.06} />
          <Sfx name="click" at={at + 0.35} volume={0.5} />
        </React.Fragment>
      ))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 7. Meta 45 — a meta cai e o placar acende em verde
// ---------------------------------------------------------------------------------------------
const Meta45: React.FC = () => {
  const t = useTime();
  const cai = useCue("a meta cai");
  const q45 = useCue("quarenta e cinco");
  const k = interpolate(t, [cai + 0.2, q45 + 0.05], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const n = Math.round(57 - 12 * k);
  const done = t >= q45 + 0.05;
  const flash = interpolate(t, [q45 + 0.05, q45 + 0.2, q45 + 1.2], [0, 1, 0.2], clamp);
  const texts: LedText[] = [
    {text: "META", x: COLS / 2, y: 15, size: 11, color: "text", tracking: 2},
    {text: String(n), x: COLS / 2, y: 52, size: 46, color: done ? "positive" : "accent"},
    {text: "PEDIDOS POR DIA", x: COLS / 2, y: 80, size: 7, color: "textMuted", level: 0.9, tracking: 1},
  ];
  const rects: LedRect[] = [{x: COLS / 2 - 16, y: 23, w: 32, h: 1, color: done ? "positive" : "accent", level: 0.8}];
  const a = boardCam(0.72, -10);
  const z = boardCam(0.77, -3);
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floorY={FLOOR_Y}>
        <CameraRig keys={[{t: 0, ...a}, {t: q45 + 1.2, ...z}]} />
        <Stadium />
        <Scoreboard
          texts={texts}
          rects={rects}
          width={BOARD_W}
          cols={COLS}
          rows={ROWS}
          posts={POSTS}
          heat={flash}
          glows={[{x: COLS / 2, y: 52, size: 1.8 + flash * 1.4, color: done ? "positive" : "accent", intensity: 0.25 + flash * 0.4}]}
        />
      </Scene3D>
      <Sfx name="slide" at={cai + 0.2} volume={0.45} />
      <Sfx name="success" at={q45 + 0.1} volume={0.6} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 8. CTA — Comenta PLACAR
// ---------------------------------------------------------------------------------------------
const Cta: React.FC = () => {
  const t = useTime();
  const comenta = useCue("Comenta PLACAR");
  const placar = useCue("PLACAR");
  const blink = t < 0.35 ? 1 : Math.floor((t - 0.35) * 2.4) % 2 === 0 ? 1 : 0.3;
  const b = versus({you: "0", them: "??", themLevel: blink});
  const a = boardCam(0.7, -8, -5, true);
  const z = boardCam(0.76, -2, -4, true);
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floorY={FLOOR_Y}>
        <CameraRig keys={[{t: 0, ...a}, {t: 4.5, ...z}]} />
        {/* sem torres de luz: o título ocupa o topo e as lâmpadas atrás dele atrapalhariam a leitura */}
        <Stadium lamps={false} />
        <Scoreboard texts={b.texts} rects={b.rects} width={BOARD_W} cols={COLS} rows={ROWS} posts={POSTS} glows={[{x: R, y: 61, size: 1.5, intensity: 0.3 * blink}]} />
      </Scene3D>
      <SafeArea align="top" style={{paddingTop: 250}}>
        <KineticText text={"Comenta\n*PLACAR*"} size="h1" delay={comenta - 0.1} preset="mask" />
      </SafeArea>
      <Sfx name="pop" at={comenta} volume={0.6} />
      <Sfx name="sparkle" at={placar + 0.15} volume={0.55} />
    </AbsoluteFill>
  );
};

// Trechos em que o texto na tela é a própria fala: a legenda some (calculado da fala, não em segundos).
const HIDE: [number, number][] = [
  [tl.at("Só pra empatar") - 0.05, tl.end("Só pra empatar") + 0.65],
  [tl.at("Comenta PLACAR") - 0.05, tl.at("eu te mando") - 0.02],
];
// Selo "exemplo" nas cenas com os números de entrada (R$ 46, 28%, R$ 22 mil, conta, jogadas).
const SELO: [number, number][] = [
  [B[1].start, B[3].end],
  [B[5].start, B[5].end],
];

const Video: React.FC = () => (
  <Explainer
    tl={tl}
    audio={staticFile(`videos/${SLUG}/narracao.wav`)}
    hideCaptions={HIDE}
    over={<SeloExemplo windows={SELO} />}
    scenes={[
      {beat: B[0], component: Gancho},
      {beat: B[1], component: QuantoSobra},
      {beat: B[2], component: OsBoletos},
      {beat: B[3], component: AConta},
      {beat: B[4], component: ODiaBom},
      {beat: B[5], component: AVirada},
      {beat: B[6], component: Meta45},
      {beat: B[7], component: Cta},
    ]}
  />
);

const def: VideoDef = {id: SLUG, component: Video, duration: B[B.length - 1].end};
export default def;
