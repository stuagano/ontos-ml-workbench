#!/bin/bash

# ============================================================================
# Ontos ML Workbench Development Session
# Automated tmux session with all services ready
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SESSION_NAME="ontos"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Helper function for colored output
log() {
    echo -e "${BLUE}[ONTOS]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

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

log "Creating Ontos ML Workbench development session..."
echo ""

# Verify project directory exists
if [ ! -d "$PROJECT_ROOT" ]; then
    error "Project directory not found: $PROJECT_ROOT"
    exit 1
fi

# Create new detached session
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

# ============================================================================
# Window 0: Claude Code + Project Overview
# ============================================================================

tmux rename-window -t "$SESSION_NAME:0" "Claude"

# Create 3 panes:
# +------------------+
# |                  |
# |    Claude Code   |
# |                  |
# +------------------+
# |  Git  |  Docs    |
# +------------------+

# Main pane for Claude Code (already exists as pane 0)
tmux send-keys -t "$SESSION_NAME:0.0" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "# Welcome to Ontos ML Workbench Development!" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "# This is your Claude Code pane" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "# " Enter
tmux send-keys -t "$SESSION_NAME:0.0" "# Quick Commands:" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "#   Alt+1: Claude Code (this window)" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "#   Alt+2: Backend Services" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "#   Alt+3: Frontend Development" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "#   Alt+4: Testing & Validation" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "# " Enter
tmux send-keys -t "$SESSION_NAME:0.0" "clear" Enter

# Split horizontally for git/docs section
tmux split-window -h -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"

# Git status pane (bottom left)
tmux send-keys -t "$SESSION_NAME:0.1" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "git status" Enter

# Resize panes (Claude gets 70%, git/docs get 30%)
tmux resize-pane -t "$SESSION_NAME:0.0" -x 70%

# ============================================================================
# Window 1: Backend Services
# ============================================================================

tmux new-window -t "$SESSION_NAME:1" -n "Backend" -c "$PROJECT_ROOT/backend"

# Create 2 panes:
# +------------------+
# |   FastAPI Server |
# +------------------+
# |   Backend Logs   |
# +------------------+

# Pane 0: FastAPI Server
tmux send-keys -t "$SESSION_NAME:1.0" "cd $PROJECT_ROOT/backend" Enter
tmux send-keys -t "$SESSION_NAME:1.0" "source venv/bin/activate" Enter
tmux send-keys -t "$SESSION_NAME:1.0" "echo '🚀 Starting FastAPI Backend...'" Enter
tmux send-keys -t "$SESSION_NAME:1.0" "echo 'Backend will be available at: http://localhost:8000'" Enter
tmux send-keys -t "$SESSION_NAME:1.0" "echo 'API Docs: http://localhost:8000/docs'" Enter
tmux send-keys -t "$SESSION_NAME:1.0" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:1.0" "# To start backend:" Enter
tmux send-keys -t "$SESSION_NAME:1.0" "# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" Enter

# Pane 1: Backend logs
tmux split-window -v -t "$SESSION_NAME:1" -c "$PROJECT_ROOT/backend"
tmux send-keys -t "$SESSION_NAME:1.1" "cd $PROJECT_ROOT/backend" Enter
tmux send-keys -t "$SESSION_NAME:1.1" "echo '📋 Backend Logs (watching for activity)'" Enter
tmux send-keys -t "$SESSION_NAME:1.1" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:1.1" "# Backend logs will appear here when server is running" Enter

# Resize panes (server gets 70%, logs get 30%)
tmux resize-pane -t "$SESSION_NAME:1.0" -y 70%

# ============================================================================
# Window 2: Frontend Development
# ============================================================================

tmux new-window -t "$SESSION_NAME:2" -n "Frontend" -c "$PROJECT_ROOT/frontend"

# Create 2 panes:
# +------------------+
# |   Vite Dev Server|
# +------------------+
# |   Frontend Logs  |
# +------------------+

# Pane 0: Vite dev server
tmux send-keys -t "$SESSION_NAME:2.0" "cd $PROJECT_ROOT/frontend" Enter
tmux send-keys -t "$SESSION_NAME:2.0" "echo '⚛️  Starting React Frontend...'" Enter
tmux send-keys -t "$SESSION_NAME:2.0" "echo 'Frontend will be available at: http://localhost:5173'" Enter
tmux send-keys -t "$SESSION_NAME:2.0" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:2.0" "# To start frontend:" Enter
tmux send-keys -t "$SESSION_NAME:2.0" "# npm run dev" Enter

# Pane 1: Frontend logs/console
tmux split-window -v -t "$SESSION_NAME:2" -c "$PROJECT_ROOT/frontend"
tmux send-keys -t "$SESSION_NAME:2.1" "cd $PROJECT_ROOT/frontend" Enter
tmux send-keys -t "$SESSION_NAME:2.1" "echo '🎨 Frontend Console (build output, hot reload notifications)'" Enter
tmux send-keys -t "$SESSION_NAME:2.1" "echo ''" Enter

# Resize panes
tmux resize-pane -t "$SESSION_NAME:2.0" -y 70%

# ============================================================================
# Window 3: Testing & Validation
# ============================================================================

tmux new-window -t "$SESSION_NAME:3" -n "Testing" -c "$PROJECT_ROOT"

# Create 3 panes:
# +--------+--------+
# |  API   |  E2E   |
# |  Tests | Tests  |
# +--------+--------+
# |   Pytest Output |
# +-----------------+

# Pane 0: API endpoint tests
tmux send-keys -t "$SESSION_NAME:3.0" "cd $PROJECT_ROOT" Enter
tmux send-keys -t "$SESSION_NAME:3.0" "echo '🔬 API Endpoint Testing'" Enter
tmux send-keys -t "$SESSION_NAME:3.0" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:3.0" "echo 'Available test commands:'" Enter
tmux send-keys -t "$SESSION_NAME:3.0" "echo '  python3 frontend/test_all_endpoints.py'" Enter
tmux send-keys -t "$SESSION_NAME:3.0" "echo '  curl http://localhost:8000/api/health'" Enter
tmux send-keys -t "$SESSION_NAME:3.0" "echo ''" Enter

# Pane 1: E2E tests
tmux split-window -h -t "$SESSION_NAME:3" -c "$PROJECT_ROOT/backend"
tmux send-keys -t "$SESSION_NAME:3.1" "cd $PROJECT_ROOT/backend" Enter
tmux send-keys -t "$SESSION_NAME:3.1" "echo '🎭 End-to-End Testing'" Enter
tmux send-keys -t "$SESSION_NAME:3.1" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:3.1" "echo 'Available test commands:'" Enter
tmux send-keys -t "$SESSION_NAME:3.1" "echo '  python3 scripts/e2e_test.py'" Enter
tmux send-keys -t "$SESSION_NAME:3.1" "echo '  python3 scripts/e2e_test.py -v'" Enter
tmux send-keys -t "$SESSION_NAME:3.1" "echo ''" Enter

# Pane 2: Pytest runner
tmux split-window -v -t "$SESSION_NAME:3.0" -c "$PROJECT_ROOT/backend"
tmux send-keys -t "$SESSION_NAME:3.2" "cd $PROJECT_ROOT/backend" Enter
tmux send-keys -t "$SESSION_NAME:3.2" "source venv/bin/activate" Enter
tmux send-keys -t "$SESSION_NAME:3.2" "echo '🧪 Backend Unit Tests'" Enter
tmux send-keys -t "$SESSION_NAME:3.2" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:3.2" "echo 'Available test commands:'" Enter
tmux send-keys -t "$SESSION_NAME:3.2" "echo '  pytest -v'" Enter
tmux send-keys -t "$SESSION_NAME:3.2" "echo '  pytest tests/test_api_integration.py -v'" Enter
tmux send-keys -t "$SESSION_NAME:3.2" "echo '  pytest --cov=app --cov-report=html'" Enter
tmux send-keys -t "$SESSION_NAME:3.2" "echo ''" Enter

# Resize panes
tmux resize-pane -t "$SESSION_NAME:3.0" -y 60%
tmux resize-pane -t "$SESSION_NAME:3.1" -x 50%

# ============================================================================
# Finalize
# ============================================================================

# Select Claude Code window to start
tmux select-window -t "$SESSION_NAME:0"
tmux select-pane -t "$SESSION_NAME:0.0"

# Display success message
echo ""
success "Ontos ML Workbench session created successfully!"
echo ""
echo -e "${PURPLE}Session layout:${NC}"
echo "  Window 0 (Claude):   Claude Code + Git Status"
echo "  Window 1 (Backend):  FastAPI Server + Logs"
echo "  Window 2 (Frontend): Vite Dev Server + Console"
echo "  Window 3 (Testing):  API Tests + E2E Tests + Pytest"
echo ""
echo -e "${PURPLE}Quick navigation:${NC}"
echo "  Alt+1 → Claude Code"
echo "  Alt+2 → Backend Services"
echo "  Alt+3 → Frontend Development"
echo "  Alt+4 → Testing & Validation"
echo ""
echo -e "${PURPLE}Useful commands:${NC}"
echo "  Ctrl+a d  → Detach from session (keeps running)"
echo "  Ctrl+a ?  → Show all key bindings"
echo "  Ctrl+a |  → Split pane vertically"
echo "  Ctrl+a -  → Split pane horizontally"
echo "  Ctrl+a hjkl → Navigate panes (vim-style)"
echo ""
echo -e "${GREEN}Attaching to session...${NC}"
echo ""

# Attach to session
tmux attach-session -t "$SESSION_NAME"
