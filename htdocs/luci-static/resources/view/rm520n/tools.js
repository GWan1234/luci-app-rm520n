'use strict';
'require view';
'require rpc';
'require ui';

var callSetApn     = rpc.declare({ object: 'rm520n', method: 'set_apn',     params: ['apn'] });
var callSetBands   = rpc.declare({ object: 'rm520n', method: 'set_bands',   params: ['lte_band', 'nr_band'] });
var callResetBands = rpc.declare({ object: 'rm520n', method: 'reset_bands' });
var callReconnect  = rpc.declare({ object: 'rm520n', method: 'reconnect' });
var callReboot     = rpc.declare({ object: 'rm520n', method: 'reboot_modem' });
var callSetMode    = rpc.declare({ object: 'rm520n', method: 'set_mode',    params: ['mode'] });
var callBands      = rpc.declare({ object: 'rm520n', method: 'bands',       expect: {} });

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
    + '.rm-select{background:var(--bg);border:1px solid var(--border);color:var(--text);'
    + 'padding:6px 10px;border-radius:6px;font-family:inherit;font-size:.85em}';

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

return view.extend({
    load: function() {
        return callBands();
    },

    render: function(d) {
        d = d || {};

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

        var apnCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, _('APN')),
            E('div', { 'class': 'rm-controls' }, [
                E('input', { 'id': 'apn-input', 'type': 'text',
                    'class': 'rm-input', 'placeholder': 'e.g. internet' }),
                E('button', { 'class': 'rm-btn rm-btn-primary',
                    'click': function() {
                        var apn = document.getElementById('apn-input').value.trim();
                        if (!apn) return;
                        callSetApn(apn).then(function() {
                            ui.addNotification(null, E('p', _('APN set to: ') + apn), 'info');
                        });
                    }
                }, _('Set APN')),
            ]),
        ]);

        var connectionCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, _('Connection')),
            E('div', { 'class': 'rm-controls' }, [
                E('button', { 'class': 'rm-btn rm-btn-primary',
                    'click': function() {
                        ui.showModal(_('Reconnect Modem'), [
                            E('p', _('Soft reconnect (CFUN=4 → CFUN=1). Connection will drop for ~5 seconds.')),
                            E('div', { 'class': 'right' }, [
                                E('button', { 'class': 'btn cbi-button',
                                    'click': ui.hideModal }, _('Cancel')),
                                ' ',
                                E('button', { 'class': 'btn cbi-button cbi-button-apply',
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
                E('button', { 'class': 'rm-btn rm-btn-danger',
                    'click': function() {
                        ui.showModal(_('Reboot Modem'), [
                            E('p', _('Are you sure? Internet will drop for ~20 seconds.')),
                            E('div', { 'class': 'right' }, [
                                E('button', { 'class': 'btn cbi-button',
                                    'click': ui.hideModal }, _('Cancel')),
                                ' ',
                                E('button', { 'class': 'btn cbi-button cbi-button-reset',
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
            ]),
        ]);

        return E('div', { 'id': 'rm520n-view' }, [
            E('style', {}, CSS),
            bandsCard,
            apnCard,
            connectionCard,
        ]);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
