import type {
  BodyMarker,
  EjectionInfo,
  MatchOutcome,
  PlayerColorId,
  PlayerState,
  PlayerTaskState,
  RoomSettings,
  SpecialRole,
  VentNode,
} from './types';
import { distance2D, TASK_STATIONS, VENTS } from './mapData';

export const KILL_RANGE = 2.95;
export const REPORT_RANGE = 3.5;
export const VENT_RANGE = 2.5;
export const SABOTAGE_DURATION_SEC = 56;
export const SABOTAGE_COOLDOWN_SEC = 26;
export const SABOTAGE_FIX_RANGE = 3.1;
export const MISTRI_FIX_RANGE = 4.6;
export const DOOR_LOCK_DURATION_SEC = 10;
export const DOOR_LOCK_COOLDOWN_SEC = 18;

export const GOYENDA_INSPECT_RANGE = 4.6;
export const KOBIRAJ_SHIELD_RANGE = 3.8;
export const KOBIRAJ_COOLDOWN_SEC = 24;
export const MISTRI_VENT_COOLDOWN_SEC = 16;
export const BOHURUPI_DISGUISE_DURATION_SEC = 14;
export const BOHURUPI_COOLDOWN_SEC = 26;
export const DAROGA_ARREST_RANGE = 3.6;
export const DAROGA_COOLDOWN_SEC = 22;
export const DAKTAR_REVIVE_RANGE = 3.8;
export const JHARUDAR_CLEAN_RANGE = 3.6;
export const JHARUDAR_CLEAN_COOLDOWN_SEC = 24;

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  vondoCount: 1,
  killCooldownSec: 18,
  meetingTimeSec: 45,
  moveSpeed: 8.6,
  tasksPerPlayer: 6,
  emergencyCooldownSec: 12,
  emergencyMeetingsPerPlayer: 2,
  confirmEjects: true,
  anonymousVotes: false,
  visualTasks: true,
  enableSpecialRoles: true,
};

export function createPlayerTasks(
  count: number = DEFAULT_ROOM_SETTINGS.tasksPerPlayer,
  rng: () => number = Math.random,
): PlayerTaskState[] {
  const pool = [...TASK_STATIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(count, pool.length)).map((t) => ({
    taskId: t.id,
    completed: false,
  }));
}

export function assignRoles<T extends Pick<PlayerState, 'id' | 'role'>>(
  players: T[],
  requestedVondoCount: number,
  rng: () => number = Math.random,
): T[] {
  if (players.length === 0) return players;
  const maxVondos = Math.max(1, Math.min(requestedVondoCount, Math.floor((players.length - 1) / 2) || 1));
  const indices = players.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  const vondoSet = new Set(indices.slice(0, maxVondos));
  return players.map((p, idx) => ({
    ...p,
    role: vondoSet.has(idx) ? 'vondo' : 'parabasi',
  }));
}

export function assignSpecialRoles<T extends Pick<PlayerState, 'id' | 'role' | 'specialRole'>>(
  players: T[],
  enabled: boolean,
  forcedLocalSpecial?: SpecialRole,
  localPlayerId?: string,
  rng: () => number = Math.random,
): T[] {
  const out = players.map((p) => ({ ...p, specialRole: 'none' as SpecialRole }));
  if (!enabled || out.length === 0) return out;

  const shuffle = <X,>(arr: X[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = copy[i];
      copy[i] = copy[j];
      copy[j] = t;
    }
    return copy;
  };

  const takenSpecials = new Set<SpecialRole>();
  if (forcedLocalSpecial && forcedLocalSpecial !== 'none' && localPlayerId) {
    const localIdx = out.findIndex((p) => p.id === localPlayerId);
    if (localIdx >= 0) {
      out[localIdx].specialRole = forcedLocalSpecial;
      takenSpecials.add(forcedLocalSpecial);
    }
  }

  // Assign Vondo special roles (Bohurupi / Jharudar)
  const vondoCandidates = shuffle(
    out.filter((p) => p.role === 'vondo' && p.specialRole === 'none'),
  );
  const desiredVondoRoles: SpecialRole[] =
    rng() < 0.5 ? ['bohurupi', 'jharudar'] : ['jharudar', 'bohurupi'];
  for (const vr of desiredVondoRoles) {
    if (takenSpecials.has(vr)) continue;
    const nextV = vondoCandidates.shift();
    if (!nextV) break;
    nextV.specialRole = vr;
    takenSpecials.add(vr);
  }

  // Assign Para-basi & Pagol special roles among non-Vondos
  const crewPool = shuffle(out.filter((p) => p.role === 'parabasi' && p.specialRole === 'none'));
  const desiredCrewRoles: SpecialRole[] =
    out.length >= 5
      ? ['goyenda', 'kobiraj', 'mistri', 'pagol', 'daroga', 'neta', 'daktar']
      : ['goyenda', 'kobiraj', 'mistri', 'daroga'];

  for (const r of desiredCrewRoles) {
    if (takenSpecials.has(r)) continue;
    const nextPlayer = crewPool.shift();
    if (!nextPlayer) break;
    nextPlayer.specialRole = r;
    takenSpecials.add(r);
  }

  return out;
}

export function computeTaskProgress(players: PlayerState[]): {
  completedTasks: number;
  totalTasks: number;
  progress: number;
} {
  let totalTasks = 0;
  let completedTasks = 0;
  for (const p of players) {
    if (p.role !== 'parabasi' || p.specialRole === 'pagol') continue;
    for (const t of p.tasks) {
      totalTasks++;
      if (t.completed) completedTasks++;
    }
  }
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  return { completedTasks, totalTasks, progress };
}

export function canExecuteKill(
  killer: PlayerState,
  target: PlayerState,
): { allowed: boolean; reason?: string } {
  if (!killer.alive || killer.role !== 'vondo') {
    return { allowed: false, reason: 'Only an alive Vondo can eliminate.' };
  }
  if (killer.inVent) {
    return { allowed: false, reason: 'Exit the drain vent first.' };
  }
  if (killer.killCooldownRemaining > 0.05) {
    return { allowed: false, reason: 'Kill cooldown active.' };
  }
  if (!target.alive || target.id === killer.id || target.role === 'vondo') {
    return { allowed: false, reason: 'Invalid target.' };
  }
  if (target.inVent) {
    return { allowed: false, reason: 'Target is unreachable.' };
  }
  const dist = distance2D(killer.x, killer.z, target.x, target.z);
  if (dist > KILL_RANGE) {
    return { allowed: false, reason: 'Target out of range.' };
  }
  return { allowed: true };
}

export function canUseVent(player: PlayerState): boolean {
  if (!player.alive) return false;
  if (player.role === 'vondo') return true;
  if (player.specialRole === 'mistri') {
    return player.inVent || player.abilityCooldown <= 0.05;
  }
  return false;
}

export function canCompleteTasks(player: Pick<PlayerState, 'role' | 'specialRole'>): boolean {
  return player.role === 'parabasi' && player.specialRole !== 'pagol';
}

export function getConnectedVents(x: number, z: number): {
  currentVent: VentNode | null;
  targets: VentNode[];
} {
  let currentVent: VentNode | null = null;
  let bestDist = Infinity;
  for (const v of VENTS) {
    const d = distance2D(x, z, v.x, v.z);
    if (d < bestDist && d <= VENT_RANGE + 0.5) {
      bestDist = d;
      currentVent = v;
    }
  }
  if (!currentVent) return { currentVent: null, targets: [] };
  const targets = currentVent.targetIds
    .map((id) => VENTS.find((v) => v.id === id))
    .filter((v): v is VentNode => Boolean(v));
  return { currentVent, targets };
}

export function resolveVentHopTarget(
  x: number,
  z: number,
  destinationVentId: string,
): VentNode | null {
  const { currentVent, targets } = getConnectedVents(x, z);
  if (!currentVent) return null;
  return targets.find((t) => t.id === destinationVentId) ?? null;
}

export function getDirectionCompass(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
): { distance: number; arrow: string; cardinal: string } {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const distance = Math.round(Math.hypot(dx, dz));
  if (distance < 2) {
    return { distance, arrow: '•', cardinal: 'HERE' };
  }
  const angle = Math.atan2(dx, -dz); // 0 = North (-Z), +PI/2 = East (+X)
  const sector = Math.round(angle / (Math.PI / 4));
  const normalized = ((sector % 8) + 8) % 8;
  const dirs = [
    { arrow: '↑', cardinal: 'N' },
    { arrow: '↗', cardinal: 'NE' },
    { arrow: '→', cardinal: 'E' },
    { arrow: '↘', cardinal: 'SE' },
    { arrow: '↓', cardinal: 'S' },
    { arrow: '↙', cardinal: 'SW' },
    { arrow: '←', cardinal: 'W' },
    { arrow: '↖', cardinal: 'NW' },
  ];
  return { distance, ...dirs[normalized] };
}

export function sanitizeSoloConfig(
  playerCountInput: number = 7,
  partialSettings?: Partial<RoomSettings>,
): { playerCount: number; settings: RoomSettings } {
  const playerCount = Math.max(5, Math.min(8, Math.round(playerCountInput)));
  const merged: RoomSettings = { ...DEFAULT_ROOM_SETTINGS, ...partialSettings };
  const maxVondos = playerCount >= 6 ? 2 : 1;
  merged.vondoCount = Math.max(1, Math.min(maxVondos, Math.round(merged.vondoCount)));
  merged.killCooldownSec = Math.max(10, Math.min(35, Math.round(merged.killCooldownSec)));
  merged.tasksPerPlayer = Math.max(3, Math.min(10, Math.round(merged.tasksPerPlayer)));
  merged.meetingTimeSec = Math.max(25, Math.min(90, Math.round(merged.meetingTimeSec)));
  merged.emergencyMeetingsPerPlayer = Math.max(
    1,
    Math.min(3, Math.round(merged.emergencyMeetingsPerPlayer)),
  );
  return { playerCount, settings: merged };
}

export function getColorShadeHint(color: PlayerColorId): string {
  switch (color) {
    case 'lal':
    case 'holud':
    case 'komola':
    case 'sada':
      return 'Light / Warm suit pigment (Lal, Holud, Komola, or Sada)';
    default:
      return 'Dark / Cool suit pigment (Neel, Shobuj, Beguni, or Kalo)';
  }
}

export function inspectBodyClue(body: BodyMarker, nowMs: number = Date.now()): { title: string; detail: string } {
  const ageSec = Math.max(1, Math.round((nowMs - body.killedAt) / 1000));
  return {
    title: `Goyenda Clue: ${body.victimName}`,
    detail: `Fell ~${ageSec}s ago near ${body.killerZoneHint}. Trace found: ${body.killerColorHint}.`,
  };
}

export function findNearestKillTarget(killer: PlayerState, players: PlayerState[]): PlayerState | null {
  if (!killer.alive || killer.role !== 'vondo' || killer.inVent) return null;
  let best: PlayerState | null = null;
  let bestDist = KILL_RANGE;
  for (const p of players) {
    if (!p.alive || p.id === killer.id || p.role === 'vondo' || p.inVent) continue;
    const d = distance2D(killer.x, killer.z, p.x, p.z);
    if (d <= bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function findNearestShieldTarget(kobiraj: PlayerState, players: PlayerState[]): PlayerState | null {
  if (!kobiraj.alive || kobiraj.specialRole !== 'kobiraj') return null;
  let best: PlayerState | null = null;
  let bestDist = KOBIRAJ_SHIELD_RANGE;
  for (const p of players) {
    if (!p.alive || p.id === kobiraj.id || p.inVent || p.shielded) continue;
    const d = distance2D(kobiraj.x, kobiraj.z, p.x, p.z);
    if (d <= bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function findNearestReportableBody(player: PlayerState, bodies: BodyMarker[]): BodyMarker | null {
  if (!player.alive || player.inVent) return null;
  let best: BodyMarker | null = null;
  let bestDist = REPORT_RANGE;
  for (const b of bodies) {
    if (b.reported) continue;
    const d = distance2D(player.x, player.z, b.x, b.z);
    if (d <= bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

export function findNearestInspectableBody(goyenda: PlayerState, bodies: BodyMarker[]): BodyMarker | null {
  if (!goyenda.alive || goyenda.specialRole !== 'goyenda' || goyenda.inVent) return null;
  let best: BodyMarker | null = null;
  let bestDist = GOYENDA_INSPECT_RANGE;
  for (const b of bodies) {
    if (b.reported) continue;
    const d = distance2D(goyenda.x, goyenda.z, b.x, b.z);
    if (d <= bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

export function findNearestDarogaTarget(daroga: PlayerState, players: PlayerState[]): PlayerState | null {
  if (!daroga.alive || daroga.specialRole !== 'daroga' || daroga.inVent) return null;
  let best: PlayerState | null = null;
  let bestDist = DAROGA_ARREST_RANGE;
  for (const p of players) {
    if (!p.alive || p.id === daroga.id || p.inVent) continue;
    const d = distance2D(daroga.x, daroga.z, p.x, p.z);
    if (d <= bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function resolveDarogaShot(
  daroga: PlayerState,
  target: PlayerState,
): { allowed: boolean; hitVondo: boolean; backfired: boolean } {
  if (!daroga.alive || daroga.specialRole !== 'daroga' || daroga.inVent || daroga.abilityCooldown > 0.05) {
    return { allowed: false, hitVondo: false, backfired: false };
  }
  if (!target.alive || target.id === daroga.id || target.inVent) {
    return { allowed: false, hitVondo: false, backfired: false };
  }
  if (distance2D(daroga.x, daroga.z, target.x, target.z) > DAROGA_ARREST_RANGE) {
    return { allowed: false, hitVondo: false, backfired: false };
  }
  const hitVondo = target.role === 'vondo';
  return { allowed: true, hitVondo, backfired: !hitVondo };
}

export function findNearestCleanableBody(jharudar: PlayerState, bodies: BodyMarker[]): BodyMarker | null {
  if (!jharudar.alive || jharudar.specialRole !== 'jharudar' || jharudar.inVent) return null;
  let best: BodyMarker | null = null;
  let bestDist = JHARUDAR_CLEAN_RANGE;
  for (const b of bodies) {
    if (b.reported) continue;
    const d = distance2D(jharudar.x, jharudar.z, b.x, b.z);
    if (d <= bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

export function findNearestRevivableBody(daktar: PlayerState, bodies: BodyMarker[]): BodyMarker | null {
  if (!daktar.alive || daktar.specialRole !== 'daktar' || daktar.inVent || (daktar.revivesLeft ?? 0) <= 0) {
    return null;
  }
  let best: BodyMarker | null = null;
  let bestDist = DAKTAR_REVIVE_RANGE;
  for (const b of bodies) {
    if (b.reported) continue;
    const d = distance2D(daktar.x, daktar.z, b.x, b.z);
    if (d <= bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

export function getPlayerVoteWeight(player: Pick<PlayerState, 'specialRole'>): number {
  return player.specialRole === 'neta' ? 2 : 1;
}

export function tallyVotes(players: PlayerState[], confirmEjects = true): EjectionInfo {
  const alivePlayers = players.filter((p) => p.alive);
  const counts = new Map<string, number>();
  let skipCount = 0;

  for (const p of alivePlayers) {
    const weight = getPlayerVoteWeight(p);
    if (!p.hasVoted || !p.votedFor || p.votedFor === 'skip') {
      skipCount += weight;
    } else {
      counts.set(p.votedFor, (counts.get(p.votedFor) ?? 0) + weight);
    }
  }

  let topTarget: string | null = null;
  let topCount = 0;
  let isTie = false;

  for (const [targetId, count] of counts.entries()) {
    if (count > topCount) {
      topCount = count;
      topTarget = targetId;
      isTie = false;
    } else if (count === topCount) {
      isTie = true;
    }
  }

  const remainingVondosBefore = alivePlayers.filter((p) => p.role === 'vondo').length;

  if (topCount === 0 || skipCount >= topCount) {
    return {
      ejectedId: null,
      ejectedName: null,
      ejectedColor: null,
      wasVondo: false,
      wasSpecialRole: 'none',
      reason: 'skipped',
      remainingVondos: remainingVondosBefore,
      confirmEjects,
    };
  }

  if (isTie || !topTarget) {
    return {
      ejectedId: null,
      ejectedName: null,
      ejectedColor: null,
      wasVondo: false,
      wasSpecialRole: 'none',
      reason: 'tie',
      remainingVondos: remainingVondosBefore,
      confirmEjects,
    };
  }

  const victim = alivePlayers.find((p) => p.id === topTarget);
  if (!victim) {
    return {
      ejectedId: null,
      ejectedName: null,
      ejectedColor: null,
      wasVondo: false,
      wasSpecialRole: 'none',
      reason: 'tie',
      remainingVondos: remainingVondosBefore,
      confirmEjects,
    };
  }

  const wasVondo = victim.role === 'vondo';
  return {
    ejectedId: victim.id,
    ejectedName: victim.name,
    ejectedColor: victim.color,
    wasVondo,
    wasSpecialRole: victim.specialRole,
    reason: 'voted',
    remainingVondos: wasVondo ? Math.max(0, remainingVondosBefore - 1) : remainingVondosBefore,
    confirmEjects,
  };
}

export function evaluateMatchOutcome(
  players: PlayerState[],
  taskProgress: number,
  sabotageExpired: boolean = false,
  justEjectedPlayer?: PlayerState | null,
): MatchOutcome | null {
  if (justEjectedPlayer && justEjectedPlayer.specialRole === 'pagol') {
    return {
      winner: 'pagol',
      reason: 'jester_ejected',
      winnerPlayerId: justEjectedPlayer.id,
      winnerPlayerName: justEjectedPlayer.name,
    };
  }

  if (sabotageExpired) {
    return { winner: 'vondo', reason: 'sabotage_timeout' };
  }

  const aliveVondos = players.filter((p) => p.alive && p.role === 'vondo').length;
  const aliveParabasis = players.filter(
    (p) => p.alive && p.role === 'parabasi' && p.specialRole !== 'pagol',
  ).length;

  if (aliveVondos === 0 && players.some((p) => p.role === 'vondo')) {
    return { winner: 'parabasi', reason: 'vondos_ejected' };
  }

  if (
    taskProgress >= 1 &&
    players.some((p) => p.role === 'parabasi' && p.specialRole !== 'pagol')
  ) {
    return { winner: 'parabasi', reason: 'tasks_completed' };
  }

  if (aliveVondos > 0 && aliveVondos >= aliveParabasis) {
    return { winner: 'vondo', reason: 'vondos_outnumber' };
  }

  return null;
}
