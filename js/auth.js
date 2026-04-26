let session = null, failCount = 0, locked = false;

document.getElementById('icInput').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('ndpInput').focus(); });
document.getElementById('ndpInput').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });

async function doLogin() {
  if (locked) return;
  const ic  = document.getElementById('icInput').value.trim();
  const ndp = document.getElementById('ndpInput').value.trim();
  if (!ic || !ndp) { showStatus('loginStatus','error','Sila isi kedua-dua medan.'); return; }
  if (ic.length < 12) { showStatus('loginStatus','error','No. K/P mestilah 12 digit.'); return; }
  setLoginLoading(true);
  showStatus('loginStatus','loading','Mengesahkan kredential...');
  try {
    const res  = await fetch(`${GAS_URL}?action=login&ic=${encodeURIComponent(ic)}&ndp=${encodeURIComponent(ndp)}`);
    const json = await res.json();
    if (json.success) { session = json.student; renderDashboard(); }
    else {
      failCount++; setLoginLoading(false);
      if (failCount >= 5) { locked = true; document.getElementById('loginBtn').disabled = true; showStatus('loginStatus','error','Akaun dikunci. Terlalu banyak cubaan gagal.'); return; }
      document.getElementById('attempts').style.display = 'block';
      document.getElementById('failCount').textContent = failCount;
      showStatus('loginStatus','error', json.message || 'IC atau NDP tidak sepadan.');
      document.getElementById('loginSection').classList.add('shake');
      setTimeout(() => document.getElementById('loginSection').classList.remove('shake'), 400);
    }
  } catch(err) { setLoginLoading(false); showStatus('loginStatus','error','Gagal sambung ke pelayan.'); }
}

function setLoginLoading(s) {
  ['loginBtn','icInput','ndpInput'].forEach(id => document.getElementById(id).disabled = s);
}

function renderDashboard() {
  const s = session;
  document.getElementById('dashName').textContent = s.nama;
  document.getElementById('dashNdp').textContent  = 'NDP: ' + s.ndp;
  document.getElementById('infoNama').textContent = s.nama;
  document.getElementById('infoNdp').textContent  = s.ndp;
  document.getElementById('infoIc').textContent     = s.ic.substring(0,6) + '••••••';
  document.getElementById('infoKursus').textContent = s.kodKursus || '—';
  document.getElementById('infoTel').textContent    = s.noTel || '—';
  document.getElementById('inputTel').value         = s.noTel || '';
  setInfoVal('curNamaSyarikat', s.namaSyarikat);
  setInfoVal('curNoTelSyarikat', s.noTelSyarikat);
  setInfoVal('curNamaPenyelia', s.namaPenyelia);
  setInfoVal('curAlamat', s.alamatSyarikat);
  if (s.namaSyarikat)   document.getElementById('inputNamaSyarikat').value = s.namaSyarikat;
  if (s.alamatSyarikat) document.getElementById('inputAlamat').value       = s.alamatSyarikat;
  if (s.noTelSyarikat)  document.getElementById('inputNoTelSyarikat').value = s.noTelSyarikat;
  if (s.namaPenyelia)   document.getElementById('inputNamaPenyelia').value  = s.namaPenyelia;
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashboard').style.display    = 'block';
}

function switchTab(tab, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');
}

function doLogout() {
  session = null; failCount = 0; locked = false;
  ['icInput','ndpInput'].forEach(id => { document.getElementById(id).value=''; document.getElementById(id).disabled=false; });
  document.getElementById('loginBtn').disabled = false;
  document.getElementById('loginStatus').style.display = 'none';
  document.getElementById('attempts').style.display = 'none';
  document.getElementById('failCount').textContent = '0';
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('dashboard').style.display = 'none';
}
