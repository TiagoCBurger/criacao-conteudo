import type React from "react";
import type {TamanhoTipo} from "./estilo";

// Formato da edição (a "lista de decisões de edição"). Tudo em segundos; o tempo de origem é o do clipe,
// o tempo de saída é o do vídeo final. Veja references/edl.md para exemplos de cada campo.

export type Formato = "9:16" | "16:9" | "1:1" | "4:5" | {largura: number; altura: number};

/** Como um clipe ocupa um quadro de proporção diferente. */
export type Enquadramento =
  /** cobre o quadro inteiro e corta as sobras, centrado em `foco` (talking head 16:9 → 9:16) */
  | "preencher"
  /** mostra o quadro inteiro, com faixas na cor de fundo */
  | "ajustar"
  /** mostra o quadro inteiro sobre uma cópia ampliada e desfocada dele (sem faixas) */
  | "desfocar";

/** Ponto de interesse do clipe, 0–1 (x: esquerda→direita, y: topo→base). Ex.: rosto à direita = {x: 0.68, y: 0.4}. */
export type Foco = {x: number; y: number};

export type Filtro = "nenhum" | "quente" | "frio" | "pb" | "contraste" | "suave" | "vintage" | "noite" | {css: string};

export type TipoTransicao = "corte" | "cruzar" | "preto" | "branco" | "flash" | "deslizar" | "limpar" | "zoom" | "desfoque" | "iris";
export type Direcao = "esquerda" | "direita" | "cima" | "baixo";
export type Transicao = TipoTransicao | {tipo: TipoTransicao; duracao?: number; direcao?: Direcao; som?: string | false};

/**
 * Instante no vídeo FINAL.
 * - número: segundos
 * - {fala}: quando a frase é dita no vídeo final (palavras como estão na transcrição; acentos e pontuação não importam)
 * - {corte}: relativo a um corte (número = posição na lista, começando em 1; ou o `id` do corte)
 */
export type Momento =
  | number
  | {fala: string; ocorrencia?: number; fim?: boolean; desloc?: number; corte?: number | string}
  | {corte: number | string; em?: number; fim?: boolean; desloc?: number};

type Janela = {
  em: Momento;
  /** segundos (padrão depende do tipo) */
  duracao?: number;
  /** alternativa a `duracao`: até outro momento */
  ate?: Momento;
};

export type Corte = {
  /** nome para referenciar em momentos ({corte: "gancho"}) */
  id?: string;
  /** id do clipe no registro (npm run midia -- listar) */
  clipe: string;
  /** início no clipe: segundos, ou as primeiras palavras do trecho ("Hoje eu vou") */
  de?: number | string;
  /** fim no clipe: segundos, ou as últimas palavras do trecho ("três erros") */
  ate?: number | string;
  /** só procura as falas de `de`/`ate` depois deste instante do clipe (s) — para frases repetidas em takes */
  apos?: number;
  /** respiro (s) antes/depois quando `de`/`ate` são falas. Padrão [0.08, 0.14]. Nunca invade a palavra vizinha. */
  folga?: number | [number, number];
  /** duração (s) quando o clipe é uma imagem parada */
  duracao?: number;
  /** 0.25–4 (1 = normal) */
  velocidade?: number;
  /** multiplicador sobre o volume normalizado do clipe (1 = fala em −16 LUFS) */
  volume?: number;
  mudo?: boolean;
  enquadrar?: Enquadramento;
  foco?: Foco;
  /** 1.15 = punch-in fixo de 15%; {de, para} = aproximação/afastamento lento ao longo do corte (Ken Burns) */
  zoom?: number | {de: number; para: number};
  filtro?: Filtro;
  espelhar?: boolean;
  /** como ESTE corte entra (vindo do anterior). Padrão: `transicaoPadrao` da edição ou "corte" seco */
  transicao?: Transicao;
};

export type Posicao = "topo" | "centro" | "baixo" | {x: number; y: number};
export type Animacao = "palavras" | "surgir" | "subir" | "pop" | "digitar" | "nenhuma";

export type Texto =
  /** título grande (gancho, tópico). `destaque` = palavras na cor de acento */
  | (Janela & {tipo: "titulo"; texto: string; destaque?: string[]; tamanho?: TamanhoTipo | number; posicao?: Posicao; animacao?: Animacao; cor?: string})
  /** texto livre, com caixa opcional */
  | (Janela & {tipo: "texto"; texto: string; tamanho?: TamanhoTipo | number; caixa?: boolean; posicao?: Posicao; animacao?: Animacao; cor?: string})
  /** lower third: nome + descrição (quem está falando) */
  | (Janela & {tipo: "rotulo"; nome: string; descricao?: string; posicao?: Posicao; animacao?: Animacao})
  /** palavra ou número que salta no centro (ênfase) */
  | (Janela & {tipo: "destaque"; texto: string; tamanho?: TamanhoTipo | number; posicao?: Posicao; animacao?: Animacao; cor?: string});

export type Camada =
  /** b-roll: outro clipe cobre a tela enquanto o áudio do corte principal continua */
  | (Janela & {tipo: "broll"; clipe: string; de?: number; velocidade?: number; volume?: number; enquadrar?: Enquadramento; foco?: Foco; zoom?: number | {de: number; para: number}; filtro?: Filtro; transicao?: "corte" | "cruzar"})
  /** vídeo pequeno num canto (picture-in-picture) */
  | (Janela & {tipo: "pip"; clipe: string; de?: number; velocidade?: number; volume?: number; canto?: "sup-esq" | "sup-dir" | "inf-esq" | "inf-dir"; largura?: number})
  /** imagem do registro (ou o logo do estilo): tela cheia (`cobrir`) ou posicionada */
  | (Janela & {tipo: "imagem"; clipe?: string; logo?: boolean; cobrir?: boolean; posicao?: Posicao; largura?: number; animacao?: Animacao; kenBurns?: boolean})
  /** componente React próprio (motion graphics da edição). Ele recebe {duracao} + props e usa useCurrentFrame() local */
  | (Janela & {tipo: "componente"; componente: React.ComponentType<any>; props?: Record<string, unknown>});

export type Som = {
  /** efeito da biblioteca (public/sfx/manifest.json): whoosh, pop, click, thud, boom, riser, ding… */
  sfx?: string;
  /** ou um áudio do registro */
  clipe?: string;
  em: Momento;
  volume?: number;
  velocidade?: number;
};

export type Trilha = {
  clipe: string;
  /** volume base (padrão: sound.musicGain do estilo) */
  volume?: number;
  /** abaixa sob a fala (padrão true) */
  ducking?: boolean;
  /** começa a tocar a trilha a partir deste ponto dela (s) */
  de?: number;
  em?: Momento;
  ate?: Momento;
  fadeIn?: number;
  fadeOut?: number;
  loop?: boolean;
};

/** Locução ou áudio extra (voice-over, ambiência) em cima da edição. */
export type AudioExtra = {clipe: string; em: Momento; de?: number; ate?: number; volume?: number; legendar?: boolean};

/** Punch-in de ênfase na câmera (vale para o vídeo principal e o b-roll). */
export type ZoomMomento = Janela & {escala?: number; entrada?: "seco" | "suave"; foco?: Foco};

export type Efeito = Janela & {tipo: "flash" | "tremor" | "pb" | "desfoque"; intensidade?: number};

export type Legendas = {
  /** pop: 1–3 palavras, a falada salta · karaoke: frase com a palavra falada colorida · caixa: frase numa caixa · simples: frase sem destaque */
  estilo?: "pop" | "karaoke" | "caixa" | "simples";
  posicao?: "baixo" | "centro" | "topo";
  maxPalavras?: number;
  tamanho?: number;
  maiusculas?: boolean;
  /** palavras sempre na cor de acento */
  destaque?: string[];
  /** trechos sem legenda (ex.: enquanto um título ocupa a tela) */
  ocultar?: {de: Momento; ate: Momento}[];
};

export type Edicao = {
  /** padrão "9:16" (1080×1920) */
  formato?: Formato;
  fps?: number;
  /** enquadramento padrão dos cortes (padrão "preencher") */
  enquadrar?: Enquadramento;
  /** cor de fundo/faixas (papel do estilo ou literal; padrão "background") */
  fundo?: string;
  transicaoPadrao?: Transicao;
  /** som das transições (padrão sound.transitionSfx do estilo; false desliga) */
  somTransicao?: string | false;
  cortes: Corte[];
  legendas?: Legendas | false;
  textos?: Texto[];
  camadas?: Camada[];
  zooms?: ZoomMomento[];
  efeitos?: Efeito[];
  sons?: Som[];
  trilha?: Trilha;
  audios?: AudioExtra[];
  /** 0–1: escurece as bordas do quadro */
  vinheta?: number;
  /** segundos de fade para preto (imagem e som) no fim */
  fadeFinal?: number;
  /** instante da capa (s) para o render */
  capa?: number;
};

export type EdicaoDef = {id: string; edicao: Edicao};
