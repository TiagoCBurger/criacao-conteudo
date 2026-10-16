# Didática e storyboard

O vídeo existe para que alguém **entenda** uma coisa em menos de um minuto, com o polegar pronto para rolar a tela. Cada decisão visual responde a uma pergunta: isso ajuda a entender, ou só enfeita?

## Índice
1. Princípios (por que o visual ensina)
2. Do roteiro aos beats
3. Catálogo: tipo de ideia → tratamento visual
4. Texto na tela × legenda × narração
5. Gancho, ritmo e fechamento no 9:16
6. Formato do storyboard.md (com exemplo)

---

## 1. Princípios

São os princípios de aprendizagem multimídia (Mayer), traduzidos para motion design:

- **Sinalização.** Destaque o que importa *no instante em que é dito*. Use o marcador que varre a palavra-chave, o número que cresce e o objeto que acende. O espectador olha para onde algo se move: use isso a favor da ideia, não contra.
- **Contiguidade temporal.** A imagem chega junto com a fala (0,1–0,2 s antes, porque o olho precisa chegar antes do ouvido). Nunca depois. Por isso todo tempo é ancorado em palavras com `useCue()`.
- **Contiguidade espacial.** O rótulo fica colado no que ele descreve (Callout, valor na ponta da barra), não numa legenda separada.
- **Coerência.** Tudo o que não ajuda a entender sai: partículas demais, ícones decorativos, três animações ao mesmo tempo. Um vídeo limpo parece caro.
- **Redundância controlada.** A narração já diz a frase. A tela mostra a **ideia** (o número, a palavra-chave, a imagem), não a frase inteira de novo.
- **Segmentação.** Uma ideia por cena. Ideia nova pede cena nova (ou mudança clara de estado na mesma cena).
- **Pré-treino.** Se um termo é central, apresente-o (Eyebrow ou Lettering) antes de usá-lo num diagrama.
- **Concreto antes do abstrato.** Mostre o objeto, o exemplo ou o número primeiro, e depois a regra geral. O 3D é ótimo para tornar concreto o que é abstrato.

## 2. Do roteiro aos beats

1. Leia `timeline.json`: seções, notas do roteirista (`sections[].notes`, que são sugestões visuais da skill de roteiro) e palavras marcadas `em: true` (ênfase do roteirista: forte candidata a destaque visual).
2. Quebre a fala em **beats**. Um beat é uma ideia que dá para resumir numa frase curta. Em vídeo vertical, um beat dura **2–6 s**. Seções longas viram vários beats.
3. Para cada beat, escolha **uma âncora**: as palavras exatas da fala onde ele começa (2–4 palavras, únicas o bastante para não aparecer antes). `beats()` lança erro se a âncora não existir; leia a mensagem, que traz as palavras parecidas.
4. Dentro do beat, liste os **momentos**, ou seja, as palavras que disparam algo (o número aparece em "vinte por cento", o segundo bloco cai em "e depois"). Cada momento vira `useCue("…")`.
5. Escolha o tratamento visual (seção 3) e escreva o storyboard.md **antes** de programar. Mudar uma tabela é barato; mudar cenas prontas não é.

## 3. Catálogo de tratamentos

| A fala é sobre… | Tratamento | Componentes |
|---|---|---|
| **Um número que impressiona** | número gigante contando + o que ele mede embaixo | `Counter` size="hero" + `KineticText` · `Lettering` effect="stack" para números redondos |
| **Proporção** ("3 em cada 10") | grade de ícones que se preenche | `Pictogram` (shape="person" para gente) · `Donut` |
| **Comparação de valores** | barras horizontais com destaque no que importa | `BarChart` (com `highlight`) · `ColumnChart` para 2–4 itens · `Bars3D` para drama |
| **Tendência / evolução** | linha que se desenha, marcador no ponto-chave | `LineChart` com `marks` |
| **Processo / passo a passo** | passos que entram no ritmo da fala, passo atual em foco | `FlowSteps` com `at=[useCue(…), …]` · blocos 3D em fila com `Connector3D` |
| **Camadas / arquitetura / hierarquia** | pilha de blocos 3D explodindo ou montando | `Block` empilhados + `CameraRig` orbitando + `Label3D` |
| **Causa → efeito** | objeto A, seta que se desenha, objeto B reagindo | `Arrow` ou `Connector3D` + mudança de estado (cor/escala/emissive) |
| **A vs B / mito vs fato** | dois lados com ✓/✕, selo "VS" | `Compare` · selo "MITO" com `Reveal preset="pop"` + `Sfx name="error"` |
| **Um conceito abstrato** | metáfora 3D concreta (dinheiro = blocos que crescem; memória = gavetas; rede = orbes ligados) | `Block`, `Orb`, `SvgExtrude` (ícone/logo em 3D), `Connector3D` |
| **Uma definição / termo novo** | termo grande com tratamento tipográfico + rótulo | `Eyebrow` + `Lettering` ou `Text3D` |
| **Lista de itens / requisitos** | itens entrando e sendo "ticados" | `Checklist` com `at` |
| **Uma anatomia / partes de um objeto** | objeto 3D central + rótulos com linha-guia | objeto + `Callout` (posicione com `projectToScreen`) |
| **Uma pergunta / gancho** | pergunta em tipografia cinética, palavra-chave marcada | `KineticText` emphasis="marker" |
| **Conclusão / regra para levar** | frase curta forte, 1 palavra em destaque, respiro | `KineticText` size="h1" + fundo calmo |

Regras práticas:
- **Varie o tratamento** entre beats vizinhos (tipografia → 3D → gráfico → tipografia). Três cenas seguidas de "título + ícone" parecem slide.
- **O 3D aparece quando agrega volume, espaço ou matéria** (camadas, montagem, escala, "olhar por dentro"). Não use 3D só para enfeitar texto.
- **Gráfico com uma mensagem só.** Destaque a barra que importa (`highlight`) e deixe as outras em segundo plano. Use poucos itens: 2–5 barras e 5–12 pontos de linha.
- **Use dados do roteiro.** Não invente número, fonte ou estatística que a narração não diz. Se o roteiro cita uma fonte, ela pode aparecer pequena (`small`, `textMuted`).

## 4. Texto na tela × legenda × narração

O vídeo tem três canais de linguagem, cada um com uma função:
- **Narração:** a explicação completa.
- **Legenda** (`<Captions>`, automática): acessibilidade e quem assiste sem som. Fica na faixa de baixo.
- **Texto na tela:** a **ideia-chave** em poucas palavras (≤ 7 palavras por bloco, 1–2 blocos por cena). É título, rótulo, número.

Quando o texto na tela repete exatamente o que está sendo dito, legenda e título competem. Resolva de uma destas formas:
- (preferido) Escreva o texto na tela como **síntese**, não transcrição. A fala diz "o cérebro consome um quinto de toda a energia do corpo" e a tela mostra "20% da energia".
- Ou esconda a legenda naquele trecho: `<Explainer hideCaptions={[[ini, fim]]} />`. Faça isso só quando o texto grande na tela é literalmente a fala (ex.: a pergunta do gancho).

Composição vertical: título no terço superior, objeto/gráfico no centro e a faixa de legenda livre embaixo (`SafeArea` já reserva esse espaço).

## 5. Gancho, ritmo e fechamento

- **0–1,5 s (gancho):** o primeiro quadro já tem algo visualmente forte (número enorme, objeto 3D, pergunta). Nada de logo ou vinheta de abertura: o vídeo começa no frame 0. A primeira cena não tem transição de entrada.
- **Ritmo:** troque de estado visual a cada 1,5–3 s (nova palavra marcada, novo elemento, movimento de câmera) e de cena a cada 2–6 s. Ritmo vem da fala: se o locutor acelera, as cenas encurtam.
- **Respiro:** depois de um número ou conclusão importante, segure 0,5–1 s sem novos elementos. Mais elementos ali atrapalham a ideia de assentar.
- **Fechamento:** a última frase vira a imagem final (síntese + uma palavra em acento). `beats()` adiciona 1,2 s de cauda após a fala; use para segurar o quadro final, não para enfiar créditos. Se `brand.endCard` for true, a cauda mostra o logo/handle.

## 6. storyboard.md

`npm run new -- <slug>` gera a tabela com as seções do roteiro. Complete-a, uma linha por beat:

```markdown
| # | Cena | Âncora (fala) | Tempo | Ideia (1 frase) | Visual | Texto na tela | Som |
|---|------|---------------|-------|-----------------|--------|---------------|-----|
| 1 | gancho | (início) | 0–2.9s | O "10%" é mito | "10%" lettering stack gigante; selo MITO carimba em "mito" | 10% · MITO | pop em "dez"; error em "mito" |
| 2 | areas | "Exames de imagem" | 2.9–7.5s | O cérebro todo trabalha | grade 3×3 de blocos 3D caindo; pontos de luz acendem em "todas as áreas"; câmera sobe | *Todas* as áreas ficam ativas | thud na queda; sparkle ao acender |
| 3 | energia | "O cérebro pesa" | 7.5–11.9s | Pequeno, mas gasta muito | 2 colunas: 2% (peso) e 20% (energia, destaque) | Pequeno, mas *faminto* | slide em "dois"; ding em "vinte" |
| 4 | fechamento | "Ou seja" | 11.9–16.9s | Usamos tudo, não ao mesmo tempo | "100%" em 3D extrudado; frase final | Você usa o cérebro *inteiro* | success em "inteiro" |
```

Antes de codar, revise a tabela com olho de editor. Existe cena sem mudança visual por mais de 3 s? Dois beats vizinhos com o mesmo tratamento? Algum texto na tela que é transcrição da fala? Algum número sem destaque?
