import type { Animal } from '../core/types';
import { speciesById } from '../../config/animals';

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
// The raven is drawn perched, so it hops on the ground. 'still' is for decorations that never move.
const MODE: Record<string, Mode> = { dove: 'fly', seagull: 'fly', eagle: 'fly', fish: 'swim' };
const LEVEL_SCALE = { 1: 0.6, 2: 0.85, 3: 1 } as const;
const base = import.meta.env.BASE_URL;

/** Sprite for a species at a level: Lv1 baby <id>-1.png, Lv2/Lv3 grown <id>-2.png. */
export function spriteFor(id: string, level: 1 | 2 | 3): string {
  return `${base}scenes/${speciesById(id).scene}/${id}-${level === 1 ? 1 : 2}.png`;
}

/** Every scene's layout, loaded once: animals that moved from earlier islands need their home scene's sprite data. */
const layouts = new Map<string, Promise<Layout>>();
const loadLayout = (scene: string): Promise<Layout> => {
  if (!layouts.has(scene)) layouts.set(scene, fetch(`${base}scenes/${scene}/layout.json`).then((r) => r.json()));
  return layouts.get(scene)!;
};
const bodyWidth = (l: Layout) => (l.body ? l.body[2] - l.body[0] : l.width);

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

interface Sprite {
  el: HTMLElement; species: string; home: string; right: boolean;
  /** Lv3 height in the current island.png's pixels. */
  height: number; level: 1 | 2 | 3; golden: boolean; x: number; y: number; tx: number; ty: number; idle: number; mode: Mode;
  /** Sprinting in a straight line (tapped or bumped), bouncing off the island's edge. */
  dash?: { vx: number; vy: number; t: number }; held?: boolean;
  /** Dropped off the island: falls to the bottom of the screen ('out'), then drops back in from the top ('in'). */
  fall?: { vy: number; t: number; phase: 'out' | 'in' }; }

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
  private golden: readonly string[] = [];
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
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize.observe(this.slide);
  }

  private onVisibility = () => (document.hidden ? this.stop() : this.start());
  private resize = new ResizeObserver(() => this.fit());

  /** For throwaway views (visiting someone's island): stop animating and remove the slides. */
  destroy(): void {
    this.stop();
    this.resize.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.host.innerHTML = '';
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
      void loadLayout(id).then((l) => {
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
    const layout = await loadLayout(scene);
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
    // Keep the island hidden until its picture arrives, so the water and animals never float on their own.
    const plate = this.box.querySelector<HTMLImageElement>('.plate')!, box = this.box;
    if (!plate.complete) { box.classList.add('loading'); plate.addEventListener('load', () => box.classList.remove('loading'), { once: true }); plate.addEventListener('error', () => box.classList.remove('loading'), { once: true }); }
    this.setAnimals(this.pending);
    this.start();
  }

  /** Sync sprites with the state's animals (add new, update level, remove gone). */
  /** `golden`: scenes whose golden variant is unlocked; their species shine with rays and dance. */
  setAnimals(animals: Animal[], golden: readonly string[] = this.golden): void {
    this.pending = animals;
    this.golden = golden;
    if (!this.layout) return;
    const bob = this.box.querySelector('.bob')!;
    const keep = new Set(animals.map((a) => a.id));
    for (const [id, s] of this.sprites) if (!keep.has(id)) { s.el.remove(); this.sprites.delete(id); }
    for (const a of animals) {
      const cur = this.sprites.get(a.id);
      if (cur) { cur.el.querySelector('.name')!.textContent = a.name ?? ''; if (cur.level !== a.level || cur.golden !== golden.includes(cur.home)) { cur.golden = golden.includes(cur.home); this.applyLevel(cur, a.level); } continue; }
      const mode = MODE[a.speciesId] ?? 'walk';
      const [x, y] = this.pick(mode);
      const el = document.createElement('div');
      el.className = `critter ${mode} idle`;
      el.style.setProperty('--d', `${-Math.random() * 3.2}s`); // dancers out of step with each other
      // Sprites live with the species' home scene, so animals carried over from earlier islands still show.
      const home = speciesById(a.speciesId).scene;
      el.innerHTML = `<b class="name"></b><i class="shout" aria-hidden="true">！</i><i class="cry" aria-hidden="true">啊～～</i><i class="aim" aria-hidden="true"></i><img alt="" draggable="false"><i class="rays"></i><i class="halo"></i><i class="note" aria-hidden="true">♪</i>`;
      const s: Sprite = { el, species: a.speciesId, home, right: false, height: this.layout.animalHeight, level: a.level, golden: golden.includes(home), x, y, tx: x, ty: y, idle: mode === 'still' ? Infinity : Math.random() * 2, mode };
      this.applyLevel(s, a.level);
      el.querySelector('.name')!.textContent = a.name ?? ''; // textContent: visited islands' names are other players' text
      void this.useHomeLayout(s);
      el.addEventListener('pointerdown', (e) => this.grab(s, e));
      el.addEventListener('contextmenu', (e) => e.preventDefault()); // long-press on phones would open the image menu
      bob.appendChild(el);
      this.sprites.set(a.id, s);
      this.place(s, 0);
    }
  }

  /** Take facing and size from the species' home layout, scaled so the animal keeps its size relative to the island body. */
  private async useHomeLayout(s: Sprite): Promise<void> {
    const cur = this.layout; if (!cur) return;
    const home = await loadLayout(s.home).catch(() => null);
    if (!home || this.layout !== cur) return;
    s.right = !!home.facesRight?.includes(s.species);
    s.height = (home.sizes?.[s.species] ?? home.animalHeight) * (bodyWidth(cur) / bodyWidth(home));
    this.applyLevel(s, s.level);
  }

  private applyLevel(s: Sprite, level: 1 | 2 | 3): void {
    s.level = level;
    // Lv1 baby and Lv2 grown looks (<id>-1.png / <id>-2.png); Lv3 is the grown look plus the halo.
    const img = s.el.querySelector('img')!, plain = `${base}scenes/${s.home}/${s.species}.png`;
    img.onerror = () => { img.onerror = null; img.src = plain; }; // species without level art yet keep the concept sprite
    img.src = spriteFor(s.species, level);
    s.el.classList.toggle('golden', s.golden);
    const h = (s.height / this.layout!.height) * 100 * LEVEL_SCALE[level];
    s.el.style.height = `${h}%`;
    s.el.classList.toggle('lv3', level === 3);
  }

  /** Island.png coordinates under a pointer (the plate's rect already includes the bobbing). */
  private toIsland(e: PointerEvent): [number, number] {
    const r = this.box.querySelector('.plate')!.getBoundingClientRect(), { width, height } = this.layout!;
    return [((e.clientX - r.left) / r.width) * width, ((e.clientY - r.top) / r.height) * height];
  }

  /**
   * Tap: sprint. Drag right away: carry it; let go off the island and it falls away, then drops back on from above.
   * Hold still for a moment, then pull: a slingshot; let go and it sprints the opposite way, farther the more you pulled.
   */
  private grab(s: Sprite, e: PointerEvent): void {
    if (!this.layout || s.mode === 'still' || s.fall || s.held) return;
    e.preventDefault();
    const el = s.el, [px, py] = this.toIsland(e), ox = s.x - px, oy = s.y - py, aim = el.querySelector<HTMLElement>('.aim')!;
    el.setPointerCapture(e.pointerId);
    let mode: 'tap' | 'carry' | 'sling' = 'tap', pull = [0, 0];
    const hold = setTimeout(() => { mode = 'sling'; s.held = true; el.classList.add('aiming'); el.classList.remove('idle'); }, 300);
    const move = (m: PointerEvent) => {
      const dx = m.clientX - e.clientX, dy = m.clientY - e.clientY, d = Math.hypot(dx, dy);
      if (mode === 'sling') {
        pull = [dx, dy];
        const len = Math.min(d, 140); // shown arrow points where it will go: away from the pull
        aim.style.width = `${len}px`; aim.style.rotate = `${Math.atan2(-dy, -dx)}rad`; aim.style.opacity = d < 10 ? '0' : '1';
        if (Math.abs(dx) > 4) el.classList.toggle('flip', -dx > 0 !== s.right);
        return;
      }
      if (mode === 'tap' && d < 8) return;
      clearTimeout(hold);
      mode = 'carry'; s.held = true; el.classList.add('held'); el.classList.remove('idle');
      const [x, y] = this.toIsland(m); s.x = x + ox; s.y = y + oy; this.place(s, 0);
    };
    const up = (u: PointerEvent) => {
      clearTimeout(hold);
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.classList.remove('held', 'aiming'); s.held = false; aim.style.width = '0';
      if (mode === 'sling') {
        const d = Math.hypot(pull[0], pull[1]);
        if (u.type === 'pointerup' && d >= 10) this.startDash(s, -pull[0], -pull[1], 0.3 + Math.min(d, 140) / 140); // screen and island axes point the same way
        else { s.tx = s.x; s.ty = s.y; s.idle = 1; }
        return;
      }
      if (mode === 'tap') { if (u.type === 'pointerup') { const a = Math.random() * Math.PI * 2; this.startDash(s, Math.cos(a), Math.sin(a)); } return; }
      if (!this.offIsland(s.x, s.y)) { s.tx = s.x; s.ty = s.y; s.idle = 1; return; }
      if (this.reduced) { [s.x, s.y] = this.pick(s.mode); s.tx = s.x; s.ty = s.y; this.place(s, 0); return; }
      s.fall = { vy: 0, t: 0, phase: 'out' }; el.classList.add('falling');
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }

  /** Off the island: outside its body box, or far from every spot an animal can stand, swim or fly. */
  private offIsland(x: number, y: number): boolean {
    const l = this.layout!, [bx0, by0, bx1, by1] = l.body ?? [0, 0, l.width, l.height];
    if (x < bx0 || x > bx1 || y < by0 - l.animalHeight || y > by1) return true;
    const pts = [...l.walk, ...(l.swim ?? []), ...l.sky];
    return Math.min(...pts.map(([px, py]) => Math.hypot(px - x, py - y))) > bodyWidth(l) * 0.15;
  }

  /** Falling: down past the bottom of the screen, then from above the top of the screen back onto a random spot. */
  private fallStep(s: Sprite, dt: number): void {
    const f = s.fall!, { height } = this.layout!;
    f.vy += height * 2.5 * dt; f.t += dt; s.y += f.vy * dt;
    if (f.phase === 'out') {
      const host = this.host.getBoundingClientRect(), r = s.el.getBoundingClientRect();
      if (r.top > host.bottom || f.t > 4) { // 4 s: safety net if the page is hidden mid-fall
        const plate = this.box.querySelector('.plate')!.getBoundingClientRect(), k = plate.height / height;
        [s.tx, s.ty] = this.pick(s.mode); s.x = s.tx; s.y = (host.top - plate.top) / k; // feet at the top edge, body above it
        s.fall = { vy: 0, t: 0, phase: 'in' };
      }
    } else if (s.y >= s.ty) { s.y = s.ty; s.fall = undefined; s.idle = 1 + Math.random() * 2; s.el.classList.remove('falling'); s.el.classList.add('idle'); }
    this.place(s, 0);
  }

  /** Sprint along (dx, dy) for a moment; 20× walking speed. */
  private startDash(s: Sprite, dx: number, dy: number, t = 0.7): void {
    const v = this.layout!.width * 0.035 * 20, n = Math.hypot(dx, dy) || 1;
    s.dash = { vx: (dx / n) * v, vy: (dy / n) * v, t }; s.idle = 0; s.el.classList.remove('idle');
  }

  /** One frame of a sprint: bounce off the island's edge, and set off any animal it runs into. */
  private dashStep(s: Sprite, dt: number, now: number): void {
    const d = s.dash!, nx = s.x + d.vx * dt, ny = s.y + d.vy * dt;
    if (!this.offIsland(nx, ny)) { s.x = nx; s.y = ny; }
    else if (!this.offIsland(s.x - d.vx * dt, ny)) { d.vx = -d.vx; s.x += d.vx * dt; s.y = ny; }
    else if (!this.offIsland(nx, s.y - d.vy * dt)) { d.vy = -d.vy; s.x = nx; s.y += d.vy * dt; }
    else { d.vx = -d.vx; d.vy = -d.vy; }
    if (Math.abs(d.vx) > 1) s.el.classList.toggle('flip', d.vx > 0 !== s.right);
    const reach = s.height * LEVEL_SCALE[s.level] * 0.45;
    for (const o of this.sprites.values()) {
      if (o === s || o.dash || o.fall || o.held || o.mode === 'still') continue;
      const ox = o.x - s.x, oy = o.y - s.y;
      if (Math.hypot(ox, oy) < reach) this.startDash(o, ox || d.vx, oy || d.vy);
    }
    d.t -= dt;
    if (d.t <= 0) { s.dash = undefined; s.tx = s.x; s.ty = s.y; s.idle = 1.5 + Math.random() * 2; s.el.classList.add('idle'); }
    this.place(s, s.mode === 'fly' ? Math.sin(now / 400) * 3 : s.mode === 'swim' ? 0 : Math.abs(Math.sin(now / 60)) * 5);
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
      if (s.held) continue;
      if (s.fall) { this.fallStep(s, dt); continue; }
      if (s.dash) { this.dashStep(s, dt, now); continue; }
      if (s.idle > 0) {
        s.idle -= dt;
        if (s.idle <= 0) { [s.tx, s.ty] = this.pick(s.mode); s.el.classList.remove('idle'); }
        this.place(s, s.mode === 'fly' ? Math.sin(now / 400) * 3 : 0);
        continue;
      }
      const dx = s.tx - s.x, dy = s.ty - s.y, dist = Math.hypot(dx, dy);
      // Golden animals stop longer, because standing still is when they dance.
      if (dist < 2) { s.idle = (s.golden ? 4 : 1.5) + Math.random() * (s.golden ? 4 : 3.5); s.el.classList.add('idle'); continue; }
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
