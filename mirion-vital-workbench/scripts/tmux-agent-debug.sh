#!/bin/bash

# ============================================================================
# VITAL Workbench - Agent Debug Session with Live Output
# Shows agent outputs in split panes for real-time debugging
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

SESSION_NAME="vital-debug"
PROJECT_ROOT="/Users/stuart.gano/Documents/Customers/Mirion/mirion-vital-workbench"

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

log "Creating VITAL debug session with 4 agent panes..."
echo ""

# Verify project directory
if [ ! -d "$PROJECT_ROOT" ]; then
    error "Project directory not found: $PROJECT_ROOT"
    exit 1
fi

# Create session
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT" -n "Debug"

# ============================================================================
# 4-Pane Grid Layout for Agent Monitoring
# ============================================================================
#
# +------------------------+------------------------+
# |                        |                        |
# |  Schema Analyzer       |  Backend Analyzer      |
# |  (Database issues)     |  (API issues)          |
# |                        |                        |
# +------------------------+------------------------+
# |                        |                        |
# |  Frontend Analyzer     |  Docs Reviewer         |
# |  (UI issues)           |  (Setup verification)  |
# |                        |                        |
# +------------------------+------------------------+

# Pane 0: Schema Analyzer (top-left)
tmux send-keys -t "$SESSION_NAME:0.0" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '🗄️  Schema Analyzer - Database Structure Analysis'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Analyzing schema files...'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "ls -1 schemas/*.sql | head -15" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Checking for duplicate schema definitions...'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "grep -h 'CREATE SCHEMA' schemas/*.sql 2>/dev/null | sort -u" Enter

# Pane 1: Backend Analyzer (top-right)
tmux split-window -h -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"
tmux send-keys -t "$SESSION_NAME:0.1" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo '⚙️  Backend Analyzer - API & Database Integration'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Current backend configuration:'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "grep 'DATABRICKS_CATALOG\\|DATABRICKS_SCHEMA' backend/.env" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Expected configuration (.env.example):'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "grep 'DATABRICKS_CATALOG\\|DATABRICKS_SCHEMA' backend/.env.example" Enter

# Pane 2: Frontend Analyzer (bottom-left)
tmux split-window -v -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"
tmux send-keys -t "$SESSION_NAME:0.2" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo '🎨 Frontend Analyzer - UI Integration Issues'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo 'Checking for screenshots of errors...'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "ls -lh *.png 2>/dev/null || echo 'No screenshots found'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo 'Frontend API configuration:'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "grep -A 2 'API_BASE_URL' frontend/.env 2>/dev/null || echo 'No .env file'" Enter

# Pane 3: Docs Reviewer (bottom-right)
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"
tmux send-keys -t "$SESSION_NAME:0.3" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo '📚 Docs Reviewer - Setup & Verification Status'" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo 'Documentation files (showing deployment/verification docs):'" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "ls -1 *DEPLOYMENT* *VERIFICATION* *STATUS* *SETUP* 2>/dev/null | head -10" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo 'Number of documentation files in root:'" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "ls -1 *.md 2>/dev/null | wc -l" Enter

# Equal sizing
tmux select-layout -t "$SESSION_NAME:0" tiled

# Select top-left pane
tmux select-pane -t "$SESSION_NAME:0.0"

# Success message
echo ""
success "Debug session created with 4 monitoring panes!"
echo ""
echo -e "${PURPLE}Layout:${NC}"
echo "  ┌──────────────────────┬──────────────────────┐"
echo "  │  Schema Analyzer     │  Backend Analyzer    │"
echo "  │  (Database)          │  (API)               │"
echo "  ├──────────────────────┼──────────────────────┤"
echo "  │  Frontend Analyzer   │  Docs Reviewer       │"
echo "  │  (UI)                │  (Setup)             │"
echo "  └──────────────────────┴──────────────────────┘"
echo ""
echo -e "${PURPLE}What you're seeing:${NC}"
echo "  • Top-left: Schema files and duplicate catalogs"
echo "  • Top-right: Backend config mismatch (catalog/schema)"
echo "  • Bottom-left: Frontend error screenshots"
echo "  • Bottom-right: Documentation sprawl"
echo ""
echo -e "${PURPLE}Navigation:${NC}"
echo "  Ctrl+a h/j/k/l  → Move between panes (vim-style)"
echo "  Ctrl+a arrows   → Move between panes (arrow keys)"
echo "  Ctrl+a z        → Zoom current pane (toggle fullscreen)"
echo "  Ctrl+a d        → Detach (session keeps running)"
echo "  Ctrl+a ?        → Show all key bindings"
echo ""
echo -e "${YELLOW}Tip:${NC} Use 'Ctrl+a z' to zoom into any pane for detailed inspection"
echo ""
echo -e "${GREEN}Attaching to session...${NC}"
echo ""

# Attach to session
tmux attach-session -t "$SESSION_NAME"
