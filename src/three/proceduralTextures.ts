import * as THREE from 'three';

export interface ProceduralTextureSet {
  cobbleMap: THREE.CanvasTexture;
  cobbleNormal: THREE.DataTexture;
  asphaltMap: THREE.CanvasTexture;
  asphaltNormal: THREE.DataTexture;
  asphaltRoughness: THREE.CanvasTexture;
  terracottaTileMap: THREE.CanvasTexture;
  saloonTileMap: THREE.CanvasTexture;
  pharmacyTileMap: THREE.CanvasTexture;
  garageFloorMap: THREE.CanvasTexture;
  sidewalkMap: THREE.CanvasTexture;
  grassMap: THREE.CanvasTexture;
  tinBump: THREE.CanvasTexture;
  tinNormal: THREE.DataTexture;
  wallBrickMap: THREE.CanvasTexture;
  wallBrickNormal: THREE.DataTexture;
  chaWallMap: THREE.CanvasTexture;
  garageWallMap: THREE.CanvasTexture;
  descoWallMap: THREE.CanvasTexture;
  dishWallMap: THREE.CanvasTexture;
  saloonWallMap: THREE.CanvasTexture;
  pharmacyWallMap: THREE.CanvasTexture;
  alleyStuccoMap: THREE.CanvasTexture;
  crateWoodMap: THREE.CanvasTexture;
  crateWoodNormal: THREE.DataTexture;
  burlapSackMap: THREE.CanvasTexture;
  waterMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  addaSignMap: THREE.CanvasTexture;
  pukurSignMap: THREE.CanvasTexture;
  bazarSignMap: THREE.CanvasTexture;
  eidgahSignMap: THREE.CanvasTexture;
  wasaSignMap: THREE.CanvasTexture;
  chaSignMap: THREE.CanvasTexture;
  chaMenuMap: THREE.CanvasTexture;
  rickshawSignMap: THREE.CanvasTexture;
  descoSignMap: THREE.CanvasTexture;
  dishSignMap: THREE.CanvasTexture;
  rickshawArtMap: THREE.CanvasTexture;
  posterMaps: [THREE.CanvasTexture, THREE.CanvasTexture];
  saloonPosterMap: THREE.CanvasTexture;
  alponaMap: THREE.CanvasTexture;
  bazarAwningMap: THREE.CanvasTexture;
  fuchkaSignMap: THREE.CanvasTexture;
  saloonSignMap: THREE.CanvasTexture;
  cricketSignMap: THREE.CanvasTexture;
  scoreboardMap: THREE.CanvasTexture;
  pharmacySignMap: THREE.CanvasTexture;
  pandalSignMap: THREE.CanvasTexture;
  cricketTurfMap: THREE.CanvasTexture;
  dispose: () => void;
}

function heightCanvasToNormalMap(
  canvas: HTMLCanvasElement,
  strength: number,
  repeatX: number,
  repeatY: number,
  maxAniso: number,
): THREE.DataTexture {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const src = ctx.getImageData(0, 0, w, h).data;
  const dst = new Uint8Array(w * h * 4);

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dX = tr + 2 * r + br - (tl + 2 * l + bl);
      const dY = bl + 2 * b + br - (tl + 2 * t + tr);

      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(dst, w, h, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function makeSignTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  accentHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 192);

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 40; i++) {
    ctx.fillRect((i * 47) % 500, (i * 29) % 180, 18, 2);
  }

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 492, 172);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 472, 152);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px "Noto Sans Bengali", "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, 74);

  ctx.fillStyle = accentHex;
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, 256, 134);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function makePosterTexture(
  banglaLine: string,
  subLine: string,
  paperHex: string,
  inkHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = paperHex;
  ctx.fillRect(0, 0, 256, 320);

  ctx.strokeStyle = inkHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, 228, 292);

  ctx.fillStyle = inkHex;
  ctx.fillRect(26, 28, 204, 56);

  ctx.fillStyle = paperHex;
  ctx.font = 'bold 26px "Noto Sans Bengali", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('জরুরী বিজ্ঞপ্তি', 128, 56);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "Noto Sans Bengali", sans-serif';
  ctx.fillText(banglaLine, 128, 148);

  ctx.fillStyle = inkHex;
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subLine, 128, 212);

  ctx.fillStyle = 'rgba(15,23,42,0.18)';
  ctx.fillRect(36, 252, 184, 26);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTextureSet {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // 1. High-Detail Stone Cobble Albedo + Tangent Normal Map
  const cobbleCanvas = document.createElement('canvas');
  cobbleCanvas.width = 512;
  cobbleCanvas.height = 512;
  const cCtx = cobbleCanvas.getContext('2d')!;
  cCtx.fillStyle = '#202736';
  cCtx.fillRect(0, 0, 512, 512);

  const cobbleHeightCanvas = document.createElement('canvas');
  cobbleHeightCanvas.width = 512;
  cobbleHeightCanvas.height = 512;
  const cbCtx = cobbleHeightCanvas.getContext('2d')!;
  cbCtx.fillStyle = '#242424';
  cbCtx.fillRect(0, 0, 512, 512);

  const rows = 12;
  const cols = 6;
  const bh = 512 / rows;
  const bw = 512 / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw / 2);
    for (let c = -1; c <= cols; c++) {
      const shade = 52 + ((r * 7 + c * 13) % 24);
      cCtx.fillStyle = `rgb(${shade + 12}, ${shade + 16}, ${shade + 26})`;
      cCtx.fillRect(c * bw + offset + 3, r * bh + 3, bw - 6, bh - 6);
      cCtx.fillStyle = 'rgba(255,255,255,0.08)';
      cCtx.fillRect(c * bw + offset + 4, r * bh + 4, bw - 8, 4);

      const hv = 190 + ((r * 3 + c * 5) % 45);
      cbCtx.fillStyle = `rgb(${hv}, ${hv}, ${hv})`;
      cbCtx.fillRect(c * bw + offset + 4, r * bh + 4, bw - 8, bh - 8);
    }
  }

  const cobbleMap = new THREE.CanvasTexture(cobbleCanvas);
  cobbleMap.colorSpace = THREE.SRGBColorSpace;
  cobbleMap.wrapS = cobbleMap.wrapT = THREE.RepeatWrapping;
  cobbleMap.repeat.set(12, 12);
  cobbleMap.anisotropy = maxAniso;

  const cobbleNormal = heightCanvasToNormalMap(cobbleHeightCanvas, 2.2, 12, 12, maxAniso);

  // 2. Seamless Monsoon Wet/Dry Tarmac Asphalt + Fine Micro-Normal + Soft Rain Sheen Map
  const aspCanvas = document.createElement('canvas');
  aspCanvas.width = 512;
  aspCanvas.height = 512;
  const aCtx = aspCanvas.getContext('2d')!;
  aCtx.fillStyle = '#1b2332';
  aCtx.fillRect(0, 0, 512, 512);

  const aspHeightCanvas = document.createElement('canvas');
  aspHeightCanvas.width = 512;
  aspHeightCanvas.height = 512;
  const ahCtx = aspHeightCanvas.getContext('2d')!;
  ahCtx.fillStyle = '#808080';
  ahCtx.fillRect(0, 0, 512, 512);

  const aspRoughCanvas = document.createElement('canvas');
  aspRoughCanvas.width = 512;
  aspRoughCanvas.height = 512;
  const arCtx = aspRoughCanvas.getContext('2d')!;
  arCtx.fillStyle = '#dcdcdc';
  arCtx.fillRect(0, 0, 512, 512);

  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < 18000; i++) {
    const x = Math.floor(nextRand() * 512);
    const y = Math.floor(nextRand() * 512);
    const v = 24 + Math.floor(nextRand() * 14);
    aCtx.fillStyle = `rgb(${v}, ${v + 5}, ${v + 14})`;
    aCtx.fillRect(x, y, 1, 1);

    const bv = 114 + Math.floor(nextRand() * 28);
    ahCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    ahCtx.fillRect(x, y, 1, 1);
  }

  for (let p = 0; p < 4; p++) {
    const px = 80 + nextRand() * 352;
    const py = 80 + nextRand() * 352;
    const pr = 110 + nextRand() * 75;

    const pGrad = arCtx.createRadialGradient(px, py, 8, px, py, pr);
    pGrad.addColorStop(0, 'rgba(54, 54, 54, 0.72)');
    pGrad.addColorStop(0.55, 'rgba(110, 110, 110, 0.45)');
    pGrad.addColorStop(1, 'rgba(220, 220, 220, 0)');
    arCtx.fillStyle = pGrad;
    arCtx.beginPath();
    arCtx.arc(px, py, pr, 0, Math.PI * 2);
    arCtx.fill();

    const dGrad = aCtx.createRadialGradient(px, py, 8, px, py, pr);
    dGrad.addColorStop(0, 'rgba(12, 16, 26, 0.24)');
    dGrad.addColorStop(1, 'rgba(12, 16, 26, 0)');
    aCtx.fillStyle = dGrad;
    aCtx.beginPath();
    aCtx.arc(px, py, pr, 0, Math.PI * 2);
    aCtx.fill();
  }

  const asphaltMap = new THREE.CanvasTexture(aspCanvas);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.wrapS = asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.repeat.set(8, 8);
  asphaltMap.anisotropy = maxAniso;

  const asphaltNormal = heightCanvasToNormalMap(aspHeightCanvas, 0.55, 8, 8, maxAniso);

  const asphaltRoughness = new THREE.CanvasTexture(aspRoughCanvas);
  asphaltRoughness.wrapS = asphaltRoughness.wrapT = THREE.RepeatWrapping;
  asphaltRoughness.repeat.set(8, 8);
  asphaltRoughness.anisotropy = maxAniso;

  // 2b. Hand-laid Terracotta Verandah Tile Map
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 256;
  tileCanvas.height = 256;
  const ttCtx = tileCanvas.getContext('2d')!;
  ttCtx.fillStyle = '#3b2c26';
  ttCtx.fillRect(0, 0, 256, 256);
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const shade = 92 + ((tx * 13 + ty * 19) % 24);
      ttCtx.fillStyle = `rgb(${shade + 35}, ${Math.round(shade * 0.78)}, ${Math.round(shade * 0.62)})`;
      ttCtx.fillRect(tx * 64 + 3, ty * 64 + 3, 58, 58);
      ttCtx.strokeStyle = 'rgba(255,228,196,0.14)';
      ttCtx.lineWidth = 2;
      ttCtx.strokeRect(tx * 64 + 5, ty * 64 + 5, 54, 54);
    }
  }
  const terracottaTileMap = new THREE.CanvasTexture(tileCanvas);
  terracottaTileMap.colorSpace = THREE.SRGBColorSpace;
  terracottaTileMap.wrapS = terracottaTileMap.wrapT = THREE.RepeatWrapping;
  terracottaTileMap.repeat.set(5, 5);
  terracottaTileMap.anisotropy = maxAniso;

  // 2b-2. Checkerboard Barber Saloon Mosaic Floor
  const salTileCanvas = document.createElement('canvas');
  salTileCanvas.width = 256;
  salTileCanvas.height = 256;
  const stCtx = salTileCanvas.getContext('2d')!;
  for (let sy = 0; sy < 4; sy++) {
    for (let sx = 0; sx < 4; sx++) {
      const isEven = (sx + sy) % 2 === 0;
      stCtx.fillStyle = isEven ? '#e2e8f0' : '#334155';
      stCtx.fillRect(sx * 64, sy * 64, 64, 64);
      stCtx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
      stCtx.lineWidth = 2;
      stCtx.strokeRect(sx * 64 + 1, sy * 64 + 1, 62, 62);
    }
  }
  const saloonTileMap = new THREE.CanvasTexture(salTileCanvas);
  saloonTileMap.colorSpace = THREE.SRGBColorSpace;
  saloonTileMap.wrapS = saloonTileMap.wrapT = THREE.RepeatWrapping;
  saloonTileMap.repeat.set(6, 6);
  saloonTileMap.anisotropy = maxAniso;

  // 2b-3. Clean Clinical Pharmacy Porcelain Tile Floor
  const phTileCanvas = document.createElement('canvas');
  phTileCanvas.width = 256;
  phTileCanvas.height = 256;
  const ptCtx = phTileCanvas.getContext('2d')!;
  ptCtx.fillStyle = '#cbd5e1';
  ptCtx.fillRect(0, 0, 256, 256);
  for (let py = 0; py < 4; py++) {
    for (let px = 0; px < 4; px++) {
      ptCtx.fillStyle = (px + py) % 2 === 0 ? '#f1f5f9' : '#e0f2fe';
      ptCtx.fillRect(px * 64 + 2, py * 64 + 2, 60, 60);
    }
  }
  const pharmacyTileMap = new THREE.CanvasTexture(phTileCanvas);
  pharmacyTileMap.colorSpace = THREE.SRGBColorSpace;
  pharmacyTileMap.wrapS = pharmacyTileMap.wrapT = THREE.RepeatWrapping;
  pharmacyTileMap.repeat.set(6, 6);
  pharmacyTileMap.anisotropy = maxAniso;

  // 2b-4. Oil-Stained Concrete Garage Floor
  const garCanvas = document.createElement('canvas');
  garCanvas.width = 256;
  garCanvas.height = 256;
  const grCtx = garCanvas.getContext('2d')!;
  grCtx.fillStyle = '#334155';
  grCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const gx = Math.floor(nextRand() * 256);
    const gy = Math.floor(nextRand() * 256);
    const shade = 45 + Math.floor(nextRand() * 25);
    grCtx.fillStyle = `rgb(${shade},${shade + 6},${shade + 12})`;
    grCtx.fillRect(gx, gy, 2, 2);
  }
  for (let s = 0; s < 3; s++) {
    const sx = 50 + nextRand() * 156;
    const sy = 50 + nextRand() * 156;
    const g = grCtx.createRadialGradient(sx, sy, 2, sx, sy, 28);
    g.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
    g.addColorStop(1, 'rgba(15, 23, 42, 0)');
    grCtx.fillStyle = g;
    grCtx.beginPath();
    grCtx.arc(sx, sy, 28, 0, Math.PI * 2);
    grCtx.fill();
  }
  grCtx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
  grCtx.lineWidth = 4;
  grCtx.strokeRect(4, 4, 248, 248);
  const garageFloorMap = new THREE.CanvasTexture(garCanvas);
  garageFloorMap.colorSpace = THREE.SRGBColorSpace;
  garageFloorMap.wrapS = garageFloorMap.wrapT = THREE.RepeatWrapping;
  garageFloorMap.repeat.set(4, 4);
  garageFloorMap.anisotropy = maxAniso;

  // 2b-5. Sidewalk Interlocking Kerb Brick Map
  const swCanvas = document.createElement('canvas');
  swCanvas.width = 256;
  swCanvas.height = 256;
  const swCtx = swCanvas.getContext('2d')!;
  swCtx.fillStyle = '#475569';
  swCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const off = (y % 2) * 32;
      swCtx.fillStyle = (x + y) % 2 === 0 ? '#64748b' : '#94a3b8';
      swCtx.fillRect((x * 64 + off) % 256 + 2, y * 32 + 2, 58, 28);
    }
  }
  const sidewalkMap = new THREE.CanvasTexture(swCanvas);
  sidewalkMap.colorSpace = THREE.SRGBColorSpace;
  sidewalkMap.wrapS = sidewalkMap.wrapT = THREE.RepeatWrapping;
  sidewalkMap.repeat.set(24, 1);
  sidewalkMap.anisotropy = maxAniso;

  // 2c. Variegated Eidgah Lawn Grass Texture
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 256;
  grassCanvas.height = 256;
  const gCtx = grassCanvas.getContext('2d')!;
  gCtx.fillStyle = '#114d36';
  gCtx.fillRect(0, 0, 256, 256);
  for (let s = 0; s < 8; s++) {
    gCtx.fillStyle = s % 2 === 0 ? 'rgba(22, 101, 52, 0.45)' : 'rgba(6, 78, 59, 0.35)';
    gCtx.fillRect(s * 32, 0, 32, 256);
  }
  for (let b = 0; b < 1800; b++) {
    const gx = Math.floor(nextRand() * 256);
    const gy = Math.floor(nextRand() * 256);
    gCtx.fillStyle = nextRand() > 0.5 ? 'rgba(74, 222, 128, 0.16)' : 'rgba(20, 83, 45, 0.28)';
    gCtx.fillRect(gx, gy, 2, 3);
  }
  const grassMap = new THREE.CanvasTexture(grassCanvas);
  grassMap.colorSpace = THREE.SRGBColorSpace;
  grassMap.wrapS = grassMap.wrapT = THREE.RepeatWrapping;
  grassMap.repeat.set(4, 3);
  grassMap.anisotropy = maxAniso;

  // 3. Corrugated Tin Roof Bump & Normal Map
  const tinCanvas = document.createElement('canvas');
  tinCanvas.width = 256;
  tinCanvas.height = 256;
  const tCtx = tinCanvas.getContext('2d')!;
  for (let x = 0; x < 256; x++) {
    const v = Math.round(128 + 115 * Math.sin((x / 256) * Math.PI * 24));
    tCtx.fillStyle = `rgb(${v},${v},${v})`;
    tCtx.fillRect(x, 0, 1, 256);
  }
  const tinBump = new THREE.CanvasTexture(tinCanvas);
  tinBump.wrapS = tinBump.wrapT = THREE.RepeatWrapping;
  tinBump.repeat.set(5, 2);
  tinBump.anisotropy = maxAniso;
  const tinNormal = heightCanvasToNormalMap(tinCanvas, 2.4, 5, 2, maxAniso);

  // 4. Weathered Dhaka Brick Wall Albedo + Deep Mortar Normal Map
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = 512;
  wallCanvas.height = 512;
  const wCtx = wallCanvas.getContext('2d')!;
  wCtx.fillStyle = '#4e3127';
  wCtx.fillRect(0, 0, 512, 512);

  const wallHeightCanvas = document.createElement('canvas');
  wallHeightCanvas.width = 512;
  wallHeightCanvas.height = 512;
  const wbCtx = wallHeightCanvas.getContext('2d')!;
  wbCtx.fillStyle = '#202020';
  wbCtx.fillRect(0, 0, 512, 512);

  for (let r = 0; r < 14; r++) {
    const off = (r % 2) * 44;
    const brickH = 512 / 14;
    for (let c = -1; c < 7; c++) {
      const tone = 108 + ((r * 11 + c * 17) % 36);
      wCtx.fillStyle = `rgb(${tone + 46}, ${Math.round(tone * 0.65)}, ${Math.round(tone * 0.48)})`;
      wCtx.fillRect(c * 88 + off + 3, r * brickH + 3, 82, brickH - 6);

      const hv = 195 + ((r * 5 + c * 9) % 45);
      wbCtx.fillStyle = `rgb(${hv}, ${hv}, ${hv})`;
      wbCtx.fillRect(c * 88 + off + 4, r * brickH + 4, 80, brickH - 8);
    }
  }
  const mossGrad = wCtx.createLinearGradient(0, 360, 0, 512);
  mossGrad.addColorStop(0, 'rgba(18, 40, 26, 0)');
  mossGrad.addColorStop(1, 'rgba(18, 42, 28, 0.42)');
  wCtx.fillStyle = mossGrad;
  wCtx.fillRect(0, 360, 512, 152);

  const wallBrickMap = new THREE.CanvasTexture(wallCanvas);
  wallBrickMap.colorSpace = THREE.SRGBColorSpace;
  wallBrickMap.wrapS = wallBrickMap.wrapT = THREE.RepeatWrapping;
  wallBrickMap.repeat.set(4, 1);
  wallBrickMap.anisotropy = maxAniso;

  const wallBrickNormal = heightCanvasToNormalMap(wallHeightCanvas, 2.8, 4, 1, maxAniso);

  // 4a-2. Helper for Distinct Architectural Building Wall Textures (Plaster, Concrete Block, Steel, Glazed Tile)
  const makeBuildingWallTex = (
    topHex: string,
    midHex: string,
    dadoHex: string,
    stripeHex: string,
    mode: 'plaster' | 'blocks' | 'steel' | 'tiles' | 'stucco',
  ): THREE.CanvasTexture => {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 256;
    const cx = cv.getContext('2d')!;
    cx.fillStyle = midHex;
    cx.fillRect(0, 0, 256, 256);

    cx.fillStyle = topHex;
    cx.fillRect(0, 0, 256, 44);
    cx.fillStyle = dadoHex;
    cx.fillRect(0, 174, 256, 82);
    cx.fillStyle = stripeHex;
    cx.fillRect(0, 162, 256, 12);

    if (mode === 'blocks') {
      cx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
      cx.lineWidth = 2;
      for (let y = 0; y < 256; y += 32) {
        cx.beginPath();
        cx.moveTo(0, y);
        cx.lineTo(256, y);
        cx.stroke();
        const off = ((y / 32) % 2) * 32;
        for (let x = off; x < 256; x += 64) {
          cx.beginPath();
          cx.moveTo(x, y);
          cx.lineTo(x, y + 32);
          cx.stroke();
        }
      }
    } else if (mode === 'steel') {
      for (let x = 0; x < 256; x += 16) {
        cx.fillStyle = x % 32 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.16)';
        cx.fillRect(x, 0, 8, 256);
      }
      // Yellow-black hazard chevron along bottom dado
      for (let x = -32; x < 288; x += 32) {
        cx.fillStyle = '#eab308';
        cx.beginPath();
        cx.moveTo(x, 224);
        cx.lineTo(x + 16, 224);
        cx.lineTo(x + 32, 256);
        cx.lineTo(x + 16, 256);
        cx.closePath();
        cx.fill();
      }
    } else if (mode === 'tiles') {
      cx.strokeStyle = 'rgba(255,255,255,0.35)';
      cx.lineWidth = 2;
      for (let y = 0; y < 256; y += 32) {
        cx.beginPath();
        cx.moveTo(0, y);
        cx.lineTo(256, y);
        cx.stroke();
      }
      for (let x = 0; x < 256; x += 32) {
        cx.beginPath();
        cx.moveTo(x, 0);
        cx.lineTo(x, 256);
        cx.stroke();
      }
    } else {
      // Subtle plaster mottling + vertical bamboo/timber battens for warm Cha Dokan or stucco
      for (let i = 0; i < 450; i++) {
        const px = Math.floor(nextRand() * 256);
        const py = Math.floor(nextRand() * 256);
        cx.fillStyle = nextRand() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.07)';
        cx.fillRect(px, py, 3, 3);
      }
      if (mode === 'plaster') {
        cx.fillStyle = 'rgba(69, 26, 3, 0.32)';
        for (let x = 0; x < 256; x += 64) {
          cx.fillRect(x, 0, 8, 256);
        }
      }
    }

    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    t.anisotropy = maxAniso;
    return t;
  };

  const chaWallMap = makeBuildingWallTex('#b45309', '#fde68a', '#78350f', '#d97706', 'plaster');
  const garageWallMap = makeBuildingWallTex('#047857', '#a7f3d0', '#1e293b', '#eab308', 'blocks');
  const descoWallMap = makeBuildingWallTex('#7f1d1d', '#64748b', '#1e293b', '#dc2626', 'steel');
  const dishWallMap = makeBuildingWallTex('#1d4ed8', '#cbd5e1', '#1e3a8a', '#38bdf8', 'blocks');
  const saloonWallMap = makeBuildingWallTex('#9d174d', '#fce7f3', '#831843', '#f472b6', 'tiles');
  const pharmacyWallMap = makeBuildingWallTex('#0369a1', '#f0f9ff', '#0e7490', '#38bdf8', 'tiles');
  const alleyStuccoMap = makeBuildingWallTex('#94a3b8', '#cbd5e1', '#64748b', '#475569', 'stucco');

  // 4b. PUBG-Style Slatted Wooden Supply Crate Albedo + Normal Map
  const crateCanvas = document.createElement('canvas');
  crateCanvas.width = 256;
  crateCanvas.height = 256;
  const crCtx = crateCanvas.getContext('2d')!;
  crCtx.fillStyle = '#5c3a1e';
  crCtx.fillRect(0, 0, 256, 256);

  const crateHeightCanvas = document.createElement('canvas');
  crateHeightCanvas.width = 256;
  crateHeightCanvas.height = 256;
  const chCtx = crateHeightCanvas.getContext('2d')!;
  chCtx.fillStyle = '#404040';
  chCtx.fillRect(0, 0, 256, 256);

  for (let s = 0; s < 5; s++) {
    const shade = 115 + (s % 3) * 14;
    crCtx.fillStyle = `rgb(${shade + 22}, ${Math.round(shade * 0.72)}, ${Math.round(shade * 0.42)})`;
    crCtx.fillRect(18, 18 + s * 44, 220, 40);
    chCtx.fillStyle = '#c8c8c8';
    chCtx.fillRect(18, 18 + s * 44, 220, 40);
  }
  crCtx.strokeStyle = '#784e2b';
  crCtx.lineWidth = 20;
  crCtx.strokeRect(10, 10, 236, 236);
  chCtx.strokeStyle = '#ffffff';
  chCtx.lineWidth = 20;
  chCtx.strokeRect(10, 10, 236, 236);
  crCtx.beginPath();
  crCtx.moveTo(20, 20);
  crCtx.lineTo(236, 236);
  crCtx.stroke();
  chCtx.beginPath();
  chCtx.moveTo(20, 20);
  chCtx.lineTo(236, 236);
  chCtx.stroke();

  const crateWoodMap = new THREE.CanvasTexture(crateCanvas);
  crateWoodMap.colorSpace = THREE.SRGBColorSpace;
  crateWoodMap.anisotropy = maxAniso;
  const crateWoodNormal = heightCanvasToNormalMap(crateHeightCanvas, 2.5, 1, 1, maxAniso);

  // 4c. Woven Jute Burlap Rice Sack Texture (Chaler Bosta)
  const sackCanvas = document.createElement('canvas');
  sackCanvas.width = 256;
  sackCanvas.height = 256;
  const skCtx = sackCanvas.getContext('2d')!;
  skCtx.fillStyle = '#a1805a';
  skCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) {
    skCtx.fillStyle = y % 12 === 0 ? 'rgba(69, 44, 18, 0.2)' : 'rgba(255, 240, 200, 0.14)';
    skCtx.fillRect(0, y, 256, 3);
  }
  for (let x = 0; x < 256; x += 6) {
    skCtx.fillStyle = 'rgba(69, 44, 18, 0.14)';
    skCtx.fillRect(x, 0, 2, 256);
  }
  skCtx.fillStyle = '#15803d';
  skCtx.fillRect(0, 114, 256, 28);
  skCtx.fillStyle = '#dc2626';
  skCtx.font = 'bold 28px "Noto Sans Bengali", sans-serif';
  skCtx.textAlign = 'center';
  skCtx.textBaseline = 'middle';
  skCtx.fillText('মিনিকেট ৫০ কেজি', 128, 76);
  const burlapSackMap = new THREE.CanvasTexture(sackCanvas);
  burlapSackMap.colorSpace = THREE.SRGBColorSpace;
  burlapSackMap.anisotropy = maxAniso;

  // 5. Pukur Water Texture
  const waterCanvas = document.createElement('canvas');
  waterCanvas.width = 256;
  waterCanvas.height = 256;
  const waCtx = waterCanvas.getContext('2d')!;
  const wGrad = waCtx.createLinearGradient(0, 0, 256, 256);
  wGrad.addColorStop(0, '#0a3d5c');
  wGrad.addColorStop(0.5, '#0e7490');
  wGrad.addColorStop(1, '#115e59');
  waCtx.fillStyle = wGrad;
  waCtx.fillRect(0, 0, 256, 256);
  waCtx.strokeStyle = 'rgba(186, 230, 253, 0.3)';
  waCtx.lineWidth = 2;
  for (let y = 16; y < 256; y += 28) {
    waCtx.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const py = y + Math.sin((x / 256) * Math.PI * 4) * 5;
      if (x === 0) waCtx.moveTo(x, py);
      else waCtx.lineTo(x, py);
    }
    waCtx.stroke();
  }
  const waterMap = new THREE.CanvasTexture(waterCanvas);
  waterMap.colorSpace = THREE.SRGBColorSpace;
  waterMap.wrapS = waterMap.wrapT = THREE.RepeatWrapping;
  waterMap.repeat.set(2, 3);

  // 6. Contact Shadow Disc Texture
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 128;
  shCanvas.height = 128;
  const sCtx = shCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shCanvas);

  // 7. Satire Shop Signboards, Chalkboard Menus & Posters (All 14 Districts Labeled!)
  const addaSignMap = makeSignTexture('আড্ডা চক', 'ADDA CHOWK · CENTRAL PLAZA', '#1e293b', '#fbbf24', maxAniso);
  const pukurSignMap = makeSignTexture('পুকুর ঘাট', 'PUKUR GHAT · WEST POND', '#164e63', '#22d3ee', maxAniso);
  const bazarSignMap = makeSignTexture('মহল্লা বাজার', 'MOHOLLA BAZAR · MARKET', '#7c2d12', '#fbbf24', maxAniso);
  const eidgahSignMap = makeSignTexture('ঈদগাহ মাঠ', 'EIDGAH MAIDAN · NORTH', '#064e3b', '#34d399', maxAniso);
  const wasaSignMap = makeSignTexture('পানির ট্যাংক', 'WASA WATER TOWER', '#1e3a8a', '#38bdf8', maxAniso);
  const chaSignMap = makeSignTexture('মামা টং ও চা', 'MAMA CHA-ER DOKAN', '#451a03', '#fbbf24', maxAniso);
  const rickshawSignMap = makeSignTexture('সোনার বাংলা গ্যারেজ', 'SONAR BANGLA GARAGE', '#064e3b', '#34d399', maxAniso);
  const descoSignMap = makeSignTexture('ডেসকো পাওয়ার', 'LOADSHEDDING CONTROL', '#450a0a', '#f87171', maxAniso);
  const dishSignMap = makeSignTexture('আকাশ ডিশ হাব', 'DISH & WIFI STATION', '#172554', '#60a5fa', maxAniso);
  const fuchkaSignMap = makeSignTexture('মামা ঝাল ফুচকা', 'SPICY FUCHKA STAND', '#7c2d12', '#fde047', maxAniso);
  const saloonSignMap = makeSignTexture('হিরো সেলুন', 'HERO BARBER & STYLE', '#500724', '#f472b6', maxAniso);
  const cricketSignMap = makeSignTexture('পাড়া ক্রিকেট মাঠ', 'GULLY CRICKET ARENA', '#052e16', '#4ade80', maxAniso);
  const pharmacySignMap = makeSignTexture('দাদু ফার্মেসি', 'DADU 24H PHARMACY', '#0c4a6e', '#38bdf8', maxAniso);
  const pandalSignMap = makeSignTexture('বিয়ে বাড়ি প্যান্ডেল', 'BIYER DJ PANDAL', '#881337', '#fbbf24', maxAniso);

  // Cha Menu Chalkboard
  const cmCanvas = document.createElement('canvas');
  cmCanvas.width = 256;
  cmCanvas.height = 192;
  const cmCtx = cmCanvas.getContext('2d')!;
  cmCtx.fillStyle = '#0f291e';
  cmCtx.fillRect(0, 0, 256, 192);
  cmCtx.strokeStyle = '#92400e';
  cmCtx.lineWidth = 10;
  cmCtx.strokeRect(5, 5, 246, 182);
  cmCtx.fillStyle = '#fde047';
  cmCtx.font = 'bold 24px "Noto Sans Bengali", sans-serif';
  cmCtx.textAlign = 'center';
  cmCtx.fillText('মামা টং মেনু', 128, 36);
  cmCtx.fillStyle = '#f8fafc';
  cmCtx.font = 'bold 18px "Noto Sans Bengali", sans-serif';
  cmCtx.fillText('দুধ চা ......... ১০৳', 128, 76);
  cmCtx.fillText('রং চা ......... ৫৳', 128, 108);
  cmCtx.fillText('সিঙ্গারা/বন ... ১০৳', 128, 140);
  cmCtx.fillText('পান-সুপারি .... ১০৳', 128, 170);
  const chaMenuMap = new THREE.CanvasTexture(cmCanvas);
  chaMenuMap.colorSpace = THREE.SRGBColorSpace;
  chaMenuMap.anisotropy = maxAniso;

  // Cricket Scoreboard
  const scCanvas = document.createElement('canvas');
  scCanvas.width = 256;
  scCanvas.height = 160;
  const scCtx = scCanvas.getContext('2d')!;
  scCtx.fillStyle = '#052e16';
  scCtx.fillRect(0, 0, 256, 160);
  scCtx.strokeStyle = '#f8fafc';
  scCtx.lineWidth = 6;
  scCtx.strokeRect(6, 6, 244, 148);
  scCtx.fillStyle = '#fbbf24';
  scCtx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  scCtx.textAlign = 'center';
  scCtx.fillText('MOHALLA PREMIER', 128, 34);
  scCtx.fillStyle = '#ffffff';
  scCtx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
  scCtx.fillText('142 / 4', 128, 86);
  scCtx.fillStyle = '#4ade80';
  scCtx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  scCtx.fillText('OVERS: 11.4  TAR: 150', 128, 130);
  const scoreboardMap = new THREE.CanvasTexture(scCanvas);
  scoreboardMap.colorSpace = THREE.SRGBColorSpace;
  scoreboardMap.anisotropy = maxAniso;

  // Saloon Haircut Style Poster
  const spCanvas = document.createElement('canvas');
  spCanvas.width = 256;
  spCanvas.height = 320;
  const spCtx = spCanvas.getContext('2d')!;
  spCtx.fillStyle = '#1e1b4b';
  spCtx.fillRect(0, 0, 256, 320);
  spCtx.strokeStyle = '#f472b6';
  spCtx.lineWidth = 10;
  spCtx.strokeRect(10, 10, 236, 300);
  spCtx.fillStyle = '#fbcfe8';
  spCtx.font = 'bold 26px "Noto Sans Bengali", sans-serif';
  spCtx.textAlign = 'center';
  spCtx.fillText('হিরো হেয়ার কাটিং', 128, 52);
  spCtx.fillStyle = '#38bdf8';
  spCtx.beginPath();
  spCtx.arc(128, 150, 56, 0, Math.PI * 2);
  spCtx.fill();
  spCtx.fillStyle = '#0f172a';
  spCtx.beginPath();
  spCtx.arc(128, 126, 46, Math.PI, 0);
  spCtx.fill();
  spCtx.fillStyle = '#fde047';
  spCtx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  spCtx.fillText('FADE • SPIKE • SPA', 128, 248);
  spCtx.fillText('ONLY 60 TAKA!', 128, 282);
  const saloonPosterMap = new THREE.CanvasTexture(spCanvas);
  saloonPosterMap.colorSpace = THREE.SRGBColorSpace;
  saloonPosterMap.anisotropy = maxAniso;

  const posterMaps: [THREE.CanvasTexture, THREE.CanvasTexture] = [
    makePosterTexture('এখানে পোস্টার লাগাবেন না!', 'PARABASI WATCHING YOU', '#fef3c7', '#b91c1c', maxAniso),
    makePosterTexture('১০০% জিপিএ-৫ কোচিং', 'TONG ADDA SPECIAL', '#e0f2fe', '#1d4ed8', maxAniso),
  ];

  // 7b. Hand-Painted Dhaka Rickshaw Folk-Art Panel
  const rCanvas = document.createElement('canvas');
  rCanvas.width = 256;
  rCanvas.height = 128;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#0f766e';
  rCtx.fillRect(0, 0, 256, 128);
  rCtx.strokeStyle = '#facc15';
  rCtx.lineWidth = 8;
  rCtx.strokeRect(6, 6, 244, 116);
  rCtx.fillStyle = '#e11d48';
  rCtx.beginPath();
  rCtx.arc(128, 64, 34, 0, Math.PI * 2);
  rCtx.fill();
  rCtx.fillStyle = '#fef08a';
  for (let p = 0; p < 8; p++) {
    const a = (p / 8) * Math.PI * 2;
    rCtx.beginPath();
    rCtx.arc(128 + Math.cos(a) * 26, 64 + Math.sin(a) * 26, 10, 0, Math.PI * 2);
    rCtx.fill();
  }
  rCtx.fillStyle = '#38bdf8';
  rCtx.beginPath();
  rCtx.arc(52, 64, 16, 0, Math.PI * 2);
  rCtx.arc(204, 64, 16, 0, Math.PI * 2);
  rCtx.fill();
  const rickshawArtMap = new THREE.CanvasTexture(rCanvas);
  rickshawArtMap.colorSpace = THREE.SRGBColorSpace;
  rickshawArtMap.anisotropy = maxAniso;

  // 8. Bengali Alpona Mandala Ring
  const alpCanvas = document.createElement('canvas');
  alpCanvas.width = 512;
  alpCanvas.height = 512;
  const alCtx = alpCanvas.getContext('2d')!;
  alCtx.clearRect(0, 0, 512, 512);
  alCtx.save();
  alCtx.translate(256, 256);
  alCtx.strokeStyle = 'rgba(254, 243, 199, 0.85)';
  alCtx.lineWidth = 6;
  alCtx.beginPath();
  alCtx.arc(0, 0, 214, 0, Math.PI * 2);
  alCtx.stroke();
  alCtx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
  alCtx.lineWidth = 4;
  alCtx.beginPath();
  alCtx.arc(0, 0, 180, 0, Math.PI * 2);
  alCtx.stroke();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    alCtx.save();
    alCtx.rotate(a);
    alCtx.fillStyle = i % 2 === 0 ? 'rgba(254, 240, 138, 0.8)' : 'rgba(244, 114, 182, 0.74)';
    alCtx.beginPath();
    alCtx.moveTo(180, 0);
    alCtx.quadraticCurveTo(208, 18, 236, 0);
    alCtx.quadraticCurveTo(208, -18, 180, 0);
    alCtx.fill();
    alCtx.restore();
  }
  alCtx.restore();
  const alponaMap = new THREE.CanvasTexture(alpCanvas);
  alponaMap.colorSpace = THREE.SRGBColorSpace;
  alponaMap.anisotropy = maxAniso;

  // 9. Striped Festive Bazar Awning
  const awnCanvas = document.createElement('canvas');
  awnCanvas.width = 256;
  awnCanvas.height = 256;
  const awCtx = awnCanvas.getContext('2d')!;
  const stripeColors = ['#d97706', '#fef3c7', '#dc2626', '#fef3c7'];
  const sw = 256 / 8;
  for (let i = 0; i < 8; i++) {
    awCtx.fillStyle = stripeColors[i % stripeColors.length];
    awCtx.fillRect(0, i * sw, 256, sw);
  }
  const bazarAwningMap = new THREE.CanvasTexture(awnCanvas);
  bazarAwningMap.colorSpace = THREE.SRGBColorSpace;
  bazarAwningMap.anisotropy = maxAniso;

  // 10. Striped Para Cricket Stadium Turf Map
  const turfCanvas = document.createElement('canvas');
  turfCanvas.width = 256;
  turfCanvas.height = 256;
  const tfCtx = turfCanvas.getContext('2d')!;
  for (let row = 0; row < 8; row++) {
    tfCtx.fillStyle = row % 2 === 0 ? '#15803d' : '#166534';
    tfCtx.fillRect(0, row * 32, 256, 32);
  }
  for (let b = 0; b < 1400; b++) {
    const tx = Math.floor(nextRand() * 256);
    const ty = Math.floor(nextRand() * 256);
    tfCtx.fillStyle = nextRand() > 0.5 ? 'rgba(134, 239, 172, 0.14)' : 'rgba(20, 83, 45, 0.25)';
    tfCtx.fillRect(tx, ty, 2, 2);
  }
  const cricketTurfMap = new THREE.CanvasTexture(turfCanvas);
  cricketTurfMap.colorSpace = THREE.SRGBColorSpace;
  cricketTurfMap.wrapS = cricketTurfMap.wrapT = THREE.RepeatWrapping;
  cricketTurfMap.repeat.set(3, 4);
  cricketTurfMap.anisotropy = maxAniso;

  return {
    cobbleMap,
    cobbleNormal,
    asphaltMap,
    asphaltNormal,
    asphaltRoughness,
    terracottaTileMap,
    saloonTileMap,
    pharmacyTileMap,
    garageFloorMap,
    sidewalkMap,
    grassMap,
    tinBump,
    tinNormal,
    wallBrickMap,
    wallBrickNormal,
    chaWallMap,
    garageWallMap,
    descoWallMap,
    dishWallMap,
    saloonWallMap,
    pharmacyWallMap,
    alleyStuccoMap,
    crateWoodMap,
    crateWoodNormal,
    burlapSackMap,
    waterMap,
    contactShadowMap,
    addaSignMap,
    pukurSignMap,
    bazarSignMap,
    eidgahSignMap,
    wasaSignMap,
    chaSignMap,
    chaMenuMap,
    rickshawSignMap,
    descoSignMap,
    dishSignMap,
    rickshawArtMap,
    posterMaps,
    saloonPosterMap,
    alponaMap,
    bazarAwningMap,
    fuchkaSignMap,
    saloonSignMap,
    cricketSignMap,
    scoreboardMap,
    pharmacySignMap,
    pandalSignMap,
    cricketTurfMap,
    dispose: () => {
      cobbleMap.dispose();
      cobbleNormal.dispose();
      asphaltMap.dispose();
      asphaltNormal.dispose();
      asphaltRoughness.dispose();
      terracottaTileMap.dispose();
      saloonTileMap.dispose();
      pharmacyTileMap.dispose();
      garageFloorMap.dispose();
      sidewalkMap.dispose();
      grassMap.dispose();
      tinBump.dispose();
      tinNormal.dispose();
      wallBrickMap.dispose();
      wallBrickNormal.dispose();
      chaWallMap.dispose();
      garageWallMap.dispose();
      descoWallMap.dispose();
      dishWallMap.dispose();
      saloonWallMap.dispose();
      pharmacyWallMap.dispose();
      alleyStuccoMap.dispose();
      crateWoodMap.dispose();
      crateWoodNormal.dispose();
      burlapSackMap.dispose();
      waterMap.dispose();
      contactShadowMap.dispose();
      addaSignMap.dispose();
      pukurSignMap.dispose();
      bazarSignMap.dispose();
      eidgahSignMap.dispose();
      wasaSignMap.dispose();
      chaSignMap.dispose();
      chaMenuMap.dispose();
      rickshawSignMap.dispose();
      descoSignMap.dispose();
      dishSignMap.dispose();
      rickshawArtMap.dispose();
      posterMaps[0].dispose();
      posterMaps[1].dispose();
      saloonPosterMap.dispose();
      alponaMap.dispose();
      bazarAwningMap.dispose();
      fuchkaSignMap.dispose();
      saloonSignMap.dispose();
      cricketSignMap.dispose();
      scoreboardMap.dispose();
      pharmacySignMap.dispose();
      pandalSignMap.dispose();
      cricketTurfMap.dispose();
    },
  };
}
