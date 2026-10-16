#!/usr/bin/env node
// Cria (ou atualiza) o estúdio de edição do projeto a partir do template da skill.
//
//   node <skill>/scripts/init-estudio.mjs [destino] [--ds caminho/design-system] [--no-install]
//   node <skill>/scripts/init-estudio.mjs [destino] --update     ← atualiza só a biblioteca e os scripts
//
// destino padrão: ./estudio-edicao (na raiz do projeto, ao lado das pastas de vídeo)
// --update troca src/lib, src/Root.tsx, src/index.ts, scripts/, estilo/ e dependências, sem tocar em
// src/edicoes, src/midia (registro e transcrições), public/ nem estudio.config.json.
import {execSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const template = path.resolve(here, "..", "assets", "estudio");
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1] === "--ds"));
const dest = path.resolve(positional[0] ?? "estudio-edicao");
const update = argv.includes("--update");
const install = !argv.includes("--no-install");

const copy = (rel) => {
  const from = path.join(template, rel);
  const to = path.join(dest, rel);
  fs.rmSync(to, {recursive: true, force: true});
  fs.cpSync(from, to, {recursive: true});
};

if (update) {
  if (!fs.existsSync(path.join(dest, "estudio.config.json"))) {
    console.error(`${dest} não parece um estúdio de edição (sem estudio.config.json).`);
    process.exit(1);
  }
  for (const rel of ["src/lib", "src/Root.tsx", "src/index.ts", "scripts", "estilo", "remotion.config.ts", "tsconfig.json", ".gitignore"]) copy(rel);
  const pkgT = JSON.parse(fs.readFileSync(path.join(template, "package.json"), "utf8"));
  const pkgD = JSON.parse(fs.readFileSync(path.join(dest, "package.json"), "utf8"));
  pkgD.scripts = {...pkgD.scripts, ...pkgT.scripts};
  pkgD.dependencies = {...pkgD.dependencies, ...pkgT.dependencies};
  pkgD.devDependencies = {...pkgD.devDependencies, ...pkgT.devDependencies};
  fs.writeFileSync(path.join(dest, "package.json"), JSON.stringify(pkgD, null, 2) + "\n");
  console.log(`✓ biblioteca e scripts atualizados em ${dest}`);
} else {
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) {
    console.error(`${dest} já existe e não está vazio. Use --update para atualizar a biblioteca, ou escolha outro destino.`);
    process.exit(1);
  }
  fs.cpSync(template, dest, {recursive: true, filter: (src) => !src.includes("node_modules")});
  const projectRoot = path.dirname(dest);
  const dsPath = path.resolve(projectRoot, opt("ds", "design-system"));
  const cfg = JSON.parse(fs.readFileSync(path.join(dest, "estudio.config.json"), "utf8"));
  cfg.designSystem = path.relative(dest, dsPath) || ".";
  cfg.ignorar = [...new Set([...(cfg.ignorar ?? []), path.basename(dest)])];
  fs.writeFileSync(path.join(dest, "estudio.config.json"), JSON.stringify(cfg, null, 2) + "\n");
  console.log(`✓ estúdio de edição criado em ${dest}`);
  console.log(`  design system: ${fs.existsSync(path.join(dsPath, "tokens.json")) ? `${dsPath} (encontrado)` : "não encontrado — usa o estilo neutro padrão (Inter, branco + amarelo)"}`);
}

if (install) {
  console.log("→ npm install (1–3 min)…");
  execSync("npm install --no-audit --no-fund --loglevel=error", {cwd: dest, stdio: "inherit"});
}
console.log("\nPróximos passos: npm run midia → npm run galeria -- --abrir → npm run nova -- <slug> → npm run cortes -- <clipe> → npm run check -- <slug> → npm run render -- <slug>");
