#!/usr/bin/env node
// Cria (ou atualiza) o estúdio de vídeo do projeto a partir do template da skill.
//
//   node <skill>/scripts/init-estudio.mjs [destino] [--ds caminho/design-system] [--no-install]
//   node <skill>/scripts/init-estudio.mjs [destino] --update      ← atualiza só a biblioteca e os scripts
//
// destino padrão: ./estudio-video   ·   design system padrão: ./design-system (relativo à raiz do projeto)
// --update troca src/lib, src/ds/{index,types}.ts, src/DesignSystemPreview.tsx, scripts/ e dependências,
// sem tocar em src/videos, public/videos, studio.config.json nem no design system.
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
const dest = path.resolve(positional[0] ?? "estudio-video");
const update = argv.includes("--update");
const install = !argv.includes("--no-install");

const copy = (rel) => {
  const from = path.join(template, rel);
  const to = path.join(dest, rel);
  fs.rmSync(to, {recursive: true, force: true});
  fs.cpSync(from, to, {recursive: true});
};

if (update) {
  if (!fs.existsSync(path.join(dest, "studio.config.json"))) {
    console.error(`${dest} não parece um estúdio (sem studio.config.json).`);
    process.exit(1);
  }
  for (const rel of ["src/lib", "src/ds/index.ts", "src/ds/types.ts", "src/DesignSystemPreview.tsx", "src/Root.tsx", "src/config.ts", "src/index.ts", "scripts", "remotion.config.ts", "tsconfig.json"]) copy(rel);
  // dependências: mescla versões do template no package.json existente
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
  fs.writeFileSync(path.join(dest, "studio.config.json"), JSON.stringify({designSystem: path.relative(dest, dsPath) || "."}, null, 2) + "\n");
  fs.mkdirSync(path.join(dest, "public", "videos"), {recursive: true});
  console.log(`✓ estúdio criado em ${dest}`);
  console.log(`  design system esperado em: ${dsPath}${fs.existsSync(path.join(dsPath, "tokens.json")) ? " (encontrado)" : " (ainda não existe — crie antes de renderizar)"}`);
}

if (install) {
  console.log("→ npm install (1–3 min)…");
  execSync("npm install --no-audit --no-fund --loglevel=error", {cwd: dest, stdio: "inherit"});
}
console.log("\nPróximos passos: design system → npm run timeline → npm run new → cenas → npm run check → npm run render");
