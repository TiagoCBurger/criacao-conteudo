# Criação de Conteúdo — Skills do time

Este repositório reúne as skills do Claude que o time de criação de conteúdo usa, para que todo mundo trabalhe com o mesmo padrão.

## Resumo

| Skill | Tipo | Precisa? | Como conseguir |
|---|---|---|---|
| `video-explicativo-3d` | **Nossa (customizada)** | ✅ Para quem faz vídeo | Está neste repositório (veja abaixo) |
| `conteudo-dark-kitchen` | **Nossa (customizada)** | ✅ Para quem cria conteúdo de delivery | Está neste repositório (veja abaixo) |
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

## 2. Skill do time: `conteudo-dark-kitchen`

Cria conteúdo de **alta retenção e com humor** para dark kitchens e restaurantes de delivery (iFood, 99Food, Keeta, Rappi, canal próprio): roteiros de Reels/TikTok/Shorts com tempos, falas, texto na tela, som e lista de takes, ganchos alternativos para teste, carrosséis, stories, legendas, calendários, bilhetes de embalagem, nomes de combos e respostas a avaliações. Também atende conteúdo para **donos de delivery** (consultores, mentores, fornecedores).

Ela é acionada quando alguém pede conteúdo, roteiro, vídeo curto, post, ideia ou calendário para hamburgueria, pizzaria, marmita, açaí, sushi ou qualquer comida de delivery — mesmo sem falar em "humor" ou "retenção".

Também ensina **negócios, marketing e finanças de dark kitchen** (CMV, ficha técnica, preço com comissão de app, margem, ponto de equilíbrio, promoções, avaliações, canal próprio) a partir de uma **base de conhecimento** em `references/conhecimento/`. Cada seção tem um ID (`FIN-04`, `MKT-02`, `NEG-03`, `MER-01`…) e o Claude cita esses IDs ao entregar conteúdo ou responder dúvidas, para o time conferir de onde veio cada afirmação. Os dados que mudam (comissões dos apps, tributos, Reforma Tributária, regras sanitárias, CDC/CONAR, meios de pagamento) ficam em `mercado-e-regras.md` com fonte, data e nível de confiança; se um dado tiver mais de 6 meses, o Claude confirma antes de usar.

**Aprendizado em tempo real:** quando alguém corrige algo, traz um dado novo ou conta o resultado de um post, o Claude registra na hora: o que vale para todos vai para `references/conhecimento/aprendizados.md`, e o que vale só para uma marca vai para `marcas/<slug>/aprendizados.md`. Ele avisa em uma linha ("Anotei na base: …") e já usa na resposta seguinte. Para o time inteiro receber o aprendizado, é preciso fazer commit. De tempos em tempos, os aprendizados são consolidados nos arquivos principais.

Como funciona: monta (ou reaproveita) o perfil da marca em `marcas/<slug>/perfil.md`, gera 3× mais ideias do que vai entregar e filtra (identificação, "teste da troca", fome, viabilidade de gravação, risco), roteiriza com a anatomia de retenção e revisa com checklist. Tem regras fixas de segurança de marca: nada de piada com higiene, entregador ou cliente, dados de cliente sempre borrados e nenhum preço, cupom ou número inventado (o que falta vira `[PREENCHER]`). Roteiros narrados saem também no formato que a `video-explicativo-3d` lê.

Arquivos:

```
.claude/skills/conteudo-dark-kitchen/
├── SKILL.md                         ← fluxo (perfil → ideação → retenção → humor → formato → revisão) e segurança de marca
├── references/
│   ├── retencao.md                  ← ganchos (banco de delivery), estrutura por duração, ritmo, loop, texto na tela, CTA, métricas
│   ├── humor.md                     ← mecânicas, timing, formatos de esquete, personagens, banco de situações, limites
│   ├── publico-consumidor.md        ← pilares, apetite no celular, estigma da dark kitchen, momentos de pedido, datas
│   ├── publico-dono-de-delivery.md  ← conteúdo B2B: dores, humor da operação, autoridade sem inventar números
│   ├── formatos.md                  ← modelos de roteiro (com exemplo completo), carrossel, stories, calendário, embalagem, avaliações
│   └── conhecimento/                ← base de conhecimento citável
│       ├── financas.md              ← FIN-01…11: ficha técnica, CMV, margem, preço, ponto de equilíbrio, DRE, caixa, promoções
│       ├── marketing.md             ← MKT-01…10: posicionamento, loja no app, avaliações, recompra, canal próprio, anúncios
│       ├── negocios.md              ← NEG-01…09: modelos, multimarca, engenharia de cardápio, operação, entrega, expansão
│       ├── mercado-e-regras.md      ← MER-01…12: dados com fonte e data (apps, tributos, Anvisa/CVS, CDC/CONAR, Pix)
│       ├── pautas-educativas.md     ← P01…P38: pautas prontas com gancho e humor, ligadas às seções
│       └── aprendizados.md          ← memória viva: o que o time ensinou e ainda não foi consolidado
├── assets/perfil-marca-modelo.md    ← modelo do perfil da marca
└── evals/                           ← casos de teste e benchmark (iteração 1: 100% com a skill × 74% sem)
```

Não precisa de instalação nem de programas extras: funciona no Claude Code (clonando este repositório) e também no claude.ai/app. Para usar no claude.ai, compacte a pasta `conteudo-dark-kitchen` em `.zip`, ative **"Code execution and file creation"** em **Settings → Capabilities** e envie em **Customize → Skills → + → Create skill → Upload a skill** (no plano Team/Enterprise, o owner pode enviar para todos em **Organization settings → Plugins & skills**).

## 3. Skills nativas da Anthropic

Estas **não estão copiadas aqui de propósito**: a licença das skills `pptx`, `docx`, `pdf` e `xlsx` proíbe copiar ou redistribuir os arquivos, e todas já vêm prontas na conta de cada pessoa. Cada um só precisa ativar **"Code execution and file creation"** em **Settings → Capabilities** e conferir se estão ligadas em **Customize → Skills**. (No plano Team/Enterprise, o owner precisa antes ativar "Cloud code execution and file creation" e "Skills" em **Organization settings → Policy**.)

- **`pptx`** — criar e editar apresentações PowerPoint.
- **`docx`** — criar e editar documentos Word.
- **`pdf`** — ler, juntar, dividir e gerar PDFs.
- **`xlsx`** — planilhas (dados de campanha, relatórios de métricas).
- **`deep-research`** — pesquisa em várias fontes com relatório final (pautas, tendências, concorrência).
- **`skill-creator`** — para criar ou melhorar skills do time seguindo o padrão.
- **`google-workspace`** — opcional, só para quem pede ao Claude para criar ou editar Docs/Sheets/Slides no Google Drive.

No Claude Code essas skills nativas não são carregadas a partir deste repositório; elas existem no claude.ai e no app Claude.
