'use strict';
'require view';
'require rpc';
'require poll';
'require ui';

var callStatus   = rpc.declare({ object: 'rm520n', method: 'status',       expect: {} });
var callSignal   = rpc.declare({ object: 'rm520n', method: 'signal',       expect: {} });
var callCell     = rpc.declare({ object: 'rm520n', method: 'cell',         expect: {} });
var callBands    = rpc.declare({ object: 'rm520n', method: 'bands',        expect: {} });
var callReboot   = rpc.declare({ object: 'rm520n', method: 'reboot_modem' });
var callSetApn   = rpc.declare({ object: 'rm520n', method: 'set_apn',      params: ['apn'] });
var callSetBands = rpc.declare({ object: 'rm520n', method: 'set_bands',    params: ['lte_band', 'nr_band'] });

function signalBar(rsrp) {
    var val = parseInt(rsrp);
    if (isNaN(val)) {
        return E('span', { 'style': 'color:#999' }, '—');
    }
    var pct   = Math.max(0, Math.min(100, (val + 140) / 80 * 100));
    var color = pct > 60 ? '#4caf50' : pct > 30 ? '#ff9800' : '#f44336';
    return E('div', { 'style': 'display:flex;align-items:center;gap:8px' }, [
        E('div', { 'style': 'flex:1;background:#ddd;border-radius:4px;height:10px' }, [
            E('div', { 'style': 'width:%d%%;background:%s;border-radius:4px;height:10px;transition:width .5s'.format(pct, color) })
        ]),
        E('span', { 'style': 'font-size:0.85em;color:#666' }, val + ' dBm')
    ]);
}

function techBadge(tech) {
    var colors = { 'NR5G-SA': '#7b1fa2', 'NR5G-NSA': '#9c27b0', 'LTE': '#1565c0', 'WCDMA': '#2e7d32' };
    var bg = colors[tech] || '#607d8b';
    return E('span', {
        'style': 'background:%s;color:#fff;padding:2px 10px;border-radius:12px;font-size:0.85em;font-weight:bold'.format(bg)
    }, tech || 'Unknown');
}

function row(label, value) {
    return E('tr', {}, [
        E('td', { 'style': 'padding:6px 12px 6px 0;color:#666;white-space:nowrap;font-size:0.9em' }, label),
        E('td', { 'style': 'padding:6px 0;font-weight:500' }, value || '—')
    ]);
}

function setEl(id, child) {
    var el = document.getElementById(id);
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    if (child instanceof Node) {
        el.appendChild(child);
    } else {
        el.textContent = child != null ? String(child) : '—';
    }
}

function updateSignal(sig, cell) {
    setEl('sig-tech', techBadge(sig.technology));
    setEl('sig-rsrp', signalBar(sig.rsrp));
    setEl('sig-rssi', sig.rssi != null ? sig.rssi + ' dBm' : '—');
    setEl('sig-sinr', sig.sinr != null ? sig.sinr + ' dB'  : '—');
    setEl('sig-rsrq', sig.rsrq != null ? sig.rsrq + ' dB'  : '—');
    setEl('sig-cell', (cell && cell.raw) || '—');
}

return view.extend({
    load: function() {
        return Promise.all([ callStatus(), callSignal(), callCell(), callBands() ]);
    },

    render: function(data) {
        var status = data[0] || {};
        var signal = data[1] || {};
        var cell   = data[2] || {};
        var bands  = data[3] || {};

        var infoCard = E('div', { 'class': 'cbi-section' }, [
            E('h3', {}, 'Modem Information'),
            E('table', { 'style': 'width:100%;border-collapse:collapse' }, [
                row('Firmware',  E('span', { 'id': 'st-fw'   }, status.firmware  || '—')),
                row('IMEI',      E('span', { 'id': 'st-imei' }, status.imei      || '—')),
                row('AT Port',   E('span', { 'id': 'st-port' }, status.at_port   || '—')),
                row('LTE Reg',   E('span', { 'id': 'st-creg' }, status.creg      || '—')),
                row('5G NR Reg', E('span', { 'id': 'st-5g'   }, status.c5greg    || '—')),
            ])
        ]);

        var signalCard = E('div', { 'class': 'cbi-section' }, [
            E('h3', { 'style': 'display:flex;align-items:center;gap:10px' }, [
                'Signal Quality  ',
                E('span', { 'id': 'sig-tech' }, [ techBadge(signal.technology) ])
            ]),
            E('table', { 'style': 'width:100%;border-collapse:collapse' }, [
                row('RSSI', E('span', { 'id': 'sig-rssi' }, signal.rssi != null ? signal.rssi + ' dBm' : '—')),
                row('RSRP', E('div',  { 'id': 'sig-rsrp' }, [ signalBar(signal.rsrp) ])),
                row('SINR', E('span', { 'id': 'sig-sinr' }, signal.sinr != null ? signal.sinr + ' dB'  : '—')),
                row('RSRQ', E('span', { 'id': 'sig-rsrq' }, signal.rsrq != null ? signal.rsrq + ' dB'  : '—')),
                row('Cell', E('span', { 'id': 'sig-cell' }, cell.raw || '—')),
            ])
        ]);

        var bandsCard = E('div', { 'class': 'cbi-section' }, [
            E('h3', {}, 'Band Configuration'),
            E('table', { 'style': 'width:100%;border-collapse:collapse' }, [
                row('Mode preference', bands.mode),
                row('LTE bands',       bands.lte_bands),
                row('5G NR bands',     bands.nr5g_bands),
            ]),
            E('div', { 'style': 'margin-top:12px;display:flex;gap:8px;flex-wrap:wrap' }, [
                E('input', {
                    'id': 'lte-band-input', 'type': 'text',
                    'placeholder': 'LTE bands e.g. 1:3:7:20',
                    'style': 'padding:6px;border:1px solid #ccc;border-radius:4px;flex:1;min-width:160px'
                }),
                E('input', {
                    'id': 'nr-band-input', 'type': 'text',
                    'placeholder': '5G NR bands e.g. 78',
                    'style': 'padding:6px;border:1px solid #ccc;border-radius:4px;flex:1;min-width:160px'
                }),
                E('button', {
                    'class': 'btn cbi-button cbi-button-apply',
                    'click': function() {
                        var lte = document.getElementById('lte-band-input').value.trim();
                        var nr  = document.getElementById('nr-band-input').value.trim();
                        callSetBands(lte, nr).then(function() {
                            ui.addNotification(null, E('p', _('Band configuration applied. Modem will reconnect.')), 'info');
                        });
                    }
                }, 'Apply Bands')
            ])
        ]);

        var apnCard = E('div', { 'class': 'cbi-section' }, [
            E('h3', {}, 'APN Configuration'),
            E('div', { 'style': 'display:flex;gap:8px;flex-wrap:wrap' }, [
                E('input', {
                    'id': 'apn-input', 'type': 'text',
                    'placeholder': 'e.g. internet',
                    'style': 'padding:6px;border:1px solid #ccc;border-radius:4px;flex:1;min-width:160px'
                }),
                E('button', {
                    'class': 'btn cbi-button cbi-button-apply',
                    'click': function() {
                        var apn = document.getElementById('apn-input').value.trim();
                        if (!apn) return;
                        callSetApn(apn).then(function() {
                            ui.addNotification(null, E('p', _('APN set to: ') + apn), 'info');
                        });
                    }
                }, 'Set APN')
            ])
        ]);

        var ctrlCard = E('div', { 'class': 'cbi-section' }, [
            E('h3', {}, 'Modem Controls'),
            E('div', { 'style': 'display:flex;gap:8px;flex-wrap:wrap' }, [
                E('button', {
                    'class': 'btn cbi-button cbi-button-reset',
                    'click': function() {
                        ui.showModal(_('Reboot Modem'), [
                            E('p', _('Are you sure you want to reboot the modem? Internet will be lost for ~20 seconds.')),
                            E('div', { 'class': 'right' }, [
                                E('button', { 'class': 'btn cbi-button', 'click': ui.hideModal }, _('Cancel')),
                                ' ',
                                E('button', {
                                    'class': 'btn cbi-button cbi-button-reset',
                                    'click': function() {
                                        callReboot();
                                        ui.hideModal();
                                        ui.addNotification(null, E('p', _('Modem is rebooting...')), 'warning');
                                    }
                                }, _('Reboot'))
                            ])
                        ]);
                    }
                }, 'Reboot Modem'),

                E('button', {
                    'class': 'btn cbi-button',
                    'click': function() {
                        Promise.all([ callSignal(), callCell() ]).then(function(d) {
                            updateSignal(d[0] || {}, d[1] || {});
                        });
                    }
                }, 'Refresh Now')
            ])
        ]);

        // Auto-refresh signal every 10 seconds — updates in-place via element IDs,
        // no re-render (which would duplicate poll registrations).
        poll.add(function() {
            return Promise.all([ callSignal(), callCell() ]).then(function(d) {
                updateSignal(d[0] || {}, d[1] || {});
            });
        }, 10);

        return E('div', { 'id': 'rm520n-view' }, [
            infoCard, signalCard, bandsCard, apnCard, ctrlCard
        ]);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
