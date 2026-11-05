#!/usr/bin/env python3
"""Render the Open Graph cards and the apple-touch-icon into public/.

    python3 scripts/build-og.py

Committed output — this runs on a Mac and CI has no QuickLook. Re-run when a
card's words, the mark or the hero screenshot changes; the card text mirrors
`og` in src/i18n/{en,uk}.ts, which is also each card's alt text.

QuickLook is the rasteriser because it is already on every Mac. It flattens onto
opaque white, which is harmless here: every card paints its own full-bleed
ground. The vendored Fixel woff2 files go in as data URIs, both subsets in every
card — the Ukrainian cards still set "SubEye" and "iPhone" in Latin. The home
cards' phone screen is composited afterwards with Pillow, from the same capture
the page shows.
"""

import base64
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
TMP = ROOT / "node_modules" / ".cache" / "og-build"
OUT = ROOT / "public" / "og"
FONTS = ROOT / "public" / "fonts"
SHOTS = ROOT / "src" / "assets" / "app"
MARK_SRC = ROOT / "public" / "favicon.svg"

W, H = 1200, 630
# QuickLook always renders into a square canvas and scales the artboard to fit
# it, clipping anything wider. So the card is drawn as a band inside a 1200x1200
# artboard and cropped back out — deterministic, and nothing is ever cut off.
PAD = (W - H) // 2
BG = "#0f1115"
SURFACE = "#171a20"
TEXT = "#f2f4f8"
MUTED = "#98a0ae"
BRAND = "#33a453"

CARDS = {
    "en": {
        "title": ["See the price rise", "before it hits."],
        "sub": ["iPhone subscription tracker.", "Free, no limit. No bank login."],
        "side": ("shot", "price-rise"),
    },
    "uk": {
        "title": ["Подорожчання", "видно наперед."],
        "sub": ["Трекер підписок для iPhone. Безкоштовно,", "без ліміту. Без доступу до банку."],
        "side": ("shot", "price-rise"),
    },
    "en-bobby-alternative": {
        "title": ["A Bobby alternative,", "on dated facts."],
        "sub": ["Last update, platforms, widgets, free limit,", "price — read on the App Store."],
        "side": ("list", ["Latest version", "Price", "Free version", "Runs on", "Widgets"]),
    },
    "uk-bobby-alternative": {
        "title": ["Альтернатива", "Bobby: факти", "з датами."],
        "sub": ["Оновлення, платформи, віджети, ліміт,", "ціна — за даними App Store."],
        "side": ("list", ["Остання версія", "Ціна", "Безкоштовна версія", "Працює на", "Віджети"]),
    },
    "en-price-increases-2026": {
        "title": ["Subscription price", "increases in 2026."],
        "sub": ["Netflix · Spotify · YouTube Premium · Crunchyroll", "— checked at the source."],
        "side": ("list", ["Netflix", "Spotify", "YouTube Premium", "Crunchyroll"]),
    },
    "uk-price-increases-2026": {
        "title": ["Подорожчання", "підписок", "у 2026 році."],
        "sub": ["Netflix · Spotify · YouTube Premium · Crunchyroll", "— перевірено за джерелом."],
        "side": ("list", ["Netflix", "Spotify", "YouTube Premium", "Crunchyroll"]),
    },
}


def mark_paths() -> str:
    """The eye + three bars out of favicon.svg, so the card cannot drift from it."""
    found = re.findall(r'<path d="([^"]+)"', MARK_SRC.read_text())
    if len(found) != 4:
        sys.exit(f"expected 4 paths in {MARK_SRC}, found {len(found)}")
    return "".join(f'<path d="{d}"/>' for d in found)


def font_faces() -> str:
    """Every subset with its unicode-range from fonts.css; without the ranges the
    last face declared would draw every glyph and drop the other scripts."""
    css = (ROOT / "src" / "styles" / "fonts.css").read_text()
    ranges = dict(re.findall(r'url\("/fonts/([^"]+)"\)[^}]*?unicode-range: ([^;]+);', css))
    faces = []
    for family, stem in (("Fixel Display", "fixeldisplay-semibold"), ("Fixel Text", "fixeltext-regular")):
        for subset in ("latin", "latin-ext", "cyrillic"):
            file = f"{stem}-{subset}.woff2"
            path = FONTS / file
            if not path.exists() or file not in ranges:
                sys.exit(f"missing {path} — run `bun run --cwd apps/landing fonts` first")
            data = base64.b64encode(path.read_bytes()).decode()
            faces.append(
                f"@font-face{{font-family:'{family}';unicode-range:{ranges[file]};"
                f"src:url(data:font/woff2;base64,{data}) format('woff2')}}"
            )
    return "".join(faces)


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;")


def side_list(items: list[str]) -> str:
    rows = []
    top = 150
    for i, item in enumerate(items):
        y = top + i * 78
        rows.append(
            f'<rect x="760" y="{y}" width="360" height="64" rx="18" fill="{SURFACE}"/>'
            f'<rect x="784" y="{y + 22}" width="20" height="20" rx="10" fill="{BRAND}"/>'
            f'<text x="824" y="{y + 41}" font-family="Fixel Text" font-size="25" fill="{TEXT}">{esc(item)}</text>'
        )
    return "".join(rows)


def card_svg(card: dict) -> str:
    top = 250 if len(card["title"]) < 3 else 220
    title = "".join(
        f'<text x="80" y="{top + i * 76}" font-family="Fixel Display" font-size="68" '
        f'letter-spacing="-1.5" fill="{TEXT}">{esc(line)}</text>'
        for i, line in enumerate(card["title"])
    )
    sub_top = top + len(card["title"]) * 76 + 26
    sub = "".join(
        f'<text x="80" y="{sub_top + i * 38}" font-family="Fixel Text" font-size="27" '
        f'fill="{MUTED}">{esc(line)}</text>'
        for i, line in enumerate(card["sub"])
    )
    kind, value = card["side"]
    side = side_list(value) if kind == "list" else ""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{W}" viewBox="0 0 {W} {W}">
<style>{font_faces()}</style>
<rect width="{W}" height="{W}" fill="{BG}"/>
<g transform="translate(0,{PAD})">
<g transform="translate(80,64) scale(0.0637)" fill="{BRAND}">
  <g transform="translate(-136.233,-136.243)">{mark_paths()}</g>
</g>
<text x="140" y="104" font-family="Fixel Display" font-size="36" fill="{TEXT}">SubEye</text>
{title}
{sub}
{side}
</g>
</svg>"""


def icon_svg(size: int) -> str:
    """A full-bleed square: iOS rounds the corners itself."""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="136.233 136.243 753.724 753.724">
<rect x="136.233" y="136.243" width="753.724" height="753.724" fill="{BG}"/>
<g fill="{BRAND}">{mark_paths()}</g>
</svg>"""


def render(svg_text: str, name: str, size: int) -> Image.Image:
    TMP.mkdir(parents=True, exist_ok=True)
    svg = TMP / f"{name}.svg"
    svg.write_text(svg_text)
    png = TMP / f"{name}.svg.png"
    png.unlink(missing_ok=True)
    subprocess.run(
        ["qlmanage", "-t", "-s", str(size), "-o", str(TMP), str(svg)],
        check=True,
        capture_output=True,
    )
    if not png.exists():
        sys.exit("qlmanage produced no PNG — is this macOS?")
    image = Image.open(png).convert("RGB")
    return image if image.size == (size, size) else image.resize((size, size), Image.LANCZOS)


def phone(locale: str, shot: str) -> tuple[Image.Image, Image.Image]:
    """The hero capture in a plain bezel, as the page frames it; returns image and mask."""
    screen = Image.open(SHOTS / locale / f"{shot}.webp").convert("RGB").resize((360, 782), Image.LANCZOS)
    bezel = 11
    frame = Image.new("RGB", (360 + bezel * 2, 782 + bezel * 2), "#050607")
    radius = 46
    screen_mask = Image.new("L", screen.size, 0)
    ImageDraw.Draw(screen_mask).rounded_rectangle((0, 0, *screen.size), radius=radius, fill=255)
    frame.paste(screen, (bezel, bezel), screen_mask)
    mask = Image.new("L", frame.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *frame.size), radius=radius + bezel, fill=255)
    return frame, mask


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    for name, card in CARDS.items():
        square = render(card_svg(card), name, W)
        image = square.crop((0, PAD, W, PAD + H))
        kind, value = card["side"]
        if kind == "shot":
            frame, mask = phone(name.split("-")[0], value)
            # Bleeds off the bottom edge: the card shows the dated rise, the
            # page shows the rest of the screen.
            image.paste(frame, (760, 70), mask)
        target = OUT / f"{name}.png"
        image.save(target, optimize=True)
        print(f"{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB")

    # Drawn at card size and scaled down: QuickLook mis-scales a small artboard.
    icon = render(icon_svg(W), "apple-touch-icon", W).resize((180, 180), Image.LANCZOS)
    target = ROOT / "public" / "apple-touch-icon.png"
    icon.save(target, optimize=True)
    print(f"{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB")


main()
