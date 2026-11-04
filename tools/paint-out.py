"""Paint out regions of a photo (cables, clutter) with the LaMa inpainting model on the CPU.

    python3 -I tools/paint-out.py <in.jpg> <out.jpg> <window x0,y0,x1,y1> <box x0,y0,x1,y1> [<box> ...]

Boxes are in original-image pixels and are the only areas that change; the window is the crop the
model sees for context (keep it under ~1600 px a side so a run takes seconds). Needs: pip install
torch (CPU wheel from download.pytorch.org/whl/cpu) and simple-lama-inpainting (--no-deps), and the
big-lama.pt weights from github.com/enesmsahin/simple-lama-inpainting/releases at LAMA_MODEL.
Used Nov 4 to remove the cables under the computer desk (IMG_1177) and the coiled cord on the floor
(IMG_1179) before those photos went on the site."""
import os, sys
os.environ.setdefault("LAMA_MODEL", os.path.expanduser("~/big-lama.pt"))
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from simple_lama_inpainting import SimpleLama

src, dst, window = sys.argv[1], sys.argv[2], tuple(int(v) for v in sys.argv[3].split(","))
boxes = [tuple(int(v) for v in b.split(",")) for b in sys.argv[4:]]

im = Image.open(src).convert("RGB")
crop = im.crop(window)
mask = Image.new("L", crop.size, 0)
d = ImageDraw.Draw(mask)
for (x0, y0, x1, y1) in boxes:
    d.rectangle([x0 - window[0], y0 - window[1], x1 - window[0], y1 - window[1]], fill=255)
mask = mask.filter(ImageFilter.MaxFilter(9))  # a little dilation so cable edges are inside the mask

lama = SimpleLama()
out = lama(crop, mask)
out = out.resize(crop.size)  # LaMa pads to a multiple of 8; bring it back to the crop size

# paste only the masked area back, with a soft edge
soft = mask.filter(ImageFilter.GaussianBlur(6))
merged = Image.composite(out, crop, soft)
im.paste(merged, window[:2])
im.save(dst, quality=94)
print("saved", dst, "boxes", boxes)
