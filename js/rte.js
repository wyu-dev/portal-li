function rteCmd(cmd, val) {
  document.getElementById('rteEditor').focus();
  document.execCommand(cmd, false, val || null);
}

function insertImg() {
  document.getElementById('imgUpload').click();
}

function handleImgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    document.getElementById('rteEditor').focus();
    document.execCommand('insertImage', false, ev.target.result);
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function clearEditor() {
  if (confirm('Padam kandungan editor?')) {
    document.getElementById('rteEditor').innerHTML = '';
  }
}
