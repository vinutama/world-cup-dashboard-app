#!/bin/bash
# scripts/github-manager.sh

COMMAND="$1"

case "$COMMAND" in
  commit)
    if [ -z "$2" ]; then echo "[Error] Missing commit message."; exit 1; fi
    MSG="$2"
    
    echo "[GitNexus] Re-indexing workspace for next task..."
    npx gitnexus analyze --silent

    echo "[GitHub Manager] Staging changes..."
    git add .
    
    if git diff-index --quiet HEAD --; then
      echo "[GitHub Manager] Zero changes detected. Skipping commit."
      exit 0
    fi
    
    git commit -m "$MSG"
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    git push origin "$BRANCH"
    echo "[GitHub Manager] Code pushed successfully to origin/$BRANCH"
    ;;

  issue-create)
    if [ -z "$2" ] || [ -z "$3" ]; then 
      echo "[Error] Usage: issue-create \"Title\" \"Body markdown\""; 
      exit 1; 
    fi
    TITLE="$2"
    BODY="$3"
    
    echo "[GitHub Manager] Opening remote defect issue..."
    # The --json url flag forces gh to spit out just the clean URL for RTK
    NEW_ISSUE=$(gh issue create --title "$TITLE" --body "$BODY")
    echo "[GitHub Manager] Defect logged successfully: $NEW_ISSUE"
    ;;

  issue-close)
    if [ -z "$2" ]; then echo "[Error] Missing issue number (e.g. 12)"; exit 1; fi
    ISSUE_NUM="$2"
    
    echo "[GitHub Manager] Closing Issue #$ISSUE_NUM..."
    gh issue close "$ISSUE_NUM"
    echo "[GitHub Manager] Issue #$ISSUE_NUM marked as resolved."
    ;;

  *)
    echo "==== GITHUB MANAGER CLI ===="
    echo "Usage: ./scripts/github-manager.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  commit \"message\"           - Index workspace, add, commit, and push changes"
    echo "  issue-create \"Title\" \"Body\" - Open a new GitHub issue"
    echo "  issue-close <number>       - Close an existing GitHub issue"
    exit 1
    ;;
esac