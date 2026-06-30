#!/bin/bash
# scripts/loopers-worktree.sh — git worktree lifecycle for /loopers concurrent sub-agents
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKTREE_BASE="${REPO_ROOT}/.worktrees/loopers"

usage() {
  cat <<'EOF'
==== LOOPERS WORKTREE MANAGER ====
Usage: ./scripts/loopers-worktree.sh <command> [args]

Commands:
  create <id> <task-label> [base-ref]
      Create worktree at .worktrees/loopers/looper-<id> on branch looper/<id>-<slug>.
      Writes .opencode/LOOPER_TASK.md with the assignment. Prints worktree path.

  remove <id>
      Remove worktree looper-<id> and delete its branch (looper/<id>).

  list
      List all looper worktrees.

  status
      JSON-ish summary of looper worktrees (id, path, branch).

  prune
      git worktree prune + remove stale .worktrees/loopers entries.

  clean-all
      Remove every looper-* worktree and branch. Use after a /loopers batch ends.

  resolve <phase-id>
      Resolve phase id against .opencode/TASKS.md.
      Output: phase_id|title|pending|done|status (READY|DONE|NOT_FOUND)
EOF
}

# Resolve phase id (e.g. 13.1) against TASKS.md
cmd_resolve() {
  local phase_id="$1"
  local tasks_file="${REPO_ROOT}/.opencode/TASKS.md"

  if [[ -z "$phase_id" ]]; then
    echo "[Error] Usage: resolve <phase-id>  (e.g. 13.1)"
    exit 1
  fi

  if [[ ! -f "$tasks_file" ]]; then
    echo "${phase_id}|NOT_FOUND|0|0|NOT_FOUND"
    exit 1
  fi

  local escaped_phase
  escaped_phase="$(echo "$phase_id" | sed 's/\./\\./g')"
  local header_line
  header_line="$(grep -E "^#### ${escaped_phase} " "$tasks_file" | head -1 || true)"

  if [[ -z "$header_line" ]]; then
    echo "${phase_id}|NOT_FOUND|0|0|NOT_FOUND"
    exit 1
  fi

  local title
  title="$(echo "$header_line" | sed -E "s/^#### ${escaped_phase} //")"

  # Count pending/done checkboxes in this phase section (until next #### or ##)
  local section pending done
  section="$(awk -v p="$phase_id" '
    $0 ~ "^#### " p " " { found=1; next }
    found && /^#### / { exit }
    found && /^## / { exit }
    found { print }
  ' "$tasks_file")"

  pending="$(echo "$section" | grep -c '^\- \[ \]' || true)"
  done="$(echo "$section" | grep -c '^\- \[x\]' || true)"

  local status="READY"
  if [[ "$pending" -eq 0 && "$done" -gt 0 ]]; then
    status="DONE"
  elif [[ "$pending" -eq 0 && "$done" -eq 0 ]]; then
    status="NOT_FOUND"
  fi

  echo "${phase_id}|${title}|${pending}|${done}|${status}"
}

# List next N pending phase ids from TASKS.md (for auto-fill when telegram omits tasks)
cmd_next_pending() {
  local count="${1:-1}"
  local tasks_file="${REPO_ROOT}/.opencode/TASKS.md"
  awk -v n="$count" '
    function emit() {
      if (phase != "" && pending > 0 && !printed[phase]) {
        print phase "|" title "|" pending
        printed[phase] = 1
        found++
      }
    }
    /^#### [0-9]+\.[0-9]+ / {
      emit()
      if (found >= n) exit
      phase = $2
      title = substr($0, index($0, $3))
      pending = 0
    }
    phase && /^- \[ \]/ { pending++ }
    phase && /^#### / && $2 != phase { emit(); if (found >= n) exit; phase = ""; pending = 0 }
    phase && /^## / { emit(); if (found >= n) exit; phase = ""; pending = 0 }
    END {
      emit()
    }
  ' "$tasks_file"
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g' | cut -c1-40
}

worktree_path() {
  echo "${WORKTREE_BASE}/looper-$1"
}

cmd_create() {
  local id="$1"
  local phase_or_label="$2"
  local base_ref="${3:-HEAD}"

  if [[ -z "$id" || -z "$phase_or_label" ]]; then
    echo "[Error] Usage: create <id> <phase-id-or-label> [base-ref]"
    exit 1
  fi

  # Extract phase id if input is like "13.1" or "phase 13.1"
  local phase_id=""
  if [[ "$phase_or_label" =~ ([0-9]+\.[0-9]+) ]]; then
    phase_id="${BASH_REMATCH[1]}"
  fi

  local task_label="$phase_or_label"
  local resolved=""
  if [[ -n "$phase_id" ]]; then
    resolved="$(cmd_resolve "$phase_id" 2>/dev/null || true)"
    if [[ -n "$resolved" && "$resolved" != *"NOT_FOUND"* ]]; then
      task_label="$(echo "$resolved" | cut -d'|' -f2)"
    fi
  fi

  local slug
  slug="$(slugify "${phase_id:-$phase_or_label}")"
  local branch="looper/${id}-${slug}"
  local path
  path="$(worktree_path "$id")"

  mkdir -p "$WORKTREE_BASE"

  if [[ -d "$path" ]]; then
    echo "[Error] Worktree already exists: $path"
    exit 1
  fi

  echo "[Loopers] Creating worktree looper-$id → branch $branch (base: $base_ref)"
  git fetch origin 2>/dev/null || true
  git worktree add -b "$branch" "$path" "$base_ref"

  # Each sub-agent gets an isolated task scope file
  cat > "$path/.opencode/LOOPER_TASK.md" <<TASK_EOF
# Looper Sub-Agent Task Assignment

- **Looper ID**: ${id}
- **Phase ID**: ${phase_id:-unresolved}
- **Phase Title**: ${task_label}
- **Branch**: ${branch}
- **Worktree**: ${path}
- **Agent skill**: @./.opencode/agents/worker.md (mode: subagent)

## Directive

Hermes assigned this worktree. Load the worker skill and run **run-loop**
(`.opencode/commands/loop.md`) for **Phase ${phase_id:-$phase_or_label}** only.

On success: mark all \`[ ]\` under \`#### ${phase_id:-$phase_or_label}\` as \`[x]\` in TASKS.md, then STOP.
TASK_EOF

  echo "$path"
}

cmd_remove() {
  local id="$1"
  if [[ -z "$id" ]]; then
    echo "[Error] Usage: remove <id>"
    exit 1
  fi

  local path
  path="$(worktree_path "$id")"
  local branch
  branch="$(git -C "$path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"

  echo "[Loopers] Removing worktree looper-$id ($path)"
  git worktree remove "$path" --force 2>/dev/null || rm -rf "$path"

  if [[ -n "$branch" && "$branch" != "HEAD" ]]; then
    git branch -D "$branch" 2>/dev/null || true
  fi

  git worktree prune
  echo "[Loopers] Removed looper-$id"
}

cmd_list() {
  git worktree list | grep -F "${WORKTREE_BASE}/looper-" || echo "[Loopers] No active looper worktrees."
}

cmd_status() {
  echo "[Loopers] Active worktrees:"
  for dir in "${WORKTREE_BASE}"/looper-*; do
    [[ -d "$dir" ]] || continue
    local id branch
    id="$(basename "$dir" | sed 's/looper-//')"
    branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
    echo "  looper-$id | branch=$branch | path=$dir"
  done
}

cmd_prune() {
  git worktree prune
  echo "[Loopers] Pruned stale worktree metadata."
}

cmd_clean_all() {
  for dir in "${WORKTREE_BASE}"/looper-*; do
    [[ -d "$dir" ]] || continue
    local id
    id="$(basename "$dir" | sed 's/looper-//')"
    cmd_remove "$id"
  done
  rmdir "${WORKTREE_BASE}" 2>/dev/null || true
  echo "[Loopers] All looper worktrees cleaned."
}

COMMAND="${1:-}"
shift || true

case "$COMMAND" in
  create)        cmd_create "$@" ;;
  remove)        cmd_remove "$@" ;;
  list)          cmd_list ;;
  status)        cmd_status ;;
  prune)         cmd_prune ;;
  clean-all)     cmd_clean_all ;;
  resolve)       cmd_resolve "$@" ;;
  next-pending)  cmd_next_pending "$@" ;;
  *)             usage; exit 1 ;;
esac
