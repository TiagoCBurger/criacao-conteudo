// Formato de entrega: vertical 9:16 (Reels, TikTok, Shorts).
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;

export type VideoDef = {
  /** id da composição (letras, números e hífens) — é o que vai no `remotion render <id>` */
  id: string;
  component: React.FC;
  /** duração total em segundos (narração + respiro final) */
  duration: number;
};
