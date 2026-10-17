#!/usr/bin/env node
// Gera a biblioteca de efeitos sonoros do estúdio por síntese (sem licença, offline, determinística).
// Uso: node scripts/gen-sfx.mjs [--palette soft|crisp|punchy|digital] [--out public/sfx]
// A paleta normalmente vem de design-system/tokens.json (sound.palette) via sync-ds.mjs.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const palette = arg("palette", "soft");
const outDir = path.resolve(arg("out", "public/sfx"));
const SR = 48000;

const P = {
  soft: {bright: 0.62, verb: 0.2, trans: 0.6, drive: 1.0, crush: 0},
  crisp: {bright: 1.0, verb: 0.09, trans: 1.0, drive: 1.1, crush: 0},
  punchy: {bright: 0.85, verb: 0.1, trans: 1.35, drive: 1.8, crush: 0},
  digital: {bright: 1.1, verb: 0.06, trans: 1.0, drive: 1.3, crush: 1},
}[palette];
if (!P) {
  console.error(`paleta desconhecida: ${palette}`);
  process.exit(1);
}

// ---------- utilitários ----------
let seed = 1337;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** envelope ADSR-like simples: ataque linear, decaimento exponencial */
const envAD = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
/** sino (para whoosh): sobe e desce */
const bell = (t, dur, peak = 0.55) => {
  const x = t / dur;
  if (x <= 0 || x >= 1) return 0;
  return x < peak ? Math.pow(x / peak, 2) : Math.pow((1 - x) / (1 - peak), 1.6);
};

/** biquad bandpass/lowpass/highpass com cutoff variável no tempo */
const biquad = (type) => {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, f, q = 0.9) => {
    f = Math.max(20, Math.min(SR * 0.45, f));
    const w = (TAU * f) / SR;
    const cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q);
    let b0, b1, b2;
    if (type === "lp") [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
    else if (type === "hp") [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    else [b0, b1, b2] = [al, 0, -al];
    const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
};

/** reverb Schroeder curtinho (sala pequena) */
const reverb = (input, mix) => {
  if (mix <= 0) return input;
  const tail = Math.ceil(0.6 * SR);
  const out = new Float32Array(input.length + tail);
  out.set(input);
  // combs com amortecimento (estilo Freeverb) para a cauda não soar metálica
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((n) => ({buf: new Float32Array(Math.round(n * (SR / 44100))), i: 0, lp: 0}));
  const aps = [225, 556, 441].map((n) => ({buf: new Float32Array(Math.round(n * (SR / 44100))), i: 0}));
  const wet = new Float32Array(out.length);
  const damp = 0.45, fb = 0.74;
  for (let n = 0; n < out.length; n++) {
    const x = n < input.length ? input[n] : 0;
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * (1 - damp) + c.lp * damp;
      c.buf[c.i] = x + c.lp * fb;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    s /= combs.length;
    for (const a of aps) {
      const y = a.buf[a.i];
      const v = s + y * 0.5;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.buf.length;
      s = y - v * 0.5;
    }
    wet[n] = s;
  }
  for (let n = 0; n < out.length; n++) out[n] = out[n] * (1 - mix * 0.5) + wet[n] * mix;
  return out;
};

const finish = (b, {verb = P.verb, drive = P.drive, crush = P.crush} = {}) => {
  let out = b;
  if (crush) {
    const step = 6, levels = 48;
    let hold = 0;
    for (let i = 0; i < out.length; i++) {
      if (i % step === 0) hold = Math.round(out[i] * levels) / levels;
      out[i] = out[i] * 0.5 + hold * 0.5;
    }
  }
  if (drive !== 1) for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * drive) / Math.tanh(drive);
  out = reverb(out, verb);
  // corta o silêncio do fim
  let end = out.length - 1;
  while (end > 0 && Math.abs(out[end]) < 0.0008) end--;
  out = out.slice(0, Math.min(out.length, end + Math.round(0.02 * SR)));
  // normaliza a -1 dBFS e aplica micro-fades anti-clique
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? 0.89 / peak : 1;
  const fi = Math.round(0.002 * SR), fo = Math.round(0.012 * SR);
  for (let i = 0; i < out.length; i++) {
    let e = 1;
    if (i < fi) e = i / fi;
    if (i > out.length - fo) e = Math.min(e, (out.length - i) / fo);
    out[i] *= g * e;
  }
  return out;
};

const writeWav = (file, data) => {
  const n = data.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
};

// ---------- sons ----------
const S = {};
const def = (name, description, fn) => (S[name] = {description, fn});

const whooshCore = (dur, f0, f1, q, peak = 0.55, amp = 1) => {
  const b = buf(dur);
  const bp = biquad("bp"), bp2 = biquad("bp");
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, x = t / dur;
    const f = (f0 + (f1 - f0) * Math.sin(Math.PI * Math.min(1, x / (peak * 2)) * 0.5)) * P.bright;
    const n = noise();
    b[i] = (bp(n, f, q) * 0.7 + bp2(n, f * 1.9, q * 1.4) * 0.3) * bell(t, dur, peak) * amp * 3.2;
  }
  return b;
};

def("whoosh", "Transição entre cenas: ar passando, médio. Comece ~0.1s antes do corte.", () => whooshCore(0.62, 300, 2600, 0.8));
def("whoosh-soft", "Transição discreta / elementos grandes deslizando.", () => whooshCore(0.55, 220, 1500, 0.6, 0.6, 0.8));
def("swish", "Entrada rápida de elemento pequeno (card, tag, ícone).", () => whooshCore(0.24, 900, 5200, 1.1, 0.4));
def("slide", "Algo deslizando no plano (barra crescendo, painel entrando).", () => {
  const dur = 0.42, b = buf(dur), lp = biquad("lp");
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = lp(noise(), (600 + 2400 * (t / dur)) * P.bright, 0.7) * bell(t, dur, 0.35) * 2.2;
  }
  return b;
});
def("pop", "Bolha/ponto aparecendo (dados, ícones, pictogramas). Curto e simpático.", () => {
  const dur = 0.16, b = buf(dur);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = 300 + 900 * Math.exp(-t / 0.018) * P.bright;
    ph += (TAU * f) / SR;
    b[i] = Math.sin(ph) * envAD(t, 0.002, 0.045) + noise() * envAD(t, 0.0005, 0.004) * 0.3 * P.trans;
  }
  return b;
});
def("click", "Clique de interface (botão, seleção, troca de estado).", () => {
  const dur = 0.05, b = buf(dur), hp = biquad("hp");
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = hp(noise(), 2500 * P.bright, 0.7) * envAD(t, 0.0003, 0.006) * P.trans + Math.sin(TAU * 3100 * P.bright * t) * envAD(t, 0.0005, 0.01) * 0.5;
  }
  return b;
});
def("tick", "Tique seco (itens de lista, contador avançando, passos).", () => {
  const dur = 0.07, b = buf(dur);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = Math.sin(TAU * 1900 * P.bright * t) * envAD(t, 0.0005, 0.012) + Math.sin(TAU * 3800 * P.bright * t) * envAD(t, 0.0005, 0.006) * 0.4;
  }
  return b;
});
def("thud", "Impacto médio: bloco 3D pousando, card batendo no lugar.", () => {
  const dur = 0.5, b = buf(dur), lp = biquad("lp");
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = 48 + 90 * Math.exp(-t / 0.035);
    ph += (TAU * f) / SR;
    b[i] = Math.sin(ph) * envAD(t, 0.002, 0.14) * 1.2 + lp(noise(), 1800 * P.bright, 0.7) * envAD(t, 0.0005, 0.02) * 0.6 * P.trans;
  }
  return b;
});
def("boom", "Grande revelação (número-chave, conclusão). Grave com cauda. Use pouco.", () => {
  const dur = 1.6, b = buf(dur), lp = biquad("lp");
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = 38 + 70 * Math.exp(-t / 0.06);
    ph += (TAU * f) / SR;
    b[i] = Math.sin(ph) * envAD(t, 0.003, 0.5) + lp(noise(), 900 * P.bright, 0.6) * envAD(t, 0.001, 0.25) * 0.5 * P.trans;
  }
  return b;
});
def("riser", "Tensão subindo antes de uma revelação (1.4s). Termine no frame da revelação.", () => {
  const dur = 1.4, b = buf(dur), bp = biquad("bp");
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, x = t / dur;
    const f = 180 * Math.pow(8, x);
    ph += (TAU * f) / SR;
    const saw = ((ph / TAU) % 1) * 2 - 1;
    b[i] = (bp(noise(), (500 + 6000 * x) * P.bright, 1.2) * 1.4 + saw * 0.18) * Math.pow(x, 2.2) * (x > 0.97 ? (1 - x) / 0.03 : 1);
  }
  return b;
});
def("reverse", "Sopro reverso que cresce até um corte (0.9s). Para viradas de cena dramáticas.", () => {
  const dur = 0.9, b = buf(dur), bp = biquad("hp");
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, x = t / dur;
    b[i] = bp(noise(), 3000 * P.bright, 0.7) * Math.pow(x, 3) * 1.6;
  }
  return b;
});
const bellTone = (dur, notes, decay = 0.5, ratio = 3.5, index = 2.2) => {
  const b = buf(dur);
  notes.forEach(([f, at, amp = 1]) => {
    const s0 = Math.round(at * SR);
    for (let i = s0; i < b.length; i++) {
      const t = (i - s0) / SR;
      const fe = envAD(t, 0.002, decay);
      const mod = Math.sin(TAU * f * ratio * t) * index * Math.exp(-t / (decay * 0.4));
      b[i] += Math.sin(TAU * f * P.bright ** 0.3 * t + mod) * fe * amp * 0.5;
    }
  });
  return b;
};
def("ding", "Destaque/acerto: sino curto e limpo (palavra-chave, resposta certa).", () => bellTone(1.3, [[1320, 0]], 0.45));
def("success", "Conclusão positiva: duas notas subindo.", () => bellTone(1.4, [[880, 0], [1108.7, 0.11]], 0.4, 2, 1.2));
def("sparkle", "Insight/'aha': brilho cintilante de notas agudas.", () => {
  const notes = [2093, 2637, 3136, 3520, 4186, 3136, 2637].map((f, i) => [f, i * 0.055 + rnd() * 0.01, 0.6 - i * 0.05]);
  return bellTone(1.1, notes, 0.18, 2.01, 0.8);
});
def("error", "Erro/mito/negativo: zumbido grave curto (use com o ✕).", () => {
  const dur = 0.34, b = buf(dur), lp = biquad("lp");
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const sq = Math.sign(Math.sin(TAU * 140 * t)) * 0.5 + Math.sign(Math.sin(TAU * 147 * t)) * 0.5;
    b[i] = lp(sq, 1400 * P.bright, 0.7) * (t < 0.14 ? 1 : t < 0.17 ? 0 : 1) * envAD(t, 0.004, 0.2);
  }
  return b;
});
def("type", "Uma tecla (máquina de escrever / digitação de busca).", () => {
  const dur = 0.07, b = buf(dur), bp = biquad("bp");
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = bp(noise(), 3200 * P.bright, 1.5) * envAD(t, 0.0003, 0.008) * 1.5 + Math.sin(TAU * 420 * t) * envAD(t, 0.001, 0.012) * 0.4;
  }
  return b;
});
def("typing", "Sequência de teclas (1.6s) para TypeOn.", () => {
  const dur = 1.6, b = buf(dur);
  let t0 = 0.02;
  while (t0 < dur - 0.08) {
    const s0 = Math.round(t0 * SR), bp = biquad("bp"), f = 2600 + rnd() * 1400, a = 0.6 + rnd() * 0.4;
    for (let i = 0; i < 0.06 * SR && s0 + i < b.length; i++) {
      const t = i / SR;
      b[s0 + i] += bp(noise(), f * P.bright, 1.4) * envAD(t, 0.0003, 0.007) * a * 1.5 + Math.sin(TAU * 380 * t) * envAD(t, 0.001, 0.01) * 0.3 * a;
    }
    t0 += 0.06 + rnd() * 0.07;
  }
  return b;
});
def("glitch", "Falha digital (dados, tecnologia, 'bug'). 0.3s.", () => {
  const dur = 0.3, b = buf(dur);
  let hold = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    if (i % Math.round(SR / (800 + 3000 * rnd())) === 0) hold = noise();
    const gate = Math.sin(TAU * 23 * t) > -0.2 ? 1 : 0;
    b[i] = (hold * 0.7 + Math.sign(Math.sin(TAU * (220 + 900 * rnd()) * t)) * 0.2) * gate * envAD(t, 0.002, 0.15);
  }
  return finish(b, {crush: 1});
});
def("swell", "Cama suave que cresce (pad) para abrir/fechar o vídeo. 2.4s.", () => {
  const dur = 2.4, b = buf(dur), lp = biquad("lp");
  const fs = [220, 277.2, 329.6, 440];
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, x = t / dur;
    let s = 0;
    for (const f of fs) s += Math.sin(TAU * f * t + Math.sin(TAU * 0.3 * t) * 0.6) * 0.25;
    b[i] = lp(s + noise() * 0.05, (500 + 2500 * x) * P.bright, 0.7) * Math.sin(Math.PI * x) ** 1.5;
  }
  return b;
});

// ---------- grava ----------
fs.mkdirSync(outDir, {recursive: true});
const manifest = {palette, generatedBy: "gen-sfx.mjs", sounds: {}};
for (const [name, {description, fn}] of Object.entries(S)) {
  seed = [...name].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) | 0;
  let data = fn();
  if (name !== "glitch") data = finish(data);
  const file = `${name}.wav`;
  writeWav(path.join(outDir, file), data);
  manifest.sounds[name] = {file, duration: +(data.length / SR).toFixed(3), description, source: "gerado"};
}
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`✓ ${Object.keys(S).length} efeitos (${palette}) em ${path.relative(process.cwd(), outDir) || outDir}`);
