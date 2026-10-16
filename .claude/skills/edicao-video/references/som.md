# Som

Som é metade da edição. Fala clara e constante primeiro; efeitos e trilha só por baixo.

## Fala
- Cada clipe entra com um ganho que leva a fala a **−16 LUFS** (medido no `npm run midia`). Clipes gravados em lugares diferentes ficam no mesmo volume sem ajuste manual. Ajuste fino por corte: `volume: 0.9`.
- Cortes secos acontecem nas pausas (é para isso que as palavras são corrigidas pelos silêncios), por isso não "estalam". Nas transições, o áudio cruza junto com a imagem.
- Fala ruim (ruído, eco, vento) não se resolve aqui. Avise a pessoa. Se for só um trecho, esconda com b-roll e uma locução nova (`audios`), por exemplo gerada pela skill `midia-ia-openrouter`.

## Efeitos (`sons`)
A biblioteca é sintetizada na paleta do estilo (`sound.palette`) e fica em `public/sfx/manifest.json`. Sons da marca (`design-system/<sound.library>/`) entram por cima.

| efeito | use em |
|---|---|
| `whoosh` / `whoosh-soft` | transições (já tocam sozinhas, com `somTransicao`), b-roll entrando rápido |
| `swish`, `slide` | texto ou imagem deslizando |
| `pop`, `click`, `tick` | destaque, item de lista, número aparecendo |
| `thud`, `boom` | impacto, revelação (com `flash`/`tremor`). `boom` no máx. 1–2× por vídeo |
| `riser` | tensão antes da revelação (termine no evento: `em: {fala: "…", desloc: -1.4}`) |
| `ding`, `success`, `sparkle` | acerto, dica, "aha" |
| `error` | erro, mito, "não faça isso" |
| `type`/`typing`, `glitch`, `swell` | digitação, tecnologia, abertura/fecho suave |

Regras:
- **Sincronia com o visual.** O som cai no quadro em que a coisa acontece na tela.
- **Densidade:** 1 efeito a cada 3–6 s em vídeo editado (menos que em motion puro). Nem todo texto precisa de som.
- **Não cubra palavras-chave.** Efeito forte sobre a palavra importante atrapalha. Desloque para o respiro ou baixe o `volume` (0,5–0,7).
- Efeitos sob medida ("porta de carro fechando", "plateia rindo") podem ser gerados com `midia-ia-openrouter` (`som`). Coloque o arquivo na pasta do projeto, rode `npm run midia` e use `{clipe: "<id>"}`.

## Trilha
- Só com direitos claros: fornecida pela pessoa, de biblioteca licenciada, ou gerada com IA (Lyria via `midia-ia-openrouter`) conforme os termos do modelo.
- `trilha: {clipe: "…"}` liga o **ducking automático**: a trilha abaixa para `sound.duckTo` (~30%) enquanto há fala e sobe nos respiros. Volume base `sound.musicGain` (0,08–0,15). Fala é rainha: se a trilha disputa com a voz, baixe o `volume`.
- `de` escolhe o ponto da música em que o vídeo começa (pule a introdução lenta). `fadeIn`/`fadeOut` padrão 0,6 / 1,5 s. `loop` repete se a música for curta.
- Instrumental sob fala. Música com letra só em trechos sem fala.

## Níveis e master
| camada | referência (ganho linear, fala = 1) |
|---|---|
| fala | 1,0 (−16 LUFS por clipe) |
| efeitos | `sound.sfxGain` 0,3–0,45 × `volume` |
| trilha | `sound.musicGain` 0,08–0,15, abaixando para `duckTo` sob a fala |

O `render` masteriza o mix em **−14 LUFS / −1,5 dBTP** (o que Reels, TikTok, Shorts e YouTube esperam) e informa o resultado. Fora de −16…−12 LUFS ou com clipping, reveja ganhos e volumes. Não compense na master.
