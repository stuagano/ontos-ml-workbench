# Multi-Agent Parallel Workflow with tmux

Run multiple Claude Code agents in parallel, each visible in its own tmux pane.

## Quick Start

```bash
# 1. Start the multi-agent session
vital-agents

# 2. Main pane (0) now has Claude Code running
# 3. Spawn agents into other panes from main Claude
```

## Layout

```
┌──────────────────┬──────────────────┐
│  Main Claude     │  Agent 1         │
│  (Orchestrator)  │  (Backend/API)   │
│  Pane 0          │  Pane 1          │
├──────────────────┼──────────────────┤
│  Agent 2         │  Agent 3         │
│  (Frontend/UI)   │  (Testing)       │
│  Pane 2          │  Pane 3          │
└──────────────────┴──────────────────┘
```

## Workflow: Spawning Agent Teams

### Method 1: From Main Claude (Orchestrator)

In the **main pane (0)**, use Claude Code's Task tool:

```
You: "spawn an agent team to review and test all APIs"

Claude will internally call:
- Task tool with subagent_type="general-purpose"
- Task tool with subagent_type="general-purpose"
- Task tool with subagent_type="general-purpose"

But YOU want to see them in separate panes!
```

### Method 2: Manual Agent Assignment

From a **separate terminal** (outside tmux), assign agents to specific panes:

```bash
# Spawn agent 1 to work on backend
spawn-agent 1 general-purpose "Fix all backend API endpoint issues"

# Spawn agent 2 to work on frontend
spawn-agent 2 general-purpose "Complete all frontend pages"

# Spawn agent 3 to run tests
spawn-agent 3 general-purpose "Run comprehensive test suite"
```

### Method 3: Integrated Approach (Best)

In **Main Claude (pane 0)**, tell Claude to coordinate but execute in other panes:

```
You: "I want you to coordinate 3 agents working in parallel:
- Agent 1 (pane 1): Fix backend bugs
- Agent 2 (pane 2): Complete frontend
- Agent 3 (pane 3): Run all tests

Spawn them and monitor their progress."
```

Then Claude Code in the main pane will:
1. Use Task tool to spawn 3 agents
2. Each agent runs in background
3. Main Claude monitors and coordinates
4. You see all work happening simultaneously!

## Example Workflows

### Workflow 1: Comprehensive Testing

```bash
# Start session
vital-agents

# In main pane (Claude Code is running), type:
"Spawn 3 agents to test the application:
1. Agent for backend API testing
2. Agent for frontend UI testing
3. Agent for end-to-end workflow testing

Run them in parallel and report results."
```

**What happens:**
- Main Claude spawns 3 agents via Task tool
- Agents run in background (or you can manually assign to panes)
- All work visible across 4 panes
- Main Claude coordinates and summarizes results

### Workflow 2: Feature Development Sprint

```bash
# In main Claude:
"I need to implement the DEPLOY stage completely.
Spawn 3 agents:
1. Backend API endpoints
2. Frontend UI pages
3. Integration testing

Coordinate them to work in parallel."
```

### Workflow 3: Bug Fixing Team

```bash
# From terminal, assign specific agents:
spawn-agent 1 feature-dev:code-reviewer "Review all backend code for bugs"
spawn-agent 2 general-purpose "Fix frontend API integration issues"
spawn-agent 3 general-purpose "Update and run test suite"

# Watch all 3 agents work simultaneously in their panes
# Main pane (0) coordinates overall progress
```

## Navigation

```bash
# Move between panes to check progress
Ctrl+a h/j/k/l    # Vim-style navigation
Ctrl+a 0/1/2/3    # Jump to specific pane

# Zoom into one agent's work
Ctrl+a z          # Toggle fullscreen for current pane

# Detach and check back later
Ctrl+a d          # All agents keep working
vital-agents      # Reattach anytime
```

## Advanced: Custom Agent Layout

Edit `scripts/tmux-agent-session.sh` to change:
- Number of panes (add more agent slots)
- Pane sizes
- Auto-start specific agents
- Custom layouts (3-pane, 6-pane, etc.)

## Benefits

✅ **Visual Progress** - See all agents working simultaneously
✅ **Parallel Execution** - True concurrent work
✅ **Easy Monitoring** - Glance at any agent's progress
✅ **Persistent** - Detach/reattach without losing work
✅ **Coordinated** - Main Claude orchestrates the team

## Tips

1. **Let Main Claude Coordinate**: Don't micromanage each agent
2. **Use Zoom**: Focus on one agent with `Ctrl+a z`
3. **Check Logs**: Each pane shows real-time agent output
4. **Detach Often**: Let agents work while you do other things
5. **Scroll Back**: Use `Ctrl+a [` to review agent history

## Troubleshooting

**Agents not spawning?**
```bash
# Make sure Claude Code is installed
which claude

# Check session exists
tmux ls | grep vital
```

**Can't see all panes?**
```bash
# Maximize terminal window
# Or zoom current pane: Ctrl+a z
```

**Want more panes?**
```bash
# Split manually in any pane
Ctrl+a |    # Vertical split
Ctrl+a -    # Horizontal split
```

## Example Session

```bash
$ vital-agents

# Session starts, main Claude Code in pane 0

You (in pane 0): "Review the entire codebase and spawn 3 agents:
- Agent 1: Fix all backend issues
- Agent 2: Complete frontend pages
- Agent 3: Run comprehensive tests

Coordinate their work and report when done."

# Claude spawns agents via Task tool
# Agents work in background or assigned panes
# Watch progress across all 4 panes
# Detach with Ctrl+a d
# Come back later to see results
```

Perfect for:
- Large refactoring projects
- Comprehensive testing
- Multi-stage deployments
- Complex debugging sessions
- Feature development sprints

---

**Ready to run a parallel agent team?**

```bash
vital-agents
```
