(function() {
  // ── ALL URLS HARDCODED — zero template variables ──
  var D_URL = 'https://automationagent.shineailabs.com/webhook/dashboard';
  var A_URL = 'https://automationagent.shineailabs.com/webhook/activity';
  var C_URL = 'https://automationagent.shineailabs.com/webhook/customers';
  var F_URL = 'https://automationagent.shineailabs.com/webhook/followups';

  var USERS = { 'admin': 'shine123', 'nitin': 'admin123' };
  var allC = [], allF = [], allI = [];
  var chartInst = null, listItems = [], listType = '', curC = null, notes = {}, qaType = '';
  var refreshTimer = null, countdownTimer = null, sl = 10;

  // ── UTILS ──
  function qs(id) { return document.getElementById(id); }

  function showToast(msg) {
    var t = qs('toast');
    t.textContent = msg;
    t.className = 'toast show';
    setTimeout(function() { t.className = 'toast'; }, 3000);
  }

  function parseArr(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.data)) return raw.data;
    return [];
  }

  function safeFetch(url, cb) {
    fetch(url)
      .then(function(r) { return r.text(); })
      .then(function(txt) {
        var parsed;
        try { parsed = JSON.parse(txt); } catch(e) { cb([]); return; }
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch(e) { cb([]); return; }
        }
        cb(parseArr(parsed));
      })
      .catch(function() { cb([]); });
  }

  // ── AUTH ──
  function doLogin() {
    var u = qs('un').value.trim();
    var p = qs('pw').value.trim();
    if (USERS[u] && USERS[u] === p) {
      qs('login-page').style.display = 'none';
      qs('main-page').style.display  = 'block';
      qs('login-error').style.display = 'none';
      loadAll();
      refreshTimer = setInterval(loadAll, 10000);
    } else {
      qs('login-error').style.display = 'block';
    }
  }

  // ── LOGOUT ──
  function doLogout() {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
    qs('main-page').style.display  = 'none';
    qs('login-page').style.display = 'flex';
    qs('un').value = '';
    qs('pw').value = '';
  }

  // ── WIRE UP ALL BUTTONS (no inline onclick anywhere) ──
  function wireButtons() {
    qs('login-btn').addEventListener('click', doLogin);
    qs('un').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
    qs('pw').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
    qs('logout-btn').addEventListener('click', doLogout);
    qs('refresh-btn').addEventListener('click', loadAll);
    qs('search-input').addEventListener('input', filterCustomers);
    qs('list-close-btn').addEventListener('click', closeList);
    qs('list-overlay').addEventListener('click', function(e) { if (e.target === qs('list-overlay')) closeList(); });
    qs('list-search').addEventListener('input', filterList);
    qs('dp-close-btn').addEventListener('click', closeDP);
    qs('dp-overlay').addEventListener('click', function(e) { if (e.target === qs('dp-overlay')) closeDP(); });
    qs('dp-call-link').addEventListener('click', doCall);
    qs('dp-sched-btn').addEventListener('click', toggleSched);
    qs('sf-ok-btn').addEventListener('click', confirmSched);
    qs('sf-cancel-btn').addEventListener('click', toggleSched);
    qs('dp-save-btn').addEventListener('click', saveNote);
    qs('qa-call-btn').addEventListener('click',   function() { openQA('call'); });
    qs('qa-wa-btn').addEventListener('click',     function() { openQA('whatsapp'); });
    qs('qa-sched-btn').addEventListener('click',  function() { openQA('schedule'); });
    qs('qa-report-btn').addEventListener('click', function() { showToast('Export coming soon!'); });
    qs('qa-confirm-btn').addEventListener('click', submitQA);
    qs('qa-cancel-btn').addEventListener('click',  closeQA);
  }

  // ── LOAD ALL ──
  function loadAll() {
    loadMetrics();
    loadActivity();
    loadCustomersAndFollowups();
    startCountdown();
  }

  // ── METRICS ──
  function loadMetrics() {
    fetch(D_URL)
      .then(function(r) { return r.text(); })
      .then(function(txt) {
        var d;
        try { d = JSON.parse(txt); } catch(e) { throw e; }
        if (typeof d === 'string') d = JSON.parse(d);
        qs('error-bar').style.display = 'none';
        var rate = d.success_rate || 0;
        qs('dashboard').innerHTML =
          card('blue',   '&#128101;', 'Total Customers',    d.total_customers,             'Registered in system', 'all') +
          card('orange', '&#9203;',   'Pending Followups',  d.pending_followups,           'Awaiting action',      'pending') +
          card('green',  '&#9989;',   'Completed',          d.completed_followups,         'Successfully sent',    'completed') +
          card('purple', '&#128222;', 'Voice Calls',        d.voice_calls_sent,            'AI calls made',        'voice') +
          card('cyan',   '&#128172;', 'WhatsApp Sent',      d.whatsapp_sent,               'Messages delivered',   'whatsapp') +
          card('pink',   '&#127470;&#127475;', 'Hindi',     d.hindi_customers,             'Preferred Hindi',      'hindi') +
          card('indigo', '&#127760;', 'English',            d.english_customers,           'Preferred English',    'english') +
          card('teal',   '&#127897;', 'Voice Interactions', d.total_voice_interactions,    'Logged voice events',  'voice') +
          card('red',    '&#128241;', 'WA Interactions',    d.total_whatsapp_interactions, 'Logged chat events',   'whatsapp') +
          '<div class="card yellow" data-list="all"><div class="card-icon">&#127919;</div>' +
          '<div class="card-label">Success Rate</div><div class="card-value" style="color:#facc15">' + rate + '%</div>' +
          '<div class="card-sub">Completion rate</div>' +
          '<div class="success-bar-wrap"><div class="success-bar-fill" style="width:' + rate + '%"></div></div>' +
          '<div class="card-click-hint">click to view</div></div>';

        // wire card clicks after render
        var cards = qs('dashboard').querySelectorAll('.card');
        for (var i = 0; i < cards.length; i++) {
          (function(el) {
            el.addEventListener('click', function() { showList(el.getAttribute('data-list')); });
          })(cards[i]);
        }

        updateChart(d);
      })
      .catch(function(e) {
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

  function updateChart(d) {
    var ctx = qs('myChart'); if (!ctx) return;
    if (chartInst) chartInst.destroy();
    chartInst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Voice', 'WhatsApp', 'Completed', 'Pending', 'Customers'],
        datasets: [{
          label: 'Count',
          data: [d.voice_calls_sent||0, d.whatsapp_sent||0, d.completed_followups||0, d.pending_followups||0, d.total_customers||0],
          backgroundColor: ['rgba(139,92,246,0.7)','rgba(16,185,129,0.7)','rgba(34,197,94,0.7)','rgba(245,158,11,0.7)','rgba(59,130,246,0.7)'],
          borderColor: ['#8b5cf6','#10b981','#22c55e','#f59e0b','#3b82f6'],
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

  // ── ACTIVITY ──
  function loadActivity() {
    safeFetch(A_URL, function(list) {
      allI = list; updateDebug();
      if (!list.length) { qs('activity-table').innerHTML = '<div style="color:#475569;font-size:13px">No recent activity</div>'; return; }
      var rows = '';
      var top = list.slice(0, 10);
      for (var i = 0; i < top.length; i++) {
        var r = top[i];
        var isV = (r.interaction_type||'').toLowerCase().indexOf('voice') > -1 || (r.interaction_type||'').toLowerCase().indexOf('call') > -1;
        rows += '<tr><td style="color:#64748b;white-space:nowrap">' + (r.created_at ? new Date(r.created_at).toLocaleTimeString() : '--') + '</td>' +
          '<td><span class="badge ' + (isV ? 'badge-voice' : 'badge-whatsapp') + '">' + (isV ? 'Voice' : 'WA') + '</span></td>' +
          '<td>' + (r.customer_name || r.customer_phone || '--') + '</td>' +
          '<td style="color:#64748b">' + (r.message||'').substring(0,30) + '</td></tr>';
      }
      qs('activity-table').innerHTML = '<table class="data-table"><thead><tr><th>Time</th><th>Type</th><th>Customer</th><th>Message</th></tr></thead><tbody>' + rows + '</tbody></table>';
    });
  }

  // ── CUSTOMERS + FOLLOWUPS ──
  function loadCustomersAndFollowups() {
    safeFetch(C_URL, function(cList) {
      allC = cList; updateDebug(); renderCustomers(allC);
    });
    safeFetch(F_URL, function(fList) {
      allF = fList; updateDebug();
    });
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
    qs('dbg-msg').textContent = msgs.length ? 'Still empty: ' + msgs.join(', ') : 'All data loaded OK';
  }

  function renderCustomers(list) {
    qs('customer-count').textContent = list.length + ' customers';
    if (!list.length) { qs('customer-table').innerHTML = '<div style="color:#475569;font-size:13px">No customers found</div>'; return; }
    var rows = '';
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      rows += '<tr data-idx="' + i + '" style="cursor:pointer">' +
        '<td>' + (c.name||'--') + '</td>' +
        '<td style="color:#64748b">' + (c.phone||'--') + '</td>' +
        '<td><span class="badge ' + (c.preferred_language==='Hindi'?'badge-voice':'badge-whatsapp') + '">' + (c.preferred_language||'--') + '</span></td>' +
        '<td style="color:#94a3b8">' + (c.alert_type||'--') + '</td>' +
        '<td style="display:flex;gap:6px;align-items:center">' +
          '<a class="icon-btn cb" href="tel:' + (c.phone||'').replace(/\s/g,'') + '" title="Call">&#128222;</a>' +
          '<a class="icon-btn wb" href="https://wa.me/' + (c.phone||'').replace(/\D/g,'') + '" target="_blank" title="WA">&#128172;</a>' +
        '</td></tr>';
    }
    var tbl = document.createElement('table');
    tbl.className = 'data-table';
    tbl.innerHTML = '<thead><tr><th>Name</th><th>Phone</th><th>Language</th><th>Product</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody>';
    // wire row clicks
    var tbody = tbl.querySelector('tbody');
    var trs = tbody.querySelectorAll('tr');
    for (var j = 0; j < trs.length; j++) {
      (function(tr, idx) {
        tr.addEventListener('click', function(e) {
          if (e.target.tagName === 'A') return;
          openDP(list[idx]);
        });
      })(trs[j], j);
    }
    qs('customer-table').innerHTML = '';
    qs('customer-table').appendChild(tbl);
  }

  function filterCustomers() {
    var q = qs('search-input').value.toLowerCase();
    var filtered = allC.filter(function(c) {
      return (c.name||'').toLowerCase().indexOf(q) > -1 ||
             (c.phone||'').indexOf(q) > -1 ||
             (c.alert_type||'').toLowerCase().indexOf(q) > -1;
    });
    renderCustomers(filtered);
  }

  // ── LIST MODAL ──
  function showList(type) {
    qs('list-search').value = '';
    var items = [], title = '';
    if (type === 'all')       { items = allC; title = 'All Customers'; listType = 'customer'; }
    else if (type === 'hindi'){ items = allC.filter(function(c){ return (c.preferred_language||'').toLowerCase() === 'hindi'; }); title = 'Hindi Customers'; listType = 'customer'; }
    else if (type === 'english'){ items = allC.filter(function(c){ return (c.preferred_language||'').toLowerCase() === 'english'; }); title = 'English Customers'; listType = 'customer'; }
    else if (type === 'pending'){
      items = allF.filter(function(f){ return (f.status||'').toLowerCase() === 'pending'; });
      title = 'Pending Followups'; listType = 'followup';
      if (!items.length) { items = allC; title = 'Customers (followups empty)'; listType = 'customer'; }
    } else if (type === 'completed') {
      items = allF.filter(function(f){ return (f.status||'').toLowerCase() === 'completed'; });
      title = 'Completed Followups'; listType = 'followup';
      if (!items.length) { items = allC; title = 'Customers (followups empty)'; listType = 'customer'; }
    } else if (type === 'voice') {
      items = allI.filter(function(i){ var t=(i.interaction_type||'').toLowerCase(); return t.indexOf('voice')>-1||t.indexOf('call')>-1; });
      title = 'Voice Records'; listType = 'interaction';
      if (!items.length) { items = allC; title = 'Customers (no voice data)'; listType = 'customer'; }
    } else if (type === 'whatsapp') {
      items = allI.filter(function(i){ var t=(i.interaction_type||'').toLowerCase(); return t.indexOf('whatsapp')>-1||t.indexOf('wa')>-1; });
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
        div.innerHTML = '<div><div class="rc-name">' + (x.name||'--') + '</div>' +
          '<div class="rc-sub">' + (x.phone||'--') + ' | ' + (x.alert_type||'--') + ' | ' + (x.preferred_language||'--') + '</div></div>' +
          '<div style="display:flex;gap:6px">' +
            '<a class="icon-btn cb" href="tel:' + (x.phone||'').replace(/\s/g,'') + '">&#128222;</a>' +
            '<a class="icon-btn wb" href="https://wa.me/' + (x.phone||'').replace(/\D/g,'') + '" target="_blank">&#128172;</a>' +
          '</div>';
        (function(customer) {
          div.addEventListener('click', function(e) { if (e.target.tagName !== 'A') openDP(customer); });
        })(x);
      } else if (listType === 'followup') {
        var sc = (x.status||'') === 'pending' ? 'badge-pending' : 'badge-completed';
        div.innerHTML = '<div><div class="rc-name">' + (x.customer_phone||'--') + '</div>' +
          '<div class="rc-sub">Type: ' + (x.followup_type||'--') + ' | <span class="badge ' + sc + '">' + (x.status||'--') + '</span> | ' +
          (x.scheduled_time ? new Date(x.scheduled_time).toLocaleString() : '--') + '</div></div>' +
          '<div style="display:flex;gap:6px">' +
            '<a class="icon-btn cb" href="tel:' + (x.customer_phone||'').replace(/\s/g,'') + '">&#128222;</a>' +
            '<a class="icon-btn wb" href="https://wa.me/' + (x.customer_phone||'').replace(/\D/g,'') + '" target="_blank">&#128172;</a>' +
          '</div>';
      } else {
        div.innerHTML = '<div><div class="rc-name">' + (x.customer_name||x.customer_phone||'--') + '</div>' +
          '<div class="rc-sub">' + (x.customer_phone||'') + ' | ' + (x.interaction_type||'--') + ' | ' + (x.message||'').substring(0,40) + '</div></div>' +
          '<div style="display:flex;gap:6px">' +
            '<a class="icon-btn cb" href="tel:' + (x.customer_phone||'').replace(/\s/g,'') + '">&#128222;</a>' +
            '<a class="icon-btn wb" href="https://wa.me/' + (x.customer_phone||'').replace(/\D/g,'') + '" target="_blank">&#128172;</a>' +
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
      f = listItems.filter(function(c){ return (c.name||'').toLowerCase().indexOf(q)>-1||(c.phone||'').indexOf(q)>-1; });
    else if (listType === 'followup')
      f = listItems.filter(function(x){ return (x.customer_phone||'').indexOf(q)>-1; });
    else
      f = listItems.filter(function(x){ return (x.customer_name||'').toLowerCase().indexOf(q)>-1||(x.customer_phone||'').indexOf(q)>-1; });
    renderList(f);
  }

  function closeList() { qs('list-overlay').classList.remove('active'); }

  // ── CUSTOMER DETAIL ──
  function openDP(c) {
    curC = c;
    qs('dp-ava').textContent  = (c.name||'?').split(' ').map(function(w){ return w[0]||''; }).join('').substring(0,2).toUpperCase();
    qs('dp-name').textContent = c.name || '--';
    qs('dp-ph').textContent   = c.phone || '--';
    qs('dp-ph2').textContent  = c.phone || '--';
    qs('dp-product').textContent = c.alert_type || '--';
    qs('dp-lang').textContent    = c.preferred_language || '--';
    qs('dp-reg').textContent     = c.created_at ? new Date(c.created_at).toLocaleDateString() : '--';
    var b = qs('dp-badge');
    b.textContent = c.preferred_language || '--';
    b.className   = 'badge ' + (c.preferred_language === 'Hindi' ? 'badge-voice' : 'badge-whatsapp');
    qs('dp-wa-link').href = 'https://wa.me/' + (c.phone||'').replace(/\D/g,'');
    var k = 'note_' + (c.phone||'x');
    var sv = notes[k] || '';
    if (!sv) { try { sv = localStorage.getItem(k) || ''; } catch(e) {} }
    qs('dp-note').value = sv;
    qs('sched-form').classList.remove('open');
    var nd = new Date(); nd.setHours(nd.getHours()+1);
    qs('sf-dt').value = nd.toISOString().slice(0,16);
    qs('dp-overlay').classList.add('active');
  }

  function doCall(e) {
    e.preventDefault();
    if (!curC) return;
    var ph = (curC.phone||'').replace(/\s/g,'');
    if (ph) window.location.href = 'tel:' + ph;
  }

  function toggleSched()  { qs('sched-form').classList.toggle('open'); }
  function confirmSched() {
    if (!curC) return;
    var dt = qs('sf-dt').value;
    if (!dt) { showToast('Please select date & time'); return; }
    showToast((qs('sf-type').value) + ' scheduled for ' + (curC.name||curC.phone) + ' on ' + new Date(dt).toLocaleString());
    qs('sched-form').classList.remove('open');
  }
  function saveNote() {
    if (!curC) return;
    var k = 'note_' + (curC.phone||'x');
    var v = qs('dp-note').value;
    notes[k] = v;
    try { localStorage.setItem(k, v); } catch(e) {}
    showToast('Note saved for ' + (curC.name||curC.phone));
  }
  function closeDP() { qs('dp-overlay').classList.remove('active'); }

  // ── QA MODAL ──
  function openQA(type) {
    qaType = type;
    var titles = { call: 'Make a Voice Call', whatsapp: 'Send WhatsApp', schedule: 'Schedule Followup' };
    qs('qa-title').textContent = titles[type] || 'Action';
    qs('qa-phone').value = '';
    qs('qa-name').value  = '';
    var nd = new Date(); nd.setHours(nd.getHours()+1);
    qs('qa-extra').innerHTML = (type === 'schedule')
      ? '<input class="qa-inp" type="datetime-local" id="qa-dt" value="' + nd.toISOString().slice(0,16) + '" />'
      : '';
    qs('qa-ov').classList.add('active');
  }
  function closeQA() { qs('qa-ov').classList.remove('active'); }
  function submitQA() {
    var phone = qs('qa-phone').value.trim();
    var name  = qs('qa-name').value.trim();
    if (!phone) { alert('Please enter a phone number'); return; }
    if (qaType === 'call')          window.location.href = 'tel:' + phone.replace(/\s/g,'');
    else if (qaType === 'whatsapp') window.open('https://wa.me/' + phone.replace(/\D/g,''), '_blank');
    else showToast('Followup scheduled for ' + (name||phone));
    closeQA();
  }

  // ── COUNTDOWN ──
  function startCountdown() {
    sl = 10;
    clearInterval(countdownTimer);
    countdownTimer = setInterval(function() {
      sl--;
      var e = qs('timer'); if (e) e.textContent = sl;
      if (sl <= 0) clearInterval(countdownTimer);
    }, 1000);
  }

  // ── INIT ──
  wireButtons();

})();
