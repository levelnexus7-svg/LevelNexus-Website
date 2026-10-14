# -*- coding: utf-8 -*-
"""Rebuild every Level Nexus logo asset from the real master artwork.

Pipeline note: all geometric resizing happens on the RGB image composited on
WHITE, and the white->alpha conversion is applied LAST.  That way the
anti-aliasing is produced by a normal image resize (no alpha fringing), and the
result is mathematically exact when re-composited on white.
"""
import os
import struct

import numpy as np
from PIL import Image

ROOT = r'C:\Users\james\Downloads\level-nexus-site (2)'
IMG = os.path.join(ROOT, 'assets', 'img')
ICO = os.path.join(ROOT, 'assets', 'icons')
SRC = os.path.join(IMG, 'logo-source.jpg')   # master artwork (white background)

MARK_BOX = (51, 72, 647, 756)      # 596 x 684
LOCK_BOX = (51, 72, 1943, 756)     # 1892 x 684
WORD_X = 680                       # wordmark starts here (source coords)

MARK_ASPECT = (MARK_BOX[2] - MARK_BOX[0]) / (MARK_BOX[3] - MARK_BOX[1])
LOCK_ASPECT = (LOCK_BOX[2] - LOCK_BOX[0]) / (LOCK_BOX[3] - LOCK_BOX[1])

src = Image.open(SRC).convert('RGB')
MARK_IM = src.crop(MARK_BOX)
LOCK_IM = src.crop(LOCK_BOX)

# navy reference for the "light" (white wordmark) variant
_L = np.asarray(LOCK_IM).astype(np.float64)
_core = _L[:, WORD_X - LOCK_BOX[0]:]
_m = (_core.min(axis=2) < 40) & (_core[:, :, 2] < 130)
NAVY = _core[_m].mean(axis=0)
print('navy reference', np.round(NAVY, 1), 'n', int(_m.sum()))


def paste_on_white(im, canvas_size, content_size, pos):
    c = Image.new('RGB', canvas_size, (255, 255, 255))
    c.paste(im.resize(content_size, Image.LANCZOS), pos)
    return c


def to_rgba(im, a_override=None, floor=0.045):
    """White background -> alpha.  Exact reconstruction when put back on white."""
    p = np.asarray(im.convert('RGB')).astype(np.float64) / 255.0
    a = np.clip(1.0 - p.min(axis=2), 0.0, 1.0) if a_override is None else a_override
    a = np.where(a < floor, 0.0, a)
    nz = a > 0
    aa = np.where(nz, a, 1.0)[..., None]
    rgb = np.clip((p - (1.0 - aa)) / aa, 0.0, 1.0)
    if a_override is not None:
        rgb[a_override > 0.45] = 1.0
    out = np.concatenate([rgb, a[..., None]], axis=2)
    return Image.fromarray((out * 255.0 + 0.5).astype(np.uint8), 'RGBA')


def mark_asset(canvas, frac, floor=0.045):
    ch = int(round(canvas * frac))
    cw = int(round(ch * MARK_ASPECT))
    pos = ((canvas - cw) // 2, (canvas - ch) // 2)
    return to_rgba(paste_on_white(MARK_IM, (canvas, canvas), (cw, ch), pos), floor=floor)


def mark_asset_opaque(canvas, frac):
    """White-background square (apple-touch-icon / maskable)."""
    ch = int(round(canvas * frac))
    cw = int(round(ch * MARK_ASPECT))
    pos = ((canvas - cw) // 2, (canvas - ch) // 2)
    rgb = paste_on_white(MARK_IM, (canvas, canvas), (cw, ch), pos)
    out = np.concatenate([np.asarray(rgb).astype(np.float64) / 255.0,
                          np.ones((canvas, canvas, 1))], axis=2)
    return Image.fromarray((out * 255.0 + 0.5).astype(np.uint8), 'RGBA')


def lockup_asset(canvas_h, pad_frac=0.04, light=False):
    ch = int(round(canvas_h * (1 - 2 * pad_frac)))
    cw = int(round(ch * LOCK_ASPECT))
    pad = int(round(canvas_h * pad_frac))
    rgb = paste_on_white(LOCK_IM, (cw + 2 * pad, ch + 2 * pad), (cw, ch), (pad, pad))
    if not light:
        return to_rgba(rgb)

    # light variant: repaint the navy wordmark as WHITE ink
    p = np.asarray(rgb).astype(np.float64) / 255.0
    n = NAVY / 255.0
    ai = (1.0 - p) / (1.0 - n)
    a_n = ai.mean(axis=2)
    spread = ai.max(axis=2) - ai.min(axis=2)
    x0 = pad + int(round((WORD_X - LOCK_BOX[0]) * cw / (LOCK_BOX[2] - LOCK_BOX[0])))
    sel = np.zeros(p.shape[:2], bool)
    sel[:, x0:] = True
    sel &= (spread < 0.15) & (a_n > 0.45)
    a = np.clip(1.0 - p.min(axis=2), 0.0, 1.0)
    a[sel] = np.clip(a_n[sel], 0.0, 1.0)
    return to_rgba(rgb, a_override=a, floor=0.045)


def save(im, path):
    im.save(path, optimize=True) if path.endswith('.png') else im.save(path)
    print('wrote', os.path.basename(path), im.size, im.mode, os.path.getsize(path))


# ---------------------------------------------------------------- master mark
save(mark_asset(640, 0.942), os.path.join(IMG, 'logo-mark.png'))
save(mark_asset(256, 0.945), os.path.join(IMG, 'logo-mark-sm.png'))

# ------------------------------------------------------------- full lockups
save(lockup_asset(120), os.path.join(IMG, 'logo-full.png'))
save(lockup_asset(240), os.path.join(IMG, 'logo-full@2x.png'))
save(lockup_asset(120, light=True), os.path.join(IMG, 'logo-full-light.png'))
save(lockup_asset(240, light=True), os.path.join(IMG, 'logo-full-light@2x.png'))

# -------------------------------------------------------------- app icons
ICON_FRAC = 0.886
icons = {}
for s in (16, 32, 48, 96, 192, 512):
    im = mark_asset(s, ICON_FRAC)
    icons[s] = im
    save(im, os.path.join(ICO, 'icon-%d.png' % s))
save(mark_asset_opaque(180, 0.733), os.path.join(ICO, 'apple-touch-icon.png'))
save(mark_asset_opaque(512, 0.584), os.path.join(ICO, 'maskable-512.png'))

# ----------------------------------------------------------------- favicon.ico
def write_ico(path, images):
    n = len(images)
    head = struct.pack('<HHH', 0, 1, n)
    offset = 6 + 16 * n
    entries, blobs = b'', b''
    for im in sorted(images, key=lambda i: i.width):
        blob = im.tobytes('raw', 'RGBA')  # placeholder, replaced below
        import io
        buf = io.BytesIO()
        im.save(buf, format='PNG', optimize=True)
        blob = buf.getvalue()
        w = im.width if im.width < 256 else 0
        h = im.height if im.height < 256 else 0
        entries += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(blob), offset)
        offset += len(blob)
        blobs += blob
    with open(path, 'wb') as f:
        f.write(head + entries + blobs)


write_ico(os.path.join(ROOT, 'favicon.ico'), [icons[16], icons[32], icons[48]])
print('wrote favicon.ico', os.path.getsize(os.path.join(ROOT, 'favicon.ico')))

# --------------------------------------------------------------- og card mark
og = Image.open(os.path.join(IMG, 'og-image.jpg')).convert('RGB')
o = np.asarray(og).astype(np.uint8).copy()
yy, xx = np.mgrid[0:o.shape[0], 0:o.shape[1]]
r = np.sqrt((xx - 299.5) ** 2 + (yy - 314.5) ** 2)
o[r < 206.0] = 255                       # wipe the old mark off the white disc
og = Image.fromarray(o, 'RGB')
disc_bg = og.getpixel((300, 130))
print('disc interior colour', disc_bg)

MH = 312
MW = int(round(MH * MARK_ASPECT))
m = to_rgba(paste_on_white(MARK_IM, (MW, MH), (MW, MH), (0, 0)))
og.paste(m, (int(round(299.5 - MW / 2)), int(round(314.5 - MH / 2))), m)
og.save(os.path.join(IMG, 'og-image.jpg'), quality=90, optimize=True, subsampling=0)
print('wrote og-image.jpg', og.size, os.path.getsize(os.path.join(IMG, 'og-image.jpg')),
      'mark', (MW, MH))

# ------------------------------------------------------------------- master
print('master artwork:', os.path.getsize(SRC), 'bytes ->', SRC)
