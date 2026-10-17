"""Gera narração provisória (edge-tts) + alinhamento palavra a palavra no formato OpenAI verbose_json.
uso: python narrar.py roteiro.md saida.mp3 saida.words.json [voz] [rate]"""
import asyncio, json, os, re, sys
import edge_tts

rot, mp3, js = sys.argv[1:4]
voz = sys.argv[4] if len(sys.argv) > 4 else "pt-BR-AntonioNeural"
rate = sys.argv[5] if len(sys.argv) > 5 else "+8%"

linhas = []
for l in open(rot, encoding="utf-8"):
    t = l.strip()
    if not t or t.startswith("#") or re.match(r"^(TELA|VISUAL)\s*:", t, re.I):
        continue
    linhas.append(re.sub(r"\*\*|__", "", t))
texto = " ".join(linhas)

async def main():
    com = edge_tts.Communicate(texto, voz, rate=rate, boundary="WordBoundary", proxy=os.environ.get("HTTPS_PROXY"))
    words, audio = [], bytearray()
    async for ch in com.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            s = ch["offset"] / 1e7
            words.append({"word": ch["text"], "start": round(s, 3), "end": round(s + ch["duration"] / 1e7, 3)})
    open(mp3, "wb").write(audio)
    json.dump({"text": texto, "words": words}, open(js, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(words)} palavras, fim em {words[-1]['end']:.2f}s")

asyncio.run(main())
