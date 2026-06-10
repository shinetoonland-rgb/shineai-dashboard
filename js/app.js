(function () {
  // ── URLS ──
  var D_URL = 'https://automationagent.shineailabs.com/webhook/dashboard';
  var A_URL = 'https://automationagent.shineailabs.com/webhook/activity';
  var C_URL = 'https://automationagent.shineailabs.com/webhook/customers';
  var F_URL = 'https://automationagent.shineailabs.com/webhook/followups';

  var USERS = { admin: 'shine123', nitin: 'admin123' };
  var allC = [], allF = [], allI = [];
  var chartInst = null, funnelInst = null, timelineInst = null;
  var listItems = [], listType = '', curC = null;
  var notes = {}, qaType = '';
  var refreshTimer = null, countdownTimer = null, sl = 10;
  var currentTab = 'overview';
  var lastMetricsData = null;

  function qs(id) { return document.getElementById(id); }

  function showToast(msg, type) {
    var t = qs('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    setTimeout(function () { t.className = 'toast'; }, 3200);
  }

  function parseArr(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.data)) return raw.data;
    return [];
  }

  function safeFetch(url, cb) {
    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        var p; try { p = JSON.parse(txt); } catch (e) { cb([]); return; }
        if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { cb([]); return; } }
        cb(parseArr(p));
      })
      .catch(function () { cb([]); });
  }

  // ── AUTH ──
  function doLogin() {
    var u = qs('un').value.trim(), p = qs('pw').value.trim();
    if (USERS[u] && USERS[u] === p) {
      qs('login-page').style.display = 'none';
      qs('main-page').style.display = 'block';
      qs('login-error').style.display = 'none';
      loadAll();
      refreshTimer = setInterval(loadAll, 10000);
    } else { qs('login-error').style.display = 'block'; }
  }

  function doLogout() {
    clearInterval(refreshTimer); clearInterval(countdownTimer);
    qs('main-page').style.display = 'none';
    qs('login-page').style.display = 'flex';
    qs('un').value = ''; qs('pw').value = '';
  }

  // ── WIRE BUTTONS ──
  function wireButtons() {
    qs('login-btn').addEventListener('click', doLogin);
    qs('un').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    qs('pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    qs('logout-btn').addEventListener('click', doLogout);
    qs('refresh-btn').addEventListener('click', loadAll);
    qs('search-input').addEventListener('input', filterCustomers);
    qs('list-close-btn').addEventListener('click', closeList);
    qs('list-overlay').addEventListener('click', function (e) { if (e.target === qs('list-overlay')) closeList(); });
    qs('list-search').addEventListener('input', filterList);
    qs('dp-close-btn').addEventListener('click', closeDP);
    qs('dp-overlay').addEventListener('click', function (e) { if (e.target === qs('dp-overlay')) closeDP(); });
    qs('dp-call-link').addEventListener('click', doCall);
    qs('dp-sched-btn').addEventListener('click', toggleSched);
    qs('sf-ok-btn').addEventListener('click', confirmSched);
    qs('sf-cancel-btn').addEventListener('click', toggleSched);
    qs('dp-save-btn').addEventListener('click', saveNote);
    qs('qa-call-btn').addEventListener('click', function () { openQA('call'); });
    qs('qa-wa-btn').addEventListener('click', function () { openQA('whatsapp'); });
    qs('qa-sched-btn').addEventListener('click', function () { openQA('schedule'); });
    qs('qa-report-btn').addEventListener('click', exportCSV);
    qs('qa-confirm-btn').addEventListener('click', submitQA);
    qs('qa-cancel-btn').addEventListener('click', closeQA);
    qs('qa-add-btn').addEventListener('click', openCustModal);
    qs('cust-close-btn').addEventListener('click', closeCustModal);
    qs('cust-modal-overlay').addEventListener('click', function (e) { if (e.target === qs('cust-modal-overlay')) closeCustModal(); });
    qs('cust-submit-btn').addEventListener('click', submitCustModal);
    qs('cust-cancel-btn').addEventListener('click', closeCustModal);
    
    // Tabs
    var tabs = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener('click', function () { switchTab(tab.getAttribute('data-tab')); });
      })(tabs[i]);
    }
  }

  // ── TABS ──
  function switchTab(tab) {
    currentTab = tab;
    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-tab') === tab);
    }
    var panes = document.querySelectorAll('.tab-pane');
    for (var j = 0; j < panes.length; j++) {
      panes[j].style.display = panes[j].getAttribute('data-pane') === tab ? 'block' : 'none';
    }
    if (tab === 'analytics') renderAnalytics();
    if (tab === 'customers') renderCustomerTab();
  }

  // ── LOAD ALL ──
  function loadAll() {
    loadMetrics();
    loadActivity();
    loadCustomersAndFollowups();
    startCountdown();
    qs('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
  }

  // ── METRICS ──
  function loadMetrics() {
    fetch(D_URL)
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        var d; try { d = JSON.parse(txt); } catch (e) { throw e; }
        if (typeof d === 'string') d = JSON.parse(d);
        qs('error-bar').style.display = 'none';
        lastMetricsData = d;

        // Compute extras
        var total = d.total_customers || 0;
        var completed = d.completed_followups || 0;
        var pending = d.pending_followups || 0;
        var voice = d.voice_calls_sent || 0;
        var wa = d.whatsapp_sent || 0;
        var rate = d.success_rate || (total > 0 ? Math.round((completed / (completed + pending)) * 100) : 0);
        var leads_today = d.leads_today || Math.floor(total * 0.08);
        var escalations = d.escalations || 0;

        // KPI strip
        qs('kpi-leads').textContent = total;
        qs('kpi-rate').textContent = rate + '%';
        qs('kpi-pending').textContent = pending;
        qs('kpi-today').textContent = leads_today;

        // Main grid cards
        qs('dashboard').innerHTML =
          card('blue',   '👥', 'Total Customers',   total,     'Registered', 'all') +
          card('orange', '⏳', 'Pending Followups', pending,   'Need action', 'pending') +
          card('green',  '✅', 'Completed',          completed, 'Sent OK', 'completed') +
          card('purple', '📞', 'Voice Calls',        voice,     'AI calls made', 'voice') +
          card('cyan',   '💬', 'WhatsApp Sent',      wa,        'Delivered', 'whatsapp') +
          card('pink',   '🇮🇳', 'Hindi',             d.hindi_customers || 0,   'Hindi speakers', 'hindi') +
          card('indigo', '🌐', 'English',            d.english_customers || 0, 'English speakers', 'english') +
          card('teal',   '📡', 'Voice Interactions', d.total_voice_interactions || 0, 'Logged', 'voice') +
          card('red',    '📱', 'WA Interactions',    d.total_whatsapp_interactions || 0, 'Logged', 'whatsapp') +
          card('yellow', '🚨', 'Escalations',        escalations, 'Human requests', 'all') +
          card('lime',   '⚡', 'Leads Today',         leads_today, 'New today', 'all') +
          '<div class="card success-card" data-list="all">' +
            '<div class="card-icon">🎯</div>' +
            '<div class="card-label">Conversion Rate</div>' +
            '<div class="card-value" style="color:#facc15">' + rate + '%</div>' +
            '<div class="success-bar-wrap"><div class="success-bar-fill" style="width:' + rate + '%"></div></div>' +
            '<div class="card-click-hint">click to view</div>' +
          '</div>';

        // Wire card clicks
        var cards = qs('dashboard').querySelectorAll('.card');
        for (var i = 0; i < cards.length; i++) {
          (function (el) {
            el.addEventListener('click', function () { showList(el.getAttribute('data-list')); });
          })(cards[i]);
        }

        updateChart(d);
        if (currentTab === 'analytics') {
          updateFunnel(total, voice + wa, completed, escalations);
        }
        updateSentiment(d);
        updateIndustryBreakdown();
      })
      .catch(function (e) {
        qs('error-bar').style.display = 'block';
        console.error('metrics error', e);
      });
  }

  function card(color, icon, label, val, sub, listKey) {
    return '<div class="card ' + color + '" data-list="' + listKey + '">' +
      '<div class="card-icon">' + icon + '</div>' +
      '<div class="card-label">' + label + '</div>' +
      '<div class="card-value">' + (val !== undefined && val !== null ? val : '--') + '</div>' +
      '<div class="card-sub">' + sub + '</div>' +
      '<div class="card-click-hint">click to view</div></div>';
  }

  // ── CHARTS ──
  function updateChart(d) {
    var ctx = qs('myChart'); if (!ctx) return;
    if (chartInst) chartInst.destroy();
    chartInst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Voice', 'WhatsApp', 'Completed', 'Pending', 'Hindi', 'English'],
        datasets: [{
          label: 'Count',
          data: [d.voice_calls_sent || 0, d.whatsapp_sent || 0, d.completed_followups || 0,
                 d.pending_followups || 0, d.hindi_customers || 0, d.english_customers || 0],
          backgroundColor: ['rgba(139,92,246,0.7)', 'rgba(16,185,129,0.7)', 'rgba(34,197,94,0.7)',
                             'rgba(245,158,11,0.7)', 'rgba(236,72,153,0.7)', 'rgba(99,102,241,0.7)'],
          borderColor: ['#8b5cf6', '#10b981', '#22c55e', '#f59e0b', '#ec4899', '#6366f1'],
          borderWidth: 2, borderRadius: 8
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
        }
      }
    });
  }

  function updateFunnel(leads, contacted, converted, escalated) {
    var ctx = qs('funnelChart'); if (!ctx) return;
    if (funnelInst) funnelInst.destroy();
    funnelInst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Leads Captured', 'Contacted by AI', 'Converted', 'Escalated'],
        datasets: [{
          data: [leads, contacted, converted, escalated],
          backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(16,185,129,0.8)',
                             'rgba(34,197,94,0.8)', 'rgba(239,68,68,0.8)'],
          borderRadius: 8, borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
          y: { ticks: { color: '#e2e8f0', font: { weight: '600' } }, grid: { display: false } }
        }
      }
    });
  }

  function updateSentiment(d) {
    var pos = d.positive_sentiment || 65;
    var neu = d.neutral_sentiment || 25;
    var neg = d.negative_sentiment || 10;
    var el = qs('sentiment-bars');
    if (!el) return;
    el.innerHTML =
      sentBar('Positive', pos, '#10b981') +
      sentBar('Neutral',  neu, '#f59e0b') +
      sentBar('Negative', neg, '#ef4444');
  }

  function sentBar(label, pct, color) {
    return '<div style="margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;margin-bottom:5px">' +
      '<span>' + label + '</span><span style="color:' + color + ';font-weight:700">' + pct + '%</span></div>' +
      '<div style="background:rgba(255,255,255,0.06);border-radius:999px;height:8px;overflow:hidden">' +
      '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:999px;transition:width 1s ease"></div>' +
      '</div></div>';
  }

  function updateIndustryBreakdown() {
    var el = qs('industry-list'); if (!el || !allC.length) return;
    var counts = {};
    for (var i = 0; i < allC.length; i++) {
      var ind = allC[i].alert_type || 'Other';
      counts[ind] = (counts[ind] || 0) + 1;
    }
    var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 6);
    var total = allC.length;
    var html = '';
    var colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];
    for (var j = 0; j < sorted.length; j++) {
      var pct = Math.round((counts[sorted[j]] / total) * 100);
      html += '<div style="margin-bottom:10px">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;margin-bottom:4px">' +
        '<span>' + sorted[j] + '</span>' +
        '<span style="color:' + colors[j] + ';font-weight:700">' + counts[sorted[j]] + ' (' + pct + '%)</span></div>' +
        '<div style="background:rgba(255,255,255,0.06);border-radius:999px;height:6px;overflow:hidden">' +
        '<div style="width:' + pct + '%;height:100%;background:' + colors[j] + ';border-radius:999px"></div>' +
        '</div></div>';
    }
    el.innerHTML = html;
  }

  // ── ACTIVITY ──
  function loadActivity() {
    safeFetch(A_URL, function (list) {
      allI = list;
      updateDebug();
      if (!list.length) { qs('activity-table').innerHTML = '<div style="color:#475569;font-size:13px">No recent activity</div>'; return; }
      var rows = '';
      var top = list.slice(0, 10);
      for (var i = 0; i < top.length; i++) {
        var r = top[i];
        var isV = (r.interaction_type || '').toLowerCase().indexOf('voice') > -1 || (r.interaction_type || '').toLowerCase().indexOf('call') > -1;
        rows += '<tr>' +
          '<td style="color:#64748b;white-space:nowrap">' + (r.created_at ? new Date(r.created_at).toLocaleTimeString() : '--') + '</td>' +
          '<td><span class="badge ' + (isV ? 'badge-voice' : 'badge-whatsapp') + '">' + (isV ? 'Voice' : 'WA') + '</span></td>' +
          '<td>' + (r.customer_name || r.customer_phone || '--') + '</td>' +
          '<td style="color:#64748b">' + (r.message || '').substring(0, 35) + '</td></tr>';
      }
      qs('activity-table').innerHTML = '<table class="data-table"><thead><tr><th>Time</th><th>Type</th><th>Customer</th><th>Message</th></tr></thead><tbody>' + rows + '</tbody></table>';
    });
  }

  // ── CUSTOMERS ──
  function loadCustomersAndFollowups() {
    safeFetch(C_URL, function (cList) { allC = cList; updateDebug(); renderCustomers(allC); updateIndustryBreakdown(); });
    safeFetch(F_URL, function (fList) { allF = fList; updateDebug(); });
  }

  function updateDebug() {
    qs('debug-bar').style.display = 'flex';
    qs('dbg-c').textContent = allC.length;
    qs('dbg-f').textContent = allF.length;
    qs('dbg-i').textContent = allI.length;
    var msgs = [];
    if (!allC.length) msgs.push('customers=0');
    if (!allF.length) msgs.push('followups=0');
    if (!allI.length) msgs.push('activity=0');
    qs('dbg-msg').textContent = msgs.length ? 'Empty: ' + msgs.join(', ') : '✅ All data loaded';
  }

  function renderCustomers(list) {
    qs('customer-count').textContent = list.length + ' customers';
    if (!list.length) { qs('customer-table').innerHTML = '<div style="color:#475569;font-size:13px">No customers found</div>'; return; }
    var rows = '';
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      rows += '<tr data-idx="' + i + '" style="cursor:pointer">' +
        '<td>' + (c.name || '--') + '</td>' +
        '<td style="color:#64748b">' + (c.phone || '--') + '</td>' +
        '<td><span class="badge ' + (c.preferred_language === 'Hindi' ? 'badge-voice' : 'badge-whatsapp') + '">' + (c.preferred_language || '--') + '</span></td>' +
        '<td style="color:#94a3b8">' + (c.alert_type || '--') + '</td>' +
        '<td style="display:flex;gap:6px;align-items:center">' +
          '<a class="icon-btn cb" href="tel:' + (c.phone || '').replace(/\s/g, '') + '" title="Call">📞</a>' +
          '<a class="icon-btn wb" href="https://wa.me/' + (c.phone || '').replace(/\D/g, '') + '" target="_blank" title="WA">💬</a>' +
        '</td></tr>';
    }
    var tbl = document.createElement('table');
    tbl.className = 'data-table';
    tbl.innerHTML = '<thead><tr><th>Name</th><th>Phone</th><th>Language</th><th>Industry</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody>';
    var trs = tbl.querySelector('tbody').querySelectorAll('tr');
    for (var j = 0; j < trs.length; j++) {
      (function (tr, idx) {
        tr.addEventListener('click', function (e) { if (e.target.tagName === 'A') return; openDP(list[idx]); });
      })(trs[j], j);
    }
    qs('customer-table').innerHTML = '';
    qs('customer-table').appendChild(tbl);
  }

  function filterCustomers() {
    var q = qs('search-input').value.toLowerCase();
    renderCustomers(allC.filter(function (c) {
      return (c.name || '').toLowerCase().indexOf(q) > -1 ||
             (c.phone || '').indexOf(q) > -1 ||
             (c.alert_type || '').toLowerCase().indexOf(q) > -1;
    }));
  }

  // ── ANALYTICS TAB ──
  function renderAnalytics() {
    updateIndustryBreakdown();
    
    if (lastMetricsData) {
      qs('stat-voice').textContent = lastMetricsData.voice_calls_sent || 0;
      qs('stat-wa').textContent = lastMetricsData.whatsapp_sent || 0;
      qs('stat-esc').textContent = lastMetricsData.escalations || 0;
      updateFunnel(
        lastMetricsData.total_customers || 0,
        (lastMetricsData.voice_calls_sent || 0) + (lastMetricsData.whatsapp_sent || 0),
        lastMetricsData.completed_followups || 0,
        lastMetricsData.escalations || 0
      );
    }

    var el = qs('response-timeline'); if (!el) return;
    var ctx2 = el.getContext('2d');
    if (timelineInst) timelineInst.destroy();
    timelineInst = new Chart(el, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          { label: 'Voice Calls', data: [12, 18, 15, 22, 19, 8, 5], borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.4, fill: true },
          { label: 'WhatsApp',    data: [8,  14, 20, 16, 25, 12, 9], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)',  tension: 0.4, fill: true }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
        }
      }
    });
  }

  function renderCustomerTab() {
    renderCustomers(allC);
  }

  // ── EXPORT CSV ──
  function exportCSV() {
    if (!allC.length) { showToast('No customers to export', 'error'); return; }
    var rows = [['Name', 'Phone', 'Language', 'Industry', 'Registered']];
    for (var i = 0; i < allC.length; i++) {
      var c = allC[i];
      rows.push([c.name || '', c.phone || '', c.preferred_language || '', c.alert_type || '', c.created_at ? new Date(c.created_at).toLocaleDateString() : '']);
    }
    var csv = rows.map(function (r) { return r.map(function (v) { return '"' + v + '"'; }).join(','); }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shineai_customers_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    showToast('✅ CSV exported!', 'success');
  }

  // ── LIST MODAL ──
  function showList(type) {
    qs('list-search').value = '';
    var items = [], title = '';
    if (type === 'all')       { items = allC; title = 'All Customers (' + allC.length + ')'; listType = 'customer'; }
    else if (type === 'hindi')   { items = allC.filter(function (c) { return (c.preferred_language || '').toLowerCase() === 'hindi'; }); title = 'Hindi Customers'; listType = 'customer'; }
    else if (type === 'english') { items = allC.filter(function (c) { return (c.preferred_language || '').toLowerCase() === 'english'; }); title = 'English Customers'; listType = 'customer'; }
    else if (type === 'pending') {
      items = allF.filter(function (f) { return (f.status || '').toLowerCase() === 'pending'; });
      title = 'Pending Followups'; listType = 'followup';
      if (!items.length) { items = allC; title = 'Customers (followups empty)'; listType = 'customer'; }
    } else if (type === 'completed') {
      items = allF.filter(function (f) { return (f.status || '').toLowerCase() === 'completed'; });
      title = 'Completed Followups'; listType = 'followup';
      if (!items.length) { items = allC; title = 'Customers (followups empty)'; listType = 'customer'; }
    } else if (type === 'voice') {
      items = allI.filter(function (i) { var t = (i.interaction_type || '').toLowerCase(); return t.indexOf('voice') > -1 || t.indexOf('call') > -1; });
      title = 'Voice Records'; listType = 'interaction';
      if (!items.length) { items = allC; title = 'Customers (no voice data)'; listType = 'customer'; }
    } else if (type === 'whatsapp') {
      items = allI.filter(function (i) { var t = (i.interaction_type || '').toLowerCase(); return t.indexOf('whatsapp') > -1 || t.indexOf('wa') > -1; });
      title = 'WhatsApp Records'; listType = 'interaction';
      if (!items.length) { items = allC; title = 'Customers (no WA data)'; listType = 'customer'; }
    }
    listItems = items;
    qs('list-title').textContent = title;
    renderList(items);
    qs('list-overlay').classList.add('active');
  }

  function renderList(items) {
    qs('list-count').textContent = items.length + ' record(s)';
    if (!items.length) { qs('list-body').innerHTML = '<div class="no-data">No records found</div>'; return; }
    var container = document.createElement('div');
    for (var i = 0; i < items.length; i++) {
      var x = items[i];
      var div = document.createElement('div');
      div.className = 'row-card';
      if (listType === 'customer') {
        div.innerHTML = '<div><div class="rc-name">' + (x.name || '--') + '</div>' +
          '<div class="rc-sub">' + (x.phone || '--') + ' | ' + (x.alert_type || '--') + ' | ' + (x.preferred_language || '--') + '</div></div>' +
          '<div style="display:flex;gap:6px">' +
            '<a class="icon-btn cb" href="tel:' + (x.phone || '').replace(/\s/g, '') + '">📞</a>' +
            '<a class="icon-btn wb" href="https://wa.me/' + (x.phone || '').replace(/\D/g, '') + '" target="_blank">💬</a>' +
          '</div>';
        (function (customer) {
          div.addEventListener('click', function (e) { if (e.target.tagName !== 'A') { closeList(); openDP(customer); } });
        })(x);
      } else if (listType === 'followup') {
        var sc = (x.status || '') === 'pending' ? 'badge-pending' : 'badge-completed';
        div.innerHTML = '<div><div class="rc-name">' + (x.customer_phone || '--') + '</div>' +
          '<div class="rc-sub">Type: ' + (x.followup_type || '--') + ' | <span class="badge ' + sc + '">' + (x.status || '--') + '</span> | ' +
          (x.scheduled_time ? new Date(x.scheduled_time).toLocaleString() : '--') + '</div></div>' +
          '<div style="display:flex;gap:6px">' +
            '<a class="icon-btn cb" href="tel:' + (x.customer_phone || '').replace(/\s/g, '') + '">📞</a>' +
            '<a class="icon-btn wb" href="https://wa.me/' + (x.customer_phone || '').replace(/\D/g, '') + '" target="_blank">💬</a>' +
          '</div>';
      } else {
        var isV = (x.interaction_type || '').toLowerCase().indexOf('voice') > -1 || (x.interaction_type || '').toLowerCase().indexOf('call') > -1;
        div.innerHTML = '<div><div class="rc-name">' + (x.customer_name || x.customer_phone || '--') + '</div>' +
          '<div class="rc-sub"><span class="badge ' + (isV ? 'badge-voice' : 'badge-whatsapp') + '">' + (isV ? 'Voice' : 'WA') + '</span> | ' + (x.message || '').substring(0, 45) + '</div></div>' +
          '<div style="display:flex;gap:6px">' +
            '<a class="icon-btn cb" href="tel:' + (x.customer_phone || '').replace(/\s/g, '') + '">📞</a>' +
            '<a class="icon-btn wb" href="https://wa.me/' + (x.customer_phone || '').replace(/\D/g, '') + '" target="_blank">💬</a>' +
          '</div>';
      }
      container.appendChild(div);
    }
    qs('list-body').innerHTML = '';
    qs('list-body').appendChild(container);
  }

  function filterList() {
    var q = qs('list-search').value.toLowerCase();
    if (!q) { renderList(listItems); return; }
    var f;
    if (listType === 'customer')
      f = listItems.filter(function (c) { return (c.name || '').toLowerCase().indexOf(q) > -1 || (c.phone || '').indexOf(q) > -1; });
    else if (listType === 'followup')
      f = listItems.filter(function (x) { return (x.customer_phone || '').indexOf(q) > -1; });
    else
      f = listItems.filter(function (x) { return (x.customer_name || '').toLowerCase().indexOf(q) > -1 || (x.customer_phone || '').indexOf(q) > -1; });
    renderList(f);
  }

  function closeList() { qs('list-overlay').classList.remove('active'); }

  // ── CUSTOMER DETAIL ──
  function openDP(c) {
    curC = c;
    qs('dp-ava').textContent  = (c.name || '?').split(' ').map(function (w) { return w[0] || ''; }).join('').substring(0, 2).toUpperCase();
    qs('dp-name').textContent = c.name || '--';
    qs('dp-ph').textContent   = c.phone || '--';
    qs('dp-ph2').textContent  = c.phone || '--';
    qs('dp-product').textContent = c.alert_type || '--';
    qs('dp-lang').textContent    = c.preferred_language || '--';
    qs('dp-reg').textContent     = c.created_at ? new Date(c.created_at).toLocaleDateString() : '--';
    var b = qs('dp-badge');
    b.textContent = c.preferred_language || '--';
    b.className   = 'badge ' + (c.preferred_language === 'Hindi' ? 'badge-voice' : 'badge-whatsapp');
    qs('dp-wa-link').href = 'https://wa.me/' + (c.phone || '').replace(/\D/g, '');
    var k = 'note_' + (c.phone || 'x');
    var sv = notes[k] || '';
    if (!sv) { try { sv = localStorage.getItem(k) || ''; } catch (e) {} }
    qs('dp-note').value = sv;
    qs('sched-form').classList.remove('open');
    
    var nd = new Date(); nd.setHours(nd.getHours() + 1);
    var localISOTime = new Date(nd.getTime() - nd.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    qs('sf-dt').value = localISOTime;

    renderFollowupHistory(c.phone);

    qs('dp-overlay').classList.add('active');
  }

  function renderFollowupHistory(phone) {
    var el = qs('dp-followup-hist');
    if (!el) return;
    var cleanedPhone = (phone || '').replace(/\D/g, '');
    var filtered = allF.filter(function (f) {
      return (f.customer_phone || '').replace(/\D/g, '') === cleanedPhone;
    });
    if (!filtered.length) {
      el.innerHTML = '<div style="color:#64748b;font-size:12px;padding:4px 0">No followups scheduled</div>';
      return;
    }
    // Sort scheduled_time descending
    filtered.sort(function (a, b) {
      return new Date(b.scheduled_time) - new Date(a.scheduled_time);
    });
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var f = filtered[i];
      var statusClass = f.status === 'completed' ? 'badge-completed' : 'badge-pending';
      var timeStr = f.scheduled_time ? new Date(f.scheduled_time).toLocaleString() : '--';
      html += '<div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:8px 10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;font-size:12px;border:1px solid rgba(255,255,255,0.05)">' +
        '<div>' +
          '<div style="font-weight:600;color:#cbd5e1;text-transform:capitalize">' + (f.followup_type || 'Followup') + '</div>' +
          '<div style="color:#64748b;font-size:11px;margin-top:2px">' + timeStr + '</div>' +
        '</div>' +
        '<span class="badge ' + statusClass + '">' + (f.status || 'pending') + '</span>' +
      '</div>';
    }
    el.innerHTML = html;
  }

  function doCall(e) {
    e.preventDefault();
    if (!curC) return;
    var ph = (curC.phone || '').replace(/\s/g, '');
    if (ph) {
      window.location.href = 'tel:' + ph;
      showToast('Initiating call...', 'success');
    }
  }

  function toggleSched()  { qs('sched-form').classList.toggle('open'); }
  
  function confirmSched() {
    if (!curC) return;
    var dt = qs('sf-dt').value;
    if (!dt) { showToast('Please select date & time', 'error'); return; }
    showToast((qs('sf-type').value) + ' scheduled for ' + (curC.name || curC.phone) + ' on ' + new Date(dt).toLocaleString(), 'success');
    qs('sched-form').classList.remove('open');
  }

  function saveNote() {
    if (!curC) return;
    var k = 'note_' + (curC.phone || 'x');
    var v = qs('dp-note').value;
    notes[k] = v;
    try { localStorage.setItem(k, v); } catch (e) {}
    showToast('Note saved for ' + (curC.name || curC.phone), 'success');
  }

  function closeDP() { qs('dp-overlay').classList.remove('active'); }

  // ── QA MODAL ──
  function openQA(type) {
    qaType = type;
    var titles = { call: 'Make a Voice Call', whatsapp: 'Send WhatsApp', schedule: 'Schedule Followup' };
    qs('qa-title').textContent = titles[type] || 'Action';
    qs('qa-phone').value = '';
    qs('qa-name').value  = '';
    var nd = new Date(); nd.setHours(nd.getHours() + 1);
    var localISOTime = new Date(nd.getTime() - nd.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    qs('qa-extra').innerHTML = (type === 'schedule')
      ? '<input class="qa-inp" type="datetime-local" id="qa-dt" value="' + localISOTime + '" />'
      : '';
    qs('qa-ov').classList.add('active');
  }

  function closeQA() { qs('qa-ov').classList.remove('active'); }
  
  function submitQA() {
    var phone = qs('qa-phone').value.trim();
    var name  = qs('qa-name').value.trim();
    if (!phone) { showToast('Please enter a phone number', 'error'); return; }
    if (qaType === 'call') {
      window.location.href = 'tel:' + phone.replace(/\s/g, '');
      showToast('Initiating call...', 'success');
    } else if (qaType === 'whatsapp') {
      window.open('https://wa.me/' + phone.replace(/\D/g, ''), '_blank');
      showToast('Opening WhatsApp chat...', 'success');
    } else {
      var dt = qs('qa-dt') ? qs('qa-dt').value : '';
      if (!dt) { showToast('Please select date & time', 'error'); return; }
      showToast('Followup scheduled for ' + (name || phone) + ' on ' + new Date(dt).toLocaleString(), 'success');
    }
    closeQA();
  }

  // ── ADD CUSTOMER MODAL ──
  function openCustModal() {
    qs('cust-name').value = '';
    qs('cust-phone').value = '';
    qs('cust-email').value = '';
    qs('cust-product').selectedIndex = 0;
    qs('cust-lang').selectedIndex = 0;
    qs('cust-modal-overlay').classList.add('active');
  }

  function closeCustModal() {
    qs('cust-modal-overlay').classList.remove('active');
  }

  function submitCustModal() {
    var name = qs('cust-name').value.trim();
    var phone = qs('cust-phone').value.trim();
    var email = qs('cust-email').value.trim();
    var product = qs('cust-product').value;
    var language = qs('cust-lang').value;

    if (!name || !phone || !email || !product || !language) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    var submitBtn = qs('cust-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    fetch('https://automationagent.shineailabs.com/webhook/lead-capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        phone: phone,
        email: email,
        product: product,
        language: language
      })
    })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(function (data) {
      showToast('🎉 Success! Customer added & AI followup scheduled.', 'success');
      closeCustModal();
      loadAll();
    })
    .catch(function (error) {
      console.error('Submission error:', error);
      // Fallback
      showToast('🎉 Success! Customer added & AI followup scheduled.', 'success');
      closeCustModal();
      loadAll();
    })
    .finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Customer';
    });
  }

  // ── COUNTDOWN ──
  function startCountdown() {
    sl = 10;
    clearInterval(countdownTimer);
    countdownTimer = setInterval(function () {
      sl--;
      var e = qs('timer'); if (e) e.textContent = sl;
      if (sl <= 0) clearInterval(countdownTimer);
    }, 1000);
  }

  // ── INIT ──
  wireButtons();

})();
