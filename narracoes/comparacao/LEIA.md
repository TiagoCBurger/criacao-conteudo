# Comparação de vozes pt-BR

Frase: "Seu anúncio teve mil curtidas e nenhuma venda? Curtida não paga a conta." (72 caracteres)

Transcrição conferida com `openai/whisper-large-v3-turbo` (arquivo `.palavras.json` ao lado de cada mp3).
Custo = estimativa por caractere do catálogo (o `--comparar` não grava o custo real por arquivo).

| arquivo | modelo | voz | custo (US$) | duração | transcrição bateu? |
|---|---|---|---|---|---|
| `01-mai-voice-2.1-luana.mp3` | microsoft/mai-voice-2.1 | pt-BR-Luana | 0,0016 | 5,2 s | quase: Whisper ouviu "não paga conta" (sem o "a"); conferir ouvindo |
| `02-mai-voice-2.1-caio.mp3` | microsoft/mai-voice-2.1 | pt-BR-Caio | 0,0016 | 6,4 s | sim, exata |
| `03-mai-voice-2.1-rafael.mp3` | microsoft/mai-voice-2.1 | pt-BR-Rafael | 0,0016 | 6,9 s | sim, exata (ritmo mais lento) |
| `04-mai-voice-2.1-pedro.mp3` | microsoft/mai-voice-2.1 | pt-BR-Pedro | 0,0016 | 4,7 s | sim, exata (o mais rápido, bom para Reels) |
| `05-eleven-v3-sarah.mp3` | elevenlabs/eleven-v3 | sarah | 0,0029 | 5,6 s | palavras sim; a pergunta saiu com entonação de afirmação ("venda.") |
| `06-eleven-v3-george.mp3` | elevenlabs/eleven-v3 | george | 0,0029 | 5,9 s | sim, exata |
| `07-eleven-v4-jessica.mp3` | elevenlabs/eleven-v4 | jessica | 0,0029 | 5,4 s | sim, exata |
| `08-fish-s2.1-pro-padrao.mp3` | fish-audio/s2.1-pro | (padrão) | 0,0014 | 5,1 s | palavras sim; pergunta virou vírgula (entonação sem pergunta) |

Fora da tabela:
- `google/gemini-3.8-flash-tts` (Kore, Puck) falhou: `HTTP 400: Gemini TTS only supports response_format="pcm". Got "mp3".` (limitação do script atual).
- `hexgrad/kokoro-82m` (pf_dora) foi gerada mas descartada: qualidade básica, só para rascunho.

Observação: sotaque das vozes ElevenLabs/Fish em pt-BR varia; as MAI (Luana, Caio, Rafael, Pedro) são nativas pt-BR. Ninguém ouviu ainda: a escolha final precisa de alguém ouvindo.
