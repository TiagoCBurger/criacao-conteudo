# Design Tokens — Referência Completa

Este arquivo traz o CSS completo extraído do primeiro deck construído nesse padrão (Check-in Quarter). Use como fonte da verdade para qualquer apresentação HTML nova. O `templates/base.html` já aplica tudo isso — normalmente você não precisa copiar daqui manualmente, só consultar se precisar entender ou ajustar algum detalhe pontual.

## CSS completo

```css
  :root{
    --bg-0:#0e0203;
    --bg-1:#2c0608;
    --bg-2:#4a0d10;
    --red:#c81e2c;
    --red-bright:#ea3b28;
    --orange:#ff7a45;
    --rose-muted:#8a4a4d;
    --panel:rgba(38,9,11,0.6);
    --panel-solid:#26090b;
    --panel-light:rgba(255,255,255,0.05);
    --border:rgba(255,255,255,0.14);
    --text:#ffffff;
    --text-dim:rgba(255,255,255,0.72);
    --text-faint:rgba(255,255,255,0.5);
    --yellow:#f4c430;
    --yellow-text:#2b1600;
    --green:#31c46a;
    --green-text:#04220f;
    --table-header:#7c1015;
  }
  *{box-sizing:border-box; margin:0; padding:0;}
  html{scroll-behavior:smooth;}
  body{
    font-family:'Manrope', sans-serif;
    background:#120306;
    color:var(--text);
    line-height:1.55;
    overflow-x:hidden;
  }
  .display{font-family:'Anton', sans-serif; font-weight:400; letter-spacing:0.5px;}
  .eyebrow{text-transform:uppercase; letter-spacing:6px; font-size:12px; font-weight:700; color:var(--text-dim);}
  a{color:inherit;}
  img{max-width:100%; display:block;}

  /* ---------- reveal animation ---------- */
  .reveal{opacity:0; transform:translateY(28px); transition:opacity .8s cubic-bezier(.2,.7,.3,1), transform .8s cubic-bezier(.2,.7,.3,1);}
  .reveal.in{opacity:1; transform:translateY(0);}
  .reveal.d1{transition-delay:.08s;} .reveal.d2{transition-delay:.16s;} .reveal.d3{transition-delay:.24s;}
  .reveal.d4{transition-delay:.32s;} .reveal.d5{transition-delay:.4s;} .reveal.d6{transition-delay:.48s;}

  @keyframes pulseGlow{
    0%,100%{opacity:.55;} 50%{opacity:1;}
  }
  @keyframes floatSlow{
    0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);}
  }

  /* ---------- NAV ---------- */
  nav{
    position:sticky; top:0; z-index:50;
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 5vw;
    background:rgba(14,2,3,0.88);
    backdrop-filter:blur(8px);
    border-bottom:1px solid var(--border);
  }
  nav .brand{display:flex; align-items:center; gap:12px;}
  nav .brand img{height:34px; width:auto; filter:drop-shadow(0 0 2px rgba(255,255,255,0.85));}
  nav .brand span{font-weight:800; letter-spacing:2px; font-size:13px; color:var(--text-dim); text-transform:uppercase;}
  nav ul{list-style:none; display:flex; gap:24px;}
  nav ul a{font-size:13px; font-weight:600; color:var(--text-dim); text-decoration:none; transition:color .2s;}
  nav ul a:hover{color:#fff;}
  @media (max-width:960px){ nav ul{display:none;} }

  /* ---------- HERO ---------- */
  .sunburst{
    position:relative;
    background:
      radial-gradient(ellipse 1100px 850px at 78% 8%, var(--orange) 0%, var(--red-bright) 20%, var(--red) 40%, var(--bg-1) 68%, var(--bg-0) 100%);
    overflow:hidden;
  }
  .sunburst::before{
    content:"";
    position:absolute; inset:0;
    background:repeating-radial-gradient(circle at 78% 8%, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 90px);
    animation:pulseGlow 6s ease-in-out infinite;
    pointer-events:none;
  }
  .hero{padding:110px 7vw 60px; display:grid; grid-template-columns:1.3fr 0.9fr; gap:40px; align-items:center;}
  .hero h1{font-size:clamp(48px, 7vw, 92px); line-height:0.98; text-transform:uppercase;}
  .hero .subtitle{margin-top:18px; font-size:22px; font-weight:800; color:var(--orange);}
  .hero .client{margin-top:8px; font-size:16px; color:var(--text-dim);}
  .hero .agenda{margin-top:34px; display:flex; flex-wrap:wrap; gap:10px;}
  .chip{border:1px solid rgba(255,255,255,0.35); padding:8px 16px; border-radius:999px; font-size:13px; font-weight:700; text-decoration:none; color:#fff; background:rgba(255,255,255,0.06); transition:background .2s, transform .2s;}
  .chip:hover{background:rgba(255,255,255,0.16); transform:translateY(-2px);}
  .hero-card{
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:22px;
    animation:floatSlow 5s ease-in-out infinite;
  }
  .hero-card img{width:100%; max-width:340px; filter:drop-shadow(0 0 3px rgba(255,255,255,0.9)) drop-shadow(0 0 14px rgba(0,0,0,0.35));}
  @media (max-width:900px){ .hero{grid-template-columns:1fr; padding:90px 6vw 40px;} }

  .hero-stats{padding:0 7vw 90px; display:grid; grid-template-columns:repeat(3,1fr); gap:18px;}
  .hero-stat{
    background:rgba(0,0,0,0.28); border:1px solid rgba(255,255,255,0.18); border-radius:18px;
    padding:22px 24px; backdrop-filter:blur(4px);
  }
  .hero-stat .v{font-size:34px; font-weight:800;}
  .hero-stat .l{margin-top:4px; font-size:12.5px; color:rgba(255,255,255,0.75); text-transform:uppercase; letter-spacing:1px; font-weight:700;}
  @media (max-width:700px){ .hero-stats{grid-template-columns:1fr;} }

  /* ---------- CONTENT SECTIONS ---------- */
  section.content{padding:90px 7vw; background:linear-gradient(180deg, var(--bg-0) 0%, #1a0406 100%); border-top:1px solid rgba(255,255,255,0.06);}
  section.content.alt{background:linear-gradient(180deg, #1a0406 0%, var(--bg-0) 100%);}
  .section-head{margin-bottom:44px; max-width:820px;}
  .section-head .eyebrow{margin-bottom:10px;}
  .section-head h2{font-size:clamp(30px,4vw,46px); text-transform:uppercase; line-height:1.05;}
  .section-head p{margin-top:16px; color:var(--text-dim); font-size:16px; max-width:720px;}

  /* stat hero row */
  .stat-row{display:grid; grid-template-columns:1.1fr 1fr; gap:28px; margin-bottom:50px;}
  .stat-big{background:var(--panel); border:1px solid var(--border); border-radius:24px; padding:38px;}
  .stat-big .num{font-size:clamp(52px,6vw,84px); font-weight:800; line-height:1;}
  .stat-big .label{margin-top:10px; font-size:15px; color:var(--text-dim); font-weight:700;}
  .stat-mini-grid{display:grid; grid-template-columns:1fr 1fr; gap:16px;}
  .stat-mini{background:var(--panel-solid); border:1px solid var(--border); border-radius:16px; padding:20px; transition:transform .25s, border-color .25s;}
  .stat-mini:hover{transform:translateY(-4px); border-color:var(--orange);}
  .stat-mini .v{font-size:26px; font-weight:800;}
  .stat-mini .l{font-size:12px; color:var(--text-faint); text-transform:uppercase; letter-spacing:1px; margin-top:4px;}
  @media (max-width:820px){ .stat-row{grid-template-columns:1fr;} }

  /* charts */
  .charts-grid{display:grid; grid-template-columns:1.3fr 1fr; gap:24px; margin-bottom:20px;}
  .charts-grid.even{grid-template-columns:1fr 1fr;}
  .chart-card{background:var(--panel); border:1px solid var(--border); border-radius:22px; padding:26px;}
  .chart-card .ct-title{font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-dim); margin-bottom:18px;}
  .chart-card canvas{max-height:280px;}
  @media (max-width:960px){ .charts-grid, .charts-grid.even{grid-template-columns:1fr;} }

  /* tables */
  .table-wrap{background:var(--panel); border:1px solid var(--border); border-radius:20px; overflow:hidden; margin-bottom:36px;}
  .table-wrap .table-title{padding:16px 24px; font-weight:800; font-size:14px; letter-spacing:1px; text-transform:uppercase; color:var(--text-dim); border-bottom:1px solid var(--border);}
  table{width:100%; border-collapse:collapse; font-size:14.5px;}
  thead th{background:var(--table-header); color:#fff; text-align:left; padding:14px 18px; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap;}
  tbody td{padding:12px 18px; border-bottom:1px solid rgba(255,255,255,0.06); color:var(--text-dim); white-space:nowrap;}
  tbody tr:nth-child(even){background:rgba(255,255,255,0.03);}
  tbody td:first-child{font-weight:700; color:#fff;}
  tbody tr:last-child td{border-bottom:none;}
  .pos{color:var(--green); font-weight:800;}
  .neg{color:#ff7a68; font-weight:800;}
  .table-scroll{overflow-x:auto;}
  details.table-details summary{cursor:pointer; padding:16px 24px; font-weight:800; font-size:13px; letter-spacing:1px; text-transform:uppercase; color:var(--text-dim); list-style:none; display:flex; align-items:center; gap:10px;}
  details.table-details summary::-webkit-details-marker{display:none;}
  details.table-details summary::before{content:"+"; font-size:16px; color:var(--orange); font-weight:800; width:18px;}
  details.table-details[open] summary::before{content:"–";}

  .note{font-size:13.5px; color:var(--text-faint); font-style:italic; margin-top:-16px; margin-bottom:36px;}
  .insight{background:var(--panel-solid); border-left:3px solid var(--orange); border-radius:0 14px 14px 0; padding:20px 24px; color:var(--text-dim); font-size:15px; margin-bottom:36px;}

  /* VS side-by-side */
  .vs-grid{display:grid; grid-template-columns:1fr auto 1fr; gap:0; align-items:stretch; margin-bottom:40px;}
  .vs-col{background:var(--panel); border:1px solid var(--border); border-radius:22px; padding:30px;}
  .vs-col.now{border-color:var(--orange); background:linear-gradient(160deg, rgba(255,122,69,0.12), var(--panel));}
  .vs-col h3{font-size:14px; text-transform:uppercase; letter-spacing:1px; color:var(--text-dim); margin-bottom:18px;}
  .vs-col h3 b{color:#fff; font-size:20px; display:block; margin-top:4px;}
  .vs-row{display:flex; justify-content:space-between; align-items:center; padding:11px 0; border-bottom:1px solid rgba(255,255,255,0.07); font-size:14.5px;}
  .vs-row:last-child{border-bottom:none;}
  .vs-row .val{font-weight:800;}
  .vs-badge{width:56px; height:56px; border-radius:50%; background:var(--red-bright); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; align-self:center; margin:0 -1px; box-shadow:0 0 0 6px var(--bg-0), 0 10px 20px rgba(0,0,0,.4); z-index:2;}
  @media (max-width:820px){ .vs-grid{grid-template-columns:1fr;} .vs-badge{margin:14px auto;} }

  /* funnel */
  .funnel-tabs{display:flex; gap:10px; margin-bottom:30px;}
  .funnel-tab{
    padding:10px 22px; border-radius:999px; border:1px solid var(--border); background:var(--panel-solid);
    color:var(--text-dim); font-weight:800; font-size:13px; cursor:pointer; transition:all .25s;
  }
  .funnel-tab.active{background:var(--red-bright); color:#fff; border-color:var(--red-bright);}
  .funnel-wrap{background:var(--panel); border:1px solid var(--border); border-radius:24px; padding:34px 30px; margin-bottom:36px;}
  .funnel-row{display:grid; grid-template-columns:190px 1fr 120px; align-items:center; gap:18px;}
  .funnel-label{font-weight:800; font-size:14.5px;}
  .funnel-label small{display:block; font-weight:600; color:var(--text-faint); font-size:11.5px; text-transform:uppercase; letter-spacing:.5px; margin-top:2px;}
  .funnel-bar-track{height:38px; background:rgba(255,255,255,0.06); border-radius:9px; overflow:hidden; position:relative;}
  .funnel-bar-fill{height:100%; border-radius:9px; width:0%; background:linear-gradient(90deg,var(--red-bright),var(--orange)); transition:width 1s cubic-bezier(.4,0,.2,1); display:flex; align-items:center; justify-content:flex-end; padding-right:12px;}
  .funnel-value{text-align:right; font-weight:800; font-size:15px; font-variant-numeric:tabular-nums;}
  .funnel-drop{grid-column:2/3; text-align:center; font-size:12px; color:var(--text-faint); padding:6px 0; display:flex; align-items:center; gap:8px; justify-content:center;}
  .funnel-drop::before, .funnel-drop::after{content:""; height:1px; flex:1; background:rgba(255,255,255,0.1);}
  .funnel-drop b{color:var(--orange);}
  .funnel-benchmark{margin-top:6px; font-size:11px;}
  @media (max-width:640px){
    .funnel-row{grid-template-columns:1fr; gap:6px;}
    .funnel-value{text-align:left;}
    .funnel-wrap{padding:26px 18px;}
  }
  .status-dot{display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px;}
  .status-dot.ok{background:var(--green);} .status-dot.bad{background:#ff5b47;}

  /* trava cards with sparkline */
  .trava-grid{display:grid; grid-template-columns:1.15fr 1fr 1fr; gap:22px;}
  .trava-card{background:var(--panel); border:1px solid var(--border); border-radius:22px; padding:30px 26px; display:flex; flex-direction:column; gap:14px; transition:transform .3s, box-shadow .3s;}
  .trava-card:hover{transform:translateY(-6px); box-shadow:0 22px 40px rgba(0,0,0,0.35);}
  .trava-card.primary{border-color:var(--orange); background:linear-gradient(160deg, rgba(255,122,69,0.14), var(--panel));}
  .trava-card .tag{align-self:flex-start; background:var(--yellow); color:var(--yellow-text); font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; padding:5px 12px; border-radius:999px;}
  .trava-card h3{font-size:20px; line-height:1.2;}
  .trava-card .desc{font-size:14px; color:var(--text-dim);}
  .trava-card ul{margin-top:2px; padding-left:18px; font-size:13.5px; color:var(--text-dim); display:flex; flex-direction:column; gap:6px;}
  .spark-wrap{background:rgba(0,0,0,0.2); border-radius:12px; padding:10px 12px; margin-top:4px;}
  .spark-wrap .spark-label{display:flex; justify-content:space-between; font-size:11px; color:var(--text-faint); text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px;}
  .spark-wrap canvas{height:54px !important;}
  @media (max-width:1000px){ .trava-grid{grid-template-columns:1fr;} }

  /* objetivo smart */
  .smart-card{background:var(--panel); border:1px solid var(--border); border-radius:22px; padding:32px; margin-bottom:40px;}
  .smart-row{display:grid; grid-template-columns:170px 1fr; gap:18px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.07);}
  .smart-row:last-child{border-bottom:none;}
  .smart-row .k{font-weight:800; color:var(--orange); font-size:14px; text-transform:uppercase; letter-spacing:0.5px;}
  .smart-row .v{color:var(--text-dim); font-size:15px;}

  .kr-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:20px;}
  .kr-card{background:var(--panel-solid); border:1px solid var(--border); border-radius:20px; padding:26px 22px; display:flex; flex-direction:column; gap:12px; transition:transform .25s;}
  .kr-card:hover{transform:translateY(-5px);}
  .kr-top{display:flex; align-items:center; gap:12px;}
  .kr-badge{width:44px; height:44px; min-width:44px; border-radius:50%; background:var(--red-bright); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px;}
  .kr-card p{font-size:13.5px; color:var(--text-dim); font-weight:600;}
  .kr-progress-track{height:9px; border-radius:99px; background:rgba(255,255,255,0.08); overflow:hidden;}
  .kr-progress-fill{height:100%; border-radius:99px; width:0%; transition:width 1.2s cubic-bezier(.4,0,.2,1);}
  .kr-progress-label{display:flex; justify-content:space-between; font-size:11.5px; color:var(--text-faint); font-weight:700;}
  @media (max-width:900px){ .kr-grid{grid-template-columns:1fr 1fr;} }
  @media (max-width:600px){ .kr-grid{grid-template-columns:1fr;} }

  /* plano de acao */
  .plan-table thead th{white-space:normal;}
  .plan-table tbody td{white-space:normal; vertical-align:top; font-size:13.5px;}
  .plan-table tbody td:first-child{min-width:170px;}

  footer{padding:80px 7vw 50px; background:radial-gradient(ellipse 900px 500px at 85% 20%, var(--red-bright) 0%, var(--bg-1) 45%, var(--bg-0) 100%); display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:24px;}
  footer h2{font-size:clamp(34px,5vw,56px); text-transform:uppercase;}
  footer .foot-meta{font-size:13px; color:var(--text-faint);}
```

## Notas de uso

- As variáveis `:root` no topo são a fonte de verdade da paleta. Não redefinir cores soltas (hexadecimais direto no meio do CSS) — sempre referenciar `var(--nome-da-variavel)`.
- `.sunburst` é o fundo usado na capa (hero) e no rodapé — gradiente radial concentrado em ~78% 8% do container, saindo de laranja vibrante até quase preto nas bordas, com um efeito sutil de anéis via `repeating-radial-gradient` e animação de pulso (`pulseGlow`).
- `.content` e `.content.alt` alternam um gradiente linear leve entre si — usar essa alternância a cada seção de conteúdo para dar ritmo, sem precisar de mais de duas variações.
- Todos os componentes de card (`.stat-mini`, `.chart-card`, `.trava-card`, `.kr-card`, `.table-wrap`) seguem o mesmo padrão: fundo `--panel` ou `--panel-solid`, borda `1px solid var(--border)`, `border-radius` entre 16px e 28px dependendo do tamanho do card (quanto maior o card, maior o raio).
- Breakpoints usados: `900px` (empilha hero em coluna única), `960px` (esconde nav e empilha grids de 2 colunas), `1000px` (empilha `.trava-grid`), `820px` (empilha `.vs-grid` e `.stat-row`), `640px` (empilha `.funnel-row` em telas pequenas).
- Fontes: import via Google Fonts (`Anton` + `Manrope`). Se o ambiente de destino bloquear Google Fonts, o fallback do CSS (`sans-serif` genérico) ainda mantém a hierarquia visual (tamanhos/pesos), só perde o caráter tipográfico específico — mas isso só deve acontecer em teste local, nunca no arquivo entregue ao cliente.
