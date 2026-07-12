# yousaf-pi-setup

My personal [pi](https://github.com/earendil-works/pi) setup, bundled as a pi package.

## Install

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

`full-context-bar` and `pi-tps` render through [pi-fancy-footer](https://www.npmjs.com/package/pi-fancy-footer); install it too for those widgets to appear:

```bash
pi install npm:pi-fancy-footer
```

**Skills** (`skills/`) — agent-browser, codebase-design, diagnosing-bugs, domain-modeling, grill-with-docs, handoff, improve, improve-codebase-architecture, resolving-merge-conflicts, tdd, teach, to-prd, writing-great-skills, writing-shape

**Prompt templates** (`prompts/`) — `ar.md`, `es.md`

## Not included

Settings (`settings.json`), model/provider config, MCP servers, auth, and the subagent runtime are not part of this package. For subagents, install [pi-subagents](https://github.com/edxeth/pi-subagents) separately:

```bash
pi install git:github.com/edxeth/pi-subagents
```
