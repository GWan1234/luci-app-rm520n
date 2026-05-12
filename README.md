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

- **Signal dashboard** — RSRP bar chart with colour coding, RSSI, SINR, RSRQ; auto-refreshed every 10 s
- **Signal quality badge** — combined RSRP + SINR score: Poor / Fair / Good / Very Good / Excellent
- **Technology badge** — live indicator: `LTE`, `NR5G-NSA`, `NR5G-SA`
- **Modem info** — firmware version, IMEI, LTE and 5G NR registration status, operator, MCC/MNC
- **Cell Info** — RRC state, band, duplex, EARFCN, PCI, TAC; fallbacks from QNWINFO/QCAINFO/CEREG for NOCONN mode
- **Cell ID block** — hex + decimal ECI, decoded eNB ID and sector, direct **CellMapper** deep-link
- **Carrier Aggregation** — lists PCC/SCC with band, EARFCN, PCI, RSRP per component carrier
- **Per-antenna RSRP** — RX0–RX3 individual signal levels with colour coding
- **Temperature panel** — all active modem sensors with colour-coded values (green / amber / orange / red)
- **Data counters** — modem-side TX/RX byte totals via `AT+QGDCNT?`
- **Band configuration** — toggle chip buttons per LTE/NR band, All/None shortcuts, Apply per RAT, Reset All Bands
- **Network mode** — switch between AUTO / LTE / NR5G / LTE:NR5G
- **APN configuration** — change APN without touching UCI
- **Reconnect** — soft reconnect (CFUN=4 → CFUN=1, ~5 s downtime) with confirmation dialog
- **Modem reboot** — full restart (CFUN=1,1, ~20 s) with confirmation dialog

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
| `htdocs/.../view/rm520n/overview.js` | LuCI JavaScript view — cards, signal bars, controls, auto-refresh |
| `root/usr/share/luci/menu.d/rm520n.json` | Registers the page under Network menu |
| `root/usr/share/rpcd/acl.d/rm520n.json` | rpcd access control list |

---

## Available rpcd Methods

| Method | Type | Description |
|---|---|---|
| `full_status` | read | All modem data in one call — used on page load |
| `refresh` | read | Fast refresh: signal, cell info, CA, per-antenna RSRP (10 s poll) |
| `bands` | read | Current LTE/NR band masks and mode preference |
| `set_bands` | write | Lock to specific LTE and/or NR bands (`AT+QNWPREFCFG`) |
| `reset_bands` | write | Restore all LTE and NR bands to factory defaults |
| `set_mode` | write | Set network mode preference (AUTO/LTE/NR5G/LTE:NR5G) |
| `set_apn` | write | Set PDP context APN (`AT+CGDCONT`) |
| `reconnect` | write | Soft reconnect: CFUN=4, sleep 3 s, CFUN=1 |
| `reboot_modem` | write | Full modem restart (`AT+CFUN=1,1`) |

---

## Signal Quality Reference

| Metric | Excellent | Very Good | Good | Fair | Poor |
|---|---|---|---|---|---|
| RSRP | > −80 dBm | > −90 dBm | > −100 dBm | > −110 dBm | ≤ −110 dBm |
| SINR (modifier) | — | — | +1 score if ≥ 10 dB | — | −1 score if < 0 dB |
| RSRQ (display) | > −10 dB | > −15 dB | > −20 dB | ≤ −20 dB | — |

The badge score (1–5) is RSRP-based, then adjusted ±1 by SINR.

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
stty -F /dev/ttyUSB2 -opost -onlcr -icrnl min 0 time 3
exec 3<>/dev/ttyUSB2
printf 'AT\r\n' >&3
dd <&3 bs=4096 count=1 2>/dev/null
exec 3>&-
# Should output: OK
```

**Reload rpcd after manual file changes:**
```sh
/etc/init.d/rpcd reload
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
```

**Band/EARFCN show `—` in Cell Info:**
The modem enters `NOCONN` state on the AT port when data runs over PCIe/GbE. `AT+QENG="servingcell"` returns no cell data in this state. The app falls back to `AT+QNWINFO` (band/EARFCN) and `AT+QCAINFO` (PCI) automatically.

---

## Compatibility

| Component | Tested version |
|---|---|
| OpenWrt | 25.12.3 |
| Modem firmware | RM520NGLAAR03A03M4G |
| LuCI | 26.x (OpenWrt 25.12 default) |

---

## Related Projects

- [gl-mt6000-rm520n-auto-config](https://github.com/pajus1337/gl-mt6000-rm520n-auto-config) — Automated installer for the full GbE modem setup on GL-MT6000

---

## License

[MIT](LICENSE) © 2026 pajus1337
