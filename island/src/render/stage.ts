import * as THREE from 'three';
import type { Animal } from '../core/types';
import { createEdenIsland, type WalkPoint } from './assets/island/edenIsland';
import { createActor, type Actor } from './actor';


/** 3D island view. Only reads game state; never changes it. */
export class Stage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  /** Fixed isometric view (no rotation), matching the concept art. */
  private framing = new THREE.Box3();
  private actors = new Map<string, Actor>();
  private clock = new THREE.Clock();
  private raf = 0;
  private walk: WalkPoint[] = [];
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.camera.position.set(12, 10, 12);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0xf8fbff, 0xddd4c5, 1.28));
    const sun = new THREE.DirectionalLight(0xfff5e5, 1.35);
    sun.position.set(-4, 10, 6);
    sun.shadow.bias = -0.00012;
    sun.shadow.normalBias = 0.016;
    const fill = new THREE.DirectionalLight(0xe8efff, 0.24);
    fill.position.set(7, 5, -2);
    this.scene.add(fill);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
    this.scene.add(sun);

    this.buildEden();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
    this.start();
  }

  private buildEden(): void {
    const island = createEdenIsland();
    this.scene.add(island.group);
    this.walk = island.walk;
    this.camera.updateMatrixWorld();
    island.group.updateMatrixWorld(true);
    const instance = new THREE.Matrix4();
    const transform = new THREE.Matrix4();
    const point = new THREE.Vector3();
    island.group.traverse((object) => {
      if (!(object instanceof THREE.InstancedMesh)) return;
      const vertices = object.geometry.getAttribute('position');
      for (let index = 0; index < object.count; index++) {
        object.getMatrixAt(index, instance);
        transform.multiplyMatrices(this.camera.matrixWorldInverse, object.matrixWorld).multiply(instance);
        for (let vertex = 0; vertex < vertices.count; vertex++) {
          point.fromBufferAttribute(vertices, vertex).applyMatrix4(transform);
          this.framing.expandByPoint(point);
        }
      }
    });
  }

  /** Sync actors with the state's animals (add new, update level, remove gone). */
  setAnimals(animals: Animal[]): void {
    const keep = new Set(animals.map((a) => a.id));
    for (const [id, act] of this.actors) if (!keep.has(id)) { this.scene.remove(act.root); this.actors.delete(id); }
    for (const a of animals) {
      const cur = this.actors.get(a.id);
      if (cur && cur.level === a.level) continue;
      if (cur) this.scene.remove(cur.root);
      const act = createActor(a.speciesId, a.level, this.walk);
      if (cur) act.root.position.copy(cur.root.position);
      this.actors.set(a.id, act);
      this.scene.add(act.root);
    }
  }

  private resize(): void {
    const w = this.host.clientWidth, h = this.host.clientHeight, aspect = w / h;
    const { min, max } = this.framing;
    const height = Math.max((max.x - min.x) / (aspect * 0.95), (max.y - min.y) / 0.52);
    const centerX = (min.x + max.x) / 2;
    const bottom = min.y - 0.30 * height;
    Object.assign(this.camera, {
      left: centerX - height * aspect / 2, right: centerX + height * aspect / 2,
      top: bottom + height, bottom,
    });
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private start(): void {
    if (this.raf) return;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.1), t = this.clock.elapsedTime;
      if (!this.reduced) for (const a of this.actors.values()) a.update(dt, t);
      this.renderer.render(this.scene, this.camera);
    };
    this.clock.getDelta();
    loop();
  }

  private stop(): void { cancelAnimationFrame(this.raf); this.raf = 0; }
}
