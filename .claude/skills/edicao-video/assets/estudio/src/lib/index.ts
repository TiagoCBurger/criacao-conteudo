// Biblioteca do estúdio de edição. Uma edição é um objeto `Edicao` (veja tipos.ts e references/edl.md).
import type {Edicao, EdicaoDef} from "./tipos";

export * from "./tipos";
export {alpha, areaSegura, cor, escalaTipo, estilo, estiloFile, raio, tipo} from "./estilo";
export {clipe, clipes, clipeSrc} from "./midia";
export type {Clipe, Palavra} from "./midia";
export {resolver, resumo, sfxNames} from "./resolver";
export type {Plano, Resumo} from "./resolver";
export {EdicaoNaTela, PlanoNaTela} from "./Edicao";
export {ClipeNoQuadro} from "./quadro";
export {useEntrada, useSaida, usePosicao} from "./textos";

/** Declara uma edição. O id vira o nome da composição (npm run check/render -- <id>). */
export const defineEdicao = (id: string, edicao: Edicao): EdicaoDef => {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`id de edição inválido: "${id}" (use letras minúsculas, números e hífens)`);
  return {id, edicao};
};
