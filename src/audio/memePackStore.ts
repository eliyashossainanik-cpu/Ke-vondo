export type QuickMemeId =
  | 'vine_boom'
  | 'bonk'
  | 'sad_trombone'
  | 'airhorn'
  | 'dun_dun'
  | 'chubani';

export type EventMemeId =
  | 'event_kill'
  | 'event_report'
  | 'event_meeting'
  | 'event_eject'
  | 'event_sabotage'
  | 'event_shield'
  | 'event_task'
  | 'event_vent'
  | 'event_win'
  | 'event_loss';

export type MemeSlotId = QuickMemeId | EventMemeId;

export interface MemeSlotMeta {
  id: MemeSlotId;
  category: 'quick' | 'event';
  defaultLabel: string;
  banglaHint: string;
  shortKey?: string;
  keywords: string[];
}

export const MEME_SLOTS: MemeSlotMeta[] = [
  // Quick Soundboard Slots [1]-[6]
  {
    id: 'vine_boom',
    category: 'quick',
    defaultLabel: 'Eey Bhai! (Boom)',
    banglaHint: 'Slot [1] · Quick Reaction SFX',
    shortKey: '1',
    keywords: ['boom', 'vine', 'eey', 'bhai', '1'],
  },
  {
    id: 'bonk',
    category: 'quick',
    defaultLabel: 'Gap e Nao! (Bonk)',
    banglaHint: 'Slot [2] · Quick Reaction SFX',
    shortKey: '2',
    keywords: ['bonk', 'gap', 'mara', '2'],
  },
  {
    id: 'sad_trombone',
    category: 'quick',
    defaultLabel: 'Dhora Khaisi (Wah)',
    banglaHint: 'Slot [3] · Quick Reaction SFX',
    shortKey: '3',
    keywords: ['sad', 'wah', 'trombone', 'dhora', '3'],
  },
  {
    id: 'airhorn',
    category: 'quick',
    defaultLabel: 'Khela Hobe! (Horn)',
    banglaHint: 'Slot [4] · Quick Reaction SFX',
    shortKey: '4',
    keywords: ['horn', 'khela', 'hobe', '4'],
  },
  {
    id: 'dun_dun',
    category: 'quick',
    defaultLabel: 'CID Shondeho!',
    banglaHint: 'Slot [5] · Quick Reaction SFX',
    shortKey: '5',
    keywords: ['cid', 'dun', 'sus', 'shondeho', '5'],
  },
  {
    id: 'chubani',
    category: 'quick',
    defaultLabel: 'Pukur Chubani!',
    banglaHint: 'Slot [6] · Quick Reaction SFX',
    shortKey: '6',
    keywords: ['chubani', 'pukur', 'splash', '6'],
  },

  // Automatic Game Event Triggers
  {
    id: 'event_kill',
    category: 'event',
    defaultLabel: 'Gap e Nao! (Kill)',
    banglaHint: 'Auto-plays when someone gets sized / eliminated',
    keywords: ['kill', 'size', 'murder', 'khatam', 'marse'],
  },
  {
    id: 'event_report',
    category: 'event',
    defaultLabel: 'Haire! Lash Report',
    banglaHint: 'Auto-plays when a fallen body is reported',
    keywords: ['report', 'lash', 'body', 'haire', 'dead'],
  },
  {
    id: 'event_meeting',
    category: 'event',
    defaultLabel: 'Shalish Bell (Meeting)',
    banglaHint: 'Auto-plays when Emergency Shalish starts',
    keywords: ['meeting', 'shalish', 'bell', 'emergency', 'adda'],
  },
  {
    id: 'event_eject',
    category: 'event',
    defaultLabel: 'Pukur Chubani (Eject)',
    banglaHint: 'Auto-plays when voted suspect goes into the pond',
    keywords: ['eject', 'throw', 'out', 'bye'],
  },
  {
    id: 'event_sabotage',
    category: 'event',
    defaultLabel: 'Current / Wi-Fi Kat',
    banglaHint: 'Auto-plays during Loadshedding or Wi-Fi sabotage',
    keywords: ['sabotage', 'current', 'wifi', 'power', 'alarm'],
  },
  {
    id: 'event_shield',
    category: 'event',
    defaultLabel: 'Tabiz Bachay Dise',
    banglaHint: 'Auto-plays when Kobiraj Tabiz shield saves someone',
    keywords: ['shield', 'tabiz', 'save', 'block'],
  },
  {
    id: 'event_task',
    category: 'event',
    defaultLabel: 'Kaaj Complete',
    banglaHint: 'Auto-plays on completing a Moholla mini-task',
    keywords: ['task', 'kaaj', 'complete', 'done'],
  },
  {
    id: 'event_vent',
    category: 'event',
    defaultLabel: 'Dren e Dhuka (Vent)',
    banglaHint: 'Auto-plays when hopping into a drain vent',
    keywords: ['vent', 'dren', 'drain'],
  },
  {
    id: 'event_win',
    category: 'event',
    defaultLabel: 'Jitsi! (Victory)',
    banglaHint: 'Auto-plays on winning the match',
    keywords: ['win', 'victory', 'jitsi', 'champ'],
  },
  {
    id: 'event_loss',
    category: 'event',
    defaultLabel: 'Khela Shesh (Defeat)',
    banglaHint: 'Auto-plays on losing the match',
    keywords: ['loss', 'lose', 'defeat', 'fail'],
  },
];

export interface StoredMemeMeta {
  fileName: string;
  mimeType: string;
  customLabel?: string;
  updatedAt: number;
}

interface StoredClipRecord {
  slotId: MemeSlotId;
  fileName: string;
  mimeType: string;
  buffer: ArrayBuffer;
  updatedAt: number;
}

const DB_NAME = 'ke_batpar_meme_pack';
const DB_VERSION = 1;
const STORE_NAME = 'clips';
const META_STORAGE_KEY = 'ke_batpar_meme_meta_v1';

const metaMap = new Map<MemeSlotId, StoredMemeMeta>();
const rawBufferMap = new Map<MemeSlotId, ArrayBuffer>();
const listeners = new Set<() => void>();
let initPromise: Promise<void> | null = null;

function notifyListeners(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
}

function loadMetaFromLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, StoredMemeMeta>;
    for (const [key, val] of Object.entries(parsed)) {
      if (val && typeof val === 'object') {
        metaMap.set(key as MemeSlotId, val);
      }
    }
  } catch {
    // ignore corrupted local storage
  }
}

function saveMetaToLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, StoredMemeMeta> = {};
    for (const [k, v] of metaMap.entries()) {
      obj[k] = v;
    }
    window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore storage quota errors
  }
}

loadMetaFromLocalStorage();

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'slotId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function initMemePackStore(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const db = await openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const rows = (req.result as StoredClipRecord[]) ?? [];
          for (const r of rows) {
            if (r?.slotId && r.buffer instanceof ArrayBuffer) {
              rawBufferMap.set(r.slotId, r.buffer);
              const existingMeta = metaMap.get(r.slotId);
              metaMap.set(r.slotId, {
                fileName: r.fileName,
                mimeType: r.mimeType,
                customLabel: existingMeta?.customLabel,
                updatedAt: r.updatedAt,
              });
            }
          }
          saveMetaToLocalStorage();
          notifyListeners();
          resolve();
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  })();
  return initPromise;
}

export function subscribeMemePack(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getSlotMeta(slotId: MemeSlotId): StoredMemeMeta | undefined {
  return metaMap.get(slotId);
}

export function getSlotDisplayLabel(slotId: MemeSlotId): string {
  const custom = metaMap.get(slotId)?.customLabel?.trim();
  if (custom) return custom;
  const def = MEME_SLOTS.find((s) => s.id === slotId);
  return def?.defaultLabel ?? slotId;
}

export function getRawClipBuffer(slotId: MemeSlotId): ArrayBuffer | undefined {
  return rawBufferMap.get(slotId);
}

export function hasCustomClip(slotId: MemeSlotId): boolean {
  return rawBufferMap.has(slotId);
}

export function getLoadedCustomCount(): number {
  return rawBufferMap.size;
}

export function stripAudioExtension(fileName: string): string {
  return fileName.replace(/\.(mp3|wav|ogg|m4a|webm|aac|flac)$/i, '').replace(/[_-]+/g, ' ').trim();
}

export async function setSlotAudioClip(
  slotId: MemeSlotId,
  fileName: string,
  mimeType: string,
  buffer: ArrayBuffer,
  customLabel?: string,
): Promise<void> {
  const copy = buffer.slice(0);
  const updatedAt = Date.now();
  rawBufferMap.set(slotId, copy);
  const prevMeta = metaMap.get(slotId);
  const meta = MEME_SLOTS.find((s) => s.id === slotId);
  const autoQuickLabel =
    meta?.category === 'quick'
      ? customLabel ?? prevMeta?.customLabel ?? stripAudioExtension(fileName).slice(0, 22)
      : customLabel ?? prevMeta?.customLabel;

  metaMap.set(slotId, {
    fileName,
    mimeType: mimeType || 'audio/mpeg',
    customLabel: autoQuickLabel,
    updatedAt,
  });
  saveMetaToLocalStorage();
  notifyListeners();

  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({
        slotId,
        fileName,
        mimeType: mimeType || 'audio/mpeg',
        buffer: copy,
        updatedAt,
      } satisfies StoredClipRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function setSlotCustomLabel(slotId: MemeSlotId, label: string): void {
  const clean = label.trim().slice(0, 24);
  const prev = metaMap.get(slotId);
  if (prev) {
    metaMap.set(slotId, { ...prev, customLabel: clean || undefined });
  } else if (clean) {
    metaMap.set(slotId, {
      fileName: '',
      mimeType: '',
      customLabel: clean,
      updatedAt: Date.now(),
    });
  }
  saveMetaToLocalStorage();
  notifyListeners();
}

export async function clearSlotClip(slotId: MemeSlotId): Promise<void> {
  rawBufferMap.delete(slotId);
  metaMap.delete(slotId);
  saveMetaToLocalStorage();
  notifyListeners();

  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(slotId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function clearAllClips(): Promise<void> {
  rawBufferMap.clear();
  metaMap.clear();
  saveMetaToLocalStorage();
  notifyListeners();

  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function matchFilenameToSlot(fileName: string, alreadyUsed: Set<MemeSlotId>): MemeSlotId | null {
  const low = fileName.toLowerCase();
  for (const slot of MEME_SLOTS) {
    if (alreadyUsed.has(slot.id)) continue;
    if (slot.keywords.some((kw) => low.includes(kw))) {
      return slot.id;
    }
  }
  for (const slot of MEME_SLOTS) {
    if (slot.category === 'quick' && !alreadyUsed.has(slot.id)) {
      return slot.id;
    }
  }
  for (const slot of MEME_SLOTS) {
    if (!alreadyUsed.has(slot.id)) {
      return slot.id;
    }
  }
  return null;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface ExportedMemePack {
  version: 1;
  app: 'ke-batpar';
  clips: Array<{
    slotId: MemeSlotId;
    fileName: string;
    mimeType: string;
    customLabel?: string;
    dataBase64: string;
  }>;
}

export function exportMemePackJson(): string {
  const clips: ExportedMemePack['clips'] = [];
  for (const [slotId, buffer] of rawBufferMap.entries()) {
    const meta = metaMap.get(slotId);
    clips.push({
      slotId,
      fileName: meta?.fileName || `${slotId}.mp3`,
      mimeType: meta?.mimeType || 'audio/mpeg',
      customLabel: meta?.customLabel,
      dataBase64: arrayBufferToBase64(buffer),
    });
  }
  const payload: ExportedMemePack = {
    version: 1,
    app: 'ke-batpar',
    clips,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importMemePackJson(jsonText: string): Promise<number> {
  const parsed = JSON.parse(jsonText) as Partial<ExportedMemePack>;
  if (!parsed || !Array.isArray(parsed.clips)) {
    throw new Error('Invalid meme pack JSON file.');
  }
  let imported = 0;
  for (const c of parsed.clips) {
    if (!c?.slotId || !c.dataBase64) continue;
    const valid = MEME_SLOTS.some((s) => s.id === c.slotId);
    if (!valid) continue;
    const buf = base64ToArrayBuffer(c.dataBase64);
    await setSlotAudioClip(
      c.slotId,
      c.fileName || `${c.slotId}.mp3`,
      c.mimeType || 'audio/mpeg',
      buf,
      c.customLabel,
    );
    imported++;
  }
  return imported;
}
