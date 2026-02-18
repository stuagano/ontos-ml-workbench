#!/bin/bash

# ============================================================================
# Spawn Agent into tmux Pane
# Usage: spawn-agent <pane-number> <agent-type> <prompt>
# ============================================================================

SESSION_NAME="ontos"

if [ "$#" -lt 3 ]; then
    echo "Usage: spawn-agent <pane-number> <agent-type> <prompt>"
    echo ""
    echo "Pane numbers:"
    echo "  0 - Main Claude (orchestrator)"
    echo "  1 - Agent 1 (top-right)"
    echo "  2 - Agent 2 (bottom-left)"
    echo "  3 - Agent 3 (bottom-right)"
    echo ""
    echo "Agent types:"
    echo "  general-purpose"
    echo "  Explore"
    echo "  fe-specialized-agents:web-devloop-tester"
    echo "  feature-dev:code-reviewer"
    echo "  etc."
    echo ""
    echo "Example:"
    echo "  spawn-agent 1 general-purpose 'Fix backend API bugs'"
    exit 1
fi

PANE=$1
AGENT_TYPE=$2
PROMPT=$3

# Check if session exists
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Error: Session '$SESSION_NAME' not found"
    echo "Run 'ontos-agents' first to create the session"
    exit 1
fi

# Clear pane and start agent
tmux send-keys -t "$SESSION_NAME:0.$PANE" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.$PANE" "echo '🤖 Starting agent: $AGENT_TYPE'" Enter
tmux send-keys -t "$SESSION_NAME:0.$PANE" "echo 'Task: $PROMPT'" Enter
tmux send-keys -t "$SESSION_NAME:0.$PANE" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.$PANE" "claude" Enter

# Wait a moment for Claude to start
sleep 2

# Send the Task command to spawn the agent
tmux send-keys -t "$SESSION_NAME:0.$PANE" "/task $AGENT_TYPE \"$PROMPT\"" Enter

echo "✓ Agent spawned in pane $PANE"
