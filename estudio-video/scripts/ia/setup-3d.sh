#!/usr/bin/env bash
# Prepara o gerador imagem → 3D local (TripoSR, MIT) em estudio-video/.ia/
# Uso: bash scripts/ia/setup-3d.sh        (idempotente; ~3–6 min na primeira vez)
#
# - código: github.com/VAST-AI-Research/TripoSR (clone raso)
# - pesos:  huggingface.co/stabilityai/TripoSR (baixados no 1º uso, ~1,7 GB, cache em .ia/hf)
# - torch CPU (sem GPU no contêiner); marching cubes via PyMCubes no lugar do torchmcubes (que exige compilar CUDA/C++)
set -euo pipefail
cd "$(dirname "$0")/../.."
IA=.ia
mkdir -p "$IA"

if [ ! -d "$IA/TripoSR" ]; then
  git clone --depth 1 https://github.com/VAST-AI-Research/TripoSR "$IA/TripoSR"
fi

# torchmcubes → PyMCubes (mesma assinatura: (vertices, faces) a partir de um volume de densidade)
ISO="$IA/TripoSR/tsr/models/isosurface.py"
if grep -q "from torchmcubes import marching_cubes" "$ISO"; then
  python3 - "$ISO" <<'PY'
import sys, re
p = sys.argv[1]
s = open(p).read()
s = s.replace("from torchmcubes import marching_cubes\n", "import mcubes as _mcubes\n\n"
  "def marching_cubes(level, threshold):\n"
  "    v, f = _mcubes.marching_cubes(level.detach().cpu().numpy(), float(threshold))\n"
  "    return torch.from_numpy(v.astype('float32')), torch.from_numpy(f.astype('int64'))\n")
open(p, "w").write(s)
PY
fi

if [ ! -x "$IA/venv/bin/python" ]; then
  uv venv "$IA/venv" --python python3 --seed
fi
PY="$IA/venv/bin/python"
uv pip install --python "$PY" --index-url https://download.pytorch.org/whl/cpu torch torchvision
uv pip install --python "$PY" "omegaconf>=2.3" "einops>=0.7" "transformers>=4.44,<5" "huggingface-hub>=0.24" \
  trimesh PyMCubes pillow numpy scipy "rembg[cpu]" onnxruntime pygltflib xatlas fast_simplification imageio

echo "✓ TripoSR pronto em $IA (python: $PY)"
