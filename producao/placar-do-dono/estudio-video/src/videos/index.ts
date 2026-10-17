import type {VideoDef} from "../config";

// Registro de vídeos. Cada vídeo vive em src/videos/<slug>/ e exporta um VideoDef como default.
// scripts/new-video.mjs adiciona as linhas abaixo dos marcadores — não remova os marcadores.
// @imports
import v57Pedidos from "./57-pedidos";

export const videos: VideoDef[] = [
  // @registro
  v57Pedidos,
];
