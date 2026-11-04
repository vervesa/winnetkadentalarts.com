# winnetkadentalarts.com — image shot list

What the site still needs, slot by slot, with the exact size and crop each slot uses. "Shoot" = a real photo of the practice (always better than stock where the subject is the practice itself); "Stock" = Adobe Stock, Standard license (covers web use; no "Editorial use only" assets; leave "Generative AI" excluded). Hand over originals at full resolution — the build makes the WebP/AVIF and responsive sizes, so never pre-shrink. The Nov 4 office set (IMG_1088–1179, iPhone HEIC, 12 MP) is kept with Luke; the chosen frames live in `public/assets/img/src/` downsized to 2400 px.

Look for every stock image: natural light, warm neutrals (ivory, camel, oatmeal, navy, charcoal) that sit next to the site's navy and ivory; understated, well-dressed, North Shore; genuine expressions, real teeth (no retouched "whitening-ad" smiles); no clinical props, no gloved hands, no stock-dental clichés. Mix ages across the site — the hero is young; implants, prosthetics and TMD pages can carry patients in their 50s–70s.

## Home page

| # | Slot | Subject | Crop the site uses | Deliver at least | Source |
|---|------|---------|--------------------|------------------|--------|
| 1 | Hero (`.hero-media`, right of the headline) | **Done (Nov 4):** young woman, brown hair, white tee, natural smile — the stock photo Luke supplied (2576×1718 original in `src/hero.jpg`, cropped 4:5 at focus 0.24/0.5 by `tools/images.mjs`; keep the license record with the practice) | Portrait **4:5 arch**, 500 px wide on desktop / 420 on phones | — | Stock, licensed |
| 2 | "Our practice" plate (`.offset-figure`) | **Done (Nov 4):** the Galleria courtyard façade, clock tower centred (IMG_1134, square crop). Luke's call: the building, not a team photo. A photo of Dr. Warga and Jeanne could still go elsewhere later. | **1:1** | — | Shot by the office |
| 3 | Photo strip, arch 1 | **Done:** reception desk with the stained-glass door on the right (IMG_1108, cropped 3:4 toward the glass) | 3:4 arch | — | Shot by the office |
| 4 | Photo strip, arch 2 | **Done:** treatment room with the brick wall and garden window (IMG_1179, Luke's pick) | 3:4 arch | — | Shot by the office |
| 5 | Photo strip, arch 3 | **Done:** the Commercial Entrance door at the courtyard, 568-570 Lincoln, with the practice's name on the glass (IMG_1132, cropped above the doormat; was the rear brick arch IMG_1130, which is the parking-lot entrance and now sits on the Contact page next to the parking directions) | 3:4 arch | — | Shot by the office |
| 6 | Dr. Warga section (`.doctor-media`) | Dr. Warga chairside or at the microscope, candid | **5:6 arch**, face toward the top (`object-position 38% 12%`) | 1250 × 1500 | Shoot |
| 7 | "Pleasure in the Job" feature | Magazine cover — have it | — | — | Done |
| 8 | Social preview (`og:image`, shows when the link is texted or shared) | **Done:** 1.91:1 crop of the hero (`og-hero.jpg`, 1200×628) | **1200 × 628** | — | Made from #1 |

## Inner pages

| # | Page / slot | Subject | Crop | Deliver at least | Source |
|---|-------------|---------|------|------------------|--------|
| 9 | Dr. Warga page portrait (`.portrait`) | Proper headshot — currently a 500×500 file scaled up, the weakest image on the site | **4:5 arch** | 1200 × 1500 | Shoot |
| 10 | Our Office | **Top photo done** = Galleria entrance with planters (IMG_1135, 3:2; also the og:image on inner pages). **Hidden since Nov 4 at Luke's request ("for now hide/remove all images here"):** the strip — our entrance vestibule (IMG_1103), reception (IMG_1108, 3:2), waiting room (IMG_1152) — and the large treatment-room photo with the computer desk (IMG_1177, 3:2) under it. The files and the `tools/images.json` entries are still there; the markup to put back is in commit a44d8fa (`public/our-office/index.html`) — Luke: highlight the treatment room, not the sterilization area. The cable tangle under the desk (IMG_1177) was painted out by Luke in Claude Design (the file in `src/office-operatory.jpg` is that export, 1932×2576 — only the under-desk area differs from the original); the coiled cord on the floor of IMG_1179 (home arch) was painted out with `tools/paint-out.py` (LaMa inpainting) | 3:2 | — | Shot by the office |
| 10b | Contact, under the parking directions | **Done:** the rear entrance from the public lot (IMG_1130, 3:2 crop) | 3:2 | — | Shot by the office |
| 11 | Prosthetics (Reconstruction), wide plate | Porcelain crowns and a bridge on a lab model, soft window light — or a couple in their 60s laughing together | 2:1 / 3:2 | 1600 × 1067 | Stock |
| 12 | Dental Implants, wide plate | Implant and ceramic crown on a neutral stone surface, macro — or a confident man, 60s, smiling | 2:1 / 3:2 | 1600 × 1067 | Stock |
| 13 | Aesthetics, wide plate | Porcelain veneers on a ceramic tray, macro — or a second (different) young woman smiling, candid | 2:1 / 3:2 | 1600 × 1067 | Stock |
| 14 | Occlusal Function, wide plate | Dental articulator with mounted study models, detail | 2:1 / 3:2 | 1600 × 1067 | Shoot (the office has one) or stock |
| 15 | Sleep Apnea and Airway, wide plate | Custom oral sleep appliance on linen, morning light — or someone asleep peacefully, bright bedroom | 2:1 / 3:2 | 1600 × 1067 | Stock |
| 16 | TMD, wide plate | Occlusal splint on a stone surface, detail — or a woman in her 30s–40s, relaxed, hand at her jaw (calm, not pained) | 2:1 / 3:2 | 1600 × 1067 | Stock |
| 17 | Child Development and Nutrition, wide plate | A child (8–12) with an apple or fresh fruit and a glass of water on linen, morning light | 2:1 / 3:2 | 1600 × 1067 | Stock |
| 18 | Smile Gallery | Higher-resolution before/after originals (current files are 1080×331 strips) | 3.26:1 strip | 2400 × 736 or the separate before and after frames | Office archive |

Optional, no slot yet: a welcome shot of the front desk for New Patients; a second treatment room for Our Office.

## Hero: candidates and how to search

Brief from Dr. Warga and Luke: a young woman of European descent, smiling **with teeth showing** — good-looking, even teeth (no gaps, nothing crooked) — close crop like naplesdentalarts.com, elegant and understated. Reviewed at full preview size on Adobe Stock (open with `https://stock.adobe.com/images/x/<id>`):

1. **2227293782** — close-up, hand on chin, broad genuine smile, straight white teeth, dark hair, soft blue top, warm interior. The closest match to the Naples pose. Same shoot, wider framing on a couch: 2229954733.
2. **2033093740** — long brown hair, window light, warm smile, charcoal background. The most "quiet luxury" of the set and the background sits perfectly next to the site's navy.
3. **1525726933** — blonde, blue eyes, soft natural smile with teeth, beige backdrop. Classic beauty portrait, a touch more polished.
4. **693854959** — blonde bob, sage shirt, chin on fist, bright smile, beige backdrop. Landscape file (she sits left of centre, so it crops to the 4:5 arch cleanly); crop out the small wrist tattoo.
5. 65825676 — chin resting on both hands, grey knit, bright kitchen. Fine, but an older, more-used asset.

Rejected after a close look, so nobody re-checks them: 2215416615 (passport-style skincare shot), 591119724 (uneven teeth, flat lighting), 1255364735 (red lips, looking away — fashion, not a patient), 267749068 / 423290315 (ad-like or coloured studio backdrops).

Searching for more: Adobe's relevance sort surfaces 15-year-old studio stock first. Search short — `woman toothy smile close up portrait`, `beautiful smile woman portrait white teeth natural`, `woman smiling chin on hand close up teeth` — with Photos only and Generative AI excluded, then sort newest first (IDs above ~1,000,000,000 are the modern, editorial-looking assets) and use **Find similar** on the best hit. Avoid bare shoulders, heavy makeup, coloured backdrops, city backgrounds, hats and props.

## What happens after handoff

Originals go in `public/assets/img/src/` (never served); `tools/images.mjs` writes the sizes each slot needs as AVIF, WebP and a JPEG fallback into `public/assets/img/`, and the pages use `<picture>` with `srcset`. The site is already on Cloudflare's edge network with one-year immutable caching for images, so no separate image CDN is needed — the gains are in sending the right size and format.

Because of that one-year cache, a slot whose picture changes (a retouched original, a different photo, a new crop) needs new file names: set `"version": 2` (3, …) on its entry in `tools/images.json`, regenerate, paste the printed `<picture>` markup into the page and delete the old files. Re-running the pipeline under the same names only updates the repo — browsers and the edge keep the old picture (that is why the treatment-room arch, the treatment-room photo on Our Office and the entrance arch are `-v2` files).
