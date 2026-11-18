import * as THREE from 'three';
import type { DoorSpec, PlayerColorSpec } from '../shared/types';
import type { ProceduralTextureSet } from './proceduralTextures';

export interface CharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  visorMesh: THREE.Mesh;
  nameSprite: THREE.Sprite;
  shadowMesh: THREE.Mesh;
  scanAura: THREE.Mesh;
  shieldAura: THREE.Mesh;
  suitMaterials: THREE.MeshStandardMaterial[];
  setGhost: (isGhost: boolean) => void;
  setVisibleState: (visible: boolean) => void;
  setVisualScan: (active: boolean, elapsed: number) => void;
  setShielded: (active: boolean, elapsed: number) => void;
  setAppearance: (colorSpec: PlayerColorSpec, displayName: string) => void;
  animateWalk: (
    distanceDelta: number,
    speed: number,
    dt: number,
    elapsed: number,
    turnBank?: number,
    jumpY?: number,
    jumpVelY?: number,
    landSquash?: number,
  ) => void;
}

function drawNameTagCanvas(
  canvas: HTMLCanvasElement,
  name: string,
  accentHex: string,
): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(10, 15, 25, 0.82)';
  ctx.beginPath();
  ctx.roundRect(16, 10, 224, 42, 10);
  ctx.fill();

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.slice(0, 14), 128, 32);
}

function createNameTagSprite(name: string, accentHex: string): {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  tex: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  drawNameTagCanvas(canvas, name, accentHex);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.85, 0.46, 1);
  sprite.position.set(0, 2.34, 0);
  sprite.renderOrder = 20;
  return { sprite, canvas, tex };
}

export function createCharacterRig(
  colorSpec: PlayerColorSpec,
  displayName: string,
  contactShadowMap: THREE.CanvasTexture,
  isSoftwareGl: boolean,
): CharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const suitMat = new THREE.MeshPhysicalMaterial({
    color: colorSpec.hex,
    roughness: 0.34,
    metalness: 0.05,
    sheen: 0.55,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color('#ffffff'),
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    roughness: 0.2,
    metalness: 0.68,
  });

  const shoeMat = new THREE.MeshPhysicalMaterial({
    color: '#1e293b',
    roughness: 0.45,
    metalness: 0.12,
    clearcoat: 0.35,
  });

  const tiffinMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.34,
    metalness: 0.72,
  });

  const visorMat = new THREE.MeshPhysicalMaterial({
    color: colorSpec.visorTint,
    roughness: 0.1,
    metalness: 0.1,
    clearcoat: 0.85,
    clearcoatRoughness: 0.1,
    emissive: colorSpec.visorTint,
    emissiveIntensity: 0.05,
  });

  const suitMaterials = [suitMat];

  // Articulated Chibi Legs & Rounded Shoes
  const legGeo = new THREE.CapsuleGeometry(0.155, 0.22, 10, 18);
  const footGeo = new THREE.CapsuleGeometry(0.11, 0.16, 10, 16);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.21, 0.5, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, suitMat);
  leftLegMesh.position.y = -0.17;
  leftLegMesh.castShadow = !isSoftwareGl;
  const leftFoot = new THREE.Mesh(footGeo, shoeMat);
  leftFoot.rotation.x = Math.PI / 2;
  leftFoot.position.set(0, -0.43, 0.08);
  leftLeg.add(leftLegMesh, leftFoot);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.21, 0.5, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, suitMat);
  rightLegMesh.position.y = -0.17;
  rightLegMesh.castShadow = !isSoftwareGl;
  const rightFoot = new THREE.Mesh(footGeo, shoeMat);
  rightFoot.rotation.x = Math.PI / 2;
  rightFoot.position.set(0, -0.43, 0.08);
  rightLeg.add(rightLegMesh, rightFoot);

  bodyGroup.add(leftLeg, rightLeg);

  // Hi-Poly Plump Chibi Bean Torso
  const torsoGeo = new THREE.CapsuleGeometry(0.45, 0.54, 18, 32);
  const torsoMesh = new THREE.Mesh(torsoGeo, suitMat);
  torsoMesh.position.y = 1.05;
  torsoMesh.castShadow = !isSoftwareGl;
  torsoMesh.receiveShadow = true;
  bodyGroup.add(torsoMesh);

  // Cute Swinging Arms
  const armGeo = new THREE.CapsuleGeometry(0.11, 0.18, 10, 16);
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.48, 1.08, 0.04);
  const leftArmMesh = new THREE.Mesh(armGeo, suitMat);
  leftArmMesh.position.y = -0.1;
  leftArmMesh.rotation.z = 0.28;
  leftArm.add(leftArmMesh);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.48, 1.08, 0.04);
  const rightArmMesh = new THREE.Mesh(armGeo, suitMat);
  rightArmMesh.position.y = -0.1;
  rightArmMesh.rotation.z = -0.28;
  rightArm.add(rightArmMesh);
  bodyGroup.add(leftArm, rightArm);

  // Deshi Waist Ring
  const beltGeo = new THREE.TorusGeometry(0.43, 0.055, 12, 32);
  const beltMesh = new THREE.Mesh(beltGeo, trimMat);
  beltMesh.rotation.x = Math.PI / 2;
  beltMesh.position.y = 0.72;
  bodyGroup.add(beltMesh);

  // Hi-Poly Glossy Visor + Specular Sparkle + Rosy Cheeks
  const visorGeo = new THREE.CapsuleGeometry(0.23, 0.34, 14, 24);
  const visorMesh = new THREE.Mesh(visorGeo, visorMat);
  visorMesh.rotation.z = Math.PI / 2;
  visorMesh.scale.set(0.86, 1.0, 0.65);
  visorMesh.position.set(0, 1.32, 0.34);
  bodyGroup.add(visorMesh);

  const sparkleMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const sparkle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), sparkleMat);
  sparkle.scale.set(1.6, 0.85, 0.6);
  sparkle.position.set(0.16, 1.39, 0.51);
  const sparkleTiny = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), sparkleMat);
  sparkleTiny.position.set(0.05, 1.41, 0.52);
  bodyGroup.add(sparkle, sparkleTiny);

  const blushMat = new THREE.MeshBasicMaterial({ color: '#fb7185', transparent: true, opacity: 0.75 });
  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), blushMat);
  cheekL.scale.set(1.3, 0.75, 0.5);
  cheekL.position.set(-0.27, 1.12, 0.38);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.27;
  bodyGroup.add(cheekL, cheekR);

  // Steel Tiffin-Carrier Backpack
  const packGroup = new THREE.Group();
  packGroup.position.set(0, 1.04, -0.4);
  const packBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.5, 18), tiffinMat);
  const packLid = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 18), trimMat);
  packLid.position.y = 0.27;
  const packStrap = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 14, Math.PI), shoeMat);
  packStrap.position.y = 0.31;
  packGroup.add(packBody, packLid, packStrap);
  bodyGroup.add(packGroup);

  // Signature Cute Deshi Hats & Sprouts
  if (colorSpec.id === 'lal' || colorSpec.id === 'shobuj' || colorSpec.id === 'sada') {
    const tupiMat = new THREE.MeshStandardMaterial({ color: '#e5d8b8', roughness: 0.78 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.31, 0.17, 22), tupiMat);
    cap.position.y = 1.7;
    const capBand = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.03, 8, 22), trimMat);
    capBand.rotation.x = Math.PI / 2;
    capBand.position.y = 1.63;
    bodyGroup.add(cap, capBand);
  } else if (colorSpec.id === 'holud' || colorSpec.id === 'komola') {
    const stemMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.6 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#4ade80', roughness: 0.4 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.24, 10), stemMat);
    stem.position.y = 1.73;
    const leafL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), leafMat);
    leafL.scale.set(1.45, 0.38, 0.75);
    leafL.position.set(-0.1, 1.84, 0);
    leafL.rotation.z = 0.28;
    const leafR = leafL.clone();
    leafR.position.x = 0.1;
    leafR.rotation.z = -0.28;
    bodyGroup.add(stem, leafL, leafR);
  } else if (colorSpec.id === 'beguni') {
    const flowerMat = new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.35 });
    const flowerCenter = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), trimMat);
    flowerCenter.position.set(0.26, 1.66, 0.12);
    bodyGroup.add(flowerCenter);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), flowerMat);
      petal.position.set(0.26 + Math.cos(a) * 0.08, 1.66 + Math.sin(a) * 0.08, 0.12);
      bodyGroup.add(petal);
    }
  } else {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 10, 24), trimMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 1.56;
    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 12, 12),
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: 0.6,
      }),
    );
    gem.position.set(0, 1.58, 0.36);
    bodyGroup.add(band, gem);
  }

  // Visual Task Med-Scan Aura
  const scanAura = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.76, 0.14, 28, 1, true),
    new THREE.MeshBasicMaterial({
      color: '#34d399',
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  scanAura.visible = false;
  root.add(scanAura);

  // Kobiraj Tabiz Shield Aura
  const shieldAura = new THREE.Mesh(
    new THREE.TorusGeometry(0.84, 0.055, 10, 32),
    new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  shieldAura.rotation.x = Math.PI / 2;
  shieldAura.position.y = 0.88;
  shieldAura.visible = false;
  root.add(shieldAura);

  // Contact shadow disc
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowMap,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(new THREE.CircleGeometry(0.68, 24), shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.018;
  root.add(shadowMesh);

  const nameTag = createNameTagSprite(displayName, colorSpec.hex);
  const nameSprite = nameTag.sprite;
  root.add(nameSprite);

  let walkPhase = 0;

  return {
    root,
    bodyGroup,
    leftLeg,
    rightLeg,
    visorMesh,
    nameSprite,
    shadowMesh,
    scanAura,
    shieldAura,
    suitMaterials,
    setGhost: (isGhost: boolean) => {
      for (const m of suitMaterials) {
        m.transparent = isGhost;
        m.opacity = isGhost ? 0.36 : 1.0;
      }
      visorMat.transparent = isGhost;
      visorMat.opacity = isGhost ? 0.42 : 1.0;
      shadowMesh.visible = !isGhost;
    },
    setVisibleState: (visible: boolean) => {
      root.visible = visible;
    },
    setVisualScan: (active: boolean, elapsed: number) => {
      scanAura.visible = active;
      if (active) {
        scanAura.position.y = 0.9 + Math.sin(elapsed * 5) * 0.7;
      }
    },
    setShielded: (active: boolean, elapsed: number) => {
      shieldAura.visible = active;
      if (active) {
        shieldAura.position.y = 0.85 + Math.sin(elapsed * 3.5) * 0.14;
        shieldAura.rotation.z = elapsed * 2.2;
      }
    },
    setAppearance: (nextColor: PlayerColorSpec, nextName: string) => {
      suitMat.color.set(nextColor.hex);
      visorMat.color.set(nextColor.visorTint);
      visorMat.emissive.set(nextColor.visorTint);
      drawNameTagCanvas(nameTag.canvas, nextName, nextColor.hex);
      nameTag.tex.needsUpdate = true;
    },
    animateWalk: (
      distanceDelta: number,
      speed: number,
      dt: number,
      elapsed: number,
      turnBank = 0,
      jumpY = 0,
      jumpVelY = 0,
      landSquash = 0,
    ) => {
      const sq = Math.max(0, Math.min(1, landSquash));
      const squashY = 1 - sq * 0.18;
      const squashXZ = 1 + sq * 0.14;
      bodyGroup.scale.set(squashXZ, squashY, squashXZ);

      if (jumpY > 0.025) {
        const rising = jumpVelY > 0;
        const tuckTargetL = rising ? -0.58 : 0.24;
        const tuckTargetR = rising ? 0.36 : -0.28;
        const armTarget = rising ? -1.05 : -0.48;
        leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, tuckTargetL, 14, dt);
        rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, tuckTargetR, 14, dt);
        leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, armTarget, 14, dt);
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, armTarget, 14, dt);

        bodyGroup.position.y = jumpY;
        const airTilt = THREE.MathUtils.clamp(-jumpVelY * 0.035, -0.2, 0.2);
        bodyGroup.rotation.x = THREE.MathUtils.damp(bodyGroup.rotation.x, airTilt, 12, dt);
        bodyGroup.rotation.z = THREE.MathUtils.damp(
          bodyGroup.rotation.z,
          THREE.MathUtils.clamp(turnBank, -0.2, 0.2),
          12,
          dt,
        );
        nameSprite.position.y = 2.34 + jumpY;

        const shScale = Math.max(0.42, 1 - jumpY * 0.34);
        shadowMesh.scale.set(shScale, shScale, 1);
        shadowMat.opacity = Math.max(0.16, 0.48 - jumpY * 0.18);
        return;
      }

      nameSprite.position.y = 2.34;
      shadowMat.opacity = 0.48;

      if (speed > 0.2) {
        walkPhase += distanceDelta * 5.4;
        const speedFactor = Math.min(1.45, speed / 6.2);
        const swing = Math.sin(walkPhase) * Math.min(0.84, 0.54 + speedFactor * 0.22);
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
        leftArm.rotation.x = -swing * 0.82;
        rightArm.rotation.x = swing * 0.82;

        const bounce = Math.abs(Math.cos(walkPhase)) * (0.078 + speedFactor * 0.036);
        bodyGroup.position.y = bounce;
        bodyGroup.rotation.x = THREE.MathUtils.damp(bodyGroup.rotation.x, 0.085 * speedFactor, 12, dt);
        const targetRoll = Math.sin(walkPhase) * 0.048 + THREE.MathUtils.clamp(turnBank, -0.18, 0.18);
        bodyGroup.rotation.z = THREE.MathUtils.damp(bodyGroup.rotation.z, targetRoll, 14, dt);

        const shScale = Math.max(0.76, 1 - bounce * 1.15);
        shadowMesh.scale.set(shScale, shScale, 1);
      } else {
        leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 12, dt);
        rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 12, dt);
        leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, Math.sin(elapsed * 2.2) * 0.08, 10, dt);
        rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -Math.sin(elapsed * 2.2) * 0.08, 10, dt);
        const breath = Math.sin(elapsed * 2.4) * 0.022;
        bodyGroup.position.y = THREE.MathUtils.damp(bodyGroup.position.y, breath, 10, dt);
        bodyGroup.rotation.x = THREE.MathUtils.damp(bodyGroup.rotation.x, 0, 12, dt);
        bodyGroup.rotation.z = THREE.MathUtils.damp(bodyGroup.rotation.z, Math.sin(elapsed * 1.5) * 0.014, 12, dt);
        shadowMesh.scale.set(1, 1, 1);
      }
    },
  };
}

export function createBodyMarkerMesh(
  colorSpec: PlayerColorSpec,
  contactShadowMap: THREE.CanvasTexture,
): THREE.Group {
  const group = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({
    color: colorSpec.hex,
    roughness: 0.52,
    metalness: 0.06,
  });
  const boneMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 });
  const slipperMat = new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.8 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.46, 20), suitMat);
  base.position.y = 0.24;
  group.add(base);

  const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.35, 12), boneMat);
  bone.position.y = 0.58;
  const knob1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), boneMat);
  knob1.position.set(-0.07, 0.74, 0);
  const knob2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), boneMat);
  knob2.position.set(0.07, 0.74, 0);
  group.add(bone, knob1, knob2);

  const chappal = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.22, 8, 12), slipperMat);
  chappal.rotation.x = Math.PI / 2;
  chappal.scale.set(1, 1, 0.38);
  chappal.position.set(0.62, 0.05, 0.25);
  chappal.rotation.y = 0.65;
  group.add(chappal);

  const ringMat = new THREE.MeshBasicMaterial({
    color: '#ef4444',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.86, 28), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  group.add(ring);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.74, 22),
    new THREE.MeshBasicMaterial({ map: contactShadowMap, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  group.add(shadow);

  return group;
}

export function createShutterDoor(door: DoorSpec, textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const w = door.maxX - door.minX;
  const d = door.maxZ - door.minZ;
  const cx = (door.minX + door.maxX) / 2;
  const cz = (door.minZ + door.maxZ) / 2;

  const shutterMat = new THREE.MeshStandardMaterial({
    color: '#991b1b',
    roughness: 0.34,
    metalness: 0.78,
    normalMap: textures.tinNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.45, metalness: 0.7 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.35 });

  const panel = new THREE.Mesh(new THREE.BoxGeometry(w, door.height, d * 0.65), shutterMat);
  panel.position.y = door.height / 2;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.26, d * 0.7), stripeMat);
  stripe.position.y = 1.25;
  const rollBox = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, w + 0.2, 16), frameMat);
  rollBox.rotation.z = Math.PI / 2;
  rollBox.position.y = door.height + 0.14;

  group.add(panel, stripe, rollBox);
  group.position.set(cx, door.height + 0.15, cz);
  return group;
}

export function createSecurityCamMesh(): { group: THREE.Group; ledMat: THREE.MeshStandardMaterial; head: THREE.Group } {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.38, metalness: 0.78 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.32, metalness: 0.42 });
  const ledMat = new THREE.MeshStandardMaterial({
    color: '#475569',
    emissive: '#ef4444',
    emissiveIntensity: 0.05,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.32, 16), poleMat);
  base.position.y = 0.16;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.4, 14), poleMat);
  mast.position.y = 1.75;
  group.add(base, mast);

  const head = new THREE.Group();
  head.position.y = 3.4;
  const camBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.58), bodyMat);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.68), poleMat);
  hood.position.set(0, 0.14, 0.05);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.18, 14),
    new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.12, metalness: 0.92 }),
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.34;
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), ledMat);
  led.position.set(0, 0.18, 0.24);

  head.add(camBox, hood, lens, led);
  group.add(head);
  return { group, ledMat, head };
}

export function createAdminTableModel(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.45, metalness: 0.65 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.3, metalness: 0.8 });
  const mapMat = new THREE.MeshStandardMaterial({
    color: '#10b981',
    emissive: '#059669',
    emissiveIntensity: 0.85,
    roughness: 0.18,
  });

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 0.72, 20), baseMat);
  ped.position.y = 0.36;
  const consoleTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.24, 1.3), trimMat);
  consoleTop.position.y = 0.82;
  consoleTop.castShadow = !isSoftwareGl;
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.07, 1.05), mapMat);
  screen.position.y = 0.96;
  group.add(ped, consoleTop, screen);
  return group;
}

export function createVitalsKioskModel(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.42, metalness: 0.58 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.3, metalness: 0.75 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.95,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.2, 0.75), trimMat);
  base.position.y = 0.1;
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.45, 0.52), bodyMat);
  pillar.position.y = 0.9;
  pillar.castShadow = !isSoftwareGl;
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.52, 0.08), screenMat);
  monitor.position.set(0, 1.32, 0.28);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 10), trimMat);
  antenna.position.set(0.32, 1.82, -0.1);
  group.add(base, pillar, monitor, antenna);
  return group;
}

export function createAddaMonument(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.78, metalness: 0.08 });
  const topMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.36, metalness: 0.18 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.2, metalness: 0.88 });
  const redBtnMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 0.75,
    roughness: 0.25,
  });

  // Stepped octagonal beveled dais
  const plinth1 = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.28, 0.18, 8), stoneMat);
  plinth1.position.y = 0.09;
  plinth1.receiveShadow = true;
  const plinth2 = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.88, 0.18, 8), topMat);
  plinth2.position.y = 0.26;
  plinth2.receiveShadow = true;
  group.add(plinth1, plinth2);

  // Turned LatheGeometry Stone Pedestal
  const lathePts = [
    new THREE.Vector2(0.01, 0.34),
    new THREE.Vector2(0.68, 0.34),
    new THREE.Vector2(0.56, 0.48),
    new THREE.Vector2(0.4, 0.7),
    new THREE.Vector2(0.52, 0.98),
    new THREE.Vector2(0.75, 1.06),
    new THREE.Vector2(0.01, 1.06),
  ];
  const tableStem = new THREE.Mesh(new THREE.LatheGeometry(lathePts, 28), stoneMat);
  tableStem.castShadow = !isSoftwareGl;
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.66, 1.66, 0.14, 36), topMat);
  tableTop.position.y = 1.12;
  tableTop.castShadow = !isSoftwareGl;
  tableTop.receiveShadow = true;
  const tableRim = new THREE.Mesh(new THREE.TorusGeometry(1.66, 0.055, 14, 40), brassMat);
  tableRim.rotation.x = Math.PI / 2;
  tableRim.position.y = 1.13;
  group.add(tableStem, tableTop, tableRim);

  // Emergency Adda Bell
  const bellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.14, 24), brassMat);
  bellBase.position.y = 1.26;
  const bellDome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), redBtnMat);
  bellDome.position.y = 1.32;
  const bellRing = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.04, 12, 28), brassMat);
  bellRing.rotation.x = Math.PI / 2;
  bellRing.position.y = 1.23;
  group.add(bellBase, bellDome, bellRing);

  // Turned Clay Bhar Cups & Colorful Plastic Moras
  const bharPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.065, 0),
    new THREE.Vector2(0.095, 0.11),
    new THREE.Vector2(0.085, 0.17),
    new THREE.Vector2(0.072, 0.17),
    new THREE.Vector2(0.058, 0.04),
    new THREE.Vector2(0.01, 0.04),
  ];
  const cupGeo = new THREE.LatheGeometry(bharPts, 18);
  const cupMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.8 });
  const moraColors = ['#e11d48', '#2563eb', '#16a34a', '#eab308'];

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + 0.4;
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(Math.cos(angle) * 1.04, 1.19, Math.sin(angle) * 1.04);
    group.add(cup);

    const mora = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.32, 0.4, 24),
      new THREE.MeshStandardMaterial({ color: moraColors[i], roughness: 0.42 }),
    );
    mora.position.set(Math.cos(angle) * 2.35, 0.2, Math.sin(angle) * 2.35);
    mora.castShadow = !isSoftwareGl;
    const moraRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.032, 10, 24),
      new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.4 }),
    );
    moraRim.rotation.x = Math.PI / 2;
    moraRim.position.set(mora.position.x, 0.39, mora.position.z);
    group.add(mora, moraRim);
  }

  // Plate of Shingara Snacks
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.22, 0.04, 24),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.22 }),
  );
  plate.position.set(0.62, 1.21, 0.42);
  group.add(plate);
  const shingaraMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.7 });
  for (const [sx, sz] of [
    [0.55, 0.38],
    [0.68, 0.46],
    [0.62, 0.32],
  ]) {
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.13, 4), shingaraMat);
    sh.position.set(sx, 1.28, sz);
    sh.rotation.y = sx * 4;
    group.add(sh);
  }

  return group;
}

export function createRickshawModel(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: '#047857', roughness: 0.3, metalness: 0.52 });
  const hoodMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.58, metalness: 0.06 });
  const goldTrim = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.2, metalness: 0.78 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.88 });
  const seatMat = new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.72 });
  const spokeMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.2, metalness: 0.9 });
  const artMat = new THREE.MeshStandardMaterial({ map: textures.rickshawArtMap, roughness: 0.35 });

  // Beveled ExtrudeGeometry Carriage Side Silhouette
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-1.1, 0);
  bodyShape.lineTo(1.05, 0);
  bodyShape.lineTo(0.92, 0.28);
  bodyShape.lineTo(-0.35, 0.28);
  bodyShape.lineTo(-0.48, 0.65);
  bodyShape.lineTo(-1.1, 0.65);
  bodyShape.closePath();

  const carriageGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 1.32,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  carriageGeo.center();
  const carriage = new THREE.Mesh(carriageGeo, frameMat);
  carriage.rotation.y = Math.PI / 2;
  carriage.position.set(0, 0.74, -0.05);
  carriage.castShadow = !isSoftwareGl;
  group.add(carriage);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.28, 0.76), seatMat);
  seat.position.set(0, 0.9, -0.52);
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.56, 0.16), hoodMat);
  backrest.position.set(0, 1.24, -0.92);
  const artPanel = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.56, 0.05), artMat);
  artPanel.position.set(0, 0.85, -1.16);
  group.add(seat, backrest, artPanel);

  // Curved Hood Canopy + Brass Support Ribs
  const hood = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 1.32, 32, 1, false, 0, Math.PI),
    hoodMat,
  );
  hood.rotation.z = Math.PI / 2;
  hood.rotation.y = Math.PI / 2;
  hood.position.set(0, 1.38, -0.52);
  hood.castShadow = !isSoftwareGl;
  group.add(hood);

  for (const az of [-0.95, -0.42, 0.14]) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.036, 12, 30, Math.PI), goldTrim);
    arch.rotation.y = Math.PI / 2;
    arch.position.set(0, 1.38, az);
    group.add(arch);
  }

  // Mudguards & 12-Spoked Wheels
  const wheelGeo = new THREE.TorusGeometry(0.39, 0.078, 16, 36);
  const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16);
  const spokeGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.7, 6);
  const fenderGeo = new THREE.TorusGeometry(0.45, 0.04, 8, 20, Math.PI * 0.85);
  const wheelPositions: Array<[number, number, number]> = [
    [-0.78, 0.45, -0.72],
    [0.78, 0.45, -0.72],
    [0, 0.45, 1.2],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, wy, wz);
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.rotation.y = Math.PI / 2;
    const hub = new THREE.Mesh(hubGeo, goldTrim);
    hub.rotation.z = Math.PI / 2;
    const fender = new THREE.Mesh(fenderGeo, frameMat);
    fender.rotation.y = Math.PI / 2;
    fender.rotation.z = 0.25;
    wheelGroup.add(w, hub, fender);
    for (let s = 0; s < 6; s++) {
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.rotation.x = (s / 6) * Math.PI;
      wheelGroup.add(spoke);
    }
    group.add(wheelGroup);
  }

  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.98, 12), goldTrim);
  fork.position.set(0, 0.92, 1.12);
  fork.rotation.x = -0.22;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.8, 12), goldTrim);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.35, 1.02);
  const headlamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 14, 14),
    new THREE.MeshBasicMaterial({ color: '#fef08a' }),
  );
  headlamp.position.set(0, 1.14, 1.18);

  const beamMat = new THREE.MeshBasicMaterial({
    color: '#fef08a',
    transparent: true,
    opacity: 0.085,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.85, 2.8, 16, 1, true), beamMat);
  beam.rotation.x = Math.PI * 0.42;
  beam.position.set(0, 0.72, 2.45);

  group.add(fork, bar, headlamp, beam);

  return group;
}

export function createCngModel(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const greenBody = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.32, metalness: 0.38 });
  const canvasHood = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85 });
  const yellowTrim = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.38 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#bae6fd',
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1,
    transparent: true,
    opacity: 0.72,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.25, metalness: 0.85 });

  // Curved Beveled Lower Hull
  const shape = new THREE.Shape();
  shape.moveTo(-1.25, 0);
  shape.lineTo(1.25, 0);
  shape.lineTo(1.38, 0.55);
  shape.lineTo(0.85, 0.72);
  shape.lineTo(-0.35, 0.72);
  shape.lineTo(-1.15, 0.88);
  shape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.38,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 3,
  });
  hullGeo.center();
  const hull = new THREE.Mesh(hullGeo, greenBody);
  hull.rotation.y = Math.PI / 2;
  hull.position.set(0, 0.68, 0);
  hull.castShadow = !isSoftwareGl;
  group.add(hull);

  // Curved Black Canvas Canopy Roof + Windshield
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.58, 1.95), canvasHood);
  roof.position.set(0, 1.56, -0.2);
  roof.castShadow = !isSoftwareGl;
  const roofCap = new THREE.Mesh(new THREE.CylinderGeometry(0.71, 0.71, 1.96, 20, 1, false, 0, Math.PI), canvasHood);
  roofCap.rotation.z = Math.PI / 2;
  roofCap.rotation.y = Math.PI / 2;
  roofCap.scale.set(1, 0.28, 1);
  roofCap.position.set(0, 1.85, -0.2);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.66, 0.08), glassMat);
  windshield.position.set(0, 1.44, 0.82);
  windshield.rotation.x = -0.22;

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.14, 0.18), yellowTrim);
  bumper.position.set(0, 0.42, 1.42);
  group.add(roof, roofCap, windshield, bumper);

  // Twin Headlights + Volumetric Road Beams
  const cngBeamMat = new THREE.MeshBasicMaterial({
    color: '#fef9c3',
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const hx of [-0.46, 0.46]) {
    const hl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16),
      new THREE.MeshBasicMaterial({ color: '#fef08a' }),
    );
    hl.rotation.x = Math.PI / 2;
    hl.position.set(hx, 0.78, 1.38);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.78, 3.3, 14, 1, true), cngBeamMat);
    beam.rotation.x = Math.PI * 0.45;
    beam.position.set(hx, 0.48, 2.95);
    group.add(hl, beam);
  }
  // Rear Tail Lights
  for (const tx of [-0.52, 0.52]) {
    const tl = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.1, 0.06),
      new THREE.MeshBasicMaterial({ color: '#ef4444' }),
    );
    tl.position.set(tx, 0.74, -1.28);
    group.add(tl);
  }

  // 3 Rubber Tires
  for (const [wx, wy, wz] of [
    [-0.74, 0.34, -0.82],
    [0.74, 0.34, -0.82],
    [0, 0.34, 1.05],
  ] as Array<[number, number, number]>) {
    const wg = new THREE.Group();
    wg.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 12, 24), tireMat);
    tire.rotation.y = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16), rimMat);
    rim.rotation.z = Math.PI / 2;
    wg.add(tire, rim);
    group.add(wg);
  }

  return group;
}

export function createChaStallProps(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.82 });
  const tinMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    roughness: 0.34,
    metalness: 0.78,
    normalMap: textures.tinNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
  });
  const kettleMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.16, metalness: 0.92 });
  const signMat = new THREE.MeshStandardMaterial({ map: textures.chaSignMap, roughness: 0.42 });

  const counter = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.12, 1.9), woodMat);
  counter.position.set(-35.5, 0.56, -36.2);
  counter.castShadow = !isSoftwareGl;
  counter.receiveShadow = true;
  group.add(counter);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.16, 4.0), tinMat);
  roof.position.set(-35.5, 3.05, -35.6);
  roof.rotation.x = 0.14;
  group.add(roof);

  for (const px of [-39.6, -31.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 3.05, 14), woodMat);
    post.position.set(px, 1.52, -34.2);
    group.add(post);
  }

  // Turned LatheGeometry Tea Kettle + Biscuit Jars
  const kettlePts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.32, 0),
    new THREE.Vector2(0.36, 0.16),
    new THREE.Vector2(0.24, 0.38),
    new THREE.Vector2(0.28, 0.44),
    new THREE.Vector2(0.12, 0.52),
    new THREE.Vector2(0.01, 0.52),
  ];
  const kettle = new THREE.Mesh(new THREE.LatheGeometry(kettlePts, 24), kettleMat);
  kettle.position.set(-34.2, 1.12, -36.1);

  const jar1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.5, 20),
    new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.2, transparent: true, opacity: 0.84 }),
  );
  jar1.position.set(-35.8, 1.37, -36.1);
  const jar2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.44, 20),
    new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.2, transparent: true, opacity: 0.84 }),
  );
  jar2.position.set(-36.5, 1.34, -36.1);
  group.add(kettle, jar1, jar2);

  // Hanging Golden Banana Bunch (Kola) & Warm Tungsten Stall Bulb
  const bananaMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.42 });
  for (let b = 0; b < 5; b++) {
    const ban = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 8, 12), bananaMat);
    ban.position.set(-31.9 + b * 0.09, 2.55 - (b % 2) * 0.05, -34.2);
    ban.rotation.z = 0.25 - b * 0.1;
    group.add(ban);
  }
  const stallBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#fde047' }),
  );
  stallBulb.position.set(-35.5, 2.75, -34.6);
  group.add(stallBulb);

  // Wooden Tea Bench in front
  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.68), woodMat);
  benchTop.position.set(-35.5, 0.48, -28.6);
  benchTop.castShadow = !isSoftwareGl;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.46, 0.56), woodMat);
  legL.position.set(-36.9, 0.23, -28.6);
  const legR = legL.clone();
  legR.position.x = -34.1;
  group.add(benchTop, legL, legR);

  const sign = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.3, 0.16), signMat);
  sign.position.set(-35.5, 3.65, -33.7);
  group.add(sign);

  return group;
}

export function createDescoTransformer(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const cabinetMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.74 });
  const finMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.35, metalness: 0.82 });
  const dangerMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.45 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#ef4444',
    emissiveIntensity: 1.5,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.15, 3.8), cabinetMat);
  body.position.y = 1.075;
  body.castShadow = !isSoftwareGl;
  group.add(body);

  // Cooling Radiator Fins along front/back
  for (let f = -1.6; f <= 1.6; f += 0.4) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.65, 4.06), finMat);
    fin.position.set(f, 1.05, 0);
    group.add(fin);
  }

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.28, 0.24, 3.88), dangerMat);
  stripe.position.y = 1.72;
  group.add(stripe);

  // Ceramic Ribbed Lathe Insulators
  const insPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.2, 0),
    new THREE.Vector2(0.12, 0.16),
    new THREE.Vector2(0.22, 0.32),
    new THREE.Vector2(0.12, 0.48),
    new THREE.Vector2(0.16, 0.66),
    new THREE.Vector2(0.01, 0.66),
  ];
  const insGeo = new THREE.LatheGeometry(insPts, 18);
  for (const ix of [-1.1, 0, 1.1]) {
    const ins = new THREE.Mesh(insGeo, dangerMat);
    ins.position.set(ix, 2.15, 0);
    group.add(ins);
  }

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 14), glowMat);
  beacon.position.set(0, 2.95, 0);
  group.add(beacon);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 1.2, 0.16),
    new THREE.MeshStandardMaterial({ map: textures.descoSignMap, roughness: 0.4 }),
  );
  sign.position.set(0, 3.45, -2.0);
  group.add(sign);

  return group;
}

export function createDishHub(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const deskMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.42, metalness: 0.5 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.95,
    roughness: 0.18,
  });
  const metalMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.2, metalness: 0.88 });

  const desk = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.12, 2.2), deskMat);
  desk.position.set(35.0, 0.56, 34.5);
  desk.castShadow = !isSoftwareGl;
  group.add(desk);

  for (const mx of [33.7, 36.2]) {
    const mon = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.72, 0.12), screenMat);
    mon.position.set(mx, 1.5, 34.4);
    group.add(mon);
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.2, 18), metalMat);
  mast.position.set(40.2, 1.6, 37.5);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.3, side: THREE.DoubleSide }),
  );
  dish.position.set(40.2, 3.4, 37.5);
  dish.rotation.x = Math.PI * 0.72;
  dish.rotation.z = -0.35;
  const feedArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.35, 10), metalMat);
  feedArm.position.set(40.5, 3.9, 36.8);
  feedArm.rotation.x = 0.9;
  group.add(mast, dish, feedArm);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 1.25, 0.16),
    new THREE.MeshStandardMaterial({ map: textures.dishSignMap, roughness: 0.4 }),
  );
  sign.position.set(35.0, 3.45, 39.2);
  group.add(sign);

  return group;
}

export function createPalmTree(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.65, side: THREE.DoubleSide });
  const coconutMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.72 });

  // Segmented Curved Ringed Trunk
  let y = 0;
  let offsetX = 0;
  for (let i = 0; i < 9; i++) {
    const topR = 0.25 - i * 0.014;
    const botR = 0.3 - i * 0.014;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, 0.76, 16), trunkMat);
    offsetX = Math.sin(i * 0.18) * 0.28;
    seg.position.set(offsetX, y + 0.36, 0);
    seg.rotation.z = -0.04 * i;
    seg.castShadow = !isSoftwareGl;
    group.add(seg);
    y += 0.68;
  }

  // Cluster of Coconuts
  for (let c = 0; c < 4; c++) {
    const ca = (c / 4) * Math.PI * 2;
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), coconutMat);
    nut.position.set(offsetX + Math.cos(ca) * 0.25, y - 0.18, Math.sin(ca) * 0.25);
    group.add(nut);
  }

  // Arched TubeGeometry Frond Spines + Multi-Blade Leaflets
  const frondBladeGeo = new THREE.PlaneGeometry(0.92, 0.26);
  for (let f = 0; f < 10; f++) {
    const angle = (f / 10) * Math.PI * 2;
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    const spineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(offsetX, y, 0),
      new THREE.Vector3(offsetX + dirX * 1.15, y + 0.55, dirZ * 1.15),
      new THREE.Vector3(offsetX + dirX * 2.3, y + 0.18, dirZ * 2.3),
      new THREE.Vector3(offsetX + dirX * 3.1, y - 0.55, dirZ * 3.1),
    ]);
    const spine = new THREE.Mesh(new THREE.TubeGeometry(spineCurve, 12, 0.045, 6, false), leafMat);
    group.add(spine);

    for (let k = 2; k <= 8; k++) {
      const t = k / 10;
      const pt = spineCurve.getPoint(t);
      const blade = new THREE.Mesh(frondBladeGeo, leafMat);
      blade.position.copy(pt);
      blade.rotation.y = -angle + Math.PI / 2;
      blade.rotation.x = 0.55 + t * 0.45;
      blade.scale.set(1.25 - t * 0.6, 1, 1);
      group.add(blade);
    }
  }

  return group;
}

export function createKrishnachuraTree(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.92 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.72 });
  const leafLightMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.68 });
  const flowerMat = new THREE.MeshStandardMaterial({
    color: '#f97316',
    emissive: '#dc2626',
    emissiveIntensity: 0.28,
    roughness: 0.48,
  });

  // Main Flared Trunk + Aerial Roots
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.62, 3.3, 18), barkMat);
  trunk.position.y = 1.65;
  trunk.castShadow = !isSoftwareGl;
  group.add(trunk);

  const branches: Array<[number, number, number, number]> = [
    [1.15, 3.5, 0.75, 0.55],
    [-1.2, 3.65, 0.55, -0.58],
    [0.25, 3.55, -1.15, 0.42],
    [-0.5, 3.7, -0.85, -0.35],
  ];
  for (let idx = 0; idx < branches.length; idx++) {
    const [bx, by, bz, rz] = branches[idx];
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 2.3, 12), barkMat);
    br.position.set(bx * 0.48, by - 0.55, bz * 0.48);
    br.rotation.z = rz;
    br.rotation.x = bz * 0.35;
    group.add(br);

    const canopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.35, 1),
      idx % 2 === 0 ? leafMat : leafLightMat,
    );
    canopy.scale.set(1.2, 0.78, 1.2);
    canopy.position.set(bx, by + 0.45, bz);
    canopy.castShadow = !isSoftwareGl;
    group.add(canopy);

    // Protruding Crimson-Vermilion Krishnachura Blossom Clusters
    for (let f = 0; f < 3; f++) {
      const fa = idx * 1.4 + f * 2.1;
      const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 1), flowerMat);
      bloom.scale.set(1.25, 0.68, 1.25);
      bloom.position.set(
        bx + Math.cos(fa) * 0.78,
        by + 0.92 + (f % 2) * 0.16,
        bz + Math.sin(fa) * 0.78,
      );
      group.add(bloom);
    }
  }

  const centerCrown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 1), leafMat);
  centerCrown.scale.set(1.25, 0.75, 1.25);
  centerCrown.position.set(0, 4.45, 0);
  centerCrown.castShadow = !isSoftwareGl;
  const centerBloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 1), flowerMat);
  centerBloom.scale.set(1.25, 0.65, 1.25);
  centerBloom.position.set(0.25, 5.1, -0.15);
  group.add(centerCrown, centerBloom);

  return group;
}

export function createStreetLamp(): { group: THREE.Group; coneMesh: THREE.Mesh } {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.35, metalness: 0.78 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: '#fbbf24',
    emissiveIntensity: 2.1,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.55, 18), poleMat);
  base.position.y = 0.275;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.3, 16), poleMat);
  pole.position.y = 2.35;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.032, 10, 18), poleMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 4.32;
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 4.25, 0),
    new THREE.Vector3(0.4, 4.6, 0),
    new THREE.Vector3(0.75, 4.35, 0),
  ]);
  const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 10, 0.04, 8, false), poleMat);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.16, 18), poleMat);
  shade.position.set(0.75, 4.32, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), bulbMat);
  bulb.position.set(0.75, 4.2, 0);

  // Subtle Volumetric Light Cone beneath streetlamp
  const coneMat = new THREE.MeshBasicMaterial({
    color: '#fde68a',
    transparent: true,
    opacity: 0.028,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const coneMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 2.85, 4.15, 20, 1, true), coneMat);
  coneMesh.position.set(0.75, 2.1, 0);

  group.add(base, pole, collar, arm, shade, bulb, coneMesh);
  return { group, coneMesh };
}

export function createUtilityPole(): THREE.Group {
  const group = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.85 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.45, metalness: 0.7 });
  const insMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.25 });

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 6.2, 12), concreteMat);
  post.position.y = 3.1;
  const cross = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), steelMat);
  cross.position.y = 5.6;
  group.add(post, cross);

  for (const ix of [-0.62, 0, 0.62]) {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.16, 10), insMat);
    ins.position.set(ix, 5.72, 0);
    group.add(ins);
  }
  return group;
}

export function createOverheadWires(spans: Array<[number, number, number, number]>): THREE.Group {
  const group = new THREE.Group();
  const wireMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.8 });
  for (const [x1, z1, x2, z2] of spans) {
    for (const off of [-0.45, 0.45]) {
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x1 + off * 0.4, 5.72, z1 + off * 0.4),
        new THREE.Vector3(midX + off * 0.4, 4.55, midZ + off * 0.4),
        new THREE.Vector3(x2 + off * 0.4, 5.72, z2 + off * 0.4),
      ]);
      const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.024, 5, false), wireMat);
      group.add(cable);
    }
  }
  return group;
}

export function createDrainVent(): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.58, metalness: 0.72 });
  const slatMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.42, metalness: 0.86 });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.09, 1.4), frameMat);
  frame.position.y = 0.045;
  group.add(frame);

  for (let i = -2; i <= 2; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.055, 0.11), slatMat);
    slat.position.set(0, 0.095, i * 0.24);
    group.add(slat);
  }
  return group;
}

export function createPukurDetails(): { group: THREE.Group; boat: THREE.Group; flowers: THREE.Group[] } {
  const group = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.65 });
  const petalMat = new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.36 });
  const centerMat = new THREE.MeshStandardMaterial({ color: '#fde047', roughness: 0.3 });
  const clayMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.72 });
  const postMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.88 });
  const flowers: THREE.Group[] = [];

  const lotusSpots: Array<[number, number, number]> = [
    [-44.2, -4.8, 1.1],
    [-48.0, -2.1, 0.95],
    [-44.6, 4.4, 1.2],
    [-48.4, 5.2, 1.0],
    [-46.2, -6.4, 0.9],
  ];

  for (const [lx, lz, sc] of lotusSpots) {
    const fl = new THREE.Group();
    fl.position.set(lx, 0.07, lz);
    fl.scale.setScalar(sc);

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.03, 24), padMat);
    fl.add(pad);

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), centerMat);
    core.position.y = 0.09;
    fl.add(core);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pet = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.26, 10), petalMat);
      pet.position.set(Math.cos(a) * 0.19, 0.11, Math.sin(a) * 0.19);
      pet.rotation.z = -Math.cos(a) * 0.62;
      pet.rotation.x = Math.sin(a) * 0.62;
      fl.add(pet);
    }
    group.add(fl);
    flowers.push(fl);
  }

  // Turned Clay Kolshi (Water Pitchers) on Ghat Steps
  const kolshiPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.16, 0),
    new THREE.Vector2(0.28, 0.18),
    new THREE.Vector2(0.26, 0.34),
    new THREE.Vector2(0.12, 0.44),
    new THREE.Vector2(0.18, 0.52),
    new THREE.Vector2(0.01, 0.52),
  ];
  const kolshiGeo = new THREE.LatheGeometry(kolshiPts, 24);
  for (const [kx, ky, kz] of [
    [-40.4, 0.22, -4.8],
    [-40.6, 0.22, -4.1],
  ]) {
    const k = new THREE.Mesh(kolshiGeo, clayMat);
    k.position.set(kx, ky, kz);
    group.add(k);
  }

  // Wooden Mooring Posts at the Ghat Edge
  for (const pz of [-5.8, 5.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 1.35, 14), postMat);
    post.position.set(-41.8, 0.55, pz);
    group.add(post);
  }

  // Curved Wooden Nouka Boat with Woven Chhai Canopy
  const boat = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.76 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.45 });
  const chhaiMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.85 });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 2.2, 14, 24), hullMat);
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1.18, 1.0, 0.45);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.3), trimMat);
  bench.position.y = 0.18;
  const chhai = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.56, 1.25, 20, 1, false, 0, Math.PI),
    chhaiMat,
  );
  chhai.rotation.z = Math.PI / 2;
  chhai.rotation.y = Math.PI / 2;
  chhai.position.set(0, 0.18, -0.15);
  boat.add(hull, bench, chhai);
  boat.position.set(-44.0, 0.09, 0.6);
  boat.rotation.y = 0.25;
  group.add(boat);

  return { group, boat, flowers };
}

export function createBazarProps(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const crateMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85 });
  const basketMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.88 });
  const produceColors = ['#ef4444', '#22c55e', '#facc15', '#a855f7'];

  // Woven Bamboo Jhuri Baskets via LatheGeometry
  const basketPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.32, 0),
    new THREE.Vector2(0.52, 0.36),
    new THREE.Vector2(0.46, 0.38),
    new THREE.Vector2(0.28, 0.04),
    new THREE.Vector2(0.01, 0.04),
  ];
  const basketGeo = new THREE.LatheGeometry(basketPts, 20);

  for (let i = 0; i < 4; i++) {
    const cz = -3.3 + i * 2.2;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.52, 1.45), crateMat);
    crate.position.set(41.5, 0.26, cz);
    crate.castShadow = !isSoftwareGl;
    group.add(crate);

    const basket = new THREE.Mesh(basketGeo, basketMat);
    basket.position.set(41.5, 0.52, cz);
    group.add(basket);

    const vegMat = new THREE.MeshStandardMaterial({ color: produceColors[i], roughness: 0.4 });
    for (let v = 0; v < 7; v++) {
      const va = (v / 7) * Math.PI * 2;
      const vr = v === 0 ? 0 : 0.22;
      const item = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), vegMat);
      item.position.set(41.5 + Math.cos(va) * vr, 0.78, cz + Math.sin(va) * vr);
      group.add(item);
    }
  }
  return group;
}

export function createEidgahGate(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.42 });
  const greenMat = new THREE.MeshStandardMaterial({ color: '#059669', roughness: 0.36 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.2, metalness: 0.85 });

  // Onion Dome LatheGeometry
  const domePts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.45, 0),
    new THREE.Vector2(0.64, 0.26),
    new THREE.Vector2(0.56, 0.58),
    new THREE.Vector2(0.24, 0.88),
    new THREE.Vector2(0.02, 1.08),
  ];
  const onionGeo = new THREE.LatheGeometry(domePts, 24);

  for (const px of [-4.4, 4.4]) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.4), whiteMat);
    plinth.position.set(px, 0.225, 0);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 4.6, 22), whiteMat);
    pillar.position.set(px, 2.5, 0);
    pillar.castShadow = !isSoftwareGl;
    const dome = new THREE.Mesh(onionGeo, greenMat);
    dome.position.set(px, 4.8, 0);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 12), goldMat);
    finial.position.set(px, 6.05, 0);
    group.add(plinth, pillar, dome, finial);
  }

  const arch = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.38, 16, 36, Math.PI), greenMat);
  arch.position.set(0, 3.6, 0);
  const trimArch = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.1, 10, 36, Math.PI), goldMat);
  trimArch.position.set(0, 3.6, 0);
  const centerDome = new THREE.Mesh(onionGeo, goldMat);
  centerDome.scale.setScalar(1.35);
  centerDome.position.set(0, 7.9, 0);
  group.add(arch, trimArch, centerDome);

  group.position.set(0, 0, -44.2);
  return group;
}

export function createWaterTowerModel(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.42, metalness: 0.76 });
  const tankMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.32, metalness: 0.32 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.38 });

  const legs: Array<[number, number]> = [
    [-1.65, -1.65],
    [1.65, -1.65],
    [-1.65, 1.65],
    [1.65, 1.65],
  ];
  for (const [lx, lz] of legs) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.65), trimMat);
    pad.position.set(lx, 0.175, lz);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 5.4, 14), steelMat);
    leg.position.set(lx, 2.7, lz);
    leg.castShadow = !isSoftwareGl;
    group.add(pad, leg);
  }

  // Horizontal Tie Beams + Diagonal Steel X-Bracing
  for (const hy of [1.9, 3.8]) {
    for (const bz of [-1.65, 1.65]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.14, 0.14), steelMat);
      beam.position.set(0, hy, bz);
      group.add(beam);
    }
    for (const bx of [-1.65, 1.65]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.3), steelMat);
      beam.position.set(bx, hy, 0);
      group.add(beam);
    }
  }

  // Circular Catwalk Ring + Guardrail
  const catwalk = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.14, 10, 32), steelMat);
  catwalk.rotation.x = Math.PI / 2;
  catwalk.position.y = 5.4;
  const rail = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.045, 8, 32), trimMat);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 6.2;

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 3.0, 36), tankMat);
  tank.position.y = 6.95;
  tank.castShadow = !isSoftwareGl;
  const band = new THREE.Mesh(new THREE.TorusGeometry(2.48, 0.07, 10, 36), trimMat);
  band.rotation.x = Math.PI / 2;
  band.position.y = 6.95;
  const lid = new THREE.Mesh(new THREE.ConeGeometry(2.58, 1.05, 36), trimMat);
  lid.position.y = 8.95;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 5.4, 16), steelMat);
  pipe.position.y = 2.7;
  group.add(catwalk, rail, tank, band, lid, pipe);

  group.position.set(0, 0, 39.0);
  return group;
}

export function createAlleyProps(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const binMat = new THREE.MeshStandardMaterial({ color: '#065f46', roughness: 0.45, metalness: 0.45 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.82 });

  // Framed Banglish Wall Posters mounted onto the alley sightline walls
  const posterGeo = new THREE.BoxGeometry(0.08, 1.35, 1.05);
  const posterConfigs: Array<[number, number, number, number, number]> = [
    [-15.42, 1.5, -14.5, 0, 0],
    [15.42, 1.5, -14.5, 0, 1],
    [-15.42, 1.5, 14.5, 0, 1],
    [15.42, 1.5, 14.5, 0, 0],
    [-17.2, 1.5, -33.72, Math.PI / 2, 0],
    [17.2, 1.5, -33.72, Math.PI / 2, 1],
    [-17.2, 1.5, 33.72, Math.PI / 2, 1],
    [17.2, 1.5, 33.72, Math.PI / 2, 0],
  ];
  for (const [px, py, pz, ry, pIdx] of posterConfigs) {
    const pMat = new THREE.MeshStandardMaterial({ map: textures.posterMaps[pIdx], roughness: 0.65 });
    const poster = new THREE.Mesh(posterGeo, pMat);
    poster.position.set(px, py, pz);
    poster.rotation.y = ry;
    group.add(poster);
  }

  // Roadside Dustbins & Wooden Benches tucked along alley corners
  for (const [bx, bz] of [
    [-14.6, -9.8],
    [14.6, -9.8],
    [-14.6, 9.8],
    [14.6, 9.8],
  ]) {
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.72, 16), binMat);
    bin.position.set(bx, 0.36, bz);
    bin.castShadow = !isSoftwareGl;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 16), woodMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(bx, 0.72, bz);
    group.add(bin, rim);
  }

  return group;
}

export function createPlanterPot(): THREE.Group {
  const group = new THREE.Group();
  const potMat = new THREE.MeshStandardMaterial({ color: '#c2410c', roughness: 0.78 });
  const bushMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.65 });
  const blossomMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', roughness: 0.38 });

  const potPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.28, 0),
    new THREE.Vector2(0.4, 0.44),
    new THREE.Vector2(0.45, 0.52),
    new THREE.Vector2(0.36, 0.52),
    new THREE.Vector2(0.01, 0.44),
  ];
  const pot = new THREE.Mesh(new THREE.LatheGeometry(potPts, 20), potMat);
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 2), bushMat);
  bush.position.y = 0.68;
  group.add(pot, bush);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), blossomMat);
    fl.position.set(Math.cos(a) * 0.36, 0.8 + (i % 2) * 0.1, Math.sin(a) * 0.36);
    group.add(fl);
  }
  return group;
}

export function createMoricbattiGarlands(): { group: THREE.Group; bulbMats: THREE.MeshBasicMaterial[] } {
  const group = new THREE.Group();
  const palette = ['#fbbf24', '#fb7185', '#34d399', '#38bdf8', '#c084fc'];
  const bulbMats = palette.map((c) => new THREE.MeshBasicMaterial({ color: c }));
  const wireMat = new THREE.MeshBasicMaterial({ color: '#1e293b' });

  const spans: Array<[number, number, number, number]> = [
    [-9.2, -9.2, 9.2, -9.2],
    [9.2, -9.2, 9.2, 9.2],
    [9.2, 9.2, -9.2, 9.2],
    [-9.2, 9.2, -9.2, -9.2],
  ];
  const bulbGeo = new THREE.SphereGeometry(0.13, 12, 12);

  spans.forEach(([x1, z1, x2, z2], sIdx) => {
    const count = 11;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const sag = Math.sin(t * Math.PI) * 1.05;
      const px = THREE.MathUtils.lerp(x1, x2, t);
      const pz = THREE.MathUtils.lerp(z1, z2, t);
      const py = 4.25 - sag;
      pts.push(new THREE.Vector3(px, py, pz));
      if (i > 0 && i < count) {
        const bulb = new THREE.Mesh(bulbGeo, bulbMats[(i + sIdx) % bulbMats.length]);
        bulb.position.set(px, py - 0.11, pz);
        group.add(bulb);
      }
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.022, 5, false), wireMat);
    group.add(wire);
  });

  return { group, bulbMats };
}

export function createSupplyCluster(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const crateMat = new THREE.MeshStandardMaterial({
    map: textures.crateWoodMap,
    normalMap: textures.crateWoodNormal,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughness: 0.78,
    metalness: 0.05,
  });
  const cornerMat = new THREE.MeshStandardMaterial({ color: '#3f4a3c', roughness: 0.45, metalness: 0.65 });
  const redDrumMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.42, metalness: 0.62 });
  const blueDrumMat = new THREE.MeshStandardMaterial({ color: '#0369a1', roughness: 0.45, metalness: 0.25 });

  // Heavy Slatted Wooden Supply Crate
  const bigCrate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.15, 1.4), crateMat);
  bigCrate.position.set(0, 0.575, 0);
  bigCrate.castShadow = !isSoftwareGl;
  bigCrate.receiveShadow = true;
  group.add(bigCrate);

  // Stacked angled small ammo/supply crate
  const smallCrate = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.7, 0.88), crateMat);
  smallCrate.position.set(-0.08, 1.5, 0.04);
  smallCrate.rotation.y = 0.28;
  smallCrate.castShadow = !isSoftwareGl;
  group.add(smallCrate);

  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.1, 0.92), cornerMat);
  strap.position.set(-0.08, 1.5, 0.04);
  strap.rotation.y = 0.28;
  group.add(strap);

  // Ribbed LatheGeometry Steel Oil & Water Drums
  const drumPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.38, 0),
    new THREE.Vector2(0.38, 0.3),
    new THREE.Vector2(0.41, 0.34),
    new THREE.Vector2(0.38, 0.38),
    new THREE.Vector2(0.38, 0.68),
    new THREE.Vector2(0.41, 0.72),
    new THREE.Vector2(0.38, 0.76),
    new THREE.Vector2(0.38, 1.06),
    new THREE.Vector2(0.4, 1.1),
    new THREE.Vector2(0.34, 1.1),
    new THREE.Vector2(0.34, 1.04),
    new THREE.Vector2(0.01, 1.04),
  ];
  const drumGeo = new THREE.LatheGeometry(drumPts, 20);

  const redDrum = new THREE.Mesh(drumGeo, redDrumMat);
  redDrum.position.set(1.22, 0, -0.25);
  redDrum.castShadow = !isSoftwareGl;
  redDrum.receiveShadow = true;

  const blueDrum = new THREE.Mesh(drumGeo, blueDrumMat);
  blueDrum.position.set(1.05, 0, 0.68);
  blueDrum.castShadow = !isSoftwareGl;
  blueDrum.receiveShadow = true;

  group.add(redDrum, blueDrum);
  return group;
}

export function createSandbagBarricade(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const bagMat = new THREE.MeshStandardMaterial({ color: '#9c8359', roughness: 0.92, metalness: 0.0 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.85, metalness: 0.04 });
  const hazardMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.55 });

  // Tapered Jersey Concrete Barrier Profile
  const jShape = new THREE.Shape();
  jShape.moveTo(-0.34, 0);
  jShape.lineTo(0.34, 0);
  jShape.lineTo(0.32, 0.16);
  jShape.lineTo(0.14, 0.42);
  jShape.lineTo(0.1, 0.92);
  jShape.lineTo(-0.1, 0.92);
  jShape.lineTo(-0.14, 0.42);
  jShape.lineTo(-0.32, 0.16);
  jShape.closePath();

  const barrierGeo = new THREE.ExtrudeGeometry(jShape, {
    depth: 2.3,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  barrierGeo.center();
  const barrier = new THREE.Mesh(barrierGeo, concreteMat);
  barrier.rotation.y = Math.PI / 2;
  barrier.position.set(0.8, 0.47, 0);
  barrier.castShadow = !isSoftwareGl;
  barrier.receiveShadow = true;
  group.add(barrier);

  for (const sx of [-0.72, 0, 0.72]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.24), hazardMat);
    stripe.position.set(sx + 0.8, 0.74, 0);
    group.add(stripe);
  }

  // Stacked Burlap Sandbags flanking the barrier
  const bagGeo = new THREE.CapsuleGeometry(0.18, 0.38, 6, 12);
  for (let row = 0; row < 3; row++) {
    const count = 4 - row;
    for (let i = 0; i < count; i++) {
      const bag = new THREE.Mesh(bagGeo, bagMat);
      bag.rotation.z = Math.PI / 2;
      bag.scale.set(0.72, 1, 1.15);
      const bx = -1.1 + (i - (count - 1) / 2) * 0.62;
      const by = 0.15 + row * 0.23;
      const bz = (row % 2 === 0 ? 0.03 : -0.03);
      bag.position.set(bx, by, bz);
      bag.rotation.y = (i % 2 === 0 ? 0.08 : -0.06);
      bag.castShadow = !isSoftwareGl;
      group.add(bag);
    }
  }

  return group;
}

export function createTerrainSkirt(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(560, 560, 96, 96);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const cFlat = new THREE.Color('#0d1624');
  const cMid = new THREE.Color('#133026');
  const cHill = new THREE.Color('#1a4734');
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const maxEdge = Math.max(Math.abs(x), Math.abs(z));
    const blend = THREE.MathUtils.smoothstep(maxEdge, 82, 118);

    const hills =
      Math.sin(x * 0.042) * Math.cos(z * 0.038) * 6.5 +
      Math.sin((x + z) * 0.025) * 4.2 +
      Math.cos(x * 0.09 - z * 0.07) * 1.8 +
      2.6;

    const h = blend * Math.max(0.2, hills);
    pos.setY(i, h);

    if (blend < 0.05) {
      tmpColor.copy(cFlat);
    } else {
      const hillFactor = THREE.MathUtils.clamp((h - 0.5) / 9.0, 0, 1);
      tmpColor.copy(cMid).lerp(cHill, hillFactor);
    }
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.05;
  mesh.receiveShadow = true;
  return mesh;
}

export function createInstancedGrassTufts(): {
  mesh: THREE.InstancedMesh;
  grassUniforms: { uTime: { value: number } };
} {
  // Build a single 3-blade crossed grass tuft geometry with uv.y = 0..1 for wind sway
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let b = 0; b < 3; b++) {
    const angle = (b / 3) * Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const hw = 0.085;
    const h = 0.46 + (b % 2) * 0.08;
    const baseIdx = b * 4;

    positions.push(
      -hw * cos, 0, -hw * sin,
      hw * cos, 0, hw * sin,
      hw * 0.22 * cos, h, hw * 0.22 * sin,
      -hw * 0.22 * cos, h, -hw * 0.22 * sin,
    );
    for (let k = 0; k < 4; k++) {
      normals.push(0, 1, 0);
    }
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
  }

  const tuftGeo = new THREE.BufferGeometry();
  tuftGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  tuftGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  tuftGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  tuftGeo.setIndex(indices);

  const grassUniforms = { uTime: { value: 0 } };
  const grassMat = new THREE.MeshStandardMaterial({
    color: '#22c55e',
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = grassUniforms.uTime;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float sway = sin(uTime * 2.1 + instanceMatrix[3][0] * 0.45 + instanceMatrix[3][2] * 0.35) * 0.14;
       transformed.x += sway * uv.y * uv.y;
       transformed.z += sway * 0.55 * uv.y * uv.y;`,
    );
  };

  // Deterministic pseudo-random placement along Eidgah borders, Pukur bank & outer green verges
  const coords: Array<[number, number, number, number]> = [];
  let s = 4242;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  // 1. Eidgah Maidan edge grass borders (avoiding center task area at 0,-37)
  for (let i = 0; i < 180; i++) {
    const gx = (rand() - 0.5) * 18.8;
    const gz = -37 + (rand() - 0.5) * 13.6;
    if (Math.hypot(gx, gz + 37) < 3.6) continue;
    coords.push([gx, gz, 0.75 + rand() * 0.5, rand() * Math.PI]);
  }
  // 2. Pukur Ghat grassy embankment around pond (outside water AABB -51..-42, -8..8)
  for (let i = 0; i < 200; i++) {
    const gx = -53.2 + rand() * 14.0;
    const gz = (rand() - 0.5) * 34;
    if (gx >= -51.6 && gx <= -41.4 && gz >= -8.8 && gz <= 8.8) continue;
    if (gx >= -42.0 && Math.abs(gz) < 7.5) continue;
    coords.push([gx, gz, 0.8 + rand() * 0.55, rand() * Math.PI]);
  }
  // 3. Compound inner lawn corners & perimeter tree bases (160m × 160m compound)
  for (let i = 0; i < 320; i++) {
    const side = i % 4;
    let gx = 0;
    let gz = 0;
    if (side === 0) {
      gx = (rand() - 0.5) * 148;
      gz = -76.5 + rand() * 3.0;
    } else if (side === 1) {
      gx = (rand() - 0.5) * 148;
      gz = 73.5 + rand() * 3.0;
    } else if (side === 2) {
      gx = -76.5 + rand() * 3.0;
      gz = (rand() - 0.5) * 148;
    } else {
      gx = 73.5 + rand() * 3.0;
      gz = (rand() - 0.5) * 148;
    }
    coords.push([gx, gz, 0.8 + rand() * 0.6, rand() * Math.PI]);
  }
  // 3b. Cricket Math & Fuchka border grass tufts
  for (let i = 0; i < 160; i++) {
    const gx = 57.5 + rand() * 16.5;
    const gz = -36.5 + rand() * 21.0;
    if (Math.hypot(gx - 66, gz + 26) < 4.5) continue;
    coords.push([gx, gz, 0.72 + rand() * 0.45, rand() * Math.PI]);
  }
  // 4. Outer rolling green verges beyond 160m perimeter walls (83..108m)
  for (let i = 0; i < 320; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 85 + rand() * 24;
    const gx = Math.cos(angle) * dist;
    const gz = Math.sin(angle) * dist;
    coords.push([gx, gz, 0.95 + rand() * 0.7, rand() * Math.PI]);
  }

  const mesh = new THREE.InstancedMesh(tuftGeo, grassMat, coords.length);
  const dummy = new THREE.Object3D();
  const c1 = new THREE.Color('#16a34a');
  const c2 = new THREE.Color('#22c55e');
  const c3 = new THREE.Color('#15803d');

  coords.forEach(([gx, gz, sc, rotY], idx) => {
    dummy.position.set(gx, 0.02, gz);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);

    const pick = idx % 3 === 0 ? c1 : idx % 3 === 1 ? c2 : c3;
    mesh.setColorAt(idx, pick);
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.computeBoundingSphere();

  return { mesh, grassUniforms };
}

export function createTwilightSkyline(): {
  group: THREE.Group;
  skyUniforms: { uTime: { value: number } };
} {
  const group = new THREE.Group();
  const bldgMat = new THREE.MeshStandardMaterial({ color: '#0c152b', roughness: 0.88, metalness: 0.14 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.82 });
  const tankMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.4 });
  const winMatWarm = new THREE.MeshBasicMaterial({ color: '#fde047' });
  const winMatCool = new THREE.MeshBasicMaterial({ color: '#bae6fd' });
  const beaconMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });

  // Atmospheric PUBG-Style Sunset-to-Midnight Shader Sky Dome with Drifting Volumetric-Feel Clouds
  const skyUniforms = { uTime: { value: 0 } };
  const skyShaderMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vWorldDir;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.05;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);

        vec3 zenithCol = vec3(0.02, 0.04, 0.11);
        vec3 midCol = vec3(0.09, 0.14, 0.30);
        vec3 horizonCol = vec3(0.24, 0.17, 0.31);

        vec3 col = mix(horizonCol, midCol, smoothstep(0.0, 0.28, h));
        col = mix(col, zenithCol, smoothstep(0.22, 0.78, h));

        // Warm Golden Sunset Rim Glow in the West-Northwest
        vec3 sunDir = normalize(vec3(-0.76, 0.14, -0.63));
        float sunDot = max(dot(dir, sunDir), 0.0);
        float horizonBand = exp(-h * 5.8);
        col += vec3(0.98, 0.48, 0.16) * pow(sunDot, 2.8) * horizonBand * 1.05;
        col += vec3(1.0, 0.76, 0.40) * pow(sunDot, 14.0) * 0.7;

        // Animated Dusk Clouds
        if (dir.y > 0.03) {
          vec2 cloudUv = dir.xz / (dir.y + 0.15) * 1.45;
          cloudUv.x += uTime * 0.014;
          cloudUv.y += uTime * 0.007;
          float n = fbm(cloudUv);
          float cloudMask = smoothstep(0.44, 0.74, n) * smoothstep(0.03, 0.24, dir.y);
          vec3 cloudDark = vec3(0.11, 0.14, 0.28);
          vec3 cloudLit = vec3(0.94, 0.52, 0.28);
          vec3 cloudCol = mix(cloudDark, cloudLit, pow(sunDot, 1.8) * 0.9 + 0.14);
          col = mix(col, cloudCol, cloudMask * 0.68);
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(270, 36, 24), skyShaderMat);
  group.add(skyDome);

  // Twinkling Starfield
  const starPos = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) {
    const theta = ((i * 137.5) % 360) * (Math.PI / 180);
    const phi = (0.2 + ((i * 29) % 58) / 100) * Math.PI * 0.5;
    const r = 240;
    starPos[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
    starPos[i * 3 + 1] = Math.sin(phi) * r + 14;
    starPos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: '#fef9c3', size: 0.95, transparent: true, opacity: 0.86, fog: false }),
  );
  group.add(stars);

  // Multi-Tiered Dhaka Apartment Buildings outside the 160m perimeter with rooftop tanks, aviation beacons & window grids
  const blocks: Array<[number, number, number, number, number]> = [
    [-112, -102, 18, 28, 16],
    [-46, -112, 20, 34, 16],
    [34, -108, 22, 30, 16],
    [108, -98, 17, 26, 16],
    [-110, 98, 19, 29, 16],
    [-28, 114, 20, 32, 16],
    [44, 110, 20, 27, 16],
    [110, 96, 18, 26, 16],
    [-114, 0, 16, 25, 24],
    [114, -4, 16, 29, 22],
    [-138, -38, 18, 38, 18],
    [138, 38, 18, 36, 18],
    [0, -134, 26, 40, 18],
    [0, 134, 24, 36, 18],
  ];

  blocks.forEach(([bx, bz, bw, bh, bd], idx) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, 0, bz);

    const mainTower = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bldgMat);
    mainTower.position.y = bh / 2 - 0.1;
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.5, 0.7, bd + 0.5), roofMat);
    parapet.position.y = bh + 0.25;
    const stairHead = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.32, 2.8, bd * 0.35), roofMat);
    stairHead.position.set(bw * 0.2, bh + 1.4, 0);
    const roofTank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.0, 14), tankMat);
    roofTank.position.set(-bw * 0.22, bh + 1.1, 0);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), beaconMat);
    beacon.position.set(bw * 0.2, bh + 3.05, 0);
    bGroup.add(mainTower, parapet, stairHead, roofTank, beacon);

    // Multi-Floor Lit Apartment Window Grid facing center
    const faceZ = bz > 0 ? -bd / 2 - 0.08 : bd / 2 + 0.08;
    const floors = Math.floor(bh / 4.5);
    for (let f = 1; f < floors; f++) {
      for (let c = -1; c <= 1; c++) {
        if ((f + c + idx) % 3 === 0) continue;
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 1.2, 0.15),
          (f + idx) % 2 === 0 ? winMatWarm : winMatCool,
        );
        win.position.set(c * (bw * 0.26), f * 4.2, faceZ);
        bGroup.add(win);
      }
    }
    group.add(bGroup);
  });

  // Glowing Twilight Moon + Halo
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(6.0, 26, 20),
    new THREE.MeshBasicMaterial({ color: '#fef3c7', fog: false }),
  );
  moon.position.set(-105, 64, -142);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(9.6, 22, 18),
    new THREE.MeshBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.18, fog: false }),
  );
  halo.position.copy(moon.position);
  group.add(moon, halo);

  return { group, skyUniforms };
}

// =========================================================================
// 5 NEW OUTER MOHOLLA HI-POLY COMPOSITE LANDMARKS + RAIL CROSSING GATE
// =========================================================================

export function createFuchkaCartModel(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const cartWood = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.72 });
  const redFrame = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.36, metalness: 0.45 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.2, metalness: 0.85 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#e0f2fe',
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1,
    transparent: true,
    opacity: 0.52,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.88 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.25, metalness: 0.82 });
  const purisMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.65 });
  const tokMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.25 });

  // Lower Cart Chassis + Spoked Wheels
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.96, 2.2), redFrame);
  chassis.position.set(0, 0.68, 0);
  chassis.castShadow = !isSoftwareGl;
  chassis.receiveShadow = true;
  group.add(chassis);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.12, 2.45), cartWood);
  counterTop.position.set(0, 1.2, 0);
  counterTop.receiveShadow = true;
  group.add(counterTop);

  for (const wx of [-2.45, 2.45]) {
    for (const wz of [-0.7, 0.7]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 12, 24), tireMat);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(wx, 0.36, wz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), rimMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, 0.36, wz);
      group.add(wheel, hub);
    }
  }

  // Glass Showcase Box filled with Stacked Golden Fuchka Puri Shells
  const showcase = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.9, 1.4), glassMat);
  showcase.position.set(-1.1, 1.72, 0);
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.08, 1.48), brassMat);
  frameTop.position.set(-1.1, 2.18, 0);
  group.add(showcase, frameTop);

  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 6; i++) {
      const puri = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), purisMat);
      puri.scale.set(1.15, 0.88, 1.15);
      puri.position.set(-1.8 + i * 0.28 + (row % 2) * 0.08, 1.38 + row * 0.17, (i % 2 === 0 ? 0.24 : -0.24));
      group.add(puri);
    }
  }

  // LatheGeometry Brass Tamarind Tok Hari Pot + Serving Ladle
  const hariPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.28, 0),
    new THREE.Vector2(0.46, 0.26),
    new THREE.Vector2(0.38, 0.52),
    new THREE.Vector2(0.26, 0.62),
    new THREE.Vector2(0.32, 0.68),
    new THREE.Vector2(0.01, 0.68),
  ];
  const hari = new THREE.Mesh(new THREE.LatheGeometry(hariPts, 24), brassMat);
  hari.position.set(1.15, 1.26, 0);
  const tokLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 18), tokMat);
  tokLiquid.position.set(1.15, 1.9, 0);
  group.add(hari, tokLiquid);

  // Corner Poles + Striped Festive Canopy + Illuminated Fuchka Signboard
  for (const px of [-2.3, 2.3]) {
    for (const pz of [-1.0, 1.0]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 2.2, 12), brassMat);
      pole.position.set(px, 2.3, pz);
      group.add(pole);
    }
  }
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 0.16, 2.9),
    new THREE.MeshStandardMaterial({ map: textures.bazarAwningMap, roughness: 0.48 }),
  );
  awning.position.set(0, 3.45, 0);
  awning.rotation.x = 0.08;
  awning.castShadow = !isSoftwareGl;
  group.add(awning);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 1.2, 0.16),
    new THREE.MeshStandardMaterial({ map: textures.fuchkaSignMap, roughness: 0.4 }),
  );
  sign.position.set(0, 4.15, 1.22);
  group.add(sign);

  // Warm tungsten bulb under canopy + nearby colorful moras for customers
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 14, 14),
    new THREE.MeshBasicMaterial({ color: '#fde047' }),
  );
  bulb.position.set(0, 3.25, 0.2);
  group.add(bulb);

  const moraColors = ['#e11d48', '#2563eb', '#f59e0b'];
  moraColors.forEach((hex, idx) => {
    const mora = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.3, 0.38, 18),
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.44 }),
    );
    mora.position.set(-1.6 + idx * 1.6, 0.19, 2.4);
    mora.castShadow = !isSoftwareGl;
    group.add(mora);
  });

  group.position.set(0, 0, -68.0);
  return group;
}

export function createSaloonProps(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): { group: THREE.Group; barberPole: THREE.Group } {
  const group = new THREE.Group();
  const counterMat = new THREE.MeshStandardMaterial({ color: '#831843', roughness: 0.38, metalness: 0.25 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.22 });
  const mirrorMat = new THREE.MeshPhysicalMaterial({
    color: '#bae6fd',
    roughness: 0.06,
    metalness: 0.9,
    clearcoat: 1,
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.16, metalness: 0.92 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: '#be123c', roughness: 0.48 });

  // Barber Counter + Illuminated Mirror Wall inside Saloon (-73.8..-71.8, z -32..-20)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.05, 11.4), counterMat);
  counter.position.set(-72.8, 0.525, -26.0);
  counter.castShadow = !isSoftwareGl;
  const topSlab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.12, 11.6), marbleMat);
  topSlab.position.set(-72.8, 1.1, -26.0);
  group.add(counter, topSlab);

  for (const mz of [-29.5, -26.0, -22.5]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.55, 2.2), mirrorMat);
    mirror.position.set(-73.95, 2.1, mz);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.66, 2.34), chromeMat);
    frame.position.set(-74.0, 2.1, mz);
    group.add(mirror, frame);

    // Turned LatheGeometry Hydraulic Barber Chair facing mirror
    const basePts = [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(0.42, 0),
      new THREE.Vector2(0.36, 0.08),
      new THREE.Vector2(0.12, 0.14),
      new THREE.Vector2(0.12, 0.46),
      new THREE.Vector2(0.01, 0.46),
    ];
    const chair = new THREE.Group();
    chair.position.set(-70.2, 0, mz);
    const ped = new THREE.Mesh(new THREE.LatheGeometry(basePts, 20), chromeMat);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.72), leatherMat);
    seat.position.y = 0.54;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.68), leatherMat);
    back.position.set(0.32, 0.92, 0);
    const headRest = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.34), leatherMat);
    headRest.position.set(0.34, 1.38, 0);
    chair.add(ped, seat, back, headRest);
    group.add(chair);
  }

  // Spinning Candy-Striped Barber Pole outside the East Entrance
  const barberPole = new THREE.Group();
  barberPole.position.set(-56.6, 2.0, -21.2);
  const poleBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 1.35, 20),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2 }),
  );
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), chromeMat);
  capTop.position.y = 0.74;
  const capBot = capTop.clone();
  capBot.position.y = -0.74;
  barberPole.add(poleBody, capTop, capBot);
  const redStripeMat = new THREE.MeshStandardMaterial({ color: '#e11d48', emissive: '#9f1239', emissiveIntensity: 0.35 });
  const blueStripeMat = new THREE.MeshStandardMaterial({ color: '#2563eb', emissive: '#1e40af', emissiveIntensity: 0.35 });
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.045, 8, 20),
      i % 2 === 0 ? redStripeMat : blueStripeMat,
    );
    ring.rotation.x = Math.PI / 2 - 0.35;
    ring.position.y = -0.5 + i * 0.2;
    barberPole.add(ring);
  }
  group.add(barberPole);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.3, 4.4),
    new THREE.MeshStandardMaterial({ map: textures.saloonSignMap, roughness: 0.4 }),
  );
  sign.position.set(-56.8, 3.7, -26.0);
  group.add(sign);

  return { group, barberPole };
}

export function createCricketMathProps(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const pitchMat = new THREE.MeshStandardMaterial({ color: '#d6bfa3', roughness: 0.9 });
  const lineMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.5 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.5 });
  const darkWood = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 });
  const neonMat = new THREE.MeshBasicMaterial({ color: '#fef9c3' });
  const towerMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.42, metalness: 0.72 });
  const benchGreen = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.48 });

  // Clay Cricket Pitch Strip + White Crease Markings
  const pitch = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 15.0), pitchMat);
  pitch.position.set(64.5, 0.04, -26.0);
  pitch.receiveShadow = true;
  group.add(pitch);

  for (const cz of [-31.8, -20.2]) {
    const crease = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.072, 0.14), lineMat);
    crease.position.set(64.5, 0.045, cz);
    group.add(crease);

    // 3 Turned Wooden Stumps + 2 Bails at each end
    for (const sx of [-0.22, 0, 0.22]) {
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.82, 10), woodMat);
      stump.position.set(64.5 + sx, 0.44, cz);
      stump.castShadow = !isSoftwareGl;
      group.add(stump);
    }
    for (const bx of [-0.11, 0.11]) {
      const bail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), darkWood);
      bail.rotation.z = Math.PI / 2;
      bail.position.set(64.5 + bx, 0.87, cz);
      group.add(bail);
    }
  }

  // Dugout Bench & Overhead Canopy (matches cricket_dugout AABB 72.2..74.2, z -30.5..-21.5)
  const dugoutSeat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.48, 8.6), benchGreen);
  dugoutSeat.position.set(73.1, 0.24, -26.0);
  dugoutSeat.castShadow = !isSoftwareGl;
  const dugoutBack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.35, 8.8), towerMat);
  dugoutBack.position.set(73.9, 0.72, -26.0);
  const dugoutRoof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 9.2), benchGreen);
  dugoutRoof.position.set(73.1, 2.35, -26.0);
  dugoutRoof.rotation.z = -0.18;
  for (const pz of [-30.0, -22.0]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.35, 10), towerMat);
    post.position.set(72.3, 1.18, pz);
    group.add(post);
  }
  group.add(dugoutSeat, dugoutBack, dugoutRoof);

  // Leaning Wooden Cricket Bat + Tape-Wrapped Red Tennis Ball near Crease
  const batBlade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.78, 0.06), woodMat);
  batBlade.position.set(66.8, 0.42, -21.2);
  batBlade.rotation.z = -0.25;
  const batHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.38, 10), darkWood);
  batHandle.position.set(66.92, 0.92, -21.2);
  batHandle.rotation.z = -0.25;
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 12),
    new THREE.MeshStandardMaterial({ color: '#fde047', roughness: 0.4 }),
  );
  ball.position.set(66.4, 0.14, -21.0);
  group.add(batBlade, batHandle, ball);

  // Stadium Floodlight Mast + Signboard
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 7.6, 14), towerMat);
  mast.position.set(73.2, 3.8, -34.2);
  const lampHead = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.35), towerMat);
  lampHead.position.set(72.9, 7.6, -34.0);
  lampHead.rotation.y = -0.6;
  const lampGlow = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.7, 0.1), neonMat);
  lampGlow.position.set(72.75, 7.6, -33.85);
  lampGlow.rotation.y = -0.6;
  group.add(mast, lampHead, lampGlow);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.25, 4.4),
    new THREE.MeshStandardMaterial({ map: textures.cricketSignMap, roughness: 0.4 }),
  );
  sign.position.set(73.1, 3.25, -26.0);
  group.add(sign);

  return group;
}

export function createPharmacyProps(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const cabinetMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.28 });
  const tealTrim = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.35 });
  const crossGreen = new THREE.MeshStandardMaterial({
    color: '#22c55e',
    emissive: '#16a34a',
    emissiveIntensity: 1.2,
  });
  const bottleMats = [
    new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.18 }),
    new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.18 }),
    new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.18 }),
  ];

  // Glass Pharmacy Counter (pharm_counter -73.8..-71.6, z 20..32)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 11.4), cabinetMat);
  counter.position.set(-72.7, 0.575, 26.0);
  counter.castShadow = !isSoftwareGl;
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 11.5), tealTrim);
  topTrim.position.set(-72.7, 1.18, 26.0);
  group.add(counter, topTrim);

  // Medicine Bottles via LatheGeometry along Counter
  const bottlePts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.12, 0),
    new THREE.Vector2(0.12, 0.28),
    new THREE.Vector2(0.06, 0.34),
    new THREE.Vector2(0.06, 0.42),
    new THREE.Vector2(0.01, 0.42),
  ];
  const bottleGeo = new THREE.LatheGeometry(bottlePts, 14);
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(bottleGeo, bottleMats[i % bottleMats.length]);
    b.position.set(-72.7 + ((i % 2) - 0.5) * 0.45, 1.25, 21.4 + i * 1.15);
    group.add(b);
  }

  // Glowing Pharmacy Red/Green Cross Beacon & Signboard at East Facade
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.34), crossGreen);
  crossV.position.set(-56.7, 3.6, 20.6);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 1.2), crossGreen);
  crossH.position.set(-56.7, 3.6, 20.6);
  group.add(crossV, crossH);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.3, 4.4),
    new THREE.MeshStandardMaterial({ map: textures.pharmacySignMap, roughness: 0.4 }),
  );
  sign.position.set(-56.8, 3.7, 26.0);
  group.add(sign);

  return group;
}

export function createBiyerPandalProps(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): { group: THREE.Group; wooferCones: THREE.Mesh[] } {
  const group = new THREE.Group();
  const stageMat = new THREE.MeshStandardMaterial({ color: '#9f1239', roughness: 0.42 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.22, metalness: 0.82 });
  const carpetMat = new THREE.MeshStandardMaterial({ color: '#be123c', roughness: 0.88 });
  const speakerMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.45, metalness: 0.5 });
  const coneMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.55,
  });
  const wooferCones: THREE.Mesh[] = [];

  // Raised Wedding DJ Stage (pandal_stage 70.5..74.2, z 22.5..29.5)
  const stage = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.25, 6.8), stageMat);
  stage.position.set(72.35, 0.625, 26.0);
  stage.castShadow = !isSoftwareGl;
  stage.receiveShadow = true;
  const stageTrim = new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.14, 6.92), goldMat);
  stageTrim.position.set(72.35, 1.25, 26.0);
  group.add(stage, stageTrim);

  // Plush Crimson Wedding Sofa & DJ Console on Stage
  const djBooth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 2.4), speakerMat);
  djBooth.position.set(71.8, 1.75, 26.0);
  group.add(djBooth);

  // Twin Towering DJ Speaker Stacks flanking Stage
  for (const sz of [21.6, 30.4]) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.2, 1.15), speakerMat);
    cab.position.set(72.0, 1.1, sz);
    cab.castShadow = !isSoftwareGl;
    group.add(cab);
    for (const cy of [0.68, 1.56]) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.24, 0.12, 20), coneMat);
      cone.rotation.z = Math.PI / 2;
      cone.position.set(71.38, cy, sz);
      group.add(cone);
      wooferCones.push(cone);
    }
  }

  // Festive Shamiana Canopy Posts + Hanging Genda Marigold Garlands + Red Carpet Runner
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 4.2), carpetMat);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(64.0, 0.068, 26.0);
  group.add(carpet);

  for (const px of [59.5, 73.8]) {
    for (const pz of [17.8, 34.2]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 4.2, 12), goldMat);
      pole.position.set(px, 2.1, pz);
      group.add(pole);
    }
  }

  const marigoldOrange = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.45 });
  const marigoldYellow = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.42 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#fb7185' });
  const garGeo = new THREE.SphereGeometry(0.16, 10, 10);

  for (const gz of [17.8, 26.0, 34.2]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const gx = THREE.MathUtils.lerp(59.5, 73.8, t);
      const gy = 4.15 - Math.sin(t * Math.PI) * 0.95;
      pts.push(new THREE.Vector3(gx, gy, gz));
      if (i > 0 && i < 10) {
        const flower = new THREE.Mesh(garGeo, i % 2 === 0 ? marigoldOrange : marigoldYellow);
        flower.position.set(gx, gy - 0.14, gz);
        group.add(flower);
      }
    }
    const wire = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.025, 6, false),
      bulbMat,
    );
    group.add(wire);
  }

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.35, 4.6),
    new THREE.MeshStandardMaterial({ map: textures.pandalSignMap, roughness: 0.4 }),
  );
  sign.position.set(59.6, 3.85, 26.0);
  group.add(sign);

  return { group, wooferCones };
}

export function createRailCrossingGate(isSoftwareGl: boolean): {
  group: THREE.Group;
  beaconMats: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const railMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.32, metalness: 0.85 });
  const tieMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.9 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.55 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.48, metalness: 0.5 });
  const barRed = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.35 });
  const barWhite = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 });
  const beaconMats = [
    new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 1.5 }),
    new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.1 }),
  ];

  // Steel Rails + Wooden Sleepers running East-West along South Avenue (z = 68)
  for (const rz of [67.2, 68.8]) {
    const track = new THREE.Mesh(new THREE.BoxGeometry(44.0, 0.09, 0.16), railMat);
    track.position.set(0, 0.055, rz);
    group.add(track);
  }
  for (let tx = -20; tx <= 20; tx += 1.2) {
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 2.3), tieMat);
    sleeper.position.set(tx, 0.032, 68.0);
    group.add(sleeper);
  }

  // Twin Gateman Cabins (rail_cabin_w -12..-8.2, rail_cabin_e 8.2..12.0, z 66.2..69.8) + Boom Gates
  [-10.1, 10.1].forEach((cx, idx) => {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.65, 3.4), cabinMat);
    cabin.position.set(cx, 1.325, 68.0);
    cabin.castShadow = !isSoftwareGl;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.24, 3.9), roofMat);
    roof.position.set(cx, 2.74, 68.0);
    group.add(cabin, roof);

    // Raised Diagonal Striped Crossing Boom Arm
    const boomGroup = new THREE.Group();
    boomGroup.position.set(cx + (idx === 0 ? 2.1 : -2.1), 1.3, 66.0);
    boomGroup.rotation.z = idx === 0 ? 0.62 : -0.62;
    for (let s = 0; s < 6; s++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.72, 10),
        s % 2 === 0 ? barRed : barWhite,
      );
      seg.rotation.z = Math.PI / 2;
      seg.position.x = (idx === 0 ? 1 : -1) * (0.4 + s * 0.72);
      boomGroup.add(seg);
    }
    group.add(boomGroup);

    // Alternating Signal Post Light
    const sigPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 10), roofMat);
    sigPost.position.set(cx + (idx === 0 ? 2.1 : -2.1), 1.6, 66.0);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), beaconMats[idx]);
    bulb.position.set(cx + (idx === 0 ? 2.1 : -2.1), 3.25, 66.0);
    group.add(sigPost, bulb);
  });

  return { group, beaconMats };
}

