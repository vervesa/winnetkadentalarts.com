/* Winnetka Dental Arts — Cloudflare Worker in front of the static site.
 *
 * - serves everything in ./public (static assets)
 * - redirects the bare domain to www
 * - handles the appointment-request form (POST /api/appointment-request) by
 *   e-mailing the office through Cloudflare Email Routing, once the
 *   APPOINTMENT_EMAIL binding in wrangler.jsonc is enabled
 */

const WWW_HOST = "www.winnetkadentalarts.com";
const APEX_HOST = "winnetkadentalarts.com";
const FORM_PATH = "/api/appointment-request";
const PHONE = "(847) 441-6510";
const PHONE_LINK = `<a href="tel:+1-847-441-6510">${PHONE}</a>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === APEX_HOST) {
      url.hostname = WWW_HOST;
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === FORM_PATH) {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
      }
      return handleAppointmentRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleAppointmentRequest(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return page("We couldn't read that form.", "Please go back and try again, or call the office.", 400);
  }

  const field = (name, max = 500) => String(form.get(name) || "").trim().slice(0, max);
  const honeypot = field("website");
  const name = field("name", 120);
  const phone = field("phone", 60);
  const email = field("email", 200);
  const status = field("patient_status", 40);
  const message = field("message", 4000);

  // Bots fill the hidden field; pretend it worked and drop it.
  if (honeypot) return Response.redirect(new URL("/thank-you/", request.url).toString(), 303);

  if (!name || !phone || !email || !status) {
    return page("A required field is missing.", "Please go back and fill in your name, phone number, e-mail address and whether you are a new or existing patient.", 400);
  }

  if (!env.APPOINTMENT_EMAIL) {
    // Binding not enabled yet (see wrangler.jsonc). Say so rather than lose the request.
    return page("Online requests aren't connected yet.", `Please call the office at ${PHONE_LINK} to request an appointment.`, 503);
  }

  const submitted = new Date();
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
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
    return page("We couldn't send your request.", `Please call the office at ${PHONE_LINK} to request an appointment.`, 502);
  }

  return Response.redirect(new URL("/thank-you/", request.url).toString(), 303);
}

function page(title, text, status) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | Winnetka Dental Arts</title><link rel="stylesheet" href="/assets/css/site.css?v=2"></head>
<body><main id="main"><header class="page-head"><div class="wrap"><h1>${title}</h1></div></header>
<div class="wrap page-grid full"><article class="page-body prose"><p class="lede">${text}</p>
<p><a class="btn" href="/contact/">Contact Us</a></p></article></div></main></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
