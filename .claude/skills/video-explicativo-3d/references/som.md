# Desenho de som

A narração chega pronta (ou é gerada na etapa 2b). Esta skill cuida dos **efeitos sonoros** e da **trilha**: gera uma original sob medida, a não ser que o usuário forneça a dele. Som bem colocado faz a animação parecer mais rápida, mais física e mais cara. Som demais cansa e compete com a voz.

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
- trilha: `sound.musicGain` 0,15–0,22 para a trilha gerada (nivelada em −16 LUFS) e 0,08–0,15 para trilhas fornecidas, que costumam vir mais altas; ducking automático para `duckTo` (~30–35%) enquanto há fala.

O `render.mjs` masteriza o mix final em −14 LUFS / −1,5 dBTP (padrão de Reels/TikTok/Shorts) e informa o resultado. Se o mix soa abafado ou com efeitos altos demais, mexa nos ganhos do design system, não na masterização.

## Trilha

**Padrão: trilha original gerada** com `node scripts/ia/trilha.mjs <slug>`, depois da timeline (o `npm run ia` já roda). Ela usa o Lyria 3 do Google via OpenRouter (`google/lyria-3-pro-preview`; `lyria-3-clip-preview` para vídeos de até 30 s) e pede:
- **instrumental**, sem voz nem letra, mixada para locução: faixa de 1–4 kHz livre, sem melodia principal agitada;
- **a duração exata do vídeo** (fala + 1,2 s de cauda), com final de verdade: uma batida final e uma cauda curta, sem fade no meio;
- **estrutura com marcações de tempo** tiradas das seções da timeline: gancho tenso → assentamento → desenvolvimento → pico → resolução;
- **estilo pelo design system**: direção de arte (cinematic, technical, editorial, playful) e `motion.personality` definem o clima e o BPM.

Ajuste por vídeo em `src/videos/<slug>/ia.json` → `"music": {"style": "…", "bpm": 92, "sections": {"<id da seção>": "o que a música faz ali"}, "model": "…", "prompt": "…(substitui tudo)"}`. Use `sections` para alinhar acentos musicais com eventos visuais fortes (ex.: "impacto grave aos 3 s, junto com o martelo").

O script corta ou completa a faixa na medida, nivela em −16 LUFS e grava `public/videos/<slug>/trilha.mp3`, junto com `ia/trilha.json` (modelo, prompt e custo). No vídeo, passe `music={staticFile("videos/<slug>/trilha.mp3")}` ao `Explainer`, ou `A.music` do `assets.json`. O `<Music>` abaixa a trilha sob a fala (`sound.duckTo`). Com trilha gerada sob medida, `sound.musicGain` entre 0,15 e 0,22 costuma funcionar. Confira de ouvido no render.

**Trilha fornecida pelo usuário** (com direitos) tem prioridade: coloque-a em `public/videos/<slug>/trilha.mp3`. O script detecta que ela não foi gerada por ele (não há `ia/trilha.json`) e não a toca. **Sem `OPENROUTER_API_KEY`**, o vídeo sai só com voz e efeitos, o que também funciona bem em vídeo explicativo: diga isso na entrega.

Todo áudio do Lyria leva a marca d'água SynthID. Registre na entrega que a trilha foi gerada por IA e com qual modelo.
