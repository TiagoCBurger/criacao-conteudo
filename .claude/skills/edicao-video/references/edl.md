# Formato da edição (`src/edicoes/<slug>/edicao.tsx`)

Uma edição é um objeto `Edicao` passado a `defineEdicao(id, {...})`. Os tipos completos estão em `src/lib/tipos.ts` (o `npm run typecheck` acusa campo errado). **Tempo de origem** = segundos dentro do clipe. **Tempo de saída** = segundos no vídeo final.

```tsx
import {defineEdicao} from "../../lib";

const rosto = {x: 0.68, y: 0.42};   // onde está o rosto no clipe de câmera (veja a prancha)

export default defineEdicao("dicas-iluminacao", {
  formato: "9:16",
  cortes: [
    {id: "gancho", clipe: "entrevista", de: "Você está gravando", ate: "luz errada", foco: rosto},
    {clipe: "entrevista", de: "A primeira coisa", ate: "janela", foco: rosto, zoom: 1.12},
    {clipe: "entrevista", de: "Agora repara", ate: "diferença", apos: 95, foco: rosto},
    {clipe: "entrevista", de: "Segue", ate: "dicas", foco: rosto, transicao: "preto"},
  ],
  legendas: {estilo: "pop", destaque: ["janela", "diferença"], ocultar: [{de: 0, ate: 2}]},
  textos: [
    {tipo: "titulo", texto: "Sua luz está errada", destaque: ["errada"], em: 0.15, duracao: 2},
    {tipo: "rotulo", nome: "Ana Lima", descricao: "fotógrafa", em: {corte: 2, em: 0.5}},
  ],
  camadas: [{tipo: "broll", clipe: "janela-broll", em: {fala: "janela"}, duracao: 2.2, transicao: "cruzar"}],
  zooms: [{em: {fala: "diferença"}, escala: 1.15, duracao: 1}],
  sons: [{sfx: "pop", em: {fala: "primeira coisa"}}],
  trilha: {clipe: "trilha-lofi"},
  fadeFinal: 0.5,
  capa: 0.8,
});
```

Depois de editar: `npm run check -- <slug>` imprime a tabela de cortes **com a fala de cada um**. É a forma mais rápida de validar a montagem.

## Campos da edição

| campo | padrão | o que é |
|---|---|---|
| `formato` | `"9:16"` | `"9:16"` 1080×1920 · `"16:9"` 1920×1080 · `"1:1"` 1080×1080 · `"4:5"` 1080×1350 · `{largura, altura}` |
| `fps` | 30 | quadros por segundo da saída |
| `enquadrar` | `"preencher"` | enquadramento padrão dos cortes (veja abaixo) |
| `fundo` | `"background"` | cor das faixas/fundo (papel do estilo ou literal) |
| `transicaoPadrao` | `"corte"` | transição de todos os cortes que não definem a sua |
| `somTransicao` | estilo | efeito tocado nas transições (`false` desliga) |
| `cortes` | — | **obrigatório**. A sequência principal |
| `legendas` | estilo | `false` desliga |
| `textos`, `camadas`, `zooms`, `efeitos`, `sons`, `audios` | — | listas ancoradas em momentos |
| `trilha` | — | música de fundo |
| `vinheta` | 0 | 0–1, escurece as bordas |
| `fadeFinal` | 0 | segundos de fade para preto (imagem e som) no fim |
| `capa` | 1 | instante da capa gerada no render |

## Cortes

```ts
{clipe: "entrevista", de: 12.4, ate: 18.9}                       // segundos de origem
{clipe: "entrevista", de: "Hoje eu vou", ate: "três erros"}       // pelas palavras (início da 1ª, fim da última)
{clipe: "entrevista", de: "Então", ate: "funciona", apos: 60}     // frase repetida: procura só depois de 60 s
{clipe: "entrevista", de: "Então", ate: 75.2}                     // misto
{clipe: "foto-produto", duracao: 2.5, zoom: {de: 1, para: 1.1}}  // imagem parada como corte
```

| campo | padrão | |
|---|---|---|
| `id` | — | nome para usar em `{corte: "id"}` |
| `clipe` | — | id do registro (`npm run midia -- listar`). Vídeo ou imagem |
| `de` / `ate` | início/fim do clipe | número (s) ou texto. Texto = palavras como estão na transcrição; acentos, maiúsculas e pontuação não importam |
| `apos` | — | só procura as falas depois deste instante do clipe (takes repetidos) |
| `folga` | `[0.1, 0.16]` | respiro antes/depois quando `de`/`ate` são falas. Nunca invade a palavra vizinha. Aumente o segundo valor se a última sílaba parecer cortada |
| `duracao` | 3 | só para imagem |
| `velocidade` | 1 | 0,25–4. Acima de 1,15 a voz fica estranha: use em b-roll, não em fala |
| `volume` | 1 | sobre o volume normalizado do clipe |
| `mudo` | false | |
| `enquadrar` | da edição | `preencher` (cobre, corta sobras, centra em `foco`) · `ajustar` (inteiro, com faixas) · `desfocar` (inteiro sobre cópia desfocada) |
| `foco` | `{x: .5, y: .5}` | ponto de interesse 0–1. Com `preencher` 16:9 → 9:16, só o x importa (o quadro vertical mostra ~32% da largura) |
| `zoom` | 1 | `1.12` = punch-in fixo · `{de: 1, para: 1.08}` = aproximação lenta durante o corte |
| `filtro` | — | `quente` · `frio` · `pb` · `contraste` · `suave` · `vintage` · `noite` · `{css: "saturate(1.2)"}` |
| `espelhar` | false | inverte na horizontal (selfie) |
| `transicao` | `transicaoPadrao` | como **este** corte entra: `"corte"` · `"cruzar"` · `"preto"` · `"branco"` · `"flash"` · `"deslizar"` · `"limpar"` · `"zoom"` · `"desfoque"` · `"iris"`, ou `{tipo, duracao, direcao: "esquerda"\|"direita"\|"cima"\|"baixo", som: "whoosh" \| false}` |

Uma transição de T segundos fica **centrada no ponto de corte** e usa mídia de sobra (antes do `de` do corte que entra e depois do `ate` do que sai), como num editor. O conteúdo entre `de` e `ate` não é sobreposto. Sem sobra (corte no começo ou no fim do clipe), ela cobre parte do conteúdo e o `check` avisa.

## Momentos (`em`, `ate`)

Instante no vídeo **final**:
```ts
2.5                                   // segundos de saída
{fala: "três erros"}                  // quando a frase é dita (1ª ocorrência no vídeo final)
{fala: "três erros", fim: true}       // quando termina de ser dita
{fala: "erro", ocorrencia: 2}         // 2ª vez
{fala: "agora", corte: 3}             // procura só dentro do corte 3
{fala: "olha", desloc: -0.2}          // 0,2 s antes
{corte: 2}                            // começo do conteúdo do corte 2 (número = posição na lista, começa em 1)
{corte: "gancho", em: 0.5}            // 0,5 s depois do começo do corte "gancho"
{corte: 4, fim: true}                 // fim do corte 4 (com em: 1 → 1 s antes do fim)
```
Janela = `em` + `duracao` (s) **ou** `em` + `ate` (outro momento).

Se uma fala não aparece no vídeo final (ficou fora dos cortes), o erro diz isso e lista as palavras parecidas.

## Textos

| tipo | campos | padrão de duração / posição |
|---|---|---|
| `titulo` | `texto`, `destaque?: string[]` (palavras na cor de acento), `tamanho?`, `cor?`, `animacao?` | 2,4 s · topo |
| `texto` | `texto`, `caixa?: true` (fundo), `tamanho?`, `cor?`, `animacao?` | 2,5 s · centro |
| `rotulo` | `nome`, `descricao?` (lower third com barra de acento) | 3,5 s · embaixo à esquerda, acima da legenda |
| `destaque` | `texto` (palavra ou número grande que salta), `tamanho?`, `cor?` | 1,3 s · centro |

`posicao`: `"topo"` · `"centro"` · `"baixo"` (acima da faixa da legenda) · `{x, y}` (0–1, centro do texto). `tamanho`: papel da escala (`hero`, `h1`, `h2`, `h3`, `body`, `small`, `label`) ou px no quadro de 1080. `animacao`: `palavras` (padrão do título: entra palavra a palavra) · `surgir` · `subir` · `pop` · `digitar` · `nenhuma`. Todos saem com fade nos últimos ~0,2 s.

## Camadas

```ts
{tipo: "broll", clipe: "rua", de: 3, em: {fala: "na rua"}, duracao: 2.5, transicao: "cruzar"}
{tipo: "pip", clipe: "tela", em: {corte: 3}, ate: {corte: 3, fim: true}, canto: "sup-dir", largura: 0.42}
{tipo: "imagem", clipe: "grafico", em: {fala: "cresceu"}, duracao: 2, largura: 0.7}
{tipo: "imagem", clipe: "foto", cobrir: true, em: 10, duracao: 3}   // tela cheia com Ken Burns
{tipo: "imagem", logo: true, em: {corte: 5}, duracao: 2}              // logo do design system
{tipo: "componente", componente: Contador, props: {ate: 87}, em: {fala: "oitenta e sete"}, duracao: 2}
```
- **broll** cobre a tela (o áudio do corte principal continua por baixo, o famoso "L-cut"). Campos: `clipe`, `de` (s no clipe), `velocidade`, `volume` (padrão 0 = mudo), `enquadrar`, `foco`, `zoom` (padrão aproximação lenta 1→1,06), `filtro`, `transicao: "corte" | "cruzar"`.
- **pip**: `canto` `sup-esq`/`sup-dir`/`inf-esq`/`inf-dir`, `largura` 0–1 da largura do quadro (padrão 0,42), `volume`.
- **imagem**: `clipe` (imagem do registro) ou `logo: true`; `cobrir`, `posicao`, `largura` (0–1), `animacao`, `kenBurns` (padrão true quando `cobrir`).
- **componente**: veja `motion-e-efeitos.md`.

A ordem de empilhamento é: vídeo principal → b-roll → vinheta/flash → pip/imagens/componentes → textos → legendas.

## Zooms, efeitos

```ts
zooms: [{em: {fala: "nunca"}, escala: 1.15, duracao: 1.2, entrada: "seco"}]   // punch-in de ênfase ("suave" = rampa)
efeitos: [
  {tipo: "flash", em: {corte: 4}},                          // clarão branco que se apaga (0,35 s)
  {tipo: "tremor", em: {fala: "bum"}, duracao: 0.4, intensidade: 1},
  {tipo: "pb", em: {fala: "antigamente"}, ate: {fala: "hoje"}},
  {tipo: "desfoque", em: 12, duracao: 0.8},
]
```
Zooms e efeitos de câmera valem para o vídeo principal e o b-roll (não para textos e legendas). `foco` no zoom muda o ponto de origem da ampliação.

## Som

```ts
sons: [{sfx: "whoosh", em: {corte: 3}, volume: 0.8}, {sfx: "ding", em: {fala: "pronto"}}, {clipe: "risada", em: 14.2}]
trilha: {clipe: "trilha-lofi", volume: 0.12, ducking: true, de: 8, fadeIn: 0.6, fadeOut: 1.5, loop: true, em: 0, ate: {corte: 6, fim: true}}
audios: [{clipe: "locucao-extra", em: {corte: 2}, de: 0, volume: 1, legendar: true}]
```
- `sfx`: nome da biblioteca (`public/sfx/manifest.json`): `whoosh`, `whoosh-soft`, `swish`, `slide`, `pop`, `click`, `tick`, `thud`, `boom`, `riser`, `reverse`, `ding`, `success`, `sparkle`, `error`, `type`, `typing`, `glitch`, `swell`, mais os sons da marca. `clipe`: qualquer áudio do registro (ex.: efeito gerado por IA).
- `audios` são locuções ou ambiências por cima. Com transcrição, entram nas legendas e no ducking.

## Legendas

```ts
legendas: {estilo: "pop", posicao: "baixo", maxPalavras: 3, tamanho: 76, maiusculas: true, destaque: ["grátis"], ocultar: [{de: 0, ate: 2.2}]}
legendas: false
```
`estilo`: `pop` (1–3 palavras, a falada salta na cor de destaque) · `karaoke` (frase, palavra falada colorida, as próximas mais claras) · `caixa` (frase sobre caixa) · `simples` (frase sem destaque). O padrão vem de `captions` no design system. As legendas usam as palavras transcritas, já no tempo da edição. Também saem em `out/<slug>.srt` para subir na plataforma.

## Componentes do Remotion dentro da edição

`edicao.tsx` é TypeScript: dá para calcular cortes (`cortes: trechos.map(...)`), reaproveitar constantes e importar componentes. Mantenha tudo determinístico (nada de `Math.random()` ou data atual).
