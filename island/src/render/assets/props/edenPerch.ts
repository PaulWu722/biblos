import * as THREE from 'three';

/** Keep a model at its authored Eden perch when mounted in the wandering actor root. */
export class EdenPerch extends THREE.Group {
  private readonly perch: THREE.Vector3;
  private readonly size = new THREE.Vector3();
  private readonly inverse = new THREE.Matrix4();

  constructor(x: number, y: number, z: number, facing?: number) {
    super();
    this.perch = new THREE.Vector3(x, y, z);
    if (facing !== undefined) this.rotation.y = facing;
  }

  override updateMatrix(): void {
    super.updateMatrix();
    if (!(this.parent instanceof THREE.Group)) return;

    // Cancel grid movement and heading while retaining the actor's size multiplier.
    this.matrix.scale(this.size.setScalar(this.parent.scale.x)).setPosition(this.perch);
    this.matrix.premultiply(this.inverse.copy(this.parent.matrix).invert());
  }
}
