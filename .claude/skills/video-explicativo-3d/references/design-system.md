# Design system para vídeo

A skill não tem identidade visual própria. Toda cor, fonte, raio, material 3D, ritmo de animação e paleta sonora vem de **`design-system/tokens.json`** do projeto. Isso garante que todos os vídeos de um canal pareçam da mesma série, e que trocar a identidade seja editar um arquivo, não reescrever cenas.

## Índice
1. Onde fica e como o estúdio lê
2. Procedimento: encontrar → converter → criar
3. Esquema dos tokens (campo a campo)
4. Derivando o que a marca não define (motion, 3D, som)
5. DESIGN.md (registro de decisões)
6. Validar e aprovar

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
→ `npm run ds:check`. Se passar, use. Se faltar algo específico de vídeo (ex.: `three`, `sound`), complete seguindo a seção 4 e registre no DESIGN.md. Não "melhore" cores ou fontes existentes: identidade é decisão do dono.

**B. Existe identidade em outro formato.** Procure antes de criar:
- `design-system/`, `brand/`, `marca/`, `identidade/`, `styleguide/`, `tokens/` (JSON de tokens, Style Dictionary, Figma Tokens)
- CSS com variáveis (`:root { --color-primary: … }`), `tailwind.config.*` (theme.colors, fontFamily), `theme.ts`
- Guias em PDF/MD (manual da marca), `CLAUDE.md`, ou outra skill de identidade visual instalada (ex.: uma skill de padrão visual HTML)
- Decks/HTML já produzidos para o mesmo cliente

→ **Converta** para `tokens.json` preservando os valores literais (hex exatos, famílias exatas). Mapeamento típico:

| Origem | Token |
|---|---|
| cor de fundo da marca / `--bg` / `background` | `color.background` (+ `backgroundAlt` 4–8% mais clara/escura) |
| cards, painéis / `--surface`, `--card` | `color.surface` |
| cor principal / `--primary` / `brand.500` | `color.primary` |
| secundária | `color.secondary` |
| cor de destaque/CTA / `--accent` | `color.accent` (usada em ênfases e legenda ativa) |
| sucesso / erro | `color.positive` / `color.negative` |
| fonte de títulos / headings | `typography.display` |
| fonte de texto | `typography.body` |
| gradiente da marca | `color.gradient` + `background.style: "gradient"` |
| logo | `brand.logo` / `brand.logoOnDark` (copie o arquivo para `design-system/logos/`) |

Fontes do Google: `node scripts/fetch-font.mjs "Nome da Família" 400,700` baixa TTF para `design-system/fonts/` e imprime o trecho de `files`. Fontes proprietárias: peça os arquivos (TTF/OTF) ao usuário. Sem eles, avise e use a alternativa livre mais próxima, registrando a substituição no DESIGN.md.

**C. Não existe nada.** Crie um design system.
1. Se o usuário está disponível, faça no máximo 3 perguntas curtas: público e tom (ex.: "sério e confiável", "jovem e enérgico"), cores ou referências que devem aparecer (ou evitar), e se há logo. Se não está disponível, ou disse para seguir, decida a partir do tema, do público implícito no roteiro e do canal, e explique as escolhas no resumo final.
2. Parta de `assets/design-system-exemplo/tokens.json` **apenas como formato**. As cores e fontes dele são placeholders e não devem chegar ao vídeo de ninguém.
3. Escolha com intenção:
   - **Fundo:** em 9:16 para redes, fundos escuros dão profundidade ao 3D e contraste às legendas. Fundos claros funcionam para marcas "editoriais" e leves. Escolha pelo tom, não por hábito.
   - **Primária:** saturada o bastante para viver em objetos 3D grandes (com contraste ≥ 3:1 contra o fundo). **Acento:** complementar ou análoga e mais quente, reservada a ênfases. Use acento em poucos lugares por cena: é o "marca-texto" do vídeo.
   - **Paleta de dados (`color.data`):** 4–6 cores distinguíveis entre si e do fundo. A primeira é a primária.
   - **Display:** uma grotesca ou geométrica com personalidade, peso 700–900, para números e títulos curtos. **Body:** uma sans legível em 500–600. Evite fontes finas: em vídeo comprimido e tela pequena, traço fino some.
4. Salve os arquivos, escreva o DESIGN.md e valide (seção 6).

## 3. Esquema dos tokens

Os tamanhos são em px num quadro de 1080 de largura. Tempos em **segundos**.

```jsonc
{
  "meta": {"name": "Canal X", "version": "1.0.0", "source": "convertido de brand/tokens.css"},
  "color": {
    "background": "#RRGGBB", "backgroundAlt": "#…",      // fundo e variação
    "surface": "#…", "surfaceAlt": "#…", "border": "#…", // cards/painéis
    "text": "#…", "textMuted": "#…", "textOnPrimary": "#…",
    "primary": "#…", "secondary": "#…", "accent": "#…",
    "positive": "#…", "negative": "#…", "warning": "#…",
    "data": ["#…", "#…", "#…", "#…"],                   // séries de gráfico, em ordem
    "gradient": {"from": "#…", "to": "#…", "angle": 165},  // opcional
    "glow": "#…"                                          // brilho do fundo radial (padrão: primary)
  },
  "typography": {
    "display": {"family": "…", "fallback": "sans-serif", "weight": 800,
                "files": [{"src": "fonts/X-800.ttf", "weight": 800}],
                "ttf": "fonts/X-800.ttf",                  // opcional: força o arquivo do Text3D
                "letterSpacing": -0.03, "lineHeight": 1.0, "textTransform": "none"},
    "body":    {…}, "mono": {…}, "accent": {…},          // mono e accent são opcionais
    "scale": {"hero": 200, "h1": 112, "h2": 84, "h3": 60, "body": 44, "small": 34, "label": 28}
  },
  "shape":   {"radius": {"sm": 12, "md": 24, "lg": 40}, "strokeWidth": 4, "corner": "rounded|sharp|pill"},
  "layout":  {"margin": 72, "gap": 40, "safe": {"top": 220, "bottom": 360, "left": 72, "right": 120}},
  "surface": {"style": "solid|glass|outline|elevated", "blur": 24},
  "background": {"style": "solid|gradient|radial|grid|dots", "grain": 0.06, "vignette": 0.35, "patternOpacity": 0.06},
  "motion": {
    "personality": "calm|confident|energetic|playful|precise",
    "easing": {"standard": [x1,y1,x2,y2], "enter": […], "exit": […]},
    "spring": {"enter": {"damping": 200, "stiffness": 120}, "pop": {…}, "soft": {…}},
    "duration": {"fast": 0.3, "base": 0.55, "slow": 1.0},
    "stagger": 0.07,
    "transition": {"type": "fade|slide|push|zoom|wipe|blur", "duration": 0.45},
    "cameraDrift": 0.35
  },
  "three": {"material": "matte|glossy|glass|clay|metal|toon", "bevel": 0.08,
            "lighting": "studio|soft|dramatic|flat", "shadows": true, "fov": 32, "exposure": 1.05,
            "roughness": null, "metalness": null, "clearcoat": null},   // overrides opcionais
  "captions": {"enabled": true, "style": "karaoke|pop|box|minimal", "position": "bottom|center|top",
               "maxWords": 4, "size": 64, "font": "display|body|accent", "textTransform": "none|uppercase",
               "highlight": "accent", "box": null, "stroke": 0},
  "brand": {"logo": "logos/logo.svg", "logoOnDark": "logos/logo-branco.svg",
            "watermark": "none|top-left|top-right|bottom", "handle": "@canal", "endCard": false},
  "sound": {"palette": "soft|crisp|punchy|digital", "sfxGain": 0.45, "musicGain": 0.12, "duckTo": 0.35,
            "library": "sons", "transitionSfx": "whoosh-soft"}
}
```

Notas de uso:
- `layout.safe` protege a interface de Reels/TikTok/Shorts. O topo tem abas e status. A base tem legenda do post e botões, que ocupam bastante. A direita tem curtir, comentar e compartilhar. Não reduza sem motivo.
- `captions.highlight` e `brand.*` aceitam papéis de cor (`"accent"`) ou hex.
- `surface.style: "glass"` usa `backdrop-filter`: fica lindo sobre 3D, mas pesa no render. Use `solid` se o render estiver lento.

## 4. Derivando o que a marca não define

Manuais de marca quase nunca definem movimento, material 3D ou som. Derive da **personalidade** (a mesma palavra que descreve a marca) e registre no DESIGN.md:

| personality | easing.standard | spring.enter | spring.pop | stagger | transição | material | luz | som |
|---|---|---|---|---|---|---|---|---|
| calm (saúde, bem-estar, finanças pessoais) | [0.45,0,0.55,1] | damping 200, stiffness 80 | damping 18 | 0.09 | fade / blur 0.6s | matte ou clay | soft | soft |
| confident (institucional, educação, B2B) | [0.65,0,0.35,1] | damping 200, stiffness 120 | damping 12 | 0.07 | slide 0.45s | glossy | studio | soft / crisp |
| energetic (esporte, tech jovem, varejo) | [0.83,0,0.17,1] | damping 26, stiffness 220 | damping 9 | 0.045 | push / zoom 0.35s | glossy | dramatic | punchy |
| playful (infantil, curiosidades, lifestyle) | [0.34,1.56,0.64,1] | damping 14, stiffness 160 | damping 7 | 0.06 | zoom / wipe 0.4s | clay ou toon | soft | crisp |
| precise (dados, ciência, engenharia) | [0.4,0,0.2,1] | damping 200, stiffness 140 | damping 20 | 0.05 | wipe / slide 0.35s | matte ou metal | studio | digital / crisp |

`easing.enter` costuma ser um ease-out forte (ex.: [0.16,1,0.3,1]); `easing.exit`, um ease-in ([0.7,0,0.84,0]). `cameraDrift` vai de 0.15 (calm/precise) a 0.5 (energetic).

## 5. DESIGN.md

Curto e útil para o próximo vídeo (seu ou de outra pessoa):

```markdown
# Design system — <nome>
Origem: <criado em DD/MM/AAAA a partir de … | convertido de …>
Personalidade: <palavra> — <uma frase do porquê>

## Cores
- primary <hex>: objetos 3D principais, barras, ícones ativos
- accent <hex>: SÓ ênfase (palavra-chave, número que importa, legenda ativa) — no máx. 1–2 usos por cena
- …
## Tipografia
- display <família/peso>: números, títulos de até ~6 palavras
- body <família/peso>: rótulos, frases de apoio
## Movimento · 3D · Som
- <escolhas e por quê>
## Regras
- <ex.: nunca texto branco sobre accent; números sempre em display>
## Substituições / pendências
- <ex.: fonte proprietária X substituída por Y até recebermos os arquivos>
```

## 6. Validar e aprovar

1. `npm run ds:check`: erros bloqueiam, avisos pedem atenção (contraste, tamanhos mínimos, fonte sem TTF para 3D).
2. Prancha visual: `npm run check -- design-system --at 3` renderiza a composição de conferência (paleta, tipografia, card, gráfico, objetos 3D com o material). Abra a imagem e avalie com olho crítico: o 3D tem a cara da marca? O acento aparece onde deve?
3. **Design system novo ou convertido:** mostre a prancha ao usuário e peça aprovação antes de produzir o vídeo, se ele estiver disponível. Reescrever cenas depois de uma troca de identidade custa caro. Se ele pediu para seguir sem interrupções, siga e destaque a prancha no resumo final.
