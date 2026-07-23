"""
Generate Nexus Suite social preview image (1280x640 PNG).
Used as: GitHub repo social preview + Open Graph image.
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = '/home/z/my-project/public/social-preview.png'
W, H = 1280, 640

# Emerald-on-dark brand palette
BG = (13, 30, 28)         # deep emerald-tinted dark
ACCENT = (16, 185, 129)   # emerald-500
ACCENT_LIGHT = (110, 231, 183)  # emerald-300
WHITE = (245, 250, 248)
MUTED = (160, 180, 175)

img = Image.new('RGB', (W, H), BG)
draw = ImageDraw.Draw(img)

# Try fonts available in the env
def font(size, bold=False):
    paths = [
        '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.otf' if bold else '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.otf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ]
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

# Diagonal accent band (top-left)
draw.polygon([(0, 0), (480, 0), (0, 240)], fill=(20, 45, 40))

# Brand mark — three emerald squares
for i, (x, y, sz, alpha) in enumerate([(140, 200, 70, 255), (200, 260, 70, 200), (260, 320, 70, 140)]):
    overlay = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
    ImageDraw.Draw(overlay).rectangle([0, 0, sz, sz], fill=(*ACCENT, alpha))
    img.paste(overlay, (x, y), overlay)

# Main title
draw.text((140, 380), 'Nexus Suite', font=font(88, bold=True), fill=WHITE)

# Tagline
draw.text((140, 470), 'All-in-one modular enterprise PM + ERP suite.', font=font(34), fill=ACCENT_LIGHT)

# Sub-tagline
draw.text((140, 520), '100% free & open-source · Self-host forever · AGPL-3.0', font=font(24), fill=MUTED)

# Right side — module badges
modules = ['Tasks', 'Rooms', 'Leave', 'KRA/KPA', 'Resource', 'Budget', 'Reporting', 'Docs']
mod_x, mod_y = 740, 180
for i, m in enumerate(modules):
    col = i % 2
    row = i // 2
    x = mod_x + col * 230
    y = mod_y + row * 70
    # Pill background
    pill_w = 200
    pill_h = 50
    draw.rounded_rectangle([x, y, x + pill_w, y + pill_h], radius=25, fill=(20, 45, 40), outline=ACCENT, width=2)
    # Center text
    f = font(20, bold=True)
    bbox = draw.textbbox((0, 0), m, font=f)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    draw.text((x + (pill_w - text_w) // 2, y + (pill_h - text_h) // 2 - 2), m, font=f, fill=ACCENT_LIGHT)

# Footer
draw.text((140, 580), 'github.com/pranavgawasproject/nexus-suite', font=font(20), fill=MUTED)

# Top-right accent dot
draw.ellipse([1180, 60, 1220, 100], fill=ACCENT)

img.save(OUT, 'PNG', optimize=True)
print(f'Saved {OUT} ({os.path.getsize(OUT) // 1024}KB)')
