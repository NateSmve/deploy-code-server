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

## Environment Variables

Add these to your Railway service:

### Required

```bash
ANTHROPIC_API_KEY=sk-ant-...  # Your Claude API key from console.anthropic.com
```

### Optional

```bash
CLAUDE_DATA_DIR=/home/coder/.claude  # Already set in Dockerfile
```

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

## Verifying Installation

After deploying:

1. Open code-server at `code.pandawsu.com`
2. Open a terminal (Terminal → New Terminal)
3. Run: `claude --version`
4. You should see the Claude Code CLI version

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

### "Authentication failed"

- Verify `ANTHROPIC_API_KEY` is set in Railway environment variables
- Check the API key is valid at console.anthropic.com

### Storage not persisting

- Verify Railway volume is mounted at `/home/coder/.claude`
- Check volume size isn't full
- Restart the service after adding the volume
