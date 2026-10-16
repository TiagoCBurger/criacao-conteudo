---
name: midia-ia-openrouter
description: >-
  Gera mídia com IA pelo OpenRouter usando a chave OPENROUTER_API_KEY do .env do projeto: vídeos (Seedance 2.0
  e 2.5, Veo 3.1, Kling 3, Wan 3, Hailuo, FLUX Video…; texto→vídeo, imagem→vídeo com 1º/último quadro,
  referências de imagem/vídeo/áudio, edição e upscale), imagens (Nano Banana, GPT Image, FLUX, Seedream,
  Recraft; edição, fundo transparente, SVG, visual 3D), narração/locução (TTS com vozes pt-BR, comparação de
  vozes, clonagem), música (Lyria 3), efeitos sonoros e transcrição com tempo por palavra. Escolhe o modelo
  certo pelo catálogo ao vivo (capacidades e preço), estima o custo antes de gastar e registra tudo. Use
  sempre que pedirem para "gerar/criar um vídeo com IA", "seedance", "veo", "kling", "b-roll gerado", "animar
  essa imagem", "gerar imagem/thumbnail/capa", "nano banana", "imagem 3D", "narração/locução/voz com IA",
  "TTS", "música/trilha com IA", "efeito sonoro", "qual modelo usar" — mesmo sem citar o OpenRouter.
---

# Mídia com IA (OpenRouter)

Um só script (`scripts/or.mjs`, Node 20+, sem dependências) fala com todas as APIs de mídia do OpenRouter. O catálogo é lido **ao vivo** (os modelos mudam toda semana), os parâmetros são validados contra as capacidades de cada modelo antes de enviar, e o custo é estimado antes de gastar.

```bash
OR="node <caminho-desta-skill>/scripts/or.mjs"      # rode a partir da raiz do projeto
$OR saldo                                          # confere a chave e os créditos
$OR escolher video --duracao 8 --formato 9:16 --audio
$OR video "…" --duracao 8 --formato 9:16 --simular  # mostra o pedido e o custo, sem gastar
```

## Fluxo

### 1. Chave
A chave fica em `.env` na raiz do projeto: `OPENROUTER_API_KEY=sk-or-v1-…` (criada em https://openrouter.ai/keys). O script procura o `.env` subindo a partir da pasta atual.
- **Nunca** mostre, copie para outro arquivo ou commite a chave. O script avisa se o `.env` não está no `.gitignore`: adicione a linha `.env` antes de qualquer commit.
- Sem chave: pare e peça para a pessoa criar o `.env`. Não peça para ela colar a chave no chat.
- `$OR saldo` confirma que a chave funciona e mostra o crédito disponível.

### 2. Entender o pedido e escolher o modelo → `references/modelos.md`
Defina antes: **o que** (vídeo, imagem, voz, música, efeito), **para onde** (9:16 Reels/TikTok/Shorts, 16:9 YouTube, 1:1/4:5 feed), **duração**, se precisa de **áudio nativo**, se há **imagem de partida/chegada** ou **referências** (personagem, produto, estilo), e se é **rascunho ou final**. Então:
```bash
$OR escolher video --duracao 10 --formato 9:16 [--resolucao 1080p] [--audio] [--inicio] [--fim] [--ref-imagem|--ref-video|--ref-audio] [--prioridade qualidade|custo|velocidade]
$OR escolher imagem [--editar] [--transparente] [--svg] [--refs 3] [--resolucao 4K]
$OR escolher voz [--idioma pt-BR]
$OR modelo <id>                       # tudo sobre um modelo: durações, resoluções, quadros, preços, vozes
$OR catalogo video|imagem|voz|musica|transcricao [--busca texto]
```
O `escolher` filtra pelo que é obrigatório e ordena por qualidade, custo e velocidade. As heurísticas estão em `references/modelos.md`, junto com o que cada modelo faz de melhor. Padrões do projeto (modelo de vídeo, voz da marca etc.) ficam em `midia-ia/config.json` (`$OR config`). Se o projeto tem uma voz ou um modelo definidos ali, use-os.

**Seedance 2.0** (`bytedance/seedance-2.0`) é o padrão de vídeo: 4–15 s, até 4K, vertical, áudio nativo, 1º/último quadro e referências de imagem, vídeo e áudio. Para iterar, use `--rascunho` (Seedance 2.0 Fast) em 480p e só faça o final na resolução cheia.

### 3. Prompt → `references/prompts.md`
Escreva o prompt como um diretor: sujeito e ação, cenário, **um movimento de câmera por plano**, luz e estilo, som. Em imagem→vídeo, descreva só o movimento. Textos que devem aparecer na imagem vão entre aspas, no idioma final. Cores da marca vêm do design system do projeto (`design-system/tokens.json`), quando existir.

### 4. Custo e aprovação
- O script imprime o custo estimado e **recusa** acima de `limiteUSD` (padrão US$ 3, em `midia-ia/config.json`) sem `--confirmar`. Ele também recusa vídeo cujo custo não dá para estimar.
- Antes de gerar **vídeo**, de gerar em lote (várias variações, várias cenas) ou de passar do limite, mostre à pessoa o modelo, os parâmetros e o custo (`--simular`) e espere o ok. Imagem, voz, efeito e música custam centavos e podem seguir direto, salvo pedido diferente.
- Gere **uma** variação, mostre e só então gere mais.

### 5. Gerar
```bash
$OR video "<prompt>" --duracao 8 --formato 9:16 --resolucao 720p [--audio] [--inicio quadro.png] [--fim fim.png] [--ref personagem.png --ref movimento.mp4] [--seed 7] [--modelo …]
$OR imagem "<prompt>" --formato 9:16 [--resolucao 2K] [--ref produto.png] [--fundo transparente] [--n 2] [--modelo …]
$OR voz --arquivo roteiro.md [--modelo …] [--voz …] [--instrucoes "tom caloroso, ritmo animado"]
$OR voz --comparar "uma frase do roteiro"        # a mesma frase em ~8 vozes pt-BR, para escolher ouvindo
$OR musica "lo-fi instrumental, 85 BPM, piano e bateria suave, sem vocais" [--modelo google/lyria-3-clip-preview]
$OR som "porta de madeira pesada fechando num corredor vazio, eco curto, sem vozes"
$OR transcrever narracao.mp3                     # palavras com tempo (para alinhar com vídeo)
```
- **Vídeo é assíncrono** (30 s a alguns minutos): rode em segundo plano. Se cair, `$OR retomar <arquivo.job.json | job-id>` continua de onde parou, sem pagar de novo.
- Arquivos locais em `--inicio/--fim/--ref` viram data URL. Acima de ~15 MB, use uma URL pública.
- Cada arquivo gerado vai para `midia-ia/<videos|imagens|narracao|musica|sfx>/` com um `.json` ao lado (prompt, modelo, parâmetros, custo real) e uma linha em `midia-ia/registro.jsonl`. Isso é o histórico do projeto: consulte antes de gerar de novo algo parecido.
- `voz --arquivo roteiro.md` tira títulos, `[direções]`, `> notas` e linhas `VISUAL:`/`TELA:` (o formato de roteiro do time). Textos longos são divididos por frases e juntados. Com ElevenLabs v3/v4, `--manter-tags` preserva as tags de interpretação (`[excited]`, `[whispers]`).

### 6. Conferir o resultado
- **Imagem:** abra o arquivo com a ferramenta de leitura de imagem e confira o pedido (texto escrito certo, mãos, marca, proporção).
- **Vídeo:** extraia quadros (`ffmpeg -ss 1 -i v.mp4 -frames:v 1 q.jpg`) ou, se o projeto tem o estúdio de edição, rode `npm run midia` e abra a prancha do clipe. Confira movimento, deformações e texto na tela.
- **Voz:** `$OR transcrever narracao.mp3` e compare o texto com o roteiro (pronúncia de nomes, números, siglas). Você não consegue ouvir; peça para a pessoa ouvir antes de usar no final.
- **Música/efeito:** confira duração e presença de voz indesejada (transcrever um trecho ajuda) e peça para a pessoa ouvir.

### 7. Entregar e integrar
Diga onde está cada arquivo, o modelo usado, o custo real (vem no `.json`) e os próximos passos possíveis:
- **edicao-video:** os arquivos de `midia-ia/` aparecem no `npm run midia` do estúdio de edição e viram b-roll, trilha (`trilha: {clipe}`), efeitos (`sons: [{clipe}]`) ou locução (`audios`).
- **video-explicativo-3d:** a narração gerada + `$OR transcrever narracao.mp3` (gera `narracao.palavras.json`, no formato OpenAI verbose_json) entram direto em `npm run timeline -- <slug> --audio narracao.mp3 --script roteiro.md --alignment narracao.palavras.json`, sem precisar do whisper local. Imagens servem de textura, fundo ou referência.

## Regras
- **Direitos e pessoas reais.** Não gere rosto, voz ou imagem de pessoa real identificável (nem clone de voz) sem consentimento dela. Não imite marcas, logos de terceiros nem estilos de artistas vivos citando-os pelo nome. Nas plataformas (Instagram, TikTok, YouTube), conteúdo realista feito com IA deve ser marcado como tal: lembre a pessoa.
- **Fidelidade.** Dados, nomes e textos que aparecem na mídia vêm do roteiro ou do pedido.
- **Consistência de série.** Fixe em `midia-ia/config.json` o modelo de vídeo, a voz (modelo + voz + instruções) e o estilo, e reutilize as mesmas imagens de referência e `--seed`. Para personagens, gere uma imagem de referência boa e use-a como `--inicio`/`--ref` em todos os clipes.
- **3D:** o OpenRouter não tem, hoje, modelos que gerem malhas 3D (.glb). Veja em `references/3d.md` o que fazer (imagens com visual 3D, giro 360° de produto em vídeo, texturas e fundos para a skill de vídeo 3D).

## Referências

| Arquivo | Leia quando |
|---|---|
| `references/modelos.md` | escolher modelo de vídeo, imagem, voz, música, efeito ou transcrição; entender preços |
| `references/prompts.md` | escrever o prompt (vídeo, multi-plano, imagem→vídeo, imagem, voz, música, efeito) |
| `references/3d.md` | pedido envolve "3D": objetos, produtos, personagens, texturas, ambientes |
| `references/api.md` | erro da API, parâmetro de provedor, formato de resposta, limites |
