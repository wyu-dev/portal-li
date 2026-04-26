let selectedStatus = '';
let hadirLoaded = false;

async function loadHadir() {
  if (hadirLoaded) return;
  renderHadirToday();
  loadRekap();
}

async function renderHadirToday() {
  const box = document.getElementById('hadirTodayBox');
  box.innerHTML = `<div style="text-align:center;padding:16px;color:var(--mid);font-size:12px;">Menyemak kehadiran hari ini...</div>`;

  try {
    const res  = await fetch(`${GAS_URL}?action=checkHadir&ndp=${encodeURIComponent(session.ndp)}`);
    const json = await res.json();
    const tarikh = json.tarikh || '—';

    if (json.daftarHari) {
      box.innerHTML = `
        <div class="today-done">
          <div class="today-done-icon">${statusIcon(json.status)}</div>
          <div class="today-done-info">
            <div class="today-done-status">${json.status}</div>
            <div class="today-done-ts">${tarikh} &nbsp;·&nbsp; ${json.timestamp || ''}</div>
            ${json.catatan ? `<div style="font-size:11px;color:var(--mid);margin-top:4px;">"${json.catatan}"</div>` : ''}
          </div>
          <span class="hadir-badge ${badgeClass(json.status)}">${json.status}</span>
        </div>
        <div style="font-size:11px;color:var(--mid);margin-bottom:10px;">Nak tukar? Boleh kemaskini lagi hari ini.</div>
        ${renderHadirForm(json.status, tarikh)}`;
      selectedStatus = json.status;
    } else {
      box.innerHTML = `
        <div class="today-card">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:4px;">📅 ${tarikh}</div>
          <div style="font-size:11px;color:var(--mid);">Belum tandakan kehadiran hari ini</div>
        </div>
        ${renderHadirForm('', tarikh)}`;
      selectedStatus = '';
    }
  } catch(err) {
    box.innerHTML = `<div style="color:var(--error);font-size:12px;padding:12px;">Gagal sambung ke pelayan.</div>`;
  }
}

function renderHadirForm(currentStatus, tarikh) {
  const statuses = [
    { val: 'Hadir',           icon: '✅', cls: '' },
    { val: 'Tidak Hadir',     icon: '❌', cls: 'sel-tidakhadir' },
    { val: 'Tugasan Luar',    icon: '🚗', cls: 'sel-tugasan' },
    { val: 'Cuti Sakit',      icon: '🤒', cls: 'sel-sakit' },
    { val: 'Cuti Kecemasan',  icon: '🚨', cls: 'sel-kecemasan' },
    { val: 'Lain-lain',       icon: '📝', cls: 'sel-lain' },
  ];

  const btns = statuses.map(s => `
    <button class="hadir-btn ${s.cls} ${currentStatus===s.val?'selected':''}"
      onclick="selectStatus('${s.val}', this)">
      ${s.icon}<br>${s.val}
    </button>`).join('');

  return `
    <div style="font-size:11px;font-weight:600;color:var(--mid);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Pilih Status</div>
    <div class="hadir-grid">${btns}</div>
    <div class="field" id="catatanField" style="${currentStatus==='Lain-lain'||currentStatus===''?'':'display:none'}">
      <label>Catatan (Wajib untuk Lain-lain)</label>
      <input type="text" id="inputCatatan" placeholder="Nyatakan sebab..." />
    </div>
    <button class="btn" onclick="submitHadir()" id="submitHadirBtn">Hantar Kehadiran</button>
    <div class="status" id="hadirStatus"></div>`;
}

function selectStatus(val, btn) {
  selectedStatus = val;
  document.querySelectorAll('.hadir-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const cf = document.getElementById('catatanField');
  if (cf) cf.style.display = val === 'Lain-lain' ? 'block' : 'none';
}

async function submitHadir() {
  if (!selectedStatus) { showStatus('hadirStatus','error','Sila pilih status kehadiran.'); return; }
  const catatan = (document.getElementById('inputCatatan')?.value || '').trim();
  if (selectedStatus === 'Lain-lain' && !catatan) { showStatus('hadirStatus','error','Sila isi catatan untuk Lain-lain.'); return; }

  showStatus('hadirStatus','loading','Merekodkan kehadiran...');
  document.getElementById('submitHadirBtn').disabled = true;

  try {
    const payload = { action:'submitHadir', ndp:session.ndp, ic:session.ic, status:selectedStatus, catatan };
    const json = await (await fetch(GAS_URL, {method:'POST', body:JSON.stringify(payload)})).json();
    if (json.success) {
      showStatus('hadirStatus','success','✓ ' + json.message);
      hadirLoaded = false;
      setTimeout(() => { renderHadirToday(); loadRekap(); }, 800);
    } else {
      showStatus('hadirStatus','error', json.message || 'Gagal merekod.');
      document.getElementById('submitHadirBtn').disabled = false;
    }
  } catch(err) {
    showStatus('hadirStatus','error','Gagal sambung ke pelayan.');
    document.getElementById('submitHadirBtn').disabled = false;
  }
}

async function loadRekap() {
  const rekodBox = document.getElementById('hadirRekodBox');
  rekodBox.innerHTML = `<div style="text-align:center;padding:12px;color:var(--mid);font-size:12px;">Memuatkan rekap...</div>`;

  try {
    const res  = await fetch(`${GAS_URL}?action=getRekapHadir&ndp=${encodeURIComponent(session.ndp)}&ic=${encodeURIComponent(session.ic)}`);
    const json = await res.json();
    if (!json.success) { rekodBox.innerHTML = `<div style="color:var(--error);font-size:12px;">${json.message}</div>`; return; }

    const st = json.stat;
    document.getElementById('statHadir').textContent     = st.hadir;
    document.getElementById('statTidak').textContent     = st.tidakHadir;
    document.getElementById('statLuar').textContent      = st.tugasanLuar;
    document.getElementById('statSakit').textContent     = st.cutiSakit;
    document.getElementById('statKecemasan').textContent = st.cutiKecemasan;
    document.getElementById('statJumlah').textContent    = st.jumlah;
    document.getElementById('hadirStatBox').style.display = 'block';
    hadirLoaded = true;

    if (json.rekod.length === 0) {
      rekodBox.innerHTML = `<div style="text-align:center;padding:20px;color:#bbb;font-size:12px;font-style:italic;">Tiada rekod kehadiran lagi.</div>`;
      return;
    }

    rekodBox.innerHTML = json.rekod.map(r => `
      <div class="rekod-item">
        <div>
          <div class="rekod-tarikh">📅 ${r.tarikh}</div>
          ${r.catatan ? `<div class="rekod-catatan">"${r.catatan}"</div>` : ''}
        </div>
        <span class="hadir-badge ${badgeClass(r.status)}">${r.status}</span>
      </div>`).join('');
  } catch(err) {
    rekodBox.innerHTML = `<div style="color:var(--error);font-size:12px;padding:12px;">Gagal muatkan rekap.</div>`;
  }
}
