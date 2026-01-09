# Start from the code-server Debian base image
FROM codercom/code-server:latest

USER root

# Install system dependencies + Node.js 20
RUN apt-get update && apt-get install -y \
    unzip \
    git \
    curl \
    wget \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

# Install rclone (support for remote filesystem)
RUN curl https://rclone.org/install.sh | bash

USER coder

# Apply VS Code settings
COPY deploy-container/settings.json .local/share/code-server/User/settings.json

# Use bash shell
ENV SHELL=/bin/bash

# Copy rclone tasks to /tmp, to potentially be used
COPY deploy-container/rclone-tasks.json /tmp/rclone-tasks.json

# Fix permissions for code-server
RUN sudo chown -R coder:coder /home/coder/.local

# =========== PANDA PROJECT CUSTOMIZATIONS ===========

# Install VS Code extensions
RUN code-server --install-extension dbaeumer.vscode-eslint \
    && code-server --install-extension esbenp.prettier-vscode \
    && code-server --install-extension bradlc.vscode-tailwindcss \
    && code-server --install-extension dsznajder.es7-react-js-snippets \
    && code-server --install-extension formulahendry.auto-rename-tag \
    && code-server --install-extension eamodio.gitlens \
    && code-server --install-extension mhutchie.git-graph \
    && code-server --install-extension christian-kohler.path-intellisense \
    && code-server --install-extension usernamehw.errorlens \
    && code-server --install-extension PKief.material-icon-theme \
    && code-server --install-extension zhuangtongfa.material-theme \
    && code-server --install-extension yzhang.markdown-all-in-one \
    && code-server --install-extension ms-azuretools.vscode-docker

# =========== CLAUDE CODE CLI ===========

# Install Claude Code CLI globally
RUN sudo npm install -g @anthropic/claude-code

# Create directory for Claude storage (can be mounted to Railway volume)
RUN mkdir -p /home/coder/.claude && sudo chown -R coder:coder /home/coder/.claude

# Environment variable for Claude storage path (Railway volume can mount here)
ENV CLAUDE_DATA_DIR=/home/coder/.claude

# =========== AUTH PROXY ===========

# Copy and install auth proxy
COPY --chown=coder:coder auth-proxy /home/coder/auth-proxy
WORKDIR /home/coder/auth-proxy
RUN npm install --production

WORKDIR /home/coder

# Environment variables for auth proxy
ENV LOGIN_URL=https://manage.pandawsu.com/login
ENV CODE_SERVER_INTERNAL_URL=http://localhost:8081

# ===========

# Port
ENV PORT=8080

# Use our custom entrypoint script first
COPY deploy-container/entrypoint.sh /usr/bin/deploy-container-entrypoint.sh
ENTRYPOINT ["/usr/bin/deploy-container-entrypoint.sh"]
