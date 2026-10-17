"""Gera um clipe com um modelo de vídeo do OpenRouter e baixa o MP4.
uso: python or_video.py saida.mp4 "prompt" [modelo] [duracao] [resolucao]"""
import json, os, sys, time, urllib.request

out, prompt = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else "google/veo-3.1-lite"
dur = int(sys.argv[4]) if len(sys.argv) > 4 else 4
res = sys.argv[5] if len(sys.argv) > 5 else "1080p"
KEY = os.environ["OPENROUTER_API_KEY"]
H = {"Authorization": "Bearer " + KEY, "Content-Type": "application/json"}

def call(url, body=None, raw=False):
    req = urllib.request.Request(url if url.startswith("http") else "https://openrouter.ai/api/v1" + url,
                                 data=json.dumps(body).encode() if body is not None else None, headers=H)
    with urllib.request.urlopen(req, timeout=300) as r:
        d = r.read()
    return d if raw else json.loads(d)

job = call("/videos", {"model": model, "prompt": prompt, "duration": dur, "resolution": res,
                       "aspect_ratio": "9:16", "generate_audio": False})
print("job", job.get("id"), job.get("status"), flush=True)
st = job
for i in range(120):
    if st.get("status") == "completed":
        break
    if st.get("status") in ("failed", "cancelled", "expired"):
        sys.exit(f"falhou: {st}")
    time.sleep(10)
    st = call(st.get("polling_url") or f"/videos/{job['id']}")
data = call(f"/videos/{job['id']}/content?index=0", raw=True)
open(out, "wb").write(data)
print("ok", out, len(data), "bytes · custo", (st.get("usage") or {}).get("cost"))
