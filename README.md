# yousaf-pi-setup

My personal [pi](https://github.com/earendil-works/pi) setup, bundled as a pi package.

## Install

One command installs everything — this package plus all third-party pi packages the setup uses:

```bash
curl -fsSL https://raw.githubusercontent.com/isthatyousaf/my-pi-setup/main/install.sh | sh
# or from a clone:
./install.sh
```

Each package is registered individually, so you can update, disable, or remove any
piece afterwards with `pi update --all`, `pi config`, and `pi remove`.

To install only this package's own extensions/skills/prompts, without the third-party set:

```bash
pi install git:github.com/isthatyousaf/my-pi-setup
# or try it once without installing:
pi -e git:github.com/isthatyousaf/my-pi-setup
```

## What's inside

**Extensions** (`extensions/`)

- `full-context-bar.ts` — full-width context-usage bar widget for pi-fancy-footer
- `pi-tps.ts` — average output tokens/second footer widget
- `recap.ts` — "where were we" one-liner pinned above the editor after idle time
- `working-indicator.ts` — morphing braille orb + shimmering verb working indicator
- `orca-*.ts` — Orca-managed helpers; they no-op unless Orca environment variables are set

`full-context-bar` and `pi-tps` render through [pi-fancy-footer](https://www.npmjs.com/package/pi-fancy-footer), which `install.sh` installs for you.

**Third-party packages** (installed by `install.sh`) — pi-listen, pi-auto-trees, pi-codex-conversion, pi-fancy-footer, pi-ralph-loop, pi-better-skills, pi-langfuse, pi-grok-build, visual-explainer, pi-pretty-codeblocks, pi-subagents, pi-claude-auth

**Skills** (`skills/`) — agent-browser, api-design-principles, codebase-design, diagnosing-bugs, domain-modeling, exa, excalidraw-diagram, firecrawl, frontend-design, grill-with-docs, handoff, improve, improve-codebase-architecture, oracle, react-doctor, research, resolving-merge-conflicts, solana-dev, tdd, teach, thermo-nuclear reviews, tinyfish, to-prd, torpathy, writing-great-skills, writing-shape. Some (exa, firecrawl, tinyfish, research, oracle) need your own API keys; the excalidraw skill needs its Python venv rebuilt per its SKILL.md.

**Prompt templates** (`prompts/`) — `ar.md`, `es.md`

**Subagent definitions** (`agents/`) — reviewer, scout, second-opinion, worker. `install.sh` copies these to `~/.pi/agent/agents/` (never overwriting existing files) so they work with [pi-subagents](https://github.com/edxeth/pi-subagents). They reference specific models (e.g. `openai-codex/gpt-5.6-sol`, `anthropic/claude-opus-4-8`); you need your own auth for those providers, or edit the `model:` lines.

**System prompt addendum** (`APPEND_SYSTEM.md`) — behavior rules appended to pi's system prompt. `install.sh` copies it to `~/.pi/agent/APPEND_SYSTEM.md` only if you don't already have one.

**Extension config** (`config/`) — fancy-footer layout, codex-conversion and codex-continue settings. Copied to `~/.pi/agent/` only for files you don't already have.

## Not included

Settings (`settings.json`), model/provider config, MCP servers, and auth credentials are not part of this package or the installer.
