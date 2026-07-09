#!/usr/bin/env bash
set -euo pipefail

# Run once per fresh notebook (or whenever the disk was wiped between sessions).
# Ubuntu 22.04 / Python 3.10 / ROCm 7.2.1 / AMD Radeon Navi 3x (DID 0x744b).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${VENV_DIR:-$HOME/whisper-venv}"

echo "== System packages =="
# ffmpeg is required by openai-whisper for audio decoding, not pulled in by pip.
sudo apt-get update -y
sudo apt-get install -y ffmpeg tmux

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

echo "== cloudflared binary =="
if ! command -v cloudflared >/dev/null 2>&1; then
    # The notebook sits behind a MITM proxy (self-signed cert for
    # GitHub/Docker/HuggingFace egress) — curl/wget TLS verification fails
    # without --no-check-certificate.
    wget --no-check-certificate -O /tmp/cloudflared \
        https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
    chmod +x /tmp/cloudflared
    sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
fi
cloudflared --version

echo "== Pre-downloading large-v3 model (~2.88 GB) =="
python3 -c "import whisper; whisper.load_model('large-v3')"

cat <<EOF

Setup done.
Venv:      $VENV_DIR
Server:    $SCRIPT_DIR/whisper_notebook_server.py
Next step: start_whisper_notebook.sh for every session (uses a cloudflared
           quick tunnel — no extra setup needed).
EOF
