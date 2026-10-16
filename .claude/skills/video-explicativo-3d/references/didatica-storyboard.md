# Didática e storyboard

O vídeo existe para que alguém **entenda** uma coisa em menos de um minuto, com o polegar pronto para rolar a tela. Cada decisão visual responde a uma pergunta: isso ajuda a entender, ou só enfeita?

## Índice
1. HUD mínimo: uma mensagem por tela
2. Princípios (por que o visual ensina)
3. Do roteiro aos beats
4. Catálogo: tipo de ideia → tratamento visual
5. Texto na tela × legenda × narração
6. Gancho, ritmo e fechamento no 9:16
7. Formato do storyboard.md (com exemplo)

---

## 1. HUD mínimo: uma mensagem por tela

Vídeo explicativo bom parece **simples**: um visual forte e uma frase curta. O erro mais comum é encher a tela de "interface": selo de categoria, título, subtítulo, chips, rótulos, callouts, cards, barra de progresso, assinatura e legenda, tudo junto. Cada elemento a mais rouba atenção da ideia.

Regra por quadro (com `art.hud: "minimal"`, o padrão):
- **1 visual principal**: o objeto 3D, o gráfico ou a tipografia de impacto. É ele que explica.
- **No máximo 1 bloco de texto** além da legenda: um título de ≤ 5 palavras **ou** um número com unidade. Se o visual já diz tudo, nenhum.
- **Legenda discreta** (`captions.style: "minimal"`), na faixa de baixo.
- **Nada fixo na tela**: sem marca d'água, barra de progresso, selo "PASSO 2" ou etiqueta de seção em toda cena. Se a marca exige assinatura, só no fim.

Na prática:
- `Eyebrow`, `Callout`, `Label3D`, `Card`, `IconBadge`, `Checklist` e `Compare` são exceção, não rotina. Use quando o elemento **é** a mensagem (ex.: o nome da parte que está sendo apontada), não como decoração.
- **Gráficos:** sem grade, eixos ou legenda separada. Rotule só o valor que importa, direto no elemento.
- **Comparação de dois valores** (antes × hoje): os rótulos colados às barras **são** o bloco de texto da tela, então nada de título junto. Só número + unidade; o valor em foco grande e no acento, o outro menor e apagado. O contexto ("antes da indústria", "hoje") já está na fala e na legenda: no máximo uma palavra pequena, nunca um sobretítulo em cada barra.
- **Diagramas:** no máximo 3 nós visíveis ao mesmo tempo. O resto entra e sai com a fala.
- **Troque em vez de acumular.** Quando a fala avança, o texto anterior sai (`exitAt`) antes do próximo entrar. Não empilhe uma linha por frase.
- **Uma cor de acento por quadro**, no objeto ou número em foco.
- Com `hud: "balanced"`, pode subir para 2 blocos de texto e rótulos de apoio. Com `"rich"`, a marca pediu densidade (infográfico): mesmo assim, organize em hierarquia clara.

## 2. Princípios

São os princípios de aprendizagem multimídia (Mayer), traduzidos para motion design:

- **Sinalização.** Destaque o que importa *no instante em que é dito*: o objeto acende em acento, o número cresce, a câmera se aproxima. O olho vai para o que se move e para o que brilha. Use isso a favor da ideia.
- **Contiguidade temporal.** A imagem chega junto com a fala (0,1–0,2 s antes, porque o olho precisa chegar antes do ouvido). Por isso todo tempo é ancorado em palavras com `useCue()`.
- **Contiguidade espacial.** O que precisa de rótulo recebe o rótulo colado nele, não numa legenda separada.
- **Coerência.** Tudo o que não ajuda a entender sai. Um vídeo limpo parece caro.
- **Redundância controlada.** A narração já diz a frase. A tela mostra a **ideia** (o número, a palavra-chave, a imagem), não a frase de novo.
- **Segmentação.** Uma ideia por cena. Ideia nova pede cena nova, ou mudança clara de estado na mesma cena.
- **Concreto antes do abstrato.** Mostre o objeto, o exemplo ou o número primeiro, e depois a regra.

## 3. Do roteiro aos beats

1. Leia `timeline.json`: seções, notas do roteirista (`sections[].notes`, sugestões visuais da skill de roteiro) e palavras marcadas `em: true` (ênfase do roteirista, forte candidata a destaque).
2. Quebre a fala em **beats**. Um beat é uma ideia que dá para resumir numa frase curta. Em vídeo vertical, um beat dura **2–6 s**.
3. Para cada beat, escolha **uma âncora**: as palavras exatas da fala onde ele começa (2–4 palavras, únicas naquele trecho). `beats()` lança erro se a âncora não existir; a mensagem traz as palavras parecidas.
4. Dentro do beat, liste os **momentos**: as palavras que disparam algo. Cada momento vira `useCue("…")`.
5. Escolha o tratamento (seção 4) e escreva o storyboard.md **antes** de programar.

## 4. Catálogo de tratamentos

Prefira **volumes e luz** a ícones e cards. Os exemplos valem para as direções cinematic/technical/editorial. No `playful`, os equivalentes "fofos" (personagens toy, dioramas) são aceitáveis.

| A fala é sobre… | Tratamento | Componentes |
|---|---|---|
| **Um número que impressiona** | o número grande e um volume que o encarna (campo de pilares, pilha, escala) | `Counter` hero + `Field` / `Bars3D` / `Block` |
| **Crescimento / tendência** | fita 3D que sobe sobre uma grade, ponta brilhando | `Ribbon` + `floor="grid"` · `LineChart` (2D) |
| **Muitos × um / "um entre muitos"** | campo de elementos idênticos, um acende em acento | `Field` com `highlight` |
| **Proporção** ("3 em cada 10") | grade de elementos que se preenche | `Field` (alturas iguais, highlight) · `Pictogram` |
| **Comparação de valores** | 2–4 volumes lado a lado, o que importa em acento | `Bars3D` (com `highlight`) · `ColumnChart` |
| **Camadas / acumulação / arquitetura** | pilha de lajes montando ou explodindo, câmera orbitando | `Block` empilhados + `CameraRig` |
| **Processo / fluxo** | volumes em sequência ligados por fluxo de luz que avança com a fala | `Block`/`Orb` + `LightBeam` ou `Connector3D` |
| **Causa → efeito** | A emite (feixe/luz), B reage (acende, cresce, muda de cor) | `LightBeam`, `Glow`, troca de `color`/`emissive` |
| **Um sistema/rede** | nós e ligações que acendem em ordem | `Orb` + `Connector3D` + `Spin` |
| **Ciência / fenômeno físico** | o fenômeno encenado com luz: raios, partículas, atmosferas | `LightBeam`, `Glow`, `Atmosphere`, `Particles` |
| **Pessoas / papéis** | figuras abstratas (manequim, sem rosto) em cena mínima | `Character` (look "figure") + `Diorama` sem paredes |
| **Um app / produto digital** | tela simples com a ação acontecendo | `PhoneMock` (uma ação por vez) |
| **Um termo / conceito-chave** | a palavra como objeto: lettering 3D com luz | `Text3D` · `Lettering` |
| **Conclusão / regra para levar** | uma frase curta e um único objeto em repouso | `KineticText` h1 + objeto da cena anterior |

Regras práticas:
- **Continuidade em vez de variedade gratuita.** Um objeto que evolui ao longo de 2–3 cenas (o campo de pilares que vira fita, a pilha que cresce) ensina mais que um tratamento novo a cada corte.
- **O 3D carrega a ideia.** Se a cena funciona só com o texto, o 3D é decoração: repense.
- **Gráfico com uma mensagem só.** 2–5 barras, 5–12 pontos de linha, um destaque.
- **Use dados do roteiro.** Não invente número, fonte, estatística, rótulo explicativo ou CTA que a narração não diz.

## 5. Texto na tela × legenda × narração

- **Narração:** a explicação completa.
- **Legenda** (`<Captions>`): acessibilidade e quem assiste sem som. Discreta, na faixa de baixo.
- **Texto na tela:** a **ideia-chave**, ≤ 5 palavras, 1 bloco por quadro. É título ou número.

Quando o texto na tela é literalmente a fala (a pergunta do gancho, a frase final), esconda a legenda naquele trecho com `<Explainer hideCaptions={[[ini, fim]]} />`. No resto, escreva **síntese**, não transcrição: a fala diz "o cérebro consome um quinto da energia do corpo" e a tela mostra "20%".

Composição vertical: texto no terço superior **ou** inferior (nunca nos dois), visual no centro, faixa da legenda livre. Mantenha o 3D fora da faixa da legenda: enquadre com `frameSafe`, inclusive no fim de cada movimento de câmera.

## 6. Gancho, ritmo e fechamento

- **0–1,5 s (gancho):** o primeiro quadro já tem algo forte (número enorme, objeto 3D em luz). Sem logo nem vinheta. A primeira cena não tem transição de entrada.
- **Ritmo:** troque de estado visual a cada 1,5–3 s (algo acende, cresce ou a câmera anda) e de cena a cada 2–6 s.
- **Respiro:** depois de um número ou conclusão importante, segure 0,5–1 s sem novos elementos.
- **Fechamento:** a última frase vira a imagem final. `beats()` adiciona 1,2 s de cauda: use para segurar o quadro, não para créditos.

## 7. storyboard.md

`npm run new -- <slug>` gera a tabela com as seções do roteiro. Complete-a, uma linha por beat. "Visual" é a coluna mais importante; "Texto na tela" tem no máximo 5 palavras ou fica vazia.

```markdown
| # | Cena | Âncora (fala) | Tempo | Ideia (1 frase) | Visual | Texto na tela | Som |
|---|------|---------------|-------|-----------------|--------|---------------|-----|
| 1 | gancho | (início) | 0–5.2s | R$ 1.000 vira R$ 36 mil | campo de pilares baixos; em "virar" crescem em onda até o fundo; o mais alto acende em acento; câmera sobe | R$ 36 mil (conta) | riser até "trinta e seis mil"; thud no fim |
| 2 | juro | "O segredo se chama" | 5.2–12.5s | O rendimento rende | laje base + lajes cada vez mais grossas caindo em cada "mês"; a última em acento; giro lento | Juro sobre juro. | thud por laje, volume crescente |
| 3 | numeros | "Com mil reais" | 12.5–21.1s | 10 anos vs 30 anos | fita que sobe sobre grade; para em 10 anos (cinza) e dispara até 30 anos (acento) | R$ 3.300 → R$ 36 mil | ding em 10 anos; riser em 30 |
| 4 | tempo | "O ingrediente mais" | 21.1–27.2s | O que importa é o tempo | "tempo" em lettering 3D, luz de recorte; "Comece cedo." | Comece cedo. | boom em "tempo" |
```

Antes de codar, revise com olho de editor:
- Algum quadro tem mais de 1 bloco de texto além da legenda?
- Algum texto na tela é transcrição da fala?
- O 3D de cada cena carrega a ideia, ou só enfeita?
- Existe trecho de mais de 3 s sem mudança de estado?
