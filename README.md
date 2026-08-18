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

- `pi-tps.ts` — average output tokens/second footer widget
- `working-indicator.ts` — morphing braille orb + shimmering verb working indicator

**Third-party packages** (installed by `install.sh`) — pi-auto-trees, pi-codex-conversion, plannotator, pi-autoresearch, pi-linear, pi-ralph-loop, pi-better-skills, pi-pretty-codeblocks, pi-subagents, pi-claude-auth

**Skills** (`skills/`) — code-review, codebase-design, diagnosing-bugs, domain-modeling, exa, firecrawl, grill-with-docs, grilling, handoff, implement, improve-codebase-architecture, msw, prototype, research, tdd, teach, tinyfish, to-spec, to-tickets, torpathy, wait-what, wayfinder, writing-for-agents

**Prompt templates** (`prompts/`) — `ar.md`, `ast.md`, `bro.md`, `recheck.md`

**Subagent definitions** (`agents/`) — reviewer, scout, second-opinion, general-purpose (worker), researcher, research-worker, review-axis. `install.sh` copies these to `~/.pi/agent/agents/` (never overwriting existing files) so they work with [pi-subagents](https://github.com/edxeth/pi-subagents). They reference specific models (e.g. `openai-codex/gpt-5.6-sol`, `anthropic/claude-opus-4-8`); you need your own auth for those providers, or edit the `model:` lines.

**System prompt addendum** (`APPEND_SYSTEM.md`) — behavior rules appended to pi's system prompt. `install.sh` copies it to `~/.pi/agent/APPEND_SYSTEM.md` only if you don't already have one.

**Extension config** (`config/`) — codex-conversion settings. Copied to `~/.pi/agent/` only for files you don't already have.

## Not included

Settings (`settings.json`), model/provider config, MCP servers, and auth credentials (including Linear API keys for pi-linear) are not part of this package or the installer.
