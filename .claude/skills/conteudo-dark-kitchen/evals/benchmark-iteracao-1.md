# Benchmark — iteração 1 (16/10/2026)

4 pedidos realistas, cada um rodado uma vez **com** a skill e uma vez **sem** ela (mesmo modelo), avaliados por um corretor independente contra as afirmações de `evals.json`.

| Eval | Com a skill | Sem a skill | O que separou |
|---|---|---|---|
| 1. Brasa Burger — 3 roteiros de Reels | 10/10 | 4/10 | sem a skill: sem ganchos alternativos nem lista de takes, comida só aos 7–15 s, um roteiro abre com "sejam bem-vindos", deboche de observações reais de clientes, perfil não salvo |
| 2. Sushi da Madrugada — calendário de novembro | 8/8 | 7/8 | sem a skill: mecânica da oferta de Black Friday inventada e posta em legenda pronta |
| 3. Consultor — "refém do app" (Reels + carrossel) | 7/7 | 6/7 | sem a skill: o app nomeado como "sequestrador" e "Síndrome de Estocolmo" na capa |
| 4. Marmita fit — bilhetes e combos | 6/6 | 5/6 | sem a skill: combo "Tá Magrinho, Come Mais" (comentário sobre corpo) |
| **Total** | **31/31 (100%)** | **22/31 (≈74% de média por eval)** | |

Custo: com a skill, ~2,3× mais tempo (541 s × 232 s em média) e ~1,7× mais tokens; respostas 1,4–1,8× mais longas.

Ajustes feitos depois desta rodada:
- Itens comuns a todas as peças (luz, ordem de gravação, zonas seguras) vão uma vez só na entrega.
- Nada de inventar itens do cardápio ou ingredientes (entra no checklist de revisão).
- Conteúdo B2B com ações concretas e as contas da base (`conhecimento/financas.md`): os passos práticos com a skill tinham saído mais genéricos que sem ela.
- Comida fit: sem promessa de resultado nem piada com corpo.
- Marcas de madrugada: datas que começam à 00h (Black Friday) caem no turno da noite anterior; cuidado com trocadilhos com "black" perto de 20/11.
- Base de conhecimento citável (FIN/MKT/NEG/MER/P/APR) e aprendizado em tempo real.

Limites: uma execução por configuração (indica direção, não significância). As afirmações dos evals 2–4 quase não discriminam; próximos testes devem medir duração dos roteiros, concisão, especificidade das ações B2B e uso correto da base (citação de IDs, dado com data).
