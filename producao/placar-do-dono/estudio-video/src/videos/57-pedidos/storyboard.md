# Storyboard — 57-pedidos

Duração da narração: 45.1 s (+1.2 s de cauda) · 133 palavras · fonte do tempo: openai-whisper (alinhamento fornecido) · roteiro × fala: 100%

Narração PROVISÓRIA (voz sintética). Todo tempo vem de `useCue`/`tl.at` (inclusive `hideCaptions` e as janelas do selo "exemplo"), para o vídeo sobreviver à regravação: basta rodar `npm run timeline` com o novo áudio e renderizar de novo.

Objeto recorrente: **o placar de LED 3D** (matriz de pontos desenhada a partir da fonte Anton, âmbar com brilho). Ele abre, volta no meio (dia bom), na virada (meta 45) e fecha (CTA). Entre as aparições, tratamentos diferentes: pedido 3D fatiado, fila de boletos 3D, conta em tipografia de placar (2D), prancheta de giz (2D).

| # | Cena | Âncora (fala) | Tempo | Ideia (1 frase) | Visual | Texto na tela | Som |
|---|------|---------------|-------|-----------------|--------|---------------|-----|
| 1 | gancho | (início) | 0–5.4s | Você começa o dia perdendo de 57 a 0 | Placar de LED 3D num estádio à noite (holofotes frios ao fundo, neblina, poeira no ar). Já no 1º quadro: "1º TEMPO · VOCÊ 0 × 0 BOLETOS". O placar dos boletos sobe sozinho enquanto a voz fala e crava **57** em "cinquenta e sete" (flash âmbar). Câmera em contra-plongée, push-in lento | — (o placar é o texto) | riser até "cinquenta e sete"; boom no pouso do 57 (baixo, depois da palavra) |
| 2 | quanto-sobra | "Pega um pedido" | 5.4–12.6s | De R$ 46, sobram R$ 12,88 | Pedido 3D = disco cinza fosco. Em "quarenta e seis reais" entra o número. Em "insumo / embalagem / app / imposto" uma fatia por vez se solta, fica coral e afunda para fora. Em "sobram" a fatia fina (28%) sobe e acende em âmbar. Câmera alta 3/4 orbitando devagar | R$ 46 → R$ 12,88 (+ "28% do pedido" pequeno) · selo "exemplo" | pop no R$ 46; swish por fatia (volume decrescente); sparkle quando a fatia acende |
| 3 | os-boletos | "E isso nem" | 12.6–18.2s | Antes de lucrar, paga R$ 22 mil de fixo | Gramado escuro com linhas de giz; 5 boletos 3D (papel off-white, faixa coral, campos, código de barras) saem da neblina pela direita, caminhando, e se perfilam lado a lado como time adversário. Em "vinte e dois mil" as faixas coral acendem | R$ 22 MIL / custo fixo por mês · selo "exemplo" | thud suave a cada boleto que para (1º e último mais fortes); thud grave no R$ 22 mil |
| 4 | a-conta | "Vinte e dois mil divididos" | 18.2–27.0s | 22.000 ÷ 12,88 = 1.709/mês → ÷ 30 = 57/dia | Conta montada em tipografia de placar (Anton, LED âmbar com brilho, painel de pontos ao fundo). Linhas entram com a fala e a fita sobe: 22.000 → ÷ 12,88 → = 1.709 /mês → ÷ 30 dias → **57 /dia** gigante. Carimbo "SÓ PRA EMPATAR" | a própria conta (1 bloco) · selo "exemplo" | tick por linha; ding no 1.709; thud + sparkle no 57; click no carimbo |
| 5 | o-dia-bom | "Aquele dia de" | 27.0–32.7s | O dia "bom" de 40 pedidos ainda é derrota | Placar 3D volta: VOCÊ sobe de 0 a 40, confete cai na comemoração; em "Perdeu" o confete perde a cor e cai murcho, o 40 apaga e o 57 pisca | — (placar 40 × 57) | pop + sparkle no confete; reverse/erro no "Perdeu" |
| 6 | a-virada | "Pra virar o" | 32.7–38.8s | Três jogadas viram o jogo | Prancheta de técnico (giz branco sobre placa escura, linhas de campo apagadas). Cada jogada é riscada com a fala: seta de giz verde + TICKET R$ 50 · MARGEM 30% · FIXO R$ 20 MIL | as 3 jogadas (a prancheta é o visual) · selo "exemplo" | swish/click por jogada |
| 7 | meta-45 | "Juntos a meta" | 38.8–41.5s | A meta cai de 57 para 45 | Placar 3D "META POR DIA": 57 rola para baixo até 45 e o 45 acende em verde (virou o jogo) | — (placar) | tick rápido na rolagem; success no 45 |
| 8 | cta | "Comenta PLACAR" | 41.5–46.3s | Comenta PLACAR e receba a planilha | Placar 3D "VOCÊ 0 × ?? BOLETOS", o ?? piscando; câmera aproxima devagar | COMENTA *PLACAR* (legenda escondida enquanto a frase é dita) | pop na entrada; sparkle no PLACAR |

## Revisão de editor (antes de codar)
- Mais de 1 bloco de texto além da legenda? Só o selo "exemplo" (pedido do cliente e regra da identidade), pequeno, fixo no canto superior esquerdo nas cenas com números de entrada (2–4 e 6), como o selo "SIMULAÇÃO" de transmissão.
- Texto que transcreve a fala? "SÓ PRA EMPATAR" e "COMENTA PLACAR" — nesses trechos a legenda é escondida (intervalos calculados por `tl.at`).
- O 3D carrega a ideia? Placar = metáfora da série (o placar É a informação); pedido fatiado = "quanto sobra"; fila de boletos = "time adversário". Conta e prancheta ficam em 2D de propósito (variação de ritmo e leitura de números).
- Trecho > 3 s sem mudança de estado? Cena 2 tem mudança a cada 0,3–2 s; cena 3 tem boletos entrando de 12,7 a 15,5 s e o número em 15,7 s; cena 4 muda a cada 0,6–2 s.

## Fidelidade dos números
Só os números do kit: R$ 46, 28%, R$ 12,88, R$ 22 mil, 22.000 ÷ 12,88 = 1.709/mês, ÷ 30 dias = 57/dia, 40 × 57, ticket R$ 50, margem 30%, fixo R$ 20 mil, meta 45. As 4 fatias de custo do pedido (insumo, embalagem, app, imposto) são desenhadas iguais e sem valor: o kit não dá a divisão dos 72%, então nenhuma porcentagem é mostrada nelas.

## Conferência (registro)
- Rodada 1 (prancha a cada 1 s): contagem do gancho adiantada (56 antes da palavra) → curva acelerando, 57 cai na palavra; luz `noir` estourava âmbar/coral no material fosco → design system passou para luz `dramatic` (testadas exposição 0.7 e `dramatic`); fatias saindo invadiam a coluna de botões → saída contida e com fade; fila de boletos alinhada com a câmera (parecia baralho) → fila de lado; "÷" em LED lia como "+" → operador sólido; confete pequeno → maior; "R$ 20 MIL" cobria "FIXO" → rótulo em cima, valor embaixo; placar entrava na zona direita no fim do push-in → enquadramento mais contido.
- Rodada 2 (prancha a cada 1 s): boletos pequenos → mais altos; rótulo e valor da prancheta encostados → mais respiro; lâmpadas do estádio atrás de "COMENTA PLACAR" → cena final sem torres de luz.
- Rodada 3 (quadros das cenas alteradas, com zonas seguras): aprovado.
