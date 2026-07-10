#!/usr/bin/env bash
set -euo pipefail

# Single entry point for every notebook session (fresh container or resumed).
# Chains: git pull (script updates) -> setup (idempotent, skips big downloads
# once cached under /workspace) -> start (tmux server + tunnel).
#
# One-time setup on a new notebook (survives forever, since /workspace persists):
#   cat > /workspace/start <<'EOF'
#   #!/usr/bin/env bash
#   exec bash /workspace/Mithridates-AMD-Developer-s-Hackathon-ACT-2/backend/core/scripts/notebook_boot.sh
#   EOF
#   chmod +x /workspace/start
#
# Every session after that: just run /workspace/start

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "== Sync scripts from GitHub =="
# This notebook sits behind a MITM proxy with a self-signed cert, which breaks
# git's TLS verification the same way it breaks wget/curl — bypass it here so
# nobody has to remember the flag.
git -C "$REPO_DIR" -c http.sslVerify=false pull --ff-only

bash "$SCRIPT_DIR/setup_whisper_notebook.sh"
bash "$SCRIPT_DIR/start_whisper_notebook.sh"
