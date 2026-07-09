#!/usr/bin/env bash
set -euo pipefail

# Points the backend at a new Whisper tunnel URL in one step. Run this on the
# Mac each time cloudflared prints a fresh https://xxxx.trycloudflare.com URL
# (the quick tunnel changes URL on every notebook restart):
#
#   backend/core/scripts/set_whisper_url.sh https://xxxx.trycloudflare.com
#
# It rewrites WHISPER_ENDPOINT_URL in backend/.env, probes the endpoint, and
# recreates the backend container. "docker compose restart" is NOT enough —
# env_file values are baked in at container creation, so we need "up -d".

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$REPO_DIR/backend/.env"

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 https://xxxx.trycloudflare.com" >&2
    exit 1
fi

# Accept the URL with or without the /transcribe suffix or a trailing slash.
BASE_URL="${1%/}"
BASE_URL="${BASE_URL%/transcribe}"
if [[ ! "$BASE_URL" =~ ^https://[a-z0-9-]+\.trycloudflare\.com$ ]]; then
    echo "Doesn't look like a quick-tunnel URL: $1" >&2
    exit 1
fi
ENDPOINT="$BASE_URL/transcribe"

echo "== Probing $ENDPOINT =="
# GET on a POST-only route answers 405 — anything else means the tunnel or the
# server behind it isn't up (cloudflared returns 530 when the origin is down).
STATUS="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$ENDPOINT")"
if [[ "$STATUS" != "405" ]]; then
    echo "Expected HTTP 405 from the Whisper server, got $STATUS — not switching." >&2
    exit 1
fi
echo "Whisper server is answering."

sed -i '' "s|^WHISPER_ENDPOINT_URL=.*|WHISPER_ENDPOINT_URL=$ENDPOINT|" "$ENV_FILE"
echo "== Updated WHISPER_ENDPOINT_URL in backend/.env =="

echo "== Recreating backend container =="
docker compose -f "$REPO_DIR/docker-compose.yml" up -d backend

echo "Done. Backend now targets $ENDPOINT"
