# Conferência, render e problemas

## Ciclo de conferência
1. `npm run typecheck`: zero erros.
2. `npm run check -- <slug>`: **leia a tabela**. Cada linha mostra o corte no tempo de saída, o trecho de origem, a velocidade, a transição e a fala que ficou dentro. Leia as falas em sequência, como um roteiro. Os avisos (corte curto demais, transição sem sobra, fala fora da edição) aparecem logo abaixo.
3. Abra `out/check/<slug>/prancha.jpg` (um quadro a cada 1,5 s; `--every 1` para mais). Use `--safe` para ver as zonas de interface (vermelho) e a faixa da legenda (amarelo). `--at 3.2,7.9` gera quadros exatos em resolução cheia.
4. Corrija e repita. `npm run check -- <slug> --so-resumo` é rápido para revisar só os cortes.
5. Ritmo e áudio: `npm run render -- <slug> --rascunho` (meia resolução) para a pessoa assistir, ou o `npm run studio`.

## Checklist

**Montagem**
- [ ] A 1ª frase é o gancho. Não há "oi, tudo bem" nem silêncio no começo.
- [ ] Lendo as falas da tabela em ordem, o texto faz sentido e não muda o que a pessoa quis dizer.
- [ ] Nenhuma retomada ficou (frase dita duas vezes) e nenhum vício isolado ficou.
- [ ] Nenhum corte termina ou começa no meio de palavra (a fala da tabela começa e termina em palavras inteiras).
- [ ] Duração dentro do pedido.

**Imagem**
- [ ] O rosto está enquadrado (olhos a ~35–40% da altura) em todos os cortes de câmera. O `foco` está certo para cada clipe.
- [ ] Nada importante nas zonas vermelhas (`--safe`), nem atrás da legenda.
- [ ] No máximo um elemento além da legenda por quadro. Título e legenda não colidem.
- [ ] Texto legível: contraste, tamanho, tempo de leitura.
- [ ] Transições com propósito e consistentes. Sem tela preta ou vazia fora de transições.
- [ ] Nada parado por mais de ~4 s em formato curto (vertical).

**Som** (pelo plano e pelo relatório do render)
- [ ] Trilha licenciada ou gerada; ducking ligado.
- [ ] Efeitos nos eventos certos, sem metralhar e sem cobrir palavra-chave.
- [ ] O render reporta −16…−12 LUFS, sem clipping.

**Identidade**
- [ ] Cores e fontes do estilo (`grep -n "#[0-9a-fA-F]\{6\}\|fontFamily" src/edicoes/<slug>` volta vazio, exceto em casos justificados).

## Render
```bash
npm run render -- <slug>                  # final: out/<slug>.mp4 + -capa.jpg + .srt
npm run render -- <slug> --rascunho       # meia resolução, rápido
npm run render -- <slug> --capa 2.4       # instante da capa
npm run render -- <slug> --concurrency 2  # menos abas (máquina com pouca memória)
```
Saída H.264 yuv420p + AAC 48 kHz, áudio masterizado em −14 LUFS. Rode em segundo plano: 1 min de vídeo 9:16 leva alguns minutos. Material 4K deixa o render mais lento. Para edições longas, `npm run midia -- --leve --forcar` refaz as cópias de trabalho em até 1080p.

## Problemas comuns

| Sintoma | Causa → solução |
|---|---|
| `clipe "x" não está no registro` | rode `npm run midia` (e `-- listar` para ver os ids) |
| `fala de início "…" não encontrada` | as palavras não batem com a transcrição (grafia, número escrito "3" × "três", palavra que o reconhecedor errou). A mensagem lista palavras parecidas. Use `npm run cortes -- <clipe>` para copiar o texto exato, ou use segundos |
| `fala "…" não aparece no vídeo final` | o momento aponta para uma frase que ficou fora dos cortes. Escolha outra âncora ou `{corte: n}` |
| frase repetida pega o take errado | `apos: <segundos>` no corte |
| última sílaba cortada | `folga: [0.1, 0.25]` no corte |
| rosto cortado no vertical | ajuste `foco.x` (veja `npm run midia -- quadro <id> <t>`); se a pessoa se move, divida o corte |
| `transição … sem mídia de sobra` | o corte começa no início do clipe (ou termina no fim). Normal no 1º/último corte; a transição cobre um pouco do conteúdo |
| `delayRender … not cleared` / timeout | cópia de trabalho ausente (rode `npm run midia`), arquivo corrompido, ou fonte inexistente no design system |
| render muito lento | 4K, `desfocar` (decodifica o clipe duas vezes), muitos b-rolls simultâneos. Use `--concurrency` menor ou `npm run midia -- --leve --forcar` |
| vídeo travando/pulando quadros | origem com taxa variável sem preparo; rode `npm run midia -- --forcar` |
| legenda com palavra errada | a transcrição errou. Troque por `--stt openrouter`/modelo maior (`npm run midia -- transcrever <id> --modelo large-v3-turbo`) ou desligue a legenda naquele trecho (`ocultar`) e use um `texto` |
| `Detected differing memory amounts` no log | aviso inofensivo do Remotion em contêiner |
