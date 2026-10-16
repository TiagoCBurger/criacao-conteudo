import React from "react";
import {Composition, Folder} from "remotion";
import {EdicaoNaTela} from "./lib/Edicao";
import {clipes} from "./lib/midia";
import {resolver, resumo, type Resumo} from "./lib/resolver";
import type {EdicaoDef} from "./lib/tipos";
import {VisualizarClipe} from "./lib/VisualizarClipe";
import {edicoes} from "./edicoes";

const componentes = new Map<string, React.FC<{resumo: Resumo | null}>>();
const componenteDe = (def: EdicaoDef) => {
  if (!componentes.has(def.id)) componentes.set(def.id, () => <EdicaoNaTela edicao={def.edicao} />);
  return componentes.get(def.id)!;
};

export const Root: React.FC = () => (
  <>
    <Folder name="Edicoes">
      {edicoes.map((def) => (
        <Composition
          key={def.id}
          id={def.id}
          component={componenteDe(def)}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={30}
          defaultProps={{resumo: null as Resumo | null}}
          calculateMetadata={() => {
            const p = resolver(def.edicao);
            return {durationInFrames: p.frames, width: p.largura, height: p.altura, fps: p.fps, props: {resumo: resumo(p)}};
          }}
        />
      ))}
    </Folder>
    {/* um item por vídeo do registro, para assistir com timecode, fala e silêncios */}
    <Folder name="Midia">
      {Object.values(clipes)
        .filter((c) => c.tipo === "video" && c.duracao)
        .map((c) => {
          const k = 1280 / Math.max(c.largura ?? 1280, c.altura ?? 720);
          const even = (x: number) => Math.max(2, Math.round((x * k) / 2) * 2);
          return (
            <Composition
              key={c.id}
              id={`midia-${c.id}`}
              component={VisualizarClipe}
              width={even(c.largura ?? 1280)}
              height={even(c.altura ?? 720)}
              fps={c.fps ?? 30}
              durationInFrames={Math.max(1, Math.round((c.duracao ?? 1) * (c.fps ?? 30)))}
              defaultProps={{id: c.id}}
            />
          );
        })}
    </Folder>
  </>
);
