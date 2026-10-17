"""Prévia rápida de .glb (sem GPU): frente, lado e cima lado a lado, com as cores por vértice.
Uso: .ia/venv/bin/python scripts/ia/previa-3d.py <modelo.glb> [...] --out previa.png
Serve para conferir orientação (Y para cima, frente para +Z) e qualidade da malha antes de levar para a cena.
"""
import argparse

import numpy as np
import trimesh
from PIL import Image, ImageDraw


def view(mesh, axis, size=360):
    v = mesh.vertices
    if axis == "frente":  # olhando de +Z para -Z
        p, depth = v[:, [0, 1]], v[:, 2]
    elif axis == "lado":  # olhando de +X
        p, depth = np.stack([-v[:, 2], v[:, 1]], 1), v[:, 0]
    else:  # cima: olhando de +Y
        p, depth = np.stack([v[:, 0], v[:, 2]], 1), v[:, 1]
    lo, hi = p.min(0), p.max(0)
    s = (size * 0.85) / max(hi - lo)
    xy = (p - (lo + hi) / 2) * s + size / 2
    xy[:, 1] = size - xy[:, 1]
    tris = mesh.faces
    n = mesh.face_normals
    light = np.array({"frente": [0.3, 0.5, 1], "lado": [1, 0.5, -0.3], "cima": [0.3, 1, 0.3]}[axis])
    light = light / np.linalg.norm(light)
    shade = np.clip(n @ light, 0, 1) * 0.75 + 0.25
    col = mesh.visual.vertex_colors[:, :3].astype(float) if mesh.visual.kind == "vertex" else np.full((len(v), 3), 200.0)
    fd = depth[tris].mean(1)
    img = Image.new("RGB", (size, size), (14, 16, 20))
    d = ImageDraw.Draw(img)
    for f in np.argsort(fd):  # pintor: do fundo para a frente
        c = (col[tris[f]].mean(0) * shade[f]).astype(int)
        d.polygon([tuple(xy[i]) for i in tris[f]], fill=tuple(c))
    d.text((8, 8), axis, fill=(200, 200, 200))
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("models", nargs="+")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    rows = []
    for m in a.models:
        mesh = trimesh.load(m, force="mesh")
        ims = [view(mesh, ax) for ax in ("frente", "lado", "cima")]
        row = Image.new("RGB", (360 * 3, 360))
        for i, im in enumerate(ims):
            row.paste(im, (i * 360, 0))
        rows.append(row)
    out = Image.new("RGB", (360 * 3, 360 * len(rows)))
    for i, r in enumerate(rows):
        out.paste(r, (0, i * 360))
    out.save(a.out)
    print(f"✓ {a.out}")


if __name__ == "__main__":
    main()
