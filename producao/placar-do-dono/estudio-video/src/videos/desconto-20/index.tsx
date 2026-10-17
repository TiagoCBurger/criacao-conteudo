import React from "react";
import {AbsoluteFill, Easing, interpolate, staticFile} from "remotion";
import {FPS, type VideoDef} from "../../config";
import {beats, c, CameraRig, ease, Explainer, frameSafe, KineticText, mix, Reveal, Scene3D, Sfx, timeline, type, useCue, useTime} from "../../lib";
import tlJson from "../../../public/videos/desconto-20/timeline.json";
import {SegLabel, segCenter, StackBar, type Seg} from "../../serie-placar/barras";
import {BrollPlate} from "../../serie-placar/broll";
import {BurgerField} from "../../serie-placar/burgers";
import {Scoreboard, Stadium} from "../../serie-placar/led";
import {PranchetaChecklist, SeloExemplo} from "../../serie-placar/placar2d";
import {BOARD_W, boardCam, COLS, CtaPlacar, FLOOR_Y, L, layer, POSTS, R, ROWS, subLabel, TopBlock, versus} from "../../serie-placar/placar";

const SLUG = "desconto-20";
const tl = timeline(tlJson as never);

// Cenas ancoradas na fala (nunca em segundos): sobrevivem a uma regravação da narração.
const B = beats(tl, [
  {id: "gancho", cue: 0},
  {id: "o-lanche", cue: "Um lanche de"},
  {id: "com-desconto", cue: "Com vinte por cento off"},
  {id: "insumo", cue: "Mas o insumo"},
  {id: "quanto-sobra", cue: "Sobram seis"},
  {id: "a-conta", cue: "Pra ganhar o mesmo"},
  {id: "a-piada", cue: "Vendeu cem lanches"},
  {id: "a-virada", cue: "Antes da próxima"},
  {id: "cta", cue: "Comenta PLACAR"},
]);

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const BROLL = (f: string) => staticFile(`videos/${SLUG}/broll/${f}`);
const tw = (t: number, a: number, d = 0.5) => interpolate(t, [a, a + d], [0, 1], {...clamp, easing: ease.enter});

// Números do kit (seção 2). Preço R$ 38: insumo e embalagem 14,70 · app 9,50 · imposto 2,28 · sobra 11,52.
// Com 20% off (R$ 30,40): insumo e embalagem continuam 14,70; app (25%) e imposto (6%) na proporção; sobra 6,28.
const ANTES = [14.7, 9.5, 2.28, 11.52];
const DEPOIS = [14.7, 30.4 * 0.25, 30.4 * 0.06, 6.28];
const BOTTOM = 1330; // base das barras (px): logo acima da faixa da legenda

// ---------------------------------------------------------------------------------------------
// 1. Gancho — VOCÊ 0 × 20%: desconto = vender quase o dobro
// ---------------------------------------------------------------------------------------------
const Gancho: React.FC = () => {
  const t = useTime();
  const v20 = useCue("vinte por cento");
  const dobro = useCue("quase o dobro");
  const flash = interpolate(t, [v20, v20 + 0.12, v20 + 1], [0, 1, 0.15], clamp);
  const b = versus({you: "0", them: t >= v20 ? "20%" : "0", themLabel: "DESCONTO", themSize: t >= v20 ? 26 : 40});
  const a = boardCam(0.66, -12, -7, false, -1.05);
  const z = boardCam(0.7, -6, -7, false, -0.95);
  // b-roll: o lanche na caixa, embaixo do placar; apaga antes de "quase o dobro" (clipe tem 4 s)
  const out1 = Math.min(3.98, dobro + 0.1);
  const out0 = out1 - 0.7;
  return (
    <AbsoluteFill>
      <BrollPlate
        clips={[{src: BROLL("v2-caixa.mp4"), at: 0, srcFrom: 0, srcTo: 4}]}
        opacity={[
          [0, 1],
          [out0, 1],
          [out1, 0],
        ]}
        top={[0.4, 0.52]}
        bottom={0.68}
        darken={0.18}
        shiftY={250}
        zoom={[1.0, 1.06]}
        zoomDur={4}
        originY={0.7}
      />
      <Scene3D camera={a} floorY={FLOOR_Y}>
        <CameraRig keys={[{t: 0, ...a}, {t: dobro + 1, ...z}]} />
        <Stadium />
        <Scoreboard
          texts={b.texts}
          rects={b.rects}
          width={BOARD_W}
          cols={COLS}
          rows={ROWS}
          posts={0}
          heat={flash}
          glows={[{x: R, y: 61, size: 1.5 + flash, intensity: 0.2 + flash * 0.4}]}
        />
      </Scene3D>
      <div style={{position: "absolute", left: 0, right: 0, top: 1040, display: "flex", justifyContent: "center"}}>
        <KineticText text={"Quase o\n*dobro*"} size="h1" delay={dobro - 0.1} preset="mask" />
      </div>
      <Sfx name="thud" at={v20 + 0.05} volume={0.6} />
      <Sfx name="pop" at={dobro + 0.3} volume={0.55} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 2. O lanche — R$ 38 fatiado; sobram R$ 11,52
// ---------------------------------------------------------------------------------------------
const K1 = 21.3; // px por real
const BAR1 = {x: 170, w: 230};
const O_Lanche: React.FC = () => {
  const t = useTime();
  const r38 = useCue("trinta e oito");
  const cuts = [useCue("insumo"), useCue("app"), useCue("imposto")];
  const sobram = useCue("sobram");
  const v1152 = useCue("onze e cinquenta e dois");
  const grow = tw(t, 0, 0.8);
  const k = cuts.map((a) => tw(t, a, 0.35));
  const ks = tw(t, sobram, 0.4);
  const dim = 1 - ks * 0.45;
  const segs: Seg[] = ANTES.slice(0, 3).map((v, i) => ({value: v, color: mix("primary", "negative", k[i]), opacity: dim}));
  segs.push({value: ANTES[3], color: mix("primary", "positive", ks), glow: ks});
  const lx = BAR1.x + BAR1.w + 40;
  const lab = [
    {name: "insumo e embalagem", value: "R$ 14,70"},
    {name: "app", value: "R$ 9,50"},
    {name: "imposto", value: "R$ 2,28", inline: true},
  ];
  return (
    <AbsoluteFill>
      <StackBar x={BAR1.x} width={BAR1.w} bottom={BOTTOM} k={K1} segs={segs} grow={grow} />
      <Reveal delay={r38 - 0.1} preset="rise" distance={30} style={{position: "absolute", left: BAR1.x - 60, width: BAR1.w + 120, top: BOTTOM - 38 * K1 - 175, textAlign: "center"}}>
        <div style={type("display", "h1", {color: c("text")})}>R$ 38</div>
      </Reveal>
      {lab.map((l, i) => (
        <SegLabel key={i} x={lx} y={segCenter(ANTES.map((v) => ({value: v})), i, BOTTOM, K1)} name={l.name} value={l.value} color="negative" p={k[i]} opacity={dim} inline={l.inline} />
      ))}
      <SegLabel x={lx} y={segCenter(ANTES.map((v) => ({value: v})), 3, BOTTOM, K1)} name="sobra" value="R$ 11,52" color="positive" size="h2" p={tw(t, v1152 - 0.1, 0.4)} />
      <Sfx name="pop" at={r38} volume={0.5} />
      {cuts.map((a, i) => (
        <Sfx key={i} name="swish" at={a + 0.05} volume={0.65 - i * 0.1} rate={[1, 1.08, 0.95][i]} />
      ))}
      <Sfx name="ding" at={sobram + 0.3} volume={0.5} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 3. Com desconto — o preço vira R$ 30,40, mas o bloco de insumo e embalagem não encolhe
// ---------------------------------------------------------------------------------------------
const BAR_A = {x: 150, w: 200};
const BAR_B = {x: 520, w: 240};
const ComDesconto: React.FC = () => {
  const t = useTime();
  const v20 = useCue("vinte por cento");
  const v3040 = useCue("trinta e quarenta");
  const eA = tw(t, 0, 0.4);
  const gB = tw(t, v3040 - 0.1, 0.7);
  const tag = tw(t, v20 - 0.05, 0.35) * (1 - tw(t, v3040 - 0.35, 0.25));
  const line = tw(t, v3040 + 0.55, 0.45);
  const insTop = BOTTOM - 14.7 * K1;
  const antesSegs: Seg[] = [
    {value: ANTES[0], color: "negative", opacity: 0.55},
    {value: ANTES[1], color: "negative", opacity: 0.35},
    {value: ANTES[2], color: "negative", opacity: 0.35},
    {value: ANTES[3], color: "positive", opacity: 0.45},
  ];
  const depoisSegs: Seg[] = [
    {value: DEPOIS[0], color: "negative", glow: line},
    {value: DEPOIS[1], color: "negative", opacity: 0.6},
    {value: DEPOIS[2], color: "negative", opacity: 0.6},
    {value: DEPOIS[3], color: "positive"},
  ];
  return (
    <AbsoluteFill>
      <StackBar x={BAR_A.x} width={BAR_A.w} bottom={BOTTOM} k={K1} segs={antesSegs} grow={1} opacity={0.35 + 0.65 * eA} />
      <div style={{position: "absolute", left: BAR_A.x - 60, width: BAR_A.w + 120, top: BOTTOM - 38 * K1 - 105, textAlign: "center", whiteSpace: "nowrap", ...type("display", "h3", {color: c("textMuted")})}}>R$ 38</div>
      <StackBar x={BAR_B.x} width={BAR_B.w} bottom={BOTTOM} k={K1} segs={depoisSegs} grow={gB} />
      <div style={{position: "absolute", left: BAR_B.x + BAR_B.w / 2 - 300, width: 600, top: BOTTOM - 30.4 * K1 - 185, textAlign: "center", whiteSpace: "nowrap", opacity: gB}}>
        <div style={type("display", "h1", {color: c("text")})}>R$ 30,40</div>
      </div>
      <div style={{position: "absolute", left: BAR_B.x + BAR_B.w / 2 - 300, width: 600, top: BOTTOM - 30.4 * K1 - 185, textAlign: "center", whiteSpace: "nowrap", opacity: tag, transform: `scale(${0.9 + 0.1 * tag})`}}>
        <div style={type("display", "h1", {color: c("negative")})}>−20%</div>
      </div>
      {/* o topo do bloco de insumo e embalagem é o mesmo nas duas barras */}
      <div
        style={{
          position: "absolute",
          left: BAR_A.x - 30,
          width: (BAR_B.x + BAR_B.w + 30 - (BAR_A.x - 30)) * line,
          top: insTop - 3,
          height: 0,
          borderTop: `5px dashed ${c("text")}`,
          opacity: 0.85,
        }}
      />
      <Sfx name="tick" at={v20 + 0.05} volume={0.5} />
      <Sfx name="slide" at={v3040 - 0.1} volume={0.5} />
      <Sfx name="click" at={v3040 + 0.6} volume={0.45} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 4. Insumo — o lanche (b-roll do corte) custa o mesmo: R$ 14,70
// ---------------------------------------------------------------------------------------------
const Insumo: React.FC = () => {
  const ins = useCue("insumo");
  return (
    <AbsoluteFill>
      <BrollPlate
        clips={[{src: BROLL("v2-corte.mp4"), at: 0, srcFrom: 0.6, srcTo: 3.95}]}
        darken={0.3}
        top={[0.16, 0.36]}
        bottom={0.68}
        shiftY={-230}
        zoom={[1.02, 1.1]}
        zoomDur={3.3}
        originY={0.55}
      />
      <TopBlock>
        <Reveal delay={ins - 0.1} preset="blur" style={layer}>
          <div style={type("display", "h1", {color: c("negative")})}>R$ 14,70</div>
        </Reveal>
        <Reveal delay={ins + 0.35} preset="rise" distance={24} style={{...layer, top: 160}}>
          <div style={subLabel}>insumo e embalagem: mesmo custo</div>
        </Reveal>
      </TopBlock>
      <Sfx name="thud" at={ins + 0.05} volume={0.6} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 5. Quanto sobra — R$ 11,52 × R$ 6,28: −45%
// ---------------------------------------------------------------------------------------------
const K2 = 60;
const S_A = {x: 170, w: 280};
const S_B = {x: 560, w: 280};
const QuantoSobra: React.FC = () => {
  const t = useTime();
  const v628 = useCue("seis e vinte e oito");
  const saiu = useCue("saiu quase todo");
  const eA = tw(t, 0, 0.5);
  const gB = tw(t, v628 - 0.1, 0.6);
  const lost = tw(t, saiu - 0.1, 0.5);
  const inBar = (v: string, y: number, op: number, color: string) => (
    <div style={{position: "absolute", left: 0, right: 0, top: y, textAlign: "center", whiteSpace: "nowrap", opacity: op, ...type("display", "h3", {color: c(color)})}}>{v}</div>
  );
  const name = (txt: string, x: number, w: number, y: number, op: number) => (
    <div style={{position: "absolute", left: x - 60, width: w + 120, top: y, textAlign: "center", opacity: op, ...type("body", "body", {color: c("textMuted")})}}>{txt}</div>
  );
  return (
    <AbsoluteFill>
      <StackBar x={S_A.x} width={S_A.w} bottom={BOTTOM} k={K2} segs={[{value: 11.52, color: "positive", opacity: 0.42}]} grow={eA} />
      <div style={{position: "absolute", left: S_A.x, width: S_A.w, top: 0, height: "100%"}}>{inBar("R$ 11,52", BOTTOM - 11.52 * K2 + 26, eA, "text")}</div>
      {name("antes", S_A.x, S_A.w, BOTTOM - 11.52 * K2 - 70, eA)}
      <StackBar
        x={S_B.x}
        width={S_B.w}
        bottom={BOTTOM}
        k={K2}
        segs={[
          {value: 6.28, color: "positive", glow: gB * 0.6},
          {value: (11.52 - 6.28) * lost, color: "negative", ghost: true},
        ]}
        grow={1}
        opacity={gB}
      />
      <div style={{position: "absolute", left: S_B.x, width: S_B.w, top: 0, height: "100%"}}>{inBar("R$ 6,28", BOTTOM - 6.28 * K2 + 26, gB, "background")}</div>
      <div style={{position: "absolute", left: S_B.x, width: S_B.w, top: BOTTOM - ((6.28 + 11.52) / 2) * K2 - 52, textAlign: "center", whiteSpace: "nowrap", opacity: lost, transform: `scale(${0.85 + 0.15 * lost})`}}>
        <div style={type("display", "h2", {color: c("negative")})}>−45%</div>
      </div>
      {name("com 20% off", S_B.x, S_B.w, BOTTOM - 11.52 * K2 - 70, gB)}
      <Sfx name="pop" at={v628} volume={0.55} />
      <Sfx name="error" at={saiu + 0.1} volume={0.4} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 6. A conta — 11,52 ÷ 6,28 = 1,83 → PRECISA 183 × ANTES 100
// ---------------------------------------------------------------------------------------------
const AConta: React.FC = () => {
  const t = useTime();
  const precisa = useCue("precisa de");
  const v83 = useCue("oitenta e três por cento");
  const k = interpolate(t, [precisa, v83 + 0.35], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const n = Math.round(100 + 83 * k);
  const done = t >= v83 + 0.35;
  const flash = interpolate(t, [v83 + 0.35, v83 + 0.5, v83 + 1.4], [0, 1, 0.2], clamp);
  const b = versus({
    you: String(n),
    them: "100",
    youLabel: "PRECISA",
    themLabel: "ANTES",
    youSize: 25,
    themSize: 25,
    themColor: "textMuted",
    themLevel: 0.8,
    youBar: "accent",
    themBar: "textMuted",
    top: done ? "+83% PEDIDOS" : "11,52 ÷ 6,28 = 1,83",
    topColor: done ? "accent" : "text",
  });
  const a = boardCam(0.72, -10);
  const z = boardCam(0.77, -4);
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floorY={FLOOR_Y}>
        <CameraRig keys={[{t: 0, ...a}, {t: v83 + 1.5, ...z}]} />
        {/* torres deslocadas para a direita: o canto esquerdo é do selo "exemplo" */}
        <Stadium xs={[1.2, 4.4]} />
        <Scoreboard
          texts={b.texts}
          rects={b.rects}
          width={BOARD_W}
          cols={COLS}
          rows={ROWS}
          posts={POSTS}
          heat={flash}
          glows={[{x: L, y: 61, size: 1.5 + flash, intensity: 0.2 + flash * 0.4}]}
        />
      </Scene3D>
      <Sfx name="slide" at={precisa} volume={0.4} />
      <Sfx name="thud" at={v83 + 0.4} volume={0.65} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 7. A piada — 100 lanches com desconto = 55 sem; 45 de graça
// ---------------------------------------------------------------------------------------------
const APiada: React.FC = () => {
  const cem = useCue("cem lanches");
  const c55 = useCue("cinquenta e cinco");
  const c45 = useCue("quarenta e cinco");
  const a = frameSafe({center: [0, 0.1, -0.1], size: [4.0, 0.3, 4.0], azimuth: 4, elevation: 34, fill: 0.88});
  const z = frameSafe({center: [0, 0.1, -0.1], size: [4.0, 0.3, 4.0], azimuth: 14, elevation: 28, fill: 0.92});
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floorY={0}>
        <CameraRig keys={[{t: 0, ...a}, {t: c45 + 1.8, ...z}]} />
        <BurgerField enterAt={Math.max(0, cem - 0.35)} lost={(i) => i >= 55} lostAt={c45} />
      </Scene3D>
      <TopBlock>
        <Reveal delay={cem - 0.1} preset="blur" exitAt={c55 - 0.2} style={layer}>
          <div style={type("display", "h1", {color: c("text")})}>100</div>
          <div style={subLabel}>lanches com desconto</div>
        </Reveal>
        <Reveal delay={c55 - 0.05} preset="blur" exitAt={c45 - 0.2} style={layer}>
          <div style={type("display", "h1", {color: c("text")})}>= 55</div>
          <div style={subLabel}>sem desconto</div>
        </Reveal>
        <Reveal delay={c45 - 0.05} preset="blur" style={layer}>
          <div style={type("display", "h1", {color: c("negative")})}>45</div>
          <div style={subLabel}>de graça</div>
        </Reveal>
      </TopBlock>
      <Sfx name="pop" at={cem} volume={0.5} />
      <Sfx name="ding" at={c55 + 0.1} volume={0.45} />
      <Sfx name="error" at={c45 + 0.2} volume={0.45} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// 8. A virada — checklist antes da promoção, ou um combo
// ---------------------------------------------------------------------------------------------
const AVirada: React.FC = () => {
  const antes = useCue("Antes da próxima");
  const obj = useCue("objetivo");
  const prazo = useCue("prazo");
  const conta = useCue("conta feita");
  const ou = useCue("Ou troca");
  const combo = useCue("combo");
  return (
    <AbsoluteFill>
      <PranchetaChecklist
        enterAt={0}
        diagramAt={antes}
        items={[
          {label: "Objetivo", at: obj},
          {label: "Prazo", at: prazo},
          {label: "Conta feita", at: conta},
        ]}
        or={{label: "Combo", at: Math.min(combo, ou + 0.15), orAt: ou - 0.05}}
        header={{text: "Antes da promoção", at: antes + 0.1}}
      />
      {[obj, prazo, conta].map((x, i) => (
        <Sfx key={i} name="click" at={x + 0.25} volume={0.5} rate={1 + i * 0.05} />
      ))}
      <Sfx name="swish" at={Math.min(combo, ou + 0.15)} volume={0.55} />
    </AbsoluteFill>
  );
};

// Trechos em que o texto na tela é a própria fala: a legenda some (calculado da fala).
const HIDE: [number, number][] = [
  [tl.at("quase o dobro") - 0.05, tl.end("quase o dobro") + 0.6],
  [tl.at("Comenta PLACAR") - 0.05, tl.at("eu te mando") - 0.02],
];
// Selo "exemplo" nas cenas com números (do lanche de R$ 38 até a piada dos 100 lanches).
const SELO: [number, number][] = [[B[1].start, B[6].end]];

const Video: React.FC = () => (
  <Explainer
    tl={tl}
    audio={staticFile(`videos/${SLUG}/narracao.wav`)}
    hideCaptions={HIDE}
    over={<SeloExemplo windows={SELO} />}
    scenes={[
      {beat: B[0], component: Gancho},
      {beat: B[1], component: O_Lanche},
      {beat: B[2], component: ComDesconto},
      {beat: B[3], component: Insumo},
      {beat: B[4], component: QuantoSobra},
      {beat: B[5], component: AConta},
      {beat: B[6], component: APiada},
      {beat: B[7], component: AVirada},
      {beat: B[8], component: CtaPlacar},
    ]}
  />
);

// duração em quadro inteiro: o Explainer arredonda o fim da última cena e o Root usa ceil;
// sem isto pode sobrar 1 quadro vazio no fim (aparece como piscada preta no loop do Reels)
const def: VideoDef = {id: SLUG, component: Video, duration: Math.round(B[B.length - 1].end * FPS) / FPS};
export default def;
