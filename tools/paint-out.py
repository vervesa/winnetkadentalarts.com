"""Paint out regions of a photo (cables, clutter, a chipped plank) with the LaMa inpainting model on the CPU.

    python3 -I tools/paint-out.py <in.jpg> <out.jpg> <window x0,y0,x1,y1> <region> [<region> ...]

A region is one of
    x0,y0,x1,y1                 a rectangle
    line:x0,y0,x1,y1[,x2,y2...],w   a stroke of width w along a polyline (a seam, a cable)
    poly:x0,y0,x1,y1,x2,y2[,...]    a filled polygon
    ellipse:x0,y0,x1,y1             a filled ellipse in that box
    -<any of the above>             subtracted from the mask after the others (floor seen inside a coil
                                    of cable: real texture the model can continue from)

All in original-image pixels; the regions are the only areas that change. The window is the crop the
model sees for context (keep it under ~1600 px a side so a run takes seconds). Needs: pip install
torch (CPU wheel from download.pytorch.org/whl/cpu) and simple-lama-inpainting (--no-deps), and the
big-lama.pt weights from github.com/enesmsahin/simple-lama-inpainting/releases at LAMA_MODEL.
Used Nov 4 to remove the cables under the computer desk (IMG_1177), the coiled cord on the floor
(IMG_1179) and the chipped plank seam in the same photo before those photos went on the site."""
import os, sys
os.environ.setdefault("LAMA_MODEL", os.path.expanduser("~/big-lama.pt"))
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from simple_lama_inpainting import SimpleLama

src, dst, window = sys.argv[1], sys.argv[2], tuple(int(v) for v in sys.argv[3].split(","))
regions = sys.argv[4:]

im = Image.open(src).convert("RGB")
crop = im.crop(window)
mask = Image.new("L", crop.size, 0)
d = ImageDraw.Draw(mask)
ox, oy = window[0], window[1]
keep = Image.new("L", crop.size, 0)
for r in regions:
    target, r = (keep, r[1:]) if r.startswith("-") else (mask, r)
    d = ImageDraw.Draw(target)
    kind, _, vals = r.partition(":") if ":" in r else ("box", "", r)
    v = [int(x) for x in vals.split(",")]
    if kind == "box":
        d.rectangle([v[0] - ox, v[1] - oy, v[2] - ox, v[3] - oy], fill=255)
    elif kind == "ellipse":
        d.ellipse([v[0] - ox, v[1] - oy, v[2] - ox, v[3] - oy], fill=255)
    elif kind == "line":
        w, pts = v[-1], [(v[i] - ox, v[i + 1] - oy) for i in range(0, len(v) - 1, 2)]
        d.line(pts, fill=255, width=w, joint="curve")
        for (x, y) in pts:  # round caps
            d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=255)
    elif kind == "poly":
        d.polygon([(v[i] - ox, v[i + 1] - oy) for i in range(0, len(v), 2)], fill=255)
    else:
        sys.exit("unknown region " + r)
mask = mask.filter(ImageFilter.MaxFilter(9))  # a little dilation so the edges of the defect are inside the mask
if keep.getbbox():
    mask = Image.composite(Image.new("L", crop.size, 0), mask, keep)
if os.environ.get("PAINT_OUT_MASK"):  # write the window with the mask tinted red, to check coverage first
    tint = Image.composite(Image.new("RGB", crop.size, (255, 40, 40)), crop, mask.point(lambda v: v * 0.55))
    tint.save(os.environ["PAINT_OUT_MASK"], quality=90)
    full = Image.new("L", im.size, 0)  # the mask in whole-image coordinates, for tools/regrain.py
    full.paste(mask, window[:2])
    full.save(os.environ["PAINT_OUT_MASK"] + ".mask.png")
    if os.environ.get("PAINT_OUT_MASK_ONLY"):
        sys.exit(0)

lama = SimpleLama()
out = lama(crop, mask)
out = out.crop((0, 0, crop.width, crop.height))  # LaMa pads to a multiple of 8; drop the padding

# paste only the masked area back, with a soft edge
soft = mask.filter(ImageFilter.GaussianBlur(6))
merged = Image.composite(out, crop, soft)
im.paste(merged, window[:2])
im.save(dst, quality=94)
print("saved", dst, "regions", regions)
