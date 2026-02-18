#!/bin/bash
# Generate app icon assets from SVG sources using sharp-cli
# Run from: mobile/ directory
# Requires: npx sharp-cli

set -e

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSETS_DIR="$SCRIPTS_DIR/../assets"

echo "=== Generating App Assets ==="

# 1. App Icon (1024x1024 — used by iOS App Store + Expo)
echo "→ Generating icon.png (1024x1024)..."
npx sharp-cli -i "$SCRIPTS_DIR/icon-source.svg" -o "$ASSETS_DIR/icon.png" resize 1024 1024

# 2. Android Adaptive Icon Foreground (1024x1024 with safe zone)
echo "→ Generating adaptive-icon.png (1024x1024)..."
npx sharp-cli -i "$SCRIPTS_DIR/adaptive-icon-foreground.svg" -o "$ASSETS_DIR/adaptive-icon.png" resize 1024 1024

# 3. Splash Icon (200x200 — centered logo on splash screen)
echo "→ Generating splash-icon.png (200x200)..."
npx sharp-cli -i "$SCRIPTS_DIR/splash-icon.svg" -o "$ASSETS_DIR/splash-icon.png" resize 200 200

# 4. Favicon (48x48 — for web)
echo "→ Generating favicon.png (48x48)..."
npx sharp-cli -i "$SCRIPTS_DIR/icon-source.svg" -o "$ASSETS_DIR/favicon.png" resize 48 48

# 5. Notification Icon (96x96 — Android notification)
echo "→ Generating notification-icon.png (96x96)..."
npx sharp-cli -i "$SCRIPTS_DIR/splash-icon.svg" -o "$ASSETS_DIR/notification-icon.png" resize 96 96

echo ""
echo "=== Assets Generated ==="
ls -la "$ASSETS_DIR"/*.png
