---
name: video-explicativo-3d
description: >-
  Cria vídeos explicativos verticais (9:16 — Reels, TikTok, Shorts) com animação de alta qualidade,
  elementos 3D, gráficos, blocos e diagramas, tipografia cinética, lettering, legendas e efeitos sonoros,
  sincronizados palavra a palavra com uma narração já gravada. Use sempre que houver roteiro + áudio/locução
  para virar vídeo, ou quando o usuário pedir "vídeo explicativo", "vídeo didático", "motion graphics",
  "reels/shorts animado", "animar esse roteiro/narração", "vídeo com 3D", ou entregar a saída de uma skill
  de roteiro — mesmo sem dizer "3D" ou "Remotion". Não define identidade visual — usa o design system do
  projeto (design-system/tokens.json) ou converte/cria um antes de começar. Stack Remotion + React Three Fiber.
---

# Vídeo explicativo 3D (vertical)

Transforma **roteiro + narração prontos** em um vídeo vertical didático e bem animado. O tempo de tudo vem da fala. O estilo de tudo vem do design system do projeto. O resultado é um MP4 pronto para postar, com capa e legendas.

**Esta skill faz:** storyboard visual, cenas animadas (3D, gráficos, diagramas, tipografia), legendas sincronizadas, efeitos sonoros, mixagem e render.
**Não faz:** escrever roteiro nem gravar narração (isso chega pronto de outra skill), nem inventar identidade visual por conta própria quando o projeto já tem uma.

## Insumos

| Insumo | Obrigatório | Formatos |
|---|---|---|
| Narração | **sim** | mp3, wav, m4a… Sem áudio, pare e peça: o vídeo é cronometrado por ele |
| Roteiro | recomendado | .md/.txt (títulos `#` = seções; `[colchetes]`, `> citações` e linhas `VISUAL:`/`TELA:` = notas de direção), ou .json com seções |
| Alinhamento | opcional | ElevenLabs (with-timestamps / STT), OpenAI Whisper verbose_json, whisper.cpp, .srt/.vtt. Sem ele, a skill transcreve |
| Assets | opcional | logos, imagens, trilha (só com direitos), modelos .glb do usuário |

Procure os insumos onde a skill de roteiro costuma deixá-los (pasta do episódio, `roteiros/`, `audio/`) antes de perguntar.

## Fluxo

Siga a ordem. Cada etapa tem um motivo e uma referência com os detalhes. Leia a referência quando chegar na etapa, não antes.

### 1. Estúdio
O projeto tem **um estúdio Remotion compartilhado** por todos os vídeos (`estudio-video/`), para manter a biblioteca e a identidade consistentes entre episódios.
- Procure `estudio-video/` (ou um diretório com `studio.config.json`).
- Se não existir: `node <caminho-desta-skill>/scripts/init-estudio.mjs estudio-video` (copia o template e roda `npm install`).
- Se existir mas a biblioteca for antiga: `… init-estudio.mjs estudio-video --update` atualiza `src/lib` e `scripts` sem tocar nos vídeos.

Todos os comandos abaixo rodam dentro de `estudio-video/`.

### 2. Design system e direção de arte → `references/design-system.md`
**Antes de qualquer cena.** Encontre `design-system/tokens.json`. Se a identidade existe em outro formato (CSS, Tailwind, manual da marca, outra skill de identidade), converta. Se não existe nada, crie um com intenção e registre as escolhas em `DESIGN.md`. Valide com `npm run ds:check`. Para identidade nova ou convertida, mostre a prancha `npm run check -- design-system --at 3` ao usuário antes de seguir, se ele estiver disponível.

**Defina a direção de arte (`tokens.art`)**: `cinematic` (escuro, luz dramática, metal, neblina) ou `technical` (aramado, grade, precisão) são os caminhos padrão para conteúdo explicativo, e podem ser misturados. `editorial` serve a marcas "revista". `playful` (arredondado, bonecos com olhos) fica só para marcas infantis ou explicitamente lúdicas. Para motion graphics **sem 3D** (tipografia, formas, gráficos e fluxos), use `art.medium: "2d"` → `references/2d.md`. Os presets em `assets/direcoes/` trazem o 3D, o movimento e as legendas coerentes com cada direção: mescle e ponha as cores e fontes da marca por cima.

Por quê: tudo no vídeo (cores, fontes, material e luz 3D, curvas de animação, paleta sonora) sai dos tokens. Valor de estilo escrito à mão numa cena quebra a consistência da série.

### 3. Linha do tempo da fala
```bash
npm run timeline -- <slug> --audio <narração> --script <roteiro> [--alignment <arquivo>] [--no-refine]
```
Gera `public/videos/<slug>/timeline.json` com cada palavra e seus tempos, as seções e as notas do roteiro, normaliza a voz (−16 LUFS) e gera um `.srt` por frase. Confira o resumo: `roteiro × fala` deve ficar ≥ 90%. Se ficar baixo, o roteiro não é a versão gravada. Os tempos são ajustados pelas pausas medidas na narração (o whisper erra perto das pausas e, em voz sintética, desloca frases inteiras); o resumo mostra quantas pausas foram usadas. Passe `--no-refine` só quando o alinhamento vier exato do TTS. Sem `--alignment`, a transcrição (whisper.cpp) pode levar minutos em máquina lenta ou compartilhada: rode em segundo plano.

### 4. Storyboard → `references/didatica-storyboard.md`
```bash
npm run new -- <slug>      # cria src/videos/<slug>/index.tsx (esqueleto) + storyboard.md
```
Preencha `storyboard.md` **antes de programar**: beats de 2–6 s, uma ideia cada, âncora (palavras exatas da fala), tratamento visual escolhido no catálogo, texto na tela (síntese, não transcrição) e som. Varie os tratamentos entre cenas vizinhas. O 3D entra onde dá volume ou matéria à ideia.

### 5. Cenas → `references/biblioteca.md`, `references/motion.md`, `references/3d.md`
Implemente cada beat em `src/videos/<slug>/index.tsx` com a biblioteca (`../../lib`). Princípios que não se negociam:
- **Tempo pela fala:** todo `delay` vem de `useCue("palavras faladas")`, nunca de segundos chutados. Assim a animação acompanha a voz e sobrevive a uma regravação.
- **Determinismo:** anime só a partir do frame (`useCurrentFrame`, `spring`, `interpolate`, helpers da lib). Nada de CSS animation, `setTimeout`, `useFrame` ou `<Float>`. O render é paralelo e fora de ordem.
- **Estilo só pelo design system:** `c()`, `type()`, `radius()`, `ThemedMaterial`. Precisa de algo novo? Adicione aos tokens.
- **HUD mínimo: uma mensagem por tela.** 1 visual principal e no máximo 1 bloco curto de texto (≤ 5 palavras ou um número) além da legenda discreta. Nada de selos, etiquetas, chips e assinaturas acumulados. O visual explica; o texto só nomeia.
- **3D com cara de design, não de brinquedo.** Arestas vivas, paleta contida, um acento de luz no que está em foco, câmera lenta. Siga a linguagem da direção de arte (tabela em `references/3d.md`).
- **Uma ideia por cena, sempre algo vivo, nada agitado.** Hierarquia de entrada: principal → apoio → destaque.
- **Zonas seguras do 9:16:** conteúdo dentro de `SafeArea`. Em 3D o quadro é estreito: use `viewSize()` para dimensionar.
- **Fidelidade:** números, nomes e afirmações na tela vêm do roteiro. Não invente dados.

### 6. Som → `references/som.md`
Coloque `<Sfx>` nos eventos visuais que têm peso: entrada principal, revelação, impacto, acerto/erro. O som de transição entre cenas já vem do design system. Trilha só se o usuário fornecer.

### 7. Conferência → `references/qualidade-e-render.md`
```bash
npm run typecheck
npm run check -- <slug>          # prancha de contato em out/check/<slug>/prancha.jpg
```
**Abra a prancha e avalie com o checklist** (legibilidade, zonas seguras, sobreposições, ritmo, ênfases, identidade). Corrija e repita. Esse ciclo é onde a qualidade acontece: conte com 2–3 rodadas.

### 8. Render e entrega
```bash
npm run render -- <slug>         # MP4 final masterizado + capa + .srt
```
Entregue ao usuário: o caminho do MP4, a capa, o `.srt` e um resumo curto com a duração, as cenas e o tratamento de cada uma, as decisões de design (principalmente se o design system foi criado ou convertido agora), o loudness reportado e qualquer pendência (fonte substituída, dado a confirmar, trilha ausente).

## Referências

| Arquivo | Leia quando |
|---|---|
| `references/design-system.md` | etapa 2: encontrar, converter, criar e validar tokens; direção de arte |
| `references/didatica-storyboard.md` | etapa 4: HUD mínimo, princípios, catálogo de tratamentos, texto × legenda, ritmo |
| `references/biblioteca.md` | etapa 5: API de todos os componentes, com exemplo de vídeo completo |
| `references/motion.md` | etapa 5: qualidade de animação, tempos, tipografia cinética, câmera |
| `references/3d.md` | etapa 5, cenas 3D: linguagem por direção de arte, regras do R3F no Remotion, enquadramento, receitas |
| `references/2d.md` | etapa 5, quando `art.medium` é `"2d"`: linguagem e componentes de motion graphics planos |
| `references/som.md` | etapa 6: biblioteca de efeitos, posicionamento, níveis |
| `references/qualidade-e-render.md` | etapas 7–8: checklist, render, solução de problemas |

`assets/estudio/` é o template do estúdio (não edite vídeos ali). `assets/direcoes/*.json` são presets de direção de arte (sem cores/fontes de marca). `assets/design-system-exemplo/tokens.json` é só uma **referência de formato**: suas cores e fontes são placeholders e não devem aparecer no vídeo de ninguém.
