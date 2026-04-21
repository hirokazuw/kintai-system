// ============================================
// index.js — 勤怠打刻スクリプト
// ============================================

// ============ 状態管理 ============
let staffData    = [];
let currentStaff = null;

// ============ 時計・日付 ============
function updateClock() {
  const now  = new Date();
  const pad  = n => String(n).padStart(2, '0');
  const days = ['日','月','火','水','木','金','土'];
  document.getElementById('clock').textContent =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  document.getElementById('date').textContent =
    `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日（${days[now.getDay()]}）`;
}
setInterval(updateClock, 1000);
updateClock();

// ============ 画面切り替え ============
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ============ スタッフ一覧＋本日状況を取得 ============
async function loadStaff() {
  try {
    const [staffRes, statusRes] = await Promise.all([
      fetch('get_staff.php'),
      fetch('get_today_status.php'),
    ]);
    const staffJson  = await staffRes.json();
    const statusJson = await statusRes.json();

    if (!staffJson.success) throw new Error(staffJson.message);

    staffData = staffJson.staff.map(s => ({ ...s, status: 'none' }));

    if (statusJson.success) {
      statusJson.statuses.forEach(row => {
        const s = staffData.find(s => s.id == row.staff_id);
        if (s) s.status = row.status;
      });
    }
    renderList();
  } catch (e) {
    document.getElementById('staff-list').innerHTML =
      '<p style="color:#e53e3e">スタッフ一覧の取得に失敗しました</p>';
  }
}

// ============ 一覧描画 ============
function renderList() {
  const container = document.getElementById('staff-list');
  container.innerHTML = '';
  const labelMap = { none: '未出勤', in: '在籍中', out: '退勤済' };

  staffData.forEach(s => {
    const btn = document.createElement('button');
    btn.className = `staff-btn status-${s.status}`;
    btn.innerHTML = `
      <span>${s.name}</span>
      <span class="status-badge">${labelMap[s.status]}</span>`;
    if (s.status !== 'out') btn.addEventListener('click', () => openStamp(s));
    container.appendChild(btn);
  });
}

// ============ 打刻画面を開く ============
function openStamp(staff) {
  currentStaff = staff;
  document.getElementById('stamp-name').textContent = staff.name + ' さん';
  const msgMap = { none: '本日はまだ出勤していません', in: '現在出勤中です' };
  document.getElementById('stamp-status-msg').textContent = msgMap[staff.status] || '';
  document.getElementById('stamp-in-btn').disabled  = (staff.status !== 'none');
  document.getElementById('stamp-out-btn').disabled = (staff.status !== 'in');
  const result = document.getElementById('stamp-result');
  result.style.display = 'none';
  result.className = '';
  showScreen('screen-stamp');
}

// ============ 打刻実行 ============
async function doStamp(type) {
  if (!currentStaff) return;

  const loading = document.getElementById('loading');
  const result  = document.getElementById('stamp-result');
  const inBtn   = document.getElementById('stamp-in-btn');
  const outBtn  = document.getElementById('stamp-out-btn');

  inBtn.disabled = outBtn.disabled = true;
  loading.style.display = 'block';
  result.style.display  = 'none';

  try {
    const fd = new FormData();
    fd.append('staff_id', currentStaff.id);
    fd.append('type', type);

    const res  = await fetch('stamp.php', { method: 'POST', body: fd });
    const data = await res.json();

    loading.style.display = 'none';
    result.className      = data.success ? 'success' : 'error';
    result.textContent    = data.message;
    result.style.display  = 'block';

    if (data.success) {
      currentStaff.status = type;
      const s = staffData.find(s => s.id === currentStaff.id);
      if (s) s.status = type;
      setTimeout(() => { renderList(); showScreen('screen-list'); }, 1200);
    } else {
      inBtn.disabled  = (currentStaff.status !== 'none');
      outBtn.disabled = (currentStaff.status !== 'in');
    }
  } catch (e) {
    loading.style.display = 'none';
    result.className      = 'error';
    result.textContent    = '通信エラーが発生しました';
    result.style.display  = 'block';
    inBtn.disabled  = (currentStaff.status !== 'none');
    outBtn.disabled = (currentStaff.status !== 'in');
  }
}

// ============ イベント ============
document.getElementById('stamp-in-btn') .addEventListener('click', () => doStamp('in'));
document.getElementById('stamp-out-btn').addEventListener('click', () => doStamp('out'));
document.getElementById('back-btn')     .addEventListener('click', () => showScreen('screen-list'));

// ============ 初期化 ============
loadStaff();
