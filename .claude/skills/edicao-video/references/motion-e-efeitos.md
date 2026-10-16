# Motion graphics e efeitos

Em vídeo editado, o motion **serve à fala**: destaca a palavra-chave, nomeia quem fala, mostra o número que foi dito, marca a troca de assunto. Se não ajuda a entender ou a prender, não entra.

## Hierarquia na tela
1. Rosto/ação (o vídeo).
2. Legenda: sempre legível, na faixa de baixo (ou no centro, estilo TikTok).
3. **No máximo um** elemento extra por vez: título, rótulo, destaque, imagem ou pip.

Quando um título ocupa a tela, esconda a legenda no mesmo trecho (`legendas.ocultar`) ou ponha o título no topo. Texto na tela é síntese (≤ 5 palavras), não repete a legenda.

## Quando usar cada texto
| tipo | uso | duração |
|---|---|---|
| `titulo` | gancho, tema, tópico ("Erro nº 2") | 1,8–2,5 s |
| `rotulo` | quem fala (1ª aparição de cada pessoa) | 3–4 s |
| `destaque` | número ou palavra dita com ênfase ("87%", "NUNCA") | 0,8–1,5 s, entrando exatamente na fala |
| `texto` com `caixa` | CTA, aviso, fonte de um dado | o tempo de ler (~0,3 s por palavra + 1 s) |

Ancore em `{fala: "…"}`. O título entra 0,1–0,2 s antes da palavra (`desloc: -0.15`), porque o olho precisa chegar antes do ouvido.

## Zoom de ênfase (punch-in)
- `zooms: [{em: {fala: "nunca"}, escala: 1.12–1.2, duracao: 0.8–1.5}]`. `entrada: "seco"` (padrão) corta para o zoom, que é o estilo de criador de conteúdo; `"suave"` faz uma rampa curta.
- Use nos picos da fala (1 a cada 8–15 s), não em toda frase.
- `zoom` fixo num corte inteiro (`zoom: 1.12`) disfarça jump cuts no mesmo plano. `{de: 1, para: 1.08}` é uma aproximação lenta e dramática.

## Transições
Detalhes em `corte-e-ritmo.md`. Todas são CSS (rodam sem GPU) e ficam centradas no corte. Duração padrão: `cruzar` 0,35 s · `preto`/`branco` 0,5 s · `flash` 0,25 s · `deslizar` 0,4 s · `limpar` 0,45 s · `zoom` 0,35 s · `desfoque` 0,4 s · `iris` 0,5 s.

## Efeitos
- `flash`: clarão de 0,35 s no início de um bloco ou numa revelação. Combine com `sfx: "boom"` ou `"thud"`.
- `tremor`: impacto (0,3–0,5 s). Com moderação.
- `pb`: flashback, "antes".
- `desfoque`: transição de pensamento, censura rápida.
- `filtro` por corte: unifica a cor de clipes diferentes (`quente` em material frio de escritório, por exemplo). É CSS, não correção de cor profissional. Para vídeo muito escuro, prefira regravar ou avisar.
- `vinheta: 0.3–0.5` dá foco ao centro em material plano.

## Componente próprio (contador, gráfico, seta…)
Crie em `src/edicoes/<slug>/` e use como camada. O componente recebe `duracao` (em quadros) e as `props`. Ele roda dentro de uma `Sequence`, então `useCurrentFrame()` começa em 0 quando ele entra.

```tsx
// src/edicoes/<slug>/Contador.tsx
import React from "react";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {cor, escalaTipo, tipo, useEntrada, useSaida} from "../../lib";

export const Contador: React.FC<{duracao: number; ate: number; sufixo?: string}> = ({duracao, ate, sufixo = ""}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const k = escalaTipo(width, height);
  const v = Math.round(interpolate(f, [0, Math.min(duracao * 0.7, 36)], [0, ate], {extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)}));
  const entrada = useEntrada("pop");
  const saida = useSaida(duracao);
  return (
    <AbsoluteFill style={{justifyContent: "center", alignItems: "center", opacity: saida}}>
      <div style={{...tipo("display", 220 * k), color: cor("accent"), textShadow: "0 6px 30px rgba(0,0,0,.5)", ...entrada}}>
        {v}
        {sufixo}
      </div>
    </AbsoluteFill>
  );
};

// na edição
import {Contador} from "./Contador";
camadas: [{tipo: "componente", componente: Contador, props: {ate: 87, sufixo: "%"}, em: {fala: "oitenta e sete"}, duracao: 1.8}],
```

Regras para componentes:
- **Anime só pelo quadro** (`useCurrentFrame`, `interpolate`, `spring`). Nada de CSS animation, `setTimeout` ou `Math.random()` (use `random("semente")` do Remotion). O render é paralelo e fora de ordem.
- Cores e fontes do estilo: `cor("accent")`, `tipo("display", px)`, `alpha("background", .8)`. Tamanhos multiplicados por `escalaTipo(width, height)`, para valer em qualquer formato.
- Respeite a área segura: `areaSegura(width, height)` devolve `{top, bottom, left, right}` em px.
- Utilitários exportados por `../../lib`: `estilo`, `cor`, `alpha`, `tipo`, `raio`, `areaSegura`, `escalaTipo`, `useEntrada(animacao)`, `useSaida(frames)`, `usePosicao(posicao, padrao)`, `ClipeNoQuadro` (para pôr um clipe do registro dentro do componente), `clipe(id)`.

Para motion graphics mais pesados (cenas 3D, diagramas, gráficos animados), faça o trecho com a skill `video-explicativo-3d`, renderize e traga o MP4 como clipe (`npm run midia -- --pasta estudio-video/out`). Para as legendas saírem com a grafia do roteiro, importe a linha do tempo dele: `npm run midia -- transcrever <id> --alinhamento ../estudio-video/public/videos/<slug>/timeline.json --sem-refinar`.
