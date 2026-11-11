---
name: brand-from-url
description: Extract a brand (logo, colors, fonts, typography, tone of voice) from a website URL and write it into brand/brand.md, brand/tokens.css and brand/assets/. Use when the user gives a website and asks to "pull the brand", "set up branding from <url>", or "match this site".
---

# Brand from a website URL

Input: one URL (plus optionally 1-3 extra pages such as /about, /pricing). Output: updated `brand/` folder.
Follow `.claude/skills/brand-from-url/mapping.md` for exactly what to write and how.

## Steps

1. **Fetch the source.** `curl -sL <url>` for the HTML; read `<head>`: `<title>`, meta description, `og:image`, `theme-color`,
   `<link rel="icon|apple-touch-icon|stylesheet">`, Google Fonts links, inline `:root` custom properties.
2. **Render it for real values.** Load the tool schemas for the Chrome browser tools with ToolSearch if deferred, open the URL in a
   new tab, and use `javascript_tool` to read computed styles. Sample at least: `body`, `h1`, `h2`, `p`, primary button (`a, button`
   with the most prominent background), a link, the nav, and a card. For each record `font-family`, `font-size`, `font-weight`,
   `line-height`, `letter-spacing`, `color`, `background-color`, `border-radius`, `padding`. Also dump `:root` custom properties
   (`getComputedStyle(document.documentElement)` filtered to `--*`) since they often hold the real palette. Take a screenshot to judge imagery style.
   If the browser is unavailable, fall back to parsing the linked CSS files with curl and say so in the report.
3. **Find the logo.** Look in order: inline `<svg>` or `<img>` inside `header a[href="/"]`, `img[alt*=logo i]`, `[class*=logo i]`,
   then `og:image`, `apple-touch-icon`, favicon. Download to `brand/assets/` (`curl -sL -o`). For inline SVG, save its `outerHTML`
   (set `fill` to a concrete color if it uses `currentColor`). Also find a reversed/white version in the footer if one exists.
4. **Build the palette.** Tally colors from computed styles and custom properties; ignore pure grays except as fg/bg/muted/border.
   Assign roles per mapping.md (accent = primary CTA color).
5. **Read the voice.** Read the homepage plus any extra pages via `get_page_text`. Capture headlines, CTAs, and body samples verbatim.
6. **Write** `brand/tokens.css`, `brand/brand.md` and the assets as described in mapping.md, then give the short report.

## Guardrails

- Only use data from the page. No guessing brand colors from memory of the company.
- Don't download customer logos, photography or stock images as brand assets.
- If the site blocks or the render fails twice, stop and tell the user rather than retrying.
