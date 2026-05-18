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
        "${dir}/root/usr/sbin" \
        "${dir}/htdocs/luci-static/resources/view/rm520n"

    for f in \
        root/usr/libexec/rpcd/rm520n \
        root/usr/share/luci/menu.d/rm520n.json \
        root/usr/share/rpcd/acl.d/rm520n.json \
        root/usr/sbin/rm520n-watchdog \
        htdocs/luci-static/resources/view/rm520n/overview.js \
        htdocs/luci-static/resources/view/rm520n/tools.js \
        htdocs/luci-static/resources/view/rm520n/settings.js
    do
        wget -qO "${dir}/${f}" "${base}/${f}" || { printf 'ERROR: failed to download %s\n' "$f" >&2; exit 1; }
        printf '  Downloaded: %s\n' "$f"
    done
}

_cp() {
    local mode="$1" src="$2" dst="$3"
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    chmod "$mode" "$dst"
}

_install_files() {
    local src="$1"

    printf '[INFO] Installing rpcd backend...\n'
    _cp 755 "${src}/root/usr/libexec/rpcd/rm520n" \
        /usr/libexec/rpcd/rm520n

    printf '[INFO] Installing LuCI menu entry...\n'
    _cp 644 "${src}/root/usr/share/luci/menu.d/rm520n.json" \
        /usr/share/luci/menu.d/rm520n.json

    printf '[INFO] Installing rpcd ACL...\n'
    _cp 644 "${src}/root/usr/share/rpcd/acl.d/rm520n.json" \
        /usr/share/rpcd/acl.d/rm520n.json

    printf '[INFO] Installing LuCI views...\n'
    _cp 644 "${src}/htdocs/luci-static/resources/view/rm520n/overview.js" \
        /www/luci-static/resources/view/rm520n/overview.js
    _cp 644 "${src}/htdocs/luci-static/resources/view/rm520n/tools.js" \
        /www/luci-static/resources/view/rm520n/tools.js
    _cp 644 "${src}/htdocs/luci-static/resources/view/rm520n/settings.js" \
        /www/luci-static/resources/view/rm520n/settings.js

    printf '[INFO] Installing watchdog script...\n'
    _cp 755 "${src}/root/usr/sbin/rm520n-watchdog" \
        /usr/sbin/rm520n-watchdog

    if [ ! -f /etc/config/rm520n ]; then
        printf '[INFO] Creating default UCI config...\n'
        printf 'config watchdog '"'"'watchdog'"'"'\n\toption enabled '"'"'0'"'"'\n\toption ping_host '"'"'8.8.8.8'"'"'\n\toption fail_threshold '"'"'3'"'"'\n\toption action '"'"'reconnect'"'"'\n' \
            > /etc/config/rm520n
    fi
}

_ensure_deps() {
    command -v stty >/dev/null 2>&1 && return 0
    printf '[INFO] stty not found — installing coreutils-stty (required for AT port)...\n'
    if command -v apk >/dev/null 2>&1; then
        apk add coreutils-stty || { printf 'ERROR: failed to install coreutils-stty\n' >&2; exit 1; }
    elif command -v opkg >/dev/null 2>&1; then
        opkg install coreutils-stty || { printf 'ERROR: failed to install coreutils-stty\n' >&2; exit 1; }
    else
        printf 'ERROR: stty not found and no package manager available\n' >&2; exit 1
    fi
}

main() {
    printf '\n[luci-app-rm520n] Installing RM520NGL LuCI panel\n\n'

    [ "$(id -u)" -eq 0 ] || { printf 'ERROR: run as root\n' >&2; exit 1; }

    _ensure_deps

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
