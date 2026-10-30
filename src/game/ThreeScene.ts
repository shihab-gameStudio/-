import * as THREE from 'three';
import { palette, shops, productNames, street } from './constants';
import { GameState } from '../types/game';

export class ThreeSceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
  obstacles: { x: number; z: number; hw: number; hd: number }[] = [];
  buildingMeshes: THREE.Mesh[] = [];
  customers: { mesh: THREE.Group; phase: number; drift: number }[] = [];
  traffic: { mesh: THREE.Group; vertical: boolean; v: number }[] = [];
  human!: THREE.Group;
  officer!: THREE.Group;
  npcVendor!: THREE.Group;
  container: HTMLElement;
  animId: number = 0;
  acc: number = 0;
  currentLookAt = new THREE.Vector3();
  isFirstFrameCamera = true;
  private cameraPresetIndex = 0;
  private cameraZoom = 1;
  private orbitYaw = 0;
  private orbitPitch = 0;
  private draggingPointer: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private lastDragTime = 0;
  private readonly raycaster = new THREE.Raycaster();
  private readonly cameraPresets = [
    { label: 'Chase', distance: 9.2, pitch: 0.38 },
    { label: 'Close', distance: 6.9, pitch: 0.29 },
    { label: 'Wide', distance: 13.5, pitch: 0.56 }
  ];

  private readonly pointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
    this.draggingPointer = e.pointerId;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.lastDragTime = performance.now();
    this.renderer.domElement.setPointerCapture(e.pointerId);
  };
  private readonly pointerMove = (e: PointerEvent) => {
    if (this.draggingPointer !== e.pointerId) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.orbitYaw -= dx * 0.0055;
    this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch + dy * 0.0035, -0.22, 0.3);
    this.lastDragTime = performance.now();
  };
  private readonly pointerUp = (e: PointerEvent) => {
    if (this.draggingPointer !== e.pointerId) return;
    this.draggingPointer = null;
    this.lastDragTime = performance.now();
    if (this.renderer.domElement.hasPointerCapture(e.pointerId))
      this.renderer.domElement.releasePointerCapture(e.pointerId);
  };
  private readonly wheelZoom = (e: WheelEvent) => {
    e.preventDefault();
    this.cameraZoom = THREE.MathUtils.clamp(this.cameraZoom + Math.sign(e.deltaY) * 0.085, 0.72, 1.52);
  };
  private readonly preventContextMenu = (e: MouseEvent) => e.preventDefault();

  constructor(container: HTMLElement, onUpdateHUD: () => void, onEvent: (type: string, data?: any) => void) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#b7d2ce');
    this.scene.fog = new THREE.FogExp2('#c9c9af', 0.0075);

    this.camera = new THREE.PerspectiveCamera(66, container.clientWidth / container.clientHeight, 0.1, 470);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.55;
    
    container.replaceChildren(this.renderer.domElement);
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerUp);
    canvas.addEventListener('wheel', this.wheelZoom, { passive: false });
    canvas.addEventListener('contextmenu', this.preventContextMenu);

    this.scene.add(new THREE.HemisphereLight(0xe6f2ff, 0x9c8065, 2.15));
    const sun = new THREE.DirectionalLight(0xffecd0, 2.55);
    sun.position.set(-55, 115, 70);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -125;
    sun.shadow.camera.right = 125;
    sun.shadow.camera.top = 125;
    sun.shadow.camera.bottom = -125;
    sun.shadow.bias = -0.00035;
    this.scene.add(sun);

    this.clock = new THREE.Clock();
    this.buildWorld();
    this.scene.updateMatrixWorld(true);
  }

  matte(color: string, roughness = 0.92) {
    return new THREE.MeshStandardMaterial({ color, roughness });
  }

  block(p: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x = 0, y = h / 2, z = 0, cast = true, trackForRaycast = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    p.add(mesh);
    if (trackForRaycast) {
      this.buildingMeshes.push(mesh);
    }
    return mesh;
  }

  cylinder(p: THREE.Object3D, rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = h / 2, z = 0, s = 10) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    p.add(mesh);
    return mesh;
  }

  sphere(p: THREE.Object3D, r: number, m: THREE.Material, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    p.add(mesh);
    return mesh;
  }

  rand(a: number, b: number) {
    return a + Math.random() * (b - a);
  }

  pick<T>(arr: T[]): T {
    return arr[(Math.random() * arr.length) | 0];
  }

  labelTexture(text: string, fg = '#f9df85', bg = '#16433b', width = 384, height = 96) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const cx = canvas.getContext('2d')!;
    cx.fillStyle = bg;
    cx.fillRect(0, 0, width, height);
    cx.strokeStyle = '#e0b45c';
    cx.lineWidth = 7;
    cx.strokeRect(4, 4, width - 8, height - 8);
    cx.fillStyle = fg;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.font = "bold 44px 'Hind Siliguri', sans-serif";
    cx.fillText(text, width / 2, height / 2 + 7, width - 22);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: false });
  }

  sign(p: THREE.Object3D, text: string, x: number, y: number, z: number, w = 5) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), this.labelTexture(text));
    mesh.position.set(x, y, z);
    p.add(mesh);
    return mesh;
  }

  buildWorld() {
    const mat = {
      soil: this.matte('#a49e7a'),
      road: this.matte('#5b6260'),
      median: this.matte('#cbb880'),
      pavement: this.matte('#ae9580'),
      stripe: this.matte('#e7ddae'),
      yellow: this.matte('#f2c45d'),
      curb: this.matte('#252829'),
      red: this.matte('#c54f3c'),
      green: this.matte('#27835c'),
      leaf: this.matte('#51773e'),
      brown: this.matte('#604a37'),
      wood: this.matte('#a87843'),
      dark: this.matte('#292e36'),
      light: this.matte('#e8dfc1'),
      glass: new THREE.MeshStandardMaterial({ color: '#b6d3c7', roughness: 0.24, metalness: 0.05 }),
      concrete: this.matte('#a6a598'),
      metal: this.matte('#6a7678'),
      sky: this.matte('#93c1be')
    };

    // Ground
    this.block(this.scene, 265, 0.7, 265, mat.soil, 0, -0.45, 0, false);

    for (const n of street) {
      this.block(this.scene, 246, 0.12, 13, mat.road, 0, 0.005, n, false);
      this.block(this.scene, 13, 0.12, 246, mat.road, n, 0.007, 0, false);
      for (let k = -116; k < 117; k += 8) {
        this.block(this.scene, 2.6, 0.018, 0.19, mat.stripe, k, 0.08, n, false);
        this.block(this.scene, 0.19, 0.018, 2.6, mat.stripe, n, 0.08, k, false);
      }
      for (const s of [-1, 1]) {
        this.block(this.scene, 246, 0.12, 2.8, mat.pavement, 0, 0.015, n + s * 8.1, false);
        this.block(this.scene, 2.8, 0.12, 246, mat.pavement, n + s * 8.1, 0.015, 0, false);
      }
    }

    // Junction stripes
    for (const x of street) {
      for (const z of street) {
        for (let j = -3; j <= 3; j++) {
          this.block(this.scene, 0.72, 0.015, 2.35, mat.stripe, x + j * 1.45, 0.095, z + 9, false);
          this.block(this.scene, 2.35, 0.015, 0.72, mat.stripe, x + 9, 0.095, z + j * 1.45, false);
        }
      }
    }

    const buildBuilding = (x: number, z: number) => {
      const h = this.rand(10, 31), color = this.pick(palette), width = this.rand(17, 23), depth = this.rand(17, 23);
      const facade = this.matte(color);
      this.block(this.scene, width, h, depth, facade, x, h / 2, z, true, true);
      this.block(this.scene, width + 1, 0.5, depth + 1, mat.concrete, x, h + 0.25, z);
      const faces = Math.max(2, Math.floor(h / 3.4));
      for (let f = 0; f < faces; f++) {
        for (let j = -2; j <= 2; j++) {
          if (f === 0) continue;
          const win = this.block(this.scene, 1.8, 1.7, 0.05, mat.glass, x + j * (width / 6), f * 3 + 2, z + depth / 2 + 0.03, false);
          win.castShadow = false;
          this.block(this.scene, 1.8, 0.12, 0.2, mat.concrete, x + j * width / 6, f * 3 + 1.2, z + depth / 2 + 0.18, false);
        }
      }
      this.block(this.scene, width * 0.74, 2.4, 0.9, this.matte(this.pick(['#368778', '#d78342', '#b3a647', '#c85b48'])), x, 1.6, z + depth / 2 + 0.55);
      this.sign(this.scene, this.pick(shops), x, 3.7, z + depth / 2 + 0.65, Math.min(9, width * 0.75));
      this.obstacles.push({ x, z, hw: width / 2 + 0.55, hd: depth / 2 + 0.55 });
    };

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x = -60 + i * 40;
        const z = -60 + j * 40;
        if (x === 20 && z === 20) continue;
        buildBuilding(x, z);
      }
    }

    for (const x of [-100, 100]) {
      for (const z of [-100, -60, -20, 20, 60, 100]) {
        if (Math.random() < 0.63) buildBuilding(x, z);
      }
    }

    const tree = (x: number, z: number) => {
      this.cylinder(this.scene, 0.18, 0.22, 3.9, mat.brown, x, 1.95, z, 7);
      this.sphere(this.scene, 2.3, this.matte(this.pick(['#457a42', '#638c4a', '#356d46'])), x, 5, z);
    };

    for (const v of [-80, -40, 0, 40, 80]) {
      for (let a = -115; a < 116; a += 17) {
        if (Math.abs(a - v) < 10) continue;
        if (Math.random() < 0.57) tree(a, v + 10.5);
        if (Math.random() < 0.47) tree(v + 10.5, a);
      }
    }

    const pole = (x: number, z: number) => {
      this.cylinder(this.scene, 0.11, 0.14, 8, mat.metal, x, 4, z, 8);
      this.block(this.scene, 1.2, 0.13, 0.13, mat.dark, x + 0.45, 7.9, z, false);
    };
    for (let z = -110; z < 110; z += 27) {
      pole(-10, z);
      pole(50, z);
    }

    // Elevated metro/road
    for (let x = -115; x < 115; x += 15) {
      this.cylinder(this.scene, 0.95, 1.2, 8.1, mat.concrete, x, 4, -79.5, 8);
    }
    this.block(this.scene, 244, 1.1, 11.2, mat.concrete, 0, 8.4, -79.5, false);
    this.block(this.scene, 244, 0.16, 10, mat.road, 0, 9.1, -79.5, false);

    // Carts / stalls
    const stall = (x: number, z: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      this.block(g, 3.9, 1, 2.5, mat.wood, 0, 0.8, 0);
      for (const xx of [-1.5, 1.5]) {
        for (const zz of [-0.8, 0.8]) {
          this.cylinder(g, 0.055, 0.055, 2.5, mat.metal, xx, 2.35, zz);
        }
      }
      this.block(g, 4.4, 0.3, 2.9, this.matte('#e7b344'), 0, 3.75, 0);
      for (let i = 0; i < 9; i++) {
        this.sphere(g, 0.25, this.matte(this.pick(['#dd4931', '#86ae4a', '#e6bc3c'])), this.rand(-1.6, 1.6), 1.5, this.rand(-0.7, 0.7));
      }
      this.scene.add(g);
      return g;
    };
    for (const [x, z] of [[-9, -27], [11, 25], [-49, -8], [71, 51], [-35, 70], [35, -42]]) {
      stall(x, z);
    }

    const rickshaw = (x: number, z: number, color: string) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      this.block(g, 1.7, 0.4, 2.6, this.matte(color), 0, 0.86, 0);
      this.block(g, 1.5, 1.4, 1.2, this.matte('#efd87d'), 0, 1.73, 0.4);
      this.block(g, 1.6, 0.11, 2.7, this.matte('#c73c59'), 0, 2.5, 0.2);
      for (const xx of [-0.85, 0.85]) {
        for (const zz of [-0.8, 0.9]) {
          const wheel = this.cylinder(g, 0.39, 0.39, 0.13, mat.dark, xx, 0.42, zz, 12);
          wheel.rotation.z = Math.PI / 2;
        }
      }
      return g;
    };

    for (let i = 0; i < 14; i++) {
      const vertical = Math.random() < 0.5;
      const lane = this.pick(street) + (Math.random() < 0.5 ? 2.8 : -2.8);
      const r = rickshaw(vertical ? lane : this.rand(-112, 112), vertical ? this.rand(-112, 112) : lane, this.pick(['#d24449', '#e0b738', '#469c8b', '#d7723c']));
      if (vertical) r.rotation.y = Math.random() < 0.5 ? 0 : Math.PI;
      else r.rotation.y = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      this.scene.add(r);
      this.traffic.push({ mesh: r, vertical, v: this.rand(0.7, 2.0) * (r.rotation.y === 0 || r.rotation.y === Math.PI / 2 ? -1 : 1) });
    }

    const makeHuman = (police = false) => {
      const g = new THREE.Group();
      const shirt = this.matte(police ? '#284970' : this.pick(['#df8565', '#69a89b', '#d8bb70', '#a0a0aa']));
      const pants = this.matte(police ? '#20314a' : '#414348');
      this.cylinder(g, 0.37, 0.46, 1.2, shirt, 0, 1.36, 0, 8);
      this.cylinder(g, 0.31, 0.35, 0.8, pants, -0.17, 0.39, 0, 8);
      this.cylinder(g, 0.31, 0.35, 0.8, pants, 0.17, 0.39, 0, 8);
      this.sphere(g, 0.34, this.matte('#b87954'), 0, 2.2, 0);
      this.block(g, 0.38, 0.18, 0.32, this.matte('#24292c'), 0, 2.52, 0.01);
      for (const xx of [-0.45, 0.45]) {
        const arm = this.cylinder(g, 0.14, 0.13, 0.9, shirt, xx, 1.44, -0.05, 8);
        arm.rotation.z = xx > 0 ? -0.3 : 0.3;
      }
      if (police) this.block(g, 0.65, 0.23, 0.65, this.matte('#203b65'), 0, 2.61, 0);
      return g;
    };

    const createCart = (isVendor = true) => {
      const g = new THREE.Group();
      const avatar = makeHuman(!isVendor);
      g.add(avatar);
      if (isVendor) {
        const frame = new THREE.Group();
        frame.position.z = 1.35;
        g.add(frame);
        this.block(frame, 1.75, 0.2, 1.75, mat.wood, 0, 0.85, 0);
        this.block(frame, 1.9, 0.33, 0.12, mat.red, 0, 1.35, -0.75);
        this.block(frame, 1.9, 0.33, 0.12, mat.yellow, 0, 1.35, 0.75);
        for (const xx of [-0.92, 0.92]) {
          const wheel = this.cylinder(frame, 0.39, 0.39, 0.15, mat.dark, xx, 0.43, 0, 12);
          wheel.rotation.z = Math.PI / 2;
        }
        for (let i = 0; i < 17; i++) {
          this.sphere(frame, 0.24, this.matte(this.pick(['#d85e37', '#d4a538', '#82a755', '#7e9f46'])), this.rand(-0.7, 0.7), 1.12, this.rand(-0.64, 0.64));
        }
        const signBoard = this.block(frame, 1.65, 0.53, 0.12, this.matte('#216a58'), 0, 1.85, 0.79);
        signBoard.castShadow = false;
        this.sign(frame, 'ঠেলার নাম বাবাজি', 0, 1.85, 0.86, 1.55);
        for (const xx of [-0.55, 0.55]) {
          this.block(frame, 0.09, 0.14, 1.45, mat.metal, xx, 1.05, -0.87);
        }
      }
      return g;
    };

    this.human = createCart(true);
    this.scene.add(this.human);
    this.officer = makeHuman(true);
    this.scene.add(this.officer);
    this.npcVendor = createCart(true);
    this.scene.add(this.npcVendor);

    for (let i = 0; i < 23; i++) {
      const p = makeHuman(false);
      const nearRoad = this.pick(street) + this.pick([-8.9, 8.9]);
      if (i < 5) p.position.set((i - 2) * 2.2, 0, 1 + (i % 3) * 4.6);
      else if (Math.random() < 0.5) p.position.set(nearRoad, 0, this.rand(-100, 100));
      else p.position.set(this.rand(-100, 100), 0, nearRoad);
      this.scene.add(p);
      this.customers.push({ mesh: p, phase: this.rand(0, 6), drift: this.rand(0.1, 0.9) });
    }
  }

  resetCamera() {
    this.isFirstFrameCamera = true;
    this.orbitYaw = 0;
    this.orbitPitch = 0;
    this.cameraZoom = 1;
    this.draggingPointer = null;
    this.lastDragTime = 0;
  }

  cycleCameraPreset(): string {
    this.cameraPresetIndex = (this.cameraPresetIndex + 1) % this.cameraPresets.length;
    return this.cameraPresets[this.cameraPresetIndex].label;
  }

  updateCamera(playerPosition: THREE.Vector3, heading: number, dt = 1 / 60) {
    const frameDt = Math.max(0, Math.min(0.05, dt));
    // Return gently behind the moving character after the player finishes looking around.
    if (this.draggingPointer === null && performance.now() - this.lastDragTime > 1300) {
      this.orbitYaw *= Math.exp(-1.75 * frameDt);
      if (Math.abs(this.orbitYaw) < 0.001) this.orbitYaw = 0;
    }

    const preset = this.cameraPresets[this.cameraPresetIndex];
    const pitch = THREE.MathUtils.clamp(preset.pitch + this.orbitPitch, 0.15, 0.89);
    const distance = preset.distance * this.cameraZoom;
    const yaw = heading + this.orbitYaw;
    const forward = new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading));
    const anchor = playerPosition.clone()
      .add(new THREE.Vector3(0, 1.72, 0))
      .addScaledVector(forward, 0.25);
    const look = anchor.clone().addScaledVector(forward, 1.6);
    const desiredPosition = anchor.clone().add(new THREE.Vector3(
      -Math.sin(yaw) * distance * Math.cos(pitch),
      distance * Math.sin(pitch),
      Math.cos(yaw) * distance * Math.cos(pitch)
    ));

    // Move camera *along the ray* to the nearest obstruction; distance along the
    // diagonal ray must not be substituted for horizontal camera distance.
    const ray = desiredPosition.clone().sub(anchor);
    const rayLength = ray.length();
    ray.normalize();
    this.raycaster.set(anchor, ray);
    this.raycaster.near = 0;
    this.raycaster.far = rayLength;
    const hit = this.raycaster.intersectObjects(this.buildingMeshes, false)[0];
    if (hit) desiredPosition.copy(anchor).addScaledVector(ray, Math.max(1.0, hit.distance - 0.45));

    const follow = 1 - Math.exp(-13 * frameDt);
    const aim = 1 - Math.exp(-16 * frameDt);
    if (this.isFirstFrameCamera) {
      this.camera.position.copy(desiredPosition);
      this.currentLookAt.copy(look);
      this.isFirstFrameCamera = false;
    } else {
      // Never interpolate through a wall when the view becomes obstructed.
      if (hit) this.camera.position.copy(desiredPosition);
      else this.camera.position.lerp(desiredPosition, follow);
      this.currentLookAt.lerp(look, aim);
    }
    this.camera.lookAt(this.currentLookAt);
  }

  resize() {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.pointerDown);
    canvas.removeEventListener('pointermove', this.pointerMove);
    canvas.removeEventListener('pointerup', this.pointerUp);
    canvas.removeEventListener('pointercancel', this.pointerUp);
    canvas.removeEventListener('wheel', this.wheelZoom);
    canvas.removeEventListener('contextmenu', this.preventContextMenu);
    this.renderer.dispose();
  }
}
