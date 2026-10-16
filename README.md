# Criação de Conteúdo — Skills do time

Este repositório reúne as skills do Claude que o time de criação de conteúdo usa, para que todo mundo trabalhe com o mesmo padrão.

## Resumo

| Skill | Tipo | Precisa? | Como conseguir |
|---|---|---|---|
| `identidade-visual-html` | **Nossa (customizada)** | ✅ Sim | Está neste repositório (veja abaixo) |
| `video-explicativo-3d` | **Nossa (customizada)** | ✅ Para quem faz vídeo | Está neste repositório (veja abaixo) |
| `gerar-checkin-quarter` | Nossa (customizada) | ⚠️ Pendente | Citada pela `identidade-visual-html`, mas ainda não está aqui |
| `pptx` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `docx` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `pdf` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `xlsx` | Nativa da Anthropic | ✅ Sim | Ativar na própria conta |
| `deep-research` | Exemplo da Anthropic | 👍 Recomendada | Ativar na própria conta |
| `skill-creator` | Exemplo da Anthropic | 👍 Recomendada | Ativar na própria conta |
| `google-workspace` | Exemplo da Anthropic | Opcional | Só para quem edita arquivos no Google Drive pelo Claude |
| `morning`, `import-memory`, `computer-use`, `chrome-browser`, `built-in-browser` | Exemplo da Anthropic | ❌ Não | Pessoais/de ferramenta, não fazem parte do fluxo do time |

## 1. Skill do time: `identidade-visual-html`

Define o padrão visual das apresentações e relatórios em HTML para clientes (check-in quarter, QBR, relatório de performance, review mensal, proposta, dashboard): paleta vermelho/laranja sobre fundo escuro, tipografia Anton + Manrope, componentes prontos (tabelas, gráficos Chart.js, funil, KRs, plano 5W2H) e checklist de validação.

Arquivos:

```
.claude/skills/identidade-visual-html/
├── SKILL.md                     ← instruções da skill
├── references/design-tokens.md  ← CSS completo / tokens de design
└── templates/base.html          ← template base com dados de EXEMPLO
pacotes/identidade-visual-html.zip  ← mesma skill, empacotada para upload
```

Ela é acionada quando alguém pede uma apresentação ou relatório em HTML "no nosso padrão", "com a nossa cara", "igual ao último deck" etc.

### Como instalar

**Claude Code (terminal, VS Code, desktop):** clone este repositório e abra o Claude Code dentro da pasta. A skill em `.claude/skills/` é carregada automaticamente — não precisa instalar nada.

**claude.ai — para o time inteiro de uma vez (plano Team/Enterprise, só o owner da organização):**

1. Baixe o arquivo [`pacotes/identidade-visual-html.zip`](pacotes/identidade-visual-html.zip).
2. Em **Organization settings → Policy**, ative **"Cloud code execution and file creation"** e **"Skills"**.
3. Em **Organization settings → Plugins & skills**, clique em **Add → Upload a skill** e selecione o `.zip`.
4. A skill fica ativada para todos os membros (cada um pode desligar, mas não apagar).

**claude.ai — cada pessoa na própria conta (qualquer plano):**

1. Baixe o arquivo [`pacotes/identidade-visual-html.zip`](pacotes/identidade-visual-html.zip).
2. Em **Settings → Capabilities**, ative **"Code execution and file creation"**.
3. Em **Customize → Skills**, clique em **+ → Create skill → Upload a skill** e selecione o `.zip`.
4. Confirme que a skill aparece ativada na lista.

> Os nomes dos menus seguem a [Central de Ajuda da Anthropic](https://support.claude.com/en/articles/12512180-using-skills-in-claude) ([admin](https://support.claude.com/en/articles/13119606-managing-skills-as-an-admin)) e podem mudar um pouco entre versões do app.

> Se você editar a skill em `.claude/skills/identidade-visual-html/`, gere o `.zip` de novo para manter os dois iguais:
>
> ```bash
> cd .claude/skills && rm -f ../../pacotes/identidade-visual-html.zip && zip -rX ../../pacotes/identidade-visual-html.zip identidade-visual-html
> ```

## 2. Skill do time: `video-explicativo-3d`

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

## 3. Pendente: `gerar-checkin-quarter`

A `identidade-visual-html` cuida só do **visual**. Para a narrativa/conteúdo do check-in quarter ela manda usar em conjunto a skill `gerar-checkin-quarter`, que **não está na conta de onde estas skills foram exportadas**. Quem tiver essa skill deve adicioná-la em `.claude/skills/gerar-checkin-quarter/` (e gerar o `.zip` em `pacotes/`). Sem ela, o visual funciona normalmente; só a estrutura do check-in quarter precisa ser descrita no pedido.

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
