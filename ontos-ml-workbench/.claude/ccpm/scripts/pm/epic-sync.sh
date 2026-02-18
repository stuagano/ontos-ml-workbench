#!/bin/bash

# Update epic progress based on task completion
epic_name="$1"

if [ -z "$epic_name" ]; then
  echo "❌ Please specify an epic name"
  echo "Usage: /pm:epic-sync <epic-name>"
  exit 1
fi

epic_dir=".claude/epics/$epic_name"
epic_file="$epic_dir/epic.md"

if [ ! -f "$epic_file" ]; then
  echo "❌ Epic not found: $epic_name"
  exit 1
fi

# Count tasks
total=0
closed=0

for task_file in "$epic_dir"/[0-9]*.md; do
  [ -f "$task_file" ] || continue
  ((total++))

  task_status=$(grep "^status:" "$task_file" | head -1 | sed 's/^status: *//')
  if [ "$task_status" = "closed" ] || [ "$task_status" = "completed" ]; then
    ((closed++))
  fi
done

# Calculate progress
if [ $total -gt 0 ]; then
  percent=$((closed * 100 / total))
else
  percent=0
fi

# Get current date/time
current_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Read the epic file
epic_content=$(cat "$epic_file")

# Extract frontmatter and body
frontmatter_end=$(echo "$epic_content" | grep -n "^---$" | sed -n '2p' | cut -d: -f1)
if [ -z "$frontmatter_end" ]; then
  echo "❌ Invalid epic file format (missing frontmatter)"
  exit 1
fi

# Extract frontmatter
frontmatter=$(echo "$epic_content" | sed -n "1,${frontmatter_end}p")

# Update progress in frontmatter
updated_frontmatter=$(echo "$frontmatter" | sed "s/^progress: .*/progress: ${percent}%/")

# Extract body (everything after frontmatter)
body=$(echo "$epic_content" | sed -n "$((frontmatter_end + 1)),\$p")

# Write updated epic file
{
  echo "$updated_frontmatter"
  echo "$body"
} > "$epic_file"

echo "✅ Updated epic progress: $percent% ($closed/$total tasks completed)"
exit 0
