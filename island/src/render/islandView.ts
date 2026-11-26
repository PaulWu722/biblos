import type { Animal } from '../core/types';

/** public/scenes/<scene>/layout.json, in island.png pixel coordinates. */
interface Layout {
  width: number; height: number; walk: [number, number][]; sky: [number, number][];
  /** Points on the lake/sea surface for fish (optional). */
  swim?: [number, number][];
  /** Default and per-species sprite heights (Lv3), in island.png pixels, matching the concept art. */
  animalHeight: number; sizes?: Record<string, number>;
  /** Looping overlay of the concept animation's moving parts (tools/motion-overlay.py). */
  motion?: { src: string; x: number; y: number; w: number; h: number };
  /** Island body (ground + cliff, no sky decor) in island.png pixels; every island's body is drawn the same size. */
  body?: [number, number, number, number];
  /** Flames cut from the art (tools/fire-sprites.py), animated as flickering fire. */
  fire?: { src: string; x: number; y: number; w: number; h: number }[];
  /** Species whose sprite is drawn facing right (default: left). */
  facesRight?: string[];
}

type Mode = 'walk' | 'fly' | 'swim' | 'still';
// The raven is drawn perched, so it hops on the ground; the bronze serpent is a decoration on a pole.
const MODE: Record<string, Mode> = { dove: 'fly', seagull: 'fly', eagle: 'fly', fish: 'swim', bronzeSerpent: 'still' };
const LEVEL_SCALE = { 1: 0.6, 2: 0.85, 3: 1 } as const;
const base = import.meta.env.BASE_URL;

/**
 * Size and place an island so its body (not the decor above it) has the same on-screen size in every
 * scene: as wide as possible inside the area between the top bar and the button, centred there.
 */
function placeIsland(el: HTMLElement, slide: HTMLElement, layout: Layout): void {
  const { width, height } = layout;
  const [bx0, by0, bx1, by1] = layout.body ?? [0, 0, width, height];
  const W = slide.clientWidth, H = slide.clientHeight;
  const top = H * 0.2, availW = W * 0.94, availH = H * 0.55; // the top bar and button + tabs cover the rest
  const k = Math.min(availW, availH * ((bx1 - bx0) / (by1 - by0))) / (bx1 - bx0); // screen px per island.png px
  Object.assign(el.style, {
    position: 'absolute', width: `${width * k}px`, height: `${height * k}px`, maxWidth: 'none', maxHeight: 'none',
    left: `${W / 2 - ((bx0 + bx1) / 2) * k}px`, top: `${top + availH / 2 - ((by0 + by1) / 2) * k}px`,
  });
}

interface Sprite { el: HTMLElement; species: string; right: boolean; level: 1 | 2 | 3; x: number; y: number; tx: number; ty: number; idle: number; mode: Mode; }

/**
 * The island drawn straight from the concept art, floating and gently bobbing,
 * with animal sprites wandering on it. Earlier islands sit to the left as grey still
 * "memory islands"; swipe sideways to look at them. Only reads game state; never changes it.
 */
export class IslandView {
  /** Called when the swipe settles on a scene; `current` is false for memory islands. */
  onView: ((sceneId: string, current: boolean) => void) | null = null;
  private box = document.createElement('div');
  private slide = document.createElement('div');
  private memories: string[] = [];
  private memoryLayouts = new Map<string, Layout>();
  private layout: Layout | null = null;
  private sprites = new Map<string, Sprite>();
  private pending: Animal[] = [];
  private raf = 0;
  private last = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** `host` scrolls sideways (CSS scroll-snap does the swiping); one slide per unlocked island. */
  constructor(private host: HTMLElement, private sceneId = 'eden', unlocked: string[] = [sceneId]) {
    this.box.className = 'float-island';
    this.slide.className = 'slide';
    this.slide.dataset.scene = sceneId;
    this.slide.appendChild(this.box);
    host.appendChild(this.slide);
    this.setMemories(unlocked.filter((id) => id !== sceneId));
    host.scrollLeft = host.scrollWidth;
    let settle = 0;
    host.addEventListener('scroll', () => { clearTimeout(settle); settle = window.setTimeout(() => this.reportView(), 80); }, { passive: true });
    void this.load();
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
    new ResizeObserver(() => this.fit()).observe(this.slide);
  }

  /**
   * Show the current scene; on a new unlock the old island turns grey and slides off to the left.
   * `unlocked` lists every unlocked scene in order (the current one last).
   */
  setScene(sceneId: string, unlocked: string[] = [sceneId]): void {
    const memories = unlocked.filter((id) => id !== sceneId);
    if (sceneId === this.sceneId && memories.join() === this.memories.join()) return;
    const old = this.sceneId;
    this.setMemories(memories);
    if (sceneId === old) return;
    this.sceneId = sceneId;
    this.slide.dataset.scene = sceneId;
    this.stop();
    this.layout = null;
    this.sprites.clear();
    this.box.innerHTML = '';
    void this.load();
    // Start on the old island (still in colour), fade it to grey, then glide to the new one.
    const oldSlide = this.host.querySelector<HTMLElement>(`.slide.memory[data-scene="${old}"]`);
    if (!oldSlide) return;
    oldSlide.classList.add('fresh');
    this.host.scrollTo({ left: oldSlide.offsetLeft, behavior: 'instant' });
    requestAnimationFrame(() => oldSlide.classList.remove('fresh'));
    setTimeout(() => this.host.scrollTo({ left: this.slide.offsetLeft, behavior: this.reduced ? 'instant' : 'smooth' }), 900);
  }

  private fit(): void {
    if (this.layout) placeIsland(this.box, this.slide, this.layout);
    this.host.querySelectorAll<HTMLElement>('.slide.memory').forEach((el) => {
      const img = el.querySelector<HTMLElement>('.plate'), l = this.memoryLayouts.get(el.dataset.scene!);
      if (img && l) placeIsland(img, el, l);
    });
  }

  private setMemories(ids: string[]): void {
    if (ids.join() === this.memories.join()) return;
    this.memories = ids;
    this.host.querySelectorAll('.slide.memory').forEach((el) => el.remove());
    for (const id of ids) {
      const el = document.createElement('div');
      el.className = 'slide memory';
      el.dataset.scene = id;
      el.innerHTML = `<img class="plate" src="${base}scenes/${id}/island.png" alt="" draggable="false">`;
      this.host.insertBefore(el, this.slide);
      void fetch(`${base}scenes/${id}/layout.json`).then((r) => r.json()).then((l: Layout) => {
        this.memoryLayouts.set(id, l);
        placeIsland(el.querySelector('.plate')!, el, l);
      }).catch(() => {}); // without its layout the memory just keeps the CSS fit
    }
  }

  private reportView(): void {
    const slides = [...this.host.querySelectorAll<HTMLElement>('.slide')];
    const i = Math.round(this.host.scrollLeft / Math.max(1, this.host.clientWidth));
    const el = slides[Math.min(Math.max(i, 0), slides.length - 1)];
    if (el) this.onView?.(el.dataset.scene!, el === this.slide);
  }

  private async load(): Promise<void> {
    const scene = this.sceneId;
    const dir = `${base}scenes/${scene}/`;
    const layout: Layout = await (await fetch(dir + 'layout.json')).json();
    if (scene !== this.sceneId) return; // switched again while loading
    this.layout = layout;
    const { width, height } = this.layout!;
    this.box.style.aspectRatio = `${width} / ${height}`;
    this.fit();
    this.box.innerHTML = `<div class="shadow"></div><div class="bob"><img class="plate" src="${dir}island.png" alt="" draggable="false">`
      + `<div class="water" style="--mask:url('${dir}water-mask.png')"></div>` // ripples on every scene's water
      + `<i class="flow streak" style="--mask:url(${dir}water-mask.png)"></i><i class="flow fall" style="--mask:url(${dir}fall-mask.png)"></i>`
      + (layout.motion ? `<img class="motion" src="${dir}${layout.motion.src}" alt="" draggable="false" style="left:${(layout.motion.x / width) * 100}%;top:${(layout.motion.y / height) * 100}%;width:${(layout.motion.w / width) * 100}%">` : '')
      + (layout.fire ?? []).map((f, i) => `<div class="fire" style="left:${(f.x / width) * 100}%;top:${(f.y / height) * 100}%;width:${(f.w / width) * 100}%;height:${(f.h / height) * 100}%;animation-delay:${-i * 0.37}s">`
        + `<i class="glow"></i><img src="${dir}${f.src}" alt="" draggable="false"></div>`).join('')
      + '</div>';
    // Optional layer: a missing or broken motion.json (the dev server answers index.html) must not stop the animals.
    await this.addMotion(dir).catch(() => {});
    this.setAnimals(this.pending);
    this.start();
  }

  /** Flowing water (shimmer masked to the water) and swaying plants, from motion.json made by tools/make-motion.py. */
  private async addMotion(dir: string): Promise<void> {
    const r = await fetch(dir + 'motion.json');
    if (!r.ok) return; // scenes without motion layers stay still
    const m: { sway: { src: string; x: number; y: number; w: number; h: number }[] } = await r.json();
    const { width, height } = this.layout!;
    const pct = (v: number, of: number) => `${(v / of) * 100}%`;
    let html = ''; // ripples are already added for every scene in load()
    // The concept animation already moves the plants; swaying cut-outs on top would double them.
    if (!this.layout!.motion) m.sway.forEach((p, i) => {
      html += `<img class="sway" src="${dir}sway/${p.src}" alt="" draggable="false" style="left:${pct(p.x, width)};top:${pct(p.y, height)};width:${pct(p.w, width)};animation-delay:${(-i * 0.73).toFixed(2)}s">`;
    });
    this.box.querySelector('.bob')!.insertAdjacentHTML('beforeend', html);
  }

  /** Sync sprites with the state's animals (add new, update level, remove gone). */
  setAnimals(animals: Animal[]): void {
    this.pending = animals;
    if (!this.layout) return;
    const bob = this.box.querySelector('.bob')!;
    const keep = new Set(animals.map((a) => a.id));
    for (const [id, s] of this.sprites) if (!keep.has(id)) { s.el.remove(); this.sprites.delete(id); }
    for (const a of animals) {
      const cur = this.sprites.get(a.id);
      if (cur) { if (cur.level !== a.level) this.applyLevel(cur, a.level); continue; }
      const mode = MODE[a.speciesId] ?? 'walk';
      const [x, y] = this.pick(mode);
      const el = document.createElement('div');
      el.className = `critter ${mode}`;
      el.innerHTML = `<img src="${base}scenes/${this.sceneId}/${a.speciesId}.png" alt="" draggable="false"><i class="halo"></i>`;
      const s: Sprite = { el, species: a.speciesId, right: !!this.layout.facesRight?.includes(a.speciesId), level: a.level, x, y, tx: x, ty: y, idle: mode === 'still' ? Infinity : Math.random() * 2, mode };
      this.applyLevel(s, a.level);
      bob.appendChild(el);
      this.sprites.set(a.id, s);
      this.place(s, 0);
    }
  }

  private applyLevel(s: Sprite, level: 1 | 2 | 3): void {
    s.level = level;
    const { sizes, animalHeight, height } = this.layout!;
    const h = ((sizes?.[s.species] ?? animalHeight) / height) * 100 * LEVEL_SCALE[level];
    s.el.style.height = `${h}%`;
    s.el.classList.toggle('lv3', level === 3);
  }

  private pick(mode: Mode): [number, number] {
    const { sky, swim, walk } = this.layout!;
    const pts = mode === 'fly' && sky.length ? sky : mode === 'swim' && swim?.length ? swim : walk;
    return pts[Math.floor(Math.random() * pts.length)]!;
  }

  private place(s: Sprite, hop: number): void {
    const { width, height } = this.layout!;
    s.el.style.left = `${(s.x / width) * 100}%`;
    s.el.style.top = `${(s.y / height) * 100}%`;
    s.el.style.zIndex = String(Math.round(s.y));
    s.el.style.setProperty('--hop', `${-hop}px`);
  }

  private tick = (now: number): void => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min((now - (this.last || now)) / 1000, 0.1);
    this.last = now;
    if (this.reduced || !this.layout) return;
    const speed = this.layout.width * 0.035; // px of island.png per second
    for (const s of this.sprites.values()) {
      if (s.idle > 0) {
        s.idle -= dt;
        if (s.idle <= 0) [s.tx, s.ty] = this.pick(s.mode);
        this.place(s, s.mode === 'fly' ? Math.sin(now / 400) * 3 : 0);
        continue;
      }
      const dx = s.tx - s.x, dy = s.ty - s.y, dist = Math.hypot(dx, dy);
      if (dist < 2) { s.idle = 1.5 + Math.random() * 3.5; continue; }
      const step = Math.min(dist, speed * (s.mode === 'fly' ? 1.8 : s.mode === 'swim' ? 0.6 : 1) * dt);
      s.x += (dx / dist) * step; s.y += (dy / dist) * step;
      if (Math.abs(dx) > 1) s.el.classList.toggle('flip', dx > 0 !== s.right);
      // shortcut: straight-line moves may cross water or trees in the art; add a walk graph if it looks wrong.
      this.place(s, s.mode === 'fly' ? Math.sin(now / 400) * 3 : s.mode === 'swim' ? 0 : Math.abs(Math.sin(now / 110)) * 4);
    }
  };

  private start(): void { if (!this.raf && this.layout) { this.last = 0; this.raf = requestAnimationFrame(this.tick); } }
  private stop(): void { cancelAnimationFrame(this.raf); this.raf = 0; }
}
