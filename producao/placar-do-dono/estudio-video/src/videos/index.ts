import type {VideoDef} from "../config";

// Registro de vídeos. Cada vídeo vive em src/videos/<slug>/ e exporta um VideoDef como default.
// scripts/new-video.mjs adiciona as linhas abaixo dos marcadores — não remova os marcadores.
// @imports
import vDesconto20 from "./desconto-20";
import v57Pedidos from "./57-pedidos";

export const videos: VideoDef[] = [
  // @registro
  vDesconto20,
  v57Pedidos,
];
