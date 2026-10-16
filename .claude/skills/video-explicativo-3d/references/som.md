# Desenho de som

A narração chega pronta. Esta skill cuida dos **efeitos sonoros** (e de uma trilha, se o usuário fornecer). Som bem colocado faz a animação parecer mais rápida, mais física e mais cara. Som demais cansa e compete com a voz.

## Biblioteca

Gerada por síntese em `public/sfx/` na paleta do design system (`sound.palette`: `soft | crisp | punchy | digital`). Sons da marca em `design-system/<sound.library>/` entram por cima com o próprio nome do arquivo. `public/sfx/manifest.json` lista tudo com descrição e duração.

| nome | use quando… |
|---|---|
| `whoosh` / `whoosh-soft` | troca de cena (o Explainer já põe `sound.transitionSfx` em cada corte) |
| `swish` | entrada rápida de card, tag, ícone |
| `slide` | barra crescendo, painel deslizando |
| `pop` | ponto/ícone/dado aparecendo, item de pictograma |
| `click` / `tick` | seleção, item de lista, passo avançando, contador |
| `thud` | bloco 3D pousando, card batendo no lugar |
| `boom` | a grande revelação (1×, no máx. 2× por vídeo) |
| `riser` | tensão antes da revelação. Termina no frame da revelação: `at={rev - 1.4}` |
| `reverse` | sopro que cresce até um corte dramático (`at={corte - 0.9}`) |
| `ding` / `success` | acerto, palavra-chave, conclusão positiva |
| `sparkle` | insight, "aha", algo acendendo |
| `error` | mito, erro, ✕, dado negativo |
| `type` / `typing` | digitação (`TypeOn`) |
| `glitch` | tecnologia, falha, dado corrompido |
| `swell` | abertura/fechamento suave (cama de 2,4 s) |

## Regras de posicionamento

- **Sincronia com o visual, não com a fala.** O transiente do som cai no frame em que a coisa acontece na tela (o bloco toca o chão, o número para de contar). Para entradas com mola, isso fica ~0,1–0,2 s depois do `delay`.
- **Sons longos começam antes.** `riser` e `reverse` terminam no evento. `whoosh` começa ~0,1 s antes do corte (o Explainer já faz isso).
- **Densidade:** em média, um efeito a cada 1,5–3 s. Nem todo elemento que entra precisa de som. Sonorize o que tem peso: o elemento principal da cena, a revelação, o corte.
- **Repetição:** em sequências (itens de lista, pictograma), use `tick`/`pop` com `volume` decrescente ou só no 1º e no último. Dez pops iguais seguidos soam como bug.
- **Não cubra palavras-chave.** Se um efeito forte (`boom`, `glitch`) coincide com uma palavra importante da narração, desloque-o para o respiro logo depois ou baixe o `volume`.
- **Variação:** `rate` de 0,9–1,15 dá variedade a sons repetidos sem trocar o arquivo.

## Níveis

Referência, com narração = 1,0 (a narração entra normalizada em −16 LUFS pelo `timeline.mjs`):
- efeitos: `sound.sfxGain` 0,25–0,45 (ajuste fino por `volume` em cada `<Sfx>`); `boom`/`riser` ~0,6–0,8 do ganho; `tick`/`click` ~0,5;
- trilha: `sound.musicGain` 0,08–0,15, com ducking automático para `duckTo` (~35%) enquanto há fala.

O `render.mjs` masteriza o mix final em −14 LUFS / −1,5 dBTP (padrão de Reels/TikTok/Shorts) e informa o resultado. Se o mix soa abafado ou com efeitos altos demais, mexa nos ganhos do design system, não na masterização.

## Trilha

Só use trilha que o usuário forneceu ou indicou (direitos autorais). Coloque-a em `public/videos/<slug>/trilha.mp3` e passe `music={staticFile(...)}` ao Explainer. Sem trilha, o vídeo fica só com voz + efeitos, o que é comum e funciona bem em vídeo explicativo.
