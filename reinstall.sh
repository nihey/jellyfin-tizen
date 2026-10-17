#!/usr/bin/env bash
set -euo pipefail

# AT Flix Reinstall Script
# Automatically builds, packages, and reinstalls AT Flix on your Samsung TV
# Requires: Tizen Studio CLI installed at ~/tizen-studio, TV in Developer Mode

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
TV_TARGET="QN55Q70AAGXZD"
APP_ID="AprZAARz4r.Jellyfin"
SECURITY_PROFILE="apps2samsung"
TIZEN_STUDIO_DIR="$HOME/tizen-studio"
TIZEN_TOOLS_DIR="$TIZEN_STUDIO_DIR/tools"
TIZEN_IDE_DIR="$TIZEN_TOOLS_DIR/ide/bin"

# Export PATH for tizen CLI
export PATH="$TIZEN_TOOLS_DIR:$TIZEN_IDE_DIR:$PATH"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prereqs() {
    log_info "Checking prerequisites..."

    if ! command -v tizen &> /dev/null; then
        log_error "tizen command not found. Expected at: $TIZEN_IDE_DIR/tizen"
        log_info "Make sure Tizen Studio CLI is installed at ~/tizen-studio"
        exit 1
    fi

    if ! command -v sdb &> /dev/null; then
        log_error "sdb command not found. Expected at: $TIZEN_TOOLS_DIR/sdb"
        exit 1
    fi

    if [ ! -f "$SCRIPT_DIR/package.json" ]; then
        log_error "package.json not found. Are you in the right directory?"
        exit 1
    fi

    log_success "Prerequisites OK"
}

# Ensure TV is connected
connect_tv() {
    log_info "Connecting to TV ($TV_TARGET)..."

    # Try to get TV IP from sdb devices
    TV_IP=$(sdb devices | grep "device" | awk '{print $1}' | head -n 1)
    if [ -z "$TV_IP" ]; then
        log_warn "TV not connected via sdb. Trying to auto-discover..."

        # Scan local network for TVs with SDB port open
        GATEWAY=$(ip route show | grep "default" | awk '{print $3}' | head -n 1)
        if [ -z "$GATEWAY" ]; then
            log_error "Could not determine network gateway"
            exit 1
        fi

        NETWORK_PREFIX=$(echo "$GATEWAY" | sed 's/\.[0-9]*$//')
        log_info "Scanning ${NETWORK_PREFIX}.0/24 for Samsung TVs..."

        for i in $(seq 1 254); do
            (timeout 1 bash -c "<\/dev/tcp/${NETWORK_PREFIX}.$i/26101" 2>/dev/null && echo "${NETWORK_PREFIX}.$i") &
        done
        wait | grep -v "^$" | head -n 1 > /tmp/atflix_tv_ip.txt

        TV_IP=$(cat /tmp/atflix_tv_ip.txt 2>/dev/null || true)
        if [ -z "$TV_IP" ]; then
            log_error "Could not find Samsung TV on the network."
            log_info "Make sure your TV is:"
            log_info "  1. Turned on"
            log_info "  2. On the same Wi-Fi network as this computer"
            log_info "  3. In Developer Mode (Settings > Developer Mode)"
            log_info "  4. Has 'Developer Mode' set to ON and you have restarted the TV"
            exit 1
        fi

        log_info "Found TV at $TV_IP, connecting via sdb..."
        sdb connect "$TV_IP" || {
            log_error "Failed to connect to TV at $TV_IP"
            exit 1
        }
    fi

    # Verify connection
    DEVICE_NAME=$(sdb devices | grep "device" | awk '{print $3}' | head -n 1)
    if [ -z "$DEVICE_NAME" ]; then
        log_error "TV connected but no device info available"
        exit 1
    fi

    log_success "Connected to TV: $DEVICE_NAME ($TV_IP)"
}

# Build the web assets
build_web() {
    log_info "Building web assets..."
    npm run build
    log_success "Web assets built"
}

# Build the Tizen package
build_tizen() {
    log_info "Building Tizen web package..."
    tizen build-web -e ".*" -e gulpfile.babel.js -e README.md -e "node_modules/*" -e "package*.json" -e "yarn.lock"
    log_success "Tizen web package built"
}

# Package as WGT
package_wgt() {
    log_info "Packaging as WGT with profile '$SECURITY_PROFILE'..."
    tizen package -t wgt -s "$SECURITY_PROFILE" -o . -- .buildResult
    log_success "WGT package created: ATFlix.wgt"
}

# Uninstall old app
uninstall_old() {
    log_info "Uninstalling old app ($APP_ID)..."
    if tizen uninstall -t "$TV_TARGET" -p "$APP_ID" 2>/dev/null; then
        log_success "Old app uninstalled"
    else
        log_warn "Old app was not installed (or uninstall failed) — continuing anyway"
    fi
}

# Install new app
install_new() {
    log_info "Installing AT Flix on your Samsung TV..."
    if tizen install -n ATFlix.wgt -t "$TV_TARGET"; then
        log_success "AT Flix installed successfully!"
    else
        log_error "Installation failed"
        log_info "Common fixes:"
        log_info "  - Make sure Developer Mode is ON on the TV"
        log_info "  - Restart the TV and try again"
        log_info "  - Check that the TV and this computer are on the same network"
        exit 1
    fi
}

# Main flow
main() {
    echo "========================================"
    echo "  AT Flix — Samsung TV Installer"
    echo "========================================"
    echo ""

    check_prereqs
    connect_tv
    build_web
    build_tizen
    package_wgt
    uninstall_old
    install_new

    echo ""
    echo "========================================"
    echo -e "  ${GREEN}Done! AT Flix is ready on your TV.${NC}"
    echo "========================================"
    echo ""
    echo "  Press the '*' (star) key on your remote"
    echo "  to toggle the debug overlay."
    echo ""
}

main "$@"
