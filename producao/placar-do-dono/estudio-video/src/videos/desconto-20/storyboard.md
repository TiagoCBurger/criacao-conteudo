# Storyboard — desconto-20

Narração: ElevenLabs (eleven-v4, voz "liam"), 44,1 s · 126 palavras · alinhamento Scribe v2 · roteiro × fala 94%.
Todo tempo vem de `useCue`/`tl.at` (inclusive legendas escondidas e janelas do selo "exemplo").

Mesmo vocabulário do 57-pedidos (componentes em `src/serie-placar/`): placar de LED 3D, tipografia de placar, prancheta de giz, selo "exemplo", b-roll gradeado. Objeto contínuo do miolo: **a barra do preço** (2D, vertical: o 9:16 é alto e cada fatia recebe rótulo ao lado), que nasce inteira, é fatiada, ganha uma gêmea com desconto e termina reduzida às duas "sobras".

Números (kit, seção 2): R$ 38 · insumo e embalagem R$ 14,70 · app R$ 9,50 · imposto R$ 2,28 · sobra R$ 11,52 · com 20% off R$ 30,40 · sobra R$ 6,28 · −45% · 11,52 ÷ 6,28 = 1,83 · PRECISA 183 × ANTES 100 · 100 = 55 · 45 de graça. Na barra com desconto, app e imposto são desenhados na proporção certa (25% e 6% de R$ 30,40, regra do kit), **sem rótulo de valor** (o kit não traz esses dois valores escritos).

| # | Cena | Âncora (fala) | Tempo | Ideia | Visual | Texto na tela | Som |
|---|------|---------------|-------|-------|--------|---------------|-----|
| 1 | gancho | (início) | 0–6.2s | Desconto de 20% = precisar vender quase o dobro | Placar de LED 3D no alto: VOCÊ 0 × 20% (rótulo DESCONTO, faixa coral); o "20%" acende em "vinte por cento". Embaixo, b-roll `v2-caixa` (lanche na caixa, queijo escorrendo), gradeado; apaga antes de "quase o dobro" | QUASE O *DOBRO* (legenda escondida) | riser curto + thud no 20%; pop no "dobro" |
| 2 | o-lanche | "Um lanche de" | 6.2–13.2s | De R$ 38, sobram R$ 11,52 | Barra vertical R$ 38 (cinza). Uma fatia por palavra vira coral com rótulo ao lado: insumo e embalagem R$ 14,70 · app R$ 9,50 · imposto R$ 2,28; em "sobram" o topo acende em verde: sobra R$ 11,52 | R$ 38 no topo da barra; rótulos colados às fatias · selo | pop; swish por fatia (volume decrescente); ding no verde |
| 3 | com-desconto | "Com vinte por cento off" | 13.2–16.2s | O preço cai para R$ 30,40… | A barra de R$ 38 vai para a esquerda e apaga; ao lado nasce a de R$ 30,40, com o bloco de insumo e embalagem **do mesmo tamanho** (linha tracejada liga os dois topos) | R$ 38 (apagado) · R$ 30,40 | slide; tick |
| 4 | insumo | "Mas o insumo" | 16.2–19.3s | …mas o custo do lanche não cai | B-roll `v2-corte` em tela cheia (faca corta o lanche, luva), gradeado, zoom lento | R$ 14,70 + "insumo e embalagem: mesmo custo" | whoosh de entrada (transição); thud no número |
| 5 | quanto-sobra | "Sobram seis" | 19.3–24.0s | A sobra caiu 45% | Duas barras verdes: R$ 11,52 (antes, apagada) × R$ 6,28; o pedaço que falta vira contorno coral com −45% | rótulos nas barras + −45% | pop no 6,28; error suave no −45% |
| 6 | a-conta | "Pra ganhar o mesmo" | 24.0–28.5s | Precisa de 83% mais pedidos | Placar 3D: linha de cima "11,52 ÷ 6,28 = 1,83" → "+83% PEDIDOS"; PRECISA × ANTES: 100 × 100 → 183 × 100 | — (o placar) | ticks na contagem; thud no 183 |
| 7 | a-piada | "Vendeu cem lanches" | 28.5–35.6s | 100 com desconto = 55 sem; 45 de graça | Campo 3D de 100 hambúrgueres estilizados (10×10, câmera 3/4 baixa: pão dourado e carne em tons apagados); em "quarenta e cinco" 45 deles ficam coral e afundam | 100 lanches → = 55 sem desconto → 45 de graça (coral) · selo | pop na entrada; thud; error no 45 |
| 8 | a-virada | "Antes da próxima" | 35.6–41.1s | Antes de promover: objetivo, prazo, conta feita — ou combo | Prancheta de giz: checklist que se risca com a fala (OBJETIVO ✓ PRAZO ✓ CONTA FEITA ✓); "OU" e a jogada COMBO com seta verde | a checklist (a prancheta é o visual) | click por item; swish na jogada |
| 9 | cta | "Comenta PLACAR" | 41.1–45.3s | Comenta PLACAR | Placar 3D VOCÊ 0 × ?? BOLETOS piscando, igual ao 57-pedidos (assinatura da série) | COMENTA *PLACAR* (legenda escondida) | pop; sparkle |

Selo "exemplo": cenas 2–7. Sem trilha (só SFX do design system).

## Conferência (registro)
- Rodada 1 (prancha a cada 1 s, zonas seguras): "20%" largo demais no placar (cobria o "×" e cortava o "%") → fonte menor; "R$ 30,40" quebrava em 2 linhas → sem quebra; valores dentro das barras de sobra quebravam e o texto escuro sobre o verde apagado não tinha contraste → h3, texto claro na barra apagada; "−45%" vazava do contorno → h2; frase do insumo encostava no pão claro → topo do b-roll escurecido; hambúrgueres cinza vistos de cima pareciam botões → pão e carne em tons apagados derivados da paleta e câmera mais baixa; "COMBO" aparecia 0,3 s antes do corte → escrito já em "Ou troca"; prancheta abria vazia → cabeçalho "ANTES DA PROMOÇÃO"; último quadro vazio (arredondamento do template) → duração em quadro inteiro.
- Rodada 2 (quadros das cenas alteradas + último quadro): torre de luz atrás do selo "exemplo" no placar PRECISA × ANTES → torres deslocadas para a direita. Aprovado.
