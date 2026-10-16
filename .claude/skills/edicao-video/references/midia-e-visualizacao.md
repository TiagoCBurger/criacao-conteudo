# Mídia: encontrar, preparar e ver

## O que `npm run midia` faz

1. **Procura** vídeos, áudios e imagens a partir da raiz do projeto (`estudio.config.json › pastasMidia`, padrão `..`). Ignora `node_modules`, `.git`, `out`, pastas ocultas, o próprio estúdio e qualquer pasta que seja um projeto Remotion (`estudio-video/`, por exemplo). Para restringir: `--pasta brutos` ou `--pasta brutos,entrevistas` (relativas à raiz do projeto). Uma pasta passada explicitamente é varrida mesmo se for de outra ferramenta (ex.: `--pasta estudio-video/out` para usar um vídeo explicativo já renderizado).
2. **Prepara** uma cópia de trabalho de cada arquivo novo ou alterado (compara tamanho e data):
   - vídeo → `public/midia/<id>.mp4`: H.264 CRF 17, quadros constantes na taxa padrão mais próxima (24/25/30/48/50/60/120), keyframe a cada 1 s (busca rápida no Remotion), até 3840 px no lado maior (`--leve`: até 1920, mais rápido), AAC 48 kHz. **HDR (HLG/PQ de iPhone) é convertido para SDR** com mapeamento de tons. Pixels não quadrados são corrigidos e a rotação do celular é aplicada.
   - áudio → `public/midia/<id>.m4a` · imagem → copiada (HEIC/TIFF/AVIF viram JPG).
3. **Analisa**: duração, resolução, fps, loudness (e o ganho para a fala chegar a −16 LUFS), silêncios, cortes de câmera (mudança de cena), pôster, **prancha de contato** com tempos, forma de onda.
4. **Transcreve** a fala dos vídeos (palavra a palavra, com início e fim). Áudios só com `--transcrever-audio` ou `npm run midia -- transcrever <id>`. Clipes quase sem som são marcados como "sem fala".
5. Grava tudo em `src/midia/registro.json` (versionado, com as transcrições) e gera a galeria.

As cópias de trabalho são a fonte do render e ficam em `public/midia/` (fora do git). Num clone novo, `npm run midia` as recria a partir dos originais, reaproveitando as transcrições do registro.

### Ids
O id vem do nome do arquivo (`Entrevista João.MOV` → `entrevista-joao`) e não muda depois: as edições referenciam clipes por id. Se o arquivo original mudar de lugar, o registro marca `ausente` e a cópia de trabalho continua funcionando. `npm run midia -- remover <id>` tira do registro (não apaga o original).

## Transcrição

| Opção | Quando |
|---|---|
| `--stt whisper` (padrão) | local e gratuito. Modelo `large-v3-turbo` (precisão boa em pt). `--modelo small` é ~4× mais rápido e serve para material limpo. A 1ª vez compila o whisper.cpp e baixa o modelo (minutos). |
| `--stt openrouter` | rápido e sem instalar nada. Usa `OPENROUTER_API_KEY` do `.env` do projeto e manda o áudio para o provedor (pergunte à pessoa se o conteúdo pode sair da máquina). Padrão `openai/whisper-large-v3-turbo`; troque com `--modelo`. Custa centavos por hora. |

`--idioma pt` é o padrão. Se o vídeo é em outro idioma, passe `--idioma en`, `es`…

**Bordas das palavras.** O reconhecedor costuma esticar a última palavra por cima da pausa seguinte. O script corrige início e fim de cada palavra com os silêncios medidos no áudio, porque é ali que os cortes acontecem. Mesmo assim, a transcrição pode errar palavras (nomes próprios, gírias). Para âncoras de corte, use as palavras **como aparecem no registro/`npm run cortes`**, não como deveriam ser.

Retranscrever um clipe: `npm run midia -- transcrever <id> [--stt openrouter] [--modelo small]`.

## Como você (Claude) vê o material

- `public/midia/<id>/prancha.jpg`: até 36 quadros do clipe inteiro, com o tempo de cada um. É a primeira coisa a abrir.
- `npm run midia -- ver <id> --de 30 --ate 45 [--cada 0.5]` gera em `out/ver/` uma prancha só do trecho, para achar o instante exato de um gesto, a troca de slide ou onde a pessoa sai do quadro.
- `npm run midia -- quadro <id> 12.5,40` gera quadros em resolução cheia, para decidir o `foco` (onde está o rosto) e ler texto na tela.
- `npm run cortes -- <id>`: a fala em frases, com tempos.
- O registro tem `silencios` e `cenas` (cortes de câmera) de cada clipe.

Abra as imagens com a ferramenta de leitura de imagem e descreva para a pessoa o que encontrou quando isso ajudar a decidir (ex.: "no clipe 2 você olha para a câmera a partir de 0:14").

## Como a pessoa vê o material

- **Galeria** (`npm run galeria -- --abrir`, ou abrir `estudio-edicao/out/galeria.html`): todas as edições renderizadas e toda a mídia do projeto, com player, prancha, forma de onda, cortes de câmera clicáveis e a transcrição que pula para o trecho. Tem busca por nome **e por fala**. Mostre a ela quando for escolher trechos juntos ("me diz em qual frase começa").
- **Remotion Studio** (`npm run studio`): pasta **Midia** com um item por vídeo (timecode, fala em destaque, barra de silêncios em cinza e cortes de câmera em amarelo) e pasta **Edicoes** com cada edição, para assistir e navegar quadro a quadro.

## Problemas comuns

| Sintoma | Causa → solução |
|---|---|
| `✗ … Invalid data` ao preparar | arquivo corrompido ou ainda sendo copiado. Espere terminar a cópia e rode de novo |
| HDR "lavado" (aviso `sem tone mapping`) | o ffmpeg da máquina não tem `zscale`. Instale um ffmpeg completo (macOS: `brew install ffmpeg`) e rode `npm run midia -- --forcar` |
| prancha sem os tempos escritos | ffmpeg sem `drawtext`/fontconfig. A prancha continua válida: a ordem é cronológica, a cada `duração/36` s |
| whisper não instala | faltam `git`, `make`, `cmake` ou compilador, ou não há acesso a github.com/huggingface.co. Use `--stt openrouter` |
| transcrição lenta | `--modelo small`, ou `--stt openrouter`. Rode em segundo plano |
| palavra errada na transcrição | normal em nomes e termos técnicos. Ancore cortes em palavras vizinhas ou em segundos. A legenda mostra o que foi reconhecido: avise a pessoa ou corrija com segundos + texto próprio |
| clipe novo não aparece | está numa pasta ignorada, ou é um formato não reconhecido. Use `--pasta` ou converta |
