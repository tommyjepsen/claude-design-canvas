# Claude Design Canvas (boilerplate)

A reusable boilerplate: clone it per project, run the `setup-project` skill, then design. A design canvas driven from this terminal. Every HTML file in `designs/` is a node on an infinite
React Flow canvas (rendered as an iframe). You generate designs; the user reviews them in the browser,
annotates them (notes, arrows), and reprompts you.

- Canvas UI: http://localhost:4747 (`npm run dev`). Check with `curl -s localhost:4747/api/state`; if it is down,
  start it with `npm run dev` in the background and tell the user the URL.
- The canvas updates live when files in `designs/` change. Never restart the server for design work.

## Your job

When the user asks for designs ("6 pinterest ads", "3 more variants of v2", "a pricing page hero"):

1. Read `brand/brand.md` and `brand/tokens.css`. If they still contain `TODO`, run the `setup-project` skill (or ask the user once for the
   missing brand basics / to paste guidelines) before designing, unless they told you to just go.
2. Write one self-contained HTML file per design into `designs/<set>/<name>.html`.
3. Position them with `scripts/layout.mjs` (see below). Never hand-edit positions unless the script can't do it.
4. Tell the user, in a few lines: what you made, the ids, and one line on how the variants differ.

Make variants genuinely different (concept, layout, hierarchy, tone), not the same layout with a new color.

## Production codebase

For product UI (screens, menus, flows, components, as opposed to ads/social), read `brand/codebase.md` first. It says where the real
design system, tokens, component library and Storybook live, and how to match them. List reused vs. new components in your summary.
If it is all TODO there is no product codebase: design from `tokens.css`. Run `link-codebase` to fill or refresh it.

## Design files

Path = id. `designs/pinterest-ads/v2.html` has id `pinterest-ads/v2`.

- `<set>` kebab-case, describes the request (`pinterest-ads`, `pricing-hero`, `onboarding-flow`).
- `<name>`: `v1..vN` for a fresh batch. Iterating on a node: `v2-1`, `v2-2`, `v2-3` in the same folder,
  so lineage is readable from the id. Never overwrite a design the user didn't ask you to change; when asked to
  change one in place, edit that file.
- Folders and files starting with `_` or `.` are ignored by the canvas (use `designs/_shared/` for shared assets).

Required head:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Short human title</title>
  <meta name="canvas:width" content="1000">
  <meta name="canvas:height" content="1500">
  <link rel="stylesheet" href="/brand/tokens.css">
  <style>
    html, body { margin: 0; width: 1000px; height: 1500px; overflow: hidden; }
  </style>
</head>
```

The body must be exactly `canvas:width` x `canvas:height`. A starting point lives in `templates/static-ad.html`.

Rules:

- **Self-contained.** Inline CSS, inline SVG, CSS shapes for illustration. No JS frameworks. Google Fonts via `<link>` is
  fine. Brand images live in `brand/assets/` and are referenced as `/brand/assets/<file>`.
- **No fabricated photography, logos, customer names, or stats.** Use CSS/SVG placeholders and mark invented numbers
  clearly in your summary to the user.
- **Tag sections.** Put `data-section="kebab-name"` on every meaningful block (`headline`, `subhead`, `cta`,
  `hero-visual`, `logo`, `badge`, `nav`, `pricing-card-2`). The user clicks these in the canvas ("Pick element") to copy a
  ref, and you use them to find what to change. Names are unique within a file.
- Static designs: no animation unless asked. Prototypes: JS is fine, keep it inline and small.

Common sizes: Pinterest pin 1000x1500 · IG post 1080x1350 · IG/TikTok story 1080x1920 · LinkedIn post 1200x627 ·
OG image 1200x630 · desktop UI 1440x900 · mobile UI 390x844.

## Placing designs

```sh
# New batch: lays out a row (below everything else on the canvas)
node scripts/layout.mjs pinterest-ads/v1 pinterest-ads/v2 pinterest-ads/v3 pinterest-ads/v4 pinterest-ads/v5 pinterest-ads/v6

# "Build 3 more variants from v2", vertical: a column under v2
node scripts/layout.mjs --anchor pinterest-ads/v2 --dir down pinterest-ads/v2-1 pinterest-ads/v2-2 pinterest-ads/v2-3

# Horizontal next to an anchor
node scripts/layout.mjs --anchor pinterest-ads/v2 --dir right pinterest-ads/v2-1 pinterest-ads/v2-2
```

Default convention: a fresh batch goes **horizontal**; iterations of a specific node go **vertical** under it, unless the
user says otherwise. Anything the script doesn't place still appears (auto-placed at the bottom), so run it right after
writing the files. It avoids overlaps with existing designs.

## Reading the user's feedback

The user draws on the canvas; it is saved to `canvas.json`. Run:

```sh
npm run state
```

It lists designs with positions, the user's notes, and arrows. How to read them:

- A **note with an arrow to a design** is feedback on that design ("make the headline bigger" -> apply to that file).
- A **note with no arrow** is general direction for the whole set.
- An **arrow between two designs** means "relate these" (combine, or derive one from the other), read the nearby
  notes for what.

Prompts will also contain refs pasted from the canvas:

| Ref | Meaning |
| --- | --- |
| `pinterest-ads/v2` | the whole design (file `designs/pinterest-ads/v2.html`) |
| `pinterest-ads/v2#headline` | the element with `data-section="headline"` (or `id="headline"`) in that file |
| `pinterest-ads/v2 :: main > div:nth-of-type(2)` | CSS path, when the element had no section/id |
| `Canvas selection:` block | output of "Copy selection": designs, notes and arrows the user selected |

Text in parentheses after a ref is just the element's text, for orientation.

When you edit `canvas.json` yourself, re-read it first: the user's browser writes to it too. Never delete the user's
notes or arrows unless asked.

## Housekeeping

- `npm run archive` moves `designs/` and `canvas.json` into `archive/<timestamp>/` for a clean slate.
  Only run it when the user asks.
- `npm run layout` and `npm run state` are the same scripts as above.
- Optional self-check: you may screenshot a design via browser tools at `http://localhost:4747/designs/<id>.html`
  to catch overflow or broken layout before reporting back.

## Skills in this repo (`.claude/skills/`)

- `setup-project`: first run on a fresh clone (brand + codebase onboarding).
- `brand-from-url`, `brand-from-pdf`: extract logo, colors, fonts, typography, voice into `brand/`.
- `link-codebase`: record production repo / design system / Storybook in `brand/codebase.md`.
