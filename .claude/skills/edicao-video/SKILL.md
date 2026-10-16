---
name: edicao-video
description: >-
  Edita os vídeos gravados que estão na pasta do projeto (câmera, celular, tela, clipes gerados por IA) com
  Remotion: encontra e mostra todos os vídeos (galeria, pranchas de contato, transcrição), corta pela fala
  (tira pausas, "é…", takes repetidos), junta trechos, reenquadra 16:9 → 9:16 com foco no rosto, põe
  legendas animadas, títulos, lower thirds, b-roll, zoom de ênfase, transições, efeitos sonoros e trilha com
  ducking, e renderiza o MP4 final masterizado. Use sempre que o pedido envolver vídeo já gravado: "edita
  esse vídeo", "corta as pausas", "faz um corte/reels/short desse vídeo", "junta esses clipes", "coloca
  legenda", "deixa vertical", "põe uma trilha", "tira os erros", "mostra os vídeos da pasta", "o que tem
  nesses vídeos" — mesmo sem dizer "Remotion". Para animar uma narração sem filmagem, use video-explicativo-3d;
  para gerar clipes, imagens, voz ou música com IA, use midia-ia-openrouter.
---

# Edição de vídeo (Remotion)

Transforma **o material bruto da pasta do projeto** num vídeo editado: cortes limpos pela fala, reenquadramento, legendas, motion graphics, som e render final. Tudo é declarado numa "lista de decisões de edição" em TypeScript, então a edição é reproduzível, revisável e sobrevive a mudanças (os cortes podem ser ancorados em palavras, não só em segundos).

**Esta skill faz:** inventário e visualização da mídia, transcrição palavra a palavra, cortes (manuais, pela fala, sugeridos automaticamente), montagem com transições, reenquadramento, textos e legendas animados, b-roll, picture-in-picture, imagens, zoom de ênfase, efeitos visuais, efeitos sonoros, trilha com ducking, mixagem, conferência visual e render.
**Não faz:** gravar, gerar mídia com IA (→ `midia-ia-openrouter`), nem animar explicações sem filmagem (→ `video-explicativo-3d`).

## Fluxo

Siga a ordem. Leia a referência de cada etapa quando chegar nela.

### 1. Estúdio
O projeto tem **um estúdio de edição** (`estudio-edicao/`) compartilhado por todas as edições.
- Procure `estudio-edicao/` (ou um diretório com `estudio.config.json`).
- Se não existir: `node <caminho-desta-skill>/scripts/init-estudio.mjs estudio-edicao` na raiz do projeto (copia o template e roda `npm install`).
- Biblioteca antiga: `… init-estudio.mjs estudio-edicao --update` (não toca nas edições nem no registro).

Precisa de Node 20+ e `ffmpeg`/`ffprobe` no PATH. A transcrição local (whisper.cpp) precisa também de `git`, `make`, `cmake` e compilador C++. Ela compila uma vez por máquina e é compartilhada com a skill `video-explicativo-3d`. Todos os comandos abaixo rodam dentro de `estudio-edicao/`.

### 2. Mídia: encontrar, preparar, ver → `references/midia-e-visualizacao.md`
```bash
npm run midia                     # procura vídeos/áudios/imagens na pasta do projeto, prepara e transcreve
npm run midia -- listar           # o que está no registro (ids usados na edição)
npm run galeria -- --abrir        # página para a PESSOA assistir a tudo (player + fala clicável)
```
Cada arquivo vira uma cópia de trabalho em `public/midia/` (H.264, quadros constantes, HDR de iPhone convertido), com pôster, **prancha de contato com tempos**, forma de onda, silêncios, cortes de câmera e transcrição. O registro fica em `src/midia/registro.json`. Rode em segundo plano se houver muito material: a transcrição é a parte lenta.

**Você enxerga o material pelas pranchas.** Antes de decidir qualquer corte ou enquadramento, abra `public/midia/<id>/prancha.jpg` com a ferramenta de leitura de imagem. Para ver um trecho de perto, use `npm run midia -- ver <id> --de 30 --ate 45`, e para um quadro em resolução cheia, `npm run midia -- quadro <id> 12.5`. Na prancha você descobre onde está o rosto (para o `foco`), o que é b-roll aproveitável, as trocas de câmera e o que está fora de quadro.

Se a pessoa pedir para ver os vídeos, indique a galeria (`out/galeria.html`) e o `npm run studio` (pasta **Midia**: cada clipe com timecode, fala e silêncios).

### 3. Entender o pedido e o material
Antes de cortar, saiba: **para onde vai** (Reels/TikTok/Shorts 9:16, YouTube 16:9, feed 4:5/1:1), **duração-alvo**, **a mensagem/gancho**, e o que manter ou tirar. Leia a fala:
```bash
npm run cortes -- <clipe>         # frases com tempos + sugestão de cortes sem pausas, vícios e takes repetidos
```
Se o pedido for aberto ("faz um reels desse vídeo"), escolha o trecho mais forte, com gancho nos primeiros 2 s e uma ideia completa, e diga qual escolheu e por quê.

### 4. Edição → `references/edl.md` (formato completo) e `references/corte-e-ritmo.md` (técnica)
```bash
npm run nova -- <slug> --clipe <id>[,<id2>] --formato 9:16
```
Edite `src/edicoes/<slug>/edicao.tsx`. Princípios que não se negociam:
- **Cortes pela fala.** Prefira `de: "primeiras palavras"` e `ate: "últimas palavras"` (ou os segundos que o `npm run cortes` sugeriu). O resolvedor aplica um respiro que nunca invade a palavra vizinha. Nunca corte no meio de uma palavra.
- **Fidelidade.** Não mude o sentido do que a pessoa disse ao juntar trechos. Textos na tela vêm da fala ou do pedido; nada de números ou afirmações inventados.
- **Corte seco é o padrão.** Transição só com motivo (mudança de assunto, salto de tempo, abertura/fecho). Elas ficam centradas no ponto de corte e usam a mídia de sobra, sem comer fala.
- **Enquadramento com intenção.** 16:9 → 9:16: `preencher` com `foco` no rosto (veja a prancha). Para tela de computador/slide, use `desfocar` ou `ajustar`. Confira o `foco` em cada clipe de câmera diferente.
- **Uma mensagem por tela.** A legenda é a camada principal de texto. Título, rótulo ou destaque entram um de cada vez, curtos e na zona segura. Esconda a legenda (`legendas.ocultar`) enquanto um título ocupa a tela.
- **Tempo pela fala.** Textos, b-roll, zooms e sons são ancorados com `{fala: "…"}` ou `{corte: n}`, não em segundos chutados, para acompanhar a voz e sobreviver a recortes.
- **Estilo só pelo design system.** Cores, fontes e legendas vêm de `design-system/tokens.json` do projeto (o mesmo da skill de vídeo 3D) ou do estilo neutro padrão. Precisou de uma cor nova? Use um papel do estilo, não um hex solto.

Motion graphics próprios (contador, gráfico, seta animada): crie um componente React em `src/edicoes/<slug>/` e use como camada `{tipo: "componente"}` → `references/motion-e-efeitos.md`.

### 5. Som → `references/som.md`
Os clipes entram normalizados (fala em −16 LUFS). Coloque `sons` só nos eventos com peso (entrada de título, revelação, troca de assunto). As transições já trazem o som do estilo. Use `trilha` só se a pessoa forneceu uma ou pediu (direitos autorais), ou se foi gerada com `midia-ia-openrouter`. O ducking sob a fala é automático.

### 6. Conferência → `references/qualidade-e-render.md`
```bash
npm run typecheck
npm run check -- <slug>           # tabela dos cortes (com a fala de cada um) + prancha em out/check/<slug>/prancha.jpg
npm run check -- <slug> --safe    # zonas de interface do 9:16 desenhadas por cima
```
**Leia a tabela e abra a prancha.** A tabela mostra o que ficou dentro de cada corte. Releia-a como roteiro: a frase faz sentido, o gancho está no começo, nada ficou cortado no meio. A prancha mostra o enquadramento, os textos e as sobreposições. Corrija e repita, contando com 2–3 rodadas. Se precisar, `npm run render -- <slug> --rascunho` gera um MP4 rápido em meia resolução para a pessoa avaliar o ritmo.

### 7. Render e entrega
```bash
npm run render -- <slug>          # out/<slug>.mp4 (H.264, −14 LUFS) + out/<slug>-capa.jpg + out/<slug>.srt
```
Entregue: o caminho do MP4, a capa e o `.srt`; a duração final contra a original; os cortes feitos (o que saiu e por quê: pausas, takes repetidos, trechos fora do assunto); as decisões de enquadramento, texto e som; o loudness reportado; e pendências (trecho com fala duvidosa na transcrição, trilha sem licença, foco a confirmar). A galeria já lista a edição renderizada.

## Referências

| Arquivo | Leia quando |
|---|---|
| `references/midia-e-visualizacao.md` | etapa 2: preparo, registro, pranchas, galeria, Studio, transcrição (whisper × OpenRouter), problemas |
| `references/edl.md` | etapa 4: todos os campos da edição, com exemplos (cortes, momentos, textos, camadas, sons, legendas) |
| `references/corte-e-ritmo.md` | etapas 3–4: gancho, jump cut, takes, ritmo por plataforma, b-roll, reenquadramento |
| `references/motion-e-efeitos.md` | etapa 4: animações de texto, zooms, transições, filtros, componentes próprios |
| `references/som.md` | etapa 5: efeitos, trilha, ducking, níveis |
| `references/qualidade-e-render.md` | etapas 6–7: checklist, render, solução de problemas |

`assets/estudio/` é o template do estúdio (não edite edições ali). `scripts/init-estudio.mjs` cria ou atualiza o estúdio no projeto.
