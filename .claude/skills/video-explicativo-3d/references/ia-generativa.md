# Ativos gerados por IA (narração, imagens, 3D, cenário 2.5D)

Use esta etapa quando o usuário pedir narração por IA, imagens geradas ou modelos 3D "únicos". Ela entra **antes da etapa 3** (timeline), porque a narração gerada é o áudio que cronometra o vídeo. Tudo é opcional e cada parte pode rodar sozinha.

| O quê | Como | Onde roda | Precisa de |
|---|---|---|---|
| Narração | OpenRouter, modelo com saída de áudio (`openai/gpt-audio`, voz `cedar`, reserva `ash`) | API | `OPENROUTER_API_KEY` |
| Imagens | OpenRouter `POST /api/v1/images` (padrão `google/gemini-3-pro-image`) | API | `OPENROUTER_API_KEY` |
| Imagem → modelo 3D | TripoSR (MIT), na CPU, cerca de 25 s por objeto | local | `npm run ia:setup` (torch CPU + pesos de ~1,7 GB) |
| Imagem → cenário 2.5D | Depth Anything V2 Small (mapa de profundidade) e malha deslocada | local | o mesmo setup |

O OpenRouter **não tem** modelos de imagem→3D. Por isso o 3D é gerado localmente a partir das imagens que ele cria.

## Fluxo

1. **Chave.** `OPENROUTER_API_KEY` deve estar nas variáveis do ambiente. Sem ela, os scripts param com uma mensagem clara. Nunca grave a chave em arquivo versionado.
2. **Especificação** `src/videos/<slug>/ia.json` (pode ser criada antes de `npm run new`):
   ```jsonc
   {
     "imageModel": "google/gemini-3-pro-image",
     "style": "…paleta e clima da série (cores do design system em hex)…",
     "objectStyle": "…UM objeto, inteiro, centrado, 3/4 de cima, fundo cinza liso, sem sombra…",
     "images": [
       {"name": "cenario", "relief": true, "aspect_ratio": "9:16", "resolution": "2K", "prompt": "…"},
       {"name": "objeto", "to3d": {"smooth": 4}, "aspect_ratio": "1:1", "resolution": "1K", "prompt": "…"}
     ]
   }
   ```
   - `to3d`: vira `.glb`. Aceita as opções do `imagem-para-3d.py`: `smooth` (0 para facetado), `faces`, `mc`, `fg`.
   - `relief`: gera também `<nome>.profundidade.png` para o `<Relevo>`.
   - `reference`: nome(s) de imagem já gerada, enviada como referência de estilo.
   - **Prompts de objeto definem a pose canônica** de que a cena depende (ex.: "martelo em pé como um T, cabo para baixo"). O `.glb` sai com Y para cima, base em y=0 e a frente para +Z, igual à foto.
3. **Gerar:** `npm run ia -- <slug> --script ../roteiros/<slug>.md`. Executa narração → imagens → 3D → relevo → `assets.json` → `npm run timeline`. Pula o que já existe, e `--force` refaz. Flags: `--voice`, `--model`, `--sem-narracao`, `--sem-imagens`, `--sem-timeline`.
4. **Conferir os modelos:** `.ia/venv/bin/python scripts/ia/previa-3d.py public/videos/<slug>/ia/3d/*.glb --out out/previa-3d.png` mostra frente, lado e cima. Corrija o prompt e regenere só aquele (`node scripts/ia/imagens.mjs <slug> --only nome --force`, depois o `imagem-para-3d.py` com `--force`).
5. **Usar na cena:** importe `public/videos/<slug>/ia/assets.json` como `GenAssets`.
   ```tsx
   import {GenModel, Relevo, type GenAssets} from "../../lib";
   import assetsJson from "../../../public/videos/<slug>/ia/assets.json";
   const A = assetsJson as unknown as GenAssets;
   <GenModel asset={A.models.objeto} height={1.2} color="accent" fallback={<MinhaGeometria h={1.2} />} />
   <Relevo asset={A.reliefs.cenario} width={3.3} relief={0.9} brightness={0.6} />   // em Scene3D com fog={null}
   ```
   - `GenModel` usa o **material do design system** (`look="ds"`), para manter a identidade da série. `look="gerada"` usa as cores por vértice do TripoSR, e `"tingida"` mistura as duas. `flat` deixa facetado.
   - Sempre passe um `fallback` com a mesma convenção (base em y=0, altura `h`): se um modelo falhar, o vídeo ainda renderiza.
   - `Relevo`: câmera a ~3× a largura, com push-in curto e deslize lateral leve. Por cima, um gradiente HTML no topo e na base para o título e a legenda ficarem legíveis.

## Direitos e coerência

- Imagens e narração geradas com a chave do usuário são ativos do projeto. Registre modelo e prompt (o `manifest.json` e o `narracao-openrouter.json` já fazem isso). Não gere pessoas reais nem marcas de terceiros.
- Todo prompt de imagem carrega a paleta do design system (hex) no `style`. Imagens fora da paleta quebram a série.
- Cenário 2.5D é **fundo**: o assunto da cena continua sendo o objeto 3D ou o número.
