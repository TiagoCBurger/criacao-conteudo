# Criação de Conteúdo — Skills do time

Este repositório reúne as skills do Claude que o time de criação de conteúdo usa, para que todo mundo trabalhe com o mesmo padrão.

## Resumo

| Skill | Tipo | Precisa? | Como conseguir |
|---|---|---|---|
| `video-explicativo-3d` | **Nossa (customizada)** | ✅ Para quem faz vídeo | Está neste repositório (veja abaixo) |
| `pptx` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `docx` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `pdf` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `xlsx` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `deep-research` | Exemplo da Anthropic | 👍 Recomendada | Ativar na própria conta |
| `skill-creator` | Exemplo da Anthropic | 👍 Recomendada | Ativar na própria conta |
| `google-workspace` | Exemplo da Anthropic | Opcional | Só para quem edita arquivos no Google Drive pelo Claude |
| `morning`, `import-memory`, `computer-use`, `chrome-browser`, `built-in-browser` | Exemplo da Anthropic | ❌ Não | Pessoais/de ferramenta, não fazem parte do fluxo do time |

## 1. Skill do time: `video-explicativo-3d`

Transforma **roteiro + narração prontos** em vídeo vertical 9:16 (Reels, TikTok, Shorts) com animação 3D, gráficos, diagramas, tipografia cinética, legendas, efeitos sonoros e trilha original (gerada por IA) sincronizados palavra a palavra com a fala. Opcionalmente gera também a narração, imagens, modelos 3D e cenários 2.5D por IA (`npm run ia`; veja `references/ia-generativa.md`). Usa Remotion + React Three Fiber e segue o design system do projeto (`design-system/tokens.json`); se não houver um, converte ou cria antes de começar. Também faz motion graphics só em 2D (`art.medium: "2d"`).

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

Use pelo **Claude Code** (terminal, VS Code ou desktop): clone este repositório e abra o Claude Code dentro da pasta. A skill em `.claude/skills/` é carregada automaticamente. Ela precisa de Node.js e roda `npm install` no estúdio na primeira vez; a transcrição automática da fala (whisper.cpp) precisa também de `git`, `make`, `cmake` e compilador C++. Se o TTS já entregar o alinhamento (ElevenLabs with-timestamps) ou um `.srt`, a transcrição não é necessária. Para trilha, narração e imagens geradas, defina `OPENROUTER_API_KEY` no ambiente (nunca no repositório); o 3D a partir de imagens roda localmente (`npm run ia:setup`, ~2 GB de modelos).

## 2. Skills nativas da Anthropic

Estas **não estão copiadas aqui de propósito**: a licença das skills `pptx`, `docx`, `pdf` e `xlsx` proíbe copiar ou redistribuir os arquivos, e todas já vêm prontas na conta de cada pessoa. Cada um só precisa ativar **"Code execution and file creation"** em **Settings → Capabilities** e conferir se estão ligadas em **Customize → Skills**. (No plano Team/Enterprise, o owner precisa antes ativar "Cloud code execution and file creation" e "Skills" em **Organization settings → Policy**.)

- **`pptx`** — criar e editar apresentações PowerPoint.
- **`docx`** — criar e editar documentos Word.
- **`pdf`** — ler, juntar, dividir e gerar PDFs.
- **`xlsx`** — planilhas (dados de campanha, relatórios de métricas).
- **`deep-research`** — pesquisa em várias fontes com relatório final (pautas, tendências, concorrência).
- **`skill-creator`** — para criar ou melhorar skills do time seguindo o padrão.
- **`google-workspace`** — opcional, só para quem pede ao Claude para criar ou editar Docs/Sheets/Slides no Google Drive.

No Claude Code essas skills nativas não são carregadas a partir deste repositório; elas existem no claude.ai e no app Claude.
