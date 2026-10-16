# Animação de alta qualidade

O que separa um motion "profissional" de um slide animado é **intenção em cada movimento**: tudo entra por um motivo, com peso, na hora certa. Depois, tudo assenta.

## Princípios

1. **Nada é linear.** Entradas desaceleram (ease-out / mola amortecida) e saídas aceleram (ease-in). O design system já define as curvas e molas. Use `useEnter`, `useTween` e `useExit` em vez de `interpolate` cru.
2. **Sobreposição e escalonamento.** Elementos de um grupo entram com `stagger` (40–90 ms), nunca juntos e nunca um por vez com pausa morta. O segundo começa antes de o primeiro terminar.
3. **Hierarquia temporal.** Primeiro o elemento principal (título, objeto), depois os de apoio (rótulos, detalhes) e por último o destaque (marcador, número final). O olho segue a ordem de entrada.
4. **Antecipação e assentamento.** Objetos que "caem" esmagam um pouco ao pousar (`enter="drop"`). Números dão um "pop" ao terminar de contar. Pequeno, físico, crível.
5. **Sempre algo vivo, nada agitado.** Quadro 100% parado por mais de ~1,5 s parece travado. Para manter vivo use a deriva de câmera (`cameraDrift`), a flutuação sutil (`float`), o brilho do fundo e as partículas. Mas só **um** movimento principal por vez disputa a atenção.
6. **Movimento ensina.** Crescer = aumentar; acender = ativar; ligar com linha = causa; separar = comparar; empilhar = compor. Escolha o verbo visual que a fala está dizendo.
7. **Saídas também são design.** O `Explainer` cuida da transição entre cenas. Dentro de uma cena, ao trocar de estado (um título dá lugar a um gráfico), use `exitAt` no que sai, 0,1–0,2 s antes do que entra.
8. **Continuidade.** O fundo não troca entre cenas. Quando duas cenas falam do mesmo objeto, mantenha o objeto (mesma cor, mesma forma) e mude a câmera ou o estado, como num match cut. Use a camada `under` do Explainer para um objeto 3D que atravessa várias cenas.

## Tempos de referência (30 fps)

| Coisa | Duração |
|---|---|
| entrada de texto/ícone | 0,35–0,6 s (`duration.base`) |
| entrada de objeto 3D grande | 0,6–1,0 s |
| stagger entre palavras/itens | 0,04–0,09 s |
| gráfico crescendo / contador | 0,8–1,6 s |
| transição entre cenas | 0,35–0,6 s |
| movimento de câmera | 1,5–4 s (lento = cinematográfico; rápido = só em virada de cena) |
| tempo de leitura mínimo | 0,25 s por palavra + 0,5 s (um título de 6 palavras precisa de ~2 s visível) |
| respiro após revelação importante | 0,5–1 s sem elementos novos |

## Tipografia cinética e lettering

- **Uma frase-chave por vez**, em `display`, curta (≤ 7 palavras), quebrada em 2–3 linhas de comprimento parecido. Quebre por sentido, não pelo limite da caixa: "Pequeno, mas / *faminto*".
- **Ênfase em 1 palavra** (no máx. 2) por frase, sincronizada com a fala. O marcador (`emphasis="marker"`) varre logo depois de a palavra entrar.
- **Números são heróis.** Use `Counter` ou `Lettering` em `hero`, unidade menor ao lado ou embaixo, e a cor `accent` só no número.
- **Lettering** (`Lettering`, `Text3D`) é para momentos de impacto: o gancho, o conceito central, a conclusão. Usado a toda hora, perde força. Em um vídeo de 40 s, 1–3 momentos.
- **Contraste de escala:** combine um elemento muito grande com outro pequeno. Tudo médio = nada se destaca.
- **Alinhamento:** centralizado é o padrão do vertical. Alinhar à esquerda funciona em listas e passos (`FlowSteps`, `Checklist`).
- **Legibilidade:** nada de texto sobre área clara de objeto 3D sem contraste. Afaste, troque a cor ou ponha o texto num `Card`.

## Câmera 3D

- **Push-in** (aproximar devagar): foco e importância. `position` de z=10 para z=8 em 3 s.
- **Órbita parcial** (girar 15–35° ao redor): revela volume e dá sensação de "tour". Use em pilhas e arquiteturas.
- **Reveal** (subir/afastar mostrando o todo): "e no conjunto…".
- **Tilt de cima** (câmera alta olhando para baixo, ~35°): ótimo para grades, mapas e fluxos no chão.
- Evite movimentos de câmera simultâneos a muitas entradas: escolha qual dos dois conduz o olhar.

## Contenção (o que separa "premium" de "fofo")

- **Menos e mais lento.** Um movimento principal por vez, com tempo para o olho acompanhar. Lentidão controlada passa segurança; muitos elementos rápidos passam ansiedade.
- **Molas amortecidas** em tudo que é grande. Overshoot só em detalhes pequenos e, mesmo assim, discreto (`spring.pop.damping ≥ 14` fora do playful).
- **A câmera é o movimento.** Em vez de animar dez objetos, mova a câmera devagar sobre uma cena quase parada (push-in, órbita curta, subida). É o recurso mais "cinema" que existe.
- **Luz como animação.** Acender um objeto (`emissive`, `Glow`) ou passar um feixe (`LightBeam`) é mais elegante que fazê-lo pular.
- **Saídas limpas.** Quando o texto troca, o anterior sai antes. Não deixe resíduo na tela.

## Anti-padrões (parece amador)

- Tudo entrando com o mesmo fade, ao mesmo tempo.
- Rotação 360° gratuita, bounce exagerado em elementos grandes, zoom pulsando.
- Texto que some antes de dar tempo de ler, ou que fica 6 s parado.
- Transição chamativa diferente a cada corte. Use uma família só (a do design system) e varie no máximo em 1–2 viradas importantes.
- Elementos encostados nas bordas ou dentro das zonas de interface do app.
- Cor de acento espalhada em tudo (perde o papel de sinalizar).
- 3D decorativo que não diz nada sobre o assunto.
- Formas arredondadas, cores vivas e bonecos com olhos fora de uma marca lúdica: o vídeo fica infantil.
- HUD carregado: selo + título + subtítulo + chips + rótulos + legenda ao mesmo tempo.
