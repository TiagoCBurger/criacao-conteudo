// Contrato dos tokens de vídeo. A fonte da verdade é design-system/tokens.json do projeto
// (sincronizado para public/ds/ por `npm run ds:sync`). Nada de identidade visual é definido aqui.

export type Bezier = [number, number, number, number];

export type SpringCfg = {damping?: number; stiffness?: number; mass?: number};

export type FontFile = {src: string; weight: number; style?: "normal" | "italic"};

export type FontRole = {
  family: string;
  fallback?: string;
  weight: number;
  files: FontFile[];
  /** TTF/OTF para letreiros 3D extrudados (TTFLoader não lê woff2). Caminho relativo ao design system. */
  ttf?: string;
  /** em (ex.: -0.02) */
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
};

export type Tokens = {
  meta: {name: string; version: string; source?: string; notes?: string};
  color: {
    background: string;
    backgroundAlt?: string;
    surface: string;
    surfaceAlt?: string;
    border?: string;
    text: string;
    textMuted: string;
    textOnPrimary?: string;
    primary: string;
    secondary: string;
    accent: string;
    positive: string;
    negative: string;
    warning?: string;
    /** paleta categórica para gráficos, em ordem de uso */
    data: string[];
    gradient?: {from: string; to: string; angle?: number};
    glow?: string;
  };
  typography: {
    display: FontRole;
    body: FontRole;
    mono?: FontRole;
    /** letreiro/lettering especial (script, condensada, serifada de impacto...) */
    accent?: FontRole;
    /** px no canvas de 1080 de largura */
    scale: {hero: number; h1: number; h2: number; h3: number; body: number; small: number; label: number};
  };
  shape: {radius: {sm: number; md: number; lg: number}; strokeWidth: number; corner: "rounded" | "sharp" | "pill"};
  layout: {margin: number; gap: number; safe: {top: number; bottom: number; left: number; right: number}};
  surface: {style: "solid" | "glass" | "outline" | "elevated"; blur?: number; shadow?: string};
  background: {
    style: "solid" | "gradient" | "radial" | "grid" | "dots";
    grain?: number;
    vignette?: number;
    patternOpacity?: number;
    /** intensidade (0–1) do brilho que respira no fundo; 0 desliga */
    glow?: number;
  };
  motion: {
    personality: "calm" | "confident" | "energetic" | "playful" | "precise";
    easing: {standard: Bezier; enter: Bezier; exit: Bezier};
    spring: {enter: SpringCfg; pop: SpringCfg; soft: SpringCfg};
    /** segundos */
    duration: {fast: number; base: number; slow: number};
    /** segundos entre elementos em sequência */
    stagger: number;
    transition: {type: "fade" | "slide" | "push" | "zoom" | "wipe" | "blur"; duration: number};
    /** 0..1 — quanto a câmera 3D "respira" quando parada */
    cameraDrift: number;
  };
  /**
   * Direção de arte: a "linguagem" visual do vídeo. Opcional — sem ela vale editorial + hud mínimo.
   *  editorial  → tipografia grande, muito espaço negativo, 3D escultórico de arestas vivas, paleta contida
   *  cinematic  → escuro, luz dramática com recorte, neblina, metal/vidro, câmera lenta
   *  technical  → linhas/aramado, grade, precisão, rótulos mono
   *  playful    → formas arredondadas, cores vivas, personagens "toy" (só quando a marca é lúdica/infantil)
   */
  art?: {
    direction: "editorial" | "cinematic" | "technical" | "playful";
    /** densidade de elementos na tela além do visual principal */
    hud: "minimal" | "balanced" | "rich";
    /** "3d" (padrão): cenas com Scene3D. "2d": motion graphics planos (lib/flat), sem WebGL */
    medium?: "3d" | "2d";
  };
  three: {
    material: "matte" | "glossy" | "glass" | "clay" | "metal" | "toon" | "chrome" | "stone" | "wire";
    roughness?: number;
    metalness?: number;
    clearcoat?: number;
    /** raio do chanfro dos blocos, em unidades 3D */
    bevel: number;
    /** sharp = arestas vivas (padrão fora do playful); soft = chanfro do token; round = bem arredondado */
    geometry?: "sharp" | "soft" | "round";
    /** contorno em linha nos sólidos (look técnico) */
    edges?: boolean;
    /** neblina na cor do fundo; near/far em múltiplos da distância câmera→alvo (ex.: {near: 1.05, far: 2.4}); null desliga */
    fog?: {near: number; far: number} | null;
    lighting: "studio" | "soft" | "dramatic" | "flat" | "noir";
    shadows: boolean;
    fov: number;
    exposure: number;
  };
  captions: {
    enabled: boolean;
    style: "karaoke" | "pop" | "box" | "minimal";
    position: "bottom" | "center" | "top";
    maxWords: number;
    size: number;
    font: "display" | "body" | "accent";
    textTransform?: "none" | "uppercase";
    highlight: string;
    box?: string;
    stroke?: number;
  };
  brand: {
    logo?: string;
    logoOnDark?: string;
    watermark: "none" | "top-left" | "top-right" | "bottom";
    handle?: string;
    endCard: boolean;
  };
  sound: {
    palette: "soft" | "crisp" | "punchy" | "digital";
    sfxGain: number;
    musicGain: number;
    /** volume relativo da trilha enquanto há fala */
    duckTo: number;
    /** pasta (relativa ao design system) com sons próprios da marca; substituem os gerados quando o nome coincide */
    library?: string;
    transitionSfx?: string | null;
  };
};
