---
name: link-codebase
description: Scan a production frontend codebase (path, repo, or Storybook URL) and record where the design system, tokens, components and Storybook live in brand/codebase.md, so product UI designs can match production. Use when the user points at a repo/Storybook or says to "link", "update" or "refresh" the production codebase info.
---

# Link the production codebase

Output: `brand/codebase.md` (keep its section layout: Where things live, How to use, Design system facts, Open questions).
Other designs read this file, so keep it factual and short.

## Steps

1. Get the target: a local path, git remote, or Storybook URL. If none is given and `brand/codebase.md` has a path, re-verify that one.
2. Read the repo's own guidance first (`CLAUDE.md`, `AGENTS.md`, `README.md`, `.cursor/rules`) for conventions and component rules.
3. Find, and verify that each path exists: theme/token files (tailwind preset, `theme*.css`, CSS variables), the core component
   library (folder of Button/Card/Table/...), icon set, Storybook configs (`find . -name .storybook -not -path "*/node_modules/*"`)
   and the `storybook` run target, the apps and which one is the default for UI requests, and the stack from `package.json`.
4. If a Storybook URL is given or found, open it with the Chrome tools, list the component stories, and note the URL.
5. Extract the actual token values (colors, radius, font, spacing) from the theme files into `brand/tokens.css` under a
   `/* product UI */` block. Don't overwrite the marketing tokens.
6. Update `brand/codebase.md`. Mark anything not verified as TODO; never guess paths.
7. Read-only on the production repo: never edit, install, or run builds there without asking.
8. Report in a few lines: what was linked, the token/color summary, and open questions.
