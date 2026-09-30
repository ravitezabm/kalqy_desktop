#!/usr/bin/env python3
"""Builds public/games/market-catch from the raw art in market_assets/.

 - fruits: trimmed to their alpha bounds, written as webp (grape_rotten.png is
   actually the whole fruit sheet, so the rotten grapes are cut out of it)
 - characters: each supplied grid sheet becomes a webp + Phaser atlas JSON
   (equal cells, per-frame duration stored in the JSON, read by createAtlasAnimation)
Run: python3 scripts/market-assets.py
"""
import json, shutil, os
from collections import deque
import numpy as np
from PIL import Image

SRC = "market_assets"
OUT = "public/games/market-catch"
os.makedirs(f"{OUT}/fruits", exist_ok=True)
os.makedirs(f"{OUT}/characters", exist_ok=True)

FRUITS = ["apple", "orange", "banana", "watermelon", "strawberry", "coconut", "pear", "grape"]


def trim(im, pad=3):
    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 8)
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, im.width), min(ys.max() + pad + 1, im.height))
    return im.crop(box)


def cut_rotten_grapes():
    """The supplied grape_rotten.png is the full fruit sheet; isolate the bottom-right bunch."""
    sheet = Image.open(f"{SRC}/grape_rotten.png").convert("RGB")
    crop = sheet.crop((1338, 520, 1530, 800))
    px = np.array(crop).astype(float)
    h, w, _ = px.shape
    # Smooth background estimate: a quadratic surface fitted to the border ring (the glow is a soft gradient).
    yy, xx = np.mgrid[0:h, 0:w]
    ring = (yy < 5) | (yy >= h - 5) | (xx < 5) | (xx >= w - 5)
    def basis(x, y):
        x, y = x / w, y / h
        return np.stack([np.ones_like(x), x, y, x * y, x * x, y * y, x * x * y, x * y * y], -1)
    A = basis(xx[ring].astype(float), yy[ring].astype(float))
    full = basis(xx.astype(float), yy.astype(float))
    bg = np.zeros_like(px)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, px[..., c][ring], rcond=None)
        bg[..., c] = full @ coef
    dist = np.sqrt(((px - bg) ** 2).sum(2))
    mask = dist > 24
    # close small gaps (dark grapes are close to the backdrop colour)
    from PIL import ImageFilter as _F
    m = Image.fromarray((mask * 255).astype(np.uint8)).filter(_F.MaxFilter(5)).filter(_F.MinFilter(5))
    mask = np.array(m) > 127
    # keep the biggest connected blob (drops the neighbouring pear), then fill holes.
    seen = np.zeros_like(mask)
    best = []
    for sy in range(h):
        for sx in range(w):
            if mask[sy, sx] and not seen[sy, sx]:
                comp, q = [], deque([(sy, sx)])
                seen[sy, sx] = True
                while q:
                    y, x = q.popleft()
                    comp.append((y, x))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
                if len(comp) > len(best):
                    best = comp
    blob = np.zeros_like(mask)
    for y, x in best:
        blob[y, x] = True
    # fill holes: background flood from the border; anything not reached is inside.
    outside = np.zeros_like(blob)
    q = deque([(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)])
    for y, x in q:
        outside[y, x] = not blob[y, x]
    q = deque([(y, x) for y in range(h) for x in range(w) if outside[y, x]])
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not blob[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                q.append((ny, nx))
    solid = ~outside
    alpha_img = Image.fromarray((solid * 255).astype(np.uint8))
    from PIL import ImageFilter
    alpha_img = alpha_img.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = crop.convert("RGBA")
    rgba.putalpha(alpha_img)
    return rgba


if __name__ == "__main__" and os.environ.get("ONLY_GRAPE"):
    trim(cut_rotten_grapes()).save(f"{OUT}/fruits/grape_rotten.webp", quality=92, alpha_quality=100, method=6)
    raise SystemExit
for fruit in FRUITS:
    for variant in ("fresh", "rotten"):
        name = f"{fruit}_{variant}"
        im = cut_rotten_grapes() if name == "grape_rotten" else Image.open(f"{SRC}/{name}.png").convert("RGBA")
        trim(im).save(f"{OUT}/fruits/{name}.webp", quality=92, alpha_quality=100, method=6)

shutil.copy(f"{SRC}/MarketGame_Bg.webp", f"{OUT}/background.webp")

# name: (source sheet, columns, rows, ms per frame)
SHEETS = {
    "kid-left": ("kid-left/Kalqy-walks-smoothly.png", 7, 5, 34),
    "kid-right": ("kid-right/Kalqy-walks-smoothly.png", 6, 5, 34),
    "kid-win": ("kid-win/Kalqy-remains-comple.png", 6, 6, 44),
    "kid-fail": ("kid-fail/Kalqy-looks-disappoi.png", 5, 5, 52),
    "lion-idle": ("lion-idle/Lion-standing-calmly.png", 6, 6, 80),
    "lion-win": ("lion-win/Lion-celebrates-with.png", 6, 6, 44),
    "lion-fail": ("lion-fail/Lion-makes-a-cute-mi.png", 6, 6, 36),
    "turtle-idle": ("turtle-idle/The-turtle-stands-ca.png", 6, 6, 90),
    "turtle-win": ("turtle-win/The-turtle-mentor-lo.png", 6, 6, 44),
    "turtle-fail": ("turtle-fail/The-turtle-reacts-to.png", 6, 6, 36),
}
for name, (path, cols, rows, ms) in SHEETS.items():
    im = Image.open(f"{SRC}/{path}").convert("RGBA")
    cw, ch = im.width // cols, im.height // rows
    assert cw * cols == im.width and ch * rows == im.height, (name, im.size)
    frames = {}
    for i in range(cols * rows):
        x, y = (i % cols) * cw, (i // cols) * ch
        frames[f"frame_{i:03d}"] = {
            "frame": {"x": x, "y": y, "w": cw, "h": ch},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": cw, "h": ch},
            "sourceSize": {"w": cw, "h": ch},
            "duration": ms,
        }
    im.save(f"{OUT}/characters/{name}.webp", quality=88, alpha_quality=100, method=6)
    with open(f"{OUT}/characters/{name}.json", "w") as f:
        json.dump({"frames": frames, "meta": {"image": f"{name}.webp", "size": {"w": im.width, "h": im.height}, "scale": "1"}}, f)
print("done")
