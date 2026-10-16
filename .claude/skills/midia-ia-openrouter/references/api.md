# API do OpenRouter usada pelo script (para depurar)

Base `https://openrouter.ai/api/v1` (`OPENROUTER_BASE_URL` sobrescreve, para testes). Autenticação `Authorization: Bearer $OPENROUTER_API_KEY`. Os catálogos são públicos (sem chave). Documentação: https://openrouter.ai/docs (índice para agentes: https://openrouter.ai/docs/llms.txt).

| o quê | endpoint | resposta |
|---|---|---|
| catálogo de vídeo | `GET /videos/models` | `supported_durations`, `supported_resolutions`, `supported_aspect_ratios`, `supported_frame_images`, `generate_audio`, `seed`, `pricing_skus`, `allowed_passthrough_parameters` |
| catálogo de imagem | `GET /images/models` · `GET /images/models/{autor}/{modelo}/endpoints` | `supported_parameters` (enum/range por parâmetro), `input_references` min–max |
| demais modelos | `GET /models?output_modalities=all` | `architecture.input/output_modalities`, `pricing`, `supported_voices` |
| **vídeo** | `POST /videos` → `{id, polling_url, status}` · `GET {polling_url}` até `completed`/`failed`/`cancelled`/`expired` · `GET /videos/{id}/content?index=0` | concluído traz `unsigned_urls` (com chave), às vezes `urls` assinadas (sem chave, expiram) e `usage.cost` |
| **imagem** | `POST /images` | `data[].b64_json` (+ `media_type` em SVG), `usage.cost` |
| **voz / efeito** | `POST /audio/speech` | bytes de áudio (não é JSON); `response_format` `mp3` ou `pcm` (o script usa mp3; pcm vira WAV) |
| **música** | `POST /chat/completions` com `modalities: ["text","audio"]`, `stream: true` | eventos SSE com `choices[0].delta.audio.data` (base64, juntar) e texto (letra/descrição) |
| **transcrição** | `POST /audio/transcriptions` com `input_audio: {data: base64, format}`, `response_format: "verbose_json"`, `timestamp_granularities: ["word","segment"]` | `text`, `words[] {word,start,end}`, `segments[]`, `usage.cost` |
| chave / créditos | `GET /key` · `GET /credits` | uso, limite e saldo |

## Pedido de vídeo
```json
{
  "model": "bytedance/seedance-2.0",
  "prompt": "…",
  "duration": 8,
  "aspect_ratio": "9:16",
  "resolution": "720p",
  "generate_audio": false,
  "seed": 7,
  "frame_images": [{"type": "image_url", "image_url": {"url": "data:image/png;base64,…"}, "frame_type": "first_frame"}],
  "input_references": [
    {"type": "image_url", "image_url": {"url": "https://…/personagem.png"}},
    {"type": "video_url", "video_url": {"url": "https://…/movimento.mp4"}},
    {"type": "audio_url", "audio_url": {"url": "https://…/batida.mp3"}}
  ],
  "previous_job_id": "gen-vid-…",
  "provider": {"options": {"byteplus": {"parameters": {"watermark": false}}}}
}
```
- Valores fora das listas do modelo dão 400 com os valores aceitos. O script valida antes.
- Referências de vídeo e áudio só são usadas por provedores que as suportam (Seedance 2+, Wan 3, Hailuo 3, HeyGen Video…). Os outros as ignoram.
- `previous_job_id` (`--continuar`): editar/estender um vídeo já gerado, no mesmo modelo, se ele suportar continuação.
- `size: "1280x720"` substitui `resolution` + `aspect_ratio`.

## Parâmetros do provedor (`--provedor`)
`allowed_passthrough_parameters` no `or.mjs modelo <id>` lista as chaves aceitas, que vão em `provider.options.<slug-do-provedor>.parameters` (vídeo) ou `provider.options.<slug>` (imagem/voz). O significado e os valores vêm da documentação do provedor original (Google Vertex, Kuaishou, Alibaba, ByteDance…). Exemplos:
```bash
--provedor '{"google-vertex": {"parameters": {"negativePrompt": "blurry, text, watermark"}}}'
--provedor '{"<slug>": {"parameters": {"negative_prompt": "distorted hands"}}}'
```
O slug do provedor aparece no endpoint de detalhes (`GET /models/{id}/endpoints`, campo `tag`). Chaves não reconhecidas são descartadas sem erro, então confirme o efeito num rascunho.

## Clonagem de voz
`or.mjs voz "<texto>" --modelo heygen/heygen-voice-1 --clonar amostra.wav [--texto-amostra "o que é dito na amostra"]` (até 3 `--clonar`). O script envia `input_references: [{type: "input_audio", input_audio: {data}}, {type: "text", text}]` sem `voice`. Só endpoints com `supports_voice_cloning` aceitam (HeyGen Voice, Seed Audio 1.0, Voxtral Mini TTS). A HeyGen usa os 3 primeiros minutos e aceita `--provedor '{"heygen": {"language": "pt"}}'`; a Seed Audio aceita até 3 amostras, chamadas no texto de `@Audio1`…`@Audio3`. Amostra limpa (sem música nem eco), WAV ou MP3, ≤ 15 MB. **Exige consentimento do dono da voz.**

## Erros
| código | significado | o que fazer |
|---|---|---|
| 400 | parâmetro inválido/fora da lista | leia a mensagem (traz os valores aceitos); `or.mjs modelo <id>` |
| 401 | chave ausente/errada | confira o `.env` |
| 402 | sem créditos | https://openrouter.ai/credits |
| 403 | limite de gasto da chave ou acesso bloqueado | ajuste o limite da chave no painel |
| 404 | modelo inexistente ou sem provedor para o pedido | o catálogo mudou; `or.mjs catalogo` |
| 413 | arquivo grande demais | use URL pública ou reduza |
| 429 / 5xx | limite de taxa / instabilidade | o script tenta de novo sozinho; gerações que falham não são cobradas |
| job `failed` | o provedor recusou (moderação, prompt, referência) | a mensagem `error` vem do provedor; ajuste o prompt |

Geração de vídeo não é elegível a retenção zero (ZDR): o provedor guarda a saída temporariamente para o download.
