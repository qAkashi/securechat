// auth.js
(function () {
  'use strict';

  if (localStorage.getItem('theme') === 'light') document.body.classList.add('light');

  const myUser = localStorage.getItem('sc_user') || '';

  let isReg = false;

  const tabLogin   = document.getElementById('tabLogin');
  const tabReg     = document.getElementById('tabReg');
  const fieldEmail = document.getElementById('fieldEmail');
  const fieldConf  = document.getElementById('fieldConfirm');
  const submitBtn  = document.getElementById('submitBtn');
  const eyeBtn     = document.getElementById('eyeBtn');
  const pwInput    = document.getElementById('fPassword');

  tabLogin.addEventListener('click', () => setMode(false));
  tabReg.addEventListener('click',   () => setMode(true));

  function setMode(reg) {
    isReg = reg;
    tabLogin.classList.toggle('active', !reg);
    tabReg.classList.toggle('active', reg);
    fieldEmail.classList.toggle('open', reg);
    fieldConf.classList.toggle('open', reg);
    submitBtn.textContent = reg ? 'Создать аккаунт' : 'Войти';
    clearErrors();
  }

  eyeBtn.addEventListener('click', () => {
    const show = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    eyeBtn.textContent = show ? '🙈' : '👁';
  });

  // Live hints
  document.getElementById('fUsername').addEventListener('input', function () {
    if (this.value.length >= 3) clearErr('errUsername', this);
  });
  document.getElementById('fPassword').addEventListener('input', function () {
    if (this.value.length >= 8) clearErr('errPassword', this);
  });

  document.getElementById('authForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Подождите…';

    const username = document.getElementById('fUsername').value.trim();
    localStorage.setItem('sc_user', username);

    setTimeout(() => {
      document.getElementById('successScreen').classList.add('show');
      setTimeout(() => { window.location.href = 'chat.html'; }, 1500);
    }, 700);
  });

  function validate() {
    clearErrors();
    let ok = true;
    const u = document.getElementById('fUsername').value.trim();
    const p = document.getElementById('fPassword').value;

    if (u.length < 3) { showErr('errUsername', 'fUsername', 'Минимум 3 символа'); ok = false; }
    else if (!/^[a-zA-Z0-9_]+$/.test(u)) { showErr('errUsername', 'fUsername', 'Только a-z, 0-9, _'); ok = false; }

    if (p.length < 8) { showErr('errPassword', 'fPassword', 'Минимум 8 символов'); ok = false; }

    if (isReg) {
      const email = document.getElementById('fEmail').value.trim();
      const conf  = document.getElementById('fConfirm').value;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showErr('errEmail', 'fEmail', 'Некорректный email'); ok = false;
      }
      if (conf !== p) { showErr('errConfirm', 'fConfirm', 'Пароли не совпадают'); ok = false; }
    }
    return ok;
  }

  function showErr(errId, inputId, msg) {
    document.getElementById(errId).textContent = msg;
    document.getElementById(inputId).classList.add('input-error');
  }
  function clearErr(errId, input) {
    document.getElementById(errId).textContent = '';
    input.classList.remove('input-error');
  }
  function clearErrors() {
    document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
    document.querySelectorAll('.tg-input').forEach(e => e.classList.remove('input-error'));
  }
}());

function toggleTheme() {
  document.body.classList.toggle('light');
  localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
}
