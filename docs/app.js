// 聖經中的鑽石：純靜態前端（GitHub Pages）+ Supabase（資料庫，只透過 biblos_* 函式存取）
(function () {
  var SB = 'https://gserdnkovlwfdgcaguqe.supabase.co';
  var KEY = 'sb_publishable_OkPLiqg_-Jnu1ywt8j-o0A_R_BFyIZN';
  var START = '2026-10-22', GOAL = 3, ANIMALS = 100;
  var BOOKS = {
    lee: { name: '李常受文集', short: '李常受' },
    nee: { name: '倪柝聲文集', short: '倪柝聲', sub: '鼓嶺訓練記錄（卷一）' },
    nt: { name: '新約總論', short: '新約總論' },
    lsnt: { name: '新約生命讀經', short: '新約生命' },
    lsot: { name: '舊約生命讀經', short: '舊約生命' }
  };
  var KEYS = Object.keys(BOOKS);
  var NAMES = ['綿羊','黃金獵犬','橘貓','兔子','小鴨','小豬','乳牛','小馬','驢子','山羊','熊貓','小熊貓','浣熊','松鼠','刺蝟','花栗鼠','水獺','海狸','海豹','企鵝','北極熊','無尾熊','袋鼠','袋熊','小鹿','斑馬','長頸鹿','獅子','老虎','花豹','狐狸','哈士奇','柴犬','雪鴞','穀倉貓頭鷹','鸚鵡','藍松鴉','山雀','金絲雀','白鴿','青蛙','烏龜','變色龍','壁虎','豹紋守宮','火蠑螈','綠蛇','紅蛇','鱷魚','陸龜','龍貓','雪貂','天竺鼠','米格魯','鬥牛犬','貴賓犬','柯基','大麥町','秋田犬','法國鬥牛犬','海星','螃蟹','寄居蟹','龍蝦','魷魚','章魚','蝦子','珍珠貝','扇貝','珊瑚','瓢蟲','蝴蝶','蜻蜓','蜜蜂','蚱蜢','螳螂','蚊子','蒼蠅','螢火蟲','蝸牛','鼴鼠','鼴鼠','獾','臭鼬','海獺','土撥鼠','河獺','花栗鼠','小熊貓','黃鼠狼','山羊','綿羊','羊駝','小馬','驢子','乳牛','小豬','白鵝','母雞','火雞'];
  var BG = { mist: ['#eef3ea', '#26332b', '晨霧'], cream: ['#faf7f0', '#2b2620', '米白'], green: ['#e4efd8', '#26331f', '護眼綠'], blue: ['#e3eef8', '#1f2d3a', '淡藍'], parchment: ['#f0e2c0', '#3b2c14', '羊皮紙'], pink: ['#fbe9ee', '#3a2229', '淡粉'], night: ['#17191d', '#d8d4c8', '夜間'] };

  var $app = document.getElementById('app'), $nav = document.getElementById('nav');
  var S = { token: ls('bk_token'), me: null, reads: [], titles: null };
  var admin = { key: null, data: null };

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rpc(fn, args) {
    return fetch(SB + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) })
      .then(function (r) { return r.text().then(function (t) { var j = t ? JSON.parse(t) : null; if (!r.ok) throw new Error((j && j.message) || 'error'); return j; }); });
  }
  // ---- 日期（台灣時間，字串 YYYY-MM-DD）----
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayTW() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
  function dnum(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5; }
  function addDays(s, n) { return new Date((dnum(s) + n) * 864e5).toISOString().slice(0, 10); }
  function parseDay(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(dnum(s)) ? s : todayTW(); }
  function md(s) { return (+s.slice(5, 7)) + '/' + (+s.slice(8, 10)); }
  function idxFor(k, day) { var n = S.titles[k].length; return (((dnum(day) - dnum(START)) % n) + n) % n; }
  function doneSet(k) { var o = {}; S.reads.forEach(function (r) { if (r.book === k) o[r.idx] = 1; }); return o; }
  function dayStatus(day) { var o = {}; KEYS.forEach(function (k) { o[k] = !!doneSet(k)[idxFor(k, day)]; }); return o; }
  function missedItems(created, uidReads) {
    var today = todayTW(), start = created && created > START ? created : START, out = {};
    KEYS.forEach(function (k) {
      var done = {}; uidReads.forEach(function (r) { if (r.book === k) done[r.idx] = 1; });
      var rows = [], d = addDays(today, -1);
      while (d >= start) { var i = idxFor(k, d); if (!done[i]) rows.push([d, i + 1, S.titles[k][i]]); d = addDays(d, -1); }
      out[k] = rows;
    });
    return out;
  }
  function bgColors(spec) {
    if (spec && spec.indexOf('p:') === 0 && BG[spec.slice(2)]) return BG[spec.slice(2)];
    if (spec && /^c:#[0-9a-fA-F]{6}$/.test(spec)) {
      var h = spec.slice(2), r = parseInt(h.substr(1, 2), 16), g = parseInt(h.substr(3, 2), 16), b = parseInt(h.substr(5, 2), 16);
      return [h, 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#1d1b18' : '#eeeae0'];
    }
    return BG.mist;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function avSrc(a) { return a && a.indexOf('a:') === 0 ? 'animals/' + pad2(+a.slice(2)) + '.webp' : null; }
  function avHtml(a, nick, big) { var s = avSrc(a); return s ? '<img class="av' + (big ? ' big' : '') + '" src="' + s + '" alt="">' : '<span class="av ph' + (big ? ' big' : '') + '">' + esc((nick || '?').slice(0, 1)) + '</span>'; }
  function animal(n, i) {
    i = i || 0; var t = (n + i) % 4, im = '<img src="animals/' + pad2(n) + '.webp" alt="">';
    return '<span class="z t' + t + '" title="' + esc(NAMES[n]) + '" style="--d:-' + (((n * 7 + i * 13) % 10) / 4) + 's">' + (t === 2 ? '<span class="f">' + im + '</span>' : im) + '</span>';
  }

  // ---- 資料載入 ----
  function loadTitles() { return S.titles ? Promise.resolve() : fetch('data/titles.json').then(function (r) { return r.json(); }).then(function (t) { S.titles = t; }); }
  function article(k, i) { return fetch('data/' + k + '/' + i + '.json').then(function (r) { return r.json(); }); }
  function refresh() {
    return Promise.all([rpc('biblos_me', { p_token: S.token }), rpc('biblos_my_reads', { p_token: S.token })]).then(function (r) {
      if (!r[0]) throw new Error('nologin'); S.me = r[0]; S.reads = r[1];
    });
  }
  function logout() { ls('bk_token', null); S.token = null; S.me = null; location.hash = '#/login'; }

  // ---- 對外（tts.js 用）----
  window.BIBLOS = {
    mark: function (k, idx, undo) {
      return rpc('biblos_mark', { p_token: S.token, p_book: k, p_idx: idx, p_undo: !!undo, p_goal: GOAL, p_animals: ANIMALS }).then(function (res) {
        S.reads = S.reads.filter(function (r) { return !(r.book === k && r.idx === idx); });
        if (!undo) S.reads.push({ book: k, idx: idx, ts: todayTW() });
        var a = res.animal;
        return { animal: a, animal_name: a === null || a === undefined ? null : NAMES[a] };
      });
    },
    dayItems: function (day) {
      var st = dayStatus(day);
      return Promise.all(KEYS.map(function (k) { return article(k, idxFor(k, day)); })).then(function (arts) {
        return { items: KEYS.map(function (k, j) {
          var i = idxFor(k, day);
          return { key: k, name: BOOKS[k].name, sub: BOOKS[k].sub || '', idx: i, n: i + 1, total: S.titles[k].length, title: arts[j].t, done: st[k], paras: arts[j].b.split('\n').filter(function (p) { return p.trim(); }) };
        }) };
      });
    }
  };

  // ---- 頁面 ----
  function setNav(active) {
    if (!S.me) { $nav.innerHTML = ''; return; }
    $nav.innerHTML = '<nav class="top"><a class="m ' + (active === 'read' ? 'on' : '') + '" href="#/read">📖 開始閱讀</a><a class="m ' + (active === 'progress' ? 'on' : '') + '" href="#/progress">🏃 奔跑賽程</a><a class="me" href="#/profile" title="個人設定">' + avHtml(S.me.avatar, S.me.nick) + '<span>' + esc(S.me.nick) + '</span></a></nav>';
  }
  function page(html, active) { setNav(active); $app.innerHTML = html; window.scrollTo(0, 0); }

  function viewLogin(phone, needNick, err) {
    page('<form class="card" id="lf"><h2>登入 / 加入</h2><p>只要輸入手機號碼就能登入，不需要密碼。第一次使用會請你取一個暱稱。你的手機號碼不會顯示給其他人。</p>' +
      (err ? '<div class="err">' + esc(err) + '</div>' : '') +
      '<input type="tel" name="phone" inputmode="tel" placeholder="手機號碼，例如 0912345678" value="' + esc(phone || '') + '" ' + (needNick ? 'readonly' : 'autofocus') + ' required>' +
      (needNick ? '<input type="text" name="nick" maxlength="12" placeholder="暱稱（最多 12 字）" autofocus required>' : '') +
      '<button>' + (needNick ? '建立並登入' : '下一步') + '</button></form><div class="hint"><a href="#/admin">🛠 管理員後台</a></div>');
    document.getElementById('lf').onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, p = normPhone(f.phone.value);
      if (!p) return viewLogin(f.phone.value, false, '請輸入正確的手機號碼');
      rpc('biblos_login', { p_phone: p, p_nick: f.nick ? f.nick.value : null }).then(function (r) {
        if (r.need_nick) return viewLogin(p, true, '第一次使用，請取一個暱稱');
        S.token = r.token; ls('bk_token', r.token); location.hash = '#/read'; route();
      }).catch(function () { viewLogin(p, needNick, '登入失敗，請稍後再試'); });
    };
  }
  function normPhone(raw) {
    var p = (raw || '').replace(/[\s\-().]/g, '');
    if (p.indexOf('+886') === 0) p = '0' + p.slice(4); else if (p.indexOf('886') === 0 && p.length === 12) p = '0' + p.slice(3);
    return /^\d{8,15}$/.test(p) ? p : null;
  }

  function tabsHtml(key, day, isToday, st, missedN) {
    var dq = isToday ? '' : '?d=' + day;
    return '<nav class="tabs">' + KEYS.map(function (k) {
      var b = BOOKS[k];
      return '<a href="#/read/' + k + dq + '" data-k="' + k + '" class="' + (key === k ? 'on' : '') + '">' + b.name + (b.sub ? '<small>' + b.sub + '</small>' : '') + (st[k] ? '<span class="ck">✓</span>' : '') + '</a>';
    }).join('') + '<a href="#/missed" class="late ' + (key === 'missed' ? 'on' : '') + '">⏰ 過期未讀<small>時間過了還沒讀</small>' + (missedN ? '<span class="ck bad">' + (missedN < 100 ? missedN : '99+') + '</span>' : '') + '</a></nav>';
  }
  function dateLine(day, isToday) { return '<div class="date">' + day.slice(0, 4) + ' 年 ' + (+day.slice(5, 7)) + ' 月 ' + (+day.slice(8, 10)) + ' 日' + (isToday ? '' : '（非今日）') + '</div>'; }
  function missedCount() { var m = missedItems(S.me.created, S.reads), n = 0; KEYS.forEach(function (k) { n += m[k].length; }); return n; }

  function viewRead(key, day, award) {
    if (!BOOKS[key]) return (location.hash = '#/read');
    var today = todayTW(), isToday = day === today, n = idxFor(key, day), st = dayStatus(day);
    article(key, n).then(function (art) {
      var ndone = KEYS.filter(function (k) { return st[k]; }).length;
      var todayReads = S.reads.filter(function (r) { return r.ts === today; }).length;
      var zoo = rpc('biblos_my_zoo', { p_token: S.token });
      zoo.then(function (z) {
        var gotToday = z.some(function (a) { return a.day === today; });
        var mine = z.slice(-3).reverse();
        var spec = S.me.bg || 'p:mist', bg = bgColors(spec), dq = isToday ? '' : '?d=' + day, fin = st[key];
        var paras = art.b.split('\n').filter(function (p) { return p.trim(); });
        var html = dateLine(day, isToday) + tabsHtml(key, day, isToday, st, missedCount()) +
          '<div class="todaycard"><div><div class="t">' + (isToday ? '今日進度' : '這天進度') + '</div><div class="n">' + ndone + ' <small>/ ' + KEYS.length + ' 項完成' + (ndone === KEYS.length ? ' 🎉' : '') + '</small></div>' +
          '<div class="goal" id="tgoal" data-n="' + todayReads + '" data-goal="' + GOAL + '" data-got="' + (gotToday ? 1 : 0) + '">' + (gotToday ? '🐾 今天的動物已經到手' : '今天已讀 ' + todayReads + ' 篇，再讀 ' + Math.max(GOAL - todayReads, 0) + ' 篇得一隻動物') + '</div></div>' +
          (mine.length ? '<div class="pets">' + mine.map(function (a) { return '<img src="animals/' + pad2(a.animal) + '.webp" alt="" title="' + esc(NAMES[a.animal]) + '">'; }).join('') + '</div>' : '') + '</div>' +
          '<div class="bgbar"><span>閱讀背景</span>' + Object.keys(BG).map(function (pk) { return '<button data-bg="p:' + pk + '" title="' + BG[pk][2] + '" class="dot ' + (spec === 'p:' + pk ? 'sel' : '') + '" style="background:' + BG[pk][0] + '"></button>'; }).join('') +
          '<label class="dot pick ' + (spec.indexOf('c:') === 0 ? 'sel' : '') + '" title="自選顏色" style="' + (spec.indexOf('c:') === 0 ? 'background:' + bg[0] : '') + '">🎨<input type="color" id="bgpick" value="' + bg[0] + '"></label></div>' +
          '<section class="paper ' + (spec === 'p:mist' ? 'mist' : '') + '" ' + (spec !== 'p:mist' ? 'style="background:' + bg[0] + ';color:' + bg[1] + '"' : '') + '>' +
          '<div class="meta">' + BOOKS[key].name + (BOOKS[key].sub ? ' · ' + BOOKS[key].sub : '') + ' · 第 ' + (n + 1) + ' / ' + S.titles[key].length + ' 篇</div><h2 class="title">' + esc(art.t) + '</h2>' +
          '<div class="tts" id="tts" hidden data-key="' + key + '" data-day="' + day + '" data-finished="' + (fin ? 1 : 0) + '" data-today="' + (isToday ? day : '') + '"><div class="trow"><button type="button" id="tts-play" class="tp">🔊 朗讀</button><button type="button" id="tts-stop" class="ts" hidden>⏹ 停止</button><button type="button" id="tts-gear" class="ts" title="朗讀設定">⚙︎ 設定</button></div>' +
          '<div class="topt" id="tts-opt" hidden><label>語音 <select id="tts-voice"></select></label><label>語速 <select id="tts-rate"><option value="0.8">慢</option><option value="1" selected>正常</option><option value="1.25">快</option><option value="1.5">較快</option></select></label>' +
          '<label class="ck2"><input type="checkbox" id="opt-auto" checked> 唸完自動標記「完成閱讀」</label><label class="ck2"><input type="checkbox" id="opt-cont" checked> 連播今天還沒讀的篇章</label><label class="ck2"><input type="checkbox" id="opt-skip" checked> 略過經節出處，例如（弗四11）</label><div class="vhint" id="tts-vhint"></div><button type="button" class="tclose" onclick="document.getElementById(\'tts-opt\').hidden=true">收起設定 ▲</button></div><div class="tnow" id="tts-now" hidden></div></div>' +
          '<article id="article">' + paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</article>' +
          '<div class="done-box" data-key="' + key + '" data-idx="' + n + '" data-done="' + (fin ? 1 : 0) + '">' + (fin ? '<div class="ok">✅ 已完成閱讀</div><button class="undo">取消完成</button>' : '<button>完成閱讀</button>') + '</div></section>' +
          '<div class="nav"><a href="#/read/' + key + '?d=' + addDays(day, -1) + '">← 前一天</a>' + (isToday ? '<span class="now">今天</span>' : '<a href="#/read/' + key + '">回到今天</a>') + '<a href="#/read/' + key + '?d=' + addDays(day, 1) + '">後一天 →</a></div>' +
          (award !== undefined && award !== null ? '<div class="award"><div class="box"><div style="font-size:1.1rem;font-weight:700">🎉 今天讀完 ' + GOAL + ' 篇了！</div><div class="hint">恭喜你獲得 <b>' + NAMES[award] + '</b></div>' + animal(award, 0) + '<div><button type="button">收進動物園</button></div></div></div>' : '');
        page(html, 'read');
        document.title = art.t + ' - ' + BOOKS[key].name;
        var aw = $app.querySelector('.award'); if (aw) aw.onclick = function () { aw.remove(); };
        $app.querySelectorAll('[data-bg]').forEach(function (b) { b.onclick = function () { setBg(b.dataset.bg, key, day); }; });
        document.getElementById('bgpick').onchange = function (e) { setBg('c:' + e.target.value, key, day); };
        $app.querySelector('.done-box button').onclick = function () {
          var box = $app.querySelector('.done-box'), undo = box.dataset.done === '1';
          BIBLOS.mark(box.dataset.key, +box.dataset.idx, undo).then(function (r) { viewRead(box.dataset.key, day, r.animal); });
        };
        if (window.initTTS) window.initTTS();
      });
    });
  }
  function setBg(v, key, day) { rpc('biblos_set_bg', { p_token: S.token, p_bg: v }).then(function () { S.me.bg = v; viewRead(key, day); }); }

  function viewMissed() {
    var today = todayTW(), m = missedItems(S.me.created, S.reads), n = 0; KEYS.forEach(function (k) { n += m[k].length; });
    var row = function (k, r) { return '<a class="mrow" href="#/read/' + k + '?d=' + r[0] + '"><b>' + md(r[0]) + '</b><span>第 ' + r[1] + ' 篇　' + esc(r[2]) + '</span><em>去讀 →</em></a>'; };
    var h = dateLine(today, true) + tabsHtml('missed', today, true, dayStatus(today), n) + '<h2 class="title">⏰ 時間過了，還沒讀的</h2>';
    if (!n) h += '<div class="hint">太棒了！目前沒有任何過期未讀的信息 🎉</div>';
    else {
      h += '<div class="hint">共 ' + n + ' 篇。點「去讀」補讀，按「完成閱讀」後就會從這裡消失。</div>';
      KEYS.forEach(function (k) {
        var rows = m[k]; if (!rows.length) return;
        h += '<div class="mbook"><h3>' + BOOKS[k].name + '<span>' + rows.length + ' 篇</span></h3>' + rows.slice(0, 10).map(function (r) { return row(k, r); }).join('') +
          (rows.length > 10 ? '<details><summary>顯示其餘 ' + (rows.length - 10) + ' 篇</summary>' + rows.slice(10).map(function (r) { return row(k, r); }).join('') + '</details>' : '') + '</div>';
      });
    }
    page(h, 'read');
  }

  function viewProgress() {
    var today = todayTW(), ti = {}; KEYS.forEach(function (k) { ti[k] = idxFor(k, today); });
    rpc('biblos_progress', { p_token: S.token, p_today: {} }).then(function (d) {
      var P = {};
      d.users.forEach(function (u) { P[u.id] = { id: u.id, nick: u.nick, avatar: u.avatar, counts: {}, today: 0, animals: [] }; KEYS.forEach(function (k) { P[u.id].counts[k] = 0; }); });
      d.reads.forEach(function (r) { var p = P[r.uid]; if (p && p.counts[r.book] !== undefined) { p.counts[r.book]++; if (r.idx === ti[r.book]) p.today++; } });
      d.zoo.forEach(function (z) { if (P[z.uid]) P[z.uid].animals.push(z.animal); });
      var ppl = Object.keys(P).map(function (id) { var p = P[id]; p.zoo = p.animals.length; p.animals = p.animals.slice(-8); p.sum = KEYS.reduce(function (a, k) { return a + p.counts[k]; }, 0); return p; });
      ppl.sort(function (a, b) { return (b.id === S.me.id) - (a.id === S.me.id) || b.sum - a.sum || a.id - b.id; });
      page('<div class="hint">🏃 大家一起跑！每天讀完任意 3 篇（補讀也算），就能隨機獲得一隻小動物 🐾　點動物園可放大看</div>' + ppl.map(function (p) {
        return '<div class="person ' + (p.id === S.me.id ? 'me' : '') + '"><div class="l"><div class="nm"><div class="who">' + avHtml(p.avatar, p.nick) + esc(p.nick) + (p.id === S.me.id ? '（我）' : '') + '</div><span>今日 ' + p.today + '/' + KEYS.length + '</span></div>' +
          KEYS.map(function (k) { var t = S.titles[k].length; return '<div class="bk"><span>' + BOOKS[k].short + '</span><div class="bar"><i style="width:' + (Math.round(p.counts[k] * 1000 / t) / 10) + '%"></i></div><b>' + p.counts[k] + '/' + t + '</b></div>'; }).join('') + '</div>' +
          '<a class="minizoo" href="#/zoo/' + p.id + '">' + (p.animals.length ? p.animals.map(function (a, i) { return animal(a, i + 1); }).join('') + (p.zoo > p.animals.length ? '<span class="more">共 ' + p.zoo + ' 隻</span>' : '') : '<span class="empty">動物園<br>還是空的</span>') + '</a></div>';
      }).join(''), 'progress');
    });
  }

  function viewZoo(uid) {
    rpc('biblos_user_zoo', { p_token: S.token, p_uid: uid }).then(function (d) {
      var kinds = {}; d.zoo.forEach(function (z) { kinds[z.animal] = 1; });
      page('<h2 class="title">🐾 ' + esc(d.nick || '') + '的動物園</h2><div class="meta">共 ' + d.zoo.length + ' 隻 · 收集 ' + Object.keys(kinds).length + ' / ' + ANIMALS + ' 種</div><div class="pen big">' +
        (d.zoo.length ? d.zoo.map(function (z, i) { return animal(z.animal, i + 1); }).join('') : '<span class="hint">還沒有小動物，每天讀完任意 3 篇就能獲得</span>') + '</div><div class="nav"><a href="#/progress">← 回奔跑賽程</a></div>', 'progress');
    });
  }

  function viewProfile(msg, ok) {
    rpc('biblos_my_zoo', { p_token: S.token }).then(function (z) {
      var mine = Object.keys(z.reduce(function (o, a) { o[a.animal] = 1; return o; }, {})).map(Number).sort(function (a, b) { return a - b; });
      page('<div class="card"><h2>個人頭像</h2><div style="text-align:center;margin-bottom:12px">' + avHtml(S.me.avatar, S.me.nick, true) + '</div>' + (ok ? '<div class="okmsg">已更新 ✓</div>' : '') +
        (mine.length ? '<p>用你獲得的小動物當頭像：</p><div class="pick">' + mine.map(function (a) { return '<button class="pa" data-a="' + a + '"><img src="animals/' + pad2(a) + '.webp" alt=""></button>'; }).join('') + '</div>' : '<p>每天讀完 3 篇獲得小動物後，可以拿來當頭像。</p>') +
        (S.me.avatar ? '<button class="ghost" id="rmav">移除頭像</button>' : '') + '</div>' +
        '<form class="card" id="nf"><h2>暱稱</h2>' + (msg ? '<div class="err">' + esc(msg) + '</div>' : '') + '<input type="text" name="nick" maxlength="12" value="' + esc(S.me.nick) + '" required><button>儲存暱稱</button></form>' +
        '<div class="card"><a href="#/logout">登出</a>　·　<a href="#/admin">🛠 管理員後台</a></div>');
      var setAv = function (a) { rpc('biblos_set_avatar', { p_token: S.token, p_animal: a }).then(function () { S.me.avatar = a === null ? null : 'a:' + a; viewProfile(null, true); }); };
      $app.querySelectorAll('.pa').forEach(function (b) { b.onclick = function () { setAv(+b.dataset.a); }; });
      var rm = document.getElementById('rmav'); if (rm) rm.onclick = function () { setAv(null); };
      document.getElementById('nf').onsubmit = function (e) {
        e.preventDefault(); var v = e.target.nick.value.trim(); if (!v) return viewProfile('暱稱不能空白');
        rpc('biblos_set_nick', { p_token: S.token, p_nick: v }).then(function () { S.me.nick = v.slice(0, 12); viewProfile(null, true); });
      };
    });
  }

  // ---- 後台 ----
  function viewAdminLogin(err) {
    page('<form class="card" id="af"><h2>後台管理</h2><p>請輸入後台金鑰。</p>' + (err ? '<div class="err">' + esc(err) + '</div>' : '') +
      '<input type="password" name="key" autofocus required style="width:100%;font:inherit;padding:12px;border-radius:10px;border:1px solid var(--line);margin-bottom:12px"><button>進入</button></form>');
    document.getElementById('af').onsubmit = function (e) {
      e.preventDefault(); var k = e.target.key.value.trim();
      rpc('biblos_admin', { p_key: k }).then(function (d) { admin.key = k; admin.data = d; location.hash = '#/admin'; route(); }).catch(function () { viewAdminLogin('金鑰不正確'); });
    };
  }
  function adminStats() {
    var d = admin.data, today = todayTW(), ti = {}; KEYS.forEach(function (k) { ti[k] = idxFor(k, today); });
    var U = {}; d.users.forEach(function (u) { U[u.id] = Object.assign({ counts: {}, today: 0, last: '', animals: 0, reads: [] }, u); KEYS.forEach(function (k) { U[u.id].counts[k] = 0; }); });
    d.reads.forEach(function (r) { var u = U[r.uid]; if (u && u.counts[r.book] !== undefined) { u.counts[r.book]++; u.reads.push(r); if (r.idx === ti[r.book]) u.today++; if (r.ts > u.last) u.last = r.ts; } });
    d.zoo.forEach(function (z) { if (U[z.uid]) { U[z.uid].animals++; (U[z.uid].zlist = U[z.uid].zlist || []).push(z); } });
    return Object.keys(U).map(function (id) { var u = U[id]; u.sum = KEYS.reduce(function (a, k) { return a + u.counts[k]; }, 0); var m = missedItems(u.created, u.reads); u.missed = KEYS.reduce(function (a, k) { return a + m[k].length; }, 0); u.m = m; return u; });
  }
  function viewAdmin() {
    if (!admin.data) return viewAdminLogin();
    var users = adminStats(), today = todayTW();
    users.sort(function (a, b) { return b.today - a.today || b.sum - a.sum; });
    var tot = function (f) { return users.reduce(function (a, u) { return a + f(u); }, 0); };
    page('<div style="display:flex;justify-content:space-between;align-items:center"><h2 class="title" style="margin:0">🛠 後台：所有人的情形</h2><a href="#/admin/out">登出後台</a></div><div class="hint">' + md(today) + '</div>' +
      '<div class="stats"><div><b>' + users.length + '</b>總人數</div><div><b>' + users.filter(function (u) { return u.last === today; }).length + '</b>今日有讀</div><div><b>' + users.filter(function (u) { return u.today === KEYS.length; }).length + '</b>今日全完成</div><div><b>' + tot(function (u) { return u.sum; }) + '</b>累計完成篇數</div><div><b>' + tot(function (u) { return u.animals; }) + '</b>發出動物</div></div>' +
      '<div class="tblwrap"><table class="adm"><tr><th>暱稱</th><th>手機</th><th>加入</th><th>最近閱讀</th><th>今日</th><th>過期未讀</th>' + KEYS.map(function (k) { return '<th>' + BOOKS[k].short + '</th>'; }).join('') + '<th>動物</th></tr>' +
      users.map(function (u) { return '<tr><td class="nick"><a href="#/admin/u/' + u.id + '">' + esc(u.nick) + '</a></td><td>' + esc(u.phone) + '</td><td>' + u.created + '</td><td>' + (u.last || '—') + '</td><td class="' + (u.today === KEYS.length ? 'good' : '') + '">' + u.today + '/' + KEYS.length + '</td><td class="' + (u.missed ? 'bad' : '') + '">' + u.missed + '</td>' + KEYS.map(function (k) { return '<td>' + u.counts[k] + '<small>/' + S.titles[k].length + '</small></td>'; }).join('') + '<td>' + u.animals + '</td></tr>'; }).join('') + '</table></div>');
  }
  function viewAdminUser(id) {
    if (!admin.data) return viewAdminLogin();
    var u = adminStats().filter(function (x) { return x.id === id; })[0]; if (!u) return (location.hash = '#/admin');
    var per = {}; u.reads.forEach(function (r) { per[r.ts] = (per[r.ts] || 0) + 1; });
    var days = Object.keys(per).sort().reverse().slice(0, 14);
    var recent = u.reads.slice().sort(function (a, b) { return a.ts < b.ts ? 1 : -1; }).slice(0, 40);
    var rows = function (a, f, empty) { return a.length ? a.map(f).join('') : '<div class="hint">' + empty + '</div>'; };
    page('<div class="nav" style="margin:0 0 10px"><a href="#/admin">← 回後台</a></div><h2 class="title">' + esc(u.nick) + '</h2><div class="meta">' + esc(u.phone) + ' · 加入 ' + u.created + '</div>' +
      '<div class="mbook"><h3>過期未讀</h3>' + KEYS.map(function (k) { return '<div class="mrow"><b></b><span>' + BOOKS[k].name + '</span><em>' + u.m[k].length + ' 篇</em></div>'; }).join('') + '</div>' +
      '<div class="mbook"><h3>近 14 天每天完成篇數</h3>' + rows(days, function (d) { return '<div class="mrow"><b></b><span>' + d + '</span><em>' + per[d] + ' 篇</em></div>'; }, '還沒有紀錄') + '</div>' +
      '<div class="mbook"><h3>最近完成（40 筆）</h3>' + rows(recent, function (r) { return '<div class="mrow"><b>' + r.ts.slice(5) + '</b><span>' + BOOKS[r.book].name + '　第 ' + (r.idx + 1) + ' 篇　' + esc(S.titles[r.book][r.idx]) + '</span></div>'; }, '還沒有紀錄') + '</div>' +
      '<div class="mbook"><h3>動物園<span style="color:var(--muted)">' + u.animals + ' 隻</span></h3><div class="pen big">' + (u.zlist || []).map(function (z, i) { return animal(z.animal, i + 1); }).join('') + '</div></div>');
  }

  // ---- 路由 ----
  function route() {
    var h = location.hash.replace(/^#/, '') || '/read', q = h.indexOf('?'), qs = q < 0 ? '' : h.slice(q + 1), p = (q < 0 ? h : h.slice(0, q)).split('/').filter(Boolean);
    var day = parseDay((qs.match(/(?:^|&)d=([^&]*)/) || [])[1]);
    loadTitles().then(function () {
      if (p[0] === 'admin') {
        S.me = S.me; if (p[1] === 'out') { admin = { key: null, data: null }; return (location.hash = '#/login'); }
        return p[1] === 'u' ? viewAdminUser(+p[2]) : viewAdmin();
      }
      if (p[0] === 'logout') return logout();
      if (p[0] === 'login' || !S.token) return viewLogin();
      (S.me ? Promise.resolve() : refresh()).then(function () {
        if (p[0] === 'read' && p[1]) return viewRead(p[1], day);
        if (p[0] === 'read') { var st = dayStatus(todayTW()); var first = KEYS.filter(function (k) { return !st[k]; })[0] || 'lee'; return (location.hash = '#/read/' + first); }
        if (p[0] === 'missed') return viewMissed();
        if (p[0] === 'progress') return viewProgress();
        if (p[0] === 'zoo') return viewZoo(+p[1]);
        if (p[0] === 'profile') return viewProfile();
        location.hash = '#/read';
      }).catch(function () { ls('bk_token', null); S.token = null; S.me = null; viewLogin(); });
    });
  }
  window.addEventListener('hashchange', route);
  route();
})();
