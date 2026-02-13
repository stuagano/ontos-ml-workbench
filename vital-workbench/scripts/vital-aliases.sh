#!/bin/bash

# ============================================================================
# VITAL Workbench Shell Aliases
# Source this file in your ~/.zshrc or ~/.bashrc
# ============================================================================

# Enable true color support for tmux + Claude Code
export TERM=xterm-256color
export COLORTERM=truecolor
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# tmux session management
alias vital='~/Documents/Customers/Mirion/mirion-vital-workbench/scripts/tmux-dev-session.sh'
alias tmux-vital='tmux attach -t vital || ~/Documents/Customers/Mirion/mirion-vital-workbench/scripts/tmux-dev-session.sh'
alias tmux-kill-vital='tmux kill-session -t vital'
alias tmux-ls='tmux ls'

# Quick navigation to project
alias vital-cd='cd ~/Documents/Customers/Mirion/mirion-vital-workbench'
alias vital-backend='cd ~/Documents/Customers/Mirion/mirion-vital-workbench/backend'
alias vital-frontend='cd ~/Documents/Customers/Mirion/mirion-vital-workbench/frontend'

# Development servers
alias vital-backend-start='cd ~/Documents/Customers/Mirion/mirion-vital-workbench/backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000'
alias vital-frontend-start='cd ~/Documents/Customers/Mirion/mirion-vital-workbench/frontend && npm run dev'

# Testing shortcuts
alias vital-test='cd ~/Documents/Customers/Mirion/mirion-vital-workbench && python3 frontend/test_all_endpoints.py'
alias vital-pytest='cd ~/Documents/Customers/Mirion/mirion-vital-workbench/backend && source venv/bin/activate && pytest -v'
alias vital-e2e='cd ~/Documents/Customers/Mirion/mirion-vital-workbench/backend && python3 scripts/e2e_test.py'

# Quick documentation
alias vital-help='less ~/Documents/Customers/Mirion/mirion-vital-workbench/TMUX_SETUP.md'
alias tmux-help='less ~/Documents/Customers/Mirion/mirion-vital-workbench/TMUX_SETUP.md'

# echo "✓ VITAL Workbench aliases loaded"
# echo "  Type 'vital' to start tmux development session"
# echo "  Type 'vital-help' to see tmux documentation"
