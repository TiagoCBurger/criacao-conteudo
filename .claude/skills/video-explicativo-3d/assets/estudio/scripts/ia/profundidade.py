"""Imagem → mapa de profundidade (Depth Anything V2 Small, local na CPU), para cenários 2.5D.

Uso: .ia/venv/bin/python scripts/ia/profundidade.py <img.png> [...] --out public/videos/<slug>/ia/img [--force]

Gera <nome>.profundidade.png (16 bits, claro = perto) do mesmo tamanho da imagem. Na cena, o
componente <Relevo> desloca uma malha densa por esse mapa e projeta a imagem por cima: a câmera
pode andar alguns graus com paralaxe real, como numa projeção de câmera de filme.
"""
import argparse
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
os.environ.setdefault("HF_HOME", os.path.join(ROOT, ".ia", "hf"))

import numpy as np  # noqa: E402
import torch  # noqa: E402
from PIL import Image  # noqa: E402
from scipy.ndimage import gaussian_filter  # noqa: E402
from transformers import pipeline  # noqa: E402

MODEL = "depth-anything/Depth-Anything-V2-Small-hf"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--blur", type=float, default=1.5, help="suaviza bordas de profundidade (px), reduz rasgos na paralaxe")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    todo = []
    for p in a.images:
        name = os.path.splitext(os.path.basename(p))[0]
        dst = os.path.join(a.out, f"{name}.profundidade.png")
        if os.path.exists(dst) and not a.force:
            print(f"• {os.path.basename(dst)} já existe")
            continue
        todo.append((p, dst))
    if not todo:
        return
    torch.set_num_threads(os.cpu_count() or 4)
    pipe = pipeline("depth-estimation", model=MODEL, device="cpu")
    for p, dst in todo:
        img = Image.open(p).convert("RGB")
        # o modelo trabalha melhor perto de 518 px no lado menor; o resultado volta ao tamanho original
        res = pipe(img)
        d = res["predicted_depth"].squeeze().float().numpy()
        d = (d - d.min()) / max(1e-6, d.max() - d.min())
        d = np.array(Image.fromarray(d.astype(np.float32), mode="F").resize(img.size, Image.BICUBIC))
        if a.blur > 0:
            d = gaussian_filter(d, a.blur)
        Image.fromarray((d.clip(0, 1) * 65535).astype(np.uint16)).save(dst)
        print(f"✓ {os.path.basename(dst)}  {img.size[0]}×{img.size[1]}")


if __name__ == "__main__":
    main()
