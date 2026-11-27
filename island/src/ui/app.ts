import { RULES, TIER_LABEL, type EggTier } from '../../config/rules';
import { SCENES, sceneById } from '../../config/scenes';
import { SPECIES, speciesById } from '../../config/animals';
import { upgradeCost } from '../core/engine';
import type { Animal, GameEvent, GameState } from '../core/types';
import { fetchAdmin, fetchBoard, fetchIsland, fetchMe, getToken, login, setToken, type AdminRow, type Me, type Runner, type Visit } from '../data/api';
import { BOOKS, BOOK_IDS, articleId, loadArticle, loadQuizIndex, loadTitles, type Article, type BookId } from '../data/articles';
import { LocalStorageAdapter, SupabaseAdapter, type StorageAdapter } from '../data/storage';
import { IslandView, spriteFor } from '../render/islandView';
import { Store } from './store';
import { ICON } from './icons';

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const LEVEL_NAME = { 1: '幼崽', 2: '成長', 3: '成熟' } as const;
const REJECT_TEXT: Record<string, string> = {
  DUPLICATE_ARTICLE: '這篇已經讀過了，每篇只算一次。',
  NOT_SCROLLED: '請先讀到文章最後。',
};

let store: Store | null = null;
/** Dev-only offline play (?local): the 場景 tab can jump to any scene to preview it. */
let localPreview = false;
let me: Me | null = null;
let stage: IslandView | null = null;
/** Reading that finished on #/read and is waiting for its quiz. */
let finishedRead: { id: string; scrolled: boolean } | null = null;
let cleanup: (() => void) | null = null;
/** Scene the island just moved to; its transition plays the next time the island page shows. */
let pendingMove: string | null = null;
/** Admin key, kept in memory only. */
let adminKey: string | null = null;

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
  store.subscribe((s, ev) => {
    // Off the island page, the move to a new island waits for showIsland so the slide and transition are seen.
    if (document.body.dataset.page === 'island') stage?.setScene(s.currentSceneId, s.unlockedSceneIds);
    stage?.setAnimals(s.animals, s.goldenScenes); announce(ev);
  });
}

function toast(msg: string): void {
  const t = $('#toast');
  t.textContent = msg; t.className = 'show';
  setTimeout(() => (t.className = ''), 2600);
}

function announce(events: GameEvent[]): void {
  for (const e of events) {
    if (e.type === 'LEVEL_UP') { const a = store!.state.animals.find((x) => x.id === e.animalId); toast(`${a ? speciesById(a.speciesId).name : '動物'}升到 Lv${e.level}「${LEVEL_NAME[e.level]}」！`); }
    if (e.type === 'SCENE_UNLOCKED') { toast(`${sceneById(e.from).name}住滿了！大家一起搬到「${sceneById(e.to).name}」`); pendingMove = e.to; }
    if (e.type === 'GOLDEN_UNLOCKED') toast(`${sceneById(e.sceneId).name}的動物都長大了，開始發光跳舞！`);
  }
}

function route(): void {
  cleanup?.(); cleanup = null;
  const [page = 'island', ...args] = location.hash.replace(/^#\/?/, '').split('/');
  delete document.body.dataset.visit;
  if (page === 'admin') { document.body.dataset.page = 'admin'; $('#tabs').innerHTML = ''; return void showAdmin($('#view')); }
  if (!store) return showLogin();
  const s = store.state;
  const view = $('#view');
  document.body.dataset.page = page;
  document.body.dataset.scene = s.currentSceneId;
  tabs(page);
  if (page === 'island') return showIsland(view, s);
  if (page === 'books') return void showBooks(view, s, (args[0] as BookId) || 'lee');
  if (page === 'read') return void showRead(view, args[0] as BookId, Number(args[1]));
  if (page === 'quiz') return void showQuiz(view, args[0] as BookId, Number(args[1]));
  if (page === 'egg') return showEggs(view, s);
  if (page === 'collection') return showCollection(view, s);
  if (page === 'scenes') return void (location.hash = '#/collection');
  if (page === 'race') return void showRace(view, s);
  if (page === 'visit') return void showVisit(view, Number(args[0]));
  if (page === 'settings') return showSettings(view);
  location.hash = '#/island';
}

function tabs(page: string): void {
  const items = [['island', '島嶼', ICON.island], ['books', '讀信息', ICON.book], ['race', '賽程', ICON.flag], ['collection', '圖鑑', ICON.mountains]] as const;
  const active = ['read', 'quiz'].includes(page) ? 'books' : ['egg', 'settings'].includes(page) ? 'island' : page === 'visit' ? 'race' : page;
  $('#tabs').innerHTML = items.map(([id, label, icon]) => `<a href="#/${id}" class="${id === active ? 'on' : ''}">${icon}<span>${label}</span></a>`).join('');
}

// ---------- 登入 ----------
const T = RULES.tierBounds;
/** Cute bear guide on the login page, explaining how the island works. */
const BEAR = `<div class="guide"><svg class="bear" viewBox="0 0 120 130" aria-hidden="true">
  <circle cx="30" cy="30" r="16" fill="#B07A4F"/><circle cx="90" cy="30" r="16" fill="#B07A4F"/>
  <circle cx="30" cy="30" r="8" fill="#E8B98F"/><circle cx="90" cy="30" r="8" fill="#E8B98F"/>
  <ellipse cx="60" cy="112" rx="34" ry="22" fill="#B07A4F"/><ellipse cx="60" cy="116" rx="18" ry="13" fill="#E8B98F"/>
  <circle cx="60" cy="58" r="40" fill="#C08A5B"/>
  <ellipse cx="60" cy="72" rx="17" ry="13" fill="#F1D3B0"/>
  <circle cx="45" cy="54" r="4.5" fill="#3B2A1E"/><circle cx="75" cy="54" r="4.5" fill="#3B2A1E"/>
  <circle cx="46.5" cy="52.5" r="1.5" fill="#fff"/><circle cx="76.5" cy="52.5" r="1.5" fill="#fff"/>
  <ellipse cx="60" cy="66" rx="6" ry="4.5" fill="#3B2A1E"/>
  <path d="M54 74q6 6 12 0" stroke="#3B2A1E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="35" cy="68" rx="7" ry="4.5" fill="#F29B9B" opacity=".6"/><ellipse cx="85" cy="68" rx="7" ry="4.5" fill="#F29B9B" opacity=".6"/>
</svg><div class="bubble"><b>歡迎來到信息島！我是小熊，跟你說登島規則：</b><ol>
  <li>用手機號碼登島，不用密碼，換手機也能接著玩。</li>
  <li>每讀完一篇信息，回答 ${RULES.questionsPerArticle} 題。</li>
  <li>讀 ${RULES.articlesPerEgg} 篇得一顆蛋。${RULES.articlesPerEgg} 篇共 ${RULES.articlesPerEgg * RULES.questionsPerArticle} 題，答對 ${T.rareMin} 題以上是稀有蛋，${T.preciousMin} 題是珍貴蛋，全對是傳說蛋。</li>
  <li>孵出動物，用經驗值幫牠長大。</li>
  <li>島住滿了，大家就一起搬到下一座島。</li></ol></div></div>`;
function showLogin(): void {
  document.body.dataset.page = 'login';
  $('#tabs').innerHTML = '';
  const view = $('#view');
  let needNick = false;
  const draw = (phone = '', err = '') => {
    view.innerHTML = `${BEAR}<section class="panel login">
      <h1>信息島</h1><p class="sub">讀信息、答題、孵蛋，讓島上住滿動物</p>
      <form><label>手機號碼<input name="phone" inputmode="numeric" autocomplete="tel" value="${esc(phone)}" required></label>
      ${needNick ? '<label>暱稱（第一次登入）<input name="nick" maxlength="12" required></label>' : ''}
      <button class="primary">${needNick ? '建立並登入' : '登入'}</button>
      ${err ? `<p class="err">${esc(err)}</p>` : ''}</form>
      <p class="hint">用手機號碼登入，不需要密碼；換手機也能接著玩。</p>
      <p class="hint"><a href="#/admin">管理員後台</a></p></section>`;
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
        stage.setAnimals(store!.state.animals, store!.state.goldenScenes);
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
  stage.setAnimals(s.animals, s.goldenScenes);
  document.body.dataset.scene = s.currentSceneId;
  if (pendingMove) { playTransition(pendingMove); pendingMove = null; }
  const scene = sceneById(s.currentSceneId);
  const eggs = s.eggs.filter((e) => !e.hatched).length;
  view.innerHTML = `<header class="hud">
      <a href="#/settings" class="logo" aria-label="設定">${ICON.sprout}</a>
      <h1 data-len="${scene.name.length}"><span id="scene-name">${scene.name}</span><small id="scene-count">${s.animals.length}/${scene.capacity}</small></h1>
      <a class="today" href="#/collection" aria-label="經驗值，到圖鑑升級">${ICON.star}<span>經驗值<br><b id="xp">${s.xp}</b></span></a>
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
      return `<li class="${read ? 'read' : ''}"><a href="#/read/${book}/${i}"><span class="n">${read ? '✓' : i + 1}</span>${esc(titles[book][i] ?? '')}${read ? '<em>✓ 已讀完</em>' : ''}</a></li>`;
    }).join('') || '<li class="empty">這本書的題目還在準備中</li>'}</ol></section>`;
}

// ---------- 閱讀 ----------
async function showRead(view: HTMLElement, book: BookId, idx: number): Promise<void> {
  view.innerHTML = '<section class="panel"><p class="loading">載入中…</p></section>';
  let art: Article;
  try { art = await loadArticle(book, idx); } catch { view.innerHTML = '<section class="panel"><p class="err">找不到這篇，或題目還沒準備好。</p><a href="#/books">回到選篇</a></section>'; return; }
  const already = store!.state.reads.some((r) => r.articleId === art.id);
  view.innerHTML = `<article class="panel reader">
    <p class="meta">${BOOKS[book]} · 第 ${idx + 1} 篇</p><h2>${esc(art.title)}</h2>
    ${art.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
    <div id="end"></div>
    <div class="read-foot">${already ? '<p class="sub">這篇已經讀過，不會再算一次。</p>'
      : '<button class="primary" id="done" disabled>請讀到最後</button>'}</div></article>`;
  scrollTo(0, 0);
  if (already) return;

  // Anti-cheat: the quiz opens only after reaching the end of the article.
  const btn = $('#done') as HTMLButtonElement;
  const io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { btn.disabled = false; btn.textContent = '讀完了，去答題'; } });
  io.observe($('#end'));
  btn.onclick = () => { finishedRead = { id: art.id, scrolled: true }; location.hash = `#/quiz/${book}/${idx}`; };
  cleanup = () => io.disconnect();
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
      events = await store!.act({ type: 'SUBMIT_ARTICLE', articleId: id, correct, scrolledToBottom: read.scrolled });
    } catch { toast('存檔失敗，請檢查網路；下次存檔會一起補上。'); events = []; }
    const rej = events.find((e) => e.type === 'REJECTED');
    const egg = events.find((e) => e.type === 'EGG_EARNED');
    const xp = RULES.xpPerArticle + RULES.xpPerCorrect * correct;
    const left = RULES.articlesPerEgg - store!.state.pendingBatch.length;
    view.innerHTML = `<section class="panel result">
      ${rej?.type === 'REJECTED' ? `<h2>沒有計入</h2><p>${REJECT_TEXT[rej.reason] ?? '請再試一次。'}</p>`
        : `<h2>答對 ${correct} / ${art.questions.length} 題</h2>
           <p>得到 ${xp} 點經驗，累積到 ${store!.state.xp} 點</p><p class="sub">到圖鑑可以用經驗值幫動物升級</p>
           ${egg?.type === 'EGG_EARNED' ? `${eggArt(egg.egg.tier, 'div')}<span class="tier ${egg.egg.tier}">${TIER_LABEL[egg.egg.tier]}</span><p class="big">得到一顆${TIER_LABEL[egg.egg.tier]}！</p><a class="primary" href="#/egg">去孵蛋</a>`
             : `<p class="sub">再讀 ${left} 篇得一顆蛋</p><a class="primary" href="#/books/${book}">再讀一篇</a>`}`}
      <a href="#/island" class="link">回到島上</a></section>`;
  };
  draw(null);
}

// ---------- 孵蛋 ----------
/** Egg picture drawn twice, clipped into a top and bottom shell so it can crack open. */
function eggArt(tier: EggTier, tag: 'div' | 'button', attrs = ''): string {
  const src = `${import.meta.env.BASE_URL}eggs/${tier}.png`;
  return `<${tag} class="egg-big ${tier}" ${attrs}><img class="shell top" alt="" src="${src}"><img class="shell bot" alt="" src="${src}"></${tag}>`;
}
function showEggs(view: HTMLElement, s: GameState): void {
  const eggs = s.eggs.filter((e) => !e.hatched);
  view.innerHTML = `<section class="panel eggs"><h2>孵蛋</h2>
    ${eggs.length ? '<p class="sub">點一下蛋來孵化</p>' : '<p class="sub">目前沒有蛋。讀 3 篇信息就能得到一顆。</p><a class="primary" href="#/books">去讀信息</a>'}
    <div class="egg-row">${eggs.map((e) => `<div class="egg-item">${eggArt(e.tier, 'button', `data-id="${e.id}" aria-label="${TIER_LABEL[e.tier]}"`)}<span class="tier ${e.tier}">${TIER_LABEL[e.tier]}</span></div>`).join('')}</div>
    <div id="hatched"></div></section>`;
  view.querySelectorAll<HTMLButtonElement>('.egg-row button').forEach((b) => (b.onclick = async () => {
    view.querySelectorAll('.egg-row button').forEach((x) => ((x as HTMLButtonElement).disabled = true));
    b.classList.add('shake');
    await new Promise((r) => setTimeout(r, 1200));
    b.classList.replace('shake', 'crack');
    await new Promise((r) => setTimeout(r, 600));
    let events: GameEvent[] = [];
    try { events = await store!.act({ type: 'HATCH_EGG', eggId: b.dataset.id! }); }
    catch { toast('存檔失敗，請檢查網路；下次存檔會一起補上。'); events = []; }
    const h = events.find((e) => e.type === 'EGG_HATCHED');
    if (h?.type !== 'EGG_HATCHED') return showEggs(view, store!.state);
    const a = h.animal;
    view.innerHTML = `<section class="panel result">
      <div class="burst">${hatchImg(a)}</div><h2>孵出了「${speciesById(a.speciesId).name}」！</h2>
      <p>Lv${a.level} ${LEVEL_NAME[a.level]} · ${a.xp} 經驗</p>
      <p class="sub">讀信息累積經驗值，到圖鑑幫牠升級</p>
      ${store!.state.eggs.some((e) => !e.hatched) ? '<a class="primary" href="#/egg" id="more">再孵一顆</a>' : ''}
      <a class="primary" href="#/island">去島上看看</a></section>`;
    view.querySelector<HTMLAnchorElement>('#more')?.addEventListener('click', (e) => { e.preventDefault(); showEggs(view, store!.state); });
  }));
}

function hatchImg(a: Animal): string {
  return `<img alt="" src="${spriteFor(a.speciesId, a.level)}">`;
}

// ---------- 圖鑑 ----------
function showCollection(view: HTMLElement, s: GameState): void {
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
  view.innerHTML = `<section class="panel"><h2>圖鑑</h2>
    <h3 id="mine">我的動物 <small>可用經驗值 <b>${s.xp}</b></small></h3>
    <ul class="mine">${s.animals.map((a) => {
      const cost = upgradeCost(a);
      return `<li><img alt="" loading="lazy" src="${spriteFor(a.speciesId, a.level)}"><div><b>${a.name ? `${esc(a.name)} <small>${speciesById(a.speciesId).name}</small>` : speciesById(a.speciesId).name}</b><span>Lv${a.level} ${LEVEL_NAME[a.level]}</span></div>
        <button class="rename" data-id="${a.id}">${a.name ? '改名' : '取名'}</button>
        ${a.level === 3 ? '<em>已成熟</em>' : `<button class="up" data-id="${a.id}" ${s.xp < cost ? 'disabled' : ''}>升級<small>${cost} 經驗</small></button>`}</li>`;
    }).join('') || '<li class="empty">還沒有動物</li>'}</ul>
    <h3>收集 <small>${Object.keys(s.collection).length} / ${SPECIES.length} 種</small></h3>
    ${SCENES.map((sc) => `<h3>${sc.name}${s.goldenScenes.includes(sc.id) ? ' <span class="gold">金色解鎖</span>' : ''}</h3>
      <div class="grid">${SPECIES.filter((x) => x.scene === sc.id).map((x) => {
        const c = s.collection[x.id];
        const gold = s.goldenScenes.includes(sc.id);
        const img = `${gold && c ? '<i class="rays"></i>' : ''}<img alt="" loading="lazy" src="${spriteFor(x.id, c?.maxLevel ?? 2)}">`;
        return c ? `<div class="card${c.maxLevel === 3 ? ' lv3' : ''}${gold ? ' golden' : ''}">${img}<b>${x.name}</b><span>${stars(c.maxLevel)}</span><small>×${c.count}</small></div>`
          : `<div class="card locked">${img}<b>？</b></div>`;
      }).join('')}</div>`).join('')}
</section>${scenesHtml(s)}`;
  view.querySelectorAll<HTMLButtonElement>('.mine .up').forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    const y = scrollY;
    try { await store!.act({ type: 'LEVEL_UP_ANIMAL', animalId: b.dataset.id! }); } catch { toast('存檔失敗，請檢查網路'); }
    showCollection(view, store!.state);
    scrollTo(0, y);
  }));
  view.querySelectorAll<HTMLButtonElement>('.mine .rename').forEach((b) => (b.onclick = async () => {
    const a = store!.state.animals.find((x) => x.id === b.dataset.id);
    const name = prompt('幫牠取個名字（最多 8 個字，留空就取消名字）', a?.name ?? '');
    if (name === null) return;
    const y = scrollY;
    try { await store!.act({ type: 'RENAME_ANIMAL', animalId: b.dataset.id!, name }); } catch { toast('存檔失敗，請檢查網路'); }
    showCollection(view, store!.state);
    scrollTo(0, y);
  }));
  bindScenes(view, s);
}

// ---------- 場景 ----------
function scenesHtml(s: GameState): string {
  return `<section class="panel" id="scenes"><h2>場景</h2>
    <p class="sub">目前的島住滿，就會解鎖下一個場景，所有動物一起搬過去。</p>
    <ol class="scenes">${SCENES.map((sc) => {
      const st = sc.id === s.currentSceneId ? 'current' : s.unlockedSceneIds.includes(sc.id) ? 'done' : 'locked';
      const label = st === 'current' ? `${s.animals.length}/${sc.capacity} 隻` : st === 'done' ? '回憶島' : `容量 ${sc.capacity}`;
      return `<li class="${st}" data-id="${sc.id}"><b>${sc.order}. ${sc.name}</b><span>${label}</span></li>`;
    }).join('')}</ol>${localPreview ? '<p class="hint">本機預覽：點任一場景直接切換（正式版沒有這個功能）</p>' : ''}</section>`;
}
function bindScenes(view: HTMLElement, s: GameState): void {
  if (!localPreview) return;
  view.querySelectorAll<HTMLLIElement>('.scenes li').forEach((li) => (li.onclick = () => {
    const id = li.dataset.id as typeof s.currentSceneId;
    const order = SCENES.map((x) => x.id);
    const t = new Date().toISOString();
    // Mixed levels so the 圖鑑 level-up buttons can be tried.
    const animals = SPECIES.filter((x) => x.scene === id).map((x, i) => { const level = ((i % 3) + 1) as 1 | 2 | 3; return { id: `preview-${x.id}`, speciesId: x.id, level, xp: RULES.levelXp[level], originSceneId: id, createdAt: t, updatedAt: t }; });
    // Preview shows everything: the scene's glow-and-dance unlocked, all 4 egg kinds to hatch, and the move transition.
    const eggs = (['normal', 'rare', 'precious', 'legendary'] as const).map((tier, i) => ({ id: `preview-egg-${i}`, tier, sceneId: id, hatched: false, createdAt: t, updatedAt: t }));
    const next = { ...s, currentSceneId: id, unlockedSceneIds: order.slice(0, order.indexOf(id) + 1), animals, xp: 500, goldenScenes: [id], eggs,
      collection: { ...s.collection, ...Object.fromEntries(animals.map((a) => [a.speciesId, { id: a.id, speciesId: a.speciesId, maxLevel: a.level, count: 1, createdAt: t, updatedAt: t }])) } };
    if (id !== s.currentSceneId) pendingMove = id;
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
    <a class="link" href="#/admin">管理員後台</a>
    <button id="logout">登出</button></section>`;
  $('#export').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(store!.state, null, 2)], { type: 'application/json' }));
    a.download = 'xinxi-island.json'; a.click();
  };
  $('#logout').onclick = () => { setToken(null); location.hash = ''; location.reload(); };
}

// ---------- 場景轉場 ----------
const MOVE_TEXT: Record<string, string> = {
  ark: '洪水漲起，又退去……', wilderness: '紅海分開了！', bethlehem: '夜裡，一顆星亮起來', galilee: '天亮了，來到湖邊', jerusalem: '雲開了，聖城降下',
};
function playTransition(to: string): void {
  if (!MOVE_TEXT[to] || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.createElement('div');
  el.className = `move move-${to}`;
  el.innerHTML = `<i class="a"></i><i class="b"></i><p>${MOVE_TEXT[to] ?? ''}<br><b>${esc(sceneById(to as GameState['currentSceneId']).name)}</b></p>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ---------- 賽程 ----------
/** How far along the 6 islands someone is: finished islands plus the share of the current one filled. */
function racePos(r: Runner): number {
  const sc = SCENES.find((x) => x.id === r.scene) ?? SCENES[0];
  return (sc.order - 1 + Math.min(1, r.animals / sc.capacity)) / SCENES.length;
}
async function showRace(view: HTMLElement, s: GameState): Promise<void> {
  view.innerHTML = '<section class="panel"><p class="loading">載入中…</p></section>';
  let list: Runner[];
  try { list = localPreview ? sampleBoard(s) : await fetchBoard(getToken()!); }
  catch { view.innerHTML = '<section class="panel"><p class="err">賽程載入失敗，請檢查網路</p></section>'; return; }
  list = list.map((r) => (r.id === me?.id ? { ...r, scene: s.currentSceneId, animals: s.animals.length, reads: s.reads.length } : r))
    .sort((a, b) => racePos(b) - racePos(a) || b.reads - a.reads);
  view.innerHTML = `<section class="panel race"><h2>奔跑賽程</h2>
    <p class="sub">島住滿就往下一座島前進，點名字可以去看他的島</p>
    <div class="race-head">${SCENES.map((sc) => `<span>${sc.name.slice(0, 2)}</span>`).join('')}</div>
    <ol>${list.map((r, i) => `<li class="${r.id === me?.id ? 'me' : ''}"><a href="#/visit/${r.id}">
      <div class="who"><b>${i + 1}</b>${esc(r.nick)}${r.id === me?.id ? '（我）' : ''}<small>${sceneById(r.scene as GameState['currentSceneId'])?.name ?? ''} · ${r.animals} 隻 · 讀 ${r.reads} 篇</small></div>
      <div class="track">${SCENES.map(() => '<i></i>').join('')}<span class="runner" style="left:${(racePos(r) * 100).toFixed(1)}%">${esc([...r.nick][0] ?? '?')}</span></div>
    </a></li>`).join('') || '<li class="empty">還沒有人</li>'}</ol></section>`;
}

/** ?local preview has no server: a few made-up runners around the local player. */
function sampleBoard(s: GameState): Runner[] {
  const names = ['小羊', '約書亞', '馬利亞', '提摩太', '路得'];
  return [{ id: 0, nick: me!.nick, scene: s.currentSceneId, animals: s.animals.length, reads: s.reads.length },
    ...names.map((nick, i) => ({ id: -1 - i, nick, scene: SCENES[(i * 2) % 6].id, animals: (i * 5) % 9, reads: 3 + i * 7 }))];
}

// ---------- 看別人的島 ----------
async function showVisit(view: HTMLElement, uid: number): Promise<void> {
  view.innerHTML = '<section class="panel"><p class="loading">載入中…</p></section>';
  let v: Visit | null;
  try {
    v = localPreview ? { nick: '示範島', scene: SCENES[Math.abs(uid) % 6].id, animals: SPECIES.filter((x) => x.scene === SCENES[Math.abs(uid) % 6].id).map((x, i) => ({ id: `v${i}`, speciesId: x.id, level: ((i % 3) + 1) as 1 | 2 | 3, xp: 0, originSceneId: x.scene, createdAt: '', updatedAt: '' })) }
      : await fetchIsland(getToken()!, uid);
  } catch { v = null; }
  if (!v) { view.innerHTML = '<section class="panel"><p class="err">找不到這座島</p><a class="link" href="#/race">回賽程</a></section>'; return; }
  if (uid === me?.id) return void (location.hash = '#/island');
  // Reuses the island page layout and sky; data-visit hides your own island underneath.
  document.body.dataset.page = 'island';
  document.body.dataset.visit = '1';
  document.body.dataset.scene = v.scene;
  const host = document.createElement('div');
  host.className = 'stage visit-stage';
  $('#view').before(host);
  const island = new IslandView(host, v.scene);
  island.setAnimals(v.animals);
  const sc = sceneById(v.scene as GameState['currentSceneId']);
  view.innerHTML = `<header class="hud">
      <a href="#/race" class="logo" aria-label="回賽程">${ICON.flag}</a>
      <h1 data-len="${sc.name.length}"><span>${sc.name}</span><small>${v.animals.length}/${sc.capacity}</small></h1>
      <div class="today"><span>${esc(v.nick)}<br>的島</span></div>
    </header>
    <div class="hud-foot"><a class="pill" href="#/race">${ICON.flag}<span>回賽程</span></a><div class="divider"><i></i></div></div>`;
  cleanup = () => { island.destroy(); host.remove(); };
}

// ---------- 後台 ----------
async function showAdmin(view: HTMLElement): Promise<void> {
  const ask = (err = '') => {
    view.innerHTML = `<section class="panel login"><h2>管理員後台</h2>
      <form><label>後台金鑰<input name="key" type="password" autocomplete="off" required></label>
      <button class="primary">進入</button>${err ? `<p class="err">${esc(err)}</p>` : ''}</form>
      <a class="link" href="#/island">回遊戲</a></section>`;
    view.querySelector('form')!.onsubmit = (e) => {
      e.preventDefault();
      adminKey = String(new FormData(e.target as HTMLFormElement).get('key'));
      void showAdmin(view);
    };
  };
  if (!adminKey) return ask();
  view.innerHTML = '<section class="panel"><p class="loading">載入中…</p></section>';
  let rows: AdminRow[];
  try { rows = await fetchAdmin(adminKey); } catch { adminKey = null; return ask('金鑰不正確'); }
  const day = (t: string | null) => (t ? new Date(t).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) : '—');
  rows.sort((a, b) => b.reads - a.reads);
  const playing = rows.filter((r) => r.updated).length;
  view.innerHTML = `<section class="panel admin"><h2>後台：所有人的情形</h2>
    <p class="sub">共 ${rows.length} 人，${playing} 人玩過信息島，總共讀了 ${rows.reduce((n, r) => n + r.reads, 0)} 篇</p>
    <div class="table-wrap"><table><thead><tr><th>暱稱</th><th>手機</th><th>場景</th><th>動物</th><th>讀篇</th><th>最後遊玩</th><th>加入</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${esc(r.nick)}</td><td>${esc(r.phone)}</td><td>${r.scene ? esc(sceneById(r.scene as GameState['currentSceneId'])?.name ?? r.scene) : '—'}</td>
      <td>${r.animals}</td><td>${r.reads}</td><td>${day(r.updated)}</td><td>${day(r.created)}</td></tr>`).join('')}</tbody></table></div>
    <button id="admin-out">登出後台</button></section>`;
  $('#admin-out').onclick = () => { adminKey = null; location.hash = store ? '#/settings' : '#/'; };
}
