# winnetkadentalarts.com

Static site for Winnetka Dental Arts, served from Cloudflare Workers static assets with a small Worker in front
(apex → www redirect, appointment-request form). Every push to `main` deploys through Cloudflare Workers Builds.

## Layout

    public/                 the site — plain HTML, one stylesheet, one script, self-hosted fonts (OFL)
    public/_headers         cache + security headers (Workers static assets read this file)
    public/404.html         not-found page
    src/index.js            Worker: redirects winnetkadentalarts.com → www, handles POST /api/appointment-request
    wrangler.jsonc          Cloudflare config (custom domains and form e-mail are commented out until go-live)
    tools/from-artifact.py  one-off converter used to turn the claude.ai design preview into these files

Pages keep the URLs of the old WordPress site (`/services/tmd/`, `/after-care-instructions/`, …).
Patient forms and brochures live in `public/downloads/`.

## Local preview

    npm install
    npm run dev          # http://localhost:8787 — same runtime Cloudflare uses

## Deploy

Workers Builds (Cloudflare dashboard → Workers & Pages → Create → Import a repository → this repo):

- build command: *(leave empty)*
- deploy command: `npx wrangler deploy`

Each push to `main` then deploys. The first deploy lands on the `workers.dev` preview URL only.

## Go-live checklist

1. **Custom domain** — uncomment `routes` in `wrangler.jsonc` and push. Cloudflare creates the DNS records,
   which takes the domain away from the current WordPress site. The Worker redirects the apex to `www`.
2. **Appointment form** — enable Email Routing for the zone, verify `info@wargadds.com` as a destination
   address, uncomment `send_email` in `wrangler.jsonc`, push. Until then the form returns a "not connected yet,
   please call" page (it never silently drops a request). Successful sends redirect to `/thank-you/`.
3. **Image placeholders** — the labeled slots on the service pages, Our Office, the home team photo
   (Dr. Warga and Jeanne) and the contact map. Replace each `div.placeholder` with an `<img>` or delete it.
4. **Privacy Policy / Terms of Service** — placeholder pages; paste the current text.
5. **Humana logo** — missing from the export; shown as text on the Insurance page.
6. **Bill Pay** — removed from the menu for now; re-add the link when the new bill-pay setup is ready.
7. Old PDF links pointed at `/wp-content/uploads/…`; they now live at `/downloads/<same filename>`.
   Add a `public/_redirects` file if anything printed still uses the old paths.
