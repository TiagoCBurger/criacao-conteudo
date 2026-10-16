import React from "react";
import {AbsoluteFill} from "remotion";
import {c, ds, type} from "./ds";
import {Card} from "./lib/diagram";
import {SafeArea, Stage} from "./lib/layout";
import {Block, Orb} from "./lib/three/objects";
import {Scene3D} from "./lib/three/scene";
import {Text3D} from "./lib/three/text";
import {Eyebrow, KineticText} from "./lib/type";

// Prancha de conferência do design system: `npm run check -- design-system --at 3`.
// Mostre ao usuário antes do primeiro vídeo com um design system novo ou convertido.
export const DesignSystemPreview: React.FC = () => {
  const swatches = ["background", "surface", "text", "textMuted", "primary", "secondary", "accent", "positive", "negative"] as const;
  return (
    <AbsoluteFill>
      <Stage />
      <Scene3D camera={{position: [0, 0, 11]}} floorY={-3.05}>
        <group position={[0, -2.35, 0]}>
          <Block size={[0.9, 0.9, 0.9]} color="primary" position={[-1.15, 0, 0]} delay={0.2} enter="drop" />
          <Block size={[0.9, 1.4, 0.9]} color="secondary" position={[0, 0.25, 0]} delay={0.35} enter="drop" />
          <Orb radius={0.48} color="accent" position={[1.15, 0, 0]} delay={0.5} />
        </group>
        {ds.typography.display.files.some((f) => /\.(ttf|otf)$/i.test(f.src)) || ds.typography.display.ttf ? (
          <Text3D text="3D" size={0.9} depth={0.3} color="accent" position={[0, -0.75, 0]} delay={0.8} />
        ) : null}
      </Scene3D>
      <SafeArea align="top" gap={30} reserveCaptions={false}>
        <Eyebrow text={ds.meta.name.slice(0, 36)} />
        <KineticText text={"Design system\n*em movimento*"} size="h1" />
        <div style={{display: "flex", gap: 10, justifyContent: "center"}}>
          {swatches.map((k) => (
            <div key={k} style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 6}}>
              <div style={{width: 76, height: 76, borderRadius: 18, background: c(k), border: `2px solid ${c("textMuted")}44`}} />
              <span style={type("mono", 15, {color: c("textMuted")})}>{k.slice(0, 9)}</span>
            </div>
          ))}
        </div>
        <Card delay={0.4} width="100%">
          <div style={type("display", "h2", {color: c("text")})}>Título H2</div>
          <div style={type("body", "body", {color: c("textMuted"), marginTop: 12})}>Corpo de texto em uma ou duas linhas.</div>
        </Card>
      </SafeArea>
    </AbsoluteFill>
  );
};
