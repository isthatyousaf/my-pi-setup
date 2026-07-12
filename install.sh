#!/usr/bin/env sh
# One-shot installer for Yousaf's pi setup.
# Installs this package (extensions, skills, prompts) plus every
# third-party pi package the setup uses. Each one is registered
# individually in ~/.pi/agent/settings.json, so `pi update --all`,
# `pi remove`, and `pi config` work on them separately.
#
# Usage:  ./install.sh          (from a clone)
#         curl -fsSL https://raw.githubusercontent.com/isthatyousaf/my-pi-setup/main/install.sh | sh

set -eu

# Git link of this repo. Leave empty to install from the local checkout
# instead (only works when run from a clone).
SETUP_REPO="git:github.com/isthatyousaf/my-pi-setup"

if ! command -v pi >/dev/null 2>&1; then
  echo "error: pi is not installed. See https://github.com/earendil-works/pi" >&2
  exit 1
fi

install() {
  echo "==> pi install $1"
  pi install "$1"
}

# --- this setup (extensions / skills / prompts) ---
if [ -n "$SETUP_REPO" ]; then
  install "$SETUP_REPO"
else
  # No repo link configured: install from the local checkout.
  dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
  install "$dir"
fi

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

# --- config files pi packages can't carry ---
# Subagent .md definitions and APPEND_SYSTEM.md are not pi package resource
# types, so we copy them into ~/.pi/agent/ ourselves. Existing files are
# never overwritten.
PI_DIR="${PI_AGENT_DIR:-$HOME/.pi/agent}"

# Find the repo root: local clone first, else the clone pi just made.
root=""
d=$(CDPATH= cd -- "$(dirname -- "$0")" 2>/dev/null && pwd) || d=""
if [ -n "$d" ] && [ -d "$d/agents" ]; then
  root="$d"
else
  repo_path=${SETUP_REPO#git:}
  repo_path=${repo_path%@*}
  [ -d "$PI_DIR/git/$repo_path/agents" ] && root="$PI_DIR/git/$repo_path"
fi

if [ -n "$root" ]; then
  mkdir -p "$PI_DIR/agents"
  for f in "$root"/agents/*.md; do
    [ -e "$f" ] || continue
    base=$(basename "$f")
    if [ -e "$PI_DIR/agents/$base" ]; then
      echo "==> agents: $base already exists, skipping"
    else
      cp "$f" "$PI_DIR/agents/$base"
      echo "==> agents: installed $base"
    fi
  done

  if [ -e "$PI_DIR/APPEND_SYSTEM.md" ]; then
    echo "==> APPEND_SYSTEM.md already exists, skipping (compare with $root/APPEND_SYSTEM.md)"
  elif [ -e "$root/APPEND_SYSTEM.md" ]; then
    cp "$root/APPEND_SYSTEM.md" "$PI_DIR/APPEND_SYSTEM.md"
    echo "==> installed APPEND_SYSTEM.md"
  fi

  # Extension config files (footer layout, codex tweaks). Never overwritten.
  for f in "$root"/config/*.json; do
    [ -e "$f" ] || continue
    base=$(basename "$f")
    if [ -e "$PI_DIR/$base" ]; then
      echo "==> config: $base already exists, skipping"
    else
      cp "$f" "$PI_DIR/$base"
      echo "==> config: installed $base"
    fi
  done
else
  echo "warning: could not locate repo files; agents/, APPEND_SYSTEM.md, and config not installed" >&2
fi

echo
echo "Done. Start pi to use the new setup. Manage pieces with 'pi list' / 'pi config'."
