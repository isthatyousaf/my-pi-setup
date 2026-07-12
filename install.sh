#!/usr/bin/env sh
# One-shot installer for Yousaf's pi setup.
# Installs this package (extensions, skills, prompts) plus every
# third-party pi package the setup uses. Each one is registered
# individually in ~/.pi/agent/settings.json, so `pi update --all`,
# `pi remove`, and `pi config` work on them separately.
#
# Usage:  ./install.sh          (from a clone)
#         curl -fsSL https://raw.githubusercontent.com/<you>/my-pi-setup/main/install.sh | sh

set -eu

# EDIT ME after pushing: git link of this repo. Leave empty to install
# from the local checkout instead (only works when run from a clone).
SETUP_REPO="git:github.com/<you>/my-pi-setup"

if ! command -v pi >/dev/null 2>&1; then
  echo "error: pi is not installed. See https://github.com/earendil-works/pi" >&2
  exit 1
fi

install() {
  echo "==> pi install $1"
  pi install "$1"
}

# --- this setup (extensions / skills / prompts) ---
case "$SETUP_REPO" in
  *"<you>"*|"")
    # Placeholder not filled in yet: install from the local checkout.
    dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
    install "$dir"
    ;;
  *)
    install "$SETUP_REPO"
    ;;
esac

# --- third-party packages (npm) ---
install "npm:@codexstar/pi-listen"
install "npm:@howaboua/pi-auto-trees"
install "npm:@howaboua/pi-codex-conversion"
install "npm:pi-fancy-footer"

# --- third-party packages (git) ---
install "git:github.com/edxeth/pi-ralph-loop"
install "git:github.com/edxeth/pi-better-skills"
install "git:github.com/edxeth/pi-langfuse"
install "git:github.com/IgorWarzocha/pi-grok-build"
install "git:github.com/nicobailon/visual-explainer"
install "git:github.com/vvv850/pi-pretty-codeblocks"
install "git:github.com/edxeth/pi-subagents"
install "git:github.com/edxeth/pi-claude-auth"

# --- subagent definitions (used by pi-subagents) ---
# Agent .md files are not a pi package resource type, so we copy them into
# ~/.pi/agent/agents/ ourselves. Existing files are never overwritten.
AGENT_DIR="${PI_AGENT_DIR:-$HOME/.pi/agent}/agents"

# Find the agents/ source: local clone first, else the clone pi just made.
src=""
if [ -n "${0%%/*}" ] || [ -d "$(dirname -- "$0")/agents" ]; then
  d=$(CDPATH= cd -- "$(dirname -- "$0")" 2>/dev/null && pwd) || d=""
  [ -n "$d" ] && [ -d "$d/agents" ] && src="$d/agents"
fi
if [ -z "$src" ]; then
  repo_path=${SETUP_REPO#git:}
  repo_path=${repo_path%@*}
  candidate="${PI_AGENT_DIR:-$HOME/.pi/agent}/git/$repo_path/agents"
  [ -d "$candidate" ] && src="$candidate"
fi

if [ -n "$src" ]; then
  mkdir -p "$AGENT_DIR"
  for f in "$src"/*.md; do
    [ -e "$f" ] || continue
    base=$(basename "$f")
    if [ -e "$AGENT_DIR/$base" ]; then
      echo "==> agents: $base already exists, skipping"
    else
      cp "$f" "$AGENT_DIR/$base"
      echo "==> agents: installed $base"
    fi
  done
else
  echo "warning: could not locate agents/ directory; subagent definitions not installed" >&2
fi

echo
echo "Done. Start pi to use the new setup. Manage pieces with 'pi list' / 'pi config'."
