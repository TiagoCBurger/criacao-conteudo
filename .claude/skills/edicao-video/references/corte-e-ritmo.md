# Corte e ritmo

O que faz um vídeo curto prender: **gancho imediato, uma ideia por vez, nada de espera**. A edição existe para isso, não para enfeitar.

## Gancho (0–2 s)
- O vídeo começa na frase mais forte, não no "oi, tudo bem". Se a melhor frase está no meio da gravação, ela pode abrir o vídeo (com cuidado para não mudar o sentido).
- O primeiro quadro já tem rosto/ação e, se fizer sentido, um título curto (≤ 5 palavras) com a promessa.
- Corte "olá, pessoal", "hoje eu vou falar sobre", apresentações longas e vinhetas, a menos que a pessoa peça.

## Jump cut (tirar pausas e erros)
- `npm run cortes -- <clipe>` divide a fala em frases e propõe cortes que tiram pausas ≥ 0,5 s, vícios isolados ("é…", "hum", "tipo") e **retomadas** (quando a pessoa recomeça a mesma frase, fica a última versão). É uma sugestão: leia as frases e decida.
- Mantenha um respiro natural. A folga padrão (0,1 s antes, 0,16 s depois) evita cortar consoantes. Para fala muito rápida e "picotada" (estilo TikTok), use `--pausa 0.3`. Para um tom calmo (YouTube, aula), deixe pausas de 0,3–0,5 s.
- Muitos jump cuts seguidos no mesmo enquadramento "pulam". Alterne um `zoom: 1.12` fixo a cada 2–3 cortes (punch-in), que esconde o pulo e dá ritmo.
- Nunca corte no meio de uma palavra nem junte frases que mudam o sentido do que foi dito.

## Takes repetidos
Gravações têm várias tentativas da mesma frase. Use a **última completa** (normalmente a melhor) com `apos` para pular as anteriores: `{clipe: "x", de: "O segredo é", ate: "consistência", apos: 132}`. Se as tentativas estão em arquivos diferentes, compare na galeria ou no `npm run cortes` de cada um.

## Ritmo por plataforma
| destino | duração | ritmo |
|---|---|---|
| Reels / TikTok / Shorts | 15–60 s (o pedido manda) | um corte ou mudança visual a cada 2–4 s. Legenda sempre. Nada parado > 4 s |
| YouTube (16:9) | livre | cortes nos erros e pausas longas, b-roll ilustrando o que é dito, títulos de seção |
| Feed 4:5 / 1:1 | 15–90 s | como Reels, com texto mais contido |

"Mudança visual" pode ser um corte, um punch-in, um b-roll, um texto ou um zoom de ênfase. Não precisa ser sempre corte.

## B-roll
- Ilustra o que está sendo dito **no momento em que é dito**: `em: {fala: "…"}`. Comece no substantivo, não antes.
- 1,5–3 s por inserção. O áudio da fala continua por baixo.
- Bom também para esconder um corte feio, uma piscada ou uma troca de take.
- Sem b-roll adequado no material? A skill `midia-ia-openrouter` gera clipes curtos (Seedance etc.) e imagens; eles caem em `midia-ia/` e o `npm run midia` os encontra.

## Reenquadramento
- Talking head 16:9 → 9:16: `enquadrar: "preencher"` com `foco` no rosto (x da prancha). Se a pessoa anda no quadro, divida em cortes com focos diferentes, ou use `desfocar` no trecho.
- Tela de computador, slide ou duas pessoas lado a lado: `desfocar` (mostra tudo sem faixas pretas) ou `pip` com o rosto no canto.
- Vertical nativo (celular) num 16:9: `desfocar`.
- Confira na prancha do `check` que olhos e boca não ficaram atrás da legenda nem colados na borda. A regra dos terços vale: olhos por volta de 35–40% da altura.

## Transições
- **Corte seco** é o padrão em quase tudo.
- `cruzar` (dissolve): passagem de tempo, clima calmo. `preto`: fim de bloco, antes do CTA. `flash`/`zoom`: energia, virada. `deslizar`/`limpar`: troca de tópico em conteúdo leve.
- Mais de 3–4 transições "de efeito" num vídeo curto cansam. Use o mesmo tipo para o mesmo papel (todas as trocas de tópico iguais).

## Final
- CTA curto (≤ 2 s) e só se a pessoa quiser: "segue para mais", "link na bio". Pode ser um `texto` com `caixa` sobre o último corte.
- `fadeFinal: 0.4–0.8` para não terminar seco, a não ser que o vídeo seja feito para loop (Reels que recomeça).
