# yousaf-pi-setup

My personal [pi](https://github.com/earendil-works/pi) setup, bundled as a pi package.

## Install

One command installs everything — this package plus all third-party pi packages the setup uses:

```bash
curl -fsSL https://raw.githubusercontent.com/<you>/my-pi-setup/main/install.sh | sh
# or from a clone:
./install.sh
```

Each package is registered individually, so you can update, disable, or remove any
piece afterwards with `pi update --all`, `pi config`, and `pi remove`.

To install only this package's own extensions/skills/prompts, without the third-party set:

```bash
pi install git:github.com/<you>/my-pi-setup
# or try it once without installing:
pi -e git:github.com/<you>/my-pi-setup
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

**Skills** (`skills/`) — agent-browser, codebase-design, diagnosing-bugs, domain-modeling, grill-with-docs, handoff, improve, improve-codebase-architecture, resolving-merge-conflicts, tdd, teach, to-prd, writing-great-skills, writing-shape

**Prompt templates** (`prompts/`) — `ar.md`, `es.md`

## Not included

Settings (`settings.json`), model/provider config, MCP servers, and auth credentials are not part of this package.
