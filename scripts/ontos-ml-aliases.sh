#!/bin/bash

# ============================================================================
# Ontos ML Workbench Shell Aliases
# Source this file in your ~/.zshrc or ~/.bashrc
# ============================================================================

# Enable true color support for tmux + Claude Code
export TERM=xterm-256color
export COLORTERM=truecolor
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Auto-detect project root (set this to your project location if needed)
ONTOS_ML_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# tmux session management
alias ontos='$ONTOS_ML_PROJECT_ROOT/scripts/tmux-dev-session.sh'
alias tmux-ontos='tmux attach -t ontos || $ONTOS_ML_PROJECT_ROOT/scripts/tmux-dev-session.sh'
alias tmux-kill-ontos='tmux kill-session -t ontos'
alias tmux-ls='tmux ls'

# Quick navigation to project
alias ontos-cd='cd $ONTOS_ML_PROJECT_ROOT'
alias ontos-backend='cd $ONTOS_ML_PROJECT_ROOT/backend'
alias ontos-frontend='cd $ONTOS_ML_PROJECT_ROOT/frontend'

# Development servers
alias ontos-backend-start='cd $ONTOS_ML_PROJECT_ROOT/backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000'
alias ontos-frontend-start='cd $ONTOS_ML_PROJECT_ROOT/frontend && npm run dev'

# Testing shortcuts
alias ontos-test='cd $ONTOS_ML_PROJECT_ROOT && python3 frontend/test_all_endpoints.py'
alias ontos-pytest='cd $ONTOS_ML_PROJECT_ROOT/backend && source venv/bin/activate && pytest -v'
alias ontos-e2e='cd $ONTOS_ML_PROJECT_ROOT/backend && python3 scripts/e2e_test.py'

# Quick documentation
alias ontos-help='less $ONTOS_ML_PROJECT_ROOT/TMUX_SETUP.md'
alias tmux-help='less $ONTOS_ML_PROJECT_ROOT/TMUX_SETUP.md'

# echo "Ontos ML Workbench aliases loaded"
# echo "  Type 'ontos' to start tmux development session"
# echo "  Type 'ontos-help' to see tmux documentation"
