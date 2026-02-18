#!/bin/bash

echo "Getting status..."
echo ""
echo ""

epic_name="$1"

if [ -z "$epic_name" ]; then
  echo "❌ Please specify an epic name"
  echo "Usage: /pm:epic-status <epic-name>"
  echo ""
  echo "Available epics:"
  for dir in .claude/epics/*/; do
    [ -d "$dir" ] && echo "  • $(basename "$dir")"
  done
  exit 1
else
  # Show status for specific epic
  epic_dir=".claude/epics/$epic_name"
  epic_file="$epic_dir/epic.md"

  if [ ! -f "$epic_file" ]; then
    echo "❌ Epic not found: $epic_name"
    echo ""
    echo "Available epics:"
    for dir in .claude/epics/*/; do
      [ -d "$dir" ] && echo "  • $(basename "$dir")"
    done
    exit 1
  fi

  echo "📚 Epic Status: $epic_name"
  echo "================================"
  echo ""

  # Extract metadata
  status=$(grep "^status:" "$epic_file" | head -1 | sed 's/^status: *//')
  progress=$(grep "^progress:" "$epic_file" | head -1 | sed 's/^progress: *//')
  github=$(grep "^github:" "$epic_file" | head -1 | sed 's/^github: *//')

  # Count tasks
  total=0
  open=0
  closed=0
  blocked=0

  # Use find to safely iterate over task files
  for task_file in "$epic_dir"/[0-9]*.md; do
    [ -f "$task_file" ] || continue
    ((total++))

    task_status=$(grep "^status:" "$task_file" | head -1 | sed 's/^status: *//')
    deps_line=$(grep "^depends_on:" "$task_file" | head -1)
    deps=$(echo "$deps_line" | sed 's/^depends_on: *\[//' | sed 's/\]//' | sed 's/,/ /g')

    if [ "$task_status" = "closed" ] || [ "$task_status" = "completed" ]; then
      ((closed++))
    elif [ -n "$deps" ] && [ "$deps" != "depends_on:" ] && [ -n "$deps_line" ]; then
      # Check if any dependency is not completed
      is_blocked=false
      for dep_num in $deps; do
        dep_num=$(echo "$dep_num" | tr -d '[:space:]')
        [ -z "$dep_num" ] && continue
        dep_file="$epic_dir/$dep_num.md"
        if [ -f "$dep_file" ]; then
          dep_status=$(grep "^status:" "$dep_file" | head -1 | sed 's/^status: *//')
          if [ "$dep_status" != "closed" ] && [ "$dep_status" != "completed" ]; then
            is_blocked=true
            break
          fi
        else
          # Dependency file doesn't exist - consider blocked
          is_blocked=true
          break
        fi
      done

      if [ "$is_blocked" = true ]; then
        ((blocked++))
      else
        ((open++))
      fi
    else
      ((open++))
    fi
  done

  # Display progress bar
  if [ $total -gt 0 ]; then
    percent=$((closed * 100 / total))
    filled=$((percent * 20 / 100))
    empty=$((20 - filled))

    echo -n "Progress: ["
    [ $filled -gt 0 ] && printf '%0.s█' $(seq 1 $filled)
    [ $empty -gt 0 ] && printf '%0.s░' $(seq 1 $empty)
    echo "] $percent%"
  else
    echo "Progress: No tasks created"
  fi

  echo ""
  echo "📊 Breakdown:"
  echo "  Total tasks: $total"
  echo "  ✅ Completed: $closed"
  echo "  🔄 Available: $open"
  echo "  ⏸️ Blocked: $blocked"

  [ -n "$github" ] && echo ""
  [ -n "$github" ] && echo "🔗 GitHub: $github"
fi

exit 0
