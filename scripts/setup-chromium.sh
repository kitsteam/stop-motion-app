#!/usr/bin/env bash
set -euo pipefail

if command -v chromium >/dev/null 2>&1; then
    echo "[setup-chromium] Chromium already installed at $(command -v chromium)."
else
    echo "[setup-chromium] Installing Chromium via apt-get..."
    sudo apt-get update
    DEBIAN_FRONTEND=noninteractive sudo apt-get install -y chromium
fi

CHROMIUM_PATH=$(command -v chromium || true)

if [[ -z "$CHROMIUM_PATH" ]]; then
    echo "[setup-chromium] Installation finished but chromium not found in PATH."
    exit 1
fi

echo "[setup-chromium] Chromium available at $CHROMIUM_PATH"
echo "[setup-chromium] Export CHROMIUM_BIN to reuse in Karma:"
echo "  export CHROMIUM_BIN=$CHROMIUM_PATH"
