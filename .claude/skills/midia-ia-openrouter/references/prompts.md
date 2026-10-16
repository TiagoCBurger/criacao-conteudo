# Prompts

Os modelos entendem português, mas a descrição visual costuma sair mais precisa em **inglês**. Escreva a cena em inglês e mantenha em português, entre aspas, só o que deve aparecer escrito ou ser falado. Mostre à pessoa a tradução do que pediu quando isso ajudar.

## Vídeo

### Estrutura
```
[sujeito + ação] · [cenário e momento] · [câmera: UM movimento] · [luz e estilo] · [som, se houver áudio]
```
Exemplo (Reels, 9:16, 8 s):
> A young woman in a beige blazer explains something to camera in a bright home office, natural hand gestures. Vertical framing, subject centered in the upper third. Slow dolly-in. Soft window light from the left, warm tones, shallow depth of field, realistic. Quiet room tone.

- **Uma ação e um movimento de câmera por plano.** "Orbit + zoom + pan" ao mesmo tempo gera movimento confuso. Para encadear, escreva em sequência ("starts static, then slowly pushes in").
- **A duração cabe na ação.** 5 s comportam um gesto, não uma história.
- Vocabulário de câmera que funciona: static shot, slow dolly-in/out, push-in, pull-back, pan left/right, tilt up/down, tracking shot, orbit around, handheld, crane up, top-down, close-up, medium shot, wide shot, macro.
- Estilo: realistic/cinematic/documentary, "shot on 35mm", "studio product lighting", "isometric 3D render", "clay animation". Para a marca, cite as cores em hex do design system ("accent color #FFD23F").
- **Vertical (9:16):** peça "vertical framing, subject centered", senão o modelo pode compor como 16:9 e cortar.
- Evite negativas ("no people"). Diga o que quer ver. Modelos com `negative_prompt`/`negativePrompt` (Kling, Wan, Veo) aceitam via `--provedor` (veja `api.md`).

### Imagem → vídeo (`--inicio`, `--fim`)
- A imagem já define aparência e composição: **descreva só o que muda** (movimento do sujeito, da câmera, da luz). Re-descrever a imagem inteira faz o modelo "corrigir" detalhes.
- `--inicio` + `--fim`: transição controlada (produto fechado → aberto, dia → noite) ou **loop** (mesma imagem nos dois).
- Gere o quadro inicial com o modelo de imagem já no formato do vídeo (9:16).
- Encadear planos: o último quadro de um clipe vira o `--inicio` do próximo (`ffmpeg -sseof -0.05 -i a.mp4 -frames:v 1 fim.png`).

### Vários planos num clipe (Seedance 2.x)
```
Vertical 9:16 product ad, consistent lighting and color across shots.
Shot 1 (0–3 s): close-up of the coffee cup on a marble table, steam rising, static camera.
Shot 2 (3–6 s): hand lifts the cup, camera tracks up with it.
Shot 3 (6–8 s): wide shot of the café, slow pull-back. Ambient café sound.
```
Uma nota de continuidade no começo e, por plano, um rótulo, uma ação, um movimento de câmera e (opcional) o som.

### Referências (`--ref`) no Seedance 2.x
As referências vão na ordem em que são passadas (`--ref personagem.png --ref movimento.mp4 --ref musica.mp3`). Diga no prompt, em linguagem natural, **o papel de cada uma**: "keep the character from the reference image; follow the camera movement of the reference video; sync cuts to the reference audio". A interface da própria ByteDance usa marcações `@Image1`, `@Video1`, `@Audio1`, e guias de terceiros repetem essa sintaxe. Ela pode funcionar pelo OpenRouter, mas não está documentada ali. Teste uma vez no `--rascunho` antes de depender dela. Comece com o menor número de referências que garante a consistência.

Com `--inicio`/`--fim` **e** `--ref` juntos, o OpenRouter trata o pedido como imagem→vídeo e as referências podem ser ignoradas. Use um ou outro.

### Áudio nativo (`--audio`)
Descreva os sons ("rain on the window, distant thunder", "upbeat electronic music"). Fala: escreva entre aspas e diga o idioma: `She says in Brazilian Portuguese: "Bom dia, gente!"`. Diálogo gerado é imprevisível em pt-BR (sotaque, sincronia). Para narração, prefira TTS + edição.

### Iteração
1. `--rascunho` (Seedance 2.0 Fast) em 480p com o prompt.
2. Ajuste uma coisa por vez (câmera, luz, ação) e use `--seed` fixo para comparar.
3. Final na resolução cheia com o mesmo prompt e seed.

## Imagem
```
[tipo de imagem] of [sujeito], [composição/enquadramento], [lente/ponto de vista], [luz], [estilo], [paleta], text "…" if needed
```
> Vertical 9:16 YouTube Shorts cover: a smiling barista holding a latte, medium close-up, eye level, soft daylight, clean modern style, palette #0B0C0F and #FFD23F, bold headline text "3 ERROS NO CAFÉ" at the top.
- Texto na imagem: entre aspas, curto (≤ 5 palavras), e diga onde fica. Use um modelo bom de texto (`modelos.md`).
- Edição (`--ref`): diga o que muda **e o que fica** ("change the background to a beach at sunset; keep the person, pose and clothing unchanged").
- Consistência (personagem, produto): reutilize as mesmas `--ref` e descreva os traços fixos sempre do mesmo jeito.
- Para sobrepor no vídeo: `--fundo transparente` com modelo compatível, ou fundo liso de cor única para recortar.

## Narração (TTS)
- Escreva para o ouvido: frases curtas, ordem direta, pontuação para respirar. Vírgula = pausa curta; ponto = pausa; reticências = hesitação.
- Números, siglas e nomes estrangeiros: escreva como devem soar se a pronúncia importar.
- Direção de interpretação:
  - Gemini TTS, OpenAI, Fish: `--instrucoes "tom caloroso e confiante, ritmo de criador de conteúdo, sorriso na voz"`;
  - ElevenLabs v3/v4: tags no texto (`[excited] Isso muda tudo! [whispers] e quase ninguém sabe.`) com `--manter-tags`;
  - Fish Audio: direção entre colchetes no texto;
  - MAI-Voice: texto limpo (o locale da voz define o sotaque).
- Roteiro do time (`.md` com `# seções`, `[direção]`, `VISUAL:`): passe com `--arquivo`, porque o script tira o que não é falado.

## Música (Lyria)
```
[gênero/subgênero], [clima], [andamento em BPM], [instrumentos], [estrutura], [uso], instrumental / vocal
```
> Lo-fi hip hop, warm and focused mood, 85 BPM, mellow Rhodes piano, soft vinyl crackle, brushed drums, deep bass. Steady groove with no big drops, suitable as background under a voice-over. Instrumental, no vocals.
- Sob narração: sem vocais, sem grandes variações de volume, sem solo agudo na faixa da voz.
- Para Reels de 30 s use `lyria-3-clip-preview`; para YouTube ou trilha que vai ser cortada, `lyria-3-pro-preview`.
- Não cite artistas ou músicas reais ("estilo de fulano"): descreva os elementos.
- Imagem de referência (`--imagem capa.png`) ajuda a acertar o clima.

## Efeito sonoro (Seed Audio)
Descreva o som físico: **o que**, **material**, **ação**, **espaço**, **distância** e **duração**, e termine com "no voices, no music".
> A heavy wooden door slamming shut in an empty stone hallway, short natural echo, close perspective, about 2 seconds, no voices, no music.
Gere 2–3 variações curtas e escolha. Na edição, sincronize o transiente com o evento visual.
