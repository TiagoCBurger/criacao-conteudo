import React from "react";
import {AbsoluteFill, Easing, interpolate, staticFile} from "remotion";
import {FPS, type VideoDef} from "../../config";
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
import {BoletoLineup, PitchLines} from "../../serie-placar/boletos";
import {BrollPlate} from "../../serie-placar/broll";
import {Confetti} from "../../serie-placar/confete";
import {type LedRect, type LedText, Scoreboard, Stadium} from "../../serie-placar/led";
import {BOARD_W, boardCam, COLS, CtaPlacar, FLOOR_Y, L, layer, POSTS, R, ROWS, subLabel, TopBlock, versus} from "../../serie-placar/placar";
import {SlicedOrder} from "../../serie-placar/pedido";
import {ContaPlacar, Prancheta, SeloExemplo} from "../../serie-placar/placar2d";

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

const BROLL = (f: string) => staticFile(`videos/${SLUG}/broll/${f}`);

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
  const a = boardCam(0.66, -14, -7, false, -1.05);
  const z = boardCam(0.74, -7, -7, false, -0.55);
  // b-roll: o "primeiro pedido" na chapa, embaixo do placar; some antes do 57 cravar (preso à fala).
  // Trechos limpos do clipe: 0–1,15 s (espátula prensando) e 2,75–3,95 s (queijo já pousado, dedo enluvado
  // pressionando). Fica de fora 1,2–2,7 s: o queijo desce com a mão fora do quadro e parece "flutuar".
  const out0 = Math.min(1.8, c57 - 0.9);
  const out1 = Math.min(2.35, c57 - 0.3);
  return (
    <AbsoluteFill>
      <BrollPlate
        clips={[
          {src: BROLL("v1-smash.mp4"), at: 0, srcFrom: 0, srcTo: 1.15},
          {src: BROLL("v1-smash.mp4"), at: 1.15, srcFrom: 2.75, srcTo: 3.95},
        ]}
        opacity={[
          [0, 1],
          [out0, 1],
          [out1, 0],
        ]}
        top={[0.38, 0.5]}
        bottom={0.66}
        darken={0.2}
        shiftY={-30}
        zoom={[1.02, 1.08]}
        zoomDur={3}
        originY={0.55}
      />
      <Scene3D camera={a} floorY={FLOOR_Y}>
        <CameraRig keys={[{t: 0, ...a}, {t: zero + 0.8, ...z}]} />
        <Stadium />
        <Scoreboard
          texts={b.texts}
          rects={b.rects}
          width={BOARD_W}
          cols={COLS}
          rows={ROWS}
          posts={0}
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
  const travel = 1.5;
  // fila de lado, como time perfilado; o 1º boleto vai até a ponta esquerda
  const slot = (i: number): [number, number, number] => [-1.2 + i * 0.6, 0, 0.3 - 0.3 * i];
  const a = frameSafe({center: [0.08, 0.65, -0.3], size: [3.2, 1.3, 1.3], azimuth: 14, elevation: 8, fill: 0.84});
  const b = frameSafe({center: [0.08, 0.65, -0.3], size: [3.2, 1.3, 1.3], azimuth: 24, elevation: 12, fill: 0.88});
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floorY={0}>
        <CameraRig keys={[{t: 0, ...a}, {t: fixo + 1.2, ...b}]} />
        <PitchLines />
        {/* a fila já está entrando no corte (start < 0): a cena nunca abre com o campo vazio */}
        <BoletoLineup count={N_BOLETOS} start={-0.5} step={step} travel={travel} slot={slot} from={[3.6, 0, -2.6]} face={0.32} glowAt={v22} />
      </Scene3D>
      <TopBlock>
        <Reveal delay={v22 - 0.08} preset="blur" style={layer}>
          <div style={type("display", "h1", {color: c("negative")})}>R$ 22 mil</div>
        </Reveal>
        <Reveal delay={fixo - 0.05} preset="rise" distance={24} style={{...layer, top: 160}}>
          <div style={subLabel}>custo fixo por mês</div>
        </Reveal>
      </TopBlock>
      <Sfx name="thud" at={-0.5 + travel * 0.9} volume={0.45} />
      {[1, 2, 3].map((i) => (
        <Sfx key={i} name="tick" at={-0.5 + i * step + travel * 0.9} volume={0.35} rate={0.9 + i * 0.05} />
      ))}
      <Sfx name="thud" at={-0.5 + (N_BOLETOS - 1) * step + travel * 0.9} volume={0.5} />
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
  const a = boardCam(0.66, 12, -7, false, -1.0);
  const z = boardCam(0.7, 5, -7, false, -0.85);
  return (
    <AbsoluteFill>
      {/* b-roll: o pico (sacolas lacradas) embaixo do placar. O terço de cima do clipe (pessoas desfocadas,
          uma sem touca) fica coberto pelo fundo; em "Perdeu" a imagem perde a cor e apaga. */}
      <BrollPlate
        clips={[{src: BROLL("v1-pico.mp4"), at: 0, srcFrom: 0, srcTo: 4}]}
        opacity={[
          [0, 1],
          [perdeu + 0.5, 1],
          [Math.min(3.95, perdeu + 1.3), 0],
        ]}
        top={[0.44, 0.56]}
        darken={0.2}
        shiftY={120}
        zoom={[1.06, 1.12]}
        zoomDur={4}
        originY={0.9}
        drainAt={perdeu}
      />
      <Scene3D camera={a} floorY={FLOOR_Y}>
        <CameraRig keys={[{t: 0, ...a}, {t: perdeu + 1.6, ...z}]} />
        <Stadium />
        <Scoreboard
          texts={b.texts}
          rects={b.rects}
          width={BOARD_W}
          cols={COLS}
          rows={ROWS}
          posts={0}
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
      {beat: B[7], component: CtaPlacar},
    ]}
  />
);

// duração em quadro inteiro: o Explainer arredonda o fim da última cena e o Root usa ceil;
// sem isto pode sobrar 1 quadro vazio no fim (aparece como piscada preta no loop do Reels)
const def: VideoDef = {id: SLUG, component: Video, duration: Math.round(B[B.length - 1].end * FPS) / FPS};
export default def;
