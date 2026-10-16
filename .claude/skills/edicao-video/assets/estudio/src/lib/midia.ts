import {staticFile} from "remotion";
// Gerado por `npm run midia` (versionado). Não edite à mão: rode o script de novo.
import registro from "../midia/registro.json";

export type Palavra = {text: string; startMs: number; endMs: number};

export type Clipe = {
  id: string;
  tipo: "video" | "audio" | "imagem";
  origem: string;
  arquivo: string;
  duracao?: number;
  largura?: number;
  altura?: number;
  fps?: number;
  temAudio?: boolean;
  loudness?: number | null;
  /** ganho linear que leva a fala do clipe a −16 LUFS */
  ganho?: number;
  silencios?: [number, number][];
  cenas?: number[];
  poster?: string;
  prancha?: string;
  ausente?: boolean;
  transcricao?: {fonte: string; idioma: string; palavras: Palavra[]};
};

export const clipes = (registro as unknown as {clipes: Record<string, Clipe>}).clipes;

/** Clipe do registro por id (erro com a lista dos disponíveis). */
export const clipe = (id: string, tipo?: Clipe["tipo"] | Clipe["tipo"][]): Clipe => {
  const c = clipes[id];
  if (!c) {
    const ids = Object.keys(clipes);
    const parecidos = ids.filter((k) => k.includes(id.slice(0, 4)) || id.includes(k.slice(0, 4))).slice(0, 6);
    throw new Error(`clipe "${id}" não está no registro. ${parecidos.length ? `Parecidos: ${parecidos.join(", ")}. ` : ""}Rode \`npm run midia -- listar\` (${ids.length} disponíveis).`);
  }
  const tipos = tipo ? (Array.isArray(tipo) ? tipo : [tipo]) : null;
  if (tipos && !tipos.includes(c.tipo)) throw new Error(`clipe "${id}" é ${c.tipo}; aqui precisa ser ${tipos.join(" ou ")}`);
  return c;
};

/** URL da cópia de trabalho do clipe (public/midia). */
export const clipeSrc = (c: Clipe) => staticFile(c.arquivo);
