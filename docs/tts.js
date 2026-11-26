// 朗讀：瀏覽器內建語音（免費）。支援點段落開始、唸完自動完成、連播當天未讀篇章、略過經節出處。
window.initTTS = function () {
  var synth = window.speechSynthesis;
  if (!synth || !window.SpeechSynthesisUtterance) return;

  var $ = function (id) { return document.getElementById(id); };
  var box = $('tts'); box.hidden = false;
  var play = $('tts-play'), stop = $('tts-stop'), gear = $('tts-gear'), opt = $('tts-opt');
  var voiceSel = $('tts-voice'), rateSel = $('tts-rate'), nowEl = $('tts-now'), vhint = $('tts-vhint');
  var optAuto = $('opt-auto'), optCont = $('opt-cont'), optSkip = $('opt-skip');
  var article = $('article');

  var cur = { key: box.dataset.key, day: box.dataset.day, finished: box.dataset.finished === '1' };

  // ---- 設定（存在瀏覽器） ----
  function load(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  rateSel.value = load('ttsRate', '1');
  optAuto.checked = load('ttsAuto', '1') === '1';
  optCont.checked = load('ttsCont', '1') === '1';
  optSkip.checked = load('ttsSkip', '1') === '1';
  optAuto.onchange = function () { save('ttsAuto', optAuto.checked ? '1' : '0'); };
  optCont.onchange = function () { save('ttsCont', optCont.checked ? '1' : '0'); };
  optSkip.onchange = function () { save('ttsSkip', optSkip.checked ? '1' : '0'); build(); };
  gear.onclick = function () { opt.hidden = !opt.hidden; };

  // ---- 語音清單：自然／線上／進階語音排前面 ----
  function score(v) {
    var n = v.name, s = 0, lang = v.lang.replace('_', '-');
    if (lang === 'zh-TW') s += 30; else if (lang === 'zh-HK') s += 15; else if (lang.indexOf('zh') === 0) s += 10;
    if (/Natural|Online|Neural/i.test(n)) s += 50;
    if (/Premium|Enhanced|進階|高音質/i.test(n)) s += 40;
    if (/Google/i.test(n)) s += 25;
    return s;
  }
  var voices = [];
  function fillVoices() {
    voices = (synth.getVoices() || []).filter(function (v) { return v.lang.toLowerCase().replace('_', '-').indexOf('zh') === 0; });
    voices.sort(function (a, b) { return score(b) - score(a); });
    var saved = load('ttsVoice', '');
    voiceSel.innerHTML = '';
    voices.forEach(function (v, i) {
      var o = document.createElement('option');
      o.value = v.name; o.textContent = v.name.replace(/Microsoft |\(.*?\)/g, '').trim() + '（' + v.lang + '）' + (score(v) >= 60 ? ' ★' : '');
      voiceSel.appendChild(o);
    });
    if (saved && voices.some(function (v) { return v.name === saved; })) voiceSel.value = saved;
    var good = voices.some(function (v) { return score(v) >= 60; });
    vhint.textContent = voices.length === 0 ? '這個裝置沒有中文語音，請在系統設定下載中文語音。'
      : good ? '★ 是比較自然的語音。'
      : '想要更自然的聲音：用 Microsoft Edge 瀏覽器開啟本站，或在手機設定下載「進階／高音質」中文語音（免費）。';
  }
  fillVoices();
  if ('onvoiceschanged' in synth) synth.onvoiceschanged = fillVoices;
  voiceSel.onchange = function () { save('ttsVoice', voiceSel.value); restartChunk(); };
  rateSel.onchange = function () { save('ttsRate', rateSel.value); restartChunk(); };
  function voice() { var n = voiceSel.value; for (var i = 0; i < voices.length; i++) if (voices[i].name === n) return voices[i]; return voices[0] || null; }

  // ---- 文字切段 ----
  var CITE = /（[^（）]{0,40}?[0-9０-９][^（）]{0,40}?）/g;
  var chunks = [];
  function build() {
    chunks = [];
    article.querySelectorAll('p').forEach(function (p) {
      var text = p.textContent.trim();
      if (optSkip.checked) text = text.replace(CITE, '');
      var parts = text.split(/(?<=[。！？；])/), buf = '';
      parts.forEach(function (t) {
        if ((buf + t).length > 90 && buf) { chunks.push({ el: p, t: buf }); buf = t; } else buf += t;
      });
      if (buf.trim()) chunks.push({ el: p, t: buf });
    });
  }
  build();

  // ---- 播放 ----
  var i = 0, state = 'idle', gen = 0, hl = null;
  function mark(el) {
    if (hl) hl.classList.remove('reading');
    hl = el;
    if (el) {
      el.classList.add('reading');
      var r = el.getBoundingClientRect();
      if (r.top < 90 || r.bottom > innerHeight - 130) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  function ui() {
    play.textContent = state === 'playing' ? '⏸ 暫停' : (state === 'paused' ? '▶ 繼續' : '🔊 朗讀');
    stop.hidden = state === 'idle';
  }
  function speak() {
    if (i >= chunks.length) { finishArticle(); return; }
    var my = gen, c = chunks[i], u = new SpeechSynthesisUtterance(c.t), v = voice();
    if (v) u.voice = v;
    u.lang = (v && v.lang) || 'zh-TW';
    u.rate = parseFloat(rateSel.value) || 1;
    mark(c.el);
    u.onend = u.onerror = function () { if (my !== gen || state !== 'playing') return; i++; speak(); };
    synth.speak(u);
  }
  function start(from) {
    if (typeof from === 'number') i = from;
    state = 'playing'; gen++; synth.cancel(); ui(); hideJump();
    setTimeout(speak, 60);
  }
  function restartChunk() { if (state === 'playing') { gen++; synth.cancel(); setTimeout(speak, 60); } }
  function pause() { state = 'paused'; gen++; synth.cancel(); ui(); }
  function reset() { state = 'idle'; gen++; synth.cancel(); i = 0; mark(null); ui(); nowEl.hidden = true; }
  play.onclick = function () { if (state === 'playing') pause(); else start(); };
  stop.onclick = reset;
  window.addEventListener('pagehide', function () { synth.cancel(); });

  // ---- 點段落從那裡開始 ----
  document.querySelectorAll('.tjump').forEach(function (e) { e.remove(); });
  var jump = document.createElement('button');
  jump.type = 'button'; jump.className = 'tjump'; jump.textContent = '▶ 從這段開始唸'; jump.hidden = true;
  document.body.appendChild(jump);
  var jumpTo = null;
  function hideJump() { jump.hidden = true; jumpTo = null; }
  article.addEventListener('click', function (e) {
    var p = e.target.closest('p'); if (!p || (window.getSelection() + '').length) return;
    var first = -1;
    for (var k = 0; k < chunks.length; k++) if (chunks[k].el === p) { first = k; break; }
    if (first < 0) return;
    if (state === 'playing') { start(first); return; }   // 播放中：直接跳過去
    jumpTo = first;
    var r = p.getBoundingClientRect();
    jump.style.top = (window.scrollY + r.top - 40) + 'px';
    jump.hidden = false;
  });
  jump.onclick = function () { if (jumpTo !== null) start(jumpTo); };
  document.addEventListener('scroll', function () { if (!jump.hidden && state !== 'playing') hideJump(); }, { passive: true });

  // ---- 唸完：自動完成、連播 ----
  function post(data) { return BIBLOS.mark(cur.key, parseInt(data.idx, 10), false); }
  function finishArticle() {
    mark(null);
    var idx = document.querySelector('.done-box').dataset.idx;
    var p = (optAuto.checked && !cur.finished)
      ? post({ idx: idx }).then(function (res) {
          cur.finished = true; setDone(true); tabCheck(cur.key);
          if (res.animal !== null && res.animal !== undefined) showAward(res);
        }).catch(function () {})
      : Promise.resolve();
    p.then(function () {
      if (optCont.checked) next(); else reset();
    });
  }
  function next() {
    BIBLOS.dayItems(cur.day).then(function (data) {
      var items = data.items, pos = 0;
      for (var k = 0; k < items.length; k++) if (items[k].key === cur.key) pos = k;
      var nxt = null;
      for (var s = 1; s <= items.length; s++) { var it = items[(pos + s) % items.length]; if (!it.done && it.key !== cur.key) { nxt = it; break; } }
      if (!nxt) { reset(); nowEl.hidden = false; nowEl.textContent = '🎉 這天的篇章都唸完了'; return; }
      render(nxt);
      i = 0; build();
      nowEl.hidden = false; nowEl.textContent = '連播：' + nxt.name;
      if (state === 'playing') setTimeout(speak, 400);
    }).catch(function () { reset(); });
  }
  function render(it) {
    cur.key = it.key; cur.finished = it.done;
    document.querySelector('.paper .meta').textContent = it.name + (it.sub ? ' · ' + it.sub : '') + ' · 第 ' + it.n + ' / ' + it.total + ' 篇';
    document.querySelector('.paper h2.title').textContent = it.title;
    document.title = it.title + ' - ' + it.name;
    article.innerHTML = '';
    it.paras.forEach(function (t) { var p = document.createElement('p'); p.textContent = t; article.appendChild(p); });
    var form = document.querySelector('.done-box');
    form.dataset.key = it.key; form.dataset.idx = it.idx;
    var dq = (cur.day === box.dataset.today) ? '' : '?d=' + cur.day;
    setDone(it.done);
    document.querySelectorAll('.tabs a[data-k]').forEach(function (a) { a.classList.toggle('on', a.dataset.k === it.key); });
    try { history.replaceState(null, '', '#/read/' + it.key + dq); } catch (e) {}
    window.scrollTo({ top: document.querySelector('.paper').offsetTop - 10, behavior: 'smooth' });
  }
  function setDone(done) {
    var form = document.querySelector('.done-box');
    var b = form.querySelector('button'), ok = form.querySelector('.ok');
    form.dataset.done = done ? '1' : '0';
    if (done) {
      if (!ok) { ok = document.createElement('div'); ok.className = 'ok'; ok.textContent = '✅ 已完成閱讀'; form.insertBefore(ok, b); }
      b.className = 'undo'; b.textContent = '取消完成';
    } else {
      if (ok) ok.remove();
      b.className = ''; b.textContent = '完成閱讀';
    }
  }
  function tabCheck(key) {
    var a = document.querySelector('.tabs a[data-k="' + key + '"]');
    if (a && !a.querySelector('.ck')) { var s = document.createElement('span'); s.className = 'ck'; s.textContent = '✓'; a.appendChild(s); }
    var g = document.getElementById('tgoal');
    if (g && g.dataset.got !== '1') {
      var cnt = parseInt(g.dataset.n, 10) + 1, goal = parseInt(g.dataset.goal, 10);
      g.dataset.n = cnt;
      g.textContent = cnt >= goal ? '🐾 今天的動物已經到手' : '今天已讀 ' + cnt + ' 篇，再讀 ' + (goal - cnt) + ' 篇得一隻動物';
      if (cnt >= goal) g.dataset.got = '1';
    }
    var n = document.querySelector('.todaycard .n');
    if (n) { var m = n.firstChild; var v = parseInt(m.textContent, 10); if (!isNaN(v)) m.textContent = (v + 1) + ' '; }
  }
  function showAward(res) {
    var d = document.createElement('div'); d.className = 'award';
    d.innerHTML = '<div class="box"><div style="font-size:1.1rem;font-weight:700"></div><div class="hint">恭喜你獲得 <b></b></div>' +
      '<span class="z t0"><img alt=""></span><div><button type="button">收進動物園</button></div></div>';
    d.querySelector('.box > div').textContent = '🎉 ' + '今天讀完 ' + ((document.getElementById('tgoal') || {}).dataset || {}).goal + ' 篇了！';
    d.querySelector('b').textContent = res.animal_name;
    d.querySelector('img').src = 'animals/' + ('0' + res.animal).slice(-2) + '.webp';
    d.onclick = function () { d.remove(); };
    document.body.appendChild(d);
  }
};
