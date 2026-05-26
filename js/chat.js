// chat.js
(function () {
  'use strict';

  if (localStorage.getItem('theme') === 'light') document.body.classList.add('light');

  const ME = localStorage.getItem('sc_user') || 'alice_dev';

  const AV_COLORS = ['av1','av2','av3','av4','av5','av6'];

  const contacts = [
    { id:1, name:'bob_sec',      init:'BS', color:'av2', online:true,  unread:2, preview:'🔒 зашифровано', time:'14:32' },
    { id:2, name:'carol_ngo',    init:'CN', color:'av6', online:true,  unread:0, preview:'🔒 зашифровано', time:'12:11' },
    { id:3, name:'dave_infosec', init:'DI', color:'av3', online:false, unread:5, preview:'🔒 зашифровано', time:'Вчера' },
    { id:4, name:'eve_pentest',  init:'EP', color:'av5', online:false, unread:0, preview:'🔒 зашифровано', time:'Вчера' },
  ];

  const seeds = {
    1:[
      {from:'bob_sec',   text:'Привет! Отправляю через E2E канал 🔐', time:'14:28', status:'read'},
      {from:ME,          text:'Отлично, ключи обменяны — можно говорить безопасно.', time:'14:29', status:'read'},
      {from:'bob_sec',   text:'Проверь TTL — установи таймер на 10 секунд.', time:'14:30', status:'read'},
      {from:ME,          text:'Готово. Сообщение самоуничтожится через 10 сек 💥', time:'14:31', status:'read', ttl:10},
      {from:'bob_sec',   text:'Сервер видел только зашифрованные данные 🔑', time:'14:32', status:'delivered'},
    ],
    2:[
      {from:'carol_ngo', text:'Нужен защищённый канал для НКО-отчётов.', time:'12:08', status:'read'},
      {from:ME,          text:'SecureChat подойдёт: E2E + TTL + zero-knowledge сервер.', time:'12:10', status:'read'},
      {from:'carol_ngo', text:'Как верифицировать ключи? Через QR?', time:'12:11', status:'sent'},
    ],
    3:[
      {from:'dave_infosec', text:'Threat model задокументирована?', time:'Вчера', status:'read'},
      {from:ME,             text:'Да, см. Settings → Threat Model.', time:'Вчера', status:'read'},
      {from:'dave_infosec', text:'ChaCha20-Poly1305 — хороший выбор для веба.', time:'Вчера', status:'read'},
      {from:ME,             text:'Быстрее AES-GCM на устройствах без аппаратного ускорения.', time:'Вчера', status:'read'},
      {from:'dave_infosec', text:'Покрытие тестами?', time:'Вчера', status:'delivered'},
    ],
    4:[
      {from:'eve_pentest', text:'XSS через emoji в никнейме закрыт?', time:'Вчера', status:'read'},
      {from:ME,            text:'Да — CSP + DOMPurify + санитизация на сервере.', time:'Вчера', status:'read'},
    ],
  };

  const replies = [
    'Получено и расшифровано ✓',
    'Ключи обменяны успешно 🔑',
    'Сервер не видел содержимое этого сообщения.',
    'TTL-таймер работает корректно.',
    'ChaCha20-Poly1305 справился 👌',
    'Zero-knowledge confirmed!',
    'Всё зашифровано на устройстве 🔐',
  ];
  let replyIdx = 0;

  let current = null;
  const timers = new Map();
  let msgSeq = 1000;

  // ── Render contacts ──────────────────────────────
  function renderContacts(q = '') {
    const list = document.getElementById('contactsList');
    list.innerHTML = '';
    contacts
      .filter(c => c.name.includes(q.toLowerCase()))
      .forEach(c => {
        const el = document.createElement('div');
        el.className = 'contact-item' + (current?.id === c.id ? ' active' : '');
        el.innerHTML = `
          <div class="tg-avatar ${c.color}">
            ${c.init}
            ${c.online ? '<div class="online-dot"></div>' : ''}
          </div>
          <div class="contact-body">
            <div class="contact-name">
              ${c.name}
              <span class="contact-time">${c.time}</span>
            </div>
            <div class="contact-preview">
              <span>${c.preview}</span>
              ${c.unread ? `<span class="tg-badge">${c.unread}</span>` : ''}
            </div>
          </div>`;
        el.addEventListener('click', () => openChat(c));
        list.appendChild(el);
      });
  }

  // ── Open chat ──────────────────────────────────────
  function openChat(c) {
    current = c;
    c.unread = 0;
    renderContacts(document.getElementById('searchInput').value);

    document.getElementById('emptyState').style.display = 'none';
    const ac = document.getElementById('activeChat');
    ac.style.display = 'flex';

    document.getElementById('hdrAvatar').textContent = c.init;
    document.getElementById('hdrAvatar').className   = `tg-avatar ${c.color}`;
    document.getElementById('hdrAvatar').style.cssText = 'width:36px;height:36px;font-size:.8rem';
    document.getElementById('hdrName').textContent   = c.name;
    const st = document.getElementById('hdrStatus');
    if (c.online) { st.textContent = 'онлайн'; st.className = 'chat-header-status'; }
    else          { st.textContent = 'был(а) недавно'; st.className = 'chat-header-status offline'; }

    timers.forEach(id => clearInterval(id));
    timers.clear();

    const area = document.getElementById('messagesArea');
    area.innerHTML = '<div class="day-label">Сегодня</div>';
    (seeds[c.id] || []).forEach((m, i) => area.appendChild(buildMsg(m, `d${c.id}-${i}`)));
    area.scrollTop = area.scrollHeight;
  }

  // ── Build message element ─────────────────────────
  function buildMsg(m, id) {
    const own = m.from === ME;
    const row = document.createElement('div');
    row.className = 'msg-row' + (own ? ' own' : '');
    row.dataset.id = id;

    const contact = contacts.find(c => c.name === m.from);
    const avColor = contact ? contact.color : 'av4';
    const avInit  = m.from.slice(0,2).toUpperCase();

    const ticks = { sent:'✓', delivered:'✓✓', read:'✓✓' };
    const tickClass = m.status === 'read' ? 'msg-tick read' : 'msg-tick';

    const cipher = btoa(m.text.slice(0,6)).slice(0,10);
    let ttlHtml = m.ttl > 0
      ? `<span class="ttl-chip">⏱ <span class="cd" data-left="${m.ttl}" data-id="${id}">${m.ttl}с</span></span>`
      : '';

    row.innerHTML = `
      ${!own ? `<div class="msg-av ${avColor}" style="width:28px;height:28px;font-size:.68rem">${avInit}</div>` : ''}
      <div class="msg-bubble">
        ${!own ? `<div class="msg-sender-name">@${m.from}</div>` : ''}
        <div class="msg-text">${esc(m.text)}</div>
        <div class="msg-meta">
          <span class="msg-time">${m.time}</span>
          <span style="font-size:.65rem;color:var(--tg-muted)">🔒${cipher}</span>
          ${own ? `<span class="${tickClass}">${ticks[m.status]||'✓'}</span>` : ''}
          ${ttlHtml}
        </div>
      </div>`;

    if (m.ttl > 0) startTTL(id, m.ttl, row);
    return row;
  }

  function startTTL(id, secs, el) {
    let left = secs;
    const ticker = setInterval(() => {
      left--;
      const cd = el.querySelector('.cd');
      if (cd) cd.textContent = left > 60 ? `${Math.floor(left/60)}м${left%60}с` : `${left}с`;
      if (left <= 0) {
        clearInterval(ticker); timers.delete(id);
        el.classList.add('msg-dissolve');
        setTimeout(() => el.remove(), 700);
      }
    }, 1000);
    timers.set(id, ticker);
  }

  // ── Send ──────────────────────────────────────────
  const sendBtn  = document.getElementById('sendBtn');
  const msgInput = document.getElementById('msgInput');
  const charCount= document.getElementById('charCount');
  const ttlSel   = document.getElementById('ttlSelect');
  const ttlLabel = document.getElementById('ttlLabel');

  msgInput.addEventListener('input', function () {
    const len = this.value.length;
    charCount.textContent = `${len}/2000`;
    charCount.className = 'char-count' + (len > 1800 ? ' char-warn' : '');
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  ttlSel.addEventListener('change', function () {
    ttlLabel.className = 'ttl-active' + (this.value !== '0' ? ' ttl-active' : '');
    if (this.value !== '0') ttlLabel.style.color = 'var(--tg-ttl)';
    else ttlLabel.style.color = '';
  });

  msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  sendBtn.addEventListener('click', send);

  function send() {
    if (!current) return;
    const text = msgInput.value.trim();
    if (!text) return;

    const ttl = parseInt(ttlSel.value, 10);
    const now  = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const id   = `m${++msgSeq}`;

    const m = { from: ME, text, time, status: 'sent', ttl };
    const el = buildMsg(m, id);
    const area = document.getElementById('messagesArea');
    area.appendChild(el);
    area.scrollTop = area.scrollHeight;

    msgInput.value = ''; msgInput.style.height = 'auto';
    charCount.textContent = '0/2000';

    setTimeout(() => {
      const tick = el.querySelector('.msg-tick');
      if (tick) tick.textContent = '✓✓';
    }, 700);

    if (current.online) {
      const delay = 1200 + Math.random() * 1400;
      setTimeout(() => autoReply(current, area), delay);
    }
  }

  function autoReply(c, area) {
    if (current?.id !== c.id) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const m = { from: c.name, text: replies[replyIdx++ % replies.length], time, status: 'delivered' };
    area.appendChild(buildMsg(m, `r${Date.now()}`));
    area.scrollTop = area.scrollHeight;
  }

  // ── Search ──────────────────────────────────────────
  document.getElementById('searchInput').addEventListener('input', function () {
    renderContacts(this.value);
  });

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;');
  }

  renderContacts();
  openChat(contacts[0]);
}());

function toggleTheme() {
  document.body.classList.toggle('light');
  localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
}
