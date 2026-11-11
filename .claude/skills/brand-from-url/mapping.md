# Mapping extracted brand data into `brand/`

Shared by `brand-from-url` and `brand-from-pdf`. Designs read `brand/brand.md` and link `/brand/tokens.css`,
so these files are the only output. Never touch `designs/` or `canvas.json`.

## Before writing

- Read the current `brand/brand.md` and `brand/tokens.css`. If they hold real (non-TODO) content, show the user a short
  diff summary and ask once before overwriting. If they still say TODO, just write.
- Copy the old versions to `brand/.backup/<timestamp>/` first when overwriting real content.

## `brand/tokens.css`

Keep the existing variable names (designs depend on them) and only change values. Add extra tokens below them.

| Token | What to put |
| --- | --- |
| `--brand-bg` | main page background (usually white or near-white) |
| `--brand-fg` | main text color |
| `--brand-muted` | secondary text |
| `--brand-accent` | the one primary brand/CTA color |
| `--brand-surface` | card / section background |
| `--font-sans` | body font stack, with a real fallback |
| `--font-display` | headline font stack (same as sans if there is only one family) |

Extra tokens welcome: `--brand-accent-2`, `--brand-border`, `--radius-sm/md/lg`, `--font-weight-heading`, `--font-weight-body`,
`--tracking-heading`, `--font-mono`. If the fonts are on Google Fonts, add an `@import` line at the top of the file. If they are
proprietary (Aeonik, Haffer, etc.) say so, name the closest Google Font substitute, and use it in the stack with the real
name first.

Color rules: report exact hex. Pick accent = the color on primary CTAs / links, not the most frequent one. Check
foreground/background contrast (>= 4.5:1) and say so if the brand's own pairing fails.

## `brand/assets/`

- `logo.svg` (or `.png`) = primary logo, `logo-white.svg` = reversed variant, `logo-mark.svg` = icon only, `favicon.*`.
- Prefer SVG. If only raster exists, keep the highest resolution found.
- Only save logos that come from the brand's own site/document. Never redraw or invent a logo.

## `brand/brand.md`

Keep the existing headings and fill them in: Product, Voice, Visual, Do / Don't. Add a `## Sources` section listing the
URL(s) or PDF, and the date.

- **Product**: one-liner, audience, proof points. Only claims literally on the source. Quote numbers exactly; no invention.
- **Voice**: 3-5 tone adjectives, sentence length and person (we/you), capitalization style (sentence case vs Title Case),
  punctuation habits, 5-8 verbatim sample lines (headlines, CTAs), words they use often, words they avoid.
- **Visual**: color roles with hex, type scale (h1/h2/body px, weight, line-height, tracking), button style (radius, fill,
  padding), spacing rhythm, imagery/illustration style, logo usage rules (clear space, min size, backgrounds).
- **Do / Don't**: inferred from the above; mark inferred items as "(inferred)".

## Finish

Report to the user in a few lines: what was written, the palette as hex, the fonts, the 3-adjective voice, anything
missing or uncertain (e.g. "font is proprietary, using DM Sans as stand-in"). Offer to generate a test design.
