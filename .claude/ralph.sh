#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [max_iterations]
# Note: This script uses Qwen instead of Claude as the AI agent

set -e

MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRD_FILE="$PROJECT_ROOT/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Extract Z AI credentials from providers.yaml
PROVIDERS_FILE="$HOME/.sh/providers.yaml"
if [[ -f "$PROVIDERS_FILE" ]]; then
  # Extract Z AI credentials
  ANTHROPIC_AUTH_TOKEN=$(awk '
    /- name:/ {
      if ($0 ~ "\"Z AI\"") found=1
      else found=0
    }
    found && /api_key:/ {
      split($0, parts, "\"")
      print parts[2]
      exit
    }
  ' "$PROVIDERS_FILE")

  ANTHROPIC_BASE_URL=$(awk '
    /- name:/ {
      if ($0 ~ "\"Z AI\"") found=1
      else found=0
    }
    found && /url:/ {
      split($0, parts, "\"")
      print parts[2]
      exit
    }
  ' "$PROVIDERS_FILE")

  export ANTHROPIC_AUTH_TOKEN
  export ANTHROPIC_BASE_URL
fi

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    
    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"
    
    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Ralph - Max iterations: $MAX_ITERATIONS"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  Ralph Iteration $i of $MAX_ITERATIONS"
  echo "═══════════════════════════════════════════════════════"
  
  # Run Qwen Code with the ralph prompt (non-interactive mode)
  # Save output to temp file for completion check
  TEMP_OUTPUT=$(mktemp)
  cd "$PROJECT_ROOT" && cat "$SCRIPT_DIR/prompt.md" | qwen -p --yolo --allowed-tools "Read,Write,Edit,Glob,Grep,AskUserQuestion,Bash,TodoWrite" 2>&1 | tee "$TEMP_OUTPUT"

  # Check for completion signal
  if grep -q "<promise>COMPLETE</promise>" "$TEMP_OUTPUT"; then
    echo ""
    echo "Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    rm -f "$TEMP_OUTPUT"
    exit 0
  fi

  rm -f "$TEMP_OUTPUT"
  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
