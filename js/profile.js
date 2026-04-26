async function savePhone() {
  const tel = document.getElementById('inputTel').value.trim();
  if (!tel) { showStatus('telStatus','error','Sila masukkan no. telefon.'); return; }
  showStatus('telStatus','loading','Menyimpan...');
  try {
    const payload = { action:'updateStudent', ndp:session.ndp, ic:session.ic, noTel:tel,
      namaSyarikat:session.namaSyarikat||'', alamatSyarikat:session.alamatSyarikat||'',
      noTelSyarikat:session.noTelSyarikat||'', namaPenyelia:session.namaPenyelia||'' };
    const json = await (await fetch(GAS_URL, {method:'POST', body:JSON.stringify(payload)})).json();
    if (json.success) {
      session.noTel = tel;
      document.getElementById('infoTel').textContent = tel;
      showStatus('telStatus','success','✓ No. telefon berjaya disimpan.');
    } else showStatus('telStatus','error', json.message||'Gagal simpan.');
  } catch(err) { showStatus('telStatus','error','Gagal sambung ke pelayan.'); }
}

async function saveLI() {
  const namaSyarikat   = document.getElementById('inputNamaSyarikat').value.trim();
  const alamatSyarikat = document.getElementById('inputAlamat').value.trim();
  const noTelSyarikat  = document.getElementById('inputNoTelSyarikat').value.trim();
  const namaPenyelia   = document.getElementById('inputNamaPenyelia').value.trim();
  if (!namaSyarikat) { showStatus('liStatus','error','Nama syarikat wajib diisi.'); return; }
  showStatus('liStatus','loading','Menyimpan maklumat LI...');
  try {
    const payload = { action:'updateStudent', ndp:session.ndp, ic:session.ic, noTel:session.noTel||'',
      namaSyarikat, alamatSyarikat, noTelSyarikat, namaPenyelia };
    const json = await (await fetch(GAS_URL, {method:'POST', body:JSON.stringify(payload)})).json();
    if (json.success) {
      Object.assign(session, {namaSyarikat, alamatSyarikat, noTelSyarikat, namaPenyelia});
      setInfoVal('curNamaSyarikat', namaSyarikat); setInfoVal('curNoTelSyarikat', noTelSyarikat);
      setInfoVal('curNamaPenyelia', namaPenyelia); setInfoVal('curAlamat', alamatSyarikat);
      showStatus('liStatus','success','✓ Maklumat LI berjaya dikemaskini.');
    } else showStatus('liStatus','error', json.message||'Gagal simpan.');
  } catch(err) { showStatus('liStatus','error','Gagal sambung ke pelayan.'); }
}
