# Benchmark — video-explicativo-3d · iteração 2

Temas novos, só com a skill (3 vídeos).

| Métrica | Com a skill |
|---|---|
| Taxa de aprovação | 91% ± 9% |
| Tempo | 52 min ± 9 min |
| Tokens | 313 mil ± 22 mil |

| Eval | Aprovação |
|---|---|
| gps-sem-identidade-tech | 11/11 |
| estufa-figma-tokens | 9/11 |
| vacina-ds-cinematico | 10/11 |

## Notas

- Iteração 2 roda só com a skill (temas novos: GPS, efeito estufa, vacina), para validar a nova direção de arte (técnico/cinematográfico) e o HUD mínimo depois do feedback da iteração 1. Sem baseline: a iteração 1 já mostrou 97% com skill × 33% sem.
- GPS (sem identidade, pediu 'sério, tech'): 11/11. Criou o design system 'Sinal' com art.direction technical, aramado + toques cinematográficos.
- Efeito estufa (tokens do Figma): 9/11. Falhas: dois blocos de texto na comparação 280×420 ppm e push-in da câmera levando o planeta para a faixa da legenda (15,5–18,4 s).
- Vacina (DS cinematográfico existente): 10/11. Falha: push-in da cena 5 leva uma célula para a faixa da legenda (22,4–24,1 s). Tokens do DS intactos.
- Padrão comum das falhas: movimento de câmera de aproximação sem checar o último quadro contra a faixa da legenda (2 de 3 vídeos). Corrigido na skill com frameSafe() + faixa da legenda desenhada no check --safe.
- Bugs da biblioteca achados pelos agentes e corrigidos: neblina presa à câmera inicial (constelação apagava ao afastar), halo cortado por superfície (Glow overlay), vidro leitoso em canvas transparente (TransmissionBackdrop) e vidro que não refrata vidro (opaque).
- Tempo médio ~52 min por vídeo (render em software, máquina compartilhada por 3 agentes); ~313 mil tokens por vídeo.
