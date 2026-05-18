'use strict';
'require view';
'require rpc';
'require poll';
'require ui';

var callFullStatus  = rpc.declare({ object: 'rm520n', method: 'full_status', expect: {} });
var callRefresh     = rpc.declare({ object: 'rm520n', method: 'refresh',     expect: {} });
var callReboot      = rpc.declare({ object: 'rm520n', method: 'reboot_modem' });
var callSetApn      = rpc.declare({ object: 'rm520n', method: 'set_apn',     params: ['apn'] });
var callSetBands    = rpc.declare({ object: 'rm520n', method: 'set_bands',   params: ['lte_band', 'nr_band'] });
var callResetBands  = rpc.declare({ object: 'rm520n', method: 'reset_bands' });
var callReconnect   = rpc.declare({ object: 'rm520n', method: 'reconnect' });
var callSetMode     = rpc.declare({ object: 'rm520n', method: 'set_mode',    params: ['mode'] });

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
    + '.rm-ant-tech{font-size:.7em;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin:6px 0 3px}'
    + '.rm-controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}'
    + '.rm-input{'
    + 'background:var(--bg);border:1px solid var(--border);color:var(--text);'
    + 'padding:6px 10px;border-radius:6px;font-family:inherit;flex:1;min-width:140px}'
    + '.rm-btn{padding:6px 14px;border-radius:6px;border:none;cursor:pointer;font-weight:600;font-size:.85em}'
    + '.rm-btn-primary{background:var(--accent);color:#fff}'
    + '.rm-btn-danger{background:var(--red);color:#fff}'
    + '.rm-btn-default{background:#334155;color:var(--text)}'
    + '.rm-section-lbl{font-size:.75em;text-transform:uppercase;letter-spacing:.07em;'
    + 'color:var(--muted);margin:12px 0 5px;padding-bottom:4px;border-bottom:1px solid var(--border)}'
    + '.rm-band-chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}'
    + '.rm-band-chip{padding:2px 8px;border-radius:4px;border:1px solid var(--border);'
    + 'cursor:pointer;font-size:.76em;font-weight:700;background:var(--bg);color:var(--muted);'
    + 'user-select:none;transition:background .12s,color .12s,border-color .12s}'
    + '.rm-band-chip.on{background:var(--accent);color:#fff;border-color:var(--accent)}'
    + '.rm-cell-id-block{line-height:1.7}'
    + '.rm-cell-id-hex{font-family:monospace;font-weight:700;font-size:1em}'
    + '.rm-cell-id-dec{color:var(--muted);font-size:.82em;margin-left:7px}'
    + '.rm-cell-id-meta{font-size:.8em;color:var(--muted)}'
    + '.rm-cell-id-link{font-size:.8em;color:var(--accent);text-decoration:none;margin-left:8px}'
    + '.rm-select{background:var(--bg);border:1px solid var(--border);color:var(--text);'
    + 'padding:6px 10px;border-radius:6px;font-family:inherit;font-size:.85em}';

// ── Helpers ───────────────────────────────────────────────────────────────────

var TEMP_LABELS = {
    'modem-lte-sub6-pa1': 'PA1 (LTE)',
    'modem-lte-sub6-pa2': 'PA2 (LTE)',
    'modem-mmw0':         'PA (mmWave)',
    'modem-ambient-usr':  'Ambient',
    'aoss-0-usr':         'SoC AOSS',
    'cpuss-0-usr':        'CPU',
    'mdmq6-0-usr':        'DSP (Q6)',
    'mdmss-0-usr':        'Modem SS0',
    'mdmss-1-usr':        'Modem SS1',
    'mdmss-2-usr':        'Modem SS2',
    'mdmss-3-usr':        'Modem SS3',
};

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

var LTE_ALL = [1,2,3,4,5,7,8,12,13,14,17,18,19,20,25,26,28,29,30,32,34,38,39,40,41,42,43,46,48,66,71];
var NR_ALL  = [1,2,3,5,7,8,12,13,14,18,20,25,26,28,29,30,38,40,41,48,66,70,71,75,76,77,78,79];

function buildBandChips(allBands, enabledStr, prefix, gridId) {
    var enabled = {};
    (enabledStr || '').split(':').forEach(function(b) {
        var n = parseInt(b); if (!isNaN(n)) enabled[n] = true;
    });
    var chips = allBands.map(function(b) {
        var chip = E('span', {
            'class': 'rm-band-chip' + (enabled[b] ? ' on' : ''),
            'data-band': String(b)
        }, prefix + b);
        chip.addEventListener('click', function() { chip.classList.toggle('on'); });
        return chip;
    });
    return E('div', { 'class': 'rm-band-chips', 'id': gridId }, chips);
}

function getSelectedBands(gridId) {
    var el = document.getElementById(gridId);
    if (!el) return '';
    var sel = [];
    el.querySelectorAll('.rm-band-chip.on').forEach(function(c) {
        sel.push(c.getAttribute('data-band'));
    });
    return sel.join(':');
}

function setAllChips(gridId, on) {
    var el = document.getElementById(gridId);
    if (!el) return;
    el.querySelectorAll('.rm-band-chip').forEach(function(c) {
        c.classList[on ? 'add' : 'remove']('on');
    });
}

function tempColor(v) {
    if (v == null || isNaN(parseInt(v))) return 'var(--muted)';
    var n = parseInt(v);
    if (n > 80) return 'var(--red)';
    if (n > 65) return 'var(--orange)';
    if (n > 50) return 'var(--amber)';
    return 'var(--green)';
}

function buildCaRow(c) {
    return E('div', { 'class': 'rm-ca-row' }, [
        E('span', { 'class': 'rm-badge',
            'style': 'background:' + (c.type === 'PCC' ? '#1d4ed8' : '#475569') + ';color:#fff;min-width:32px;text-align:center' },
            c.type || '?'),
        E('span', {}, 'B' + (c.band != null ? c.band : '?')),
        E('span', { 'style': 'color:var(--muted);font-size:.85em' }, 'EARFCN'),
        E('span', {}, c.earfcn != null ? String(c.earfcn) : '?'),
        c.pci  != null ? E('span', { 'style': 'color:var(--muted);font-size:.85em' }, 'PCI') : null,
        c.pci  != null ? E('span', {}, String(c.pci)) : null,
        c.rsrp != null ? E('span', { 'style': 'color:' + qualityColor(c.rsrp) }, c.rsrp + ' dBm') : null,
    ].filter(Boolean));
}

function buildCellIdBlock(d) {
    var ciHex  = d.cell_id || null;
    var ciDec  = ciHex ? parseInt(ciHex, 16) : null;
    var enbId  = ciDec != null ? (ciDec >> 8)   : null;
    var sector = ciDec != null ? (ciDec & 0xFF) : null;
    var cmUrl  = cellmapperUrl(d.mcc, d.mnc, d.cell_id, d.rat);
    return ciHex
        ? E('div', { 'class': 'rm-cell-id-block' }, [
            E('div', {}, [
                E('span', { 'class': 'rm-cell-id-hex' }, ciHex),
                E('span', { 'class': 'rm-cell-id-dec' }, '(' + ciDec + ')')
            ]),
            E('div', { 'class': 'rm-cell-id-meta' }, [
                'eNB ' + enbId + ' · Sector ' + sector,
                cmUrl ? E('a', {
                    'class': 'rm-cell-id-link', 'href': cmUrl, 'target': '_blank'
                }, '↗ CellMapper') : null
            ].filter(Boolean))
          ])
        : null;
}

function signalQualityBadge(rsrp, sinr) {
    var r = parseInt(rsrp), s = parseInt(sinr);
    if (isNaN(r)) return E('span', {}, '');
    var score = r > -80 ? 5 : r > -90 ? 4 : r > -100 ? 3 : r > -110 ? 2 : 1;
    if (!isNaN(s)) {
        if (s >= 10 && score < 5) score++;
        if (s <  0  && score > 1) score--;
    }
    var labels = ['', _('Poor'), _('Fair'), _('Good'), _('Very Good'), _('Excellent')];
    var colors = ['', '#b91c1c', '#c2410c', '#b45309', '#4d7c0f', '#15803d'];
    return E('span', {
        'class': 'rm-badge',
        'style': 'background:' + colors[score] + ';color:#fff'
    }, labels[score]);
}

function cellmapperUrl(mcc, mnc, cellId, rat) {
    if (!mcc || !mnc || !cellId) return null;
    var ci = parseInt(cellId, 16);
    if (isNaN(ci)) return null;
    var type = (rat && rat.indexOf('NR') >= 0) ? 'NR' : 'LTE';
    var searchId = (type === 'LTE') ? (ci >> 8) : ci;
    return 'https://www.cellmapper.net/map?MCC=' + mcc
        + '&MNC=' + parseInt(mnc)
        + '&type=' + type
        + '&searchCellId=' + searchId;
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
    setEl('sig-tech',    techBadge(d.technology));
    setEl('sig-quality', signalQualityBadge(d.rsrp, d.sinr));
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
    if (d.cell_id !== undefined) setEl('cell-id-wrap', buildCellIdBlock(d));

    ['rx0', 'rx1', 'rx2', 'rx3'].forEach(function(rx) {
        var el = document.getElementById('ant-' + rx);
        if (!el) return;
        var v = d['rsrp_' + rx];
        el.style.color = v != null ? qualityColor(v) : 'var(--muted)';
        el.textContent = v != null ? v + ' dBm' : '—';
    });
    ['rx0', 'rx1', 'rx2', 'rx3'].forEach(function(rx) {
        var el = document.getElementById('ant-nr-' + rx);
        if (!el) return;
        var v = d['rsrp_nr_' + rx];
        el.style.color = v != null ? qualityColor(v) : 'var(--muted)';
        el.textContent = v != null ? v + ' dBm' : '—';
    });
    var hasNr = ['rx0', 'rx1', 'rx2', 'rx3'].some(function(rx) { return d['rsrp_nr_' + rx] != null; });
    var nrSec  = document.getElementById('ant-nr-section');
    var lteLbl = document.getElementById('ant-lte-label');
    if (nrSec)  nrSec.style.display  = hasNr ? '' : 'none';
    if (lteLbl) lteLbl.style.display = hasNr ? '' : 'none';

    if (d.ca !== undefined) {
        var caBody = document.getElementById('ca-body');
        if (caBody) {
            while (caBody.firstChild) caBody.removeChild(caBody.firstChild);
            if (d.ca && d.ca.length) {
                d.ca.forEach(function(c) { caBody.appendChild(buildCaRow(c)); });
            } else {
                caBody.style.color = 'var(--muted)';
                caBody.textContent = '—';
            }
        }
    }
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
            E('h3', {}, _('Modem')),
            E('table', { 'class': 'rm-table' }, [
                row(_('Firmware'),  d.firmware || '—'),
                row(_('IMEI'),      d.imei     || '—'),
                row(_('AT Port'),   d.at_port  || '—'),
                row(_('Operator'),  d.operator || '—'),
                row(_('MCC / MNC'), d.mcc && d.mnc ? d.mcc + ' / ' + d.mnc : '—'),
                row(_('LTE Reg'),   cregBadge(d.creg)),
                row(_('5G NR Reg'), cregBadge(d.c5greg)),
            ])
        ]);

        // Card 2 — Signal quality (live)
        var signalCard = E('div', { 'class': 'rm-card' }, [
            E('div', { 'class': 'rm-head' }, [
                E('h3', {}, _('Signal')),
                E('span', { 'id': 'sig-tech' }, [ techBadge(d.technology) ]),
                E('span', { 'id': 'sig-quality' }, [ signalQualityBadge(d.rsrp, d.sinr) ])
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
            E('h3', {}, _('Cell Info')),
            E('table', { 'class': 'rm-table' }, [
                row(_('RRC State'), E('span', { 'id': 'cell-rrc'    }, [ rrcBadge(d.rrc_state) ])),
                row(_('Band'),      E('span', { 'id': 'cell-band'   }, d.band   != null ? 'B' + d.band     : '—')),
                row(_('Duplex'),    d.duplex || '—'),
                row(_('EARFCN'),    E('span', { 'id': 'cell-earfcn' }, d.earfcn != null ? String(d.earfcn) : '—')),
                row(_('PCI'),       E('span', { 'id': 'cell-pci'    }, d.pci    != null ? String(d.pci)    : '—')),
                row(_('Cell ID'),   E('span', { 'id': 'cell-id-wrap' }, [ buildCellIdBlock(d) || '—' ])),
                row(_('TAC'), d.tac || '—'),
            ])
        ]);

        // Card 4 — Carrier Aggregation
        var caCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, _('Carrier Aggregation')),
            (d.ca && d.ca.length)
                ? E('div', { 'id': 'ca-body' }, d.ca.map(buildCaRow))
                : E('div', { 'id': 'ca-body', 'style': 'color:var(--muted)' }, '—')
        ]);

        // Card 5 — Per-antenna RSRP (live)
        var rxKeys = ['rx0', 'rx1', 'rx2', 'rx3'];
        var hasNr = rxKeys.some(function(rx) { return d['rsrp_nr_' + rx] != null; });
        var antCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, _('Per-Antenna RSRP')),
            E('div', { 'id': 'ant-lte-label', 'class': 'rm-ant-tech',
                'style': hasNr ? '' : 'display:none' }, 'LTE'),
            E('div', { 'class': 'rm-ant-grid' }, rxKeys.map(function(rx) {
                var v = d['rsrp_' + rx];
                return E('div', { 'class': 'rm-ant-cell' }, [
                    E('div', { 'class': 'rm-ant-label' }, rx.toUpperCase()),
                    E('div', { 'class': 'rm-ant-val', 'id': 'ant-' + rx,
                        'style': 'color:' + (v != null ? qualityColor(v) : 'var(--muted)') },
                        v != null ? v + ' dBm' : '—')
                ]);
            })),
            E('div', { 'id': 'ant-nr-section', 'style': hasNr ? '' : 'display:none' }, [
                E('div', { 'class': 'rm-ant-tech' }, 'NR5G'),
                E('div', { 'class': 'rm-ant-grid' }, rxKeys.map(function(rx) {
                    var v = d['rsrp_nr_' + rx];
                    return E('div', { 'class': 'rm-ant-cell' }, [
                        E('div', { 'class': 'rm-ant-label' }, rx.toUpperCase()),
                        E('div', { 'class': 'rm-ant-val', 'id': 'ant-nr-' + rx,
                            'style': 'color:' + (v != null ? qualityColor(v) : 'var(--muted)') },
                            v != null ? v + ' dBm' : '—')
                    ]);
                }))
            ])
        ]);

        // Card 6 — Temperature (sensor names vary by firmware)
        var tempCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, _('Temperature')),
            (d.temps && d.temps.length)
                ? E('table', { 'class': 'rm-table' },
                    d.temps.map(function(t) {
                        var label = TEMP_LABELS[t.name] || t.name;
                        return row(label, t.value != null
                            ? E('span', { 'style': 'color:' + tempColor(t.value) + ';font-weight:600' },
                                t.value + ' °C')
                            : '—');
                    })
                  )
                : E('span', { 'style': 'color:var(--muted)' }, '—')
        ]);

        // Card 7 — Data counters
        var countersCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, _('Data Counters')),
            E('table', { 'class': 'rm-table' }, [
                row(_('Modem TX'), fmtBytes(d.modem_tx)),
                row(_('Modem RX'), fmtBytes(d.modem_rx)),
            ])
        ]);

        // Card 8 — Band configuration
        var bandsCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, _('Band Configuration')),

            E('div', { 'class': 'rm-section-lbl' }, _('Network Mode')),
            E('div', { 'class': 'rm-controls' }, [
                E('select', { 'id': 'mode-select', 'class': 'rm-select' },
                    ['AUTO', 'LTE', 'NR5G', 'LTE:NR5G'].map(function(m) {
                        var opt = E('option', { 'value': m }, m);
                        if (m === (d.mode || 'AUTO')) opt.selected = true;
                        return opt;
                    })
                ),
                E('button', { 'class': 'rm-btn rm-btn-primary',
                    'click': function() {
                        var m = document.getElementById('mode-select').value;
                        callSetMode(m).then(function() {
                            ui.addNotification(null, E('p', _('Mode set to: ') + m), 'info');
                        });
                    }
                }, _('Apply Mode')),
            ]),

            E('div', { 'class': 'rm-section-lbl' }, _('LTE Bands')),
            E('div', { 'class': 'rm-controls', 'style': 'margin-bottom:4px' }, [
                E('button', { 'class': 'rm-btn rm-btn-default',
                    'style': 'padding:2px 10px;font-size:.76em',
                    'click': function() { setAllChips('lte-chips', true); }
                }, _('All')),
                E('button', { 'class': 'rm-btn rm-btn-default',
                    'style': 'padding:2px 10px;font-size:.76em',
                    'click': function() { setAllChips('lte-chips', false); }
                }, _('None')),
            ]),
            buildBandChips(LTE_ALL, d.lte_bands, 'B', 'lte-chips'),
            E('div', { 'class': 'rm-controls' }, [
                E('button', { 'class': 'rm-btn rm-btn-primary',
                    'click': function() {
                        var bands = getSelectedBands('lte-chips');
                        if (!bands) return;
                        callSetBands(bands, null).then(function() {
                            ui.addNotification(null, E('p', _('LTE bands applied.')), 'info');
                        });
                    }
                }, _('Apply LTE')),
                E('button', { 'class': 'rm-btn rm-btn-default',
                    'click': function() {
                        callResetBands().then(function() {
                            setAllChips('lte-chips', true);
                            setAllChips('nr-chips', true);
                            ui.addNotification(null, E('p', _('All bands restored.')), 'info');
                        });
                    }
                }, _('Reset All Bands')),
            ]),

            E('div', { 'class': 'rm-section-lbl' }, _('NR Bands')),
            E('div', { 'class': 'rm-controls', 'style': 'margin-bottom:4px' }, [
                E('button', { 'class': 'rm-btn rm-btn-default',
                    'style': 'padding:2px 10px;font-size:.76em',
                    'click': function() { setAllChips('nr-chips', true); }
                }, _('All')),
                E('button', { 'class': 'rm-btn rm-btn-default',
                    'style': 'padding:2px 10px;font-size:.76em',
                    'click': function() { setAllChips('nr-chips', false); }
                }, _('None')),
            ]),
            buildBandChips(NR_ALL, d.nr5g_bands, 'n', 'nr-chips'),
            E('div', { 'class': 'rm-controls' }, [
                E('button', { 'class': 'rm-btn rm-btn-primary',
                    'click': function() {
                        var bands = getSelectedBands('nr-chips');
                        if (!bands) return;
                        callSetBands(null, bands).then(function() {
                            ui.addNotification(null, E('p', _('NR bands applied.')), 'info');
                        });
                    }
                }, _('Apply NR')),
            ]),
        ]);

        // Card 9 — Controls (APN + reboot + manual refresh)
        var controlsCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, _('Controls')),
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
                }, _('Set APN')),
            ]),
            E('div', { 'class': 'rm-controls' }, [
                E('button', {
                    'class': 'rm-btn rm-btn-default',
                    'click': function() {
                        callRefresh().then(function(r) { updateSignal(r); });
                    }
                }, _('Refresh Now')),
                E('button', {
                    'class': 'rm-btn rm-btn-primary',
                    'click': function() {
                        ui.showModal(_('Reconnect Modem'), [
                            E('p', _('Soft reconnect (CFUN=4 → CFUN=1). Connection will drop for ~5 seconds.')),
                            E('div', { 'class': 'right' }, [
                                E('button', { 'class': 'btn cbi-button',
                                    'click': ui.hideModal }, _('Cancel')),
                                ' ',
                                E('button', {
                                    'class': 'btn cbi-button cbi-button-apply',
                                    'click': function() {
                                        callReconnect();
                                        ui.hideModal();
                                        ui.addNotification(null,
                                            E('p', _('Reconnecting modem...')), 'info');
                                    }
                                }, _('Reconnect'))
                            ])
                        ]);
                    }
                }, _('Reconnect')),
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
                }, _('Reboot Modem')),
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
        ]);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
