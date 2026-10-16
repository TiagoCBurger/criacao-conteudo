# Biblioteca do estúdio (API)

Tudo é importado de `../../lib` dentro de `src/videos/<slug>/index.tsx`. Os tempos (`delay`, `at`, `exitAt`) são em **segundos locais da cena** (0 = início do beat). Use `useCue("palavras faladas")` para obtê-los. As cores aceitam papéis do design system (`"primary"`, `"accent"`, `"data.2"`, `"textMuted"`…).

## Índice
- Estrutura de um vídeo · Timeline e cues
- Layout · Movimento
- Tipografia: Reveal, KineticText, Lettering, Counter, Eyebrow, TypeOn
- Gráficos: BarChart, ColumnChart, LineChart, Donut, Pictogram, ProgressBar
- Diagramas: Card, IconBadge, FlowSteps, Compare, Checklist, Arrow, Callout
- 3D: Scene3D, CameraRig, Appear, Block, Orb, Text3D, Label3D, SvgExtrude, Bars3D, Connector3D, Particles, Spin, ThemedMaterial, viewSize, projectToScreen
- Som: Sfx, Music, Narration
- Helpers do design system

---

## Estrutura de um vídeo

```tsx
import React from "react";
import {AbsoluteFill, staticFile} from "remotion";
import type {VideoDef} from "../../config";
import {beats, Explainer, KineticText, SafeArea, Sfx, timeline, useCue} from "../../lib";
import tlJson from "../../../public/videos/meu-video/timeline.json";

const SLUG = "meu-video";
const tl = timeline(tlJson as never);

const B = beats(tl, [
  {id: "gancho", cue: 0},                      // a 1ª cena começa no 0
  {id: "conceito", cue: "Funciona assim"},     // palavras exatas da fala
  {id: "dado", cue: "trinta por cento"},
  {id: "fechamento", cue: "No fim das contas"},
]);

const Gancho: React.FC = () => {
  const q = useCue("Você sabia");              // segundos desde o início desta cena
  return (
    <AbsoluteFill>
      <SafeArea><KineticText text={"Você sabia que…\n*isso* acontece?"} delay={q} /></SafeArea>
      <Sfx name="pop" at={q} />
    </AbsoluteFill>
  );
};
// … outras cenas …

const Video: React.FC = () => (
  <Explainer
    tl={tl}
    audio={staticFile(`videos/${SLUG}/narracao.wav`)}
    scenes={[
      {beat: B[0], component: Gancho},
      {beat: B[1], component: Conceito},
      {beat: B[2], component: Dado, transition: "zoom"},
      {beat: B[3], component: Fechamento},
    ]}
    // music={staticFile("videos/meu-video/trilha.mp3")}   // só se o usuário forneceu trilha
    // hideCaptions={[[0, 2.1]]}                          // trechos em que o texto na tela = fala
  />
);

const def: VideoDef = {id: SLUG, component: Video, duration: B[B.length - 1].end};
export default def;
```

`<Explainer>` monta, em camadas: fundo da marca (contínuo), as cenas com transição, `under`/`over` (camadas contínuas opcionais), as legendas, a marca d'água, a narração, a trilha e o som de transição (`sound.transitionSfx`). Por cena, `transition` aceita `"fade" | "slide" | "push" | "zoom" | "wipe" | "blur" | "cut"` e `transitionSfx` aceita um nome ou `null`.

## Timeline e cues

| API | Retorna |
|---|---|
| `timeline(json)` | objeto `tl` |
| `tl.at("frase", {after?, occurrence?, edge?})` | segundos **absolutos** em que a frase começa (`edge:"end"`: termina) |
| `tl.end("frase")` · `tl.duration` · `tl.section("id")` | fim da frase · duração · `{start,end}` da seção do roteiro |
| `beats(tl, [{id, cue}], {tail=1.2, lead=0.12})` | `[{id, start, end, index}]`. `lead` adianta a cena um pouco antes da fala |
| `useCue("frase", opts?)` *(hook, dentro de cena)* | segundos **locais** até a frase (procura a partir do início da cena) |
| `useBeat()` | `{id, start, end, duration}` da cena atual. Use `duration` para saídas no fim |

A âncora deve ser única naquele trecho. Se a frase se repete, use `{occurrence: 2}` ou `{after: segundos}`. Números ficam como o roteiro escreveu: se o roteiro diz "vinte por cento", a âncora é `"vinte por cento"`, não `"20%"`. Para ver as palavras exatas, consulte `timeline.json`.

## Layout

- `<Stage tone?="default|alt|primary" glow?>`: fundo da marca. O `Explainer` já coloca um. Use dentro de cena só para trocar o tom de propósito.
- `<SafeArea align="center|top|bottom" gap? reserveCaptions?>`: coluna flex dentro das margens seguras do 9:16, já reservando a faixa da legenda.
- `useSafe()` → `{top, bottom, left, right, width, height, innerWidth, innerHeight}` em px.
- `<SafeZonesDebug/>`: sobreposição de conferência (não deixe no render).
- `<Watermark/>`: já incluído pelo Explainer, conforme `brand.watermark`.

## Movimento

- `useEnter(delay, {spring?: "enter"|"pop"|"soft", duration?})` → 0→1 com mola do design system.
- `useTween(start, duration?, easing?)` → 0→1 com curva. `useExit(at, duration?)` → 0→1 de saída.
- `revealStyle(p, preset, e?, distance?)` → CSS. Presets: `rise fall fade scale pop blur left right mask`.
- `useDrift(seed, amount, speed)` → `{x,y,r}` para flutuação orgânica e determinística.
- `useTime()` (segundos locais) · `useSec()` (s→frames) · `stagger(i, base, step)` · `ease.standard|enter|exit` · `lerp`.

## Tipografia

**`<Reveal delay preset exitAt distance spring style>{…}</Reveal>`** embrulha qualquer coisa com entrada/saída.

**`<KineticText text delay size role preset emphasis emphasisColor color stagger exitAt align maxWidth/>`**
- `text`: use `\n` para quebrar linha e `*asteriscos*` para ênfase (`"Pequeno, mas\n*faminto*."`). A pontuação depois do `*` é permitida.
- `size`: `"hero" | "h1" | "h2" | "h3" | "body" | número`. `role`: `"display" | "body" | "accent" | "mono"`.
- `preset`: `"mask"` (padrão: a palavra sobe por trás de uma máscara), `"rise" | "blur" | "pop" | "fade"`.
- `emphasis`: `"color"` (padrão), `"marker"` (faixa que varre por trás), `"underline"`, `"outline"`.

**`<Lettering text effect size role color depthColor delay stagger exitAt/>`** é a palavra ou número de impacto, letra a letra. Efeitos:
- `stack`: extrusão em camadas, efeito 3D tipográfico.
- `outline`: contorno que se preenche.
- `gradient`: preenchimento em gradiente primary→accent.
- `glow`: brilho.
- `solid`.

Use para 1–2 palavras ou um número. Frases longas não funcionam com este efeito.

**`<Counter to from delay duration decimals prefix suffix size role color/>`**: número contando em pt-BR (`1.234,5`), com "pop" ao terminar. Exemplo: `<Counter to={20} suffix="%" delay={useCue("vinte por cento")}/>`.

**`<Eyebrow text delay color variant="pill|line|plain"/>`**: rótulo curto em caixa alta acima de títulos ("PASSO 2", "O MITO").

**`<TypeOn text delay cps role size/>`**: máquina de escrever (código, busca, prompt). Combine com `<Sfx name="typing">`.

## Gráficos

`Datum = {label, value, color?, highlight?}`. Com algum `highlight`, os demais ficam neutros e o destacado usa `accent`.

- **`<BarChart data delay stagger max width barHeight decimals prefix suffix exitAt/>`**: barras horizontais com rótulo e valor contando. É o gráfico mais legível em 9:16.
- **`<ColumnChart data delay stagger height valueSize decimals prefix suffix/>`**: 2–5 colunas. Com ≤ 3 colunas, os valores ficam grandes (h1). Para sincronizar cada coluna com a fala: `delay={a} stagger={b - a}`.
- **`<LineChart data={[{label, value}]} delay duration height color marks decimals suffix/>`**: linha suave que se desenha, com área degradê. `marks` são os índices com marcador e valor (padrão: o último).
- **`<Donut value total delay size thickness color suffix label/>`**: percentual com arco que varre e número no centro.
- **`<Pictogram total filled cols delay stagger shape="dot|square|person" color/>`**: "3 em cada 10". A grade aparece e depois os ícones preenchidos acendem.
- **`<ProgressBar value delay label/>`**.

## Diagramas

- **`<Card delay preset accent width padding exitAt>{…}</Card>`**: superfície no estilo `surface.style` (glass/solid/outline/elevated). `accent` é a faixa lateral colorida.
- **`<IconBadge icon={Brain} variant="soft|solid|ring" size color delay/>`**: ícones de `lucide-react` (`import {Brain, Coins, Rocket} from "lucide-react"`, com mais de 1.500 ícones).
- **`<FlowSteps steps={[{title, detail?, icon?}]} at={[t1,t2,…]} focus/>`**: passos verticais que entram no ritmo da fala. O conector se desenha entre eles e o passo atual fica em foco.
- **`<Compare a={{title, items, tone:"negative"}} b={{title, items, tone:"positive"}} delay bDelay layout="stack|columns"/>`**: A vs B com ✓/✕ e selo VS.
- **`<Checklist items at|delay gapSec/>`**: itens com check que se desenha.
- **`<Arrow from={[x,y]} to={[x,y]} bend delay duration color dashed/>`**: seta em px de tela que se desenha (posicione o contêiner em `AbsoluteFill`).
- **`<Callout x y text side="left|right" length delay color/>`**: ponto + linha-guia + rótulo. Use para anotar objetos (3D ou imagem) com `projectToScreen`.

## 3D

Leia também `references/3d.md` (regras de determinismo, enquadramento 9:16, câmera, luz).

- **`<Scene3D camera={{position, fov}} floor="shadow|grid|none" floorY lighting>`**: canvas 3D transparente em tela cheia, com luz e reflexos do design system. Use um por cena. O texto nítido continua em HTML por cima.
- **`<CameraRig keys={[{t, position, target?, fov?}]} drift/>`**: câmera por keyframes (segundos locais), com easing e "respiração".
- **`<Appear delay enter="drop|scale|rise|spin|flip|none" exitAt float position rotation scale>{mesh}</Appear>`**: entrada/saída/flutuação para qualquer grupo.
- **`<Block size={[w,h,d]} color position rotation delay enter exitAt float bevel emissive/>`**: bloco chanfrado (camadas, módulos, pilhas, "dados").
- **`<Orb radius color position delay enter float emissive/>`**: esfera (nós, átomos, ideias). `emissive` de 0.5 a 1 faz o objeto "acender".
- **`<Text3D text size depth bevel color sideColor delay stagger anim="flip|rise|drop|none" position maxWidth exitAt/>`**: letreiro extrudado letra a letra com a fonte display. Ajusta-se sozinho à largura visível. Ideal para 1–2 palavras ou um número.
- **`<Label3D size color position anchorX anchorY delay>texto estático</Label3D>`**: texto plano dentro da cena. Não use com valores que mudam a cada frame.
- **`<SvgExtrude src width depth color keepColors/>`**: logo ou ícone **preenchido** (SVG) vira objeto 3D. Para arquivos do design system, use `src={dsFile("logos/simbolo.svg")}`.
- **`<Bars3D data delay stagger maxHeight barWidth gap position exitAt/>`**: colunas 3D que crescem. Ajustam-se à largura. Valores e rótulos vão em HTML por cima.
- **`<Connector3D from to lift delay duration color width dashed/>`**: ligação curva que se desenha entre pontos 3D.
- **`<Particles count spread size colors opacity seed/>`**: poeira de luz sutil (textura, não assunto).
- **`<Spin speed axis>`**: rotação contínua. **`<ThemedMaterial color emissive opacity/>`**: material do design system para meshes próprios.
- **`<Glow position size color intensity delay/>`**: halo de luz aditivo (sol, lâmpada, objeto que "acende").
- **`<Atmosphere radius position color thickness intensity/>`**: brilho de borda em volta de uma esfera (planeta, célula, bolha).
- **`<LightBeam from to width color delay duration/>`**: feixe de luz que se estende (raio de sol, laser, fluxo de dados).
- **`viewSize(dist, fov?)`** → `{width, height}` visíveis. **`useFitScale(w, pos)`**. **`projectToScreen([x,y,z], {position, target, fov}, 1080, 1920)`** → px na tela, para ancorar `Callout`/`Counter` em objetos 3D.

## Som

- **`<Sfx name at volume rate/>`**: efeito em `at` segundos locais. Nomes: `whoosh whoosh-soft swish slide pop click tick thud boom riser reverse ding success sparkle error type typing glitch swell`, mais os sons da marca (`sound.library`). Veja `references/som.md`.
- **`<Music src tl volume fadeIn fadeOut/>`**: trilha com ducking automático. O Explainer já a inclui via `music`.
- **`<Narration src/>`**: já incluída pelo Explainer.

## Helpers do design system

`c(papel)`, `alpha(papel, a)`, `mix(a, b, t)`, `dataColor(i)`, `type(role, size, overrides)` (estilo CSS completo), `radius("sm|md|lg")`, `dsFile("logos/x.svg")`, `ds` (tokens crus). Para estilos próprios, comece de `type()` e `c()` e nunca escreva hex ou `fontFamily` à mão.
