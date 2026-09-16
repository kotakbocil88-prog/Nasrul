"""Generate PWA app icons for DATA EQMS TAGGING (green + QR-label motif)."""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public")
os.makedirs(OUT, exist_ok=True)

DARK = (15, 41, 30)      # #0F291E
GREEN = (27, 77, 62)     # #1B4D3E
LIME = (132, 204, 22)    # #84CC16
WHITE = (255, 255, 255)


def rounded(size, radius_ratio=0.22):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=GREEN)
    return img, d


def finder(d, x, y, s, fg, bg):
    """Draw a QR 'finder' square (nested squares)."""
    d.rounded_rectangle([x, y, x + s, y + s], radius=int(s * 0.18), fill=fg)
    p = int(s * 0.16)
    d.rounded_rectangle([x + p, y + p, x + s - p, y + s - p], radius=int(s * 0.12), fill=bg)
    p2 = int(s * 0.34)
    d.rounded_rectangle([x + p2, y + p2, x + s - p2, y + s - p2], radius=int(s * 0.08), fill=fg)


def draw_motif(img, d, size, pad_ratio=0.0):
    pad = int(size * pad_ratio)
    inner = size - pad * 2
    ox = pad
    oy = pad
    # QR-ish canvas: three finder squares + some dots
    fs = int(inner * 0.32)
    gap = int(inner * 0.06)
    # top-left, top-right, bottom-left finders (lime)
    finder(d, ox + gap, oy + gap, fs, LIME, GREEN)
    finder(d, ox + inner - gap - fs, oy + gap, fs, LIME, GREEN)
    finder(d, ox + gap, oy + inner - gap - fs, fs, LIME, GREEN)
    # scattered data modules (white) in the free quadrant
    m = int(inner * 0.07)
    startx = ox + int(inner * 0.55)
    starty = oy + int(inner * 0.58)
    pattern = [
        (0, 0), (2, 0), (1, 1), (3, 1), (0, 2), (2, 2), (3, 3), (1, 3), (2, 4), (0, 4),
    ]
    for gx, gy in pattern:
        px = startx + gx * (m + int(m * 0.35))
        py = starty + gy * (m + int(m * 0.35))
        if px + m < ox + inner and py + m < oy + inner:
            d.rounded_rectangle([px, py, px + m, py + m], radius=int(m * 0.25), fill=WHITE)


def make(size, maskable=False, name=None):
    img, d = rounded(size, radius_ratio=0.0 if maskable else 0.22)
    if maskable:
        # full green bg (safe zone), motif within 80%
        draw_motif(img, d, size, pad_ratio=0.12)
    else:
        draw_motif(img, d, size, pad_ratio=0.10)
    path = os.path.join(OUT, name)
    img.convert("RGBA").save(path)
    print("wrote", path)


make(192, name="icon-192.png")
make(512, name="icon-512.png")
make(512, maskable=True, name="icon-maskable-512.png")
make(180, name="apple-touch-icon.png")
make(64, name="favicon-64.png")
print("done")
