# Design system — Placar do Dono (vídeo)

Origem: convertido em 16/10/2026 de `identidade/identidade.md` (cores e famílias literais). O que a identidade não define (direção de arte, 3D, movimento, som) foi derivado do preset `cinematic` da skill `video-explicativo-3d` e está registrado abaixo.
Direção de arte: **cinematic** (luz `dramatic`) — estádio à noite: fundo quase preto, luz de chave dura, recorte âmbar, holofotes frios ao fundo, neblina e poeira no ar. É a tradução direta da metáfora da série (placar de LED de estádio à noite) e dá peso aos números.
HUD: minimal · Meio: 3D (com cenas 2D pontuais para contas e listas)

## Cores (literais da identidade)
- background `#0E1116`: fundo (estádio à noite). backgroundAlt `#12161C` (derivado, +3% de luz).
- surface `#1A1F27`: caixa do placar, prancheta, painéis. surfaceAlt / border `#252C37`: moldura, divisórias, LEDs apagados.
- text `#F4F1EA`: texto principal, giz, papel dos boletos.
- textMuted `#A7ADB8`: rótulos, notas, selo "exemplo".
- primary `#A7ADB8`: volumes 3D neutros (o pedido antes de ser fatiado). A identidade não define "primária"; o cinza do texto suave é o neutro frio da paleta.
- secondary `#4A5361` (derivado, entre superfície 2 e texto suave): detalhes neutros (campo de valor do boleto, presilha), confete "murcho".
- **accent `#FFB020` (âmbar LED)**: números do placar e o número em foco. Um uso por quadro.
- positive `#34D27B` (verde gramado): o que é do dono / virou o jogo (meta 45, setas das jogadas, faixa do "VOCÊ").
- negative `#FF5A4E` (coral boleto): custos e boletos (fatias de custo, faixa dos boletos, R$ 22 mil, carimbo "SÓ PRA EMPATAR").
- glow `#8FA6C8` (derivado): luz fria dos holofotes e brilho do fundo, em intensidade baixa (background.glow 0.16). Dá o "holofote frio" pedido pela identidade sem virar uma cor de UI.
- data: neutro, âmbar, coral, verde (nessa ordem).

Nada de gradiente arco-íris: o fundo é radial discreto, com grão (0.06) e vinheta (0.55).

## Tipografia
- display **Anton 400** (OFL, Google Fonts, arquivo local `fonts/Anton-400.ttf`), sempre em caixa alta (`textTransform: uppercase`), tracking +0.01em: números grandes, títulos de até ~5 palavras, e a matriz de LED do placar (o painel é rasterizado a partir desta mesma fonte).
- body **Inter 600** (+ arquivo 800): legenda e rótulos curtos. accent = **Inter 800**: apoio com mais peso quando necessário.
- Escala (px em 1080 de largura): hero 280 · h1 150 · h2 104 · h3 68 · body 46 · small 36 · label 30. Anton é condensada, por isso a escala é maior que o padrão.
- Números de placar: Anton em âmbar, desenhada como pontos de LED com brilho (3D: textura de matriz de pontos; 2D: máscara de pontos + desfoque por baixo).

## 3D
- Material **matte** (roughness 0.78): a identidade pede "materiais foscos"; metal ficaria "tecnologia", não estádio.
- Luz **dramatic** (chave direcional dura, pouco preenchimento, recorte âmbar), exposição 1.0. O preset cinematic usa `noir` (cone de luz de cima), mas ele foi feito para metal: testado com material fosco, o cone estourava as faces de cima e o âmbar virava amarelo-pálido e o coral, salmão (testes em 16/10, exposição 1.1 e 0.7). Com `dramatic` as cores da marca ficam fiéis. O "holofote" do estádio vem das torres de luz fria ao fundo nas cenas do placar (luz `glow`) e da poeira no ar.
- Neblina relativa {near 1.05, far 2.4}; fov 26 (lente longa); geometria `sharp`; sombras ligadas.
- Câmera: contra-plongée leve no placar (ele "olha de cima" para o dono), push-in lento; vista alta 3/4 para o pedido fatiado; 3/4 baixo para a fila de boletos.
- Objetos da série (em `estudio-video/src/videos/57-pedidos/`, reutilizáveis): `Scoreboard` + `Stadium` (led.tsx), `SlicedOrder` (pedido.tsx), `Boleto`/`BoletoLineup`/`PitchLines` (boletos.tsx), `Confetti` (confete.tsx), `LedType`/`LedPanel`/`Prancheta`/`SeloExemplo` (placar2d.tsx). Se virarem padrão da série, mover para uma pasta compartilhada do estúdio.

## Movimento
- personality **confident**: easing standard [0.45,0,0.55,1], entrada [0.16,1,0.3,1], saída [0.7,0,0.84,0]; molas enter (200/100), pop (damping 18, sem quique de desenho animado), soft.
- Transição entre cenas: **blur 0.5 s** (uma família só). Deriva de câmera 0.35.
- Números contam (placar subindo, 1.709, meta descendo); objetos grandes entram com mola amortecida.

## Som
- Paleta **crisp** (transientes limpos, pouco reverb): combina com placar eletrônico e não briga com a voz. sfxGain 0.3; transição `whoosh-soft`. Sem trilha (nenhuma fornecida).

## Regras
- Um número protagonista por tela; no máximo 1 bloco de texto além da legenda.
- Âmbar só no que está em foco; verde e coral só para ganho × custo.
- Selo **"exemplo"** (label, texto suave, contorno fino) no canto superior esquerdo sempre que aparecem números ilustrativos de entrada (ticket, margem, custo fixo, conta, jogadas). É a única peça "fixa" permitida, por regra da identidade.
- Legenda `minimal` em Inter 600, 54 px, na base; escondida quando o texto na tela é a própria fala.
- Sem marca d'água (`brand.watermark: none`).

## Substituições / pendências
- Nenhuma fonte substituída: Anton e Inter baixadas do Google Fonts (OFL) para `fonts/`.
- Assinatura `[@PREENCHER]` da identidade não foi aplicada (perfil ainda não definido). Quando houver, preencher `brand.handle` e decidir se entra só no fim.
- `glow`, `secondary` e `backgroundAlt` são derivados (não estão na identidade): confirmar com o dono da marca.
