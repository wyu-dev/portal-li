function showStatus(id, type, msg) {
  const el = document.getElementById(id);
  el.className = 'status ' + type;
  el.textContent = msg;
  el.style.display = 'block';
}

function setInfoVal(id, val) {
  const el = document.getElementById(id);
  if (val) { el.textContent = val; el.classList.remove('empty'); }
  else { el.textContent = 'Belum diisi'; el.classList.add('empty'); }
}

function statusIcon(s) {
  const m = { 'Hadir':'✅','Tidak Hadir':'❌','Tugasan Luar':'🚗','Cuti Sakit':'🤒','Cuti Kecemasan':'🚨','Lain-lain':'📝' };
  return m[s] || '📋';
}

function badgeClass(s) {
  if (s === 'Hadir') return 'hb-hadir';
  if (s === 'Tidak Hadir') return 'hb-tidak';
  if (s === 'Tugasan Luar') return 'hb-tugasan';
  if (s === 'Cuti Sakit') return 'hb-sakit';
  if (s === 'Cuti Kecemasan') return 'hb-kecemasan';
  return 'hb-lain';
}
