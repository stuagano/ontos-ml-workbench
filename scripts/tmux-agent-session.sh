#!/bin/bash

# ============================================================================
# Ontos ML Workbench - Multi-Agent tmux Session
# Run Claude Code in main pane, spawn agents in separate panes
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

SESSION_NAME="vital"
PROJECT_ROOT="/Users/stuart.gano/Documents/Customers/Mirion/mirion-ontos-ml-workbench"

log() { echo -e "${BLUE}[VITAL]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
warning() { echo -e "${YELLOW}[!]${NC} $1"; }

# Check if session exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    warning "Session '$SESSION_NAME' already exists."
    read -p "Kill and recreate? [y/N]: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then
        tmux kill-session -t "$SESSION_NAME"
    else
        log "Attaching to existing session..."
        tmux attach-session -t "$SESSION_NAME"
        exit 0
    fi
fi

log "Creating VITAL multi-agent session..."
echo ""

# Verify project directory
if [ ! -d "$PROJECT_ROOT" ]; then
    error "Project directory not found: $PROJECT_ROOT"
    exit 1
fi

# Create session
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT" -n "Agents"

# ============================================================================
# 4-Pane Grid Layout for Parallel Agent Execution
# ============================================================================
#
# +------------------------+------------------------+
# |                        |                        |
# |  Main Claude Code      |  Agent 1               |
# |  (Orchestrator)        |  (Backend/API work)    |
# |                        |                        |
# +------------------------+------------------------+
# |                        |                        |
# |  Agent 2               |  Agent 3               |
# |  (Frontend/UI work)    |  (Testing/Validation)  |
# |                        |                        |
# +------------------------+------------------------+

# Pane 0: Main Claude Code (orchestrator)
tmux send-keys -t "$SESSION_NAME:0.0" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '🤖 Ontos ML Workbench - Multi-Agent Session'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Starting Claude Code orchestrator...'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" Enter
# Don't auto-start claude yet - let user start it when ready

# Pane 1: Agent slot 1 (top-right)
tmux split-window -h -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"
tmux send-keys -t "$SESSION_NAME:0.1" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo '🔧 Agent Slot 1 - Backend/API Work'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Ready for agent assignment...'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" Enter

# Pane 2: Agent slot 2 (bottom-left)
tmux split-window -v -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"
tmux send-keys -t "$SESSION_NAME:0.2" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo '🎨 Agent Slot 2 - Frontend/UI Work'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo 'Ready for agent assignment...'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo ''" Enter

# Pane 3: Agent slot 3 (bottom-right)
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"
tmux send-keys -t "$SESSION_NAME:0.3" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo '🧪 Agent Slot 3 - Testing/Validation'" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo 'Ready for agent assignment...'" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo ''" Enter

# Equal sizing
tmux select-layout -t "$SESSION_NAME:0" tiled

# Select main pane
tmux select-pane -t "$SESSION_NAME:0.0"

# Success message
echo ""
success "Multi-agent session created!"
echo ""
echo -e "${PURPLE}Layout:${NC}"
echo "  ┌──────────────────┬──────────────────┐"
echo "  │  Main Claude     │  Agent 1         │"
echo "  │  (Orchestrator)  │  (Backend/API)   │"
echo "  ├──────────────────┼──────────────────┤"
echo "  │  Agent 2         │  Agent 3         │"
echo "  │  (Frontend/UI)   │  (Testing)       │"
echo "  └──────────────────┴──────────────────┘"
echo ""
echo -e "${PURPLE}Usage:${NC}"
echo "  1. Main pane starts Claude Code (orchestrator)"
echo "  2. Spawn agents with: spawn-agent <pane> <agent-type> <prompt>"
echo "  3. Watch all agents work simultaneously"
echo ""
echo -e "${PURPLE}Navigation:${NC}"
echo "  Ctrl+a h/j/k/l  → Move between panes"
echo "  Ctrl+a z        → Zoom current pane"
echo "  Ctrl+a d        → Detach"
echo ""
echo -e "${GREEN}Starting main Claude Code session...${NC}"
echo ""

# Start Claude Code in main pane
tmux send-keys -t "$SESSION_NAME:0.0" "claude" Enter

# Attach to session
tmux attach-session -t "$SESSION_NAME"
