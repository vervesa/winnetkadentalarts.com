#!/usr/bin/env python3
"""One-off: turn the claude.ai artifact preview files into the deployable site in ./public.

- relative links (../contact/index.html) -> clean root-relative URLs (/contact/)
- Google Fonts <link>s -> self-hosted @font-face (assets/fonts)
- preview-only notes removed, YouTube click-to-load facade restored
- the artifact's home page (published without a document skeleton) wrapped into a full HTML document
"""
import re, sys, posixpath
from pathlib import Path

PUB = Path(sys.argv[1] if len(sys.argv) > 1 else "public")

FONT_FACE = '''@font-face {
  font-family: "Cormorant Garamond";
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url("../fonts/cormorant-garamond-var.woff2") format("woff2");
}
@font-face {
  font-family: "Cormorant Garamond";
  font-style: italic;
  font-weight: 300 700;
  font-display: swap;
  src: url("../fonts/cormorant-garamond-italic-var.woff2") format("woff2");
}
@font-face {
  font-family: "Jost";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("../fonts/jost-var.woff2") format("woff2");
}

'''

PLAY = '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>'


def to_root(url: str, page_dir: str) -> str:
    """Resolve a relative URL against the page's directory and return a clean root-relative URL."""
    if re.match(r"^(https?:|mailto:|tel:|sms:|data:|#|//)", url) or url.startswith("/"):
        return url
    path, frag = (url.split("#", 1) + [""])[:2]
    frag = "#" + frag if frag else ""
    if path == "":
        return url
    joined = posixpath.normpath(posixpath.join(page_dir, path)) if page_dir else posixpath.normpath(path)
    if joined == ".":
        joined = ""
    joined = joined.lstrip("./")
    if joined.endswith("index.html"):
        joined = joined[: -len("index.html")]
    out = "/" + joined
    return out + frag


def convert_html(html: str, rel_path: str) -> str:
    page_dir = posixpath.dirname(rel_path)

    def fix_attr(m):
        return f'{m.group(1)}{to_root(m.group(2), page_dir)}{m.group(3)}'

    html = re.sub(r'((?:href|src)=")([^"]+)(")', fix_attr, html)
    # fonts: drop Google Fonts link + preconnects (fonts are self-hosted via site.css)
    html = re.sub(r'<link rel="preconnect" href="https://fonts\.g[^"]*"[^>]*>\n?', "", html)
    html = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^"]*">\n?', "", html)
    # preview notes
    html = html.replace('<p class="sub-note">Preview only: this form is not connected yet.</p>', "")
    # video links -> click-to-load facade (site.js handles .video[data-video])
    def facade(m):
        vid, title = m.group(1), m.group(2)
        return (f'<div class="video" data-video="{vid}"><img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="" loading="lazy">'
                f'<button type="button" aria-label="Play video: {title}">{PLAY}</button></div>')
    html = re.sub(r'<a class="video video-link" href="https://www\.youtube\.com/watch\?v=([^"]+)" target="_blank" rel="noopener" aria-label="Watch on YouTube: ([^"]+)">.*?</a>', facade, html, flags=re.S)
    return html


def wrap_home(html: str) -> str:
    """The artifact's root page has no doctype/html/head/body; everything before the skip link is head content."""
    if "<style>:root{color-scheme:light" in html[:1200]:
        # served copy: strip the artifact viewer's skeleton around the page content
        html = html[html.index("<body>") + len("<body>"):]
        html = re.sub(r"\s*</body>\s*</html>\s*$", "\n", html)
    elif html.lstrip().startswith("<!doctype"):
        return html
    marker = '<a class="visually-hidden" href="#main">'
    i = html.index(marker)
    head, body = html[:i], html[i:]
    return ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
            + head.strip() + "\n</head>\n<body>\n" + body.rstrip() + "\n</body>\n</html>\n")


def main():
    for f in sorted(PUB.rglob("*.html")):
        rel = f.relative_to(PUB).as_posix()
        html = f.read_text(encoding="utf-8")
        if rel == "index.html":
            html = wrap_home(html)
        html = convert_html(html, rel)
        f.write_text(html, encoding="utf-8")
        print("converted", rel)
    css = PUB / "assets/css/site.css"
    txt = css.read_text(encoding="utf-8")
    if "@font-face" not in txt:
        # keep the file's header comment first, then the font faces
        m = re.match(r"(/\*.*?\*/\s*)", txt, re.S)
        txt = (m.group(1) + "\n" + FONT_FACE + txt[m.end():]) if m else FONT_FACE + txt
        css.write_text(txt, encoding="utf-8")
        print("fonts added to site.css")


if __name__ == "__main__":
    main()
