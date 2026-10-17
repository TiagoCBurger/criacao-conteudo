# Storyboard — leilao-de-anuncios

## Como finalizar (sessão com `OPENROUTER_API_KEY`)
```bash
cd estudio-video
npm install                      # contêiner novo
npm run ia:setup                 # TripoSR + Depth Anything locais (~5 min na 1ª vez)
npm run ia -- leilao-de-anuncios --script ../roteiros/leilao-de-anuncios.md   # voz + imagens + 3D + relevo + timeline + trilha
.ia/venv/bin/python scripts/ia/previa-3d.py public/videos/leilao-de-anuncios/ia/3d/*.glb --out out/previa-3d.png
npm run typecheck && npm run check -- leilao-de-anuncios   # conferir: martelo (pose do golpe), joia, placas, salão 2.5D
npm run render -- leilao-de-anuncios
```
O `timeline.json` versionado hoje vem de uma narração **provisória** (Piper, local), usada só para montar e conferir as cenas. O `npm run ia` o substitui pela narração do OpenRouter.

Narração: OpenRouter (`openai/gpt-audio`, voz `cedar`) gerada por `npm run ia`. Os tempos abaixo vêm da narração **provisória** local (Piper, 53,2 s) e só servem de referência: as cenas são ancoradas em palavras (`useCue`), então acompanham a voz final sozinhas.

Ativos de IA (`src/videos/leilao-de-anuncios/ia.json` → `public/videos/leilao-de-anuncios/ia/`):
- `salao`: imagem 9:16 gerada (Nano Banana Pro) + profundidade (Depth Anything V2) → **cenário 2.5D** com paralaxe (`<Relevo>`), usado no gancho e no fechamento.
- `martelo`, `moeda`, `joia`, `placa`: imagens geradas → **modelos 3D** (TripoSR) com o material do design system (`<GenModel>`).
- `trilha.mp3`: trilha original (Lyria 3), com a duração exata do vídeo e acentos alinhados às seções. O impacto grave do gancho cai junto com o martelo, e o fechamento termina numa batida final. A direção musical fica em `ia.json → music`.
- Se algum ativo faltar, a cena usa geometria própria (fallback) e o vídeo continua renderizando.

| # | Cena | Âncora (fala) | Tempo | Ideia (1 frase) | Visual | Texto na tela | Som |
|---|------|---------------|-------|-----------------|--------|---------------|-----|
| 1 | gancho | (início) | 0–6,9 s | Cada busca dispara um leilão | salão 2.5D escuro, push-in com paralaxe; barra de busca digitando; em "leilão" o martelo 3D bate no bloco, com clarão âmbar; em "página carregar" uma linha âmbar varre a tela | busca "tênis de corrida" → linha de carregamento → "Quem paga mais / *nem sempre* ganha." | typing; riser → boom no golpe; swish na linha |
| 2 | a-disputa | "Cada anunciante dá" | 6,9–13,8 s | Todos dão lances, mas não é só dinheiro | 3 placas de lance 3D sobem em arco; em "lance" uma moeda pousa sobre cada uma (âmbar); em "não olha só" as moedas apagam; em "qualidade" a joia 3D sobe ao centro e acende | "Lance × *Qualidade*" (em "combina o lance") | thud por placa; pop nas moedas; sparkle na joia |
| 3 | qualidade | "E qualidade aqui" | 13,8–21,2 s | Qualidade = 3 sinais | joia grande girando sob o cone de luz; 3 feixes chegam nela, um por critério, e ela acende mais a cada um | troca: "CTR esperada" → "Relevância do anúncio" → "Experiência na página" | tick/ding por feixe |
| 4 | o-exemplo | "Num exemplo simplificado" | 21,2–35,5 s | Lance × nota decide a posição | dois pedestais (Ana × Bruno); moeda e joia pousam na frente de cada um, no tamanho do lance e da nota; colunas crescem até 40 e 24; em "primeiro" a da Ana acende em âmbar e a do Bruno apaga | "exemplo simplificado" → nomes; "R$ 4 × 10" / "R$ 8 × 3" e os números 40 / 24 colados às colunas | pop nos objetos; slide nas colunas; success em "primeiro" |
| 5 | o-preco | "E ela nem paga" | 35,5–41,8 s | Ela paga só o mínimo para vencer | close na moeda 3D girando; ela encolhe enquanto o número desce de R$ 4,00 para R$ 2,41 | contador R$ 4,00 → **R$ 2,41** | tick no contador; ding no valor final |
| 6 | na-meta | "No Instagram e no Facebook" | 41,8–48,3 s | Na Meta, a lógica é parecida | celular 3D no centro; moeda, orbe de "ação" e joia orbitam e acendem um por vez | "Mesma lógica." → "Lance + ação + qualidade" | pop por ingrediente |
| 7 | fechamento | "Moral do leilão" | 48,3–fim | Relevância vale dinheiro | volta ao salão 2.5D, mais aceso; a joia em repouso na luz; o martelo bate de novo em "dinheiro" | "Relevância / vale *dinheiro*." → "Melhore o anúncio." | riser → boom no golpe final; swell no fim |

Revisão de editor:
- 1 bloco de texto por quadro: a busca, a linha e a frase do gancho se substituem (exitAt), sem acumular.
- O texto na tela é síntese: na cena 3, os nomes oficiais dos três componentes (o que a fala explica em palavras simples).
- O 3D carrega a ideia: placas = anunciantes, moeda = lance, joia = qualidade, coluna = posição, martelo = leilão.
- A cena 4 é longa (14 s), por isso tem uma mudança de estado a cada 1,5–2,5 s (objeto pousa, coluna cresce, cor troca).
- Legenda escondida onde o texto na tela é a fala (frase do gancho e fechamento).
