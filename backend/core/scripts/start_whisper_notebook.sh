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
VENV_DIR="${VENV_DIR:-$HOME/whisper-venv}"
SESSION="${SESSION:-whisper}"

if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "tmux session '$SESSION' already running — attach with: tmux attach -t $SESSION"
    exit 0
fi

tmux new-session -d -s "$SESSION" -n server \
    "source '$VENV_DIR/bin/activate' && python3 '$SCRIPT_DIR/whisper_notebook_server.py'"

tmux new-window -t "$SESSION" -n tunnel \
    "cloudflared tunnel --url http://localhost:8001"

echo "Started. tmux attach -t $SESSION   (windows: server, tunnel)"
echo "Grab the https://xxxx.trycloudflare.com URL from the 'tunnel' window."
echo "Detach with Ctrl-b d without killing anything."
