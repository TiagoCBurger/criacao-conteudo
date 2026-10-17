# B-roll gerado (OpenRouter · google/veo-3.1-lite · 1080p · 9:16 · 4 s · sem áudio · US$ 0,20 cada)

Estilo comum (anexado a todos os prompts): luz baixa de estádio à noite (topo branco frio + recorte âmbar), fundo quase preto, profundidade rasa, câmera em push-in lento, fotorrealista; inox limpo e polido, higiene impecável, mãos com luva nitrílica preta, sem rostos; sem texto, números, logos ou marca d'água.

| Arquivo | Prompt (resumo) | Uso |
|---|---|---|
| v1-smash.mp4 | smash na chapa limpa e polida, espátula prensando, fumaça, borda rendada, cheddar derretendo | gancho do "57 pedidos" |
| v1-pico.mp4 | pico na cozinha: mãos de luva fecham sacolas kraft e colam lacre; fila de sacolas no passe de inox | beat "o dia bom" (recortar/escurecer o topo: pessoas desfocadas ao fundo) |
| v2-caixa.mp4 | smash duplo com cheddar numa caixa kraft aberta, queijo escorrendo, vapor | gancho do "Desconto de 20%" |
| v2-corte.mp4 | mão de luva corta o lanche ao meio na tábua, camadas à mostra | beat "o insumo não deu desconto" |

Gerar de novo: `python scripts/or_video.py saida.mp4 "<prompt + estilo>" google/veo-3.1-lite 4 1080p` (precisa de `OPENROUTER_API_KEY` e de crédito na conta).
