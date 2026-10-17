"""Imagem → modelo 3D (.glb) com TripoSR, rodando local na CPU.

Uso (de dentro de estudio-video/, depois de `bash scripts/ia/setup-3d.sh`):
  .ia/venv/bin/python scripts/ia/imagem-para-3d.py <img.png> [<img2.png> …] --out public/videos/<slug>/3d
      [--mc 256] [--faces 40000] [--smooth 8] [--fg 0.85] [--orient none|face|head]

Para cada imagem gera <nome>.glb, já pronto para o R3F:
- Y para cima, objeto centrado em x/z, base apoiada em y=0, maior dimensão = 1 unidade;
- cores por vértice (COLOR_0) vindas do TripoSR, para quem quiser usar a cor gerada;
- malha suavizada (Taubin, sem encolher) e reduzida para render rápido;
- <nome>.json ao lado com as medidas (largura, altura, profundidade) para enquadrar a câmera.
Também salva <nome>.entrada.png (o recorte que o modelo viu), útil para conferir.
"""
import argparse
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, ".ia", "TripoSR"))
os.environ.setdefault("HF_HOME", os.path.join(ROOT, ".ia", "hf"))
os.environ.setdefault("U2NET_HOME", os.path.join(ROOT, ".ia", "u2net"))

import numpy as np  # noqa: E402
import torch  # noqa: E402
import trimesh  # noqa: E402
from PIL import Image  # noqa: E402

from tsr.system import TSR  # noqa: E402
from tsr.utils import remove_background, resize_foreground  # noqa: E402


def log(msg):
    print(msg, flush=True)


def prepare(path, fg_ratio, session):
    img = Image.open(path)
    img = remove_background(img, session)  # mantém o alfa se a imagem já vier recortada
    img = resize_foreground(img, fg_ratio)
    arr = np.array(img).astype(np.float32) / 255.0
    rgb = arr[:, :, :3] * arr[:, :, 3:4] + (1 - arr[:, :, 3:4]) * 0.5  # fundo cinza 50%, como no treino
    return Image.fromarray((rgb * 255.0).astype(np.uint8))


def yaw_for(mesh, orient):
    """Ângulo (rad, em torno de Y) que deixa o objeto legível para uma câmera em +Z.
    face: objeto plano (moeda, placa, cartão) — a direção mais fina no chão vira Z (de frente para a câmera).
    head: objeto com "cabeça" (martelo, chave, machado) — a direção mais longa do topo (30% de cima) vira X."""
    v = mesh.vertices
    if orient == "head":
        lo, hi = v[:, 1].min(), v[:, 1].max()
        v = v[v[:, 1] >= hi - 0.3 * (hi - lo)]
    xz = v[:, [0, 2]] - v[:, [0, 2]].mean(0)
    w, vec = np.linalg.eigh(np.cov(xz.T))  # autovalores em ordem crescente
    d = vec[:, 0] if orient == "face" else vec[:, 1]  # face: eixo mais fino; head: eixo mais longo
    target = np.array([0.0, 1.0]) if orient == "face" else np.array([1.0, 0.0])  # (x, z)
    # rotação em Y: (x, z) → (x cosθ + z sinθ, −x sinθ + z cosθ); escolhe θ que leva d ao alvo
    ang = lambda u: np.arctan2(u[1], u[0])  # ângulo no plano (x, z)
    theta = ang(d) - ang(target)
    if theta > np.pi / 2:  # os dois sentidos do eixo servem: usa o giro menor
        theta -= np.pi
    if theta < -np.pi / 2:
        theta += np.pi
    return float(theta)


def finish(mesh, faces, smooth, orient="none"):
    # Eixos do TripoSR: +X para cima, +Y horizontal na imagem, câmera de entrada em -Z.
    # three.js: Y para cima e o objeto olhando para a câmera em +Z (como na foto de entrada).
    m = np.eye(4)
    m[:3, :3] = [[0, 1, 0], [1, 0, 0], [0, 0, -1]]
    mesh.apply_transform(m)
    # só o maior pedaço conectado e os que tenham ≥ 5% dele (descarta poeira do marching cubes)
    parts = mesh.split(only_watertight=False)
    if len(parts) > 1:
        parts = sorted(parts, key=lambda m: len(m.faces), reverse=True)
        keep = [p for p in parts if len(p.faces) >= 0.05 * len(parts[0].faces)]
        mesh = trimesh.util.concatenate(keep)
    if smooth > 0:
        trimesh.smoothing.filter_taubin(mesh, lamb=0.5, nu=-0.53, iterations=smooth)
    if faces and len(mesh.faces) > faces:
        colors = mesh.visual.vertex_colors.copy() if mesh.visual.kind == "vertex" else None
        verts_before = mesh.vertices.copy()
        mesh = mesh.simplify_quadric_decimation(face_count=faces)
        if colors is not None:
            # a decimação descarta as cores: recupera pela vizinhança mais próxima na malha original
            from scipy.spatial import cKDTree

            _, idx = cKDTree(verts_before).query(mesh.vertices)
            mesh.visual = trimesh.visual.ColorVisuals(mesh, vertex_colors=colors[idx])
    if orient in ("face", "head"):
        mesh.apply_transform(trimesh.transformations.rotation_matrix(yaw_for(mesh, orient), [0, 1, 0]))
    lo, hi = mesh.bounds
    size = hi - lo
    scale = 1.0 / float(size.max())
    mesh.apply_translation([-(lo[0] + hi[0]) / 2, -lo[1], -(lo[2] + hi[2]) / 2])
    mesh.apply_scale(scale)
    mesh.fix_normals()
    return mesh, (size * scale).tolist()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--mc", type=int, default=256, help="resolução do marching cubes")
    ap.add_argument("--faces", type=int, default=40000, help="faces após a redução (0 = não reduz)")
    ap.add_argument("--smooth", type=int, default=8, help="iterações de suavização Taubin")
    ap.add_argument("--fg", type=float, default=0.85, help="fração do quadro ocupada pelo objeto")
    ap.add_argument("--threshold", type=float, default=25.0, help="limiar de densidade da superfície")
    ap.add_argument("--orient", choices=["none", "face", "head"], default="none", help="face: objeto plano de frente para +Z; head: eixo da cabeça em X")
    ap.add_argument("--force", action="store_true", help="refaz mesmo se o .glb já existir")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    todo = []
    for p in a.images:
        name = os.path.splitext(os.path.basename(p))[0]
        dst = os.path.join(a.out, f"{name}.glb")
        if os.path.exists(dst) and not a.force:
            log(f"• {name}.glb já existe (use --force para refazer)")
            continue
        todo.append((p, name, dst))
    if not todo:
        return

    torch.set_num_threads(os.cpu_count() or 4)
    t0 = time.time()
    log("→ carregando TripoSR (1ª vez baixa ~1,7 GB do Hugging Face)…")
    model = TSR.from_pretrained("stabilityai/TripoSR", config_name="config.yaml", weight_name="model.ckpt")
    model.renderer.set_chunk_size(8192)
    model.to("cpu")
    import rembg

    session = rembg.new_session("u2net")
    log(f"  pronto em {time.time() - t0:.0f}s")

    for p, name, dst in todo:
        t = time.time()
        img = prepare(p, a.fg, session)
        img.save(os.path.join(a.out, f"{name}.entrada.png"))
        with torch.no_grad():
            codes = model([img], device="cpu")
            mesh = model.extract_mesh(codes, True, resolution=a.mc, threshold=a.threshold)[0]
        mesh, size = finish(mesh, a.faces, a.smooth, a.orient)
        mesh.export(dst)
        with open(os.path.join(a.out, f"{name}.json"), "w") as f:
            json.dump({"size": [round(x, 4) for x in size], "faces": int(len(mesh.faces)), "source": os.path.basename(p)}, f)
        log(f"✓ {name}.glb  {len(mesh.faces)} faces  tamanho {[round(x, 2) for x in size]}  ({time.time() - t:.0f}s)")


if __name__ == "__main__":
    main()
