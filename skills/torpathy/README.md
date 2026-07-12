# torpathy

A strategic programming decision skill for AI coding agents.

## What it does

`torpathy` helps agents answer architecture and implementation trade-off questions with a two-lens framework:

- **Karpathy** for explanation: incentives, defaults, protocols, feedback loops
- **Torvalds** for fix placement: interfaces, invariants, contracts, lifecycle boundaries

It is designed to help with backend, infra, frontend, APIs, databases, deployments, debugging strategy, agent workflows, and other programming decisions where the user wants strong direction.

## Install

```bash
npx skills add edxeth/torpathy
```

## Triggering

This skill is meant to trigger when the user:

- asks how something should be done and shows doubt or lack of direction
- asks which approach has better trade-offs
- asks where a fix belongs
- asks who is closer to truth
- explicitly says `torpathy`

## Files

- `SKILL.md` — the installable skill
- `README.md` — public skill documentation
