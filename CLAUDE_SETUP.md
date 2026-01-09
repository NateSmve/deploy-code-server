# Claude Code CLI Setup

## Overview

The code-server Docker image includes Claude Code CLI for AI-assisted development. This document explains how to configure storage and environment variables.

## Storage Configuration

### Option 1: Railway Volume (Recommended)

Railway volumes provide persistent storage that survives container restarts.

**Setup:**
1. Go to your Railway service settings
2. Navigate to "Volumes" tab
3. Click "Add Volume"
4. Configure:
   - **Mount Path:** `/home/coder/.claude`
   - **Size:** 1GB (sufficient for conversation history)

This will persist Claude's conversation context, settings, and session data across container restarts.

### Option 2: Firestore (Alternative)

If you prefer to store Claude data in Firestore alongside other PANDA data, you would need to:
- Create a custom storage adapter
- Store conversation transcripts in a Firestore collection
- This requires additional development work

**Note:** Railway Volume is simpler and recommended for code-server use cases.

## Authentication

Claude Code CLI supports two authentication methods:

### Option 1: claude.ai Account (Recommended)

No environment variables needed! On first use, Claude CLI will:
1. Prompt you to authenticate via browser
2. Open a URL to link your claude.ai account
3. Store authentication tokens in `/home/coder/.claude`

**This is why the Railway volume is important** - it persists your authentication across container restarts.

### Option 2: API Key (Alternative)

If you prefer to use an API key instead:

```bash
ANTHROPIC_API_KEY=sk-ant-...  # Your API key from console.anthropic.com
```

Add this to Railway environment variables.

## Environment Variables

### Optional (for MCP Servers)

Some MCP servers require API keys or credentials. Add these to Railway if you want to use them:

```bash
# GitHub MCP server
GITHUB_TOKEN=ghp_...              # Personal access token for GitHub operations

# Brave Search MCP server
BRAVE_API_KEY=...                 # API key from brave.com/search/api

# Slack MCP server
SLACK_BOT_TOKEN=xoxb-...          # Slack bot token
SLACK_TEAM_ID=T...                # Slack workspace ID

# Google Drive MCP server
GOOGLE_DRIVE_CREDENTIALS=...      # OAuth credentials JSON (base64)

# PostgreSQL MCP server
DATABASE_URL=postgresql://...     # Connection string (if using external DB)
```

**Note:** These are only needed if you plan to use those specific MCP servers. Basic functionality (filesystem, memory, sequential-thinking) works without any env vars.

### System Variables

```bash
CLAUDE_DATA_DIR=/home/coder/.claude  # Already set in Dockerfile
```

## Pre-installed MCP Servers

The Docker image includes these MCP servers ready to use:

### File & Data Access
- **filesystem** - Read/write local files and directories
- **sqlite** - SQLite database operations
- **postgres** - PostgreSQL database access (for PANDA data)

### Development Tools
- **github** - GitHub API (create issues, PRs, search repos)
- **fetch** - Make HTTP requests and API calls
- **puppeteer** - Browser automation for testing

### Knowledge & Search
- **brave-search** - Web search capabilities
- **memory** - Persistent knowledge graph storage
- **sequential-thinking** - Enhanced reasoning for complex problems

### Integrations
- **slack** - Slack workspace integration
- **gdrive** - Google Drive file access

### How to Enable MCP Servers

On first use, Claude CLI will prompt you to enable MCP servers. You can also configure them manually:

1. Run `claude` in the terminal
2. When prompted about MCP servers, select which ones to enable
3. Provide any required credentials (API keys, tokens)
4. Configuration is saved in `/home/coder/.claude` (persists via volume)

## Using Claude Code CLI

Once the container is running and you're logged into code-server:

### In Terminal

```bash
# Check Claude Code is installed
claude --version

# Start a conversation
claude "Help me debug this function"

# Use with files
claude "Explain this code" -f src/app.ts

# Interactive mode
claude
```

### In VS Code

Claude Code CLI integrates with the terminal. You can:
- Run `claude` commands from the integrated terminal
- Use Claude to analyze files in your workspace
- Get help with debugging, refactoring, etc.

## First-Time Setup

After deploying:

1. Open code-server at `code.pandawsu.com`
2. Open a terminal (Terminal → New Terminal)
3. Run: `claude --version` (verify installation)
4. Run: `claude` to start first-time authentication
5. Follow the prompts to authenticate with your claude.ai account
6. Copy the URL shown and open it in your browser
7. Log in with your claude.ai credentials
8. Return to the terminal - you're now authenticated!

Your authentication will be saved in `/home/coder/.claude` and persist across restarts (thanks to the Railway volume).

## Storage Location

Claude stores data in `/home/coder/.claude/`:
- `projects/` - Project-specific conversation history
- `settings.json` - CLI configuration
- `.cache/` - Temporary cache files

When mounted to a Railway volume, this data persists across deployments.

## Troubleshooting

### "claude: command not found"

- Check that the Dockerfile build completed successfully
- Verify npm global packages are in PATH
- Try: `sudo npm install -g @anthropic/claude-code`

### "Not authenticated" or "Please log in"

- Run `claude` in the terminal to start authentication flow
- Make sure you can access the authentication URL from your browser
- If re-authenticating doesn't work, the Railway volume might not be mounted

### Authentication not persisting after restart

- **Most common issue:** Railway volume not mounted
- Go to Railway → Volumes → Verify `/home/coder/.claude` is mounted
- After adding volume, redeploy the service
- Re-authenticate one more time after the volume is mounted

### Storage not persisting

- Verify Railway volume is mounted at `/home/coder/.claude`
- Check volume size isn't full (1GB should be plenty)
- Restart the service after adding the volume
