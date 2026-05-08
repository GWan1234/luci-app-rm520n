#!/bin/sh
# luci-app-rm520n — direct installer for OpenWrt 25.12
# Copies files directly to the router filesystem (no build system needed).
#
# Usage (local):  sh install.sh
# Usage (remote): curl -fsSL https://raw.githubusercontent.com/pajus1337/luci-app-rm520n/main/install.sh | sh

set -e

REPO_URL="https://raw.githubusercontent.com/pajus1337/luci-app-rm520n/main"
INSTALL_DIR=""
REMOTE_MODE=0

_detect_dir() {
    case "$0" in
        *install.sh)
            local d
            d="$(cd "$(dirname "$0")" 2>/dev/null && pwd -P)"
            [ -f "${d}/Makefile" ] && printf '%s' "$d" && return 0
            ;;
    esac
    printf ''
}

INSTALL_DIR="$(_detect_dir)"
if [ -z "$INSTALL_DIR" ]; then
    REMOTE_MODE=1
    INSTALL_DIR="/tmp/luci-app-rm520n-$$"
    mkdir -p "$INSTALL_DIR"
fi

_download() {
    local base="$1" dir="$2"
    mkdir -p \
        "${dir}/root/usr/libexec/rpcd" \
        "${dir}/root/usr/share/luci/menu.d" \
        "${dir}/root/usr/share/rpcd/acl.d" \
        "${dir}/htdocs/luci-static/resources/view/rm520n"

    for f in \
        root/usr/libexec/rpcd/rm520n \
        root/usr/share/luci/menu.d/rm520n.json \
        root/usr/share/rpcd/acl.d/rm520n.json \
        htdocs/luci-static/resources/view/rm520n/overview.js
    do
        wget -qO "${dir}/${f}" "${base}/${f}" || { printf 'ERROR: failed to download %s\n' "$f" >&2; exit 1; }
        printf '  Downloaded: %s\n' "$f"
    done
}

_install_files() {
    local src="$1"

    printf '[INFO] Installing rpcd backend...\n'
    install -Dm755 "${src}/root/usr/libexec/rpcd/rm520n" \
        /usr/libexec/rpcd/rm520n

    printf '[INFO] Installing LuCI menu entry...\n'
    install -Dm644 "${src}/root/usr/share/luci/menu.d/rm520n.json" \
        /usr/share/luci/menu.d/rm520n.json

    printf '[INFO] Installing rpcd ACL...\n'
    install -Dm644 "${src}/root/usr/share/rpcd/acl.d/rm520n.json" \
        /usr/share/rpcd/acl.d/rm520n.json

    printf '[INFO] Installing LuCI view...\n'
    install -Dm644 "${src}/htdocs/luci-static/resources/view/rm520n/overview.js" \
        /www/luci-static/resources/view/rm520n/overview.js
}

main() {
    printf '\n[luci-app-rm520n] Installing RM520NGL LuCI panel\n\n'

    [ "$(id -u)" -eq 0 ] || { printf 'ERROR: run as root\n' >&2; exit 1; }

    if [ "$REMOTE_MODE" = "1" ]; then
        printf '[INFO] Downloading files from GitHub...\n'
        _download "$REPO_URL" "$INSTALL_DIR"
    fi

    _install_files "$INSTALL_DIR"

    printf '[INFO] Reloading rpcd...\n'
    /etc/init.d/rpcd reload 2>/dev/null || true

    printf '[INFO] Clearing LuCI cache...\n'
    rm -rf /tmp/luci-indexcache /tmp/luci-modulecache 2>/dev/null || true

    [ "$REMOTE_MODE" = "1" ] && rm -rf "$INSTALL_DIR"

    printf '\n[OK] Installation complete.\n'
    printf '     Open LuCI → Network → 5G Modem (RM520N)\n\n'
}

main "$@"
