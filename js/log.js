let logLoaded = false;

function loadLog() {
  const now = new Date();
  const label = now.toLocaleDateString('ms-MY', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  document.getElementById('logTarikhLabel').textContent = label;

  if (!logLoaded) {
    loadLogRekod();
    checkLogHariIni();
  }
}

async function checkLogHariIni() {
  try {
    const res  = await fetch(`${GAS_URL}?action=checkLog&ndp=${encodeURIComponent(session.ndp)}&ic=${encodeURIComponent(session.ic)}`);
    const json = await res.json();
    if (json.success && json.adaLog) {
      document.getElementById('rteEditor').innerHTML = json.kandungan;
    }
  } catch(err) {}
}

async function saveLog() {
  const kandungan = document.getElementById('rteEditor').innerHTML.trim();
  if (!kandungan || kandungan === '<br>') {
    showStatus('logStatus','error','Sila tulis sesuatu sebelum simpan.'); return;
  }
  showStatus('logStatus','loading','Menyimpan log...');

  try {
    const payload = {
      action    : 'submitLog',
      ndp       : session.ndp,
      ic        : session.ic,
      kandungan : kandungan
    };
    const res  = await fetch(GAS_URL, { method:'POST', body: JSON.stringify(payload) });
    const json = await res.json();
    if (json.success) {
      showStatus('logStatus','success','✓ Log berjaya disimpan.');
      logLoaded = false;
      loadLogRekod();
    } else {
      showStatus('logStatus','error', json.message || 'Gagal simpan.');
    }
  } catch(err) {
    showStatus('logStatus','error','Gagal sambung ke pelayan.');
  }
}

async function loadLogRekod() {
  const box = document.getElementById('logRekodBox');
  box.innerHTML = `<div style="text-align:center;padding:12px;color:var(--mid);font-size:12px;">Memuatkan...</div>`;

  try {
    const res  = await fetch(`${GAS_URL}?action=getMyLog&ndp=${encodeURIComponent(session.ndp)}&ic=${encodeURIComponent(session.ic)}`);
    const json = await res.json();
    logLoaded = true;

    if (!json.success || !json.rekod.length) {
      box.innerHTML = `<div style="text-align:center;padding:20px;color:#bbb;font-size:12px;font-style:italic;">Tiada log lagi. Mula tulis hari ini!</div>`;
      return;
    }

    box.innerHTML = json.rekod.map(r => `
      <div class="log-card">
        <div class="log-card-head">
          <span class="log-card-tarikh">📅 ${r.tarikh}</span>
          <span class="log-card-ts">${r.timestamp}</span>
        </div>
        <div class="log-card-body">${r.kandungan}</div>
      </div>`).join('');
  } catch(err) {
    box.innerHTML = `<div style="color:var(--error);font-size:12px;padding:12px;">Gagal muatkan log.</div>`;
  }
}
