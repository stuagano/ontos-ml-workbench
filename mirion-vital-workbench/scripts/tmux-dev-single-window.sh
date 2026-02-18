#!/bin/bash

# ============================================================================
# Ontos ML Workbench Development Session - Single Window View
# See everything at once in a beautiful grid layout
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SESSION_NAME="vital"
PROJECT_ROOT="/Users/stuart.gano/Documents/Customers/Mirion/mirion-ontos-ml-workbench"

log() { echo -e "${BLUE}[VITAL]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
warning() { echo -e "${YELLOW}[!]${NC} $1"; }

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    warning "Session '$SESSION_NAME' already exists."
    echo ""
    echo "Options:"
    echo "  1) Attach to existing session"
    echo "  2) Kill and recreate session"
    echo "  3) Exit"
    echo ""
    read -p "Choose [1-3]: " choice

    case $choice in
        1)
            log "Attaching to existing session..."
            tmux attach-session -t "$SESSION_NAME"
            exit 0
            ;;
        2)
            log "Killing existing session..."
            tmux kill-session -t "$SESSION_NAME"
            ;;
        3)
            log "Exiting..."
            exit 0
            ;;
        *)
            error "Invalid choice. Exiting."
            exit 1
            ;;
    esac
fi

log "Creating Ontos ML Workbench single-window session..."
echo ""

# Verify project directory
if [ ! -d "$PROJECT_ROOT" ]; then
    error "Project directory not found: $PROJECT_ROOT"
    exit 1
fi

# Create new session with one window
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT" -n "VITAL"

# ============================================================================
# Single Window Layout - Everything Visible
# ============================================================================
#
# Layout (4 quadrants):
# +------------------------+------------------------+
# |                        |                        |
# |    Claude Code         |    Backend Server      |
# |    (AI Assistant)      |    (Port 8000)         |
# |                        |                        |
# +------------------------+------------------------+
# |                        |                        |
# |    Frontend Dev        |    Testing             |
# |    (Port 5173)         |    (API + Pytest)      |
# |                        |                        |
# +------------------------+------------------------+

# Start with main pane (Claude Code)
tmux send-keys -t "$SESSION_NAME:0.0" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '🤖 Claude Code - Ontos ML Workbench Development'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Pane Layout:'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  Top-Left:     Claude Code (this pane)'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  Top-Right:    Backend Server'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  Bottom-Left:  Frontend Dev'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  Bottom-Right: Testing'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Navigation:'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  Ctrl+a hjkl  - Move between panes (vim-style)'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  Ctrl+a z     - Zoom current pane (toggle fullscreen)'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  Ctrl+a d     - Detach (keeps running)'" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" Enter

# Split vertically for Backend (right half)
tmux split-window -h -t "$SESSION_NAME:0" -c "$PROJECT_ROOT/backend"
tmux send-keys -t "$SESSION_NAME:0.1" "cd $PROJECT_ROOT/backend" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "source venv/bin/activate" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo '🚀 Backend Server (FastAPI)'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'To start:'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo '  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'URLs:'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo '  Backend: http://localhost:8000'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo '  API Docs: http://localhost:8000/docs'" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" Enter

# Split Claude pane horizontally for Frontend (bottom left)
tmux split-window -v -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT/frontend"
tmux send-keys -t "$SESSION_NAME:0.2" "cd $PROJECT_ROOT/frontend" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo '⚛️  Frontend Dev Server (React + Vite)'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo 'To start:'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo '  npm run dev'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo 'URL:'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo '  Frontend: http://localhost:5173'" Enter
tmux send-keys -t "$SESSION_NAME:0.2" "echo ''" Enter

# Split Backend pane horizontally for Testing (bottom right)
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"
tmux send-keys -t "$SESSION_NAME:0.3" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "clear" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo '🧪 Testing & Validation'" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo 'Available commands:'" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo '  python3 frontend/test_all_endpoints.py  # API tests'" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo '  cd backend && pytest -v                # Unit tests'" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo '  python3 backend/scripts/e2e_test.py    # E2E tests'" Enter
tmux send-keys -t "$SESSION_NAME:0.3" "echo ''" Enter

# Make panes equal size (50/50 split)
tmux select-layout -t "$SESSION_NAME:0" tiled

# Select Claude Code pane to start
tmux select-pane -t "$SESSION_NAME:0.0"

# Display success message
echo ""
success "Ontos ML Workbench single-window session created!"
echo ""
echo -e "${PURPLE}Layout:${NC}"
echo "  ┌─────────────────┬─────────────────┐"
echo "  │   Claude Code   │   Backend       │"
echo "  │   (AI Help)     │   (Port 8000)   │"
echo "  ├─────────────────┼─────────────────┤"
echo "  │   Frontend      │   Testing       │"
echo "  │   (Port 5173)   │   (API+Pytest)  │"
echo "  └─────────────────┴─────────────────┘"
echo ""
echo -e "${PURPLE}Navigation:${NC}"
echo "  Ctrl+a h/j/k/l  → Move between panes (vim-style)"
echo "  Ctrl+a z        → Zoom current pane (fullscreen toggle)"
echo "  Ctrl+a d        → Detach (everything keeps running)"
echo "  Ctrl+a [        → Scroll mode (q to exit)"
echo ""
echo -e "${PURPLE}Quick Commands:${NC}"
echo "  Ctrl+a t  → Run pytest"
echo "  Ctrl+a a  → Run API tests"
echo "  Ctrl+a g  → Git status"
echo ""
echo -e "${GREEN}Attaching to session...${NC}"
echo ""

# Attach to session
tmux attach-session -t "$SESSION_NAME"
