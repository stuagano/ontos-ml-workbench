# Installed Claude Code Plugins & Resources

Installation completed on: 2026-02-06

This document describes the Claude Code plugins and resources installed to improve the Mirion VITAL Workbench project structure.

---

## ✅ Installed Resources

### 1. CLAUDE.md Templates Foundation

**Purpose**: Modular documentation structure for better organization
**Location**: `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `.claude/local.md`

**What it does**:
- Provides module-specific guidance for backend (FastAPI) and frontend (React)
- Separates personal preferences (local.md) from team conventions
- Reduces context confusion by keeping instructions focused

**Usage**:
- Edit `backend/CLAUDE.md` for backend-specific patterns
- Edit `frontend/CLAUDE.md` for frontend-specific patterns
- Edit `.claude/local.md` for your personal workflow preferences (gitignored)

**Reference**: [abhishekray07/claude-md-templates](https://github.com/abhishekray07/claude-md-templates)

---

### 2. Everything Claude Code

**Purpose**: Battle-tested agents, skills, and commands for full-stack development
**Location**: `~/.claude/plugins/everything-claude-code`, `~/.claude/rules/`

**What it does**:
- 15+ specialized agents (Doc-Updater, code-review, multi-service orchestration)
- 30+ skills for production-grade development
- 30+ commands for common workflows
- Rules for Python, TypeScript, and common patterns

**Key Commands**:
```bash
/plan "Add user authentication"        # Implementation planning
/tdd "Create login endpoint"           # Test-driven development
/code-review                           # Quality assessment
/multi-plan "Update both backend + frontend"  # Multi-service orchestration
```

**Reference**: [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)

---

### 3. Full-Stack Development Skills

**Purpose**: 65 specialized skills for FastAPI + React development
**Location**: `~/.claude/plugins/fullstack-dev-skills`

**What it does**:
- FastAPI/Python backend expertise
- React/TypeScript frontend patterns
- Test Master skill for comprehensive testing
- Jira/Confluence integration workflows
- Context engineering via `/common-ground`

**Key Skills**:
- Auto-activates based on project context
- 359 reference files for deep documentation
- Progressive disclosure patterns

**Reference**: [jeffallan/claude-skills](https://github.com/jeffallan/claude-skills)

---

### 4. TypeScript Quality Hooks

**Purpose**: Real-time code quality checks for React frontend
**Location**: `.claude/hooks/react-app/`
**Configuration**: `.claude/settings.local.json` (already configured)

**What it does**:
- Runs ESLint validation after Write/Edit/MultiEdit operations
- Auto-fixes trivial issues with Prettier
- Catches TypeScript errors before runtime
- Project-aware rules for React apps
- Smart caching (~95% faster on repeated runs)

**How it works**:
- Automatically runs when you edit frontend files
- Provides immediate feedback in Claude Code
- No manual linting commands needed

**Configuration location**: `.claude/settings.local.json` → `hooks.PostToolUse`

**Reference**: [bartolli/claude-code-typescript-hooks](https://github.com/bartolli/claude-code-typescript-hooks)

---

### 5. CCPM (Claude Code Project Management)

**Purpose**: Spec-driven development with GitHub integration
**Location**: `.claude/ccpm/`

**What it does**:
- Break epics into parallelizable tasks
- GitHub issue integration with full traceability
- Multiple agents working simultaneously
- Task decomposition and workflow management
- Perfect for coordinating backend + frontend work

**Key Commands**:
```bash
/pm:init                              # Initialize CCPM (first-time setup)
/pm:prd-new memory-system             # Create PRD through brainstorming
/pm:prd-parse memory-system           # Convert PRD to epic
/pm:epic-decompose memory-system      # Break into tasks
/pm:epic-sync memory-system           # Push to GitHub
/pm:issue-start 1235                  # Launch agent for issue
/pm:next                              # Get next priority task
/pm:status                            # Project dashboard
```

**Setup Required**:
1. Run `/pm:init` to configure GitHub integration
2. Set up GitHub token if using issue sync
3. Read `.claude/ccpm/ccpm.config` for configuration options

**Reference**: [automazeio/ccpm](https://github.com/automazeio/ccpm)

---

## ⚠️ Not Installed

### Documentation Plugin
**Status**: Repository uses git submodules that weren't properly initialized
**Workaround**: Use Everything Claude Code's documentation commands instead

**Alternative**: Consider using `/plan` and `/multi-plan` commands from Everything Claude Code for documentation management

---

## 📚 How to Use These Resources

### For Daily Development

1. **Start a feature**:
   ```bash
   /pm:prd-new <feature-name>  # Create PRD
   /plan "implement <feature>"  # Get implementation plan
   ```

2. **Write code**:
   - TypeScript hooks automatically validate as you edit
   - Module-specific CLAUDE.md files provide context
   - Use `/tdd` for test-driven development

3. **Review and improve**:
   ```bash
   /code-review                 # Quality check
   /pm:status                   # Track progress
   ```

### For Managing Your 60+ Markdown Files

**Recommendation**: Move most of your root-level markdown files into organized directories:

```
docs/
├── design/          # CANONICAL_LABELS_DESIGN.md, WORKFLOW_DESIGN.md, etc.
├── implementation/  # *_IMPLEMENTATION*.md files
├── status/          # *_STATUS.md, *_COMPLETE.md files
└── validation/      # *_VALIDATION*.md files
```

**Why?**
- Module-specific CLAUDE.md files can reference specific docs
- Easier for agents to navigate focused directories
- Reduces root directory clutter

### For Backend Development

Navigate to `backend/` and Claude Code will prioritize `backend/CLAUDE.md` for context:
```bash
cd backend
# Now Claude uses backend-specific patterns
```

### For Frontend Development

Navigate to `frontend/` and Claude Code will prioritize `frontend/CLAUDE.md`:
```bash
cd frontend
# Now Claude uses frontend-specific patterns
```

---

## 🔧 Configuration Files Updated

1. `.claude/local.md` - Personal workflow preferences (gitignored)
2. `.claude/settings.local.json` - Added PostToolUse hooks for TypeScript quality
3. `.gitignore` - Added `.claude/local.md`
4. `backend/CLAUDE.md` - Backend-specific guidance
5. `frontend/CLAUDE.md` - Frontend-specific guidance

---

## 🚀 Next Steps

### Immediate Actions

1. **Initialize CCPM** (if using GitHub integration):
   ```bash
   /pm:init
   ```

2. **Test TypeScript hooks**:
   - Edit a TypeScript file in `frontend/`
   - Save and check for automatic validation feedback

3. **Organize documentation**:
   - Create `docs/` subdirectories
   - Move root-level markdown files into appropriate categories
   - Update references in main CLAUDE.md

### Optional Enhancements

1. **Add custom rules**:
   - Create `~/.claude/rules/databricks.md` for Databricks-specific patterns
   - Create `~/.claude/rules/mirion-domain.md` for radiation safety terminology

2. **Configure CCPM for your workflow**:
   - Edit `.claude/ccpm/ccpm.config` to match your GitHub setup
   - Set up project-specific task templates

3. **Explore additional commands**:
   ```bash
   /help                        # See all available commands
   /plugin list                 # List installed plugins
   ```

---

## 📖 Additional Resources

- [Claude Code Official Docs](https://docs.anthropic.com/en/docs/claude-code)
- [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code)
- [Everything Claude Code Guides](https://github.com/affaan-m/everything-claude-code)
- [CCPM Documentation](https://github.com/automazeio/ccpm)

---

## 🐛 Troubleshooting

### Hooks not running?
- Check `.claude/settings.local.json` has correct hook configuration
- Ensure Node.js is installed (`node --version`)
- Verify hook files exist: `ls .claude/hooks/react-app/`

### Commands not working?
- Restart Claude Code session
- Run `/plugin list` to verify plugins are loaded
- Check for plugin errors in Claude Code output

### Need help?
- Run `/help` for command reference
- Check plugin README files in `~/.claude/plugins/`
- Reference the documentation links above

---

**Installation completed successfully! Start using these tools to improve your development workflow.**
