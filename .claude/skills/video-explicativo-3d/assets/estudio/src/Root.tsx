import React from "react";
import {Composition, Folder} from "remotion";
import {FPS, HEIGHT, WIDTH} from "./config";
import {DesignSystemPreview} from "./DesignSystemPreview";
import {videos} from "./videos";

export const Root: React.FC = () => (
  <>
    {videos.map((v) => (
      <Composition key={v.id} id={v.id} component={v.component} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={Math.ceil(v.duration * FPS)} />
    ))}
    <Folder name="Sistema">
      <Composition id="design-system" component={DesignSystemPreview} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={FPS * 6} />
    </Folder>
  </>
);
