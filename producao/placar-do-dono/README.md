# Produção — série "Placar do Dono" (nome provisório)

Conteúdo educativo para donos de dark kitchen (negócios, marketing, finanças), feito com as skills do time:
`conteudo-dark-kitchen` (textos e base de conhecimento) → `video-explicativo-3d` (vídeos animados) e `xlsx` (planilha isca).

| Peça | Fonte | Estado |
|---|---|---|
| Vídeo "57 pedidos só pra empatar" (44,4 s) | `episodios/57-pedidos/roteiro.md` | pronto (voz ElevenLabs + b-roll), −14 LUFS |
| Vídeo "Desconto de 20%" (45,3 s) | `episodios/desconto-20/roteiro.md` | pronto (voz ElevenLabs + b-roll), −14 LUFS |
| Planilha "Placar do Dono" | `entregas/planilha/Placar-do-Dono-calculadora.xlsx` | pronta (124 fórmulas, 0 erros) |

Textos, legendas, ganchos alternativos e plano de postagem: `marcas/placar-do-dono/conteudo/2026-10-kit-educativo.md`.
Perfil e aprendizados da série: `marcas/placar-do-dono/`. Identidade: `identidade/identidade.md` → `design-system/`.

## Voz e b-roll (OpenRouter, 17/10/2026)
- Voz: `elevenlabs/eleven-v4`, voz `liam`, em `episodios/<slug>/narracao-eleven.mp3`, com alinhamento do `elevenlabs/scribe-v2` em `narracao-eleven.words.json`. Script: `scripts/or_narrar.py`.
- B-roll: 4 clipes `google/veo-3.1-lite` em `broll/` (prompts em `broll/PROMPTS.md`). Script: `scripts/or_video.py`.
- Trilha: não gerada — a conta ficou sem crédito (áudio de música exige saldo ≥ US$ 0,50). Script pronto: `scripts/or_musica.py` (Lyria 3).
- Atenção: o limite da chave não é o saldo da conta; confira `GET /api/v1/credits` antes de gerar.

## Narração provisória
`narracao.mp3` de cada episódio é **provisória** (voz sintética pt-BR, edge-tts), com alinhamento palavra a palavra em `narracao.words.json` (formato OpenAI verbose_json). Todo o tempo do vídeo vem da fala (`useCue`), então trocar a voz é: gerar o novo áudio + alinhamento, rodar `npm run timeline -- <slug> --audio … --script … --alignment …` e renderizar de novo.

## Com OpenRouter (sessão com `OPENROUTER_API_KEY` ou segredo de rede para openrouter.ai)
- Voz: ElevenLabs (`elevenlabs/eleven-v4` ou `eleven-multilingual-v2`) no lugar da voz provisória.
- B-roll de comida gerado (ex.: `google/veo-3.1`, `kwaivgi/kling-v3.0-pro`, `bytedance/seedance-2.5`) para os primeiros segundos (o gancho com comida segura mais) e para o "pedido fatiado".
- Trilha original curta: `google/lyria-3-clip-preview`.

## Retomar / renderizar de novo
Os MP4 finais não são versionados (≈ 26 MB cada); refaça a partir daqui. Componentes da série: `estudio-video/src/serie-placar/`.
```bash
cd producao/placar-do-dono/estudio-video && npm install            # node_modules não é versionado
for s in 57-pedidos desconto-20; do                                 # áudio de trabalho e b-roll não são versionados no public/
  ffmpeg -y -i ../episodios/$s/narracao-eleven.mp3 -ar 48000 public/videos/$s/narracao.wav
done
mkdir -p public/videos/57-pedidos/broll public/videos/desconto-20/broll
cp ../broll/v1-*.mp4 public/videos/57-pedidos/broll/ && cp ../broll/v2-*.mp4 public/videos/desconto-20/broll/
npm run ds:sync && npm run typecheck
npm run render -- 57-pedidos && npm run render -- desconto-20      # ~34 min cada com WebGL em software
```
(O `timeline` normaliza a voz para −16 LUFS ao gerar o `narracao.wav`; se preferir, rode `npm run timeline -- <slug> --audio ../episodios/<slug>/narracao-eleven.mp3 --script ../episodios/<slug>/roteiro.md --alignment ../episodios/<slug>/narracao-eleven.words.json`.) Em ambiente sem Chrome do Remotion, use `BROWSER_EXECUTABLE` apontando para o Chromium local.
