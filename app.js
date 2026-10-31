/* 二戰檔案館：共用互動與各頁渲染 */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAGE = document.body.dataset.page;

const KIND = {
  battles: { list: BATTLES, label: '戰役', href: 'battles.html' },
  people: { list: PEOPLE, label: '人物', href: 'people.html' },
  weapons: { list: WEAPONS, label: '武器', href: 'weapons.html' }
};
/* 去背或白底的物件照：以「貼在紙上」的方式呈現 */
const CUTOUTS = new Set(['garand', 'mosin', 'stg44', 'leeenfield', 'ppsh', 'mp40']);

const byId = (list, id) => list.find(x => x.id === id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 捲動浮現 ---------- */
const revealer = 'IntersectionObserver' in window && !reducedMotion
  ? new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px' })
  : null;
function reveal(root = document) {
  for (const el of $$('.reveal:not(.in)', root)) revealer ? revealer.observe(el) : el.classList.add('in');
}

/* ---------- 吉祥物：信鴿（回到頂部） ---------- */
function mountPigeon() {
  const label = PAGE === 'home' ? '回到網頁頂部' : '回到本頁頂部';
  const btn = document.createElement('button');
  btn.className = 'pigeon';
  btn.type = 'button';
  btn.setAttribute('aria-label', label);
  btn.innerHTML = `
    <span class="disc"></span><span class="ring"></span>
    <svg viewBox="0 0 76 76" aria-hidden="true">
      <path d="M38 3l6 7h-12z" fill="#9b2b1f"/>
      <g class="bird">
        <path d="M20 47 7 56l4-9-6-4 16-1z" fill="#6c737c"/>
        <ellipse cx="34" cy="46" rx="17" ry="11.5" fill="#a2a8b0"/>
        <path d="M40 37q11-2 10 10-6 6-14 5z" fill="#9c8bb0" opacity=".55"/>
        <path d="M31 57v6m6-6v6" stroke="#c4554a" stroke-width="2" stroke-linecap="round"/>
        <rect x="33.5" y="57.5" width="8" height="4.5" rx="1.6" fill="#9b2b1f"/>
        <g class="head">
          <circle cx="47" cy="31" r="8.5" fill="#8b929b"/>
          <path d="M54.5 30l8 2.2-8 2z" fill="#d9a441"/>
          <circle cx="50" cy="28.5" r="2.8" fill="#e8a33c"/>
          <ellipse class="eye" cx="50" cy="28.5" rx="1.5" ry="1.7" fill="#2a2017"/>
        </g>
        <path class="wing" d="M21 43q12-13 27-3-8 12-27 7z" fill="#7a818a" stroke="#4e545b" stroke-width="1"/>
        <path d="M27 44q8-3 15 0M29 47q7-2 12 0" stroke="#5d636b" stroke-width=".8" fill="none"/>
      </g>
    </svg>
    <span class="bubble">${label}</span>`;
  document.body.append(btn);

  btn.addEventListener('click', () => {
    btn.classList.remove('fly'); void btn.offsetWidth; btn.classList.add('fly');
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    setTimeout(() => btn.classList.remove('fly'), 1100);
  });

  /* 第一次往下捲時打聲招呼 */
  let greeted = false;
  addEventListener('scroll', () => {
    if (greeted || scrollY < 700) return;
    greeted = true;
    btn.classList.add('talk');
    setTimeout(() => btn.classList.remove('talk'), 2600);
  }, { passive: true });
}

/* ---------- 首頁：漂浮塵埃 ---------- */
function dust(canvas) {
  if (reducedMotion || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  let w, h, motes, running = true;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes = Array.from({ length: Math.round(w / 14) }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.6 + .4,
      vx: (Math.random() - .5) * .12, vy: -Math.random() * .18 - .03, p: Math.random() * 6.28
    }));
  };
  const frame = () => {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      m.x += m.vx; m.y += m.vy; m.p += .02;
      if (m.y < -4) { m.y = h + 4; m.x = Math.random() * w; }
      if (m.x < -4) m.x = w + 4; else if (m.x > w + 4) m.x = -4;
      ctx.globalAlpha = .25 + Math.sin(m.p) * .2;
      ctx.fillStyle = '#7a5a2a';
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
    }
    requestAnimationFrame(frame);
  };
  resize();
  addEventListener('resize', resize);
  new IntersectionObserver(([e]) => {
    const was = running; running = e.isIntersecting && !document.hidden;
    if (running && !was) requestAnimationFrame(frame);
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    const was = running; running = !document.hidden;
    if (running && !was) requestAnimationFrame(frame);
  });
  requestAnimationFrame(frame);
}

/* ---------- 首頁：打字機 ---------- */
function typewriter(el) {
  const text = el.dataset.text;
  if (reducedMotion) { el.textContent = text; return; }
  let i = 0;
  const step = () => {
    el.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(step, text[i - 1] === '　' ? 260 : 55 + Math.random() * 70);
  };
  setTimeout(step, 500);
}

/* ---------- 相關連結 ---------- */
function relatedLinks(links = []) {
  if (!links.length) return '';
  return `<div class="related">${links.map(([kind, id]) => {
    const k = KIND[kind]; const item = byId(k.list, id);
    return item ? `<a href="${k.href}#${id}" data-kind="${k.label}">${esc(item.name)}</a>` : '';
  }).join('')}</div>`;
}

/* ---------- 首頁 ---------- */
function renderHome() {
  const mini = $('#tl-mini');
  mini.innerHTML = CHAPTERS.map(ch => {
    const nodes = TIMELINE.filter(t => t.ch === ch.id && t.key);
    return `
      <li class="tl-chapter reveal"><span class="seal">${ch.no}</span>
        <h3>${ch.title}<small>${ch.en} · ${ch.years}</small></h3><p>${ch.lede}</p></li>
      ${nodes.map(t => `
        <li class="tl-node reveal"><a href="timeline.html#${t.id}">
          <span class="thumb"><img src="${imgSrc(t.img, true)}" alt="" loading="lazy" decoding="async"></span>
          <span><time>${t.date}</time><strong>${t.title}</strong><span class="txt">${t.keyText}</span></span>
        </a></li>`).join('')}`;
  }).join('');

  $('#strip').innerHTML = BATTLES.map(b => `
    <a href="battles.html#${b.id}">
      <span class="frame"><img src="${imgSrc(b.img, true)}" alt="${esc(b.name)}" loading="lazy" decoding="async"></span>
      <b>${b.name}</b><time>${b.date}</time>
    </a>`).join('');

  dust($('canvas.dust'));
  typewriter($('.typed'));
}

/* ---------- 詳細時間軸 ---------- */
function renderTimeline() {
  $('#ch-chips').innerHTML = CHAPTERS.map(ch => `<a class="chip" href="#ch-${ch.id}">${ch.no}・${ch.title}</a>`).join('');
  $('#chapters').innerHTML = CHAPTERS.map(ch => `
    <section class="chapter" id="ch-${ch.id}">
      <div class="chapter-head reveal"><span class="seal">${ch.no}</span><h2>${ch.title}<small>${ch.en} · ${ch.years}</small></h2></div>
      <p class="chapter-lede reveal">${ch.lede}</p>
      <div class="tl"><span class="ink"></span>
        ${TIMELINE.filter(t => t.ch === ch.id).map(t => `
          <article class="event reveal${t.key ? ' key' : ''}${t.img ? ' has-img' : ''}" id="${t.id}">
            <div class="event-card">
              ${t.img ? `<figure class="photo"><span class="frame"><img src="${imgSrc(t.img, true)}" srcset="${imgSrc(t.img, true)} 480w, ${imgSrc(t.img)} 960w" sizes="(min-width: 720px) 300px, 100vw" alt="${esc(t.title)}" loading="lazy" decoding="async"></span><figcaption>${t.date}　${esc(t.title)}</figcaption></figure>` : ''}
              <time>${t.date}</time>
              <h3>${t.title}${t.key ? '<span class="key-badge">重點</span>' : ''}</h3>
              <div><p>${t.text}</p>${relatedLinks(t.links)}</div>
            </div>
          </article>`).join('')}
      </div>
    </section>`).join('');

  /* 墨線隨捲動延伸，經過的節點被「蓋章」 */
  const lines = $$('.tl');
  const events = $$('.event');
  let ticking = false;
  const update = () => {
    ticking = false;
    const mid = innerHeight * .6;
    for (const tl of lines) {
      const r = tl.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
      tl.style.setProperty('--progress', `${p * 100}%`);
    }
    for (const ev of events) ev.classList.toggle('seen', ev.getBoundingClientRect().top < mid);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
  /* 內容由腳本產生，需手動捲到網址指定的事件 */
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) target.scrollIntoView();
}

/* ---------- 卡片與分組 ---------- */
function cardHTML(kind, item) {
  const cut = CUTOUTS.has(item.img || item.id);
  if (kind === 'battles') {
    return `
      <button class="card wide battle-card reveal" type="button" data-id="${item.id}">
        <span class="clip"></span><span class="no">${item.date.slice(0, 4)}</span>
        <span class="frame"><img src="${imgSrc(item.img, true)}" alt="${esc(item.name)}" loading="lazy" decoding="async"></span>
        <span class="meta"><b>${item.name}</b><small>${item.en}｜${item.date}</small><p>${item.lede}</p></span>
      </button>`;
  }
  const isWeapon = kind === 'weapons';
  return `
    <button class="card${isWeapon ? ' obj' : ''} reveal" type="button" data-id="${item.id}">
      <span class="clip"></span>
      ${isWeapon ? `<span class="type-tag">${WEAPON_TYPES[item.type]}</span>` : ''}
      <span class="frame"><img class="${cut ? 'cutout' : ''}" src="${imgSrc(item.id, true)}" alt="${esc(item.name)}" loading="lazy" decoding="async"></span>
      <span class="meta"><b>${item.name}</b><small>${item.en}｜${isWeapon ? item.year : item.life}</small><span class="tagline">${item.tag}</span></span>
    </button>`;
}

function renderGrouped(kind) {
  const list = KIND[kind].list;
  const nations = Object.keys(NATIONS).filter(n => list.some(x => x.nation === n));
  const root = $('#groups');
  root.innerHTML = nations.map(n => {
    const nat = NATIONS[n];
    return `
      <section class="nation-group" data-nation="${n}" aria-labelledby="h-${n}">
        <div class="nation-head reveal">
          <h2 id="h-${n}">${nat.name}</h2><span class="en">${nat.en}</span>
          <span class="side-tag side-${nat.side}">${nat.side === 'axis' ? '軸心國' : '同盟國'}</span>
        </div>
        <div class="grid">${list.filter(x => x.nation === n).map(x => cardHTML(kind, x)).join('')}</div>
      </section>`;
  }).join('');

  const nationChips = $('#nation-chips');
  nationChips.innerHTML = [['all', '全部國籍'], ...nations.map(n => [n, NATIONS[n].name])]
    .map(([v, t], i) => `<button class="chip" type="button" data-nation="${v}" aria-pressed="${i === 0}">${t}</button>`).join('');

  const typeChips = $('#type-chips');
  if (typeChips) {
    const types = Object.keys(WEAPON_TYPES).filter(t => list.some(x => x.type === t));
    typeChips.innerHTML = [['all', '全部類型'], ...types.map(t => [t, WEAPON_TYPES[t]])]
      .map(([v, t], i) => `<button class="chip" type="button" data-type="${v}" aria-pressed="${i === 0}">${t}</button>`).join('');
  }

  const state = { nation: 'all', type: 'all' };
  const apply = () => {
    for (const g of $$('.nation-group', root)) {
      let shown = 0;
      for (const c of $$('.card', g)) {
        const item = byId(list, c.dataset.id);
        const ok = state.type === 'all' || item.type === state.type;
        c.hidden = !ok; if (ok) shown++;
      }
      g.hidden = !(shown && (state.nation === 'all' || g.dataset.nation === state.nation));
    }
  };
  const bindChips = (box, key) => box && box.addEventListener('click', e => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    state[key] = chip.dataset[key];
    for (const c of $$('.chip', box)) c.setAttribute('aria-pressed', c === chip);
    apply();
    const top = root.getBoundingClientRect().top + scrollY - 130;
    if (scrollY > top) scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
  });
  bindChips(nationChips, 'nation');
  bindChips(typeChips, 'type');
}

function renderBattles() {
  $('#groups').innerHTML = `<div class="battle-list">${BATTLES.map(b => cardHTML('battles', b)).join('')}</div>`;
}

function renderCredits() {
  $('#credits').innerHTML = CREDITS.map(c => `
    <li><img src="${imgSrc(c.id, true)}" alt="" loading="lazy">
      <span><b>${esc(c.file)}</b><br>作者：${esc(c.artist)}　授權：${esc(c.license || '見原始頁面')}<br>
      <a href="${c.page}" target="_blank" rel="noopener">${esc(c.page)}</a></span></li>`).join('');
}

/* ---------- 檔案夾對話框 ---------- */
function dossierController(kind) {
  const list = KIND[kind].list;
  const dlg = document.createElement('dialog');
  dlg.className = 'dossier';
  dlg.setAttribute('aria-labelledby', 'dossier-title');
  dlg.innerHTML = `<div class="dossier-sheet"><div class="dossier-bar"><span class="file-no"></span>
    <button class="dossier-close" type="button" aria-label="關閉">×</button></div><div class="dossier-body"></div></div>`;
  document.body.append(dlg);
  const sheet = $('.dossier-sheet', dlg);
  const body = $('.dossier-body', dlg);
  let current = null, opener = null, closing = false;

  const content = item => {
    const idx = list.indexOf(item);
    const prev = list[idx - 1], next = list[idx + 1];
    const img = item.img || item.id;
    const nat = item.nation ? NATIONS[item.nation] : null;
    $('.file-no', dlg).textContent = `檔案 No.${String(idx + 1).padStart(3, '0')}／${KIND[kind].label}${nat ? '・' + nat.name : ''}`;
    let facts = '';
    if (kind === 'battles') {
      facts = `<dl class="facts">${[['日期', item.date], ['地點', item.place], ['交戰方', item.sides], ['指揮官', item.commanders], ['結果', item.result], ['傷亡', item.toll]]
        .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
    } else if (kind === 'people') {
      facts = `<dl class="facts"><div><dt>國籍</dt><dd>${nat.name}（${nat.side === 'axis' ? '軸心國' : '同盟國'}）</dd></div>
        <div><dt>生卒</dt><dd>${item.life}</dd></div><div><dt>身分</dt><dd>${item.role}</dd></div></dl>
        <ul class="fact-list">${item.facts.map(f => `<li>${f}</li>`).join('')}</ul>`;
    } else {
      facts = `<dl class="facts"><div><dt>國籍</dt><dd>${nat.name}（${nat.side === 'axis' ? '軸心國' : '同盟國'}）</dd></div>
        <div><dt>類型</dt><dd>${WEAPON_TYPES[item.type]}</dd></div><div><dt>服役</dt><dd>${item.year} 年起</dd></div>
        ${item.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
    }
    body.innerHTML = `
      <figure class="photo dossier-photo tape${CUTOUTS.has(img) ? ' cutout' : ''}">
        <span class="frame"><img src="${imgSrc(img, true)}" alt="${esc(item.name)}"></span>
        <figcaption>${esc(item.en)}</figcaption>
        <span class="dossier-stamp">已解密</span>
      </figure>
      <div class="dossier-kicker">${kind === 'battles' ? item.date : (item.tag)}</div>
      <h2 id="dossier-title" tabindex="-1">${item.name}</h2>
      <p class="en">${item.en}</p>
      ${item.lede ? `<p class="lede">${item.lede}</p>` : ''}
      ${facts}
      <div class="dossier-text">${item.body.map(p => `<p>${p}</p>`).join('')}</div>
      <nav class="dossier-nav" aria-label="上一份／下一份檔案">
        ${prev ? `<button type="button" data-go="${prev.id}"><small>← 上一份</small>${prev.name}</button>` : ''}
        ${next ? `<button type="button" data-go="${next.id}"><small>下一份 →</small>${next.name}</button>` : ''}
      </nav>`;
    /* 先用已快取的小圖，再換成高解析度 */
    const im = $('.dossier-photo img', body);
    const hi = new Image();
    hi.onload = () => { im.src = hi.src; };
    hi.src = imgSrc(img);
    return im;
  };

  const flyFrom = async (originImg, target) => {
    try { await target.decode(); } catch { /* 解碼失敗時直接顯示 */ }
    const a = originImg.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const ghost = document.createElement('img');
    ghost.className = 'flying-photo';
    ghost.src = originImg.currentSrc || originImg.src;
    Object.assign(ghost.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px`, objectFit: getComputedStyle(target).objectFit });
    dlg.append(ghost);
    target.style.visibility = 'hidden';
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - (b.top + b.height / 2);
    const anim = ghost.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${a.width / b.width}, ${a.height / b.height}) rotate(-3deg)`, filter: 'sepia(.35)' },
      { transform: 'translate(0, -14px) scale(1.03) rotate(1.5deg)', offset: .7 },
      { transform: 'none', filter: 'sepia(.35)' }
    ], { duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)' });
    await anim.finished.catch(() => {});
    target.style.visibility = '';
    ghost.remove();
  };

  const open = (id, originCard) => {
    const item = byId(list, id);
    if (!item) return;
    current = item;
    opener = originCard || null;
    const target = content(item);
    document.documentElement.style.overflow = 'hidden';
    if (!dlg.open) dlg.showModal();
    sheet.scrollTop = 0;
    const originImg = originCard && $('img', originCard);
    dlg.classList.remove('closing');
    dlg.classList.add('opening');
    if (originImg && !reducedMotion) {
      sheet.style.animation = 'fade .35s ease both';
      flyFrom(originImg, target);
    }
    setTimeout(() => { dlg.classList.remove('opening'); sheet.style.animation = ''; }, 1000);
    $('.dossier-close', dlg).focus({ preventScroll: true });
    history.replaceState(null, '', `#${id}`);
  };

  const close = () => {
    if (!dlg.open || closing) return;
    closing = true;
    dlg.classList.remove('opening');
    dlg.classList.add('closing');
    setTimeout(() => {
      dlg.close();
      dlg.classList.remove('closing');
      closing = false;
      current = null;
      document.documentElement.style.overflow = '';
      history.replaceState(null, '', location.pathname + location.search);
      if (opener) opener.focus({ preventScroll: true });
    }, reducedMotion ? 0 : 280);
  };

  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('.dossier-close')) return close();
    const go = e.target.closest('[data-go]');
    if (go) {
      const id = go.dataset.go;
      opener = $(`.card[data-id="${id}"]`) || opener;
      current = byId(list, id);
      content(current);
      sheet.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      if (!reducedMotion) body.animate?.([{ opacity: 0, transform: 'translateX(16px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'ease-out' });
      $('#dossier-title', body).focus({ preventScroll: true });
      history.replaceState(null, '', `#${id}`);
    }
  });

  /* 點擊卡片：先「按下」再展開 */
  document.addEventListener('click', e => {
    const card = e.target.closest('.card[data-id]');
    if (!card) return;
    card.classList.add('pressing');
    setTimeout(() => { card.classList.remove('pressing'); open(card.dataset.id, card); }, reducedMotion ? 0 : 140);
  });

  /* 從其他頁面帶著 #id 進來時直接開啟檔案 */
  const fromHash = () => {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { /* 不合法的網址片段視為無 */ }
    if (id && byId(list, id)) { if (current?.id !== id) open(id); }
    else close();
  };
  addEventListener('hashchange', fromHash);
  fromHash();
}

/* ---------- 啟動 ---------- */
mountPigeon();
({
  home: renderHome,
  timeline: renderTimeline,
  battles: () => { renderBattles(); dossierController('battles'); },
  people: () => { renderGrouped('people'); dossierController('people'); },
  weapons: () => { renderGrouped('weapons'); dossierController('weapons'); },
  credits: renderCredits
})[PAGE]?.();
reveal();
