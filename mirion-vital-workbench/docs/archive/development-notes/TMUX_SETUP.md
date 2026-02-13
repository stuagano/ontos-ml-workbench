# VITAL Workbench tmux Setup Guide

Beautiful, persistent development environment optimized for Claude Code + VITAL Workbench.

## Features

✨ **Beautiful Catppuccin Mocha Theme** - Easy on the eyes for long coding sessions
🎯 **4 Pre-configured Windows** - Claude, Backend, Frontend, Testing
⚡ **Persistent Sessions** - Never lose your context or running processes
🔥 **Hot Key Navigation** - Alt+1/2/3/4 for instant window switching
📊 **Multi-pane Layout** - Monitor logs, run tests, code simultaneously
🎨 **Vim-style Navigation** - hjkl for pane navigation, resize with HJKL

## Quick Start

### 1. Start the Development Session

```bash
# From anywhere
~/Documents/Customers/Mirion/mirion-vital-workbench/scripts/tmux-dev-session.sh

# Or add alias to ~/.zshrc:
alias vital='~/Documents/Customers/Mirion/mirion-vital-workbench/scripts/tmux-dev-session.sh'

# Then simply:
vital
```

### 2. Navigate Your Session

```bash
Alt+1     # Jump to Claude Code window
Alt+2     # Jump to Backend window
Alt+3     # Jump to Frontend window
Alt+4     # Jump to Testing window
```

### 3. Detach and Reattach

```bash
# Detach (keeps everything running)
Ctrl+a d

# Reattach later
tmux attach -t vital

# Or from anywhere:
vital  # Will ask if you want to attach to existing session
```

## Session Layout

### Window 0: Claude Code (Alt+1)
```
┌─────────────────────────┬──────────┐
│                         │          │
│     Claude Code         │   Git    │
│     (Your AI pair)      │  Status  │
│                         │          │
└─────────────────────────┴──────────┘
```

**Purpose:** Main development with Claude Code assistance
- Left pane: Claude Code conversation
- Right pane: Git status and documentation

### Window 1: Backend Services (Alt+2)
```
┌──────────────────────────────────┐
│     FastAPI Server (port 8000)   │
│     uvicorn --reload             │
├──────────────────────────────────┤
│     Backend Logs                 │
│     Tail output, errors          │
└──────────────────────────────────┘
```

**Purpose:** Backend service monitoring
- Top pane: FastAPI server running
- Bottom pane: Live log monitoring

### Window 2: Frontend Development (Alt+3)
```
┌──────────────────────────────────┐
│     Vite Dev Server (port 5173)  │
│     npm run dev                  │
├──────────────────────────────────┤
│     Frontend Console             │
│     Build output, hot reload     │
└──────────────────────────────────┘
```

**Purpose:** Frontend development
- Top pane: Vite dev server
- Bottom pane: Build output and console

### Window 3: Testing & Validation (Alt+4)
```
┌─────────────────┬────────────────┐
│   API Tests     │   E2E Tests    │
│   endpoint tests│   workflow     │
├─────────────────┴────────────────┤
│   Pytest Output                  │
│   Unit test results              │
└──────────────────────────────────┘
```

**Purpose:** Testing and validation
- Top-left: API endpoint tests
- Top-right: End-to-end tests
- Bottom: Pytest unit tests

## Essential Key Bindings

### Session Management
| Key | Action |
|-----|--------|
| `Ctrl+a d` | Detach from session (keeps running) |
| `Ctrl+a D` | Detach all other clients |
| `Ctrl+a $` | Rename session |
| `Ctrl+a S` | Choose session to switch to |

### Window Management
| Key | Action |
|-----|--------|
| `Alt+1/2/3/4` | Jump to window 1/2/3/4 (no prefix!) |
| `Ctrl+a c` | Create new window |
| `Ctrl+a ,` | Rename current window |
| `Ctrl+a w` | List windows |
| `Ctrl+a n` | Next window |
| `Ctrl+a p` | Previous window |
| `Ctrl+a X` | Kill window (no confirmation) |

### Pane Management
| Key | Action |
|-----|--------|
| `Ctrl+a \|` | Split pane vertically |
| `Ctrl+a -` | Split pane horizontally |
| `Ctrl+a h/j/k/l` | Navigate panes (vim-style) |
| `Ctrl+a H/J/K/L` | Resize panes (vim-style) |
| `Ctrl+a f` | Toggle pane zoom (fullscreen) |
| `Ctrl+a x` | Kill pane (no confirmation) |
| `Ctrl+a q` | Show pane numbers |

### Copy Mode (for scrolling/copying)
| Key | Action |
|-----|--------|
| `Ctrl+a [` | Enter copy mode |
| `v` | Start selection (in copy mode) |
| `y` | Copy selection (in copy mode) |
| `q` | Exit copy mode |
| **Scroll with mouse** | Mouse wheel works! |

### VITAL-Specific Shortcuts
| Key | Action |
|-----|--------|
| `Ctrl+a t` | Run pytest tests |
| `Ctrl+a a` | Run API endpoint tests |
| `Ctrl+a g` | Show git status |
| `Ctrl+a C-l` | Clear screen |

### Help
| Key | Action |
|-----|--------|
| `Ctrl+a ?` | Show all key bindings |
| `Ctrl+a r` | Reload tmux config |

## Common Workflows

### Starting Your Day

```bash
# 1. Start the session
vital

# 2. Navigate to Backend window (Alt+2)
# 3. Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 4. Navigate to Frontend window (Alt+3)
# 5. Start frontend
npm run dev

# 6. Back to Claude Code (Alt+1)
# Ready to code!
```

### Running Tests

```bash
# Quick API test (from any window)
Ctrl+a a

# Or manually:
Alt+4  # Jump to testing window
python3 frontend/test_all_endpoints.py

# Unit tests
Alt+4  # Testing window
# Bottom pane is already in backend/
pytest -v
```

### Working with Long-Running Queries

```bash
# SQL warehouse queries take 30-40s
# Perfect use case for tmux!

Alt+1  # Claude Code
# Ask Claude to query database

# While it's running:
Alt+2  # Check backend logs
Alt+4  # Run other tests

# Come back when ready
Alt+1  # Back to Claude
```

### Multi-tasking

```bash
# Have Claude work on backend code
Alt+1  # Claude window
"Implement the feedback endpoint"

# While Claude works, test frontend
Alt+3  # Frontend window
# Test UI changes manually

# While frontend rebuilds, check API
Alt+4  # Testing window
python3 frontend/test_all_endpoints.py

# All happening simultaneously!
```

## Tips & Tricks

### 1. Persistent Context
```bash
# Start work
vital
# ... work all day ...
Ctrl+a d  # Detach, close laptop

# Next day
vital  # Attach to existing session
# Everything exactly as you left it!
```

### 2. Quick Reference Sheet
```bash
# Add to your shell for quick reference
alias tmux-help='less ~/Documents/Customers/Mirion/mirion-vital-workbench/TMUX_SETUP.md'
```

### 3. Copy Mode for Long Outputs
```bash
# Claude's responses or test outputs too long?
Ctrl+a [          # Enter copy mode
# Use arrow keys or vim keys to navigate
# Press 'q' to exit
```

### 4. Zoom When You Need Focus
```bash
Ctrl+a f          # Toggle fullscreen for current pane
# Work without distraction
Ctrl+a f          # Toggle back to see all panes
```

### 5. Mouse Support
```bash
# Click to select panes
# Scroll wheel to scroll history
# Click and drag to resize panes
# Double-click to select word
# Triple-click to select line
```

### 6. Session Sharing (Pair Programming)
```bash
# Developer 1:
vital

# Developer 2 (same machine):
tmux attach -t vital

# Both see the same session!
# Perfect for pair programming with Claude
```

## Troubleshooting

### Colors Look Wrong
```bash
# Add to ~/.zshrc or ~/.bashrc
export TERM=xterm-256color
export COLORTERM=truecolor

# Reload shell
source ~/.zshrc
```

### Can't Detach
```bash
# Prefix changed to Ctrl+a (not Ctrl+b)
Ctrl+a d    # Correct
Ctrl+b d    # Wrong (old default)
```

### Lost in Panes
```bash
Ctrl+a q    # Shows pane numbers for 2 seconds
# Press the number to jump to that pane
```

### Want to Start Fresh
```bash
# Kill existing session
tmux kill-session -t vital

# Run script again
vital
```

### Backend/Frontend Not Starting
```bash
# Make sure you're in the right directory
Alt+2  # Backend window
pwd    # Should show: .../mirion-vital-workbench/backend

Alt+3  # Frontend window
pwd    # Should show: .../mirion-vital-workbench/frontend
```

## Advanced Configuration

### Install Plugin Manager (Optional)
```bash
# Clone TPM
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

# Edit ~/.tmux.conf and uncomment plugin section
# Then: Ctrl+a I (capital I) to install plugins
```

### Recommended Plugins
- `tmux-resurrect` - Save/restore sessions across reboots
- `tmux-continuum` - Auto-save sessions every 15 minutes
- `tmux-yank` - Better clipboard integration

### Auto-start on Login
```bash
# Add to ~/.zshrc or ~/.bashrc
if command -v tmux &> /dev/null && [ -z "$TMUX" ]; then
    # Check if vital session exists
    tmux has-session -t vital 2>/dev/null
    if [ $? -eq 0 ]; then
        # Attach to existing session
        exec tmux attach-session -t vital
    fi
fi
```

## Customization

### Change Theme Colors
Edit `~/.tmux.conf` and modify the color variables:
```bash
MOCHA_BLUE="#89b4fa"    # Change to your preferred blue
MOCHA_PINK="#f5c2e7"    # Change to your preferred pink
# etc.
```

### Add Custom Key Bindings
Add to `~/.tmux.conf`:
```bash
# Example: Quick Docker commands
bind D send-keys 'docker ps' Enter
bind d send-keys 'docker compose logs -f' Enter
```

### Modify Session Layout
Edit `scripts/tmux-dev-session.sh` to add more windows or change pane layout.

## Resources

- [Official tmux Wiki](https://github.com/tmux/tmux/wiki)
- [tmux Cheat Sheet](https://tmuxcheatsheet.com/)
- [Catppuccin Theme](https://github.com/catppuccin/tmux)
- [Blue Leaf tmux Article](https://blueleaf.com/2025/tmux-claude-code)

## Quick Command Reference

```bash
# Session management
tmux ls                    # List sessions
tmux attach -t vital       # Attach to vital session
tmux kill-session -t vital # Kill vital session

# From within tmux
Ctrl+a d                   # Detach
Ctrl+a ?                   # Help
Ctrl+a r                   # Reload config

# Navigation
Alt+1/2/3/4               # Window 1/2/3/4
Ctrl+a h/j/k/l            # Pane left/down/up/right
Ctrl+a [                  # Scroll mode

# Layout
Ctrl+a |                  # Vertical split
Ctrl+a -                  # Horizontal split
Ctrl+a f                  # Fullscreen pane
```

---

**Happy coding with VITAL Workbench + tmux + Claude Code!** 🚀

Your development environment is now persistent, beautiful, and optimized for AI-assisted development.
