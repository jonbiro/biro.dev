"""Generate the AddvancedFocus raster icons and concept illustrations from the SVG master.

Runs before generate.py in Netlify; the source SVG remains editable in Git.
Only replaces assets belonging to AddvancedFocus. Other product icons are unchanged.
"""
from pathlib import Path
from io import BytesIO
import base64
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "dist" / "assets" / "products"
ICONS = OUTPUT / "icons"
MASTER = ICONS / "addvancedfocus-af.svg"
ICONS.mkdir(parents=True, exist_ok=True)
svg = MASTER.read_text(encoding="utf-8")


def png_image(svg_data, width, height):
    blob = cairosvg.svg2png(bytestring=svg_data.encode("utf-8"), output_width=width, output_height=height)
    return Image.open(BytesIO(blob)).convert("RGBA")


def save_webp(image, filename, quality=91):
    image.convert("RGB").save(filename, "WEBP", quality=quality, method=6)


icon = png_image(svg, 1024, 1024)
# SVG is preferred on the site. These are raster fallbacks and downloads.
for size in (16, 24, 32, 48, 64, 128, 180, 192, 256, 512, 1024):
    image = icon.resize((size, size), Image.Resampling.LANCZOS)
    image.save(ICONS / f"addvancedfocus-{size}.png", optimize=True)
    if size in (64, 128, 256, 512, 1024):
        save_webp(image, ICONS / f"addvancedfocus-{size}.webp")
# Overwrite the legacy central icon, so any older references display the new AF/checkmark.
save_webp(icon, ICONS / "addvancedfocus.webp", quality=94)

icondata = base64.b64encode((ICONS / "addvancedfocus-256.png").read_bytes()).decode("ascii")
art = r'''<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024" role="img" aria-label="Illustrative AddvancedFocus interface with the updated AF checkmark icon">
<defs>
<linearGradient id="back" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0C1D39"/><stop offset=".55" stop-color="#091427"/><stop offset="1" stop-color="#081126"/></linearGradient>
<linearGradient id="call" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#52A8FF"/><stop offset="1" stop-color="#02DFD0"/></linearGradient>
<radialGradient id="orb"><stop stop-color="#3570CB" stop-opacity=".45"/><stop offset="1" stop-color="#3570CB" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1536" height="1024" fill="url(#back)"/>
<circle cx="1240" cy="240" r="490" fill="url(#orb)"/>
<path d="M0 935C280 825 445 978 690 876S1080 705 1536 836" fill="none" stroke="#4F90F5" stroke-opacity=".14" stroke-width="2"/>
__ICON__
<text x="294" y="203" fill="#F2FAFF" font-size="61" font-family="Arial,Helvetica,sans-serif" font-weight="700">Addvanced<tspan fill="#54C1FF">Focus</tspan></text>
<text x="118" y="368" fill="#8CC6FF" font-size="27" font-family="Arial,Helvetica,sans-serif" font-weight="600" letter-spacing="6">THE NEXT STEP, MADE POSSIBLE</text>
<text x="115" y="464" fill="#F4FAFF" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="65">Less deciding.</text>
<text x="115" y="544" fill="#F4FAFF" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="65">More beginning.</text>
<text x="119" y="616" fill="#BDD0E7" font-family="Arial,Helvetica,sans-serif" font-size="29">One useful action at a time.</text>
<text x="119" y="657" fill="#BDD0E7" font-family="Arial,Helvetica,sans-serif" font-size="29">Start small. Pause. Come back.</text>
<rect x="115" y="727" width="195" height="59" rx="29" fill="url(#call)"/>
<text x="157" y="764" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="24" fill="#09243B">Start focus</text>
<text x="114" y="924" font-family="Arial,Helvetica,sans-serif" font-size="23" fill="#8296B8" letter-spacing="3">ILLUSTRATIVE PRODUCT CONCEPT</text>
<rect x="902" y="85" width="495" height="875" rx="73" fill="#071021" stroke="#5387C8" stroke-opacity=".34" stroke-width="3"/>
<rect x="919" y="101" width="461" height="844" rx="62" fill="#0A1A31"/>
<rect x="1061" y="120" width="180" height="31" rx="15" fill="#050D1D"/>
<text x="951" y="185" font-family="Arial,Helvetica,sans-serif" fill="#F3FAFF" font-weight="700" font-size="29">Addvanced<tspan fill="#69C9FF">Focus</tspan></text>
<circle cx="1327" cy="172" r="20" fill="#153252" stroke="#3B6FB3" stroke-width="2"/>
<path d="M1327 160v24m-12-12h24" stroke="#AED2FF" stroke-width="2" stroke-linecap="round"/>
<rect x="946" y="221" width="406" height="72" rx="35" fill="#112A4C"/>
<rect x="952" y="227" width="126" height="60" rx="29" fill="#408BFF"/>
<text x="982" y="265" fill="#FFF" font-family="Arial,Helvetica,sans-serif" font-size="23" font-weight="700">Now</text>
<text x="1111" y="265" fill="#B2C8E1" font-family="Arial,Helvetica,sans-serif" font-size="22">Today</text>
<text x="1224" y="265" fill="#B2C8E1" font-family="Arial,Helvetica,sans-serif" font-size="21">Upcoming</text>
<text x="947" y="354" fill="#87B9F7" font-family="Arial,Helvetica,sans-serif" font-size="18" letter-spacing="3">ONE USEFUL STEP</text>
<rect x="946" y="378" width="409" height="226" rx="29" fill="#123052" stroke="#477FB8" stroke-opacity=".6"/>
<circle cx="987" cy="429" r="17" fill="none" stroke="#67C8FF" stroke-width="4"/>
<text x="1023" y="438" fill="#F2F8FF" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700">Send a follow-up</text>
<text x="1023" y="468" fill="#F2F8FF" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700">email</text>
<text x="987" y="530" fill="#B7CEE8" font-family="Arial,Helvetica,sans-serif" font-size="20">Open the draft. Start with one line.</text>
<rect x="980" y="552" width="116" height="30" rx="15" fill="#17416B"/>
<text x="999" y="573" fill="#C7E6FF" font-family="Arial,Helvetica,sans-serif" font-size="17">2 minutes</text>
<rect x="1108" y="552" width="106" height="30" rx="15" fill="#134A57"/>
<text x="1125" y="573" fill="#80E5D7" font-family="Arial,Helvetica,sans-serif" font-size="17">Low effort</text>
<text x="950" y="677" fill="#EAF4FF" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="700">Focus for a moment</text>
<rect x="947" y="705" width="407" height="134" rx="27" fill="#0E243E" stroke="#294A70"/>
<text x="975" y="765" fill="#D7ECFF" font-family="Arial,Helvetica,sans-serif" font-size="43" font-weight="700">02:00</text>
<rect x="1172" y="736" width="155" height="61" rx="30" fill="url(#call)"/>
<text x="1213" y="774" fill="#082436" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700">Begin</text>
<text x="952" y="891" fill="#9DC2E9" font-family="Arial,Helvetica,sans-serif" font-size="18">Pause anytime · Your progress is yours</text>
</svg>'''
art = art.replace("__ICON__", '<image x="106" y="114" width="169" height="169" href="data:image/png;base64,' + icondata + '"/>')
(OUTPUT / "addvancedfocus-modern.svg").write_text(art, encoding="utf-8")
concept = png_image(art, 1536, 1024).convert("RGB")
# The legacy filenames are still used in metadata and by older bookmarks.
for filename in ("addvancedfocus.jpg", "addvancedfocus-modern.jpg"):
    concept.save(OUTPUT / filename, format="JPEG", quality=92, subsampling=0, optimize=True)
for filename in ("addvancedfocus.webp", "addvancedfocus-modern.webp"):
    concept.save(OUTPUT / filename, format="WEBP", quality=92, method=6)
print("Rendered AddvancedFocus master icon and modern product artwork")
