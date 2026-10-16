# Conferência, render e problemas

## Ciclo de conferência

1. `npm run typecheck`: zero erros antes de qualquer render.
2. `npm run check -- <slug>`: prancha com um quadro a cada 1,5 s (`--every 1` para mais detalhe, `--safe` para ver as zonas de interface em vermelho e a faixa da legenda em amarelo). **Abra a imagem e leia de verdade** (ferramenta de leitura de imagem). A prancha é o seu olho: o que não aparece nela, o espectador também não vê.
3. `npm run check -- <slug> --at 3.2,7.9` mostra instantes específicos em resolução cheia (pico de uma animação, momento de sobreposição).
4. Corrija e repita até a prancha passar no checklist abaixo. Só então faça o render final.

## Checklist da prancha

**Leitura e layout**
- [ ] Todo texto legível: tamanho ≥ `small`, contraste bom, nada sobre área clara do 3D sem apoio.
- [ ] Nada importante nas zonas de interface (`--safe`): topo, base e faixa direita.
- [ ] Título e objeto 3D/gráfico não se sobrepõem. Nada cortado nas bordas.
- [ ] Legenda não colide com conteúdo (o `SafeArea` reserva a faixa; conteúdo posicionado à mão precisa respeitar).
- [ ] Texto na tela é síntese e não repete literalmente a legenda (ou a legenda está escondida naquele trecho).

**HUD mínimo** (com `art.hud: "minimal"`)
- [ ] Cada quadro tem 1 visual principal e no máximo 1 bloco de texto além da legenda (título ≤ 5 palavras ou número).
- [ ] Nada fixo na tela (marca d'água, barra de progresso, selos de seção) sem exigência da marca.
- [ ] Gráficos sem grade, eixo ou legenda separada; só o valor que importa rotulado.
- [ ] Texto anterior sai antes do próximo entrar (sem acúmulo de linhas).

**Linguagem 3D**
- [ ] O 3D segue a direção de arte (sem formas arredondadas, bonecos com olhos ou cores de brinquedo fora do playful).
- [ ] Um único acento por quadro, no objeto ou número em foco.
- [ ] O 3D não invade a faixa da legenda (amarela no `--safe`), nem no fim de um *push-in*, e nada importante é cortado nas bordas.

**Didática e ritmo**
- [ ] O 1º quadro (t≈0,25 s) já tem algo forte. Não há vinheta nem tela vazia.
- [ ] O começo de **cada** cena já tem conteúdo (cenário, objeto ou título). Não há quadro quase vazio logo após um corte esperando o próximo cue.
- [ ] As cenas 3D têm profundidade e foco de luz (veja 3d.md › Cena rica). Analogias do cotidiano estão encenadas, não só escritas.
- [ ] Cada cena tem **uma** ideia clara, e a ênfase está na palavra/número certo.
- [ ] Não há trecho > ~3 s visualmente igual (procure quadros vizinhos idênticos na prancha).
- [ ] Os tratamentos variam entre cenas vizinhas.
- [ ] Os números e termos na tela batem com a narração (nada inventado).

**Identidade**
- [ ] Cores, fontes e materiais vêm só do design system (`grep -n "#[0-9a-fA-F]\{6\}\|fontFamily" src/videos/<slug>` deve voltar vazio).
- [ ] `accent` usado com parcimônia (sinaliza, não decora).

**Som** (confira no render, ouvindo ou pelo plano no storyboard)
- [ ] Cada corte tem som de transição (padrão), as revelações têm som e as sequências não "metralham".
- [ ] O `render.mjs` reporta loudness entre −16 e −12 LUFS e não aponta clipping.

## Render final

```bash
npm run render -- <slug>            # out/<slug>.mp4 + out/<slug>-capa.jpg + out/<slug>.srt
npm run render -- <slug> --draft    # metade da resolução, para revisar ritmo
npm run render -- <slug> --poster 2.4   # escolhe o instante da capa
```
- Com GPU, o script usa `--gl=angle`. Sem GPU (servidor/container), usa `--gl=swangle`. Para forçar: `--gl swangle`.
- Saída: H.264 1080×1920 30 fps, yuv420p, AAC 48 kHz, áudio masterizado em −14 LUFS. É o que Reels, TikTok e Shorts aceitam sem recompressão estranha.
- Rode o render em segundo plano se a ferramenta permitir. Vídeos de 30–60 s levam minutos.

## Problemas comuns

| Sintoma | Causa provável → solução |
|---|---|
| `A delayRender() "…" was called but not cleared` | asset 3D carregando fora do Suspense, URL errada (404) ou fonte inexistente. Confira o caminho com `staticFile`/`dsFile`. No 3D, use hooks que suspendem (veja 3d.md, regra 3) |
| `cue não encontrado na narração: "…"` | a âncora não bate com as palavras do `timeline.json` (grafia, número por extenso, palavra que o locutor mudou). A mensagem lista palavras parecidas |
| `cenas fora de ordem` | âncora que aparece antes na fala. Use `{after: …}` ou outra âncora |
| quadro 3D preto/vazio | objeto fora do enquadramento (`viewSize`), câmera dentro do objeto, ou `Scene3D` sem altura (deve estar em `AbsoluteFill`) |
| 3D tremendo/pulando entre quadros | animação por relógio (`useFrame`, `Float`…). Troque por frame |
| texto 3D sem a fonte da marca | display sem `.ttf/.otf` no design system (`ds:check` avisa). Baixe com `fetch-font.mjs` |
| fonte errada no HTML | arquivo em `files` não existe ou `family` diferente do usado. Rode `npm run ds:check` |
| `ds:sync` falha | `tokens.json` inválido. A mensagem diz o campo |
| legenda com palavras erradas | `timeline` sem `--script` (só transcrição). Refaça passando o roteiro; confira `scriptMatch` ≥ 0,9 |
| `scriptMatch` baixo (< 0,8) | o roteiro não é a versão que foi gravada. Peça a versão final ou rode sem `--script` |
| render muito lento | sombras, glass, partículas demais, `surface.style: "glass"` com muitos cards. Veja 3d.md › Desempenho |
| whisper falha ao instalar | precisa de `git`, `make`, `cmake`, compilador C++ e acesso a github.com/huggingface.co. Alternativa: peça o alinhamento ao serviço de TTS (ElevenLabs with-timestamps) ou um `.srt`, e passe `--alignment` |
| `Error: … WebGL` / contexto perdido | renderize com `--gl swangle` e, se persistir, `--concurrency 2` |
