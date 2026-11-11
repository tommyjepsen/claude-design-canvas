# Claude Design Canvas

Boilerplate for iterating on product UI and marketing designs with Claude Code on an infinite canvas.
Each node is a real HTML file in `designs/`.

## Use

```sh
git clone <this-repo> my-project && cd my-project
npm install        # once
npm run dev        # http://localhost:4747
claude             # then: "set up this project" (runs the setup-project skill)
```

`setup-project` asks for a brand source (website URL, PDF or pasted guidelines) and optionally the production codebase /
Storybook, then fills `brand/`. After that: "generate 6 pinterest static ads" or "redesign the settings page using our components".

What is project-specific vs reusable:

| Per project | Reusable boilerplate |
| --- | --- |
| `brand/` (brand.md, tokens.css, assets/, codebase.md), `designs/`, `canvas.json` | `.claude/skills/`, `scripts/`, `templates/`, `src/`, `CLAUDE.md` |

`npm run archive` clears the canvas (moves everything to `archive/`). `examples/` holds a filled-in reference setup.

## Canvas

| Key | Tool | |
| --- | --- | --- |
| `V` | Select | drag nodes, drag on empty space to box-select, middle/right-drag or scroll to pan, pinch/ctrl+scroll to zoom |
| `P` | Pick element | hover a section inside a design, click to copy a ref like `pinterest-ads/v2#headline` |
| `N` | Note | click to drop a text note |
| `I` | Interact | use the prototype itself (clicks, scroll) |
| `F` | Fit | fit everything in view |
| `C` | Copy selection | copies selected designs/notes/arrows as a prompt-ready block |

- Click a node's id chip to copy its id.
- Arrows: hover a node, drag from a blue dot to another node or note. Select + Backspace deletes.
- Notes and arrows are saved to `canvas.json`; Claude reads them with `npm run state`.

Example reprompt: `Build me 3 more variants from pinterest-ads/v2, see my notes` → they appear in a column under v2.
