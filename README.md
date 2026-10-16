# Criação de Conteúdo — Skills do time

Este repositório reúne as skills do Claude que o time de criação de conteúdo usa, para que todo mundo trabalhe com o mesmo padrão.

## Resumo

| Skill | Tipo | Precisa? | Como conseguir |
|---|---|---|---|
| `video-explicativo-3d` | **Nossa (customizada)** | ✅ Para quem faz vídeo | Está neste repositório (veja abaixo) |
| `edicao-video` | **Nossa (customizada)** | ✅ Para quem edita vídeo gravado | Está neste repositório (veja abaixo) |
| `midia-ia-openrouter` | **Nossa (customizada)** | ✅ Para quem gera vídeo, imagem, voz ou música com IA | Está neste repositório (precisa da chave do OpenRouter no `.env`) |
| `pptx` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `docx` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `pdf` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `xlsx` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `deep-research` | Exemplo da Anthropic | 👍 Recomendada | Ativar na própria conta |
| `skill-creator` | Exemplo da Anthropic | 👍 Recomendada | Ativar na própria conta |
| `google-workspace` | Exemplo da Anthropic | Opcional | Só para quem edita arquivos no Google Drive pelo Claude |
| `morning`, `import-memory`, `computer-use`, `chrome-browser`, `built-in-browser` | Exemplo da Anthropic | ❌ Não | Pessoais/de ferramenta, não fazem parte do fluxo do time |

## 1. Skill do time: `video-explicativo-3d`

Transforma **roteiro + narração prontos** em vídeo vertical 9:16 (Reels, TikTok, Shorts) com animação 3D, gráficos, diagramas, tipografia cinética, legendas e efeitos sonoros sincronizados palavra a palavra com a fala. Usa Remotion + React Three Fiber e segue o design system do projeto (`design-system/tokens.json`); se não houver um, converte ou cria antes de começar. Também faz motion graphics só em 2D (`art.medium: "2d"`).

Ela é acionada quando alguém pede "vídeo explicativo", "vídeo didático", "motion graphics", "reels animado", "animar esse roteiro/narração" etc.

Arquivos:

```
.claude/skills/video-explicativo-3d/
├── SKILL.md                 ← instruções e fluxo (estúdio → design system → timeline → storyboard → cenas → som → conferência → render)
├── references/              ← guias de cada etapa (design system, storyboard, biblioteca, motion, 3D, 2D, som, render)
├── assets/estudio/          ← template do estúdio Remotion (biblioteca de componentes e scripts)
├── assets/direcoes/         ← presets de direção de arte: cinematic, technical, editorial
├── assets/exemplos/         ← vídeos de referência (funil 2D, juros com HUD mínimo)
├── scripts/init-estudio.mjs ← cria ou atualiza o estúdio no projeto
└── evals/                   ← casos de teste e benchmarks (iteração 2: 91% de aprovação)
```

### Como usar

Use pelo **Claude Code** (terminal, VS Code ou desktop): clone este repositório e abra o Claude Code dentro da pasta. A skill em `.claude/skills/` é carregada automaticamente. Ela precisa de Node.js e roda `npm install` no estúdio na primeira vez; a transcrição automática da fala (whisper.cpp) precisa também de `git`, `make`, `cmake` e compilador C++. Se o TTS já entregar o alinhamento (ElevenLabs with-timestamps) ou um `.srt`, a transcrição não é necessária.

## 2. Skill do time: `edicao-video`

Edita **os vídeos gravados que estão na pasta do projeto** (câmera, celular, gravação de tela, clipes gerados por IA) com Remotion. Ela encontra e prepara toda a mídia da pasta, mostra tudo numa **galeria** (player, prancha de contato, transcrição clicável) e no Remotion Studio, corta pela fala (tira pausas, "é…", takes repetidos), reenquadra 16:9 → 9:16 com foco no rosto, e põe legendas animadas, títulos, rótulos, b-roll, zoom de ênfase, transições, efeitos sonoros e trilha com ducking. O render sai em MP4 masterizado, com capa e `.srt`. Usa o mesmo design system (`design-system/tokens.json`) da skill de vídeo 3D ou, sem ele, um estilo neutro.

Ela é acionada quando alguém pede "edita esse vídeo", "corta as pausas", "faz um reels desse vídeo", "junta esses clipes", "coloca legenda", "deixa vertical", "mostra os vídeos da pasta" etc.

```
.claude/skills/edicao-video/
├── SKILL.md                 ← fluxo (estúdio → mídia → cortes → edição → som → conferência → render)
├── references/              ← mídia e visualização, formato da edição, corte e ritmo, motion, som, render
├── assets/estudio/          ← template do estúdio de edição (scripts + biblioteca Remotion)
└── scripts/init-estudio.mjs ← cria ou atualiza o estúdio no projeto
```

Comandos principais, dentro de `estudio-edicao/`: `npm run midia` (procura e prepara a mídia), `npm run galeria -- --abrir` (assistir a tudo), `npm run cortes -- <clipe>` (fala em frases + sugestão de cortes), `npm run check -- <edição>` e `npm run render -- <edição>`. Precisa de Node.js 20+ e ffmpeg. A transcrição local (whisper.cpp) precisa também de `git`, `make`, `cmake` e compilador C++; sem isso, dá para transcrever pelo OpenRouter (`--stt openrouter`).

## 3. Skill do time: `midia-ia-openrouter`

Gera mídia com IA pelo [OpenRouter](https://openrouter.ai) com uma chave só: **vídeo** (Seedance 2.0/2.5, Veo 3.1, Kling 3, Wan 3 e outros; texto→vídeo, imagem→vídeo com 1º e último quadro, referências de imagem/vídeo/áudio), **imagem** (Nano Banana, GPT Image, FLUX, Seedream, Recraft; edição, fundo transparente, SVG, visual 3D), **narração** (vozes pt-BR, comparação de vozes, clonagem com consentimento), **música** (Lyria 3), **efeitos sonoros** e **transcrição** com tempo por palavra. Ela consulta o catálogo ao vivo para escolher o modelo certo (capacidades e preço), estima o custo antes de gastar (e recusa acima de um limite sem confirmação) e guarda tudo em `midia-ia/` com o prompt e o custo real ao lado de cada arquivo.

O OpenRouter não tem, hoje, modelos que gerem malhas 3D (.glb). Para "3D", a skill gera imagens com visual 3D, giros 360° de produto em vídeo, folhas de personagem e texturas/fundos para a skill de vídeo 3D (detalhes em `references/3d.md`).

**Configuração (uma vez por pessoa):**
1. Crie a chave em https://openrouter.ai/keys e adicione créditos em https://openrouter.ai/credits. Vale definir um limite de gasto na própria chave.
2. Na raiz do projeto, copie `.env.example` para `.env` e cole a chave: `OPENROUTER_API_KEY=sk-or-v1-…`.
3. O `.env` já está no `.gitignore` deste repositório. **Nunca commite a chave** nem cole a chave no chat.

```
.claude/skills/midia-ia-openrouter/
├── SKILL.md            ← fluxo (chave → escolher modelo → prompt → custo → gerar → conferir → integrar)
├── references/         ← qual modelo usar, como escrever prompts, 3D, detalhes da API
└── scripts/or.mjs      ← CLI sem dependências: catalogo, escolher, video, imagem, voz, musica, som, transcrever, saldo
```

As três skills conversam: clipes, trilhas e efeitos gerados em `midia-ia/` aparecem no `npm run midia` da edição. A narração gerada + `or.mjs transcrever` entra direto na linha do tempo da skill de vídeo 3D (`--alignment`). E um vídeo explicativo renderizado pode virar clipe numa edição.

## 4. Skills nativas da Anthropic

Estas **não estão copiadas aqui de propósito**: a licença das skills `pptx`, `docx`, `pdf` e `xlsx` proíbe copiar ou redistribuir os arquivos, e todas já vêm prontas na conta de cada pessoa. Cada um só precisa ativar **"Code execution and file creation"** em **Settings → Capabilities** e conferir se estão ligadas em **Customize → Skills**. (No plano Team/Enterprise, o owner precisa antes ativar "Cloud code execution and file creation" e "Skills" em **Organization settings → Policy**.)

- **`pptx`** — criar e editar apresentações PowerPoint.
- **`docx`** — criar e editar documentos Word.
- **`pdf`** — ler, juntar, dividir e gerar PDFs.
- **`xlsx`** — planilhas (dados de campanha, relatórios de métricas).
- **`deep-research`** — pesquisa em várias fontes com relatório final (pautas, tendências, concorrência).
- **`skill-creator`** — para criar ou melhorar skills do time seguindo o padrão.
- **`google-workspace`** — opcional, só para quem pede ao Claude para criar ou editar Docs/Sheets/Slides no Google Drive.

No Claude Code essas skills nativas não são carregadas a partir deste repositório; elas existem no claude.ai e no app Claude.
