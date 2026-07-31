#!/usr/bin/env python3
"""Render the Open Graph card for each locale into public/og/.

    python3 scripts/build-og.py

Committed output — this runs on a Mac and CI has no QuickLook. Re-run only when
the card's copy or the mark changes.

QuickLook is the rasteriser because it is already on every Mac and this is the
same trick apps/mobile/scripts/build-android-icon.py uses. It flattens onto
opaque white, which is harmless here: the card paints its own full-bleed
background. The vendored woff2 goes in as a data URI so the card is set in the
site's own face rather than whatever WebKit would fall back to.
"""

import base64
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TMP = ROOT / "node_modules" / ".cache" / "og-build"
OUT = ROOT / "public" / "og"
FONT = ROOT / "public" / "fonts" / "nunito-sans-300-900-latin.woff2"
FONT_CYR = ROOT / "public" / "fonts" / "nunito-sans-300-900-cyrillic.woff2"
MARK_SRC = ROOT / "public" / "favicon.svg"

W, H = 1200, 630
# QuickLook always renders into a square canvas and scales the artboard to fit
# it, clipping anything wider. So the card is drawn as a band inside a 1200x1200
# artboard and cropped back out — deterministic, and nothing is ever cut off.
PAD = (W - H) // 2
BG = "#0f1115"
TEXT = "#f2f4f8"
MUTED = "#98a0ae"
BRAND = "#33a453"

COPY = {
    "en": {
        "title": "Know what your",
        "title2": "subscriptions cost.",
        "tag": "No bank login. No inbox scanning. iPhone.",
    },
    "uk": {
        "title": "Знайте, скільки коштують",
        "title2": "ваші підписки.",
        "tag": "Без доступу до банку. Без читання пошти. iPhone.",
    },
}

STEPS = [("$0.00", 34, MUTED), ("$4.99", 52, TEXT), ("$12.99", 82, TEXT)]


def mark_paths() -> str:
    """The eye + three bars out of favicon.svg, so the card cannot drift from it."""
    found = re.findall(r'<path d="([^"]+)"', MARK_SRC.read_text())
    if len(found) != 4:
        sys.exit(f"expected 4 paths in {MARK_SRC}, found {len(found)}")
    return "".join(f'<path d="{d}"/>' for d in found)


def font_face() -> str:
    faces = []
    for path in (FONT, FONT_CYR):
        if not path.exists():
            sys.exit(f"missing {path} — run `bun run --cwd apps/landing fonts` first")
        data = base64.b64encode(path.read_bytes()).decode()
        faces.append(
            "@font-face{font-family:'Nunito Sans';font-weight:300 900;"
            f"src:url(data:font/woff2;base64,{data}) format('woff2')}}"
        )
    return "".join(faces)


def card(locale: str) -> str:
    c = COPY[locale]
    steps = []
    x = 80
    for i, (amount, size, colour) in enumerate(STEPS):
        steps.append(
            f'<text x="{x}" y="530" font-family="ui-monospace,Menlo,monospace" '
            f'font-size="{size}" fill="{colour}">{amount}</text>'
        )
        if i < len(STEPS) - 1:
            steps.append(
                f'<text x="{x + size * 4.4:.0f}" y="530" font-size="30" '
                f'fill="{BRAND}">&#8594;</text>'
            )
        x += size * 4.4 + 78

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{W}" viewBox="0 0 {W} {W}">
<style>{font_face()}text{{font-family:'Nunito Sans',sans-serif}}</style>
<rect width="{W}" height="{W}" fill="{BG}"/>
<g transform="translate(0,{PAD})">
<g transform="translate(80,64) scale(0.0637)" fill="{BRAND}">
  <g transform="translate(-136.233,-136.243)">{mark_paths()}</g>
</g>
<text x="140" y="104" font-size="34" font-weight="800" fill="{TEXT}">SubEye</text>
<text x="80" y="240" font-size="62" font-weight="800" fill="{TEXT}">{c["title"]}</text>
<text x="80" y="316" font-size="62" font-weight="800" fill="{TEXT}">{c["title2"]}</text>
<text x="80" y="380" font-size="27" fill="{MUTED}">{c["tag"]}</text>
<rect x="80" y="556" width="{W - 160}" height="2" fill="#ffffff" opacity="0.1"/>
{"".join(steps)}
</g>
</svg>"""


def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    for locale in COPY:
        svg = TMP / f"{locale}.svg"
        svg.write_text(card(locale))
        png = TMP / f"{locale}.svg.png"
        png.unlink(missing_ok=True)
        subprocess.run(
            ["qlmanage", "-t", "-s", str(W), "-o", str(TMP), str(svg)],
            check=True,
            capture_output=True,
        )
        if not png.exists():
            sys.exit("qlmanage produced no PNG — is this macOS?")

        square = Image.open(png).convert("RGB")
        if square.size != (W, W):
            square = square.resize((W, W), Image.LANCZOS)
        image = square.crop((0, PAD, W, PAD + H))
        target = OUT / f"{locale}.png"
        image.save(target, optimize=True)
        print(f"{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB")


main()
