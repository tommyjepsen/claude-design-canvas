# Production codebase (read this before designing app UI)

Marketing material (ads, OG images, posts) follows `brand.md` + `tokens.css`. **Product UI** (screens, menus, dashboards,
flows, components) must follow the real design system below so designs can be rebuilt in production without translation.

## Where things live

| What | Path |
| --- | --- |
| Monorepo root (Nx + pnpm, React 19, Tailwind 4, Storybook 10) | `~/Development/spektr/spektr-prod` |
| Git remote | `git@gitlab.com:spektr-aps/spektr.git` (`~/Development/spektr/spektr-prod-github` is a second checkout, origin `spektr-ai/spektr` on GitHub) |
| Theme / design tokens (Tailwind preset, light/dark, semantic colors) | `libs/shared/theme/src` (`theme-base.css`, `theme-semantic.css`, `themes/`, `index.js`) |
| Core UI components (Button, Badge, Card, Table, Tag, Text, Heading, Stepper, Tooltip, DropdownMenu, Timeline, ...) | `libs/client/platform-core-components/src/lib/<Component>` |
| Other component libs | `libs/client/components`, `components-ai`, `components-forms`, `page-layout-components`, `record-views`, `moonraker-*` |
| Storybook configs | `libs/client/{platform-core-components,components-ai,components-forms,page-layout-components,moonraker-form-viewer}/.storybook` |
| Apps | `apps/model-builder`, `apps/skyhub-webapp` (customer-facing web app), `apps/shark-office-web`, `apps/agent-fleet-web`, `apps/help-center` |
| Repo guidance for agents | `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, `.cursor/skills/` in the monorepo root |

Storybook is not hosted for us yet (add the URL here if it is): run it from the monorepo with
`pnpm nx storybook platform-core-components` (check `project.json` for the exact target).

## How to use this when designing UI

1. Read `libs/shared/theme/src/theme-semantic.css` and `theme-base.css` for the real color/radius/spacing/type tokens. Mirror
   them as CSS variables in the design (or add them to `brand/tokens.css` under a `/* product UI */` block). Don't invent a palette for product UI.
2. Look in `platform-core-components/src/lib/` for an existing component before drawing one. Copy its look (variants, sizes,
   radius, states) into the HTML, and tag it with `data-section="<component-name>"`.
3. Prefer existing icons: `LucideIcon` / `Icons` in the same lib (inline the SVG in designs).
4. In your summary, list which production components each design reuses and which are **new** (need building).
5. Designs stay plain HTML; do not import from the monorepo.

## Design system facts (verified from the repo; extend as you learn more)

- Styling: Tailwind 4 via the shared preset in `libs/shared/theme`; dark mode supported.
- Primitives: Radix UI (e.g. `@radix-ui/react-dialog`).
- Component folders are PascalCase, each with its own stories.

## Open questions (fill in)

- Hosted Storybook URL: TODO
- Figma library / file: TODO
- Which app is the default target for "UI" requests (skyhub-webapp?): TODO
