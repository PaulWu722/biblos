import { RULES, TIER_LABEL } from '../../config/rules';
import { SCENES, sceneById } from '../../config/scenes';
import { SPECIES, speciesById } from '../../config/animals';
import { todayReadCount } from '../core/engine';
import type { GameEvent, GameState } from '../core/types';
import { fetchMe, getToken, login, setToken, type Me } from '../data/api';
import { BOOKS, BOOK_IDS, articleId, loadArticle, loadQuizIndex, loadTitles, type Article, type BookId } from '../data/articles';
import { LocalStorageAdapter, SupabaseAdapter, type StorageAdapter } from '../data/storage';
import { IslandView } from '../render/islandView';
import { Store } from './store';
import { ICON } from './icons';

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const LEVEL_NAME = { 1: '幼崽', 2: '成長', 3: '成熟' } as const;
const REJECT_TEXT: Record<string, string> = {
  DUPLICATE_ARTICLE: '這篇已經讀過了，每篇只算一次。',
  TOO_FAST: `閱讀時間不足 ${RULES.minReadSeconds} 秒。`,
  NOT_SCROLLED: '請先讀到文章最後。',
};

let store: Store | null = null;
/** Dev-only offline play (?local): the 場景 tab can jump to any scene to preview it. */
let localPreview = false;
let me: Me | null = null;
let stage: IslandView | null = null;
/** Reading that finished on #/read and is waiting for its quiz. */
let finishedRead: { id: string; seconds: number; scrolled: boolean } | null = null;
let cleanup: (() => void) | null = null;

const $ = (sel: string) => document.querySelector(sel) as HTMLElement;

export async function startApp(root: HTMLElement): Promise<void> {
  root.innerHTML = '<div class="stage" id="stage"></div><main id="view"></main><nav class="tabs" id="tabs"></nav><div id="toast"></div>';
  window.addEventListener('hashchange', route);
  // Dev only: ?local plays offline in localStorage, so testing never touches the real database.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('local')) {
    me = { id: 0, nick: '本機測試' };
    localPreview = true;
    await openWith(new LocalStorageAdapter());
    return route();
  }
  const token = getToken();
  if (token) {
    try { me = await fetchMe(token); } catch { me = null; }
    if (me) await openGame(token); else setToken(null);
  }
  route();
}

const openGame = (token: string) => openWith(new SupabaseAdapter(token));
async function openWith(adapter: StorageAdapter): Promise<void> {
  store = new Store(await adapter.load(), adapter);
  store.subscribe((s, ev) => { stage?.setScene(s.currentSceneId, s.unlockedSceneIds); stage?.setAnimals(s.animals); announce(ev); });
}

function toast(msg: string): void {
  const t = $('#toast');
  t.textContent = msg; t.className = 'show';
  setTimeout(() => (t.className = ''), 2600);
}

function announce(events: GameEvent[]): void {
  for (const e of events) {
    if (e.type === 'LEVEL_UP') toast(`有夥伴升到 Lv${e.level}「${LEVEL_NAME[e.level]}」！`);
    if (e.type === 'SCENE_UNLOCKED') toast(`${sceneById(e.from).name}住滿了！大家一起搬到「${sceneById(e.to).name}」`);
    if (e.type === 'GOLDEN_UNLOCKED') toast(`${sceneById(e.sceneId).name}的金色版本解鎖了！`);
  }
}

function route(): void {
  cleanup?.(); cleanup = null;
  const [page = 'island', ...args] = location.hash.replace(/^#\/?/, '').split('/');
  if (!store) return showLogin();
  const s = store.state;
  const view = $('#view');
  document.body.dataset.page = page;
  tabs(page);
  if (page === 'island') return showIsland(view, s);
  if (page === 'books') return void showBooks(view, s, (args[0] as BookId) || 'lee');
  if (page === 'read') return void showRead(view, args[0] as BookId, Number(args[1]));
  if (page === 'quiz') return void showQuiz(view, args[0] as BookId, Number(args[1]));
  if (page === 'egg') return showEggs(view, s);
  if (page === 'collection') return showCollection(view, s);
  if (page === 'scenes') return showScenes(view, s);
  if (page === 'settings') return showSettings(view);
  location.hash = '#/island';
}

function tabs(page: string): void {
  const items = [['island', '島嶼', ICON.island], ['collection', '圖鑑', ICON.book], ['scenes', '場景', ICON.mountains]] as const;
  const active = ['books', 'read', 'quiz', 'egg', 'settings'].includes(page) ? 'island' : page;
  $('#tabs').innerHTML = items.map(([id, label, icon]) => `<a href="#/${id}" class="${id === active ? 'on' : ''}">${icon}<span>${label}</span></a>`).join('');
}

// ---------- 登入 ----------
function showLogin(): void {
  document.body.dataset.page = 'login';
  $('#tabs').innerHTML = '';
  const view = $('#view');
  let needNick = false;
  const draw = (phone = '', err = '') => {
    view.innerHTML = `<section class="panel login">
      <h1>信息島</h1><p class="sub">讀信息、答題、孵蛋，讓島上住滿動物</p>
      <form><label>手機號碼<input name="phone" inputmode="numeric" autocomplete="tel" value="${esc(phone)}" required></label>
      ${needNick ? '<label>暱稱（第一次登入）<input name="nick" maxlength="12" required></label>' : ''}
      <button class="primary">${needNick ? '建立並登入' : '登入'}</button>
      ${err ? `<p class="err">${esc(err)}</p>` : ''}</form>
      <p class="hint">用手機號碼登入，不需要密碼；換手機也能接著玩。</p></section>`;
    view.querySelector('form')!.onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target as HTMLFormElement);
      const p = String(f.get('phone')).replace(/\D/g, '');
      try {
        const r = await login(p, needNick ? String(f.get('nick')) : undefined);
        if ('need_nick' in r) { needNick = true; return draw(p); }
        setToken(r.token); me = r.me;
        await openGame(r.token);
        stage ??= new IslandView($('#stage'), store!.state.currentSceneId, store!.state.unlockedSceneIds);
        stage.setAnimals(store!.state.animals);
        location.hash = '#/island'; route();
      } catch (err) { draw(p, err instanceof Error && err.message === 'bad phone' ? '手機號碼格式不對' : '登入失敗，請稍後再試'); }
    };
  };
  draw();
}

// ---------- 島嶼 ----------
function showIsland(view: HTMLElement, s: GameState): void {
  stage ??= new IslandView($('#stage'), s.currentSceneId, s.unlockedSceneIds);
  stage.setScene(s.currentSceneId, s.unlockedSceneIds);
  stage.setAnimals(s.animals);
  document.body.dataset.scene = s.currentSceneId;
  const scene = sceneById(s.currentSceneId);
  const eggs = s.eggs.filter((e) => !e.hatched).length;
  const today = todayReadCount(s, new Date());
  const goal = RULES.articlesPerEgg;
  view.innerHTML = `<header class="hud">
      <a href="#/settings" class="logo" aria-label="設定">${ICON.sprout}</a>
      <h1 data-len="${scene.name.length}"><span id="scene-name">${scene.name}</span><small id="scene-count">${s.animals.length}/${scene.capacity}</small></h1>
      <div class="today">${ICON.book}<span>今日閱讀<br>${today >= goal ? `${today} 篇` : `${today}/${goal} 篇`}</span></div>
    </header>
    <div class="hud-foot">
      ${eggs ? `<a class="pill" href="#/egg">${ICON.sprout}<span>孵化 ${eggs} 顆蛋</span></a>`
        : `<a class="pill" href="#/books">${ICON.sprout}<span>開始讀信息</span></a>`}
      <div class="divider"><i></i></div>
    </div>`;
  // Swiping to a memory island shows its name and「回憶島」instead of the count.
  stage.onView = (id, current) => {
    $('#scene-name').textContent = sceneById(id).name;
    $('#scene-name').parentElement!.dataset.len = String(sceneById(id).name.length);
    $('#scene-count').textContent = current ? `${s.animals.length}/${scene.capacity}` : '回憶島';
  };
}

// ---------- 選篇 ----------
async function showBooks(view: HTMLElement, s: GameState, book: BookId): Promise<void> {
  if (!BOOKS[book]) book = 'lee';
  view.innerHTML = '<section class="panel"><p class="loading">載入中…</p></section>';
  const [titles, index] = await Promise.all([loadTitles(), loadQuizIndex()]);
  const done = new Set(s.reads.map((r) => r.articleId));
  const list = index[book] ?? [];
  view.innerHTML = `<section class="panel">
    <h2>選一篇來讀</h2>
    <p class="sub">再讀 ${RULES.articlesPerEgg - s.pendingBatch.length} 篇得一顆蛋，篇數不限、可自由挑選。</p>
    <div class="chips">${BOOK_IDS.map((b) => `<a href="#/books/${b}" class="${b === book ? 'on' : ''}">${BOOKS[b]}</a>`).join('')}</div>
    <ol class="articles">${list.map((i) => {
      const read = done.has(articleId(book, i));
      return `<li class="${read ? 'read' : ''}"><a href="#/read/${book}/${i}"><span class="n">${i + 1}</span>${esc(titles[book][i] ?? '')}${read ? '<em>已讀</em>' : ''}</a></li>`;
    }).join('') || '<li class="empty">這本書的題目還在準備中</li>'}</ol></section>`;
}

// ---------- 閱讀 ----------
async function showRead(view: HTMLElement, book: BookId, idx: number): Promise<void> {
  view.innerHTML = '<section class="panel"><p class="loading">載入中…</p></section>';
  let art: Article;
  try { art = await loadArticle(book, idx); } catch { view.innerHTML = '<section class="panel"><p class="err">找不到這篇，或題目還沒準備好。</p><a href="#/books">回到選篇</a></section>'; return; }
  const already = store!.state.reads.some((r) => r.articleId === art.id);
  const need = store!.state.settings.minReadSeconds;
  view.innerHTML = `<article class="panel reader">
    <p class="meta">${BOOKS[book]} · 第 ${idx + 1} 篇</p><h2>${esc(art.title)}</h2>
    ${art.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
    <div id="end"></div>
    <div class="read-foot">${already ? '<p class="sub">這篇已經讀過，不會再算一次。</p>'
      : `<button class="primary" id="done" disabled>還要 ${need} 秒</button>`}</div></article>`;
  scrollTo(0, 0);
  if (already) return;

  // Anti-cheat: count only visible time, and require reaching the end.
  let seconds = 0, scrolled = false;
  const btn = $('#done') as HTMLButtonElement;
  const update = () => {
    const left = Math.max(0, need - Math.floor(seconds));
    btn.disabled = left > 0 || !scrolled;
    btn.textContent = left > 0 ? `還要 ${left} 秒` : scrolled ? '讀完了，去答題' : '請讀到最後';
  };
  const timer = setInterval(() => { if (!document.hidden) { seconds += 1; update(); } }, 1000);
  const io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { scrolled = true; update(); } });
  io.observe($('#end'));
  btn.onclick = () => { finishedRead = { id: art.id, seconds, scrolled }; location.hash = `#/quiz/${book}/${idx}`; };
  cleanup = () => { clearInterval(timer); io.disconnect(); };
}

// ---------- 答題 ----------
async function showQuiz(view: HTMLElement, book: BookId, idx: number): Promise<void> {
  const id = articleId(book, idx);
  if (finishedRead?.id !== id) { location.hash = `#/read/${book}/${idx}`; return; }
  const art = await loadArticle(book, idx);
  const read = finishedRead;
  let qi = 0, correct = 0;
  const draw = (picked: number | null) => {
    const q = art.questions[qi]!;
    view.innerHTML = `<section class="panel quiz">
      <p class="meta">第 ${qi + 1} / ${art.questions.length} 題 · ${esc(art.title)}</p>
      <h2>${esc(q.q)}</h2>
      <div class="options">${q.options.map((o, i) => {
        const cls = picked === null ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim';
        return `<button data-i="${i}" class="${cls}" ${picked !== null ? 'disabled' : ''}>${esc(o)}</button>`;
      }).join('')}</div>
      ${picked === null ? '' : `<p class="verdict ${picked === q.answer ? 'right' : 'wrong'}">${picked === q.answer ? '答對了！' : `正確答案：${esc(q.options[q.answer])}`}</p>
        <p class="ref">出處：${esc(q.ref)}</p><button class="primary" id="next">${qi + 1 < art.questions.length ? '下一題' : '完成'}</button>`}
    </section>`;
    view.querySelectorAll<HTMLButtonElement>('.options button').forEach((b) => (b.onclick = () => {
      const i = Number(b.dataset.i);
      if (i === q.answer) correct++;
      draw(i);
    }));
    const next = view.querySelector<HTMLButtonElement>('#next');
    if (next) next.onclick = () => { if (++qi < art.questions.length) draw(null); else void finish(); };
  };
  const finish = async () => {
    finishedRead = null;
    let events: GameEvent[];
    try {
      events = await store!.act({ type: 'SUBMIT_ARTICLE', articleId: id, correct, readSeconds: read.seconds, scrolledToBottom: read.scrolled });
    } catch { toast('存檔失敗，請檢查網路；下次存檔會一起補上。'); events = []; }
    const rej = events.find((e) => e.type === 'REJECTED');
    const egg = events.find((e) => e.type === 'EGG_EARNED');
    const xp = RULES.xpPerArticle + RULES.xpPerCorrect * correct;
    const left = RULES.articlesPerEgg - store!.state.pendingBatch.length;
    view.innerHTML = `<section class="panel result">
      ${rej?.type === 'REJECTED' ? `<h2>沒有計入</h2><p>${REJECT_TEXT[rej.reason] ?? '請再試一次。'}</p>`
        : `<h2>答對 ${correct} / ${art.questions.length} 題</h2>
           <p>${store!.state.companions.length ? `夥伴們各得到 ${xp} 點經驗` : `得到 ${xp} 點經驗（有動物後會分給夥伴）`}</p>
           ${egg?.type === 'EGG_EARNED' ? `<div class="egg-big ${egg.egg.tier}"></div><p class="big">得到一顆${TIER_LABEL[egg.egg.tier]}！</p><a class="primary" href="#/egg">去孵蛋</a>`
             : `<p class="sub">再讀 ${left} 篇得一顆蛋</p><a class="primary" href="#/books/${book}">再讀一篇</a>`}`}
      <a href="#/island" class="link">回到島上</a></section>`;
  };
  draw(null);
}

// ---------- 孵蛋 ----------
function showEggs(view: HTMLElement, s: GameState): void {
  const eggs = s.eggs.filter((e) => !e.hatched);
  view.innerHTML = `<section class="panel eggs"><h2>孵蛋</h2>
    ${eggs.length ? '<p class="sub">點一下蛋來孵化</p>' : '<p class="sub">目前沒有蛋。讀 3 篇信息就能得到一顆。</p><a class="primary" href="#/books">去讀信息</a>'}
    <div class="egg-row">${eggs.map((e) => `<button class="egg-big ${e.tier}" data-id="${e.id}" aria-label="${TIER_LABEL[e.tier]}"></button>`).join('')}</div>
    <div id="hatched"></div></section>`;
  view.querySelectorAll<HTMLButtonElement>('.egg-row button').forEach((b) => (b.onclick = async () => {
    view.querySelectorAll('.egg-row button').forEach((x) => ((x as HTMLButtonElement).disabled = true));
    b.classList.add('shake');
    await new Promise((r) => setTimeout(r, 1200));
    let events: GameEvent[] = [];
    try { events = await store!.act({ type: 'HATCH_EGG', eggId: b.dataset.id! }); }
    catch { toast('存檔失敗，請檢查網路；下次存檔會一起補上。'); events = []; }
    const h = events.find((e) => e.type === 'EGG_HATCHED');
    if (h?.type !== 'EGG_HATCHED') return showEggs(view, store!.state);
    const a = h.animal;
    view.innerHTML = `<section class="panel result">
      <div class="burst"></div><h2>孵出了「${speciesById(a.speciesId).name}」！</h2>
      <p>Lv${a.level} ${LEVEL_NAME[a.level]} · ${a.xp} 經驗</p>
      ${store!.state.companions.includes(a.id) ? '<p class="sub">牠成為你的夥伴，讀信息時會一起成長。</p>' : ''}
      ${store!.state.eggs.some((e) => !e.hatched) ? '<a class="primary" href="#/egg" id="more">再孵一顆</a>' : ''}
      <a class="primary" href="#/island">去島上看看</a></section>`;
    view.querySelector<HTMLAnchorElement>('#more')?.addEventListener('click', (e) => { e.preventDefault(); showEggs(view, store!.state); });
  }));
}

// ---------- 圖鑑 ----------
function showCollection(view: HTMLElement, s: GameState): void {
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
  view.innerHTML = `<section class="panel"><h2>圖鑑</h2>
    <p class="sub">已收集 ${Object.keys(s.collection).length} / ${SPECIES.length} 種</p>
    ${SCENES.map((sc) => `<h3>${sc.name}${s.goldenScenes.includes(sc.id) ? ' <span class="gold">金色解鎖</span>' : ''}</h3>
      <div class="grid">${SPECIES.filter((x) => x.scene === sc.id).map((x) => {
        const c = s.collection[x.id];
        return c ? `<div class="card"><b>${x.name}</b><span>${stars(c.maxLevel)}</span><small>×${c.count}</small></div>`
          : '<div class="card locked"><b>？</b></div>';
      }).join('')}</div>`).join('')}
    <h3>我的動物 <small>（最多選 ${RULES.maxCompanions} 隻夥伴，讀信息時分到經驗）</small></h3>
    <ul class="mine">${s.animals.map((a) => `<li><label><input type="checkbox" data-id="${a.id}" ${s.companions.includes(a.id) ? 'checked' : ''}>
      ${speciesById(a.speciesId).name} <span>Lv${a.level} · ${a.xp} 經驗</span></label></li>`).join('') || '<li class="empty">還沒有動物</li>'}</ul></section>`;
  view.querySelectorAll<HTMLInputElement>('.mine input').forEach((box) => (box.onchange = async () => {
    const ids = [...view.querySelectorAll<HTMLInputElement>('.mine input:checked')].map((x) => x.dataset.id!);
    if (ids.length > RULES.maxCompanions) { box.checked = false; return toast(`夥伴最多 ${RULES.maxCompanions} 隻`); }
    try { await store!.act({ type: 'SET_COMPANIONS', animalIds: ids }); } catch { toast('存檔失敗，請檢查網路'); }
  }));
}

// ---------- 場景 ----------
function showScenes(view: HTMLElement, s: GameState): void {
  view.innerHTML = `<section class="panel"><h2>場景</h2>
    <p class="sub">目前的島住滿，就會解鎖下一個場景，所有動物一起搬過去。</p>
    <ol class="scenes">${SCENES.map((sc) => {
      const st = sc.id === s.currentSceneId ? 'current' : s.unlockedSceneIds.includes(sc.id) ? 'done' : 'locked';
      const label = st === 'current' ? `${s.animals.length}/${sc.capacity} 隻` : st === 'done' ? '回憶島' : `容量 ${sc.capacity}`;
      return `<li class="${st}" data-id="${sc.id}"><b>${sc.order}. ${sc.name}</b><span>${label}</span></li>`;
    }).join('')}</ol>${localPreview ? '<p class="hint">本機預覽：點任一場景直接切換（正式版沒有這個功能）</p>' : ''}</section>`;
  if (!localPreview) return;
  view.querySelectorAll<HTMLLIElement>('.scenes li').forEach((li) => (li.onclick = () => {
    const id = li.dataset.id as typeof s.currentSceneId;
    const order = SCENES.map((x) => x.id);
    const t = new Date().toISOString();
    const animals = SPECIES.filter((x) => x.scene === id).map((x) => ({ id: `preview-${x.id}`, speciesId: x.id, level: 3 as const, xp: 250, originSceneId: id, createdAt: t, updatedAt: t }));
    const next = { ...s, currentSceneId: id, unlockedSceneIds: order.slice(0, order.indexOf(id) + 1), animals, companions: [] };
    localStorage.setItem(RULES.storageKey, JSON.stringify(next));
    store!.replace(next);
    location.hash = '#/island';
  }));
}

// ---------- 設定 ----------
function showSettings(view: HTMLElement): void {
  view.innerHTML = `<section class="panel"><h2>設定</h2>
    <p>暱稱：${esc(me?.nick ?? '')}</p>
    <button id="export">匯出存檔（JSON）</button>
    <button id="logout">登出</button></section>`;
  $('#export').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(store!.state, null, 2)], { type: 'application/json' }));
    a.download = 'xinxi-island.json'; a.click();
  };
  $('#logout').onclick = () => { setToken(null); location.hash = ''; location.reload(); };
}
