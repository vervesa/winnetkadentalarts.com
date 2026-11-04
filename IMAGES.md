# winnetkadentalarts.com — image shot list

What the site still needs, slot by slot, with the exact size and crop each slot uses. "Shoot" = a real photo of the practice (always better than stock where the subject is the practice itself); "Stock" = Adobe Stock, Standard license (covers web use; no "Editorial use only" assets; leave "Generative AI" excluded). Hand over originals at full resolution — the build makes the WebP/AVIF and responsive sizes, so never pre-shrink.

Look for every stock image: natural light, warm neutrals (ivory, camel, oatmeal, navy, charcoal) that sit next to the site's navy and ivory; understated, well-dressed, North Shore; genuine expressions, real teeth (no retouched "whitening-ad" smiles); no clinical props, no gloved hands, no stock-dental clichés. Mix ages across the site — the hero is young; implants, prosthetics and TMD pages can carry patients in their 50s–70s.

## Home page

| # | Slot | Subject | Crop the site uses | Deliver at least | Source |
|---|------|---------|--------------------|------------------|--------|
| 1 | Hero (`.hero-media`, right of the headline) | **A young woman with a natural, open smile, like naplesdentalarts.com** — close crop, chin or hand near the face, knitwear or a crisp shirt, soft light, plain warm background | Portrait **4:5 arch**, 500 px wide on desktop / 420 on phones, face in the upper half (`object-position 50% 45%`) | **1600 × 2000** (portrait) | Stock — candidates below |
| 2 | "Our practice" plate (`.offset-figure`, currently the molar drawing) | Dr. Warga and Jeanne together, relaxed, in the office | **5:4** landscape | 2000 × 1600 | Shoot |
| 3 | Photo strip, arch 1 | Reception — the stained-glass window side | **3:4 arch** (portrait) | 1200 × 1600 | Shoot, portrait orientation (the current 900×600 landscape files lose most of the frame in the arch) |
| 4 | Photo strip, arch 2 | A treatment room, tidy, daylight | 3:4 arch | 1200 × 1600 | Shoot |
| 5 | Photo strip, arch 3 | Galleria Building entrance / façade | 3:4 arch | 1200 × 1600 | Shoot (the exterior leaves the hero and lives here) |
| 6 | Dr. Warga section (`.doctor-media`) | Dr. Warga chairside or at the microscope, candid | **5:6 arch**, face toward the top (`object-position 38% 12%`) | 1250 × 1500 | Shoot |
| 7 | "Pleasure in the Job" feature | Magazine cover — have it | — | — | Done |
| 8 | Social preview (`og:image`, shows when the link is texted or shared) | Landscape crop of the hero image | **1200 × 630** | from #1 | Made from #1 |

## Inner pages

| # | Page / slot | Subject | Crop | Deliver at least | Source |
|---|-------------|---------|------|------------------|--------|
| 9 | Dr. Warga page portrait (`.portrait`) | Proper headshot — currently a 500×500 file scaled up, the weakest image on the site | **4:5 arch** | 1200 × 1500 | Shoot |
| 10 | Our Office, wide plate (placeholder "sterilization center and instrument tray") | Sterilization center / an instrument tray, detail, daylight | **2:1** on desktop, 3:2 on phones | 1600 × 1067 (safe for both) | Shoot (or stock "dental instruments tray sterilization pouch") |
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

Starting points on Adobe Stock (open with `https://stock.adobe.com/images/x/<id>`):

- **65825676** — young brunette, chin resting on her hands, grey knit, bright room. Closest to the Naples reference pose and mood.
- 267749068 — brunette, hand at her chin, broad smile, grey backdrop. More polished/"smile ad"; teeth-forward.
- 423290315 — young blonde, white turtleneck, hand on cheek, friendly; studio-blue backdrop would need the arch crop to hide most of it.
- 487530799 — young, cream knit, hands under chin, dark background.
- Mature alternates if the hero ever rotates: 159275151 (silver-blonde, hand on cheek, pink cardigan, outdoors), 50841916 (long silver hair, grey wrap, hands under chin), 159275463 (white cardigan, soft smile, interior).

Searching for better ones: Adobe's "relevance" sort surfaces much-used studio stock. Use short queries (3–5 words) — `woman smiling chin on hand`, `young woman natural smile knitwear`, `elegant woman laughing close up`, `woman smiling cashmere portrait` — with Photos only, Generative AI excluded, Orientation vertical; then open the best hit and use **Find similar**; the **Undiscovered content** filter and the **Premium** collection give the less-used, editorial look that fits the brief. Avoid: bare shoulders, heavy makeup, coloured studio backdrops, city backgrounds that place the photo elsewhere, hats and winter-wonderland props.

## What happens after handoff

Originals go in `public/assets/img/src/` (never served); `tools/images.mjs` writes the sizes each slot needs as AVIF, WebP and a JPEG fallback into `public/assets/img/`, and the pages use `<picture>` with `srcset`. The site is already on Cloudflare's edge network with one-year immutable caching for images, so no separate image CDN is needed — the gains are in sending the right size and format.
