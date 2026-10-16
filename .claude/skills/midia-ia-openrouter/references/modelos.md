# Qual modelo usar

O catálogo muda com frequência. **A fonte da verdade é o catálogo ao vivo**: `or.mjs escolher …`, `or.mjs modelo <id>` e `or.mjs catalogo <tipo>`. As tabelas abaixo são um retrato de **16/out/2026**, com preços estimados pelo próprio script (5 s, vertical 9:16, sem áudio, salvo indicação). Quando um modelo daqui sumir ou aparecer outro melhor, siga o catálogo. As descrições entre aspas vêm do próprio catálogo do OpenRouter.

## Vídeo

### Como decidir
1. **Requisitos duros:** duração (há modelos com durações fixas, como Veo: 4/6/8 s), formato (9:16), resolução, áudio nativo, 1º/último quadro, referências (imagem, vídeo, áudio), seed. `escolher video` elimina quem não atende.
2. **Rascunho × final:** itere o prompt num modelo rápido e barato da mesma família (o comportamento é parecido) e gere o final uma vez.
3. **Custo:** varia mais de 10× entre modelos. Em vídeo para redes, 720p costuma bastar (as plataformas recomprimem). 1080p ou 4K só quando o clipe vai ser recortado ou ampliado na edição.

### Mapa
| necessidade | modelo | dados do catálogo |
|---|---|---|
| **padrão do time**: qualidade, vertical, personagem/produto consistente, referências multimodais, áudio nativo | `bytedance/seedance-2.0` | 4–15 s · 480p–4K · 7 formatos · áudio · 1º+último quadro · refs imagem+vídeo+áudio · "particularly strong at preserving character consistency" · ≈ US$ 0,76 (720p), 1,87 (1080p). Com vídeo de referência fica mais barato (≈ 0,09/s em 720p) |
| rascunho do Seedance (testar prompt, enquadramento, movimento) | `bytedance/seedance-2.0-fast` (`--rascunho`) | 4–15 s · 480p/720p · mesmas entradas · "prioritizes generation speed and lower cost" · ≈ US$ 0,20 (480p), 0,45 (720p) |
| Seedance mais barato | `bytedance/seedance-2.0-mini` | 4–15 s · 480p/720p · refs multimodais · ≈ US$ 0,17 (480p), 0,38 (720p) |
| plano longo (até 30 s), história, extensão ou edição de vídeo | `bytedance/seedance-2.5` | 4–30 s · 480p/720p · "long-form storytelling, multimodal reference-based generation, video editing, and video extension" · ≈ US$ 1,16 (720p) |
| longo e barato, até 1080p | `alibaba/wan-3.0` | 2–30 s · até 1080p · áudio · 1º+último quadro · refs · ≈ US$ 0,50 (720p) |
| realismo e áudio sincronizado (diálogo, ambiente) | `google/veo-3.1` | 4/6/8 s · até 4K · só 16:9/9:16 · áudio · "maximum visual fidelity in final production cuts" · ≈ US$ 1,00 sem áudio, 2,00 com áudio (5 s 1080p) |
| Veo mais rápido/barato | `google/veo-3.1-fast`, `google/veo-3.1-lite` | mesmas durações · fast ≈ US$ 0,40 (720p), lite ≈ 0,15 (720p) · ambos com áudio nativo |
| movimento e física, 1º+último quadro | `kwaivgi/kling-v3.0-pro` (`-std` mais barato) | 3–15 s · 720p · áudio · ≈ US$ 0,56 (pro), 0,42 (std); com áudio +50% |
| 4K, keyframes de abertura e fechamento, continuar um vídeo | `black-forest-labs/flux-3-video` | 5–20 s · 720p–4K · áudio · continuação via `--continuar <job>` · ≈ US$ 0,85 (720p) |
| texto/marca na tela, edição guiada por instrução | `minimax/hailuo-3` | 5–15 s · 2K · áudio · "instruction-guided edits, text and brand rendering" · ≈ US$ 0,65 |
| cinematográfico, só texto/imagem inicial | `runway/gen-4.5` | 2–10 s · 720p · sem áudio · ≈ US$ 0,60 |
| muito barato para testar ideias | `x-ai/grok-imagine-video-1.5-lite`, `google/veo-3.1-lite`, `bytedance/seedance-1-5-pro` | ≈ US$ 0,10–0,15 (480p–720p) |
| **editar** um vídeo existente (trocar objeto, cenário, texto) | `black-forest-labs/flux-video-edit`, `runway/aleph-2` | `--ref clipe.mp4` + instrução · FLUX ≈ US$ 0,03/s · Aleph US$ 0,28/s (mín. 0,56) |
| aumentar a resolução de um clipe | `black-forest-labs/flux-video-upscale` | 1,5–3× · preço por megapixel·s |
| avatar falante a partir de **foto + áudio** | `heygen/avatar-iv` | lip-sync expressivo · US$ 0,05/s · só com consentimento da pessoa da foto |

### Áudio nativo × narração separada
Para vídeos do time (narração + b-roll), gere o vídeo **sem áudio** e ponha narração, trilha e efeitos na edição: dá mais controle e às vezes sai mais barato (Kling, Veo). Use áudio nativo quando o som faz parte da cena (ambiente, diálogo curto entre personagens, impacto sincronizado).

## Imagem

| necessidade | modelo | notas do catálogo |
|---|---|---|
| **padrão**: geral, edição, consistência com várias referências | `google/gemini-3.1-flash-image` (Nano Banana 2) | até 14 referências · 512–4K · "Pro-level visual quality at Flash speed" |
| máxima qualidade Google, raciocínio sobre a cena | `google/gemini-3-pro-image` (Nano Banana Pro) | 1K–4K · 14 refs |
| rascunhos rápidos e baratos | `google/gemini-3.1-flash-lite-image`, `black-forest-labs/flux.2-klein-4b`, `bytedance-seed/seedream-5-0-flash`, `krea/krea-2-medium-turbo` | 1K na maioria |
| **texto legível** na imagem (thumbnail, capa, cartaz) | `openai/gpt-image-2`, `qwen/qwen-image-3-pro` ("text and details as small as 10px"), `black-forest-labs/flux.2-flex` ("excels at rendering complex text") | ponha o texto exato entre aspas no prompt |
| **fundo transparente** (PNG para sobrepor no vídeo) | `openai/gpt-image-2.5-flare` (rápido), `openai/gpt-image-2.5-sunburst` (preciso), `sourceful/riverflow-v2.5-pro` | `--fundo transparente`; `gpt-image-2` **não** aceita |
| vetor **SVG** (ícone, logo simples, ilustração chapada) | `recraft/recraft-v4.1-vector`, `recraft/recraft-v4.1-pro-vector` | `--formato-saida svg` não é preciso: o modelo só gera SVG |
| seguir o **estilo** de uma imagem de referência | `recraft/recraft-v4-styles(-pro)` | exige 1+ `--ref` de estilo |
| fotorrealismo de ponta, produto, multi-referência | `black-forest-labs/flux-3-image`, `black-forest-labs/flux.2-pro`/`-max`, `bytedance-seed/seedream-5-0-pro` | até 4K (FLUX 3) |
| edição pontual guiada por instrução | `krea/k3-edit` (1–4 refs), Nano Banana, Seedream | `--ref foto.png "troque o fundo por…"` |
| muitas referências (até 20) | `tencent/hy-image-v3.5-preview` | |

Formato por destino: 9:16 (Reels/Stories, capa de Shorts), 16:9 (thumbnail do YouTube, b-roll horizontal), 4:5 ou 1:1 (feed). Para animar depois (imagem→vídeo), gere a imagem já no formato do vídeo.

## Voz (TTS)

O jeito certo de escolher: `or.mjs voz --comparar "uma frase real do roteiro"` gera a mesma frase em ~8 vozes (por centavos). A pessoa ouve, escolhe, e a escolha vai para `midia-ia/config.json`, para a série inteira soar igual.

| opção | quando | dados |
|---|---|---|
| `microsoft/mai-voice-2.1` (padrão) / `-flash` | **vozes nativas pt-BR**: `pt-BR-Luana`, `pt-BR-Caio`, `pt-BR-Pedro`, `pt-BR-Rafael` (+ Grant/Harper multilíngues) | US$ 0,022 / 1k caracteres (flash 0,015) · sotaque brasileiro garantido pelo locale |
| `elevenlabs/eleven-v3` / `eleven-v4` | máxima expressividade, tags de interpretação no texto (`[excited]`, `[whispers]` com `--manter-tags`) | 70+/90+ idiomas · 21 vozes prontas (nomes em inglês; o sotaque em pt varia, então compare) · US$ 0,04 / 1k car. · v4-turbo 0,02 |
| `elevenlabs/eleven-multilingual-v2` | narração longa e estável (audiobook, aula) | 29 idiomas · 10k caracteres por pedido |
| `google/gemini-3.8-flash-tts` (`-lite`) | barato, direção por `--instrucoes` ("tom caloroso, ritmo animado"), **diálogo com duas vozes** | 30 vozes · as instruções não são lidas em voz alta |
| `fish-audio/s2.1-pro` | direção em colchetes no texto, multi-falante | "expressive narration and dialogue" |
| `hexgrad/kokoro-82m` | rascunho baratíssimo (`pf_dora`, `pm_alex`, `pm_santa`) | US$ 0,0006 / 1k car. · qualidade básica |
| clonagem de voz | `heygen/heygen-voice-1`, `bytedance-seed/seed-audio-1-0`, `mistralai/voxtral-mini-tts-2603` | amostra de áudio da pessoa (**só com consentimento dela**); veja `api.md` |

Dicas: escreva números e siglas como devem ser lidos ("vinte por cento", "ó-pen-rau-ter") quando a pronúncia importar; confira com `transcrever`. Pontuação controla as pausas.

## Música

| modelo | o que gera | preço |
|---|---|---|
| `google/lyria-3-pro-preview` (padrão) | música completa (com estrutura), 48 kHz estéreo | US$ 0,08 por música |
| `google/lyria-3-clip-preview` | trecho de 30 s (vinheta, fundo de Reels) | US$ 0,04 por clipe |

Aceita texto e uma imagem de referência (`--imagem`) para o clima. Para trilha sob narração, peça **instrumental, sem vocais**. A letra ou descrição devolvida pelo modelo fica num `.letra.txt` ao lado do áudio.

## Efeitos sonoros

`bytedance-seed/seed-audio-1-0` pelo endpoint de voz: o texto descreve o som (não é lido). Até 120 s, US$ 0,0025 por segundo gerado. A biblioteca sintetizada dos estúdios (whoosh, pop, ding…) cobre o básico de graça; gere só o que é específico ("motor de moto acelerando ao longe", "teclado mecânico em escritório silencioso").

## Transcrição (palavras com tempo)

`openai/whisper-large-v3-turbo` (padrão: rápido e barato, palavras com tempo). Alternativas: `openai/whisper-large-v3`, `elevenlabs/scribe-v2`, `mistralai/voxtral-mini-transcribe`. Alguns modelos (`openai/gpt-4o-transcribe`, `microsoft/mai-transcribe-1.5`) **não** devolvem palavras com tempo: o script avisa. Use para alinhar narração gerada com o vídeo (`video-explicativo-3d --alignment`) e para conferir se a voz disse o texto certo.

## Preços: como o script estima
`pricing_skus` do catálogo de vídeo tem três tipos de unidade:
- `duration_seconds*`: US$ por segundo (variações por resolução, com/sem áudio, texto→vídeo × imagem→vídeo);
- `cents_per_*second*`: centavos por segundo;
- `video_tokens*` (ByteDance): US$ por token, com tokens/s ≈ largura × altura × 24 / 1024 (720p vertical ≈ 21.600 tokens/s).

O custo real volta no fim (`usage.cost`) e fica no `.json` de cada arquivo e em `midia-ia/registro.jsonl`. Imagem e voz são cobradas por token ou caractere e quase sempre custam centavos.

## Fixar as escolhas do projeto (`midia-ia/config.json`)
Depois de escolher modelo, voz e limites com a pessoa, grave para a série toda (só os campos que mudam; o resto usa o padrão — veja com `or.mjs config`):
```json
{
  "limiteUSD": 5,
  "video": {"modelo": "bytedance/seedance-2.0", "rascunho": "bytedance/seedance-2.0-fast", "resolucao": "720p", "formato": "9:16", "duracao": 8},
  "imagem": {"modelo": "google/gemini-3.1-flash-image", "formato": "9:16", "resolucao": "2K"},
  "voz": {"modelo": "elevenlabs/eleven-v3", "voz": "sarah", "instrucoes": null},
  "musica": {"modelo": "google/lyria-3-clip-preview"}
}
```
