// ============================================
// admin.js — 管理者機能スクリプト
// ============================================

const ADMIN_PASSWORD = 'admin1234'; // ※実際のパスワードに書き換えてください

let currentMode    = 'today';
let staffData      = [];
let monthLogsCache = [];
let monthCache     = '';

// ============ 認証 ============
document.getElementById('auth-btn').addEventListener('click', tryLogin);
document.getElementById('pw-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') tryLogin();
});

function tryLogin() {
  const pw = document.getElementById('pw-input').value;
  if (pw === ADMIN_PASSWORD) {
    document.getElementById('screen-auth').style.display = 'none';
    document.getElementById('screen-log').style.display  = 'block';
    initMonthInput();
    loadLogs('today');
  } else {
    document.getElementById('auth-error').style.display = 'block';
    document.getElementById('pw-input').value = '';
    document.getElementById('pw-input').focus();
  }
}

document.getElementById('logout-btn').addEventListener('click', () => {
  document.getElementById('screen-auth').style.display = '';
  document.getElementById('screen-log').style.display  = 'none';
  document.getElementById('pw-input').value = '';
  document.getElementById('auth-error').style.display = 'none';
});

// ============ 月入力の初期値 ============
function initMonthInput() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('month-input').value = `${y}-${m}`;
}

// ============ タブ切り替え ============
document.getElementById('tab-today').addEventListener('click', () => switchTab('today'));
document.getElementById('tab-month').addEventListener('click', () => switchTab('month'));
document.getElementById('tab-fix')  .addEventListener('click', () => switchTab('fix'));
document.getElementById('tab-staff').addEventListener('click', () => switchTab('staff'));

function switchTab(mode) {
  currentMode = mode;
  ['today','month','fix','staff'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === mode);
  });
  document.getElementById('month-selector').style.display = mode === 'month' ? 'flex'  : 'none';
  document.getElementById('fix-panel')     .style.display = mode === 'fix'   ? 'block' : 'none';
  document.getElementById('staff-panel')   .style.display = mode === 'staff' ? 'block' : 'none';

  const logCard = document.querySelector('.log-card');
  if (logCard) logCard.style.display = (mode === 'fix' || mode === 'staff') ? 'none' : 'block';

  if      (mode === 'staff') loadStaffAdmin();
  else if (mode === 'fix')   initFixPanel();
  else                       loadLogs(mode);
}

document.getElementById('reload-btn').addEventListener('click', () => loadLogs('month'));
document.getElementById('export-btn').addEventListener('click', exportExcel);

// ============ ログ取得 ============
async function loadLogs(mode) {
  showMessage('読み込み中...');
  try {
    let url = `get_logs.php?mode=${mode}`;
    if (mode === 'month') url += `&month=${document.getElementById('month-input').value}`;
    const res  = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (mode === 'today') renderToday(data.logs, data.date);
    else                  renderMonth(data.logs, data.month);
  } catch (e) {
    showMessage('データの取得に失敗しました：' + e.message);
  }
}

// ============ 当日ログ描画 ============
function renderToday(logs, date) {
  if (logs.length === 0) { showMessage(`${date} の打刻記録はありません`); return; }
  document.getElementById('log-thead').innerHTML =
    '<tr><th>スタッフ</th><th>種別</th><th>時刻</th></tr>';
  const tbody = document.getElementById('log-tbody');
  tbody.innerHTML = '';
  logs.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.name}</td><td class="${r.type === '出勤' ? 'type-in' : 'type-out'}">${r.type}</td><td>${r.stamped_at}</td>`;
    tbody.appendChild(tr);
  });
  showTable();
}

// ============ 当月ログ描画 ============
function renderMonth(logs, month) {
  monthLogsCache = logs;
  monthCache     = month;
  document.getElementById('export-btn').disabled = (logs.length === 0);
  if (logs.length === 0) { showMessage(`${month} の打刻記録はありません`); return; }
  document.getElementById('log-thead').innerHTML =
    '<tr><th>スタッフ</th><th>日付</th><th>出勤</th><th>退勤</th><th>在籍時間</th></tr>';
  const tbody = document.getElementById('log-tbody');
  tbody.innerHTML = '';
  logs.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.name}</td><td>${r.date}</td><td class="type-in">${r.in_time}</td><td class="type-out">${r.out_time}</td><td>${r.duration}</td>`;
    tbody.appendChild(tr);
  });
  showTable();
}

// ============ Excelエクスポート ============
function exportExcel() {
  if (monthLogsCache.length === 0) return;
  const [year, mon] = monthCache.split('-');
  const staffList   = [...new Set(monthLogsCache.map(r => r.name))];
  const dateList    = [...new Set(monthLogsCache.map(r => r.date))].sort();
  const dayNames    = ['日','月','火','水','木','金','土'];

  const header1 = ['日付'];
  const header2 = [''];
  staffList.forEach(name => { header1.push(name, '', ''); header2.push('出勤','退勤','在籍時間'); });

  const dataRows = dateList.map(date => {
    const row = [`${parseInt(mon)}/${parseInt(date.slice(8))}(${dayNames[new Date(date).getDay()]})`];
    staffList.forEach(name => {
      const rec = monthLogsCache.find(r => r.name === name && r.date === date);
      row.push(rec ? rec.in_time : '--', rec ? rec.out_time : '--', rec ? rec.duration : '--');
    });
    return row;
  });

  const ws = XLSX.utils.aoa_to_sheet([header1, header2, ...dataRows]);
  const colWidths = [{ wch: 12 }];
  staffList.forEach(() => colWidths.push({ wch: 8 }, { wch: 8 }, { wch: 10 }));
  ws['!cols']   = colWidths;
  ws['!merges'] = staffList.map((_, i) => ({ s: { r:0, c:1+i*3 }, e: { r:0, c:3+i*3 } }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${year}年${parseInt(mon)}月`);
  XLSX.writeFile(wb, `勤怠_${year}${mon}.xlsx`);
}

// ============ 表示切り替えヘルパー ============
function showMessage(msg) {
  document.getElementById('log-message').textContent      = msg;
  document.getElementById('log-message').style.display    = 'block';
  document.getElementById('log-table-wrap').style.display = 'none';
}
function showTable() {
  document.getElementById('log-message').style.display    = 'none';
  document.getElementById('log-table-wrap').style.display = 'block';
}

// ============ 打刻修正 ============
async function initFixPanel() {
  // 今日の日付をデフォルトに（未設定の場合のみ）
  const fixDate = document.getElementById('fix-date');
  if (!fixDate.value) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    fixDate.value = `${y}-${m}-${d}`;
  }

  // fix-resultをクリア
  document.getElementById('fix-result').innerHTML = '<p class="msg-placeholder">再読み込み中...</p>';
  document.getElementById('fix-msg').style.display = 'none';

  // スタッフ一覧をDBから毎回取得してセレクトボックスに反映
  const sel      = document.getElementById('fix-staff');
  const prevId   = sel.value; // 選択中のスタッフIDを保持
  sel.innerHTML  = '<option value="">読み込み中...</option>';
  try {
    const res  = await fetch('get_staff.php');
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    staffData = data.staff;
    sel.innerHTML = '<option value="">スタッフを選択</option>';
    data.staff.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.name;
      sel.appendChild(opt);
    });
    // 以前選択していたスタッフを復元
    if (prevId) sel.value = prevId;
  } catch (e) {
    sel.innerHTML = '<option value="">取得失敗</option>';
  }

  // スタッフが選択済みなら自動で再検索
  if (sel.value) {
    document.getElementById('fix-result').innerHTML = '<p class="msg-placeholder">再読み込み中...</p>';
    await searchStamps();
  } else {
    document.getElementById('fix-result').innerHTML = '<p class="msg-placeholder">日付とスタッフを選んで検索してください</p>';
  }
}

document.getElementById('fix-search-btn').addEventListener('click', searchStamps);

async function searchStamps() {
  const date    = document.getElementById('fix-date').value;
  const staffId = document.getElementById('fix-staff').value;
  const result  = document.getElementById('fix-result');
  document.getElementById('fix-msg').style.display = 'none';

  if (!date || !staffId) {
    result.innerHTML = '<p class="msg-placeholder" style="color:#e53e3e">日付とスタッフを選択してください</p>';
    return;
  }
  result.innerHTML = '<p class="msg-placeholder">検索中...</p>';
  try {
    const res  = await fetch(`get_stamp_detail.php?staff_id=${staffId}&date=${date}`, { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    renderFixResult(data.stamps, staffId, date);
  } catch (e) {
    result.innerHTML = `<p style="color:#e53e3e">取得失敗: ${e.message}</p>`;
  }
}

function renderFixResult(stamps, staffId, date) {
  const result    = document.getElementById('fix-result');
  const typeMap   = { in: '出勤', out: '退勤' };
  const typeColor = { in: '#2f855a', out: '#c53030' };

  let html = `<div style="margin-bottom:12px;font-size:0.9rem;color:#718096">${date} の打刻記録</div>`;
  if (stamps.length === 0) {
    html += '<p class="msg-placeholder">打刻記録がありません</p>';
  } else {
    stamps.forEach(s => {
      html += `
        <div class="fix-row">
          <span class="fix-type-label" style="color:${typeColor[s.type]}">${typeMap[s.type]}</span>
          <input type="time" value="${s.time}" data-id="${s.id}" class="fix-time-input" />
          <button data-id="${s.id}" class="fix-save-btn">保存</button>
          <button data-id="${s.id}" class="fix-del-btn">削除</button>
        </div>`;
    });
  }

  html += `
    <div class="fix-add-area">
      <div class="fix-add-label">打刻を追加</div>
      <div class="fix-add-bar">
        <select id="add-type"><option value="in">出勤</option><option value="out">退勤</option></select>
        <input type="time" id="add-time" />
        <button id="fix-add-btn" data-staff="${staffId}" data-date="${date}">追加</button>
      </div>
    </div>`;

  result.innerHTML = html;

  document.querySelectorAll('.fix-save-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const input = document.querySelector(`.fix-time-input[data-id="${btn.dataset.id}"]`);
      await fixAction('update', { id: btn.dataset.id, time: input.value });
    });
  });
  document.querySelectorAll('.fix-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('この打刻を削除しますか？')) return;
      await fixAction('delete', { id: btn.dataset.id });
    });
  });
  document.getElementById('fix-add-btn').addEventListener('click', async () => {
    const btn  = document.getElementById('fix-add-btn');
    const type = document.getElementById('add-type').value;
    const time = document.getElementById('add-time').value;
    if (!time) { alert('時刻を入力してください'); return; }
    await fixAction('add', { staff_id: btn.dataset.staff, type, date: btn.dataset.date, time });
  });
}

async function fixAction(action, params) {
  const msg = document.getElementById('fix-msg');
  const fd  = new FormData();
  fd.append('action', action);
  Object.entries(params).forEach(([k, v]) => fd.append(k, v));
  try {
    const res  = await fetch('fix_stamp.php', { method: 'POST', body: fd });
    const data = await res.json();
    msg.className = data.success ? 'msg-success' : 'msg-error';
    msg.textContent = data.message;
    msg.style.display = 'block';
    if (data.success) {
      document.getElementById('fix-result').innerHTML = '<p class="msg-placeholder">再読み込み中...</p>';
      setTimeout(async () => await searchStamps(), 2000);
    }
  } catch (e) {
    msg.className = 'msg-error';
    msg.textContent = '通信エラーが発生しました';
    msg.style.display = 'block';
  }
}

// ============ スタッフ管理 ============
async function loadStaffAdmin() {
  document.getElementById('staff-list-admin').innerHTML = '<p class="msg-placeholder">読み込み中...</p>';
  try {
    const res  = await fetch('get_staff.php', { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    staffData = data.staff;
    renderStaffAdmin(data.staff);
  } catch (e) {
    document.getElementById('staff-list-admin').innerHTML = `<p style="color:#e53e3e">取得失敗: ${e.message}</p>`;
  }
}

function renderStaffAdmin(list) {
  const container = document.getElementById('staff-list-admin');
  if (list.length === 0) { container.innerHTML = '<p class="msg-placeholder">スタッフが登録されていません</p>'; return; }
  container.innerHTML = '';
  list.forEach(s => {
    const row = document.createElement('div');
    row.className = 'staff-row';
    row.innerHTML = `<span>${s.name}</span><button data-id="${s.id}" data-name="${s.name}" class="staff-del-btn">削除</button>`;
    container.appendChild(row);
  });
  document.querySelectorAll('.staff-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`「${btn.dataset.name}」を削除しますか？\n打刻ログも全て削除されます。`)) return;
      await staffAction('delete', { id: btn.dataset.id });
    });
  });
}

async function staffAction(action, params) {
  const msg = document.getElementById('staff-msg');
  msg.style.display = 'none';
  const fd = new FormData();
  fd.append('action', action);
  Object.entries(params).forEach(([k, v]) => fd.append(k, v));
  try {
    const res  = await fetch('staff_api.php', { method: 'POST', body: fd });
    const data = await res.json();
    msg.className = data.success ? 'msg-success' : 'msg-error';
    msg.textContent = data.message;
    msg.style.display = 'block';
    if (data.success) {
      if (action === 'add') document.getElementById('new-staff-name').value = '';
      loadStaffAdmin();
    }
  } catch (e) {
    msg.className = 'msg-error';
    msg.textContent = '通信エラーが発生しました';
    msg.style.display = 'block';
  }
}

document.getElementById('add-staff-btn').addEventListener('click', () => {
  const name = document.getElementById('new-staff-name').value.trim();
  if (!name) { document.getElementById('new-staff-name').focus(); return; }
  staffAction('add', { name });
});
document.getElementById('new-staff-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('add-staff-btn').click();
});
