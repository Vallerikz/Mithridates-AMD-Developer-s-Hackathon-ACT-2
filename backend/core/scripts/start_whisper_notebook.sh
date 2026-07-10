#!/usr/bin/env bash
set -euo pipefail

# Daily driver: (re)starts the Whisper server + a cloudflared quick tunnel in
# a detached tmux session so both survive an SSH disconnect. Run
# setup_whisper_notebook.sh once beforehand.
#
# Quick tunnel (no account, no DNS) prints a random https://xxxx.trycloudflare.com
# URL on every start — read it from the "tunnel" tmux window and copy it into
# WHISPER_ENDPOINT_URL (+ "/transcribe") in the Mac's .env.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Must match setup_whisper_notebook.sh's persistent paths under /workspace.
WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"
VENV_DIR="${VENV_DIR:-$WORKSPACE_DIR/whisper-venv}"
CLOUDFLARED_DIR="${CLOUDFLARED_DIR:-$WORKSPACE_DIR/bin}"
export WHISPER_CACHE_DIR="${WHISPER_CACHE_DIR:-$WORKSPACE_DIR/whisper-cache}"
SESSION="${SESSION:-whisper}"

SERVER_CMD="source '$VENV_DIR/bin/activate' && WHISPER_CACHE_DIR='$WHISPER_CACHE_DIR' python3 '$SCRIPT_DIR/whisper_notebook_server.py'"

if tmux has-session -t "$SESSION" 2>/dev/null; then
    # Reload the server with the freshly pulled code, but leave the tunnel
    # window alone — killing cloudflared would change the public URL and force
    # a WHISPER_ENDPOINT_URL update on the Mac.
    echo "tmux session '$SESSION' already running — reloading server window (tunnel untouched, URL unchanged)"
    tmux respawn-window -k -t "$SESSION:server" "$SERVER_CMD"
    echo "Server restarting; model reload takes ~1 min before /transcribe answers again."
    exit 0
fi

tmux new-session -d -s "$SESSION" -n server "$SERVER_CMD"

tmux new-window -t "$SESSION" -n tunnel \
    "PATH='$CLOUDFLARED_DIR:\$PATH' cloudflared tunnel --url http://localhost:8001"

echo "Started. tmux attach -t $SESSION   (windows: server, tunnel)"
echo "Grab the https://xxxx.trycloudflare.com URL from the 'tunnel' window."
echo "Detach with Ctrl-b d without killing anything."
