---
name: identidade-visual-html
description: Use sempre que for criar ou ajustar uma apresentação, relatório, dashboard, check-in ou deck em formato HTML (site de uma página) para cliente, e o usuário quiser manter o padrão visual já estabelecido — cores, gradiente, tipografia e componentes. Disparar também quando o usuário disser algo como "no nosso padrão", "com a nossa cara", "mesmo estilo de sempre", "igual ao último deck" ou pedir uma apresentação/relatório visual sem especificar cores do zero. Não se aplica a arquivos .docx, .pdf ou .pptx (essas seguem as skills docx/pdf/pptx) — é específica para o formato HTML de página única navegável por âncoras.
---

# Identidade Visual — Apresentações HTML

## Quando usar

Sempre que o entregável for uma apresentação ou relatório em **HTML de página única** para cliente (check-in quarter, QBR, relatório de performance, review mensal, proposta, dashboard). Esta skill define apenas o **visual** (cores, tipografia, componentes, animações). Para o conteúdo/narrativa de check-in quarter especificamente, usar em conjunto com a skill `gerar-checkin-quarter`. Para outras narrativas (proposta comercial, relatório de projeto, etc.), usar esta skill para o visual e construir a narrativa conforme o pedido do usuário.

Por padrão, **manter os tokens abaixo sem alteração**. Só trocar cores/fontes se o usuário pedir explicitamente uma paleta ou identidade diferente para aquele entregável específico.

## Fluxo de trabalho

1. Ler `references/design-tokens.md` para os tokens completos (cores, tipografia, componentes) antes de escrever qualquer HTML.
2. Copiar `templates/base.html` como ponto de partida — já traz nav, hero, seções de conteúdo, tabelas, gráficos Chart.js, funil interativo, cards de diagnóstico, objetivo/KRs e plano de ação prontos e estilizados.
3. Adaptar apenas o conteúdo (textos, números, seções necessárias) e remover componentes que não se aplicam ao pedido — não recriar o CSS do zero.
4. Embutir a logo do cliente em base64 (ver seção "Regras de Logo" abaixo) — nunca referenciar por caminho de arquivo.
5. Validar antes de entregar (ver checklist no final).

## Paleta de Cores

Fundo escuro com gradiente vermelho/laranja como assinatura visual. Variáveis CSS (`:root`):

```css
--bg-0:#0e0203;        /* fundo mais escuro, quase preto */
--bg-1:#2c0608;        /* fundo escuro secundário */
--bg-2:#4a0d10;        /* fundo médio */
--red:#c81e2c;         /* vermelho base */
--red-bright:#ea3b28;  /* vermelho vibrante — CTAs, destaques, header de tabela */
--orange:#ff7a45;      /* laranja — acentos, bordas de destaque */
--rose-muted:#8a4a4d;  /* rosa acinzentado — séries "ano anterior"/comparativo em gráficos */
--panel:rgba(38,9,11,0.6);      /* fundo de card translúcido */
--panel-solid:#26090b;          /* fundo de card sólido */
--border:rgba(255,255,255,0.14);/* borda padrão dos cards */
--text:#ffffff;
--text-dim:rgba(255,255,255,0.72);
--text-faint:rgba(255,255,255,0.5);
--yellow:#f4c430;      /* badges de atenção, custo, "fator agravante" */
--yellow-text:#2b1600;
--green:#31c46a;       /* positivo, meta atingida */
--green-text:#04220f;
--table-header:#7c1015; /* header das tabelas */
```

Regra de uso: vermelho/laranja = marca e destaque; amarelo = atenção/custo; verde = positivo/meta batida; vermelho vivo (`#ff5b47` em contexto de status) = negativo/abaixo do esperado.

## Tipografia

- **Google Fonts**: `Anton` (display) + `Manrope` (texto), pesos 400–800.
- Import: `<link href="https://fonts.googleapis.com/css2?family=Anton&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">`
- Títulos grandes (`h1`, `h2` de seção, capa, rodapé): classe `.display` (`font-family:'Anton'`), sempre **uppercase**, `letter-spacing` sutil.
- Corpo de texto: `Manrope`, peso 400–600 para parágrafos, 700–800 para números/labels.
- Rótulos "eyebrow" (acima dos títulos de seção, tipo "01 · PERFORMANCE"): uppercase, `letter-spacing: 6px`, `font-size: 12px`, `font-weight: 700`, cor `--text-dim`.

## Estrutura de Página

1. **Nav fixa** (`position: sticky`) translúcida com blur, logo à esquerda + links âncora para cada seção à direita. Esconder os links em telas < 960px.
2. **Hero/capa**: fundo "sunburst" (radial-gradient laranja→vermelho→escuro saindo de um ponto, ~78% 8%), título gigante `.display` uppercase, subtítulo do período, chips de agenda (pills) linkando para as âncoras, 2–3 estatísticas grandes com contador animado.
3. **Content sections**: fundo escuro em gradiente linear, alternando entre duas variações (`.content` e `.content.alt`) a cada seção para dar ritmo visual sem cansar.
4. **Footer**: reaproveita o fundo "sunburst" (radial-gradient), título grande "Obrigado!" ou equivalente.

## Componentes Reutilizáveis

Todos definidos em `templates/base.html` — não recriar do zero:

| Componente | Uso |
|---|---|
| `.chip` | Pills de navegação/agenda na capa |
| `.stat-big` + `.stat-mini-grid` | Números grandes de destaque com contexto ao lado |
| `.table-wrap` + `table` | Tabelas com header vermelho (`--table-header`) e linhas zebradas |
| `.insight` | Card de destaque com borda lateral laranja para leitura/conclusão |
| `.vs-grid` | Comparativo lado a lado (ex: ano a ano) com badge circular "VS" no meio |
| `.funnel-wrap` + `.funnel-tabs` | Funil de conversão interativo com abas (ex: por mês) e barras animadas em escala logarítmica |
| `.trava-grid` + `.trava-card` | Cards de diagnóstico/causa-raiz, com tag de prioridade e mini-gráfico (sparkline) |
| `.smart-card` + `.kr-grid` + `.kr-card` | Objetivo SMART e KRs com barra de progresso colorida (vermelho/amarelo/verde conforme distância da meta) |
| `.plan-table` | Tabela de plano de ação 5W2H |

## Gráficos (Chart.js)

- CDN: `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.0/chart.umd.min.js`
- Tema escuro global: `Chart.defaults.color = 'rgba(255,255,255,0.68)'`, grid `rgba(255,255,255,0.07)`, fonte `Manrope`.
- Paleta dos gráficos: `--red-bright` para o dado atual/principal; `--rose-muted` para comparativo (ano anterior, baseline); `--green` para métricas positivas (ex: doughnut de vendas ganhas); `--yellow` para linhas de custo/ROAS.
- Tipos usados com frequência: combo bar+line (ex: faturamento × ROAS), barras agrupadas (comparativo ano a ano), doughnut (proporções), sparkline sem eixos dentro dos cards de trava.

## Animações

- **Reveal on scroll**: `IntersectionObserver` adiciona classe `.in` a elementos `.reveal` (fade + translateY). Usar `threshold: 0.01` e `rootMargin: '0px 0px -40px 0px'` para disparar cedo.
- **Fallback de segurança obrigatório**: sempre incluir `setTimeout` (~3.5s) e listener de `beforeprint` que forçam todos os `.reveal` a aparecerem, mesmo sem scroll. Sem isso, seções abaixo da dobra podem ficar invisíveis ao imprimir/exportar em PDF ou em screenshots automáticos — isso já causou bug real em entregas anteriores, não pular essa etapa.
- **Contadores animados** (count-up) nos números grandes: mesmo padrão de fallback (flag `dataset.counted` para não duplicar a animação).
- **Barras de progresso dos KRs**: preenchem ao entrar na tela e mudam de cor conforme a distância da meta (`< 60%` vermelho, `60–90%` amarelo, `≥ 90%` verde).

## Regras de Logo

- **Sempre embutir a logo do cliente em base64** diretamente no HTML (`src="data:image/png;base64,..."`), nunca referenciar por caminho de arquivo (`assets/logo.png`) — o arquivo precisa funcionar sozinho mesmo se movido de pasta ou salvo separado.
- **Sem caixa/fundo branco atrás da logo.** Ela fica direto sobre o fundo. Se a marca do cliente tiver traços escuros/pretos (ilegíveis em fundo escuro), aplicar `filter: drop-shadow(0 0 2px rgba(255,255,255,0.85))` para dar contorno claro sutil sem criar um bloco sólido.
- Logo aparece só **2 vezes**: pequena na navbar e grande no hero. Não repetir no rodapé nem em outras seções.

## Checklist de Validação Final

Antes de entregar:

- [ ] Nenhum `<img src="...">` aponta para arquivo externo — todas as imagens/logo em base64.
- [ ] Todo elemento `.reveal` tem cobertura do fallback (`setTimeout` + `beforeprint`) no script.
- [ ] Todo `href="#id"` da navegação tem um `id` correspondente na página (checar com script Python simples de regex se não houver `validate_html.py` disponível).
- [ ] Paleta de cores não foi alterada sem pedido explícito do usuário.
- [ ] Título e corpo usando `Anton`/`Manrope` conforme definido, não fontes padrão do sistema.
- [ ] Sem seção de "notas internas" ou premissas de extração visível no HTML final.
- [ ] Testado pelo menos um breakpoint mobile (~390px) — `.hero-stats`, `.charts-grid`, `.vs-grid`, `.trava-grid`, `.kr-grid` e `.funnel-row` têm regras de colapso para telas estreitas.
