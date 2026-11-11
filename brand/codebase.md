# Production codebase

> TODO: fill in once per project, or let the `link-codebase` skill do it ("link the codebase at ~/path/to/repo").
> Delete this note when done. See `examples/spektr/codebase.md` for a completed one.

Marketing material (ads, OG images, posts) follows `brand.md` + `tokens.css`. **Product UI** (screens, menus, dashboards,
flows, components) must follow the real design system below, so designs can be rebuilt in production without translation.
If everything below is still TODO, this project has no product codebase: design from `tokens.css` only.

## Where things live

Paths starting with `~` are per-machine: after cloning on a new machine, re-check the local path or re-run `link-codebase`.

| What | Value |
| --- | --- |
| Local checkout | TODO (e.g. `~/Development/my-app`) |
| Git remote | TODO |
| Stack | TODO (framework, styling, component primitives) |
| Theme / design tokens | TODO (e.g. `libs/theme/src`, `tailwind.config.js`, `theme.css`) |
| Core UI components | TODO (folder with Button, Card, Table, ...) |
| Icon set | TODO |
| Storybook (local command and/or hosted URL) | TODO |
| Figma library / file | TODO |
| Default app for "UI" requests | TODO |
| Repo guidance for agents | TODO (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules`) |

## How to use this when designing UI

1. Mirror the real tokens (color, radius, spacing, type) as CSS variables in the design, or in a `/* product UI */` block in
   `brand/tokens.css`. Don't invent a palette for product UI.
2. Look for an existing component before drawing one. Copy its look (variants, sizes, radius, states) into the HTML and tag it
   `data-section="<component-name>"`.
3. Prefer the existing icon set (inline the SVG).
4. In your summary, list which production components each design reuses and which are **new** (need building).
5. Designs stay plain HTML; never import from the production repo, and never edit it.

## Design system facts

- TODO (verified facts only: styling approach, dark mode, primitives, naming conventions)
