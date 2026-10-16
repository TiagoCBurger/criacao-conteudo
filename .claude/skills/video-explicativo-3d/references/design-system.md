# Design system para vídeo

A skill não tem identidade visual própria. Toda cor, fonte, material 3D, luz, ritmo de animação e paleta sonora vem de **`design-system/tokens.json`** do projeto. Isso garante que todos os vídeos de um canal pareçam da mesma série, e que trocar a identidade seja editar um arquivo, não reescrever cenas.

## Índice
1. Onde fica e como o estúdio lê
2. Procedimento: encontrar → converter → criar
3. Direção de arte (a decisão mais importante)
4. Esquema dos tokens (campo a campo)
5. Derivando o que a marca não define
6. DESIGN.md (registro de decisões)
7. Validar e aprovar

---

## 1. Onde fica e como o estúdio lê

```
<projeto>/
├── design-system/            ← fonte da verdade (versionada)
│   ├── tokens.json
│   ├── DESIGN.md             ← por que cada escolha; regras de uso
│   ├── fonts/*.ttf           ← arquivos locais (TTF/OTF servem para 2D e 3D)
│   ├── logos/*.svg|png
│   └── sons/*.wav            ← opcional: sons da marca (sound.library)
└── estudio-video/
    ├── studio.config.json    ← {"designSystem": "../design-system"}
    └── public/ds/            ← CÓPIA gerada por `npm run ds:sync` (não editar)
```

`npm run ds:sync` (roda sozinho antes de check/render) valida os tokens, copia a pasta para `public/ds/` e gera a biblioteca de efeitos na paleta `sound.palette`. Se o projeto guarda o design system em outro lugar, aponte `studio.config.json` para lá em vez de duplicar.

Nas cenas, estilo **sempre** passa pelos helpers: `c("primary")`, `alpha("text", .5)`, `type("display", "h1")`, `radius("md")`, `<ThemedMaterial color="accent"/>`. Um hex ou `fontFamily` escrito à mão numa cena é um bug: some na próxima troca de identidade. Se uma cena precisa de algo que o design system não tem (uma cor nova para uma série de dados, um peso de fonte), **adicione aos tokens** e registre no DESIGN.md.

## 2. Procedimento

Faça nesta ordem e pare no primeiro que resolver:

**A. Já existe `design-system/tokens.json`** (ou o caminho em `studio.config.json`)
→ `npm run ds:check`. Se passar, use. Se faltar algo específico de vídeo (`art`, `three`, `sound`), complete seguindo as seções 3 e 5 e registre no DESIGN.md. Não "melhore" cores ou fontes existentes: identidade é decisão do dono. A única exceção é contraste ilegível: nesse caso, avise e proponha, não troque por conta própria.

**B. Existe identidade em outro formato.** Procure antes de criar:
- `design-system/`, `brand/`, `marca/`, `identidade/`, `styleguide/`, `tokens/` (JSON de tokens, Style Dictionary, Figma Tokens)
- CSS com variáveis (`:root { --color-primary: … }`), `tailwind.config.*` (theme.colors, fontFamily), `theme.ts`
- Guias em PDF/MD (manual da marca), `CLAUDE.md`, ou outra skill de identidade visual instalada
- Decks/HTML já produzidos para o mesmo cliente

→ **Converta** para `tokens.json` preservando os valores literais (hex exatos, famílias exatas). Mapeamento típico:

| Origem | Token |
|---|---|
| cor de fundo da marca / `--bg` / `background` | `color.background` (+ `backgroundAlt` 4–8% mais clara/escura) |
| cards, painéis / `--surface`, `--card` | `color.surface` |
| cor principal / `--primary` / `brand.500` | `color.primary` |
| secundária | `color.secondary` |
| cor de destaque/CTA / `--accent` | `color.accent` (ênfases, objeto em foco, legenda ativa) |
| sucesso / erro | `color.positive` / `color.negative` |
| fonte de títulos / headings | `typography.display` |
| fonte de texto | `typography.body` |
| gradiente da marca | `color.gradient` + `background.style: "gradient"` |
| logo | `brand.logo` / `brand.logoOnDark` (copie o arquivo para `design-system/logos/`) |

Depois de converter as cores e fontes, **escolha a direção de arte** (seção 3) que melhor traduz a marca para vídeo.

Fontes do Google: `node scripts/fetch-font.mjs "Nome da Família" 400,700` baixa TTF para `design-system/fonts/` e imprime o trecho de `files`. Fontes proprietárias: peça os arquivos (TTF/OTF) ao usuário. Sem eles, avise e use a alternativa livre mais próxima, registrando a substituição no DESIGN.md.

**C. Não existe nada.** Crie um design system.
1. Se o usuário está disponível, faça no máximo 3 perguntas curtas: público e tom, cores ou referências que devem aparecer (ou evitar), e se há logo. Se não está disponível, ou disse para seguir, decida pelo tema e pelo canal, e explique as escolhas no resumo final.
2. **Comece pela direção de arte** (seção 3). Copie o preset de `assets/direcoes/<direção>.json` (traz `art`, `three`, `motion`, `background`, `captions`, `sound` coerentes). Depois defina cores e fontes da marca por cima.
3. Parta de `assets/design-system-exemplo/tokens.json` **apenas como formato**. As cores e fontes dele são placeholders.
4. Escolha com intenção:
   - **Paleta contida:** fundo, 1 cor principal neutra para volumes e **1 acento** forte que só aparece no que importa (o objeto em foco, o número-chave). Muitas cores vivas ao mesmo tempo empurram para o "infantil".
   - **Fundo:** escuro para cinematográfico e técnico (profundidade e luz). Claro, tipo papel, para editorial.
   - **Display:** grotesca forte (700–900) ou, no editorial, uma serifa de display. **Body:** sans legível em 500. **Mono** no técnico, para rótulos e números pequenos.
   - **Paleta de dados (`color.data`):** 3–5 cores, a primeira neutra e o acento como destaque.
5. Salve os arquivos, escreva o DESIGN.md e valide (seção 7).

## 3. Direção de arte

A direção de arte é a "linguagem" do vídeo. Ela decide se o 3D parece escultura, maquete técnica, cena de trailer ou brinquedo. Fica em `tokens.art` e muda os padrões da biblioteca: geometria, material, contorno, neblina, personagens e quique das animações.

| direção | quando | cara | `three` típico | presets |
|---|---|---|---|---|
| **cinematic** | ciência, tecnologia, finanças, história, "grandes números", temas com peso | escuro, luz dramática com recorte em acento, neblina, metal/vidro, câmera lenta | `material: "metal"\|"chrome"\|"glass"`, `lighting: "noir"`, `fog: {near: 1.05, far: 2.4}`, `geometry: "sharp"` | `assets/direcoes/cinematic.json` |
| **technical** | tecnologia, engenharia, dados, sistemas, "como funciona" | aramado/linhas, grade, azul-noite + acento quente, rótulos mono, precisão | `material: "wire"`, `edges: true`, `lighting: "flat"\|"studio"`, `fog` leve | `assets/direcoes/technical.json` |
| **editorial** | marcas "revista", cultura, finanças pessoais sóbrias, institucional | papel claro, serifa grande, 3D escultórico de gesso, um acento | `material: "stone"`, `lighting: "soft"`, `geometry: "sharp"` | `assets/direcoes/editorial.json` |
| **playful** | **só** marcas infantis ou explicitamente lúdicas | arredondado, cores vivas, personagens "toy" com olhos, quique | `material: "clay"\|"toon"`, `geometry: "round"` | — |

Regras:
- **Sem `art`, a biblioteca assume editorial + HUD mínimo.** Não deixe a direção implícita: escreva-a.
- **Pode misturar.** Um técnico com luz `noir` e `fog` fica um "técnico cinematográfico". Um cinematográfico com `edges: true` ganha contorno. Registre a mistura no DESIGN.md.
- **`playful` não é padrão.** Quando a marca não pede ludicidade, formas redondas, bonecos com olhos e molas com quique fazem o vídeo parecer infantil, mesmo com conteúdo sério.
- `art.medium: "2d"` troca o 3D por motion graphics planos (tipografia, formas, gráficos, fluxos). A direção continua valendo: técnico e editorial funcionam muito bem em 2D. Veja `references/2d.md`.
- `art.hud` controla a densidade de texto e elementos na tela. Use `"minimal"` (padrão), a não ser que a marca peça mais informação. Veja `didatica-storyboard.md › HUD mínimo`.

## 4. Esquema dos tokens

Os tamanhos são em px num quadro de 1080 de largura. Tempos em **segundos**.

```jsonc
{
  "meta": {"name": "Canal X", "version": "1.0.0", "source": "convertido de brand/tokens.css"},
  "art": {"direction": "cinematic|technical|editorial|playful", "hud": "minimal|balanced|rich", "medium": "3d|2d"},
  "color": {
    "background": "#RRGGBB", "backgroundAlt": "#…",
    "surface": "#…", "surfaceAlt": "#…", "border": "#…",
    "text": "#…", "textMuted": "#…", "textOnPrimary": "#…",
    "primary": "#…", "secondary": "#…", "accent": "#…",
    "positive": "#…", "negative": "#…", "warning": "#…",
    "data": ["#…", "#…", "#…"],
    "gradient": {"from": "#…", "to": "#…", "angle": 165},   // opcional
    "glow": "#…"                                           // brilho do fundo radial (padrão: primary)
  },
  "typography": {
    "display": {"family": "…", "fallback": "sans-serif", "weight": 800,
                "files": [{"src": "fonts/X-800.ttf", "weight": 800}],
                "ttf": "fonts/X-800.ttf",                   // opcional: força o arquivo do Text3D
                "letterSpacing": -0.03, "lineHeight": 1.0, "textTransform": "none"},
    "body": {…}, "mono": {…}, "accent": {…},               // mono e accent são opcionais
    "scale": {"hero": 220, "h1": 124, "h2": 90, "h3": 60, "body": 44, "small": 34, "label": 28}
  },
  "shape":   {"radius": {"sm": 6, "md": 12, "lg": 20}, "strokeWidth": 3, "corner": "sharp|rounded|pill"},
  "layout":  {"margin": 72, "gap": 40, "safe": {"top": 220, "bottom": 360, "left": 72, "right": 120}},
  "surface": {"style": "solid|glass|outline|elevated", "blur": 24},
  "background": {"style": "solid|gradient|radial|grid|dots", "grain": 0.06, "vignette": 0.4, "patternOpacity": 0.05},
  "motion": {
    "personality": "calm|confident|energetic|playful|precise",
    "easing": {"standard": [x1,y1,x2,y2], "enter": […], "exit": […]},
    "spring": {"enter": {"damping": 200, "stiffness": 100}, "pop": {…}, "soft": {…}},
    "duration": {"fast": 0.35, "base": 0.65, "slow": 1.1},
    "stagger": 0.08,
    "transition": {"type": "fade|slide|push|zoom|wipe|blur", "duration": 0.55},
    "cameraDrift": 0.3
  },
  "three": {
    "material": "metal|chrome|glass|stone|wire|matte|glossy|clay|toon",
    "geometry": "sharp|soft|round",        // padrão: sharp (round só no playful)
    "edges": false,                         // contorno em linha nos sólidos (true no técnico)
    "fog": {"near": 1.05, "far": 2.4},      // múltiplos da distância câmera→alvo; null desliga
    "lighting": "noir|studio|soft|dramatic|flat",
    "bevel": 0.02, "shadows": true, "fov": 26, "exposure": 1.05,
    "roughness": null, "metalness": null, "clearcoat": null   // overrides opcionais
  },
  "captions": {"enabled": true, "style": "minimal|karaoke|box|pop", "position": "bottom|center|top",
               "maxWords": 4, "size": 54, "font": "body|display|accent", "textTransform": "none|uppercase",
               "highlight": "text", "box": null, "stroke": 0},
  "brand": {"logo": "logos/logo.svg", "logoOnDark": "logos/logo-branco.svg",
            "watermark": "none|top-left|top-right|bottom", "handle": "@canal", "endCard": false},
  "sound": {"palette": "soft|crisp|punchy|digital", "sfxGain": 0.3, "musicGain": 0.12, "duckTo": 0.35,
            "library": "sons", "transitionSfx": "whoosh-soft"}
}
```

Notas de uso:
- `layout.safe` protege a interface de Reels/TikTok/Shorts. O topo tem abas e status, a base tem legenda do post e botões e a direita tem curtir/comentar/compartilhar. Não reduza sem motivo.
- **`fov` fechado (22–28°)** dá cara de lente longa, mais "cinema" e menos distorção. Com ele, enquadre com `fitDistance()`, senão tudo fica perto demais.
- `captions.style: "minimal"` (palavra ativa em `text`, demais apagadas, sem caixa) é o padrão recomendado. `karaoke`/`box`/`pop` chamam mais atenção e competem com o visual: use quando a marca pede.
- `brand.watermark`: `"none"` por padrão. A assinatura fixa é poluição visual em vídeo curto. Use só se a marca exigir.
- `surface.style: "glass"` usa `backdrop-filter`: bonito sobre 3D, mas pesa no render.

## 5. Derivando o que a marca não define

Manuais de marca quase nunca definem movimento, material 3D ou som. Derive da direção de arte e da personalidade, e registre no DESIGN.md:

| personality | easing.standard | spring.enter | spring.pop | stagger | transição | som |
|---|---|---|---|---|---|---|
| calm | [0.45,0,0.55,1] | damping 200, stiffness 80 | damping 22 | 0.09 | fade / blur 0.6s | soft |
| confident | [0.65,0,0.35,1] | damping 200, stiffness 110 | damping 18 | 0.07 | blur / slide 0.5s | soft / crisp |
| precise | [0.4,0,0.2,1] | damping 200, stiffness 140 | damping 24 | 0.05 | wipe 0.4s | digital / crisp |
| energetic | [0.83,0,0.17,1] | damping 30, stiffness 220 | damping 14 | 0.045 | push / zoom 0.35s | punchy |
| playful | [0.34,1.56,0.64,1] | damping 14, stiffness 160 | damping 7 | 0.06 | zoom / wipe 0.4s | crisp |

Fora do playful, mantenha `spring.pop.damping ≥ 14`. Overshoot alto em objetos grandes é quique de desenho animado. `easing.enter` costuma ser um ease-out forte ([0.16,1,0.3,1]) e `easing.exit`, um ease-in ([0.7,0,0.84,0]).

## 6. DESIGN.md

Curto e útil para o próximo vídeo (seu ou de outra pessoa):

```markdown
# Design system — <nome>
Origem: <criado em DD/MM/AAAA a partir de … | convertido de …>
Direção de arte: <cinematic|technical|editorial|…> — <uma frase do porquê>
HUD: minimal

## Cores
- primary <hex>: volumes 3D neutros, barras, linhas
- accent <hex>: SÓ o que está em foco (objeto ativo, número-chave) — 1 uso por cena
## Tipografia
- display <família/peso>: números e títulos de até ~5 palavras
- body <família/peso>: legenda e rótulos curtos
## 3D · Movimento · Som
- <material, luz, neblina, câmera; molas; paleta sonora — e por quê>
## Regras
- <ex.: nunca mais de 1 bloco de texto além da legenda; nada de selos/etiquetas decorativas>
## Substituições / pendências
- <ex.: fonte proprietária X substituída por Y até recebermos os arquivos>
```

## 7. Validar e aprovar

1. `npm run ds:check`: erros bloqueiam, avisos pedem atenção (contraste, tamanhos mínimos, fonte sem TTF para 3D, direção ausente).
2. Prancha visual: `npm run check -- design-system --at 3` renderiza a composição de conferência. Abra a imagem e avalie com olho crítico: o 3D tem a cara da direção escolhida? O acento aparece só onde deve?
3. **Design system novo ou convertido:** mostre a prancha ao usuário e peça aprovação antes de produzir, se ele estiver disponível. Se ele pediu para seguir sem interrupções, siga e destaque a prancha no resumo final.
