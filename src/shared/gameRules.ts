import type {
  BodyMarker,
  DoorLockState,
  EjectionInfo,
  MatchOutcome,
  PlayerColorId,
  PlayerState,
  PlayerTaskState,
  RoomSettings,
  RoomSnapshot,
  SabotageSeverity,
  SabotageState,
  SabotageType,
  SpecialRole,
  VentNode,
} from './types';
import {
  distance2D,
  GAS_LEAK_VALVES,
  hasLineOfSight,
  SABOTAGE_TARGETS,
  TASK_STATIONS,
  VENTS,
} from './mapData';

export const KILL_RANGE = 2.95;
export const REPORT_RANGE = 4.2;
export const VENT_RANGE = 2.5;
export const INITIAL_KILL_COOLDOWN_SEC = 10;
export const VISUAL_TASK_VISIBLE_RANGE = 6.0;

export const SABOTAGE_INITIAL_LOCKOUT_SEC = 40;
export const SABOTAGE_COOLDOWN_SEC = 35;
export const NON_CRITICAL_SABOTAGE_DURATION_SEC = 90;
export const CRITICAL_SABOTAGE_DURATION_SEC = 45;
export const NON_CRITICAL_FIX_HOLD_SEC = 3.0;
export const GAS_VALVE_HOLD_SEC = 2.0;
export const SABOTAGE_FIX_RANGE = 3.2;
export const MISTRI_FIX_RANGE = 4.6;
export const DOOR_LOCK_DURATION_SEC = 10;
export const DOOR_LOCK_COOLDOWN_SEC = 18;

export const GOYENDA_INSPECT_RANGE = 4.6;
export const GOYENDA_SCANS_LIMIT = 2;
export const KOBIRAJ_SHIELD_RANGE = 3.8;
export const KOBIRAJ_COOLDOWN_SEC = 24;
export const MISTRI_VENT_COOLDOWN_SEC = 16;
export const MISTRI_VENT_AUDIBLE_RANGE = 8.0;
export const BOHURUPI_DISGUISE_DURATION_SEC = 14;
export const BOHURUPI_COOLDOWN_SEC = 26;
export const BOHURUPI_GLITCH_RANGE = 4.0;
export const DAROGA_ARREST_RANGE = 6.0;
export const DAROGA_COOLDOWN_SEC = 22;
export const DAKTAR_REVIVE_RANGE = 3.8;
export const DAKTAR_REVIVE_CHANNEL_SEC = 5.0;
export const JHARUDAR_CLEAN_RANGE = 3.6;
export const JHARUDAR_CLEAN_COOLDOWN_SEC = 20;
export const JHARUDAR_CLEAN_CHANNEL_SEC = 2.0;
export const JHARUDAR_CLEAN_USES = 3;

export const MIN_MATCH_PLAYERS = 5;
export const MAX_MATCH_PLAYERS = 8;
export const PLAYER_NAME_MAX_CHARS = 12;
export const LOBBY_CHAT_MAX_CHARS = 120;

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  vondoCount: 1,
  killCooldownSec: 18,
  meetingTimeSec: 30,
  discussionTimeSec: 15,
  moveSpeed: 8.6,
  tasksPerPlayer: 5,
  emergencyCooldownSec: 12,
  emergencyMeetingsPerPlayer: 2,
  confirmEjects: true,
  anonymousVotes: false,
  visualTasks: true,
  enableSpecialRoles: true,
  enableNeutralRoles: true,
  autoFillBots: false,
};

const BLOCKED_NAME_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'madarchod', 'bal', 'khanki', 'magi'];

export function isCriticalSabotage(type: SabotageType | null | undefined): boolean {
  return type === 'gas_leak';
}

export function getSabotageSeverity(type: SabotageType): SabotageSeverity {
  return SABOTAGE_TARGETS[type].severity;
}

export function createEmptySabotageState(cooldownRemaining = SABOTAGE_INITIAL_LOCKOUT_SEC): SabotageState {
  return {
    active: null,
    kind: null,
    timeRemaining: 0,
    fixStationX: 0,
    fixStationZ: 0,
    fixProgress: 0,
    fixerId: null,
    valves: GAS_LEAK_VALVES.map((v) => ({ ...v, holderId: null })),
    cooldownRemaining,
  };
}

export function createSabotageState(
  type: SabotageType,
  cooldownRemaining = SABOTAGE_COOLDOWN_SEC,
): SabotageState {
  const meta = SABOTAGE_TARGETS[type];
  return {
    active: type,
    kind: meta.severity,
    timeRemaining: meta.durationSec,
    fixStationX: meta.x,
    fixStationZ: meta.z,
    fixProgress: 0,
    fixerId: null,
    valves: GAS_LEAK_VALVES.map((v) => ({ ...v, holderId: null })),
    cooldownRemaining,
  };
}

export function makeEmptyDoorLocks(): DoorLockState {
  return {
    cha_dokan: 0,
    rickshaw_garage: 0,
    desco_power: 0,
    dish_roof: 0,
    cooldownRemaining: 0,
  };
}

export function findNearestGasValve(
  x: number,
  z: number,
  sabotage: SabotageState,
  range: number = SABOTAGE_FIX_RANGE,
) {
  if (sabotage.active !== 'gas_leak') return null;
  for (const v of sabotage.valves) {
    if (distance2D(x, z, v.x, v.z) <= range) {
      return v;
    }
  }
  return null;
}

/**
 * Advances sabotage timers, hold-to-fix progress, and dual-valve gas_leak logic.
 * Returns `{ fixed, expiredCritical, expiredNonCriticalType }`.
 */
export function advanceSabotageState(
  sabotage: SabotageState,
  players: PlayerState[],
  dt: number,
  holdingFixByPlayerId: Map<string, { valveId?: 'valve_cha' | 'valve_rickshaw' }>,
): {
  fixed: boolean;
  expiredCritical: boolean;
  expiredNonCriticalType: SabotageType | null;
} {
  if (!sabotage.active) {
    if (sabotage.cooldownRemaining > 0) {
      sabotage.cooldownRemaining = Math.max(0, sabotage.cooldownRemaining - dt);
    }
    return { fixed: false, expiredCritical: false, expiredNonCriticalType: null };
  }

  // Tick remaining duration
  sabotage.timeRemaining -= dt;

  if (sabotage.active === 'gas_leak') {
    const aliveMap = new Map(players.filter((p) => p.alive && !p.inVent).map((p) => [p.id, p]));
    for (const valve of sabotage.valves) {
      let holderFound: string | null = null;
      for (const [pid, hold] of holdingFixByPlayerId.entries()) {
        const pl = aliveMap.get(pid);
        if (!pl) continue;
        const maxR = pl.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
        if (
          (!hold.valveId || hold.valveId === valve.id) &&
          distance2D(pl.x, pl.z, valve.x, valve.z) <= maxR
        ) {
          holderFound = pid;
          break;
        }
      }
      valve.holderId = holderFound;
    }

    const v0 = sabotage.valves[0];
    const v1 = sabotage.valves[1];
    const bothHeldByDifferentPlayers =
      Boolean(v0?.holderId) && Boolean(v1?.holderId) && v0.holderId !== v1.holderId;

    if (bothHeldByDifferentPlayers) {
      sabotage.fixProgress = Math.min(1, sabotage.fixProgress + dt / GAS_VALVE_HOLD_SEC);
      if (sabotage.fixProgress >= 1) {
        const cleared = createEmptySabotageState(SABOTAGE_COOLDOWN_SEC);
        Object.assign(sabotage, cleared);
        return { fixed: true, expiredCritical: false, expiredNonCriticalType: null };
      }
    } else {
      sabotage.fixProgress = Math.max(0, sabotage.fixProgress - dt * 0.6);
    }
  } else {
    // Non-critical loadshedding or wifi_down: 1 alive player holds E for 3s
    let activeFixer: PlayerState | null = null;
    for (const [pid] of holdingFixByPlayerId.entries()) {
      const pl = players.find((p) => p.id === pid && p.alive && !p.inVent);
      if (!pl) continue;
      const maxR = pl.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
      if (distance2D(pl.x, pl.z, sabotage.fixStationX, sabotage.fixStationZ) <= maxR) {
        activeFixer = pl;
        break;
      }
    }
    sabotage.fixerId = activeFixer?.id ?? null;
    if (activeFixer) {
      sabotage.fixProgress = Math.min(1, sabotage.fixProgress + dt / NON_CRITICAL_FIX_HOLD_SEC);
      if (sabotage.fixProgress >= 1) {
        const cleared = createEmptySabotageState(SABOTAGE_COOLDOWN_SEC);
        Object.assign(sabotage, cleared);
        return { fixed: true, expiredCritical: false, expiredNonCriticalType: null };
      }
    } else {
      sabotage.fixProgress = Math.max(0, sabotage.fixProgress - dt * 0.5);
    }
  }

  if (sabotage.timeRemaining <= 0) {
    const expiredType = sabotage.active;
    if (isCriticalSabotage(expiredType)) {
      sabotage.timeRemaining = 0;
      return { fixed: false, expiredCritical: true, expiredNonCriticalType: null };
    }
    const cleared = createEmptySabotageState(SABOTAGE_COOLDOWN_SEC);
    Object.assign(sabotage, cleared);
    return { fixed: false, expiredCritical: false, expiredNonCriticalType: expiredType };
  }

  return { fixed: false, expiredCritical: false, expiredNonCriticalType: null };
}

export function makeDefaultPlayerState(
  overrides: Partial<PlayerState> & Pick<PlayerState, 'id' | 'name' | 'color'>,
): PlayerState {
  return {
    x: 0,
    z: 3.8,
    vx: 0,
    vz: 0,
    yaw: 0,
    role: 'parabasi',
    specialRole: 'none',
    alive: true,
    inVent: false,
    watchingCams: false,
    visualTaskTimer: 0,
    abilityCooldown: 0,
    shielded: false,
    disguiseColor: null,
    disguiseName: null,
    disguiseTimer: 0,
    isBot: false,
    isHost: false,
    ready: false,
    pingMs: 18,
    tasks: [],
    killCooldownRemaining: 0,
    emergencyMeetingsLeft: DEFAULT_ROOM_SETTINGS.emergencyMeetingsPerPlayer,
    scansLeft: overrides.specialRole === 'goyenda' ? GOYENDA_SCANS_LIMIT : 0,
    shotsLeft: overrides.specialRole === 'daroga' ? 1 : 0,
    cleansLeft: overrides.specialRole === 'jharudar' ? JHARUDAR_CLEAN_USES : 0,
    revivesLeft: overrides.specialRole === 'daktar' ? 1 : 0,
    pranksLeft: 1,
    jharuTargetBodyId: null,
    jharuTimer: 0,
    votedFor: null,
    hasVoted: false,
    ...overrides,
  };
}

function shuffleWithRng<T>(arr: readonly T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export interface MatchTaskPlan {
  commonTaskIds: string[];
  shortPoolIds: string[];
  longPoolIds: string[];
}

export function createMatchTaskPlan(
  tasksPerPlayer: number = DEFAULT_ROOM_SETTINGS.tasksPerPlayer,
  rng: () => number = Math.random,
): MatchTaskPlan {
  const clamped = Math.max(3, Math.min(10, Math.round(tasksPerPlayer)));
  const commonWanted = clamped >= 4 ? 2 : 1;
  const commons = shuffleWithRng(
    TASK_STATIONS.filter((s) => s.category === 'common').map((s) => s.id),
    rng,
  ).slice(0, commonWanted);
  const shortPoolIds = shuffleWithRng(
    TASK_STATIONS.filter((s) => s.category === 'short').map((s) => s.id),
    rng,
  );
  const longPoolIds = shuffleWithRng(
    TASK_STATIONS.filter((s) => s.category === 'long').map((s) => s.id),
    rng,
  );
  return {
    commonTaskIds: commons,
    shortPoolIds,
    longPoolIds,
  };
}

export function createPlayerTasks(
  count: number = DEFAULT_ROOM_SETTINGS.tasksPerPlayer,
  rng: () => number = Math.random,
  plan?: MatchTaskPlan,
  isFake = false,
): PlayerTaskState[] {
  const clamped = Math.max(3, Math.min(10, Math.round(count)));
  const resolvedPlan = plan ?? createMatchTaskPlan(clamped, rng);
  const picked = new Set<string>(resolvedPlan.commonTaskIds);

  const remainingSlots = Math.max(0, clamped - picked.size);
  const longWanted = Math.min(
    resolvedPlan.longPoolIds.length,
    clamped >= 7 ? 2 : clamped >= 4 ? 1 : 0,
    remainingSlots,
  );
  const shortWanted = Math.max(0, remainingSlots - longWanted);

  const shorts = shuffleWithRng(resolvedPlan.shortPoolIds, rng);
  const longs = shuffleWithRng(resolvedPlan.longPoolIds, rng);

  for (const sid of shorts) {
    if (picked.size >= resolvedPlan.commonTaskIds.length + shortWanted) break;
    picked.add(sid);
  }
  for (const lid of longs) {
    if (picked.size >= clamped) break;
    picked.add(lid);
  }
  // Fallback fill from all stations if tasksPerPlayer is high (e.g., 9-10)
  if (picked.size < clamped) {
    const extras = shuffleWithRng(
      TASK_STATIONS.map((s) => s.id),
      rng,
    );
    for (const id of extras) {
      if (picked.size >= clamped) break;
      picked.add(id);
    }
  }

  return Array.from(picked).map((taskId) => ({
    taskId,
    completed: false,
    ...(isFake ? { isFake: true } : {}),
  }));
}

export function assignMatchTasks(
  players: PlayerState[],
  tasksPerPlayer: number = DEFAULT_ROOM_SETTINGS.tasksPerPlayer,
  rng: () => number = Math.random,
): void {
  const plan = createMatchTaskPlan(tasksPerPlayer, rng);
  for (const p of players) {
    if (p.specialRole === 'pagol') {
      p.tasks = [];
    } else if (p.role === 'vondo') {
      p.tasks = createPlayerTasks(tasksPerPlayer, rng, plan, true);
    } else {
      p.tasks = createPlayerTasks(tasksPerPlayer, rng, plan, false);
    }
  }
}

export function isTaskLockedBySabotage(taskId: string, sabotage: SabotageState): boolean {
  if (sabotage.active !== 'wifi_down') return false;
  const station = TASK_STATIONS.find((s) => s.id === taskId);
  return station?.medium === 'digital';
}

export function assignRoles<T extends Pick<PlayerState, 'id' | 'role'>>(
  players: T[],
  requestedVondoCount: number,
  rng: () => number = Math.random,
): T[] {
  if (players.length === 0) return players;
  const maxAllowed = players.length >= 6 ? Math.min(2, Math.floor((players.length - 1) / 2)) : 1;
  const targetVondos = Math.max(1, Math.min(requestedVondoCount, maxAllowed));
  const indices = shuffleWithRng(
    players.map((_, idx) => idx),
    rng,
  );
  const vondoSet = new Set(indices.slice(0, targetVondos));
  return players.map((p, idx) => ({
    ...p,
    role: vondoSet.has(idx) ? 'vondo' : 'parabasi',
  }));
}

export interface RolePoolPreview {
  batparCount: number;
  specialBatparRange: string;
  specialCrewRange: string;
  neutralLabel: string;
  plainCrewMin: number;
  summary: string;
}

export function getRolePoolPreview(playerCount: number, settings: RoomSettings): RolePoolPreview {
  const clamped = Math.max(MIN_MATCH_PLAYERS, Math.min(MAX_MATCH_PLAYERS, playerCount));
  const maxVondo = clamped >= 6 ? 2 : 1;
  const batparCount = Math.max(1, Math.min(maxVondo, settings.vondoCount));

  if (!settings.enableSpecialRoles) {
    return {
      batparCount,
      specialBatparRange: '0',
      specialCrewRange: '0',
      neutralLabel: 'OFF',
      plainCrewMin: clamped - batparCount,
      summary: `${batparCount} Batpar · ${clamped - batparCount} Plain Parabasi (Special Roles OFF)`,
    };
  }

  let specialCrewRange = '1';
  let neutralLabel = '0';
  let plainCrewMin = 3;
  const specialBatparRange = clamped <= 7 ? '0–1' : batparCount > 1 ? '1–2' : '1';

  if (clamped === 5) {
    specialCrewRange = '1';
    neutralLabel = '0';
    plainCrewMin = 3;
  } else if (clamped === 6) {
    specialCrewRange = '2';
    neutralLabel = settings.enableNeutralRoles ? '0–1 (60%)' : '0';
    plainCrewMin = settings.enableNeutralRoles ? 2 : 3;
  } else if (clamped === 7) {
    specialCrewRange = settings.enableNeutralRoles ? '2–3' : '3';
    neutralLabel = settings.enableNeutralRoles ? '0–1 (60%)' : '0';
    plainCrewMin = 2;
  } else {
    specialCrewRange = settings.enableNeutralRoles ? '2–3' : '3';
    neutralLabel = settings.enableNeutralRoles ? '0–1 (60%)' : '0';
    plainCrewMin = 2;
  }

  return {
    batparCount,
    specialBatparRange,
    specialCrewRange,
    neutralLabel,
    plainCrewMin,
    summary: `${batparCount} Batpar (Special ${specialBatparRange}) · ${specialCrewRange} Special Crew · Neutral ${neutralLabel} · ${plainCrewMin}+ Plain Parabasi`,
  };
}

/**
 * Balanced distribution per Section 4.6:
 * 5P: 1 Batpar, 1 special crew, 0 neutral, 3 plain Parabasi
 * 6P: 1 Batpar, 2 special crew, 0-1 neutral (60%), 2-3 plain Parabasi
 * 7P: 1 Batpar, 2-3 special crew, 0-1 neutral (60%), 2+ plain Parabasi
 * 8P: 2 Batpar, 2-3 special crew, 0-1 neutral (60%), 2+ plain Parabasi
 */
export function assignSpecialRoles<T extends Pick<PlayerState, 'id' | 'role' | 'specialRole'>>(
  players: T[],
  enabled: boolean,
  forcedLocalSpecial?: SpecialRole,
  localPlayerId?: string,
  rng: () => number = Math.random,
  enableNeutralRoles: boolean = true,
): T[] {
  const out = players.map((p) => ({ ...p, specialRole: 'none' as SpecialRole }));
  if (!enabled || out.length === 0) return out;

  const takenSpecials = new Set<SpecialRole>();
  if (forcedLocalSpecial && forcedLocalSpecial !== 'none' && localPlayerId) {
    const localIdx = out.findIndex((p) => p.id === localPlayerId);
    if (localIdx >= 0) {
      out[localIdx].specialRole = forcedLocalSpecial;
      takenSpecials.add(forcedLocalSpecial);
    }
  }

  // Batpar specials: max 1 special Batpar when total players <= 7
  const vondoCandidates = shuffleWithRng(
    out.filter((p) => p.role === 'vondo' && p.specialRole === 'none'),
    rng,
  );
  const alreadyVondoSpecial = out.filter((p) => p.role === 'vondo' && p.specialRole !== 'none').length;
  const maxVondoSpecials = out.length <= 7 ? 1 : 2;
  const remainingVondoSpecialSlots = Math.max(0, maxVondoSpecials - alreadyVondoSpecial);
  const desiredVondoRoles = shuffleWithRng(['bohurupi', 'jharudar'] as SpecialRole[], rng);
  let assignedVondoSpecials = 0;
  for (const vr of desiredVondoRoles) {
    if (assignedVondoSpecials >= remainingVondoSpecialSlots) break;
    if (takenSpecials.has(vr)) continue;
    const nextV = vondoCandidates.shift();
    if (!nextV) break;
    nextV.specialRole = vr;
    takenSpecials.add(vr);
    assignedVondoSpecials++;
  }

  // Non-Batpar distribution
  const totalNonVondo = out.filter((p) => p.role === 'parabasi').length;
  const minPlainCrew = out.length <= 5 ? 3 : Math.max(2, Math.ceil(totalNonVondo * 0.4));

  const alreadyNeutral = out.some((p) => p.specialRole === 'pagol');
  const alreadyCrewSpecial = out.filter(
    (p) => p.role === 'parabasi' && p.specialRole !== 'none' && p.specialRole !== 'pagol',
  ).length;

  let neutralCount = alreadyNeutral ? 1 : 0;
  if (!alreadyNeutral && enableNeutralRoles && out.length >= 6) {
    // 60% chance of 1 Pagol when neutral roles are enabled and >= 6 players
    if (rng() < 0.6) {
      neutralCount = 1;
    }
  }

  let targetCrewSpecials = 1;
  if (out.length === 6) targetCrewSpecials = 2;
  else if (out.length >= 7) targetCrewSpecials = neutralCount > 0 ? 2 : 3;

  // Guarantee plain Parabasi minimum never gets violated
  const maxAllowedNonPlain = Math.max(0, totalNonVondo - minPlainCrew);
  if (targetCrewSpecials + neutralCount > maxAllowedNonPlain) {
    targetCrewSpecials = Math.max(0, maxAllowedNonPlain - neutralCount);
  }

  const nonVondoPool = shuffleWithRng(
    out.filter((p) => p.role === 'parabasi' && p.specialRole === 'none'),
    rng,
  );

  if (neutralCount > 0 && !alreadyNeutral) {
    const p = nonVondoPool.shift();
    if (p) {
      p.specialRole = 'pagol';
      takenSpecials.add('pagol');
    }
  }

  const crewSpecialPool = shuffleWithRng(
    ['goyenda', 'kobiraj', 'mistri', 'daroga', 'neta', 'daktar'] as SpecialRole[],
    rng,
  );
  const neededCrewSpecials = Math.max(0, targetCrewSpecials - alreadyCrewSpecial);
  let assignedCrew = 0;
  for (const r of crewSpecialPool) {
    if (assignedCrew >= neededCrewSpecials) break;
    if (takenSpecials.has(r)) continue;
    const nextPlayer = nonVondoPool.shift();
    if (!nextPlayer) break;
    nextPlayer.specialRole = r;
    takenSpecials.add(r);
    assignedCrew++;
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
    // Crew (including dead ghost crew!) contribute to the shared task bar; exclude Batpar and Neutrals
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
    return { allowed: false, reason: 'Only an alive Batpar can eliminate.' };
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
  const playerCount = Math.max(MIN_MATCH_PLAYERS, Math.min(MAX_MATCH_PLAYERS, Math.round(playerCountInput)));
  const merged: RoomSettings = { ...DEFAULT_ROOM_SETTINGS, ...partialSettings };
  const maxVondos = playerCount >= 6 ? 2 : 1;
  merged.vondoCount = Math.max(1, Math.min(maxVondos, Math.round(merged.vondoCount)));
  merged.killCooldownSec = Math.max(10, Math.min(35, Math.round(merged.killCooldownSec)));
  merged.tasksPerPlayer = Math.max(3, Math.min(10, Math.round(merged.tasksPerPlayer)));
  merged.meetingTimeSec = Math.max(15, Math.min(90, Math.round(merged.meetingTimeSec)));
  merged.discussionTimeSec = Math.max(5, Math.min(45, Math.round(merged.discussionTimeSec)));
  merged.moveSpeed = Math.max(6, Math.min(12, Number(merged.moveSpeed) || DEFAULT_ROOM_SETTINGS.moveSpeed));
  merged.emergencyCooldownSec = Math.max(5, Math.min(30, Math.round(merged.emergencyCooldownSec)));
  merged.emergencyMeetingsPerPlayer = Math.max(
    1,
    Math.min(3, Math.round(merged.emergencyMeetingsPerPlayer)),
  );
  return { playerCount, settings: merged };
}

export function sanitizePlayerName(raw: string, existingNames: string[] = []): string {
  let clean = raw.replace(/[^\p{L}\p{N}\s._-]/gu, '').trim().replace(/\s+/g, ' ');
  for (const bad of BLOCKED_NAME_WORDS) {
    const re = new RegExp(bad, 'gi');
    clean = clean.replace(re, 'Mama');
  }
  clean = clean.slice(0, PLAYER_NAME_MAX_CHARS).trim();
  if (!clean) clean = 'Para Hero';

  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  if (!taken.has(clean.toLowerCase())) return clean;

  for (let suffix = 2; suffix < 99; suffix++) {
    const sfx = `${suffix}`;
    const candidate = `${clean.slice(0, PLAYER_NAME_MAX_CHARS - sfx.length).trim()}${sfx}`;
    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return clean.slice(0, PLAYER_NAME_MAX_CHARS);
}

export function canStartLobbyMatch(
  players: Pick<PlayerState, 'id' | 'name' | 'isBot' | 'isHost' | 'ready'>[],
): { ok: boolean; reason?: string } {
  if (players.length < MIN_MATCH_PLAYERS) {
    const missing = MIN_MATCH_PLAYERS - players.length;
    return { ok: false, reason: `Aro ${missing} jon lagbe (min ${MIN_MATCH_PLAYERS})` };
  }
  const unready = players.find((p) => !p.isBot && !p.isHost && !p.ready);
  if (unready) {
    return { ok: false, reason: `${unready.name} ready na` };
  }
  return { ok: true };
}

/**
 * Strips private enemy/other-player role & task metadata before sending a snapshot to a specific player.
 * During lobby or gameover everyone sees real public data; during active gameplay only the local player
 * and fellow Batpars (for Batpar viewers) see secret roles.
 */
export function redactSnapshotForPlayer(snapshot: RoomSnapshot, viewerPlayerId: string): RoomSnapshot {
  if (snapshot.phase === 'lobby' || snapshot.phase === 'gameover') {
    return snapshot;
  }
  const viewer = snapshot.players.find((p) => p.id === viewerPlayerId);
  const viewerIsVondo = viewer?.role === 'vondo';

  return {
    ...snapshot,
    players: snapshot.players.map((p) => {
      if (p.id === viewerPlayerId) {
        return { ...p, tasks: p.tasks.map((t) => ({ ...t })) };
      }
      const revealVondoPartner = viewerIsVondo && p.role === 'vondo';
      const revealNetaInShalish = snapshot.netaRevealedId === p.id;
      return {
        ...p,
        role: revealVondoPartner ? p.role : 'parabasi',
        specialRole: revealVondoPartner || revealNetaInShalish ? p.specialRole : 'none',
        tasks: [],
      };
    }),
  };
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

export function findNearestReportableBody(
  player: PlayerState,
  bodies: BodyMarker[],
  doorLocks?: DoorLockState,
): BodyMarker | null {
  if (!player.alive || player.inVent) return null;
  let best: BodyMarker | null = null;
  let bestDist = REPORT_RANGE;
  for (const b of bodies) {
    if (b.reported) continue;
    const d = distance2D(player.x, player.z, b.x, b.z);
    if (d <= bestDist && hasLineOfSight(player.x, player.z, b.x, b.z, undefined, doorLocks)) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

export function findNearestInspectableBody(goyenda: PlayerState, bodies: BodyMarker[]): BodyMarker | null {
  if (!goyenda.alive || goyenda.specialRole !== 'goyenda' || goyenda.inVent) return null;
  if ((goyenda.scansLeft ?? GOYENDA_SCANS_LIMIT) <= 0) return null;
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
  if ((daroga.shotsLeft ?? 1) <= 0) return null;
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
  if (
    !daroga.alive ||
    daroga.specialRole !== 'daroga' ||
    daroga.inVent ||
    daroga.abilityCooldown > 0.05 ||
    (daroga.shotsLeft ?? 1) <= 0
  ) {
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
  if ((jharudar.cleansLeft ?? JHARUDAR_CLEAN_USES) <= 0) return null;
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

/**
 * Single source of truth for win conditions.
 * Priority in the same tick:
 * 1. Pagol ejected -> Pagol wins
 * 2. All Batpar ejected/dead OR 100% tasks done -> Parabasi wins
 * 3. Critical sabotage (gas_leak) timer reaches 0 -> Batpar wins
 * 4. Alive Batpar >= alive NON-Batpar (counts ALL alive non-Batpar incl. neutrals) -> Batpar wins
 */
export function evaluateMatchOutcome(
  players: PlayerState[],
  taskProgress: number,
  criticalSabotageExpired: boolean = false,
  justEjectedPlayer?: PlayerState | null,
): MatchOutcome | null {
  if (justEjectedPlayer && justEjectedPlayer.specialRole === 'pagol') {
    return {
      winner: 'pagol',
      reason: 'pagol_ejected',
      winnerPlayerId: justEjectedPlayer.id,
      winnerPlayerName: justEjectedPlayer.name,
    };
  }

  const aliveVondos = players.filter((p) => p.alive && p.role === 'vondo').length;
  // Count ALL alive non-Batpar players (including neutrals such as Pagol)
  const aliveNonVondos = players.filter((p) => p.alive && p.role !== 'vondo').length;

  if (aliveVondos === 0 && players.some((p) => p.role === 'vondo')) {
    return { winner: 'parabasi', reason: 'batpars_out' };
  }

  if (
    taskProgress >= 1 &&
    players.some((p) => p.role === 'parabasi' && p.specialRole !== 'pagol')
  ) {
    return { winner: 'parabasi', reason: 'tasks_completed' };
  }

  if (criticalSabotageExpired) {
    return { winner: 'vondo', reason: 'critical_sabotage_timeout' };
  }

  if (aliveVondos > 0 && aliveVondos >= aliveNonVondos) {
    return { winner: 'vondo', reason: 'batpars_outnumber' };
  }

  return null;
}
