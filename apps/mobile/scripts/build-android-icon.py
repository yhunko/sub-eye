#!/usr/bin/env python3
"""Regenerate the Android app icons from the Icon Composer layer SVGs.

    python3 scripts/build-android-icon.py

iOS reads `icon.icon/` directly (app.json -> ios.icon), so Apple's renderer owns
the gradient, shadow and translucency. Android cannot read a `.icon` bundle at
all, so the same four layers are flattened here into:

    assets/icon.png           1024 square, glyph on the app's own #0f1115
    assets/adaptive-icon.png  1024 transparent, glyph inside the 66/108dp safe zone

Run this after changing anything under `icon.icon/Assets/`, or the two platforms
drift apart. The layer colour and the background below are duplicated from
icon.json / theme.ts on purpose — three constants beat a JSON parser.

ponytail: rasterises with macOS QuickLook (`qlmanage`) rather than adding
sharp/resvg/inkscape for two build-time PNGs. Pillow is the only import, and it
ships with the system Python. If this ever needs to run on CI/Linux, that is the
point to swap in a real rasteriser.
"""

import re
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "icon.icon" / "Assets"
OUT = ROOT / "assets"
TMP = ROOT / "node_modules" / ".cache" / "icon-build"

VIEWBOX = "136.233 136.243 753.724 753.724"  # shared by every layer SVG
LAYERS = ["bar-left.svg", "bar-center.svg", "bar-right.svg", "eye.svg"]
GLYPH = (0x33, 0xA4, 0x53)  # #33A453 — colors.accent
BG = (15, 17, 21, 255)  # #0f1115 — colors.bg
RENDER = 2048  # render big, downscale into place

# Fraction of the 1024 canvas the glyph's longest side occupies.
FULL_SCALE = 0.72  # square icon: conventional optical margin
ADAPTIVE_SCALE = 0.55  # inside Android's 66/108dp (61%) safe zone


def paths() -> str:
    found = []
    for name in LAYERS:
        found += re.findall(r"<path\b[^>]*\bd=\"([^\"]+)\"", (SRC / name).read_text())
    if len(found) != len(LAYERS):
        sys.exit(f"expected {len(LAYERS)} paths under {SRC}, found {len(found)}")
    return "".join(f'<path d="{d}"/>' for d in found)


def render_glyph() -> Image.Image:
    """The glyph as RGBA with real transparency, cropped to its ink.

    QuickLook thumbnails are always flattened onto opaque white, so the alpha
    channel comes back useless. The render is a strict two-colour composite
    (glyph over white), which inverts exactly: every pixel is
    `a*glyph + (1-a)*white`, so `a = (255 - R) / (255 - glyph_R)`. That recovers
    antialiased edges instead of threshold-jagging them.
    """
    TMP.mkdir(parents=True, exist_ok=True)
    svg = TMP / "glyph.svg"
    svg.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{RENDER}" '
        f'height="{RENDER}" viewBox="{VIEWBOX}">'
        f'<rect x="0" y="0" width="100%" height="100%" fill="#ffffff"/>'
        f'<g fill="#{GLYPH[0]:02x}{GLYPH[1]:02x}{GLYPH[2]:02x}">{paths()}</g></svg>'
    )
    png = TMP / "glyph.svg.png"
    png.unlink(missing_ok=True)
    subprocess.run(
        ["qlmanage", "-t", "-s", str(RENDER), "-o", str(TMP), str(svg)],
        check=True,
        capture_output=True,
    )
    if not png.exists():
        sys.exit("qlmanage produced no PNG — is this macOS?")

    red = Image.open(png).convert("RGB").getchannel("R")
    alpha = red.point(lambda v: min(255, round((255 - v) * 255 / (255 - GLYPH[0]))))
    image = Image.new("RGBA", alpha.size, (*GLYPH, 255))
    image.putalpha(alpha)

    box = image.getbbox()  # crop to the ink, so scaling is measured on the glyph
    if box is None:
        sys.exit("rendered glyph is empty")
    return image.crop(box)


def compose(glyph: Image.Image, scale: float, background) -> Image.Image:
    target = round(1024 * scale)
    ratio = target / max(glyph.size)
    fitted = glyph.resize(
        (max(1, round(glyph.width * ratio)), max(1, round(glyph.height * ratio))),
        Image.LANCZOS,
    )
    canvas = Image.new("RGBA", (1024, 1024), background)
    canvas.alpha_composite(
        fitted, ((1024 - fitted.width) // 2, (1024 - fitted.height) // 2)
    )
    return canvas


glyph = render_glyph()
print(f"glyph ink {glyph.width}x{glyph.height} of {RENDER}")
OUT.mkdir(parents=True, exist_ok=True)
compose(glyph, FULL_SCALE, BG).save(OUT / "icon.png")
compose(glyph, ADAPTIVE_SCALE, (0, 0, 0, 0)).save(OUT / "adaptive-icon.png")
print(f"wrote {OUT / 'icon.png'}\n      {OUT / 'adaptive-icon.png'}")
