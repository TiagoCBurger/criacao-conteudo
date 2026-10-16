#!/usr/bin/env node
// Galeria local (out/galeria.html) para assistir a toda a mídia do projeto e às edições renderizadas:
// player, prancha de contato, forma de onda, transcrição clicável (pula para o trecho) e cortes de câmera.
//   npm run galeria            → gera
//   npm run galeria -- --abrir → gera e abre no navegador padrão
import {spawn} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fmtBytes, fmtTime, loadRegistro, parseArgs, root} from "./lib/util.mjs";

const {opts} = parseArgs();
const reg = loadRegistro();
const outDir = path.join(root, "out");
fs.mkdirSync(outDir, {recursive: true});
const pub = (p) => (p ? `../public/${p}` : null);

const renders = fs
  .readdirSync(outDir)
  .filter((f) => f.endsWith(".mp4"))
  .map((f) => {
    const st = fs.statSync(path.join(outDir, f));
    const capa = f.replace(/\.mp4$/, "-capa.jpg");
    return {nome: f, arquivo: f, capa: fs.existsSync(path.join(outDir, capa)) ? capa : null, tamanho: fmtBytes(st.size), data: st.mtime.toISOString().slice(0, 16).replace("T", " ")};
  })
  .sort((a, b) => b.data.localeCompare(a.data));

const itens = Object.values(reg.clipes).map((e) => ({
  id: e.id,
  tipo: e.tipo,
  origem: e.origem,
  ausente: !!e.ausente,
  src: pub(e.arquivo),
  poster: pub(e.poster ?? e.onda),
  prancha: pub(e.prancha),
  onda: pub(e.onda),
  duracao: e.duracao ? fmtTime(e.duracao) : "",
  quadro: e.largura ? `${e.largura}×${e.altura}` : "",
  fps: e.fps ?? null,
  hdr: !!e.hdr,
  loudness: e.loudness ?? null,
  cenas: e.cenas ?? [],
  silencio: e.silencios ? +e.silencios.reduce((n, [a, b]) => n + b - a, 0).toFixed(1) : null,
  fala: e.transcricao ? frases(e.transcricao.palavras) : null,
  fonteFala: e.transcricao?.fonte ?? null,
}));

/** Agrupa palavras em frases (pausa > 0,6 s ou pontuação final) para leitura. */
function frases(ws) {
  const out = [];
  let cur = [];
  ws.forEach((w, i) => {
    cur.push(w);
    const next = ws[i + 1];
    if (!next || /[.!?…]$/.test(w.text) || next.startMs - w.endMs > 600 || cur.length > 28) {
      out.push({t: +(cur[0].startMs / 1000).toFixed(2), txt: cur.map((x) => x.text).join(" ")});
      cur = [];
    }
  });
  return out;
}

const data = JSON.stringify({renders, itens, gerado: new Date().toLocaleString("pt-BR")}).replace(/</g, "\\u003c");

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Galeria de mídia</title>
<style>
:root{--bg:#f6f6f4;--card:#fff;--ink:#16181d;--mute:#6b7280;--line:#e5e5e2;--acc:#2f6fed;--warn:#b45309}
@media (prefers-color-scheme:dark){:root{--bg:#101114;--card:#181a1f;--ink:#eceef2;--mute:#9aa1ad;--line:#2a2d34;--acc:#7aa2ff;--warn:#f0b35a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line);padding:14px 16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
h1{font-size:18px;margin:0 12px 0 0}header input{flex:1;min-width:180px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink)}
.chips button{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:99px;padding:5px 11px;cursor:pointer;font:inherit;font-size:13px}
.chips button.on{background:var(--ink);color:var(--bg)}
main{padding:16px;max-width:1400px;margin:0 auto}h2{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin:22px 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;cursor:pointer;display:flex;flex-direction:column}
.card:hover{border-color:var(--acc)}.thumb{aspect-ratio:16/10;background:#000 center/contain no-repeat;position:relative}
.thumb span{position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,.7);color:#fff;font-size:12px;padding:2px 6px;border-radius:5px}
.meta{padding:9px 11px;font-size:13px}.meta b{display:block;font-size:14px;word-break:break-all}.meta small{color:var(--mute)}
.warn{color:var(--warn)}
#painel{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;z-index:10;padding:16px;overflow:auto}
#painel.on{display:block}.box{background:var(--card);max-width:1100px;margin:0 auto;border-radius:14px;padding:16px;border:1px solid var(--line)}
.top{display:flex;justify-content:space-between;gap:10px;align-items:start}.top button{font:inherit;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:8px;padding:6px 12px;cursor:pointer}
.cols{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;margin-top:12px}@media (max-width:820px){.cols{grid-template-columns:1fr}}
video,audio{width:100%;max-height:70vh;background:#000;border-radius:10px}img.full{width:100%;border-radius:8px;margin-top:10px;border:1px solid var(--line)}
.fala{max-height:60vh;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:8px}.fala p{margin:0;padding:5px 6px;border-radius:6px;cursor:pointer}
.fala p:hover{background:var(--bg)}.fala p.at{background:color-mix(in srgb,var(--acc) 18%,transparent)}.fala time{color:var(--acc);font-variant-numeric:tabular-nums;margin-right:8px;font-size:12px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.tags button{font:12px system-ui;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:6px;padding:3px 7px;cursor:pointer}
code{font-size:12px;background:var(--bg);padding:1px 5px;border-radius:5px;border:1px solid var(--line)}
</style>
</head>
<body>
<header><h1>Galeria de mídia</h1><input id="q" placeholder="Buscar por nome ou fala…" aria-label="Buscar">
<div class="chips" id="chips"></div></header>
<main id="main"></main>
<div id="painel" role="dialog" aria-modal="true"><div class="box" id="box"></div></div>
<script>
const D=${data};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=t=>{const m=Math.floor(t/60),s=(t%60).toFixed(1).padStart(4,"0");return m+":"+s};
let filtro="tudo";
const tipos=[["tudo","Tudo"],["renders","Edições"],["video","Vídeos"],["audio","Áudios"],["imagem","Imagens"]];
document.getElementById("chips").innerHTML=tipos.map(([k,l])=>'<button data-k="'+k+'">'+l+'</button>').join("");
document.getElementById("chips").onclick=e=>{const k=e.target.dataset.k;if(k){filtro=k;draw()}};
document.getElementById("q").oninput=draw;
function card(img,badge,title,sub,attr){return '<div class="card" '+attr+'><div class="thumb" style="background-image:'+(img?'url(&quot;'+esc(img)+'&quot;)':'none')+'">'+(badge?'<span>'+esc(badge)+'</span>':'')+'</div><div class="meta"><b>'+esc(title)+'</b><small>'+sub+'</small></div></div>'}
function draw(){
  const q=document.getElementById("q").value.toLowerCase();
  document.querySelectorAll("#chips button").forEach(b=>b.classList.toggle("on",b.dataset.k===filtro));
  let h="";
  if((filtro==="tudo"||filtro==="renders")&&D.renders.length){
    const rs=D.renders.filter(r=>!q||r.nome.toLowerCase().includes(q));
    if(rs.length)h+='<h2>Edições renderizadas</h2><div class="grid">'+rs.map(r=>card(r.capa,"",r.nome,esc(r.tamanho+" · "+r.data),'data-r="'+esc(r.arquivo)+'"')).join("")+'</div>';
  }
  for(const [k,l] of tipos.slice(2)){
    if(filtro!=="tudo"&&filtro!==k)continue;
    const its=D.itens.filter(i=>i.tipo===k&&(!q||i.id.includes(q)||i.origem.toLowerCase().includes(q)||(i.fala||[]).some(f=>f.txt.toLowerCase().includes(q))));
    if(!its.length)continue;
    h+='<h2>'+l+' ('+its.length+')</h2><div class="grid">'+its.map(i=>card(i.poster,i.duracao,i.id,esc([i.quadro,i.fps?i.fps+" fps":"",i.fala?i.fala.length+" frases":""].filter(Boolean).join(" · "))+'<br>'+esc(i.origem)+(i.ausente?' <span class="warn">· original sumiu</span>':''),'data-i="'+esc(i.id)+'"')).join("")+'</div>';
  }
  if(!h)h='<p>Nada encontrado. Rode <code>npm run midia</code> no estúdio para procurar a mídia do projeto.</p>';
  document.getElementById("main").innerHTML=h+'<p style="color:var(--mute);font-size:12px;margin-top:30px">Gerada em '+esc(D.gerado)+' · atualize com <code>npm run galeria</code></p>';
}
document.getElementById("main").onclick=e=>{const c=e.target.closest(".card");if(!c)return;if(c.dataset.r)openRender(c.dataset.r);else openItem(c.dataset.i)};
const painel=document.getElementById("painel"),box=document.getElementById("box");
painel.onclick=e=>{if(e.target===painel)fechar()};document.addEventListener("keydown",e=>{if(e.key==="Escape")fechar()});
function fechar(){painel.classList.remove("on");box.innerHTML=""}
function head(t,sub){return '<div class="top"><div><b style="font-size:17px">'+esc(t)+'</b><br><small style="color:var(--mute)">'+sub+'</small></div><button onclick="fechar()">Fechar</button></div>'}
function openRender(f){box.innerHTML=head(f,"edição renderizada")+'<div style="margin-top:12px"><video controls autoplay src="'+esc(f)+'"></video></div>';painel.classList.add("on")}
function openItem(id){
  const i=D.itens.find(x=>x.id===id);
  const info=[i.tipo,i.duracao,i.quadro,i.fps?i.fps+" fps":"",i.hdr?"HDR→SDR":"",i.loudness!=null?i.loudness.toFixed(1)+" LUFS":"",i.silencio!=null?i.silencio+" s de silêncio":""].filter(Boolean).join(" · ");
  let player=i.tipo==="video"?'<video id="pl" controls preload="metadata" poster="'+esc(i.poster||"")+'" src="'+esc(i.src)+'"></video>':i.tipo==="audio"?'<audio id="pl" controls src="'+esc(i.src)+'"></audio>':'<img class="full" src="'+esc(i.src)+'">';
  let left=player+(i.onda?'<img class="full" src="'+esc(i.onda)+'" alt="forma de onda">':'')+(i.prancha?'<img class="full" src="'+esc(i.prancha)+'" alt="prancha de contato">':'');
  if(i.cenas.length)left+='<div style="margin-top:10px"><small>Cortes de câmera</small><div class="tags">'+i.cenas.map(t=>'<button data-t="'+t+'">'+fmt(t)+'</button>').join("")+'</div></div>';
  const right=i.fala?'<small>Fala ('+esc(i.fonteFala)+') — clique para ir ao trecho</small><div class="fala" id="fala">'+i.fala.map(f=>'<p data-t="'+f.t+'"><time>'+fmt(f.t)+'</time>'+esc(f.txt)+'</p>').join("")+'</div>':'<small style="color:var(--mute)">'+(i.tipo==="imagem"?"":"Sem transcrição.")+'</small>';
  box.innerHTML=head(i.id,esc(info)+'<br>id na edição: <code>'+esc(i.id)+'</code> · original: '+esc(i.origem))+'<div class="cols"><div>'+left+'</div><div>'+right+'</div></div>';
  painel.classList.add("on");
  const pl=document.getElementById("pl");
  box.onclick=e=>{const t=e.target.closest("[data-t]");if(t&&pl){pl.currentTime=+t.dataset.t;pl.play()}};
  if(pl&&i.fala){const ps=[...document.querySelectorAll("#fala p")];pl.ontimeupdate=()=>{let k=-1;ps.forEach((p,j)=>{if(+p.dataset.t<=pl.currentTime)k=j});ps.forEach((p,j)=>p.classList.toggle("at",j===k))}}
}
draw();
</script>
</body>
</html>
`;

const file = path.join(outDir, "galeria.html");
fs.writeFileSync(file, html);
console.log(`✓ galeria: ${path.relative(process.cwd(), file)} (${itens.length} item(ns), ${renders.length} edição(ões) renderizada(s))`);
if (opts.abrir) {
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", file] : [file];
  spawn(opener, args, {detached: true, stdio: "ignore"}).unref();
}
