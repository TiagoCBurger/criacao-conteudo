// Placar da série (VOCÊ × adversário), câmera do placar, bloco de número no topo e o CTA de assinatura.
// Compartilhado pelos episódios da série "Placar do Dono".
import React from "react";
import {AbsoluteFill} from "remotion";
import {c, CameraRig, frameSafe, KineticText, SafeArea, Scene3D, Sfx, type, useCue, useTime} from "../lib";
import {type LedRect, type LedText, Scoreboard, Stadium} from "./led";

// Painel de LED: 120 colunas × 90 linhas
export const COLS = 120;
export const ROWS = 90;
export const BOARD_W = 3;
export const BOARD_H = (BOARD_W * ROWS) / COLS;
export const POSTS = 2.2;
export const FLOOR_Y = -BOARD_H / 2 - 0.13 - POSTS;
export const L = 31; // centro da coluna da esquerda ("VOCÊ")
export const R = 89; // centro da coluna da direita (adversário)

export const versus = ({
  you,
  them,
  top,
  youLevel = 1,
  themLevel = 1,
  themColor = "accent",
  youColor = "accent",
  youLabel = "VOCÊ",
  themLabel = "BOLETOS",
  themSize = 40,
  youSize = 40,
  topColor = "textMuted",
  youBar = "positive",
  themBar = "negative",
}: {
  you: string;
  them: string;
  top?: string;
  youLevel?: number;
  themLevel?: number;
  themColor?: string;
  youColor?: string;
  youLabel?: string;
  themLabel?: string;
  themSize?: number;
  youSize?: number;
  topColor?: string;
  youBar?: string;
  themBar?: string;
}): {texts: LedText[]; rects: LedRect[]} => ({
  texts: [
    ...(top ? [{text: top, x: COLS / 2, y: 10, size: 7, color: topColor, level: 0.95, tracking: 1}] : []),
    {text: youLabel, x: L, y: 26, size: 11, color: "text", tracking: 1},
    {text: themLabel, x: R, y: 26, size: 11, color: "text", tracking: 1},
    {text: you, x: L, y: 61, size: youSize, color: youColor, level: youLevel},
    {text: "×", x: COLS / 2, y: 59, size: 24, color: "textMuted", level: 0.85},
    {text: them, x: R, y: 61, size: themSize, color: themColor, level: themLevel},
  ],
  rects: [
    {x: L - 13, y: 35, w: 26, h: 1, color: youBar, level: 0.9},
    {x: R - 21, y: 35, w: 42, h: 1, color: themBar, level: 0.9},
  ],
});

/**
 * Câmera do placar: contra-plongée leve, enquadrada para a faixa livre do 9:16.
 * center.x > 0 desloca o placar um pouco para a esquerda (borda direita fora da coluna de botões do app);
 * cy < 0 sobe o placar no quadro (cenas com b-roll: a comida aparece embaixo dele).
 */
export const boardCam = (fill: number, azimuth: number, elevation = -7, title = false, cy = 0) =>
  frameSafe({center: [0.08, cy, 0], size: [BOARD_W + 0.3, BOARD_H + 0.3, 0.4], azimuth, elevation, fill, title});

/** Bloco de número no terço superior (abaixo do selo "exemplo"). */
export const TopBlock: React.FC<{children: React.ReactNode; top?: number; height?: number}> = ({children, top = 300, height = 260}) => (
  <SafeArea align="top" style={{paddingTop: top}} gap={8}>
    <div style={{position: "relative", width: "100%", height}}>{children}</div>
  </SafeArea>
);
export const layer: React.CSSProperties = {position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center"};
export const subLabel = type("body", "body", {color: c("textMuted")});

/** CTA de assinatura da série: placar VOCÊ 0 × ?? BOLETOS piscando + "Comenta PLACAR". */
export const CtaPlacar: React.FC = () => {
  const t = useTime();
  const comenta = useCue("Comenta PLACAR");
  const placar = useCue("PLACAR");
  const blink = t < 0.35 ? 1 : Math.floor((t - 0.35) * 2.4) % 2 === 0 ? 1 : 0.3;
  const b = versus({you: "0", them: "??", themLevel: blink});
  const a = boardCam(0.7, -8, -5, true);
  const z = boardCam(0.76, -2, -4, true);
  return (
    <AbsoluteFill>
      <Scene3D camera={a} floorY={FLOOR_Y}>
        <CameraRig keys={[{t: 0, ...a}, {t: 4.5, ...z}]} />
        {/* sem torres de luz: o título ocupa o topo e as lâmpadas atrás dele atrapalhariam a leitura */}
        <Stadium lamps={false} />
        <Scoreboard texts={b.texts} rects={b.rects} width={BOARD_W} cols={COLS} rows={ROWS} posts={POSTS} glows={[{x: R, y: 61, size: 1.5, intensity: 0.3 * blink}]} />
      </Scene3D>
      <SafeArea align="top" style={{paddingTop: 250}}>
        <KineticText text={"Comenta\n*PLACAR*"} size="h1" delay={comenta - 0.1} preset="mask" />
      </SafeArea>
      <Sfx name="pop" at={comenta} volume={0.6} />
      <Sfx name="sparkle" at={placar + 0.15} volume={0.55} />
    </AbsoluteFill>
  );
};
