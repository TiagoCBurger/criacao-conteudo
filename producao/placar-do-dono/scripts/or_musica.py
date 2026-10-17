"""Gera trilha com Lyria via OpenRouter (chat completions com saída de áudio, em streaming).
uso: python or_musica.py saida.(mp3|wav) "prompt" [modelo] [formato]"""
import base64, json, os, sys, urllib.request
out, prompt = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else "google/lyria-3-pro-preview"
fmt = sys.argv[4] if len(sys.argv) > 4 else "mp3"
body = {"model": model, "messages": [{"role": "user", "content": prompt}],
        "modalities": ["text", "audio"], "audio": {"format": fmt}, "stream": True}
req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=json.dumps(body).encode(),
                             headers={"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"], "Content-Type": "application/json"})
chunks, text, usage = [], [], None
with urllib.request.urlopen(req, timeout=600) as r:
    for raw in r:
        line = raw.decode("utf-8", "ignore").strip()
        if not line.startswith("data: "):
            continue
        data = line[6:]
        if data == "[DONE]":
            break
        c = json.loads(data)
        usage = c.get("usage") or usage
        for ch in c.get("choices", []):
            d = ch.get("delta", {})
            a = d.get("audio") or {}
            if a.get("data"):
                chunks.append(a["data"])
            if d.get("content"):
                text.append(d["content"])
audio = base64.b64decode("".join(chunks)) if chunks else b""
open(out, "wb").write(audio)
print("ok", out, len(audio), "bytes · custo", (usage or {}).get("cost"), "· texto:", "".join(text)[:200])
