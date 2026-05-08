# luci-app-rm520n

> LuCI web panel for **Quectel RM520NGL 5G modem** management on OpenWrt 25.12.
> Provides real-time signal monitoring, band locking, APN configuration, and modem diagnostics — directly in your router's web interface.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![OpenWrt](https://img.shields.io/badge/OpenWrt-25.12-blue.svg)](https://openwrt.org)

---

## Overview

When the RM520NGL modem operates in **PCIe/GbE mode** (via the Waveshare carrier board), OpenWrt treats the connection as a plain Ethernet WAN — the modem is invisible to LuCI. This app fills that gap by communicating with the modem directly over its **USB AT command port** (`/dev/ttyUSB2`) and exposing a rich management panel in the LuCI web interface.

**Companion project:** [gl-mt6000-rm520n-auto-config](https://github.com/pajus1337/gl-mt6000-rm520n-auto-config) — the installer that sets up the GbE data path this app is designed to complement.

---

## Features

- **Signal dashboard** — RSRP bar chart with colour coding (green/orange/red), RSSI, SINR, RSRQ
- **Technology badge** — live indicator: `LTE`, `5G NR-NSA`, `5G NR-SA`
- **Modem info** — firmware version, IMEI, LTE and 5G NR registration status
- **Serving cell details** — raw `AT+QENG="servingcell"` output (band, EARFCN, Cell ID)
- **Band locking** — set LTE and 5G NR band masks via `AT+QNWPREFCFG`
- **APN configuration** — change APN without touching UCI
- **Modem reboot** — with confirmation dialog
- **Auto-refresh** — signal and cell info update every 10 seconds

---

## Requirements

- OpenWrt **25.12** or later
- Quectel **RM520NGL** connected via Waveshare 5G M.2 to GbE carrier board
- USB 3.1 cable from Waveshare board to router USB port (provides `/dev/ttyUSBx`)
- LuCI installed (`luci-base`)

> This app works independently of how the modem's data path is configured (GbE or USB). It only needs the AT command port on `/dev/ttyUSB2`.

---

## Installation

**Option A — One-liner (wget, available on all OpenWrt installs):**
```sh
wget -qO- https://raw.githubusercontent.com/pajus1337/luci-app-rm520n/main/install.sh | sh
```

**Option B — Clone and run locally:**
```sh
cd /root
git clone https://github.com/pajus1337/luci-app-rm520n.git
cd luci-app-rm520n
sh install.sh
```

The installer copies files directly to the router filesystem — no OpenWrt build system required.

After installation, open LuCI and navigate to:
**Network → 5G Modem (RM520N)**

---

## Architecture

```
LuCI browser (JavaScript view)
        │
        │ JSON-RPC / ubus
        ▼
  rpcd daemon
        │
        │ calls
        ▼
/usr/libexec/rpcd/rm520n   (shell script backend)
        │
        │ AT commands (exec 3<>/dev/ttyUSB2)
        ▼
  RM520NGL modem  ←──  USB 3.1  ──  Waveshare board
```

**Key files:**

| File | Description |
|---|---|
| `root/usr/libexec/rpcd/rm520n` | Shell script backend — handles JSON-RPC calls, queries modem via AT |
| `htdocs/.../view/rm520n/overview.js` | LuCI JavaScript view — signal bars, controls, auto-refresh |
| `root/usr/share/luci/menu.d/rm520n.json` | Registers the page under Network menu |
| `root/usr/share/rpcd/acl.d/rm520n.json` | rpcd access control list |

---

## Available rpcd Methods

| Method | Description |
|---|---|
| `status` | Firmware version, IMEI, LTE/5G registration |
| `signal` | RSSI, RSRP, SINR, RSRQ, technology |
| `cell` | Raw serving cell info (`AT+QENG="servingcell"`) |
| `bands` | Current LTE/NR band config and mode preference |
| `set_bands` | Lock to specific LTE and/or 5G NR bands |
| `set_apn` | Set PDP context APN (`AT+CGDCONT`) |
| `reboot_modem` | Send `AT+CFUN=1,1` to reboot modem |

---

## Signal Quality Reference

| Metric | Good | Fair | Poor |
|---|---|---|---|
| RSRP | > -80 dBm | -80 to -100 dBm | < -100 dBm |
| SINR | > 20 dB | 0 to 20 dB | < 0 dB |
| RSRQ | > -10 dB | -10 to -15 dB | < -15 dB |

---

## Troubleshooting

**Panel shows no data / AT port not found:**
```sh
ls /dev/ttyUSB*
# If missing, check that USB cable from Waveshare is connected to router USB port
# and that kmod-usb-serial-option is installed
```

**Test AT communication manually:**
```sh
exec 3<>/dev/ttyUSB2
dd <&3 of=/tmp/at_test bs=1 count=64 2>/dev/null &
printf 'AT\r\n' >&3
sleep 2; kill %1; exec 3>&-
cat /tmp/at_test
# Should contain: OK
```

**Reload rpcd after manual file changes:**
```sh
/etc/init.d/rpcd reload
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
```

---

## Compatibility

| Component | Tested version |
|---|---|
| OpenWrt | 25.12.3 |
| Modem firmware | RM520NGLAAR03A01M4G |
| LuCI | 26.x (OpenWrt 25.12 default) |

---

## Related Projects

- [gl-mt6000-rm520n-auto-config](https://github.com/pajus1337/gl-mt6000-rm520n-auto-config) — Automated installer for the full GbE modem setup on GL-MT6000

---

## License

[MIT](LICENSE) © 2026 pajus1337
