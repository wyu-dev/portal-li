// ============================================================
// PORTAL LATIHAN INDUSTRI — ADTEC KUANTAN
// Google Apps Script Backend v3.2
// Fix: leading zero NDP & IC, Date object auto-convert
// ============================================================
// SHEET 1: "Worksheet"
// A=BIL | B=NAMA | C=NDP | D=NO.K/P | E=KOD/NAMA KURSUS
// F=NO.TEL | G=NAMA SYARIKAT | H=ALAMAT | I=NO.TEL SYARIKAT | J=NAMA PENYELIA
//
// SHEET 2: "Kehadiran"
// A=TARIKH | B=NDP | C=NAMA | D=KOD_KURSUS | E=STATUS | F=CATATAN | G=TIMESTAMP
// ============================================================

const SHEET_NAME  = "Worksheet";
const HADIR_SHEET = "Kehadiran";
const ADMIN_PIN   = "000777";
const TZ          = "Asia/Kuala_Lumpur";

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === "login")          return handleLogin(e);
    if (action === "getStudent")     return handleGetStudent(e);
    if (action === "adminLogin")     return handleAdminLogin(e);
    if (action === "getAllStudents")  return handleGetAllStudents(e);
    if (action === "checkHadir")     return handleCheckHadir(e);
    if (action === "getRekapHadir")  return handleGetRekapHadir(e);
    if (action === "getAllHadir")     return handleGetAllHadir(e);
    if (action === "checkLog")       return handleCheckLog(e);
    if (action === "getMyLog")       return handleGetMyLog(e);
    if (action === "getAllLog")       return handleGetAllLog(e);
    return jsonResponse({ success: false, message: "Action tidak dikenali." });
  } catch (err) {
    return jsonResponse({ success: false, message: "Ralat: " + err.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === "updateStudent") return handleUpdateStudent(data);
    if (data.action === "submitHadir")   return handleSubmitHadir(data);
    if (data.action === "submitLog")     return handleSubmitLog(data);
    return jsonResponse({ success: false, message: "Action tidak dikenali." });
  } catch (err) {
    return jsonResponse({ success: false, message: "Ralat: " + err.message });
  }
}

// ─────────────────────────────────────────────
// PELAJAR: LOGIN
// ─────────────────────────────────────────────
function handleLogin(e) {
  const ic  = cleanStr(e.parameter.ic);
  const ndp = cleanStr(e.parameter.ndp);
  if (!ic || !ndp) return jsonResponse({ success: false, message: "IC dan NDP diperlukan." });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (cleanNum(row[3]) === ic && cleanNum(row[2]) === ndp)
      return jsonResponse({ success: true, message: "Login berjaya.", student: buildStudent(row) });
  }
  return jsonResponse({ success: false, message: "IC atau NDP tidak sepadan." });
}

// ─────────────────────────────────────────────
// PELAJAR: GET STUDENT
// ─────────────────────────────────────────────
function handleGetStudent(e) {
  const ndp = cleanStr(e.parameter.ndp);
  if (!ndp) return jsonResponse({ success: false, message: "NDP diperlukan." });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (cleanNum(data[i][2]) === ndp)
      return jsonResponse({ success: true, student: buildStudent(data[i]) });
  }
  return jsonResponse({ success: false, message: "Pelajar tidak dijumpai." });
}

// ─────────────────────────────────────────────
// PELAJAR: UPDATE MAKLUMAT
// ─────────────────────────────────────────────
function handleUpdateStudent(data) {
  const ndp = cleanStr(data.ndp);
  const ic  = cleanStr(data.ic);
  if (!ndp || !ic) return jsonResponse({ success: false, message: "Sesi tidak sah." });

  const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (cleanNum(row[2]) === ndp && cleanNum(row[3]) === ic) {
      const r = i + 1;
      sheet.getRange(r, 6).setValue(data.noTel          || "");
      sheet.getRange(r, 7).setValue(data.namaSyarikat   || "");
      sheet.getRange(r, 8).setValue(data.alamatSyarikat || "");
      sheet.getRange(r, 9).setValue(data.noTelSyarikat  || "");
      sheet.getRange(r,10).setValue(data.namaPenyelia   || "");
      return jsonResponse({ success: true, message: "Maklumat berjaya dikemaskini." });
    }
  }
  return jsonResponse({ success: false, message: "Pelajar tidak dijumpai." });
}

// ─────────────────────────────────────────────
// ADMIN: LOGIN
// ─────────────────────────────────────────────
function handleAdminLogin(e) {
  const pin = cleanStr(e.parameter.pin);
  if (pin === ADMIN_PIN) return jsonResponse({ success: true, message: "Admin login berjaya." });
  return jsonResponse({ success: false, message: "PIN tidak sah." });
}

// ─────────────────────────────────────────────
// ADMIN: GET ALL STUDENTS
// ─────────────────────────────────────────────
function handleGetAllStudents(e) {
  const pin = cleanStr(e.parameter.pin);
  if (pin !== ADMIN_PIN) return jsonResponse({ success: false, message: "Akses tidak dibenarkan." });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();
  const students = [];

  for (let i = 1; i < data.length; i++) {
    if (!data[i][1]) continue;
    students.push(buildStudent(data[i]));
  }
  return jsonResponse({ success: true, students: students, total: students.length });
}

// ─────────────────────────────────────────────
// KEHADIRAN: CHECK
// ─────────────────────────────────────────────
function handleCheckHadir(e) {
  const ndp    = cleanStr(e.parameter.ndp);
  const tarikh = getTodayMY();
  if (!ndp) return jsonResponse({ success: false, message: "NDP diperlukan." });

  const sheet = getOrCreateHadirSheet();
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row       = data[i];
    const rowTarikh = toDateStr(row[0]);
    const rowNdp    = cleanNum(row[1]); // ← handle leading zero hilang
    if (rowTarikh === tarikh && rowNdp === ndp) {
      return jsonResponse({
        success    : true,
        daftarHari : true,
        tarikh     : rowTarikh,
        status     : String(row[4] || ""),
        catatan    : String(row[5] || ""),
        timestamp  : String(row[6] || "")
      });
    }
  }
  return jsonResponse({ success: true, daftarHari: false, tarikh: tarikh });
}

// ─────────────────────────────────────────────
// KEHADIRAN: SUBMIT
// ─────────────────────────────────────────────
function handleSubmitHadir(data) {
  const ndp     = cleanStr(data.ndp);
  const ic      = cleanStr(data.ic);
  const status  = cleanStr(data.status);
  const catatan = cleanStr(data.catatan);
  const tarikh  = getTodayMY();

  if (!ndp || !ic || !status)
    return jsonResponse({ success: false, message: "Data tidak lengkap." });

  // Verify pelajar
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const mainData  = mainSheet.getDataRange().getValues();
  let pelajar = null;
  for (let i = 1; i < mainData.length; i++) {
    if (cleanNum(mainData[i][2]) === ndp && cleanNum(mainData[i][3]) === ic) {
      pelajar = mainData[i]; break;
    }
  }
  if (!pelajar) return jsonResponse({ success: false, message: "Pelajar tidak dijumpai." });

  const nama      = String(pelajar[1]);
  const kodKursus = String(pelajar[4] || "");
  const timestamp = Utilities.formatDate(new Date(), TZ, "dd/MM/yyyy HH:mm:ss");

  const sheet     = getOrCreateHadirSheet();
  const hadirData = sheet.getDataRange().getValues();

  // Semak rekod hari ini — guna cleanNum untuk handle NDP tanpa leading zero
  for (let i = 1; i < hadirData.length; i++) {
    const row       = hadirData[i];
    const rowTarikh = toDateStr(row[0]);
    const rowNdp    = cleanNum(row[1]);
    if (rowTarikh === tarikh && rowNdp === ndp) {
      const r = i + 1;
      sheet.getRange(r, 5).setValue(status);
      sheet.getRange(r, 6).setValue(catatan);
      sheet.getRange(r, 7).setValue(timestamp + " (kemaskini)");
      return jsonResponse({ success: true, message: "Kehadiran berjaya dikemaskini.", mode: "update" });
    }
  }

  // Insert baru — simpan NDP, IC, tarikh sebagai plain text (apostrophe prefix)
  const lastRow = sheet.getLastRow() + 1;
  sheet.getRange(lastRow, 1).setValue("'" + tarikh); // tarikh — plain text
  sheet.getRange(lastRow, 2).setValue("'" + ndp);    // NDP — paksa plain text
  sheet.getRange(lastRow, 3).setValue(nama);
  sheet.getRange(lastRow, 4).setValue(kodKursus);
  sheet.getRange(lastRow, 5).setValue(status);
  sheet.getRange(lastRow, 6).setValue(catatan);
  sheet.getRange(lastRow, 7).setValue(timestamp);

  return jsonResponse({ success: true, message: "Kehadiran berjaya direkodkan.", mode: "insert" });
}

// ─────────────────────────────────────────────
// KEHADIRAN: REKAP PELAJAR
// ─────────────────────────────────────────────
function handleGetRekapHadir(e) {
  const ndp = cleanStr(e.parameter.ndp);
  const ic  = cleanStr(e.parameter.ic);
  if (!ndp || !ic) return jsonResponse({ success: false, message: "NDP dan IC diperlukan." });

  // Verify
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const mainData  = mainSheet.getDataRange().getValues();
  let sah = false;
  for (let i = 1; i < mainData.length; i++) {
    if (cleanNum(mainData[i][2]) === ndp && cleanNum(mainData[i][3]) === ic) {
      sah = true; break;
    }
  }
  if (!sah) return jsonResponse({ success: false, message: "Akses tidak dibenarkan." });

  const sheet = getOrCreateHadirSheet();
  const data  = sheet.getDataRange().getValues();
  const rekod = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (cleanNum(row[1]) === ndp) {
      rekod.push({
        tarikh   : toDateStr(row[0]),
        status   : String(row[4] || ""),
        catatan  : String(row[5] || ""),
        timestamp: String(row[6] || "")
      });
    }
  }

  rekod.sort((a, b) => parseDate(b.tarikh) - parseDate(a.tarikh));

  const stat = { hadir:0, tidakHadir:0, tugasanLuar:0, cutiSakit:0, cutiKecemasan:0, lainLain:0, jumlah: rekod.length };
  rekod.forEach(r => {
    if      (r.status === "Hadir")           stat.hadir++;
    else if (r.status === "Tidak Hadir")     stat.tidakHadir++;
    else if (r.status === "Tugasan Luar")    stat.tugasanLuar++;
    else if (r.status === "Cuti Sakit")      stat.cutiSakit++;
    else if (r.status === "Cuti Kecemasan")  stat.cutiKecemasan++;
    else                                      stat.lainLain++;
  });

  return jsonResponse({ success: true, rekod: rekod, stat: stat });
}

// ─────────────────────────────────────────────
// KEHADIRAN: ALL (ADMIN)
// ─────────────────────────────────────────────
function handleGetAllHadir(e) {
  const pin = cleanStr(e.parameter.pin);
  if (pin !== ADMIN_PIN) return jsonResponse({ success: false, message: "Akses tidak dibenarkan." });

  const sheet = getOrCreateHadirSheet();
  const data  = sheet.getDataRange().getValues();
  const rekod = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    rekod.push({
      tarikh   : toDateStr(row[0]),
      ndp      : cleanNum(row[1]),
      nama     : String(row[2] || ""),
      kodKursus: String(row[3] || ""),
      status   : String(row[4] || ""),
      catatan  : String(row[5] || ""),
      timestamp: String(row[6] || "")
    });
  }

  rekod.sort((a, b) => parseDate(b.tarikh) - parseDate(a.tarikh));
  return jsonResponse({ success: true, rekod: rekod, total: rekod.length });
}

// ═════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════

function buildStudent(row) {
  return {
    bil: row[0], nama: row[1],
    ndp: cleanNum(row[2]),  // pastikan leading zero ada
    ic : cleanNum(row[3]),  // pastikan leading zero ada
    kodKursus     : String(row[4] || ""),
    noTel         : String(row[5] || ""),
    namaSyarikat  : String(row[6] || ""),
    alamatSyarikat: String(row[7] || ""),
    noTelSyarikat : String(row[8] || ""),
    namaPenyelia  : String(row[9] || "")
  };
}

// Bersihkan string input
function cleanStr(val) {
  return String(val || "").trim().replace(/^'/, "");
}

// Handle nombor yang kehilangan leading zero — NDP (8 digit) & IC (12 digit)
// Detect panjang asal berdasarkan nilai, padStart ikut konteks
function cleanNum(val) {
  if (!val && val !== 0) return "";
  const s = String(val).trim().replace(/^'/, ""); // buang apostrophe
  // Kalau ia nombor bulat (Sheets buang leading zero), restore berdasarkan panjang
  if (/^\d+$/.test(s)) {
    if (s.length <= 8)  return s.padStart(8, "0");  // NDP — 8 digit
    if (s.length <= 12) return s.padStart(12, "0"); // IC — 12 digit
  }
  return s;
}

// Handle Date object yang Sheets auto-convert dari cell nilai tarikh
function toDateStr(val) {
  if (!val) return "";
  if (val instanceof Date)
    return Utilities.formatDate(val, TZ, "dd/MM/yyyy");
  return String(val).trim().replace(/^'/, "");
}

function getTodayMY() {
  return Utilities.formatDate(new Date(), TZ, "dd/MM/yyyy");
}

function parseDate(str) {
  if (!str) return new Date(0);
  const p = String(str).replace(/^'/, "").split("/");
  if (p.length !== 3) return new Date(0);
  return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
}

function getOrCreateHadirSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(HADIR_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(HADIR_SHEET);
    sheet.appendRow(["TARIKH", "NDP", "NAMA", "KOD_KURSUS", "STATUS", "CATATAN", "TIMESTAMP"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═════════════════════════════════════════════
// LOG HARIAN
// Sheet "LogHarian": A=TARIKH | B=NDP | C=NAMA | D=KANDUNGAN | E=TIMESTAMP
// ═════════════════════════════════════════════

// Tambah dalam doGet:
// if (action === "checkLog")  return handleCheckLog(e);
// if (action === "getMyLog")  return handleGetMyLog(e);
// if (action === "getAllLog")  return handleGetAllLog(e);
// Tambah dalam doPost:
// if (data.action === "submitLog") return handleSubmitLog(data);

const LOG_SHEET = "LogHarian";

function handleCheckLog(e) {
  const ndp    = cleanStr(e.parameter.ndp);
  const ic     = cleanStr(e.parameter.ic);
  const tarikh = getTodayMY();
  if (!ndp || !ic) return jsonResponse({ success: false, message: "Parameter tidak lengkap." });

  // Verify
  const main = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME).getDataRange().getValues();
  let sah = false;
  for (let i = 1; i < main.length; i++) {
    if (cleanNum(main[i][2]) === ndp && cleanNum(main[i][3]) === ic) { sah = true; break; }
  }
  if (!sah) return jsonResponse({ success: false, message: "Akses tidak dibenarkan." });

  const sheet = getOrCreateLogSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (toDateStr(row[0]) === tarikh && cleanNum(row[1]) === ndp) {
      return jsonResponse({ success: true, adaLog: true, tarikh: tarikh, kandungan: String(row[3] || ""), timestamp: String(row[4] || "") });
    }
  }
  return jsonResponse({ success: true, adaLog: false, tarikh: tarikh });
}

function handleSubmitLog(data) {
  const ndp      = cleanStr(data.ndp);
  const ic       = cleanStr(data.ic);
  const kandungan = data.kandungan || "";
  const tarikh   = getTodayMY();
  if (!ndp || !ic) return jsonResponse({ success: false, message: "Sesi tidak sah." });

  // Verify
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const mainData  = mainSheet.getDataRange().getValues();
  let pelajar = null;
  for (let i = 1; i < mainData.length; i++) {
    if (cleanNum(mainData[i][2]) === ndp && cleanNum(mainData[i][3]) === ic) { pelajar = mainData[i]; break; }
  }
  if (!pelajar) return jsonResponse({ success: false, message: "Pelajar tidak dijumpai." });

  const nama      = String(pelajar[1]);
  const timestamp = Utilities.formatDate(new Date(), TZ, "dd/MM/yyyy HH:mm:ss");
  const sheet     = getOrCreateLogSheet();
  const logData   = sheet.getDataRange().getValues();

  // Update kalau ada rekod hari ini
  for (let i = 1; i < logData.length; i++) {
    const row = logData[i];
    if (toDateStr(row[0]) === tarikh && cleanNum(row[1]) === ndp) {
      const r = i + 1;
      sheet.getRange(r, 4).setValue(kandungan);
      sheet.getRange(r, 5).setValue(timestamp + " (kemaskini)");
      return jsonResponse({ success: true, message: "Log berjaya dikemaskini.", mode: "update" });
    }
  }

  // Insert baru
  const lastRow = sheet.getLastRow() + 1;
  sheet.getRange(lastRow, 1).setValue("'" + tarikh);
  sheet.getRange(lastRow, 2).setValue("'" + ndp);
  sheet.getRange(lastRow, 3).setValue(nama);
  sheet.getRange(lastRow, 4).setValue(kandungan);
  sheet.getRange(lastRow, 5).setValue(timestamp);
  return jsonResponse({ success: true, message: "Log berjaya disimpan.", mode: "insert" });
}

function handleGetMyLog(e) {
  const ndp = cleanStr(e.parameter.ndp);
  const ic  = cleanStr(e.parameter.ic);
  if (!ndp || !ic) return jsonResponse({ success: false, message: "Parameter tidak lengkap." });

  // Verify
  const main = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME).getDataRange().getValues();
  let sah = false;
  for (let i = 1; i < main.length; i++) {
    if (cleanNum(main[i][2]) === ndp && cleanNum(main[i][3]) === ic) { sah = true; break; }
  }
  if (!sah) return jsonResponse({ success: false, message: "Akses tidak dibenarkan." });

  const sheet = getOrCreateLogSheet();
  const data  = sheet.getDataRange().getValues();
  const rekod = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (cleanNum(row[1]) === ndp) {
      rekod.push({ tarikh: toDateStr(row[0]), kandungan: String(row[3] || ""), timestamp: String(row[4] || "") });
    }
  }
  rekod.sort((a, b) => parseDate(b.tarikh) - parseDate(a.tarikh));
  return jsonResponse({ success: true, rekod: rekod });
}

function handleGetAllLog(e) {
  const pin = cleanStr(e.parameter.pin);
  if (pin !== ADMIN_PIN) return jsonResponse({ success: false, message: "Akses tidak dibenarkan." });

  const sheet = getOrCreateLogSheet();
  const data  = sheet.getDataRange().getValues();
  const rekod = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    rekod.push({ tarikh: toDateStr(row[0]), ndp: cleanNum(row[1]), nama: String(row[2] || ""), kandungan: String(row[3] || ""), timestamp: String(row[4] || "") });
  }
  rekod.sort((a, b) => parseDate(b.tarikh) - parseDate(a.tarikh));
  return jsonResponse({ success: true, rekod: rekod, total: rekod.length });
}

function getOrCreateLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_SHEET);
    sheet.appendRow(["TARIKH", "NDP", "NAMA", "KANDUNGAN", "TIMESTAMP"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
