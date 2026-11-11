---
name: setup-project
description: First-run onboarding for a fresh clone of this canvas boilerplate. Gathers the brand source and production codebase, runs brand-from-url / brand-from-pdf / link-codebase, installs deps and starts the canvas. Use when brand/brand.md still says TODO, the user says "set up", "new project", "start fresh", or has just cloned the repo.
---

# Set up a new project from this boilerplate

This repo is meant to be cloned per project. Everything project-specific lives in `brand/` (and `designs/`, `canvas.json`);
everything reusable lives in `.claude/skills/`, `scripts/`, `templates/`, `src/`.

## Steps

1. **Check state.** `cat brand/brand.md brand/codebase.md | grep -c TODO`, `ls designs`, `curl -s localhost:4747/api/state`.
   If `designs/` holds someone else's work, ask whether to `npm run archive` first (never do it unasked).
2. **Install and run.** `ls node_modules` else `npm install`. If the server is down, `npm run dev` in the background.
3. **Ask once, in one message** (skip anything the user already gave):
   - Project/brand name.
   - Brand source: website URL, PDF path, pasted guidelines, or "none, I'll design from scratch".
   - Production codebase for product UI: local repo path, Storybook URL, Figma link, or "none".
4. **Run the matching skills:** URL -> `brand-from-url`; PDF -> `brand-from-pdf`; pasted text -> follow
   `.claude/skills/brand-from-url/mapping.md` by hand; codebase/Storybook -> `link-codebase`.
   If "none", write only the project name and a sensible neutral `tokens.css` (keep variable names) and tell the user.
5. **Rename** the heading in `brand/brand.md` to the project name; update `<title>` in `index.html` only if the user wants.
6. **Report in a few lines:** what was filled in, what is still TODO, the canvas URL, and 2-3 example prompts that suit this
   project ("6 pinterest ads", "pricing page hero", "redesign the onboarding flow using our components").

## Guardrails

- Don't commit, push, or change git remotes unless asked.
- Don't leave another project's values in `brand/` when the new project is different.
