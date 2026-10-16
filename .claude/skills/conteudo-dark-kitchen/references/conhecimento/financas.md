# Finanças da dark kitchen

Base educativa para conteúdo e respostas. Cite pelo ID (ex.: `FIN-04`). Os números dos exemplos são **ilustrativos**: deixe isso claro sempre que usá-los em conteúdo, e troque pelos números reais da marca quando houver. Percentuais de comissão, taxa e imposto mudam e variam por plano, cidade e regime: os dados atuais ficam em `mercado-e-regras.md`.

Sumário: FIN-01 Ficha técnica · FIN-02 CMV · FIN-03 Custos variáveis do pedido · FIN-04 Margem de contribuição · FIN-05 Precificação (markup) · FIN-06 Custos fixos e ponto de equilíbrio · FIN-07 DRE gerencial · FIN-08 Caixa, repasse e capital de giro · FIN-09 Indicadores · FIN-10 Promoções e cupons · FIN-11 Tributos (visão geral)

---

## FIN-01 Ficha técnica

A ficha técnica é a receita com gramagem e custo. Sem ela não existe CMV confiável, preço certo nem padrão de sabor.

Cada item tem:
- ingrediente, quantidade **bruta** usada, unidade e preço de compra;
- **fator de correção (FC)** do que perde no pré-preparo: `FC = peso bruto ÷ peso limpo`. Cebola comprada 1 kg que rende 850 g limpa → FC = 1,18. A R$ 6/kg, o quilo limpo custa R$ 7,06;
- custo por porção;
- **embalagem e descartáveis** (caixa, sacola, sachês, guardanapo, lacre, bilhete): em delivery fazem parte do custo do prato;
- rendimento, modo de preparo, foto do prato montado (padrão visual).

Exemplo ilustrativo — smash duplo:

| Item | Quantidade | Custo |
|---|---|---|
| Pão brioche | 1 un | R$ 1,80 |
| Blend (R$ 45/kg) | 180 g | R$ 8,10 |
| Cheddar (R$ 50/kg) | 30 g | R$ 1,50 |
| Cebola caramelizada | porção | R$ 0,60 |
| Molho da casa | porção | R$ 0,50 |
| Embalagem, sacola, sachês, guardanapo, lacre | kit | R$ 2,20 |
| **Custo direto do item** | | **R$ 14,70** |

Atualize quando o preço de um insumo importante mudar (na prática, revise todo mês).

## FIN-02 CMV (custo da mercadoria vendida)

- **CMV real do período** = estoque inicial + compras − estoque final.
- **CMV %** = CMV ÷ faturamento do período.
- Exemplo: estoque inicial R$ 8.000 + compras R$ 22.000 − estoque final R$ 7.000 = CMV R$ 23.000. Faturamento R$ 70.000 → CMV de 32,9%.
- **CMV teórico** = soma das fichas técnicas × quantidade vendida de cada item.
- **Real − teórico = vazamento:** desperdício, porção maior que a ficha, erro de ficha, item refeito, furto, insumo vencido. A diferença diz onde olhar.
- Faixas de CMV costumam ser citadas no mercado (algo como 25–35% para food service), mas variam muito por categoria e modelo. Use como alerta, não como meta; a meta sai da margem de contribuição (FIN-04) e do ponto de equilíbrio (FIN-06).

## FIN-03 Custos variáveis do pedido

Custos que só existem quando sai um pedido e crescem com ele:

- CMV do item + embalagem (FIN-01);
- **comissão do app** (% sobre o valor do pedido, depende do plano — ex.: plano em que o app entrega × plano em que a loja entrega);
- **taxa de pagamento online** do app ou da maquininha/link/Pix;
- **imposto sobre a venda** (no Simples Nacional, uma alíquota efetiva sobre o faturamento);
- **cupom ou desconto bancado pela loja**;
- entrega, quando a loja paga o entregador.

Pergunte sempre **sobre qual valor** cada percentual incide (com ou sem desconto, com ou sem taxa de entrega) e **quem banca** a promoção. Isso muda a conta.

## FIN-04 Margem de contribuição (MC)

**MC = preço − custos variáveis.** **MC % = MC ÷ preço.** É o que sobra de cada venda para pagar os custos fixos e dar lucro. É o número mais importante do delivery, e muda por canal.

Exemplo ilustrativo — o mesmo smash de R$ 38 (custo direto R$ 14,70; imposto suposto de 6%):

| | App (suposto: 25% somando comissão + pagamento online) | Canal próprio (suposto: 1% de taxa de pagamento) |
|---|---|---|
| Preço | R$ 38,00 | R$ 38,00 |
| Custo direto (FIN-01) | − R$ 14,70 | − R$ 14,70 |
| App / pagamento | − R$ 9,50 | − R$ 0,38 |
| Imposto (6%) | − R$ 2,28 | − R$ 2,28 |
| **MC** | **R$ 11,52 (30,3%)** | **R$ 20,64 (54,3%)** |

Leituras:
- "Faturamento é vaidade; margem é o que paga o boleto." Vender muito com MC baixa não fecha a conta.
- O canal próprio parece muito melhor, mas tem custos que não aparecem por pedido: entrega própria, marketing para trazer o cliente (CAC, `marketing.md` MKT-10), sistema. Compare o canal próprio **depois** desses custos.
- Compare MC **por item**: é a base da engenharia de cardápio (`negocios.md` NEG-03).

## FIN-05 Precificação (markup divisor)

Preço que cobre custos variáveis, fixos e lucro:

**Preço = custo direto ÷ (1 − (% variáveis + % fixos + % lucro desejado))**

- % variáveis: comissão + taxa de pagamento + imposto (+ cupom médio, se houver).
- % fixos: custos fixos do mês ÷ faturamento esperado do mês.
- Exemplo ilustrativo: custo direto R$ 14,70; variáveis 31% (25% app + 6% imposto); fixos 20%; lucro 10% → soma 61% → preço = 14,70 ÷ 0,39 = **R$ 37,69**.
- Multiplicar o custo "por 3" sem conta é o erro clássico: no app, a comissão sozinha pode levar um quarto do preço.
- **Preço por canal:** muitos restaurantes praticam preço maior no app para carregar a comissão. Confira as regras do contrato de cada app antes.
- Depois da conta, confira o preço contra o mercado (o que o cliente paga em produtos parecidos no raio de entrega). Se a conta dá um preço que o mercado não aceita, o problema é custo, porção ou modelo — não o preço.

## FIN-06 Custos fixos e ponto de equilíbrio

- **Custos fixos:** existem mesmo sem pedido — aluguel ou cota do hub, salários e encargos, **pró-labore**, contador, sistemas, energia e gás base, internet, manutenção, parcelas.
- **Ponto de equilíbrio (faturamento) = custos fixos ÷ MC % média.**
- **Ponto de equilíbrio (pedidos) = custos fixos ÷ MC média por pedido.**
- Exemplo ilustrativo: fixos R$ 18.000/mês; MC média 30%; ticket médio R$ 50 (MC de R$ 15 por pedido) → PE = R$ 60.000/mês = 1.200 pedidos/mês ≈ **40 pedidos por dia** (30 dias abertos) só para empatar.
- Transformar o PE em "pedidos por dia" deixa a meta concreta para a equipe e é um ótimo gancho de conteúdo.

## FIN-07 DRE gerencial simples (mensal)

| Linha | Exemplo do que entra |
|---|---|
| Faturamento bruto, **por canal** | app A, app B, canal próprio, retirada |
| (−) Impostos sobre a venda | Simples Nacional ou outro regime |
| (=) Receita líquida | |
| (−) Custos variáveis | CMV, embalagem, comissões, taxas de pagamento, cupons, entrega paga pela loja |
| (=) **Margem de contribuição** | por canal e total |
| (−) Custos fixos | pessoal, pró-labore, aluguel/hub, contador, sistemas, energia, marketing fixo |
| (=) **Resultado operacional** | |
| (−) Parcelas de empréstimo, investimentos | |
| (=) **Sobra de caixa do mês** | |

Feche todo mês, no mesmo dia. Um DRE por canal mostra se o app está pagando a conta ou só gerando movimento.

## FIN-08 Caixa, repasse e capital de giro

- **Lucro não é caixa.** O app repassa o dinheiro com prazo (semanal, quinzenal ou mensal, conforme o plano); antecipar costuma ter custo. O fornecedor cobra à vista ou em poucos dias. Esse descompasso é o **capital de giro** que a operação precisa ter.
- **Projeção de caixa** semanal para as próximas 4–8 semanas: entradas previstas (repasses por data) × saídas (fornecedores, folha, aluguel, impostos, parcelas).
- **Conta PJ separada da PF.** Misturar é a forma mais rápida de não saber se o negócio dá lucro.
- **Pró-labore fixo**, como custo fixo. "Tirar do caixa quando sobra" esconde o prejuízo.
- **Reserva:** meta de alguns meses de custos fixos guardados, para chuva de cancelamentos, equipamento quebrado ou mês fraco.

## FIN-09 Indicadores financeiros

| Indicador | Conta | Para que serve |
|---|---|---|
| Ticket médio | faturamento ÷ pedidos | combos e adicionais sobem o ticket |
| CMV % | FIN-02 | controle de compra, porção e desperdício |
| MC % por canal e por item | FIN-04 | onde o dinheiro é feito de verdade |
| Custo de pessoal % | folha + encargos + pró-labore ÷ faturamento | dimensionar equipe e escala |
| Prime cost % | (CMV + pessoal) ÷ faturamento | os dois maiores custos juntos; um alerta rápido |
| Ponto de equilíbrio | FIN-06 | meta mínima de pedidos por dia |
| Margem líquida | sobra de caixa ÷ faturamento | se o negócio paga o esforço |
| Dias de caixa | caixa ÷ custo médio diário | quantos dias a empresa aguenta sem vender |

Referências de mercado para esses indicadores variam por categoria e fonte; use as da marca ao longo do tempo (tendência) como principal comparação.

## FIN-10 Promoções e cupons

Desconto diminui a MC de **todos** os pedidos com desconto, não só dos "novos". Conta antes de lançar:

**Pedidos necessários para manter a MC total = MC antes ÷ MC depois.**

Exemplo ilustrativo (smash de R$ 38, FIN-04, canal app, desconto bancado pela loja, percentuais sobre o valor pago):
- Desconto de 20% → preço R$ 30,40; app 25% = R$ 7,60; imposto 6% = R$ 1,82; custo direto R$ 14,70 → MC **R$ 6,28** (antes, R$ 11,52).
- Para ganhar o mesmo, precisa de 11,52 ÷ 6,28 ≈ **1,83× os pedidos — 83% a mais, quase o dobro.**

Promoção boa tem: objetivo (trazer cliente novo, subir ticket, encher horário fraco), prazo, regra clara, conta feita e medição depois. Combos e brindes de custo baixo e valor percebido alto costumam preservar mais margem que desconto em porcentagem. Promoções em app frequentemente são cofinanciadas; confira quanto a loja banca.

## FIN-11 Tributos (visão geral)

- O regime (MEI, Simples Nacional, Lucro Presumido…) muda quanto do faturamento vira imposto. Dados atuais (limites, anexos, alíquotas iniciais, Reforma Tributária): `mercado-e-regras.md`.
- Em conteúdo, ensine **o raciocínio** (imposto é custo variável, entra na precificação e na MC) e mande validar com contador. Não dê enquadramento tributário individual como certo.
