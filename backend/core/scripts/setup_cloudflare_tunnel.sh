#!/usr/bin/env bash
set -euo pipefail

# One-time setup for a NAMED cloudflared tunnel, so the public URL stays fixed
# across notebook restarts instead of getting a random *.trycloudflare.com
# hostname each time (the "quick tunnel" mode).
#
# Prerequisite: TUNNEL_HOSTNAME's root domain must have its DNS delegated to
# Cloudflare (nameservers pointed at Cloudflare, zone added to the account).
# This has NOT been confirmed for bearndigital.com (it's hosted on O2Switch —
# O2Switch DNS and Cloudflare DNS are not the same thing). Check the
# Cloudflare dashboard for the zone before running this, or use a domain/
# subdomain you know is already on Cloudflare.

TUNNEL_NAME="${TUNNEL_NAME:-whisper-notebook}"
TUNNEL_HOSTNAME="${TUNNEL_HOSTNAME:-whisper.CHANGEME.example}"
CONFIG_DIR="$HOME/.cloudflared"

echo "== cloudflared login (opens a browser link — pick the zone to authorize) =="
cloudflared tunnel login

echo "== Create named tunnel: $TUNNEL_NAME =="
cloudflared tunnel create "$TUNNEL_NAME"

CRED_FILE=$(find "$CONFIG_DIR" -maxdepth 1 -name '*.json' -newer "$CONFIG_DIR/cert.pem" | head -n1)
if [ -z "$CRED_FILE" ]; then
    echo "Could not locate the credentials JSON in $CONFIG_DIR — check 'cloudflared tunnel list' output above." >&2
    exit 1
fi

echo "== Writing $CONFIG_DIR/config.yml =="
cat > "$CONFIG_DIR/config.yml" <<EOF
tunnel: $TUNNEL_NAME
credentials-file: $CRED_FILE

ingress:
  - hostname: $TUNNEL_HOSTNAME
    service: http://localhost:8001
  - service: http_status:404
EOF

echo "== Routing DNS: $TUNNEL_HOSTNAME -> $TUNNEL_NAME =="
cloudflared tunnel route dns "$TUNNEL_NAME" "$TUNNEL_HOSTNAME"

cat <<EOF

Done. Fixed public URL: https://$TUNNEL_HOSTNAME
Credentials + config now live in $CONFIG_DIR — back them up if the notebook
disk gets wiped, otherwise this whole script must be re-run (and the
hostname's DNS record recreated).

Start it with: start_whisper_notebook.sh
EOF
