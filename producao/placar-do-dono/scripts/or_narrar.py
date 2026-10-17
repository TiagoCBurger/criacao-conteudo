"""Narração via OpenRouter (ElevenLabs) + alinhamento palavra a palavra (STT com timestamps).
uso: python or_narrar.py roteiro.md saida.mp3 saida.words.json [voz] [modelo_tts] [modelo_stt]
A chave vem de OPENROUTER_API_KEY. O alinhamento sai no formato OpenAI verbose_json."""
import base64, json, os, re, sys, urllib.request

rot, mp3, js = sys.argv[1:4]
voz = sys.argv[4] if len(sys.argv) > 4 else "liam"
tts = sys.argv[5] if len(sys.argv) > 5 else "elevenlabs/eleven-v4"
stt = sys.argv[6] if len(sys.argv) > 6 else "elevenlabs/scribe-v2"
KEY = os.environ["OPENROUTER_API_KEY"]

linhas = []
for l in open(rot, encoding="utf-8"):
    t = l.strip()
    if not t or t.startswith("#") or re.match(r"^(TELA|VISUAL)\s*:", t, re.I):
        continue
    linhas.append(re.sub(r"\*\*|__", "", t))
texto = " ".join(linhas)

def post(path, body, raw=False):
    req = urllib.request.Request("https://openrouter.ai/api/v1" + path, data=json.dumps(body).encode(),
                                 headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        data = r.read()
    return data if raw else json.loads(data)

if not (len(sys.argv) > 7 and sys.argv[7] == "--so-stt"):
    audio = post("/audio/speech", {"model": tts, "input": texto, "voice": voz, "response_format": "mp3"}, raw=True)
    open(mp3, "wb").write(audio)
    print(f"tts ok: {len(audio)} bytes, {len(texto)} caracteres")

b64 = base64.b64encode(open(mp3, "rb").read()).decode()
res = post("/audio/transcriptions", {"model": stt, "input_audio": {"data": b64, "format": "mp3"}, "language": "pt",
                                     "response_format": "verbose_json", "timestamp_granularities": ["word"]})
words = res.get("words") or [w for s in res.get("segments", []) for w in s.get("words", [])]
words = [w for w in words if (w.get("word") or "").strip()]
json.dump({"text": res.get("text", ""), "words": [{"word": w["word"].strip(), "start": w["start"], "end": w["end"]} for w in words]},
          open(js, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"stt ok: {len(words)} palavras, fim em {words[-1]['end']:.2f}s" if words else f"stt sem palavras: {str(res)[:300]}")
print("texto reconhecido:", res.get("text", "")[:160])
