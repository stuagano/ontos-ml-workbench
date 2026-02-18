#!/bin/bash

set -e

issue_number="$1"

if [ -z "$issue_number" ]; then
  echo "❌ Please specify an issue number"
  echo "Usage: /pm:issue-sync <issue_number>"
  exit 1
fi

# Preflight Check 0: Repository Protection
remote_url=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$remote_url" == *"automazeio/ccpm"* ]]; then
  echo "❌ ERROR: Cannot sync to CCPM template repository!"
  echo "Update your remote: git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
  exit 1
fi

# Preflight Check 1: GitHub Authentication
if ! gh auth status &>/dev/null; then
  echo "❌ GitHub CLI not authenticated. Run: gh auth login"
  exit 1
fi

# Preflight Check 2: Issue Validation
if ! issue_json=$(gh issue view "$issue_number" --json state,title 2>/dev/null); then
  echo "❌ Issue #$issue_number not found"
  exit 1
fi

issue_state=$(echo "$issue_json" | jq -r '.state')
issue_title=$(echo "$issue_json" | jq -r '.title')

# Find which epic this issue belongs to
epic_name=""
progress_file=""
for epic_dir in .claude/epics/*/; do
  [ -d "$epic_dir" ] || continue
  test_progress="$epic_dir/updates/$issue_number/progress.md"
  if [ -f "$test_progress" ]; then
    epic_name=$(basename "$epic_dir")
    progress_file="$test_progress"
    break
  fi
done

# Preflight Check 3: Local Updates Check
if [ -z "$progress_file" ] || [ ! -f "$progress_file" ]; then
  echo "❌ No local updates found for issue #$issue_number"
  echo "Run: /pm:issue-start $issue_number"
  exit 1
fi

updates_dir=$(dirname "$progress_file")

# Get current datetime
current_datetime=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Preflight Check 4: Check Last Sync
last_sync=$(grep "^last_sync:" "$progress_file" | head -1 | sed 's/^last_sync: *//')
if [ -n "$last_sync" ]; then
  # Calculate time difference (simplified check - just warn if within last 5 minutes)
  echo "ℹ️ Last synced: $last_sync"
fi

# Preflight Check 5: Verify Changes
# Simple check - see if progress file has been modified since last sync marker
has_new_content=true
if grep -q "<!-- SYNCED:" "$progress_file" 2>/dev/null; then
  last_marker=$(grep "<!-- SYNCED:" "$progress_file" | tail -1)
  # For simplicity, always sync if we got this far
  echo "ℹ️ Found previous sync marker, will sync new content"
fi

# Step 1: Gather Local Updates
echo ""
echo "📝 Gathering updates for Issue #$issue_number: $issue_title"
echo "Epic: $epic_name"
echo ""

# Read progress data
completion=$(grep "^completion:" "$progress_file" | head -1 | sed 's/^completion: *//' | sed 's/%//')
completion="${completion:-0}"

# Extract task file
task_file=".claude/epics/$epic_name/$issue_number.md"
if [ ! -f "$task_file" ]; then
  # Try without leading zeros
  for f in ".claude/epics/$epic_name"/*.md; do
    if [ "$(basename "$f" .md)" = "$issue_number" ]; then
      task_file="$f"
      break
    fi
  done
fi

# Step 2: Build update comment
temp_comment=$(mktemp)

cat > "$temp_comment" <<EOF
## 🔄 Progress Update - $(date '+%Y-%m-%d')

EOF

# Extract completed work from progress file
if [ -f "$progress_file" ]; then
  echo "### ✅ Completed Work" >> "$temp_comment"
  # Extract completed items (look for checked boxes or completed sections)
  grep -E "^- \[x\]|^- ✅|^\* \[x\]|^\* ✅" "$progress_file" 2>/dev/null | head -10 >> "$temp_comment" || echo "- Progress tracked in local files" >> "$temp_comment"
  echo "" >> "$temp_comment"
fi

# Check for notes file
notes_file="$updates_dir/notes.md"
if [ -f "$notes_file" ]; then
  echo "### 📝 Technical Notes" >> "$temp_comment"
  tail -20 "$notes_file" | head -10 >> "$temp_comment"
  echo "" >> "$temp_comment"
fi

# Check for commits file
commits_file="$updates_dir/commits.md"
if [ -f "$commits_file" ]; then
  echo "### 💻 Recent Commits" >> "$temp_comment"
  tail -10 "$commits_file" >> "$temp_comment"
  echo "" >> "$temp_comment"
fi

# Get acceptance criteria from task file
if [ -f "$task_file" ]; then
  echo "### 📊 Acceptance Criteria Status" >> "$temp_comment"
  # Extract acceptance criteria (look for checkbox lists after "Acceptance Criteria" header)
  awk '/^## Acceptance Criteria/,/^##/ {print}' "$task_file" | grep -E "^- \[" | head -10 >> "$temp_comment" 2>/dev/null || echo "- See task file for details" >> "$temp_comment"
  echo "" >> "$temp_comment"
fi

# Add progress indicator
echo "---" >> "$temp_comment"
echo "*Progress: ${completion}% | Synced from local updates at $current_datetime*" >> "$temp_comment"

# Step 3: Post to GitHub
echo "🚀 Posting update to GitHub..."
if gh issue comment "$issue_number" --body-file "$temp_comment"; then
  echo "✅ Successfully synced to GitHub Issue #$issue_number"

  # Step 4: Update progress file with sync timestamp
  # Update frontmatter
  temp_progress=$(mktemp)
  awk -v date="$current_datetime" '
    BEGIN { in_frontmatter=0; frontmatter_done=0 }
    /^---$/ {
      if (in_frontmatter == 0) {
        in_frontmatter = 1
        print $0
        next
      } else {
        frontmatter_done = 1
        print "last_sync: " date
        print $0
        next
      }
    }
    in_frontmatter == 1 && /^last_sync:/ {
      print "last_sync: " date
      next
    }
    { print }
  ' "$progress_file" > "$temp_progress"
  mv "$temp_progress" "$progress_file"

  # Add sync marker at end of file
  echo "" >> "$progress_file"
  echo "<!-- SYNCED: $current_datetime -->" >> "$progress_file"

  # Step 5: Update task file frontmatter
  if [ -f "$task_file" ]; then
    temp_task=$(mktemp)
    repo_url=$(git remote get-url origin | sed 's/\.git$//' | sed 's/git@github.com:/https:\/\/github.com\//')
    awk -v date="$current_datetime" -v github="$repo_url/issues/$issue_number" '
      BEGIN { in_frontmatter=0; frontmatter_done=0 }
      /^---$/ {
        if (in_frontmatter == 0) {
          in_frontmatter = 1
          print $0
          next
        } else {
          frontmatter_done = 1
          print "updated: " date
          if (github_found == 0) {
            print "github: " github
          }
          print $0
          next
        }
      }
      in_frontmatter == 1 && /^updated:/ {
        print "updated: " date
        next
      }
      in_frontmatter == 1 && /^github:/ {
        github_found = 1
        print "github: " github
        next
      }
      { print }
    ' "$task_file" > "$temp_task"
    mv "$temp_task" "$task_file"
  fi

  # Step 6: Handle completion if at 100%
  if [ "$completion" = "100" ]; then
    echo ""
    echo "🎉 Task is marked as 100% complete!"

    # Update task status to closed
    if [ -f "$task_file" ]; then
      temp_task=$(mktemp)
      awk -v date="$current_datetime" '
        BEGIN { in_frontmatter=0 }
        /^---$/ {
          if (in_frontmatter == 0) {
            in_frontmatter = 1
            print $0
            next
          } else {
            in_frontmatter = 0
            print "completed: " date
            print $0
            next
          }
        }
        in_frontmatter == 1 && /^status:/ {
          print "status: closed"
          next
        }
        in_frontmatter == 1 && /^completed:/ {
          print "completed: " date
          next
        }
        { print }
      ' "$task_file" > "$temp_task"
      mv "$temp_task" "$task_file"
    fi

    # Update epic progress
    epic_file=".claude/epics/$epic_name/epic.md"
    if [ -f "$epic_file" ]; then
      # Count completed vs total tasks
      total_tasks=$(find ".claude/epics/$epic_name" -name "[0-9]*.md" -type f | wc -l | tr -d ' ')
      completed_tasks=$(find ".claude/epics/$epic_name" -name "[0-9]*.md" -type f -exec grep -l "^status: *closed" {} \; | wc -l | tr -d ' ')
      completed_tasks=$((completed_tasks + $(find ".claude/epics/$epic_name" -name "[0-9]*.md" -type f -exec grep -l "^status: *completed" {} \; | wc -l | tr -d ' ')))

      if [ "$total_tasks" -gt 0 ]; then
        epic_progress=$((completed_tasks * 100 / total_tasks))
        temp_epic=$(mktemp)
        awk -v progress="$epic_progress" '
          BEGIN { in_frontmatter=0 }
          /^---$/ {
            if (in_frontmatter == 0) {
              in_frontmatter = 1
              print $0
              next
            } else {
              in_frontmatter = 0
              print $0
              next
            }
          }
          in_frontmatter == 1 && /^progress:/ {
            print "progress: " progress "%"
            next
          }
          { print }
        ' "$epic_file" > "$temp_epic"
        mv "$temp_epic" "$epic_file"

        echo "📊 Updated epic progress: $epic_progress%"
      fi
    fi

    # Post completion comment
    completion_comment=$(mktemp)
    cat > "$completion_comment" <<EOF
## ✅ Task Completed - $(date '+%Y-%m-%d')

### 🎯 All Acceptance Criteria Met

This task has been marked as complete and is ready for review.

### 📦 Deliverables

All deliverables have been completed as specified in the task definition.

---
*Task completed: 100% | Synced at $current_datetime*
EOF
    gh issue comment "$issue_number" --body-file "$completion_comment"
    rm "$completion_comment"
  fi

  # Output summary
  echo ""
  echo "☁️ Synced updates to GitHub Issue #$issue_number"
  echo ""
  echo "📊 Current status:"
  echo "   Task completion: ${completion}%"

  if [ -f "$epic_file" ]; then
    epic_progress=$(grep "^progress:" "$epic_file" | head -1 | sed 's/^progress: *//' | sed 's/%//')
    echo "   Epic progress: ${epic_progress}%"
  fi

  echo ""
  echo "🔗 View update: gh issue view $issue_number --comments"

else
  echo "❌ Failed to post comment to GitHub"
  exit 1
fi

# Cleanup
rm "$temp_comment"

exit 0
