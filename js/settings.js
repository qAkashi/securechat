// settings.js
(function () {
  'use strict';

  if (localStorage.getItem('theme') === 'light') document.body.classList.add('light');

  // Sync theme checkbox
  const themeChk = document.getElementById('themeChk');
  if (themeChk) themeChk.checked = !document.body.classList.contains('light');

  // Navigation
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', function () {
      document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      const panel = document.getElementById('panel-' + this.dataset.panel);
      if (panel) panel.classList.add('active');
    });
  });

  // Generate mock keys
  function rndHex(n) {
    return Array.from({length: n}, () => Math.floor(Math.random()*16).toString(16)).join('');
  }
  function fmtHex(h) { return h.match(/.{1,8}/g).join(' '); }

  let pubKey = rndHex(64);
  let fp     = rndHex(32);

  const pkBox = document.getElementById('pubKeyBox');
  const fpBox = document.getElementById('fpBox');
  if (pkBox) pkBox.textContent = fmtHex(pubKey);
  if (fpBox) fpBox.textContent = fmtHex(fp).toUpperCase();

  window.copyKey = function () {
    if (!pkBox) return;
    navigator.clipboard.writeText(pkBox.textContent).then(() => {
      pkBox.style.borderColor = 'var(--tg-blue)';
      setTimeout(() => pkBox.style.borderColor = '', 1000);
      showToast('Ключ скопирован ✓');
    });
  };

  window.exportKey = function () {
    const data = JSON.stringify({ algorithm:'X25519', publicKey: pubKey,
      fingerprint: fp, exportedAt: new Date().toISOString() }, null, 2);
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([data], {type:'application/json'})),
      download: 'securechat-pubkey.json'
    });
    a.click(); URL.revokeObjectURL(a.href);
  };

  window.regenKeys = function () {
    if (!confirm('Перегенерировать ключи? Активные сессии будут разорваны.')) return;
    if (pkBox) pkBox.textContent = '⏳ Генерация…';
    setTimeout(() => {
      pubKey = rndHex(64); fp = rndHex(32);
      if (pkBox) pkBox.textContent = fmtHex(pubKey);
      if (fpBox) fpBox.textContent = fmtHex(fp).toUpperCase();
      showToast('Ключи обновлены ✓');
    }, 500);
  };

  window.showToast = function (msg) {
    const t = document.getElementById('toastMsg');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  };

  window.toggleTheme = function () {
    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
    if (themeChk) themeChk.checked = !document.body.classList.contains('light');
  };
}());
