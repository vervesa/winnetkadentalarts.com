# winnetkadentalarts.com — product backlog

Working list for the site. Newest decisions at the top of each item; done items move to the bottom.

## Why the site exists, commercially

Luke is compensated for **new patients who convert into restorative treatment and who came from the website or online search**. Everything on this list is in service of that: every change should either bring more of those people to the site, make it easier for them to contact the office, or make it possible to prove which patients came from the web.

## Conversion tracking (not started) — the key item

Goal: attribute each new patient to the website / online search, and follow them through to restorative treatment, so the compensation can be measured.

What to capture on the site
- **Click-to-call and click-to-text**: every `tel:` tap (topbar, hero, sidebar cards, contact band, footer). Fire an event with the page and the link's location.
- **Appointment request form**: submissions (home page form and contact page form), with the page they came from.
- **Source**: landing page, referrer and UTM parameters (Google Business Profile links should carry `utm_source=google&utm_medium=organic&utm_campaign=gbp`, ads their own), kept for the session and written into the form submission so the office email shows where the lead came from.
- Consider a **tracking phone number** for the website only (call-tracking service such as CallRail or a Google forwarding number) so phone leads from the site are countable even when nobody taps a link. Decide whether the text-enabled main number can be swapped; the number appears in JSON-LD and on the Google listing, so a tracking number needs a dynamic-number-insertion approach rather than a hard replacement.

How to join it to patients
- Add a "how did you hear about us" field to the web intake forms (the HIPAA-compliant link-based forms) with "Website / Google search" as an option, and make the office record the referral source in OpenDental's patient record (Luke already has an OpenDental automation stack; a scheduled job can match web leads — name, phone, email, submission time — to new patients and then to completed restorative procedure codes).
- Define "restorative treatment" as a list of procedure codes so the report is unambiguous.
- Monthly report: web leads → new patients → restorative treatment started/completed, by source.

Tooling choice (open): GA4 + Google Tag Manager is the standard; a lighter option is Cloudflare Web Analytics (no cookies, but no event-level funnel) plus server-side logging of form submissions in the Worker. Whatever is chosen, update the Privacy Policy's "Cookies and analytics" section, which currently says the site uses no analytics or advertising cookies.

## Open items

1. **Appointment form**: connected (delivers to office@wargadds.com) and protected by Cloudflare Turnstile (Managed mode). Remaining: nothing, unless the office wants a copy sent to a second address (`NOTIFY_TO` in `wrangler.jsonc` takes one verified address).
2. **Privacy Policy and Terms of Service**: the Privacy Policy now has short factual text (Nov 3) and links the Notice of Privacy Practices; replace with the practice's own policy if there is one. Terms of Service is still a placeholder.
3. **Stock-photo image pass**: the artifact preview's service-page photos and plates are not in the repo; decide whether to pull them in.
4. **Team photo** of Dr. Warga and Jeanne for the home page slot (currently the molar line drawing).
5. **Reception photo**: a wider original showing the stained-glass window would let the arch crop show it; the repo copy is 900×600.
6. **Online bill pay**: restore the nav link and the Payments-page section once a portal is live.
7. **Patient portal**: hosted separately; link from the site when it exists.
8. **Redirects** for old `/wp-content/uploads/...` PDF paths if anything printed points at them.
9. **Google reviews**: tune `MIN_CHARS`/`MAX_CHARS` and per-slot caps as new reviews arrive; decide whether to drop the old "powered by Google" PNG on the reviews page.
10. **Notice of Privacy Practices** lives only on the Privacy Policy page (Luke's call, Nov 3).
11. **FAQ wording review**: the "New Patient Questions" (New Patients) and "Insurance Questions" (Insurance) sections restate facts already on the site; Luke/office to read them once and adjust. More FAQs can go on service pages the same way (`<section class="faq">` + `<details>`; the build makes the schema) — clinical answers need Dr. Warga's wording, not ours.
12. **Off-site SEO/AEO** (nothing to code): keep the Google Business Profile current (hours 6–4 / 6–2, services, photos, replies to reviews, Q&A), make the name/address/phone identical on Yelp, Facebook, Healthgrades and the ADA directory, add any new profile URLs to `sameAs` in `scripts/schema.mjs`, keep asking happy patients for Google reviews (only the five Google calls "most relevant" ever reach the site).
13. **Schema extras to consider**: `MedicalWebPage`/`MedicalProcedure` on service pages (needs clinical descriptions from Dr. Warga), `knowsLanguage` if the office is bilingual, `priceRange`/`paymentAccepted` if the office wants them public.

## Done

- Nov 4: structured data generated at build (Organization/Dentist/WebSite/WebPage/Breadcrumb/Person/FAQ — aeo.js score 84 → 100); FAQ sections on New Patients and Insurance; reviews written into pages by the Worker (PageSpeed mobile CLS 0.213 → 0, performance 96, SEO/a11y/best-practices 100); metric-matched fallback fonts; WebP photos; llms.txt; descriptive link text; contrast; reviewer names shortened; phone/name validation and formatted e-mail; thank-you button "Return Home".
- Nov 3 (late): appointment form e-mails the office; one e-mail per submission; "Select one" placeholder; Turnstile live; services carousel loops continuously; hours 6–4 / 6–2; no "emergencies" wording; "Book Appointment" lands with the form heading in view.
- Nov 3: site live on Cloudflare Workers with custom domains; Gallery design; Return to Health removed; Bill Pay removed; live Google reviews in the existing quote slots, different review per page; Insurance page rewritten for fee-for-service (no network claims); "call or text" everywhere; reception crop; services slider autoplay with edge fade; cancellation policy without a dollar amount; all COVID mentions removed; paperless new-patient forms (English and Spanish) with the PDF forms removed; Privacy Policy written.
