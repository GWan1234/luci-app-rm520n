'use strict';
'require view';
'require rpc';
'require ui';

var callGetConfig = rpc.declare({ object: 'rm520n', method: 'get_config', expect: {} });
var callSetConfig = rpc.declare({ object: 'rm520n', method: 'set_config',
    params: ['enabled', 'ping_host', 'fail_threshold', 'action', 'interval'] });

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
    + '.rm-hint{font-size:.75em;color:var(--muted);margin-top:2px}'
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
    + 'position:absolute;cursor:pointer;inset:0;background:#334155;border-radius:22px;transition:.2s}'
    + '.rm-toggle-slider:before{'
    + 'position:absolute;content:"";height:16px;width:16px;left:3px;bottom:3px;'
    + 'background:#94a3b8;border-radius:50%;transition:.2s}'
    + '.rm-toggle input:checked + .rm-toggle-slider{background:var(--accent)}'
    + '.rm-toggle input:checked + .rm-toggle-slider:before{transform:translateX(18px);background:#fff}'
    + '.rm-status-ok{color:var(--green)}'
    + '.rm-status-warn{color:var(--amber)}'
    + '.rm-status-err{color:var(--red)}'
    + '.rm-status-off{color:var(--muted)}';

var ACTION_LABELS = {
    'reconnect':    'Reconnect only (CFUN=4→1, ~5 s)',
    'reboot_modem': 'Reboot modem (AT+CFUN=1,1, ~25 s)',
    'cascade':      'Cascade: reconnect → reboot if still failing'
};

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
    var thr   = parseInt(wd.fail_threshold) || 3;
    var ivl   = parseInt(wd.interval) || 10;
    if (fails === 0) {
        return E('span', { 'class': 'rm-status-ok' },
            _('Active — polling every ') + ivl + 's, no failures');
    }
    var cls = fails >= thr ? 'rm-status-err' : 'rm-status-warn';
    return E('span', { 'class': cls },
        fails + ' / ' + thr + ' ' + _('consecutive failures'));
}

function makeSelect(id, options, current) {
    return E('select', { 'id': id, 'class': 'rm-select' },
        options.map(function(o) {
            var opt = E('option', { 'value': o.v }, o.l);
            if (o.v === current) opt.selected = true;
            return opt;
        })
    );
}

return view.extend({
    load: function() {
        return callGetConfig();
    },

    render: function(d) {
        d = d || {};
        var wd = d.watchdog || {};

        var curAction   = wd.action        || 'reboot_modem';
        var curThresh   = String(wd.fail_threshold || 3);
        var curInterval = String(wd.interval || 10);

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
                    E('td', {}, _('Poll interval')),
                    E('td', {}, [
                        makeSelect('wd-interval', [
                            { v: '5',  l: '5 s' },
                            { v: '10', l: '10 s' },
                            { v: '15', l: '15 s' },
                            { v: '30', l: '30 s' },
                            { v: '60', l: '60 s' }
                        ], curInterval),
                        E('div', { 'class': 'rm-hint' },
                            _('How often to ping. Detection time = interval × threshold.'))
                    ])
                ]),
                E('tr', {}, [
                    E('td', {}, _('Fail threshold')),
                    E('td', {}, [
                        makeSelect('wd-threshold', [
                            { v: '2',  l: '2 ' + _('consecutive failures') },
                            { v: '3',  l: '3 ' + _('consecutive failures') },
                            { v: '5',  l: '5 ' + _('consecutive failures') },
                            { v: '10', l: '10 ' + _('consecutive failures') }
                        ], curThresh),
                        E('div', { 'class': 'rm-hint' },
                            _('Example: 10 s × 3 = ~30 s to detect failure.'))
                    ])
                ]),
                E('tr', {}, [
                    E('td', {}, _('Recovery action')),
                    E('td', {}, [
                        makeSelect('wd-action', [
                            { v: 'reconnect',    l: ACTION_LABELS['reconnect'] },
                            { v: 'reboot_modem', l: ACTION_LABELS['reboot_modem'] },
                            { v: 'cascade',      l: ACTION_LABELS['cascade'] }
                        ], curAction),
                        E('div', { 'class': 'rm-hint' },
                            _('Cascade: try soft reconnect, then full reboot if still failing.'))
                    ])
                ]),
                E('tr', {}, [
                    E('td', {}, _('Status')),
                    E('td', { 'id': 'wd-status' }, [ statusText(wd) ])
                ]),
            ]),
            E('div', { 'class': 'rm-controls' }, [
                E('button', { 'class': 'rm-btn rm-btn-primary',
                    'click': function() {
                        var enabled   = document.getElementById('wd-enabled').checked ? '1' : '0';
                        var host      = document.getElementById('wd-host').value.trim() || '8.8.8.8';
                        var threshold = document.getElementById('wd-threshold').value;
                        var action    = document.getElementById('wd-action').value;
                        var interval  = document.getElementById('wd-interval').value;
                        callSetConfig(enabled, host, threshold, action, interval).then(function(r) {
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
                                if (act) act.value = w.action || 'reboot_modem';
                                var ivl = document.getElementById('wd-interval');
                                if (ivl) ivl.value = String(w.interval || 10);
                                var st = document.getElementById('wd-status');
                                if (st) {
                                    while (st.firstChild) st.removeChild(st.firstChild);
                                    st.appendChild(statusText(w));
                                }
                                ui.addNotification(null,
                                    E('p', _('Saved — enabled: ') + (String(w.enabled) === '1' ? _('yes') : _('no'))
                                        + ', host: ' + (w.ping_host || '8.8.8.8')
                                        + ', every: ' + (w.interval || 10) + 's'
                                        + ', threshold: ' + (w.fail_threshold || 3)
                                        + ', action: ' + (w.action || 'reboot_modem')),
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
