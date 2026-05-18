'use strict';
'require view';
'require rpc';
'require ui';

var callGetConfig = rpc.declare({ object: 'rm520n', method: 'get_config', expect: {} });
var callSetConfig = rpc.declare({ object: 'rm520n', method: 'set_config',
    params: ['enabled', 'ping_host', 'fail_threshold', 'action'] });

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
    + '.rm-table td{padding:6px 0;vertical-align:middle}'
    + '.rm-table td:first-child{'
    + 'color:var(--muted);font-size:.85em;white-space:nowrap;'
    + 'padding-right:16px;width:38%}'
    + '.rm-controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}'
    + '.rm-input{'
    + 'background:var(--bg);border:1px solid var(--border);color:var(--text);'
    + 'padding:6px 10px;border-radius:6px;font-family:inherit;width:100%;box-sizing:border-box}'
    + '.rm-btn{padding:6px 14px;border-radius:6px;border:none;cursor:pointer;font-weight:600;font-size:.85em}'
    + '.rm-btn-primary{background:var(--accent);color:#fff}'
    + '.rm-btn-default{background:#334155;color:var(--text)}'
    + '.rm-select{background:var(--bg);border:1px solid var(--border);color:var(--text);'
    + 'padding:6px 10px;border-radius:6px;font-family:inherit;font-size:.85em;width:100%}'
    + '.rm-toggle{position:relative;display:inline-block;width:40px;height:22px}'
    + '.rm-toggle input{opacity:0;width:0;height:0}'
    + '.rm-toggle-slider{'
    + 'position:absolute;cursor:pointer;inset:0;background:#334155;border-radius:22px;'
    + 'transition:.2s}'
    + '.rm-toggle-slider:before{'
    + 'position:absolute;content:"";height:16px;width:16px;left:3px;bottom:3px;'
    + 'background:#94a3b8;border-radius:50%;transition:.2s}'
    + '.rm-toggle input:checked + .rm-toggle-slider{background:var(--accent)}'
    + '.rm-toggle input:checked + .rm-toggle-slider:before{transform:translateX(18px);background:#fff}'
    + '.rm-status-ok{color:var(--green)}'
    + '.rm-status-warn{color:var(--amber)}'
    + '.rm-status-off{color:var(--muted)}';

function toggleLabel(enabled) {
    return E('label', { 'class': 'rm-toggle' }, [
        E('input', { 'type': 'checkbox', 'id': 'wd-enabled',
            'checked': enabled ? true : null }),
        E('span', { 'class': 'rm-toggle-slider' })
    ]);
}

function statusText(wd) {
    if (!wd || String(wd.enabled) !== '1') {
        return E('span', { 'class': 'rm-status-off' }, _('Disabled'));
    }
    var fails = parseInt(wd.fail_count) || 0;
    if (fails === 0) {
        return E('span', { 'class': 'rm-status-ok' }, _('Active — no failures'));
    }
    return E('span', { 'class': 'rm-status-warn' },
        fails + ' / ' + (wd.fail_threshold || 3) + ' ' + _('consecutive failures'));
}

return view.extend({
    load: function() {
        return callGetConfig();
    },

    render: function(d) {
        d = d || {};
        var wd = d.watchdog || {};

        var watchdogCard = E('div', { 'class': 'rm-card' }, [
            E('h3', {}, _('Connectivity Watchdog')),
            E('table', { 'class': 'rm-table' }, [
                E('tr', {}, [
                    E('td', {}, _('Enabled')),
                    E('td', {}, [ toggleLabel(String(wd.enabled) === '1') ])
                ]),
                E('tr', {}, [
                    E('td', {}, _('Ping host')),
                    E('td', {}, [
                        E('input', { 'type': 'text', 'id': 'wd-host', 'class': 'rm-input',
                            'value': wd.ping_host || '8.8.8.8' })
                    ])
                ]),
                E('tr', {}, [
                    E('td', {}, _('Fail threshold')),
                    E('td', {}, [
                        E('select', { 'id': 'wd-threshold', 'class': 'rm-select' },
                            [2, 3, 5, 10].map(function(n) {
                                var opt = E('option', { 'value': String(n) },
                                    n + ' ' + _('consecutive failures'));
                                if (String(n) === String(wd.fail_threshold || 3)) opt.selected = true;
                                return opt;
                            })
                        )
                    ])
                ]),
                E('tr', {}, [
                    E('td', {}, _('Action on failure')),
                    E('td', {}, [
                        E('select', { 'id': 'wd-action', 'class': 'rm-select' }, [
                            (function() {
                                var opt = E('option', { 'value': 'reconnect' }, _('Reconnect (CFUN=4→1, ~5 s)'));
                                if ((wd.action || 'reconnect') === 'reconnect') opt.selected = true;
                                return opt;
                            })(),
                            (function() {
                                var opt = E('option', { 'value': 'reboot_modem' }, _('Reboot modem (~20 s)'));
                                if (wd.action === 'reboot_modem') opt.selected = true;
                                return opt;
                            })()
                        ])
                    ])
                ]),
                E('tr', {}, [
                    E('td', {}, _('Status')),
                    E('td', {}, [ statusText(wd) ])
                ]),
            ]),
            E('div', { 'class': 'rm-controls' }, [
                E('button', { 'class': 'rm-btn rm-btn-primary',
                    'click': function() {
                        var enabled   = document.getElementById('wd-enabled').checked ? '1' : '0';
                        var host      = document.getElementById('wd-host').value.trim() || '8.8.8.8';
                        var threshold = document.getElementById('wd-threshold').value;
                        var action    = document.getElementById('wd-action').value;
                        callSetConfig(enabled, host, threshold, action).then(function(r) {
                            if (r && r.error) {
                                ui.addNotification(null, E('p', r.error), 'error');
                                return;
                            }
                            return callGetConfig().then(function(fresh) {
                                var w = (fresh && fresh.watchdog) || {};
                                var chk = document.getElementById('wd-enabled');
                                if (chk) chk.checked = String(w.enabled) === '1';
                                var h = document.getElementById('wd-host');
                                if (h) h.value = w.ping_host || '8.8.8.8';
                                var thr = document.getElementById('wd-threshold');
                                if (thr) thr.value = String(w.fail_threshold || 3);
                                var act = document.getElementById('wd-action');
                                if (act) act.value = w.action || 'reconnect';
                                ui.addNotification(null,
                                    E('p', _('Saved — enabled: ') + (String(w.enabled) === '1' ? _('yes') : _('no'))
                                        + ', host: ' + (w.ping_host || '8.8.8.8')
                                        + ', threshold: ' + (w.fail_threshold || 3)
                                        + ', action: ' + (w.action || 'reconnect')),
                                    'info');
                            });
                        });
                    }
                }, _('Save')),
            ]),
        ]);

        return E('div', { 'id': 'rm520n-view' }, [
            E('style', {}, CSS),
            watchdogCard,
        ]);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
