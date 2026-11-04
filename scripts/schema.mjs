// Structured data (JSON-LD) for every page, generated at build time.
//
// build.mjs calls injectSchema() for each HTML page on its way from public/ to dist/, so the
// readable source pages carry no JSON-LD of their own: the nodes below are derived from the
// page itself (<title>, <meta name="description">, <link rel="canonical">, <h1>, and any
// <details> items inside <section class="faq">) plus the practice facts in PRACTICE.
//
// Each node is written as its own <script type="application/ld+json"> with a single string
// @type. Search engines merge the nodes by @id; the simpler AEO scanners only look at the
// top-level object of each script, so one node per script keeps everything visible to both.
//
//   Organization  + Dentist   the practice (same @id, so they describe one entity)
//   WebSite                   the site, published by the practice
//   WebPage                   this page, part of the site, about the practice
//   BreadcrumbList            Home > page (inner pages)
//   Person                    Dr. Warga (his page only)
//   FAQPage                   the visible Q&A on pages that have a <section class="faq">

const SITE = "https://www.winnetkadentalarts.com";
const ORG_ID = `${SITE}/#organization`;
const SITE_ID = `${SITE}/#website`;
const PERSON_ID = `${SITE}/dentists/george-warga/#person`;

const PRACTICE = {
  name: "Winnetka Dental Arts",
  description:
    "General and cosmetic dentistry in Winnetka, Illinois: prosthetics, implants, aesthetics, occlusal (bite) function, TMD, sleep apnea appliances, Invisalign and Botox. Dr. George F. Warga, DDS, has been in private practice since 1992.",
  telephone: "+1-847-441-6510",
  email: "info@wargadds.com",
  logo: { url: `${SITE}/assets/img/logo.png`, width: 600, height: 265 },
  image: `${SITE}/assets/img/office-exterior.jpg`,
  map: "https://maps.google.com/?cid=7240832520283079095",
  address: {
    "@type": "PostalAddress",
    streetAddress: "570 Lincoln Ave Ste 3",
    addressLocality: "Winnetka",
    addressRegion: "IL",
    postalCode: "60093",
    addressCountry: "US",
  },
  geo: { "@type": "GeoCoordinates", latitude: 42.106749, longitude: -87.7328944 },
  hours: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday"], opens: "06:00", closes: "16:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Thursday", opens: "06:00", closes: "14:00" },
  ],
  sameAs: [
    "https://www.facebook.com/winnetkadentalart",
    "https://g.page/winnetkadentalarts/",
    "https://www.yelp.com/biz/winnetka-dental-arts-winnetka",
  ],
  foundingDate: "1992",
  areaServed: ["Winnetka, IL", "Chicago's North Shore"],
};

const DENTIST = {
  name: "George F. Warga, DDS",
  jobTitle: "General & Cosmetic Dentist",
  url: `${SITE}/dentists/george-warga/`,
  image: `${SITE}/assets/img/dr-warga.jpg`,
};

export function injectSchema(html, pathname) {
  const canonical = attr(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  if (!canonical) return html; // 404 and other pages without a canonical URL carry no schema

  const rawTitle = text(html, /<title>([\s\S]*?)<\/title>/i) || "";
  const title = rawTitle.replace(/\s*\|\s*Winnetka Dental Arts\s*$/i, "").trim();
  const description = attr(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const h1 = text(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const isHome = canonical === `${SITE}/`;

  const founder = { "@type": "Person", "@id": PERSON_ID, name: DENTIST.name, jobTitle: DENTIST.jobTitle, url: DENTIST.url };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: PRACTICE.name,
    description: PRACTICE.description,
    url: `${SITE}/`,
    logo: { "@type": "ImageObject", ...PRACTICE.logo },
    image: PRACTICE.image,
    telephone: PRACTICE.telephone,
    email: PRACTICE.email,
    address: PRACTICE.address,
    foundingDate: PRACTICE.foundingDate,
    founder,
    sameAs: PRACTICE.sameAs,
  };

  const dentist = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    "@id": ORG_ID,
    name: PRACTICE.name,
    description: PRACTICE.description,
    url: `${SITE}/`,
    telephone: PRACTICE.telephone,
    email: PRACTICE.email,
    image: PRACTICE.image,
    logo: PRACTICE.logo.url,
    address: PRACTICE.address,
    geo: PRACTICE.geo,
    hasMap: PRACTICE.map,
    openingHoursSpecification: PRACTICE.hours,
    areaServed: PRACTICE.areaServed,
    sameAs: PRACTICE.sameAs,
    founder,
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    url: `${SITE}/`,
    name: PRACTICE.name,
    description: PRACTICE.description,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
  };

  const webpage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title || h1 || PRACTICE.name,
    ...(description ? { description } : {}),
    isPartOf: { "@id": SITE_ID },
    about: { "@id": ORG_ID },
    ...(isHome ? {} : { breadcrumb: { "@id": `${canonical}#breadcrumb` } }),
    inLanguage: "en-US",
  };

  const nodes = [organization, dentist, website, webpage];

  if (!isHome) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: h1 || title, item: canonical },
      ],
    });
  }

  if (canonical === DENTIST.url) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": PERSON_ID,
      name: DENTIST.name,
      givenName: "George",
      familyName: "Warga",
      honorificSuffix: "DDS",
      jobTitle: DENTIST.jobTitle,
      image: DENTIST.image,
      url: DENTIST.url,
      worksFor: { "@id": ORG_ID },
      ...(description ? { description } : {}),
    });
  }

  const faq = faqItems(html);
  if (faq.length) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      mainEntity: faq.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    });
  }

  const scripts = nodes.map((n) => `<script type="application/ld+json">${JSON.stringify(n)}</script>`).join("\n");
  const stripped = html.replace(/\s*<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  if (!/<\/head>/i.test(stripped)) throw new Error(`no </head> in ${pathname}`);
  return stripped.replace(/<\/head>/i, `${scripts}\n</head>`);
}

// Every <details> inside <section class="faq">: <summary> is the question, the rest the answer.
// The answer keeps the simple HTML Google allows in FAQ rich results (p, br, lists, links, emphasis).
const ALLOWED_IN_ANSWERS = new Set(["p", "br", "ul", "ol", "li", "a", "b", "strong", "i", "em", "h1", "h2", "h3", "h4", "h5", "h6", "div"]);
function faqItems(html) {
  const section = html.match(/<section[^>]*class="[^"]*\bfaq\b[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
  if (!section) return [];
  const items = [];
  const re = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  let m;
  while ((m = re.exec(section[1])) !== null) {
    const question = plain(m[1]);
    const answer = m[2]
      .replace(/<(\/?)([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, slash, name) => (ALLOWED_IN_ANSWERS.has(name.toLowerCase()) ? tag : ""))
      .replace(/href="\//g, `href="${SITE}/`) // absolute links: the answer text travels without the page
      .replace(/\s+/g, " ")
      .trim();
    if (question && answer) items.push({ question, answer });
  }
  return items;
}

function attr(html, re) {
  const m = html.match(re);
  return m ? decode(m[1].trim()) : "";
}
function text(html, re) {
  const m = html.match(re);
  return m ? plain(m[1]) : "";
}
function plain(fragment) {
  return decode(fragment.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}
