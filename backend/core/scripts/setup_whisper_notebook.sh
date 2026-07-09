#!/usr/bin/env bash
set -euo pipefail

# Run once per fresh notebook (or whenever the disk was wiped between sessions).
# Ubuntu 22.04 / Python 3.10 / ROCm 7.2.1 / AMD Radeon Navi 3x (DID 0x744b).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# $HOME and /usr/local (system layer) are wiped on every container restart on
# this notebook — only /workspace is a persistent volume. Everything heavy
# (venv, PyTorch, model weights, cloudflared binary) lives there so it survives
# restarts and never needs re-downloading. Only the apt packages below (tmux,
# ffmpeg — seconds, not gigabytes) must be reinstalled each fresh session.
WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"
VENV_DIR="${VENV_DIR:-$WORKSPACE_DIR/whisper-venv}"
CLOUDFLARED_DIR="${CLOUDFLARED_DIR:-$WORKSPACE_DIR/bin}"
export WHISPER_CACHE_DIR="${WHISPER_CACHE_DIR:-$WORKSPACE_DIR/whisper-cache}"

echo "== System packages =="
# ffmpeg is required by openai-whisper for audio decoding, not pulled in by pip.
sudo apt-get update -y
sudo apt-get install -y ffmpeg tmux

if [ -x "$VENV_DIR/bin/python3" ]; then
    echo "== Python venv already present at $VENV_DIR — skipping create/install =="
    source "$VENV_DIR/bin/activate"
else
    echo "== Python venv: $VENV_DIR =="
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"

    # The stock pip (22.0.2) chokes on the huge torch wheel (cachecontrol/msgpack
    # "Memoryview is too large"). Upgrading pip fixes the root cause; --no-cache-dir
    # on the big installs below is a belt-and-braces backup.
    pip install --no-cache-dir --upgrade pip

    echo "== PyTorch (ROCm 7.0 nightly) =="
    # ROCm major version must match the wheel tag (rocm7.0) even though the
    # notebook runs ROCm 7.2.1 driver-side.
    pip install --no-cache-dir --pre torch \
        --index-url https://download.pytorch.org/whl/nightly/rocm7.0

    echo "== Whisper server deps =="
    pip install --no-cache-dir flask openai-whisper
fi

echo "== cloudflared binary =="
mkdir -p "$CLOUDFLARED_DIR"
export PATH="$CLOUDFLARED_DIR:$PATH"
if [ -x "$CLOUDFLARED_DIR/cloudflared" ]; then
    echo "cloudflared already present at $CLOUDFLARED_DIR — skipping download"
else
    # The notebook sits behind a MITM proxy (self-signed cert for
    # GitHub/Docker/HuggingFace egress) — curl/wget TLS verification fails
    # without --no-check-certificate.
    wget --no-check-certificate -O "$CLOUDFLARED_DIR/cloudflared" \
        https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
    chmod +x "$CLOUDFLARED_DIR/cloudflared"
fi
cloudflared --version

echo "== large-v3 model (~2.88 GB), cached at $WHISPER_CACHE_DIR =="
mkdir -p "$WHISPER_CACHE_DIR"
python3 -c "import whisper; whisper.load_model('large-v3', download_root='$WHISPER_CACHE_DIR')"

cat <<EOF

Setup done.
Venv:        $VENV_DIR
Cloudflared: $CLOUDFLARED_DIR/cloudflared
Model cache: $WHISPER_CACHE_DIR
Server:      $SCRIPT_DIR/whisper_notebook_server.py
All of the above live under $WORKSPACE_DIR, so re-running this script after a
container restart just reinstalls tmux/ffmpeg (seconds) and skips every big
download. Next step: start_whisper_notebook.sh for every session.
EOF
