'use strict';
'require view';
'require rpc';
'require poll';
'require ui';

var callFullStatus = rpc.declare({ object: 'rm520n', method: 'full_status', expect: {} });
var callRefresh    = rpc.declare({ object: 'rm520n', method: 'refresh',     expect: {} });
var callReboot     = rpc.declare({ object: 'rm520n', method: 'reboot_modem' });
var callSetApn     = rpc.declare({ object: 'rm520n', method: 'set_apn',   params: ['apn'] });
var callSetBands   = rpc.declare({ object: 'rm520n', method: 'set_bands', params: ['lte_band', 'nr_band'] });

var CSS =
    '#rm520n-view{'
    + '--bg:#0f172a;--card:#1e293b;--border:#334155;'
    + '--text:#e2e8f0;--muted:#94a3b8;--accent:#3b82f6;'
    + '--green:#22c55e;--lime:#84cc16;--amber:#f59e0b;--orange:#f97316;--red:#ef4444;'
    + 'background:var(--bg);padding:16px;'
    + 'font-family:ui-monospace,SFMono-Regular,monospace;color:var(--text)}'
    + '.rm-card{'
    + 'background:var(--card);border:1px solid var(--border);border-radius:8px;'
    + 'padding:16px;margin-bottom:12px}'
    + '.rm-card h3{'
    + 'margin:0 0 12px;font-size:.78em;text-transform:uppercase;'
    + 'letter-spacing:.08em;color:var(--muted)}'
    + '.rm-table{width:100%;border-collapse:collapse}'
    + '.rm-table td{padding:4px 0;vertical-align:middle}'
    + '.rm-table td:first-child{'
    + 'color:var(--muted);font-size:.85em;white-space:nowrap;'
    + 'padding-right:16px;width:38%}'
    + '.rm-badge{'
    + 'display:inline-block;padding:1px 8px;border-radius:10px;'
    + 'font-size:.76em;font-weight:700}'
    + '.rm-bar-wrap{display:flex;align-items:center;gap:8px}'
    + '.rm-bar-bg{flex:1;background:#334155;border-radius:3px;height:7px;overflow:hidden}'
    + '.rm-bar-fill{height:7px;border-radius:3px;transition:width .4s}'
    + '.rm-bar-val{font-size:.85em;color:var(--muted);min-width:64px;text-align:right}'
    + '.rm-head{display:flex;align-items:center;gap:8px;margin:0 0 12px}'
    + '.rm-head h3{margin:0;font-size:.78em;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}'
    + '.rm-ca-row{'
    + 'display:flex;gap:6px;align-items:center;padding:5px 0;'
    + 'border-top:1px solid var(--border);flex-wrap:wrap}'
    + '.rm-ca-row:first-child{border-top:none}'
    + '.rm-ant-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}'
    + '.rm-ant-cell{text-align:center;padding:4px 0}'
    + '.rm-ant-label{font-size:.75em;color:var(--muted);margin-bottom:3px}'
    + '.rm-ant-val{font-size:.95em;font-weight:700}'
    + '.rm-controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}'
    + '.rm-input{'
    + 'background:var(--bg);border:1px solid var(--border);color:var(--text);'
    + 'padding:6px 10px;border-radius:6px;font-family:inherit;flex:1;min-width:140px}'
    + '.rm-btn{padding:6px 14px;border-radius:6px;border:none;cursor:pointer;font-weight:600;font-size:.85em}'
    + '.rm-btn-primary{background:var(--accent);color:#fff}'
    + '.rm-btn-danger{background:var(--red);color:#fff}'
    + '.rm-btn-default{background:#334155;color:var(--text)}';

// ── Helpers ───────────────────────────────────────────────────────────────────

function qualityColor(rsrp) {
    var v = parseInt(rsrp);
    if (isNaN(v)) return 'var(--muted)';
    if (v > -80)  return 'var(--green)';
    if (v > -100) return 'var(--lime)';
    if (v > -110) return 'var(--amber)';
    if (v > -120) return 'var(--orange)';
    return 'var(--red)';
}

function sinrColor(sinr) {
    var v = parseInt(sinr);
    if (isNaN(v)) return 'var(--muted)';
    if (v > 20) return 'var(--green)';
    if (v > 10) return 'var(--lime)';
    if (v > 0)  return 'var(--amber)';
    return 'var(--red)';
}

function rsrqColor(rsrq) {
    var v = parseInt(rsrq);
    if (isNaN(v)) return 'var(--muted)';
    if (v > -10) return 'var(--green)';
    if (v > -15) return 'var(--lime)';
    if (v > -20) return 'var(--amber)';
    return 'var(--red)';
}

function techBadge(tech) {
    var colors = { 'NR5G-SA': '#7e22ce', 'NR5G-NSA': '#9333ea', 'LTE': '#1d4ed8', 'WCDMA': '#166534' };
    return E('span', {
        'class': 'rm-badge',
        'style': 'background:' + (colors[tech] || '#475569') + ';color:#fff'
    }, tech || '—');
}

function cregBadge(text) {
    var ok = text && text.indexOf('Registered') >= 0;
    return E('span', { 'style': 'color:' + (ok ? 'var(--green)' : 'var(--red)') }, text || '—');
}

function rrcBadge(rrc) {
    return E('span', {
        'style': 'color:' + (rrc === 'CONNECT' ? 'var(--green)' : 'var(--muted)')
    }, rrc || '—');
}

function signalBar(rsrp) {
    var v = parseInt(rsrp);
    if (isNaN(v)) return E('span', { 'style': 'color:var(--muted)' }, '—');
    var pct = Math.max(0, Math.min(100, (v + 140) / 80 * 100));
    return E('div', { 'class': 'rm-bar-wrap' }, [
        E('div', { 'class': 'rm-bar-bg' }, [
            E('div', { 'class': 'rm-bar-fill',
                'style': 'width:' + pct.toFixed(1) + '%;background:' + qualityColor(v) })
        ]),
        E('span', { 'class': 'rm-bar-val' }, v + ' dBm')
    ]);
}

function fmtBytes(n) {
    var v = parseInt(n);
    if (isNaN(v) || v <= 0) return '—';
    if (v >= 1073741824) return (v / 1073741824).toFixed(2) + ' GB';
    if (v >= 1048576)    return (v / 1048576).toFixed(1)    + ' MB';
    if (v >= 1024)       return Math.round(v / 1024)        + ' KB';
    return v + ' B';
}

function row(label, value) {
    return E('tr', {}, [
        E('td', {}, label),
        E('td', {}, value != null ? value : '—')
    ]);
}

function setEl(id, child) {
    var el = document.getElementById(id);
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    if (child instanceof Node) {
        el.appendChild(child);
    } else if (child != null && child !== '') {
        el.textContent = String(child);
    } else {
        el.textContent = '—';
    }
}

// ── Live update (called by 10s poll and manual Refresh Now) ───────────────────

function updateSignal(d) {
    if (!d) return;
    setEl('sig-tech', techBadge(d.technology));
    setEl('sig-rssi', d.rssi != null ? d.rssi + ' dBm' : null);
    setEl('sig-rsrp', signalBar(d.rsrp));
    setEl('sig-sinr', d.sinr != null
        ? E('span', { 'style': 'color:' + sinrColor(d.sinr) }, d.sinr + ' dB') : null);
    setEl('sig-rsrq', d.rsrq != null
        ? E('span', { 'style': 'color:' + rsrqColor(d.rsrq) }, d.rsrq + ' dB') : null);

    setEl('cell-rrc',    rrcBadge(d.rrc_state));
    setEl('cell-band',   d.band    != null ? 'B' + d.band     : null);
    setEl('cell-earfcn', d.earfcn  != null ? String(d.earfcn) : null);
    setEl('cell-pci',    d.pci     != null ? String(d.pci)    : null);
    setEl('cell-id',     d.cell_id || null);

    ['rx0', 'rx1', 'rx2', 'rx3'].forEach(function(rx) {
        var el = document.getElementById('ant-' + rx);
        if (!el) return;
        var v = d['rsrp_' + rx];
        el.style.color = v != null ? qualityColor(v) : 'var(--muted)';
        el.textContent = v != null ? v + ' dBm' : '—';
    });
}

// ── View ──────────────────────────────────────────────────────────────────────

return view.extend({
    load: function() {
        return callFullStatus();
    },

    render: function(d) {
        d = d || {};

        // Card 1 — Modem identity
        var infoCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, 'Modem'),
            E('table', { 'class': 'rm-table' }, [
                row('Firmware',  d.firmware || '—'),
                row('IMEI',      d.imei     || '—'),
                row('AT Port',   d.at_port  || '—'),
                row('Operator',  d.operator || '—'),
                row('MCC / MNC', d.mcc && d.mnc ? d.mcc + ' / ' + d.mnc : '—'),
                row('LTE Reg',   cregBadge(d.creg)),
                row('5G NR Reg', cregBadge(d.c5greg)),
            ])
        ]);

        // Card 2 — Signal quality (live)
        var signalCard = E('div', { 'class': 'rm-card' }, [
            E('div', { 'class': 'rm-head' }, [
                E('h3', {}, 'Signal'),
                E('span', { 'id': 'sig-tech' }, [ techBadge(d.technology) ])
            ]),
            E('table', { 'class': 'rm-table' }, [
                row('RSSI', E('span', { 'id': 'sig-rssi' },
                    d.rssi != null ? d.rssi + ' dBm' : '—')),
                row('RSRP', E('div', { 'id': 'sig-rsrp' }, [ signalBar(d.rsrp) ])),
                row('SINR', E('span', { 'id': 'sig-sinr' },
                    d.sinr != null
                        ? [ E('span', { 'style': 'color:' + sinrColor(d.sinr) }, d.sinr + ' dB') ]
                        : '—')),
                row('RSRQ', E('span', { 'id': 'sig-rsrq' },
                    d.rsrq != null
                        ? [ E('span', { 'style': 'color:' + rsrqColor(d.rsrq) }, d.rsrq + ' dB') ]
                        : '—')),
            ])
        ]);

        // Card 3 — Cell info (live)
        var cellCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, 'Cell Info'),
            E('table', { 'class': 'rm-table' }, [
                row('RRC State', E('span', { 'id': 'cell-rrc'    }, [ rrcBadge(d.rrc_state) ])),
                row('Band',      E('span', { 'id': 'cell-band'   }, d.band   != null ? 'B' + d.band     : '—')),
                row('Duplex',    d.duplex || '—'),
                row('EARFCN',    E('span', { 'id': 'cell-earfcn' }, d.earfcn != null ? String(d.earfcn) : '—')),
                row('PCI',       E('span', { 'id': 'cell-pci'    }, d.pci    != null ? String(d.pci)    : '—')),
                row('Cell ID',   E('span', { 'id': 'cell-id'     }, d.cell_id || '—')),
                d.tac ? row('TAC', d.tac) : null,
            ].filter(Boolean))
        ]);

        // Card 4 — Carrier Aggregation (optional)
        var caCard = null;
        if (d.ca && d.ca.length) {
            caCard = E('div', { 'class': 'rm-card' }, [
                E('h3', {}, 'Carrier Aggregation'),
                E('div', {}, d.ca.map(function(c) {
                    return E('div', { 'class': 'rm-ca-row' }, [
                        E('span', { 'class': 'rm-badge',
                            'style': 'background:' + (c.type === 'PCC' ? '#1d4ed8' : '#475569') + ';color:#fff;min-width:32px;text-align:center' },
                            c.type || '?'),
                        E('span', {}, 'B' + (c.band != null ? c.band : '?')),
                        E('span', { 'style': 'color:var(--muted);font-size:.85em' }, 'EARFCN'),
                        E('span', {}, c.earfcn != null ? String(c.earfcn) : '?'),
                        c.pci  != null ? E('span', { 'style': 'color:var(--muted);font-size:.85em' }, 'PCI') : null,
                        c.pci  != null ? E('span', {}, String(c.pci)) : null,
                        c.rsrp != null
                            ? E('span', { 'style': 'color:' + qualityColor(c.rsrp) }, c.rsrp + ' dBm')
                            : null,
                    ]);
                }))
            ]);
        }

        // Card 5 — Per-antenna RSRP (optional, live)
        var antCard = null;
        var rxKeys = ['rx0', 'rx1', 'rx2', 'rx3'];
        if (rxKeys.some(function(k) { return d['rsrp_' + k] != null; })) {
            antCard = E('div', { 'class': 'rm-card' }, [
                E('h3', {}, 'Per-Antenna RSRP'),
                E('div', { 'class': 'rm-ant-grid' }, rxKeys.map(function(rx) {
                    var v = d['rsrp_' + rx];
                    return E('div', { 'class': 'rm-ant-cell' }, [
                        E('div', { 'class': 'rm-ant-label' }, rx.toUpperCase()),
                        E('div', { 'class': 'rm-ant-val', 'id': 'ant-' + rx,
                            'style': 'color:' + (v != null ? qualityColor(v) : 'var(--muted)') },
                            v != null ? v + ' dBm' : '—')
                    ]);
                }))
            ]);
        }

        // Card 6 — Temperature (optional, static — only available when modem reports sensors)
        var tempCard = null;
        if (d.temp_xo != null || d.temp_mdm != null || d.temp_pa != null) {
            var tempRows = [];
            if (d.temp_xo  != null) tempRows.push(row('XO Therm',  d.temp_xo  + ' °C'));
            if (d.temp_mdm != null) tempRows.push(row('MDM Therm', d.temp_mdm + ' °C'));
            if (d.temp_pa  != null) tempRows.push(row('PA Therm',  d.temp_pa  + ' °C'));
            tempCard = E('div', { 'class': 'rm-card' }, [
                E('h3', {}, 'Temperature'),
                E('table', { 'class': 'rm-table' }, tempRows)
            ]);
        }

        // Card 7 — Data counters
        var countersCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, 'Data Counters'),
            E('table', { 'class': 'rm-table' }, [
                row('Modem TX', fmtBytes(d.modem_tx)),
                row('Modem RX', fmtBytes(d.modem_rx)),
            ])
        ]);

        // Card 8 — Band configuration
        var bandsCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, 'Band Configuration'),
            E('table', { 'class': 'rm-table' }, [
                row('Mode',      d.mode       || '—'),
                row('LTE Bands', d.lte_bands  || '—'),
                row('NR Bands',  d.nr5g_bands || '—'),
            ]),
            E('div', { 'class': 'rm-controls' }, [
                E('input', { 'id': 'lte-band-input', 'type': 'text',
                    'class': 'rm-input', 'placeholder': 'LTE e.g. 1:3:7:20' }),
                E('input', { 'id': 'nr-band-input', 'type': 'text',
                    'class': 'rm-input', 'placeholder': 'NR e.g. 78' }),
                E('button', {
                    'class': 'rm-btn rm-btn-primary',
                    'click': function() {
                        var lte = document.getElementById('lte-band-input').value.trim();
                        var nr  = document.getElementById('nr-band-input').value.trim();
                        callSetBands(lte, nr).then(function() {
                            ui.addNotification(null,
                                E('p', _('Band configuration applied. Modem will reconnect.')), 'info');
                        });
                    }
                }, 'Apply Bands')
            ])
        ]);

        // Card 9 — Controls (APN + reboot + manual refresh)
        var controlsCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, 'Controls'),
            E('div', { 'class': 'rm-controls' }, [
                E('input', { 'id': 'apn-input', 'type': 'text',
                    'class': 'rm-input', 'placeholder': 'APN e.g. internet' }),
                E('button', {
                    'class': 'rm-btn rm-btn-primary',
                    'click': function() {
                        var apn = document.getElementById('apn-input').value.trim();
                        if (!apn) return;
                        callSetApn(apn).then(function() {
                            ui.addNotification(null,
                                E('p', _('APN set to: ') + apn), 'info');
                        });
                    }
                }, 'Set APN'),
            ]),
            E('div', { 'class': 'rm-controls' }, [
                E('button', {
                    'class': 'rm-btn rm-btn-default',
                    'click': function() {
                        callRefresh().then(function(r) { updateSignal(r); });
                    }
                }, 'Refresh Now'),
                E('button', {
                    'class': 'rm-btn rm-btn-danger',
                    'click': function() {
                        ui.showModal(_('Reboot Modem'), [
                            E('p', _('Are you sure? Internet will drop for ~20 seconds.')),
                            E('div', { 'class': 'right' }, [
                                E('button', { 'class': 'btn cbi-button',
                                    'click': ui.hideModal }, _('Cancel')),
                                ' ',
                                E('button', {
                                    'class': 'btn cbi-button cbi-button-reset',
                                    'click': function() {
                                        callReboot();
                                        ui.hideModal();
                                        ui.addNotification(null,
                                            E('p', _('Modem is rebooting...')), 'warning');
                                    }
                                }, _('Reboot'))
                            ])
                        ]);
                    }
                }, 'Reboot Modem'),
            ])
        ]);

        poll.add(function() {
            return callRefresh().then(function(r) { updateSignal(r); });
        }, 10);

        return E('div', { 'id': 'rm520n-view' }, [
            E('style', {}, CSS),
            infoCard,
            signalCard,
            cellCard,
            caCard,
            antCard,
            tempCard,
            countersCard,
            bandsCard,
            controlsCard,
        ].filter(Boolean));
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
