#!/usr/bin/env python3
"""Builds public/games/tabla-rhythm from the raw art/audio in tabala_assets/ (+ the market backdrop already built for Market Catch).

 - tablas: four coloured drums -> webp
 - kid: the two supplied grid sheets -> atlas webp + Phaser JSON (per-frame duration inside the JSON)
 - strokes: the 17 supplied tabla stroke wavs, renamed to their stroke (dha.wav, na.wav ...)
Run: python3 scripts/tabla-assets.py
"""
import json, os, re, shutil
from PIL import Image

SRC = "tabala_assets"
OUT = "public/games/tabla-rhythm"
for d in ("", "/tablas", "/characters", "/audio"):
    os.makedirs(OUT + d, exist_ok=True)

for color in ("blue", "green", "orange", "red"):
    Image.open(f"{SRC}/tabala_{color}.png").convert("RGBA").save(f"{OUT}/tablas/tabla-{color}.webp", quality=92, alpha_quality=100, method=6)

# name: (sheet, columns, rows, ms per frame)
SHEETS = {
    "kid-idle": ("kid-idle/I-need-an-idling-ani.png", 5, 5, 70),
    "kid-win": ("kid-win/3-second-infinite-ce.png", 4, 4, 64),
}
for name, (path, cols, rows, ms) in SHEETS.items():
    im = Image.open(f"{SRC}/{path}").convert("RGBA")
    cw, ch = im.width // cols, im.height // rows
    assert cw * cols == im.width and ch * rows == im.height, (name, im.size)
    frames = {}
    for i in range(cols * rows):
        x, y = (i % cols) * cw, (i // cols) * ch
        frames[f"frame_{i:03d}"] = {"frame": {"x": x, "y": y, "w": cw, "h": ch}, "rotated": False, "trimmed": False,
                                    "spriteSourceSize": {"x": 0, "y": 0, "w": cw, "h": ch}, "sourceSize": {"w": cw, "h": ch}, "duration": ms}
    im.save(f"{OUT}/characters/{name}.webp", quality=88, alpha_quality=100, method=6)
    with open(f"{OUT}/characters/{name}.json", "w") as f:
        json.dump({"frames": frames, "meta": {"image": f"{name}.webp", "size": {"w": im.width, "h": im.height}, "scale": "1"}}, f)

for fn in sorted(os.listdir(f"{SRC}/tabala_strokes")):
    m = re.match(r"\d+__ajaysm__(\w+)-stroke\.wav", fn)
    if m:
        shutil.copy(f"{SRC}/tabala_strokes/{fn}", f"{OUT}/audio/{m.group(1)}.wav")

# The festive market backdrop is graded to evening in the scene.
shutil.copy("public/games/market-catch/background.webp", f"{OUT}/background.webp")
print("done")
