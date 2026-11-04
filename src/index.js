/* Winnetka Dental Arts — Cloudflare Worker in front of the static site.
 *
 * - serves everything in ./public (static assets)
 * - redirects the bare domain to www
 * - handles the appointment-request form (POST /api/appointment-request) by
 *   e-mailing the office through Cloudflare Email Routing, once the
 *   APPOINTMENT_EMAIL binding in wrangler.jsonc is enabled
 * - serves the practice's live Google reviews (GET /api/reviews, see reviews.js)
 */

import { handleReviews } from "./reviews.js";

const WWW_HOST = "www.winnetkadentalarts.com";
const APEX_HOST = "winnetkadentalarts.com";
const FORM_PATH = "/api/appointment-request";
const PHONE = "(847) 441-6510";
const PHONE_LINK = `<a href="tel:+1-847-441-6510">${PHONE}</a>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.hostname === APEX_HOST) {
      url.hostname = WWW_HOST;
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/api/reviews") {
      return handleReviews(request, env, ctx);
    }

    if (url.pathname === FORM_PATH) {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
      }
      return handleAppointmentRequest(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleAppointmentRequest(request, env, ctx) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return page("We couldn't read that form.", "Please go back and try again, or call or text the office.", 400);
  }

  const field = (name, max = 500) => String(form.get(name) || "").trim().slice(0, max);
  const honeypot = field("website");
  const name = field("name", 120);
  const phone = field("phone", 60);
  const email = field("email", 200);
  const status = field("patient_status", 40);
  const message = field("message", 4000);
  const turnstileToken = field("cf-turnstile-response", 4096);
  const thankYou = new URL("/thank-you/", request.url).toString();
  const ip = request.headers.get("cf-connecting-ip") || "unknown";

  // Bots fill the hidden field; pretend it worked and drop it.
  if (honeypot) return Response.redirect(thankYou, 303);

  if (!name || !phone || !email || !status) {
    return page("A required field is missing.", "Please go back and fill in your name, phone number, e-mail address and whether you are a new or existing patient.", 400);
  }

  // Cloudflare Turnstile: enforced once the TURNSTILE_SECRET secret is set on the Worker
  // (the widget appears on the forms once the site key is set in assets/js/site.js).
  if (env.TURNSTILE_SECRET) {
    const human = await verifyTurnstile(env.TURNSTILE_SECRET, turnstileToken, ip);
    if (!human) {
      return page("Please confirm you're not a robot.", `Go back, complete the check at the bottom of the form and send it again, or call or text the office at ${PHONE_LINK}.`, 400);
    }
  }

  // The same request sent twice within two minutes (a double-click on Submit, a refresh of
  // the result page) is answered as a success without a second e-mail.
  const cache = caches.default;
  const dedupeKey = new Request(new URL("/__dedupe/" + (await fingerprint([name, phone, email, status, message])), request.url).toString());
  if (await cache.match(dedupeKey)) return Response.redirect(thankYou, 303);

  if (!env.APPOINTMENT_EMAIL) {
    // Binding not enabled yet (see wrangler.jsonc). Say so rather than lose the request.
    return page("Online requests aren't connected yet.", `Please call or text the office at ${PHONE_LINK} to request an appointment.`, 503);
  }

  const submitted = new Date();
  const body = [
    `Appointment request from the website`,
    ``,
    `Name:     ${name}`,
    `Phone:    ${phone}`,
    `E-mail:   ${email}`,
    `Patient:  ${status}`,
    ``,
    `Message:`,
    message || "(none)",
    ``,
    `Submitted ${submitted.toISOString()} from ${ip}`,
  ].join("\r\n");

  const raw = [
    `From: Winnetka Dental Arts Website <${env.NOTIFY_FROM}>`,
    `To: ${env.NOTIFY_TO}`,
    `Reply-To: ${name.replace(/[<>\r\n]/g, "")} <${email.replace(/[<>\r\n\s]/g, "")}>`,
    `Subject: Appointment request: ${name.replace(/[\r\n]/g, " ")} (${status})`,
    `Date: ${submitted.toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${APEX_HOST}>`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    body,
  ].join("\r\n");

  try {
    const { EmailMessage } = await import("cloudflare:email");
    await env.APPOINTMENT_EMAIL.send(new EmailMessage(env.NOTIFY_FROM, env.NOTIFY_TO, raw));
  } catch (err) {
    console.error("appointment e-mail failed", err);
    return page("We couldn't send your request.", `Please call or text the office at ${PHONE_LINK} to request an appointment.`, 502);
  }

  ctx.waitUntil(cache.put(dedupeKey, new Response("sent", { headers: { "Cache-Control": "public, max-age=120" } })));
  return Response.redirect(thankYou, 303);
}

async function verifyTurnstile(secret, token, ip) {
  if (!token) return false;
  try {
    const body = new FormData();
    body.append("secret", secret);
    body.append("response", token);
    if (ip && ip !== "unknown") body.append("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("turnstile verify failed", err);
    return false;
  }
}

async function fingerprint(parts) {
  const data = new TextEncoder().encode(parts.map((v) => String(v).toLowerCase().replace(/\s+/g, " ").trim()).join("\u001f"));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function page(title, text, status) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | Winnetka Dental Arts</title><link rel="stylesheet" href="/assets/css/site.css?v=2"></head>
<body><main id="main"><header class="page-head"><div class="wrap"><h1>${title}</h1></div></header>
<div class="wrap page-grid full"><article class="page-body prose"><p class="lede">${text}</p>
<p><a class="btn" href="/contact/">Contact Us</a></p></article></div></main></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
