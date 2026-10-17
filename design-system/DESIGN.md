# Design system — Leilão Noturno
Origem: criado em 17/10/2026 para a série de vídeos explicativos de marketing (primeiro vídeo: leilão de anúncios), a partir do preset `cinematic` da skill `video-explicativo-3d`. Não havia identidade anterior no repositório.
Direção de arte: **cinematic**. O assunto (dinheiro, disputa, "quem leva") pede o clima de um leilão à noite: escuro, uma luz âmbar no que está em jogo, metal e madeira.
HUD: minimal

## Cores
- background `#07080B` / backgroundAlt `#0D0F14`: preto quente, fundo de sala escura.
- primary `#B9B4AA` (estanho): volumes 3D neutros, colunas e objetos fora de foco.
- secondary `#5D5A55`: o "perdedor" numa comparação e os objetos apagados.
- **accent `#FFB23E` (âmbar)**: a luz do leilão. Vai **só** no que está em foco (o lance vencedor, o número-chave, a joia da qualidade), uma vez por cena.
- text `#F4F1EA` (branco quente) / textMuted `#958F86`.
- glow `#C9822B` com `background.glow: 0.22`: o halo do fundo é um âmbar queimado e discreto, nunca laranja vivo.

## Tipografia
- display **Bricolage Grotesque 800**: números heróis e títulos de até ~5 palavras. Grotesca com personalidade, que pesa bem em vídeo vertical.
- body **Inter 500/700**: legendas e rótulos curtos.
- mono **JetBrains Mono 500**: rótulos técnicos pequenos (fórmulas, "lance × nota").

## 3D · Movimento · Som
- Material `metal` (rugosidade 0.3), luz `noir` (cone de cima e recorte âmbar), neblina relativa `{near 1.05, far 2.4}`, lente longa (fov 26).
- **Modelos gerados por IA** (`npm run ia`): imagem gerada no OpenRouter, convertida em malha 3D pelo TripoSR (local). Na cena, recebem o **material do design system** (não a cor da imagem), para continuarem coerentes com o resto da série. A cor gerada fica disponível (`vertexColors`) para usos pontuais.
- **Cenários 2.5D**: imagem gerada mais o mapa de profundidade (Depth Anything V2), deslocando uma malha densa. A câmera anda poucos graus, com paralaxe real. Use como fundo, sempre escurecido pela neblina, nunca como assunto principal com texto por cima.
- Movimento `confident`: molas amortecidas (pop damping 20), transição `blur` de 0,55 s, deriva de câmera 0,4.
- Som `crisp`, efeitos a 0,32, transição `whoosh-soft`. Trilha só se o usuário fornecer ou pedir uma gerada.

## Regras
- Uma mensagem por tela: 1 visual principal e no máximo 1 bloco de texto (≤ 5 palavras ou um número) além da legenda.
- O âmbar sinaliza, não decora: se dois objetos estão em âmbar na mesma cena, um deles está errado.
- Imagens geradas seguem o `style` de `src/videos/<slug>/ia.json` (paleta preto, estanho e âmbar). Objetos para 3D usam `objectStyle`, com fundo cinza liso e o objeto inteiro no quadro, que é o que o TripoSR precisa.
- Nada de pessoas realistas geradas: personagens são figuras abstratas (`Character look="figure"`) ou objetos.

## Substituições / pendências
- Nenhuma fonte substituída (todas do Google Fonts, licença OFL).
