"""Give a LaMa fill real texture: keep the fill's tones and lighting, take the grain from elsewhere in the photo.

    python3 -I tools/regrain.py <orig.jpg> <painted.jpg> <mask.png> <out.jpg> \
        --region x0,y0,x1,y1 --floor x,y,x,y,... [--exclude x,y,x,y,...] [--horizon y] [--sigma 7]

LaMa (tools/paint-out.py) fills a big hole with the right colours and reflections but a smooth, painted
surface. For a textured surface like a plank floor this re-grains the fill: inside the mask (limited to
--region) the result is the fill's low frequencies plus the high frequencies of the original photo taken
from somewhere else on the floor. That somewhere is found by matching the original around the hole (a
ring just outside the mask) against the original everywhere a copy could come from, so plank edges and
the grain direction line up; the ring and the source must lie inside --floor (a polygon of clean floor)
and outside --exclude (a polygon never to copy from, such as a bright reflection) and the mask itself.

Perspective: floor further down the frame is nearer the camera and its grain bigger. With --horizon (the
row where the floor's parallel lines meet, i.e. its vanishing line) the source is scaled by
(source row - horizon) / (hole row - horizon) before matching and copying, so the grain lands at the
size it has at the hole. The mask comes from paint-out.py (PAINT_OUT_MASK=... writes <that>.mask.png in
whole-image coordinates)."""
import argparse
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, binary_dilation, zoom
from scipy.signal import correlate

ap = argparse.ArgumentParser()
ap.add_argument("orig"); ap.add_argument("painted"); ap.add_argument("mask"); ap.add_argument("out")
ap.add_argument("--region", required=True, help="x0,y0,x1,y1 — the part of the mask to re-grain")
ap.add_argument("--floor", required=True, help="polygon of clean floor: x,y,x,y,...")
ap.add_argument("--exclude", default="", help="polygon never to copy from: x,y,x,y,...")
ap.add_argument("--horizon", type=float, default=None, help="row of the floor's vanishing line, for perspective scaling")
ap.add_argument("--scales", default="1.0", help="without --horizon: the source scale factors to try, e.g. 1.0,1.3,1.7")
ap.add_argument("--sigma", type=float, default=7.0, help="split between tones (kept from the fill) and grain (copied)")
ap.add_argument("--ring", type=int, default=30, help="width of the matching ring around the mask")
a = ap.parse_args()

O = np.asarray(Image.open(a.orig).convert("RGB"), dtype=np.float32)
L = np.asarray(Image.open(a.painted).convert("RGB"), dtype=np.float32)
Mfull = np.asarray(Image.open(a.mask).convert("L")) > 127
H, W = Mfull.shape
rx0, ry0, rx1, ry1 = (int(v) for v in a.region.split(","))
M = np.zeros_like(Mfull); M[ry0:ry1, rx0:rx1] = Mfull[ry0:ry1, rx0:rx1]

def poly_mask(spec):
    im = Image.new("L", (W, H), 0)
    if spec:
        v = [int(x) for x in spec.split(",")]
        ImageDraw.Draw(im).polygon([(v[i], v[i + 1]) for i in range(0, len(v), 2)], fill=255)
    return np.asarray(im) > 127

def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r

floor = poly_mask(a.floor)
bad_src = ~floor | poly_mask(a.exclude) | binary_dilation(Mfull, disk(40))  # where grain must not come from
ring = binary_dilation(M, disk(a.ring)) & ~binary_dilation(M, disk(3)) & floor
S = M | ring  # everything that, moved to the source, must land on clean floor
ys, xs = np.nonzero(S)
sy0, sy1, sx0, sx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
hole_row = (sy0 + sy1) / 2

lum = O.mean(axis=2)
def midpass(img):  # streaks and plank edges, not brightness
    return gaussian_filter(img, 3) - gaussian_filter(img, 20)
Sk = S[sy0:sy1, sx0:sx1].astype(np.float32)
Rk = ring[sy0:sy1, sx0:sx1].astype(np.float32)
Ak = midpass(lum)[sy0:sy1, sx0:sx1] * Rk

def xcorr(big, small):  # c[i, j] = sum_p small(p) * big(p + (j, i)), only where small fits inside big
    full = correlate(big, small, mode="full", method="fft")
    return full[small.shape[0] - 1:big.shape[0], small.shape[1] - 1:big.shape[1]]

# Candidate sources: the original downscaled by k (grain k times bigger than at the hole becomes the
# right size), matched against the ring. With --horizon, k follows the source row, so each band of rows
# is tried at its own scale; otherwise the listed scales are tried and the best taken.
if a.horizon is not None:
    fy0, fy1 = np.nonzero(floor & ~bad_src)[0].min(), np.nonzero(floor & ~bad_src)[0].max()
    rows = np.linspace(fy0, fy1, 7)
    trials = [((r0 + r1) / 2 - a.horizon) / (hole_row - a.horizon) for r0, r1 in zip(rows[:-1], rows[1:])]
    bands = list(zip(rows[:-1], rows[1:]))
else:
    trials = [float(v) for v in a.scales.split(",")]
    bands = [(0, H)] * len(trials)

best = None
for k, (band0, band1) in zip(trials, bands):
    k = max(k, 0.2)
    small = zoom(lum, 1 / k, order=1) if k != 1 else lum
    bad_small = zoom(bad_src.astype(np.float32), 1 / k, order=1) > 0.05 if k != 1 else bad_src
    B = midpass(small)
    cnt = xcorr(bad_small.astype(np.float32), Sk)   # how much of the hole+ring lands on bad pixels
    corr = xcorr(B, Ak)                              # sum_R A(p) B(p+T)
    sq = xcorr(B * B, Rk)                            # sum_R B(p+T)^2
    score = (Ak * Ak).sum() - 2 * corr + sq          # sum_R (A - B_T)^2, index (i, j) <-> T = (j - sx0, i - sy0)
    score = np.where(cnt < 0.5, score, np.inf)
    if a.horizon is not None:  # this scale is only right for sources in its own band of rows
        src_rows = (np.arange(score.shape[0]) - sy0 + hole_row) * k  # source row of the hole's centre, full-res
        score[(src_rows < band0) | (src_rows >= band1)] = np.inf
    if not np.isfinite(score).any():
        continue
    i, j = np.unravel_index(np.argmin(score), score.shape)
    s = float(score[i, j] / Rk.sum())
    print(f"scale {k:.2f}: best offset ({j - sx0}, {i - sy0}) in the scaled image, mismatch {s:.1f}")
    if best is None or s < best[0]:
        best = (s, k, (int(j - sx0), int(i - sy0)))
if best is None:
    raise SystemExit("no source puts the whole hole on clean floor; widen --floor")
_, k, T = best
print(f"using scale {k:.2f}, offset {T}")

# The fill: tones and lighting from the painted image (averaged over floor pixels only, so the pedestal
# and the wall don't bleed in), grain from the scaled original at the chosen offset.
tex = M & ~binary_dilation(~floor, disk(10))
fl = floor.astype(np.float32)
norm = gaussian_filter(fl, a.sigma) + 1e-6
Lp = np.stack([gaussian_filter(L[..., c] * fl, a.sigma) / norm for c in range(3)], axis=2)
Os = np.stack([zoom(O[..., c], 1 / k, order=1) for c in range(3)], axis=2) if k != 1 else O
Oh = Os - np.stack([gaussian_filter(Os[..., c], a.sigma) for c in range(3)], axis=2)
ys, xs = np.nonzero(tex)
F = L.copy()
F[ys, xs] = Lp[ys, xs] + Oh[ys + T[1], xs + T[0]]
alpha = gaussian_filter(tex.astype(np.float32), 2.0)[..., None]
out = L * (1 - alpha) + F * alpha
Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save(a.out, quality=94)
print("saved", a.out, "pixels re-grained", int(tex.sum()))
