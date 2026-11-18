import {
  PLAYER_COLORS,
  type BodyMarker,
  type ChatMessage,
  type ClientMessage,
  type DoorLockState,
  type FootprintDot,
  type PlayerColorId,
  type PlayerState,
  type RoomSettings,
  type RoomSnapshot,
  type ServerMessage,
} from '../shared/types';
import {
  BOT_WAYPOINTS,
  EMERGENCY_BELL_POS,
  PLAYER_RADIUS,
  SABOTAGE_TARGETS,
  SPAWN_RING,
  TASK_STATIONS,
  VENTS,
  WALLS,
  distance2D,
  getZoneNameAt,
  resolveCircleWallCollision,
} from '../shared/mapData';
import {
  BOHURUPI_COOLDOWN_SEC,
  BOHURUPI_DISGUISE_DURATION_SEC,
  DAROGA_COOLDOWN_SEC,
  DEFAULT_ROOM_SETTINGS,
  DOOR_LOCK_COOLDOWN_SEC,
  DOOR_LOCK_DURATION_SEC,
  JHARUDAR_CLEAN_COOLDOWN_SEC,
  KOBIRAJ_COOLDOWN_SEC,
  MISTRI_FIX_RANGE,
  MISTRI_VENT_COOLDOWN_SEC,
  SABOTAGE_COOLDOWN_SEC,
  SABOTAGE_DURATION_SEC,
  SABOTAGE_FIX_RANGE,
  VENT_RANGE,
  assignRoles,
  assignSpecialRoles,
  canExecuteKill,
  canUseVent,
  computeTaskProgress,
  createPlayerTasks,
  evaluateMatchOutcome,
  findNearestCleanableBody,
  findNearestDarogaTarget,
  findNearestInspectableBody,
  findNearestKillTarget,
  findNearestReportableBody,
  findNearestRevivableBody,
  findNearestShieldTarget,
  getColorShadeHint,
  inspectBodyClue,
  resolveDarogaShot,
  resolveVentHopTarget,
  tallyVotes,
} from '../shared/gameRules';

const MAX_PLAYERS = 8;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const BOT_NAMES = [
  'Chacha Miah',
  'Babu Bhai',
  'Pintu Da',
  'Tuktuki Apa',
  'Raju Rickshaw',
  'Kallu Ustad',
  'Mitu Moni',
];

const BOT_BANTER = [
  'Bhai ami Cha-er dokan e dudh-cha chini chara khachilam!',
  'Onek sus lagche kintu, aajke ke Batpar bolen?',
  'Current gelo ar amar matha ghuray gelo re!',
  'Ami DESCO te chora line check kortesilam, trust me!',
  'Rickshaw garage er pashe ke jeno gap e douraisilo!',
  'Keu baje kotha bolben na, ami ekdom bhalo Para-basi!',
  'Ami Fuchka Chottor e jhal fuchka khaitasilam kasam!',
  'Hero Saloon e Hero-cut dite gesilam bhai!',
  'Para Cricket Math e tape ball kheltesilam, keu sus bolben na!',
];

const PAGOL_BANTER = [
  'Hehe ami toh kichui kori nai, amake Pukur e chubani diyen na pls!',
  'Ami shudhu pukur ghat e boshe chilam bhai, kothao jai nai!',
  'Amake size korle kintu boro bhul korben bhaiya!',
];

export function generateP2PRoomCode(length = 5): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function buildPeerIdForRoomCode(code: string): string {
  return `kebatpar-v1-${normalizeRoomCode(code)}`;
}

interface BotMemory {
  targetWaypointIdx: number;
  pauseTimer: number;
  voteTimer: number;
  hasChatted: boolean;
}

export interface P2PHostTransport {
  sendToClient: (clientId: string, msg: ServerMessage) => void;
  broadcast: (msg: ServerMessage) => void;
}

function makeEmptyDoorLocks(): DoorLockState {
  return {
    cha_dokan: 0,
    rickshaw_garage: 0,
    desco_power: 0,
    dish_roof: 0,
    cooldownRemaining: 0,
  };
}

/**
 * Host-authoritative multiplayer room engine for zero-backend Room Code play
 * (used automatically on static hosting like Cloudflare Pages when no `/ws` server exists).
 */
export class P2PHostRoomEngine {
  public readonly roomCode: string;
  private phase: RoomSnapshot['phase'] = 'lobby';
  private players = new Map<string, PlayerState>();
  private clientToPlayer = new Map<string, string>();
  private playerToClient = new Map<string, string>();
  private botMemories = new Map<string, BotMemory>();
  private footprintAccum = new Map<string, number>();
  private bodies: BodyMarker[] = [];
  private footprints: FootprintDot[] = [];
  private sabotage: RoomSnapshot['sabotage'] = {
    active: null,
    timeRemaining: 0,
    fixStationX: 0,
    fixStationZ: 0,
    cooldownRemaining: 0,
  };
  private doorLocks: DoorLockState = makeEmptyDoorLocks();
  private chat: ChatMessage[] = [];
  private meetingCallerId: string | null = null;
  private meetingReason: 'body' | 'emergency' | null = null;
  private meetingTimer = 0;
  private phaseTimer = 0;
  private emergencyCooldownRemaining = 0;
  private ejection: RoomSnapshot['ejection'] = null;
  private justEjectedPlayer: PlayerState | null = null;
  private outcome: RoomSnapshot['outcome'] = null;
  private settings: RoomSettings = { ...DEFAULT_ROOM_SETTINGS };
  private transport: P2PHostTransport;

  constructor(roomCode: string, transport: P2PHostTransport) {
    this.roomCode = normalizeRoomCode(roomCode) || generateP2PRoomCode();
    this.transport = transport;
  }

  public getSnapshot(): RoomSnapshot {
    const players = Array.from(this.players.values());
    const taskStats = computeTaskProgress(players);
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      players: players.map((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t })) })),
      bodies: this.bodies.map((b) => ({ ...b })),
      footprints: this.footprints.map((f) => ({ ...f })),
      sabotage: { ...this.sabotage },
      doorLocks: { ...this.doorLocks },
      chat: this.chat.slice(-40),
      meetingCallerId: this.meetingCallerId,
      meetingReason: this.meetingReason,
      meetingTimer: Math.max(0, Math.ceil(this.meetingTimer)),
      emergencyCooldownRemaining: Math.max(0, Math.ceil(this.emergencyCooldownRemaining)),
      ejection: this.ejection,
      outcome: this.outcome,
      settings: { ...this.settings },
      taskProgress: taskStats.progress,
      totalTasks: taskStats.totalTasks,
      completedTasks: taskStats.completedTasks,
    };
  }

  private pickAvailableColor(preferred?: PlayerColorId): PlayerColorId {
    const used = new Set(Array.from(this.players.values()).map((p) => p.color));
    if (preferred && !used.has(preferred)) return preferred;
    for (const spec of PLAYER_COLORS) {
      if (!used.has(spec.id)) return spec.id;
    }
    return PLAYER_COLORS[this.players.size % PLAYER_COLORS.length].id;
  }

  private broadcastState(msg?: ServerMessage): void {
    this.transport.broadcast(msg ?? { type: 'room:state', snapshot: this.getSnapshot() });
  }

  private sendToPlayer(playerId: string, msg: ServerMessage): void {
    const cid = this.playerToClient.get(playerId);
    if (cid) {
      this.transport.sendToClient(cid, msg);
    }
  }

  private pushSystemChat(text: string): void {
    this.chat.push({
      id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: 'system',
      senderName: 'Moholla Announcement',
      senderColor: 'holud',
      text,
      timestamp: Date.now(),
      system: true,
    });
  }

  private recordFootprint(p: PlayerState, distMoved: number): void {
    if (!p.alive || p.inVent || distMoved < 0.05) return;
    const prev = (this.footprintAccum.get(p.id) ?? 0) + distMoved;
    if (prev >= 2.2) {
      this.footprintAccum.set(p.id, 0);
      this.footprints.push({
        id: `fp_${Date.now()}_${p.id}_${Math.random().toString(36).slice(2, 5)}`,
        x: p.x,
        z: p.z,
        color: p.disguiseColor ?? p.color,
        expiresAt: Date.now() + 7500,
      });
      if (this.footprints.length > 36) {
        this.footprints.shift();
      }
    } else {
      this.footprintAccum.set(p.id, prev);
    }
  }

  public addClient(clientId: string, name: string, color: PlayerColorId, isHost = false): boolean {
    if (!isHost) {
      if (this.phase !== 'lobby') {
        this.transport.sendToClient(clientId, {
          type: 'room:error',
          message: 'Match already in progress in this room.',
        });
        return false;
      }
      if (this.players.size >= MAX_PLAYERS) {
        this.transport.sendToClient(clientId, {
          type: 'room:error',
          message: 'Room is full (max 8 players).',
        });
        return false;
      }
    }

    const playerId = isHost
      ? 'pl_host'
      : `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const sp = SPAWN_RING[this.players.size % SPAWN_RING.length];
    const cleanName = name.trim().slice(0, 16) || 'Babu Bhai';
    const pickedColor = this.pickAvailableColor(color);

    const player: PlayerState = {
      id: playerId,
      name: cleanName,
      color: pickedColor,
      x: sp.x,
      z: sp.z,
      vx: 0,
      vz: 0,
      yaw: sp.yaw,
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
      isHost,
      tasks: [],
      killCooldownRemaining: 0,
      emergencyMeetingsLeft: this.settings.emergencyMeetingsPerPlayer,
      revivesLeft: 0,
      votedFor: null,
      hasVoted: false,
    };

    this.players.set(playerId, player);
    this.clientToPlayer.set(clientId, playerId);
    this.playerToClient.set(playerId, clientId);

    const snapshot = this.getSnapshot();
    this.transport.sendToClient(clientId, {
      type: 'room:joined',
      playerId,
      snapshot,
    });
    this.broadcastState({ type: 'room:state', snapshot });
    return true;
  }

  public removeClient(clientId: string): void {
    const playerId = this.clientToPlayer.get(clientId);
    if (!playerId) return;
    this.clientToPlayer.delete(clientId);
    this.playerToClient.delete(playerId);
    this.players.delete(playerId);
    this.broadcastState();
  }

  private checkWin(sabotageExpired = false): boolean {
    const players = Array.from(this.players.values());
    const stats = computeTaskProgress(players);
    const outcome = evaluateMatchOutcome(
      players,
      stats.progress,
      sabotageExpired,
      this.justEjectedPlayer,
    );
    if (outcome) {
      this.outcome = outcome;
      this.phase = 'gameover';
      this.broadcastState();
      return true;
    }
    return false;
  }

  private startMatch(): void {
    const playerList = Array.from(this.players.values());
    if (playerList.length < 3) return;

    let assigned = assignRoles(playerList, this.settings.vondoCount);
    assigned = assignSpecialRoles(assigned, this.settings.enableSpecialRoles);
    this.bodies = [];
    this.footprints = [];
    this.footprintAccum.clear();
    this.chat = [];
    this.ejection = null;
    this.justEjectedPlayer = null;
    this.outcome = null;
    this.meetingCallerId = null;
    this.meetingReason = null;
    this.doorLocks = makeEmptyDoorLocks();
    this.emergencyCooldownRemaining = this.settings.emergencyCooldownSec;
    this.sabotage = {
      active: null,
      timeRemaining: 0,
      fixStationX: 0,
      fixStationZ: 0,
      cooldownRemaining: 8,
    };

    assigned.forEach((p, idx) => {
      const sp = SPAWN_RING[idx % SPAWN_RING.length];
      p.x = sp.x;
      p.z = sp.z;
      p.vx = 0;
      p.vz = 0;
      p.yaw = sp.yaw;
      p.alive = true;
      p.inVent = false;
      p.watchingCams = false;
      p.visualTaskTimer = 0;
      p.abilityCooldown =
        p.specialRole === 'bohurupi' ||
        p.specialRole === 'kobiraj' ||
        p.specialRole === 'daroga' ||
        p.specialRole === 'jharudar'
          ? 6
          : 0;
      p.revivesLeft = p.specialRole === 'daktar' ? 1 : 0;
      p.shielded = false;
      p.disguiseColor = null;
      p.disguiseName = null;
      p.disguiseTimer = 0;
      p.hasVoted = false;
      p.votedFor = null;
      p.emergencyMeetingsLeft =
        p.specialRole === 'neta'
          ? this.settings.emergencyMeetingsPerPlayer + 1
          : this.settings.emergencyMeetingsPerPlayer;
      p.killCooldownRemaining = p.role === 'vondo' ? Math.min(12, this.settings.killCooldownSec) : 0;
      p.tasks =
        p.role === 'parabasi' && p.specialRole !== 'pagol'
          ? createPlayerTasks(this.settings.tasksPerPlayer)
          : [];
      this.players.set(p.id, p);
    });

    this.phase = 'role_reveal';
    this.phaseTimer = 2.8;
    this.pushSystemChat('Khela shuru! Para tasks shesh koro ba Batpar ke Pukur e felo!');
    this.broadcastState();
  }

  private startMeeting(caller: PlayerState, reason: 'body' | 'emergency', victimName?: string): void {
    if (this.phase !== 'playing') return;
    this.phase = 'meeting';
    this.meetingCallerId = caller.id;
    this.meetingReason = reason;
    this.meetingTimer = this.settings.meetingTimeSec;
    this.ejection = null;
    this.justEjectedPlayer = null;
    this.footprints = [];
    this.sabotage.active = null;
    this.sabotage.timeRemaining = 0;
    this.doorLocks = makeEmptyDoorLocks();

    for (const p of this.players.values()) {
      p.inVent = false;
      p.watchingCams = false;
      p.disguiseColor = null;
      p.disguiseName = null;
      p.disguiseTimer = 0;
      p.vx = 0;
      p.vz = 0;
      p.hasVoted = false;
      p.votedFor = null;
    }

    for (const mem of this.botMemories.values()) {
      mem.voteTimer = 2 + Math.random() * 5;
      mem.hasChatted = false;
    }

    if (reason === 'body') {
      this.pushSystemChat(`${caller.name} found ${victimName ?? 'a fallen neighbor'}! Adda called!`);
    } else {
      this.pushSystemChat(`${caller.name} rang the Adda Bell! Urgent Moholla meeting!`);
    }

    this.broadcastState({ type: 'sfx:event', kind: reason === 'body' ? 'report' : 'meeting' });
    this.broadcastState();
  }

  private resolveMeetingVotes(): void {
    const players = Array.from(this.players.values());
    this.ejection = tallyVotes(players, this.settings.confirmEjects);
    this.phase = 'vote_results';
    this.phaseTimer = 2.6;
    this.broadcastState();
  }

  private updateBots(dt: number): void {
    for (const p of this.players.values()) {
      if (!p.isBot || !p.alive) continue;
      let mem = this.botMemories.get(p.id);
      if (!mem) {
        mem = {
          targetWaypointIdx: Math.floor(Math.random() * BOT_WAYPOINTS.length),
          pauseTimer: 0,
          voteTimer: 3,
          hasChatted: false,
        };
        this.botMemories.set(p.id, mem);
      }

      if (this.phase === 'playing') {
        if (p.specialRole === 'jharudar' && p.abilityCooldown <= 0.05) {
          const cleanTarget = findNearestCleanableBody(p, this.bodies);
          if (cleanTarget && Math.random() < 0.14) {
            this.bodies = this.bodies.filter((b) => b.id !== cleanTarget.id);
            p.abilityCooldown = JHARUDAR_CLEAN_COOLDOWN_SEC;
            continue;
          }
        }

        if (p.specialRole === 'daktar' && (p.revivesLeft ?? 0) > 0) {
          const revBody = findNearestRevivableBody(p, this.bodies);
          if (revBody && Math.random() < 0.16) {
            const victim = this.players.get(revBody.victimId);
            if (victim) {
              this.bodies = this.bodies.filter((b) => b.id !== revBody.id);
              victim.alive = true;
              victim.x = revBody.x;
              victim.z = revBody.z;
              p.revivesLeft = 0;
              this.broadcastState({ type: 'sfx:event', kind: 'revive' });
              continue;
            }
          }
        }

        const body = findNearestReportableBody(p, this.bodies);
        if (body && (p.role === 'parabasi' || (p.specialRole !== 'jharudar' && Math.random() < 0.04))) {
          body.reported = true;
          this.startMeeting(p, 'body', body.victimName);
          return;
        }

        if (p.specialRole === 'kobiraj' && p.abilityCooldown <= 0.05) {
          const ally = findNearestShieldTarget(p, Array.from(this.players.values()));
          if (ally && Math.random() < 0.04) {
            ally.shielded = true;
            p.abilityCooldown = KOBIRAJ_COOLDOWN_SEC;
          }
        }

        if (p.specialRole === 'bohurupi' && p.abilityCooldown <= 0.05 && Math.random() < 0.008) {
          const disguises = Array.from(this.players.values()).filter((o) => o.alive && o.role !== 'vondo');
          if (disguises.length > 0) {
            const pick = disguises[Math.floor(Math.random() * disguises.length)];
            p.disguiseColor = pick.color;
            p.disguiseName = pick.name;
            p.disguiseTimer = BOHURUPI_DISGUISE_DURATION_SEC;
            p.abilityCooldown = BOHURUPI_COOLDOWN_SEC;
          }
        }

        if (p.role === 'vondo') {
          if (!this.sabotage.active && this.sabotage.cooldownRemaining <= 0 && Math.random() < 0.004) {
            const sabType = Math.random() < 0.55 ? 'loadshedding' : 'wifi_down';
            const t = SABOTAGE_TARGETS[sabType];
            this.sabotage = {
              active: sabType,
              timeRemaining: SABOTAGE_DURATION_SEC,
              fixStationX: t.x,
              fixStationZ: t.z,
              cooldownRemaining: SABOTAGE_COOLDOWN_SEC,
            };
            this.broadcastState({ type: 'sfx:event', kind: 'sabotage' });
          } else if (this.doorLocks.cooldownRemaining <= 0 && Math.random() < 0.003) {
            const zones = ['cha_dokan', 'rickshaw_garage', 'desco_power', 'dish_roof'] as const;
            const pick = zones[Math.floor(Math.random() * zones.length)];
            this.doorLocks[pick] = DOOR_LOCK_DURATION_SEC;
            this.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
            this.broadcastState({ type: 'sfx:event', kind: 'door' });
          }
        }

        if (
          this.sabotage.active &&
          p.role === 'parabasi' &&
          p.specialRole !== 'pagol' &&
          distance2D(p.x, p.z, this.sabotage.fixStationX, this.sabotage.fixStationZ) <= SABOTAGE_FIX_RANGE &&
          Math.random() < 0.06
        ) {
          this.sabotage.active = null;
          this.sabotage.timeRemaining = 0;
        }

        if (p.role === 'vondo' && p.killCooldownRemaining <= 0) {
          const target = findNearestKillTarget(p, Array.from(this.players.values()));
          if (target && Math.random() < 0.12) {
            const check = canExecuteKill(p, target);
            if (check.allowed) {
              if (target.shielded) {
                target.shielded = false;
                p.killCooldownRemaining = 6;
                this.broadcastState({ type: 'sfx:event', kind: 'shield' });
                this.sendToPlayer(target.id, {
                  type: 'clue:result',
                  title: 'Tabiz Saved You!',
                  detail: 'Ekjon Batpar tomake gap e nite chaisilo, kintu Tabiz shield bachay dise!',
                });
              } else {
                target.alive = false;
                target.watchingCams = false;
                p.killCooldownRemaining = this.settings.killCooldownSec;
                this.bodies.push({
                  id: `body_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  victimId: target.id,
                  victimName: target.name,
                  color: target.color,
                  x: target.x,
                  z: target.z,
                  reported: false,
                  killedAt: Date.now(),
                  killerColorHint: getColorShadeHint(p.color),
                  killerZoneHint: getZoneNameAt(target.x, target.z),
                });
                this.broadcastState({ type: 'sfx:event', kind: 'kill' });
                if (this.checkWin()) return;
              }
            }
          }
        }

        if (mem.pauseTimer > 0) {
          mem.pauseTimer -= dt;
          p.vx = 0;
          p.vz = 0;
          if (mem.pauseTimer <= 0 && p.role === 'parabasi' && p.specialRole !== 'pagol') {
            const incomplete = p.tasks.find((t) => !t.completed);
            if (incomplete && Math.random() < 0.55) {
              incomplete.completed = true;
              if (this.checkWin()) return;
            }
          }
        } else {
          const rushSabotage =
            Boolean(this.sabotage.active) &&
            p.role === 'parabasi' &&
            p.specialRole !== 'pagol' &&
            mem.targetWaypointIdx % 2 === 0;
          const wp = rushSabotage
            ? { x: this.sabotage.fixStationX, z: this.sabotage.fixStationZ }
            : BOT_WAYPOINTS[mem.targetWaypointIdx % BOT_WAYPOINTS.length];
          const dx = wp.x - p.x;
          const dz = wp.z - p.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.9) {
            mem.pauseTimer = 1.2 + Math.random() * 2.5;
            mem.targetWaypointIdx = Math.floor(Math.random() * BOT_WAYPOINTS.length);
            p.vx = 0;
            p.vz = 0;
          } else {
            const speed = this.settings.moveSpeed * 0.72;
            p.vx = (dx / dist) * speed;
            p.vz = (dz / dist) * speed;
            p.yaw = Math.atan2(p.vx, p.vz);
            const resolved = resolveCircleWallCollision(
              p.x + p.vx * dt,
              p.z + p.vz * dt,
              PLAYER_RADIUS,
              WALLS,
              this.doorLocks,
            );
            const moved = Math.hypot(resolved.x - p.x, resolved.z - p.z);
            p.x = resolved.x;
            p.z = resolved.z;
            this.recordFootprint(p, moved);
          }
        }
      } else if (this.phase === 'meeting') {
        if (!mem.hasChatted && mem.voteTimer < 3.5 && Math.random() < 0.08) {
          mem.hasChatted = true;
          const pool = p.specialRole === 'pagol' ? PAGOL_BANTER : BOT_BANTER;
          this.chat.push({
            id: `chat_${Date.now()}_${p.id}`,
            senderId: p.id,
            senderName: p.name,
            senderColor: p.color,
            text: pool[Math.floor(Math.random() * pool.length)],
            timestamp: Date.now(),
          });
        }
        if (!p.hasVoted) {
          mem.voteTimer -= dt;
          if (mem.voteTimer <= 0) {
            const alive = Array.from(this.players.values()).filter((pl) => pl.alive && pl.id !== p.id);
            p.votedFor =
              alive.length > 0 && Math.random() < 0.65
                ? alive[Math.floor(Math.random() * alive.length)].id
                : 'skip';
            p.hasVoted = true;
          }
        }
      }
    }
  }

  public step(dt: number): void {
    if (this.phase === 'role_reveal') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.phase = 'playing';
        this.broadcastState();
      }
    } else if (this.phase === 'playing') {
      const nowMs = Date.now();
      this.footprints = this.footprints.filter((f) => f.expiresAt > nowMs);
      for (const p of this.players.values()) {
        if (p.killCooldownRemaining > 0) p.killCooldownRemaining = Math.max(0, p.killCooldownRemaining - dt);
        if (p.visualTaskTimer > 0) p.visualTaskTimer = Math.max(0, p.visualTaskTimer - dt);
        if (p.abilityCooldown > 0) p.abilityCooldown = Math.max(0, p.abilityCooldown - dt);
        if (p.disguiseTimer > 0) {
          p.disguiseTimer = Math.max(0, p.disguiseTimer - dt);
          if (p.disguiseTimer === 0) {
            p.disguiseColor = null;
            p.disguiseName = null;
          }
        }
      }
      if (this.emergencyCooldownRemaining > 0) {
        this.emergencyCooldownRemaining = Math.max(0, this.emergencyCooldownRemaining - dt);
      }
      if (this.sabotage.cooldownRemaining > 0) {
        this.sabotage.cooldownRemaining = Math.max(0, this.sabotage.cooldownRemaining - dt);
      }
      if (this.doorLocks.cooldownRemaining > 0) {
        this.doorLocks.cooldownRemaining = Math.max(0, this.doorLocks.cooldownRemaining - dt);
      }
      this.doorLocks.cha_dokan = Math.max(0, this.doorLocks.cha_dokan - dt);
      this.doorLocks.rickshaw_garage = Math.max(0, this.doorLocks.rickshaw_garage - dt);
      this.doorLocks.desco_power = Math.max(0, this.doorLocks.desco_power - dt);
      this.doorLocks.dish_roof = Math.max(0, this.doorLocks.dish_roof - dt);

      if (this.sabotage.active) {
        this.sabotage.timeRemaining -= dt;
        if (this.sabotage.timeRemaining <= 0) {
          this.checkWin(true);
          return;
        }
      }
      this.updateBots(dt);
      this.broadcastState();
    } else if (this.phase === 'meeting') {
      this.updateBots(dt);
      this.meetingTimer -= dt;
      const alivePlayers = Array.from(this.players.values()).filter((p) => p.alive);
      const allVoted = alivePlayers.length > 0 && alivePlayers.every((p) => p.hasVoted);
      if (allVoted || this.meetingTimer <= 0) {
        this.resolveMeetingVotes();
      } else {
        this.broadcastState();
      }
    } else if (this.phase === 'vote_results') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.justEjectedPlayer = null;
        if (this.ejection?.ejectedId) {
          const ejected = this.players.get(this.ejection.ejectedId);
          if (ejected) {
            ejected.alive = false;
            this.justEjectedPlayer = ejected;
          }
        }
        this.bodies = [];
        this.phase = 'ejecting';
        this.phaseTimer = 4.2;
        this.broadcastState({ type: 'sfx:event', kind: 'eject' });
        this.broadcastState();
      }
    } else if (this.phase === 'ejecting') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (!this.checkWin()) {
          this.justEjectedPlayer = null;
          let idx = 0;
          for (const p of this.players.values()) {
            const sp = SPAWN_RING[idx % SPAWN_RING.length];
            p.x = sp.x;
            p.z = sp.z;
            p.yaw = sp.yaw;
            p.hasVoted = false;
            p.votedFor = null;
            if (p.role === 'vondo') {
              p.killCooldownRemaining = Math.max(10, this.settings.killCooldownSec * 0.75);
            }
            idx++;
          }
          this.emergencyCooldownRemaining = this.settings.emergencyCooldownSec;
          this.phase = 'playing';
          this.broadcastState();
        }
      }
    }
  }

  public handleMessage(clientId: string, msg: ClientMessage): void {
    if (msg.type === 'room:join') {
      const targetCode = normalizeRoomCode(msg.roomCode);
      if (targetCode !== this.roomCode) {
        this.transport.sendToClient(clientId, {
          type: 'room:error',
          message: `Room "${targetCode}" not found.`,
        });
        return;
      }
      this.addClient(clientId, msg.name, msg.color, false);
      return;
    }

    const playerId = this.clientToPlayer.get(clientId);
    if (!playerId) return;
    const player = this.players.get(playerId);
    if (!player) return;

    switch (msg.type) {
      case 'lobby:settings': {
        if (!player.isHost || this.phase !== 'lobby') return;
        this.settings = { ...this.settings, ...msg.settings };
        this.broadcastState();
        break;
      }
      case 'lobby:add_bot': {
        if (!player.isHost || this.phase !== 'lobby' || this.players.size >= MAX_PLAYERS) return;
        const botId = `bot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
        const sp = SPAWN_RING[this.players.size % SPAWN_RING.length];
        const botName = BOT_NAMES[this.players.size % BOT_NAMES.length];
        const botColor = this.pickAvailableColor();
        this.players.set(botId, {
          id: botId,
          name: botName,
          color: botColor,
          x: sp.x,
          z: sp.z,
          vx: 0,
          vz: 0,
          yaw: sp.yaw,
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
          isBot: true,
          isHost: false,
          tasks: [],
          killCooldownRemaining: 0,
          emergencyMeetingsLeft: this.settings.emergencyMeetingsPerPlayer,
          revivesLeft: 0,
          votedFor: null,
          hasVoted: false,
        });
        this.broadcastState();
        break;
      }
      case 'lobby:remove_bots': {
        if (!player.isHost || this.phase !== 'lobby') return;
        for (const [id, pl] of this.players.entries()) {
          if (pl.isBot) this.players.delete(id);
        }
        this.broadcastState();
        break;
      }
      case 'lobby:start': {
        if (!player.isHost || this.phase !== 'lobby') return;
        if (this.players.size < 3) {
          this.transport.sendToClient(clientId, {
            type: 'room:error',
            message: 'Need at least 3 players (add Moholla bots or invite friends) to start!',
          });
          return;
        }
        this.startMatch();
        break;
      }
      case 'player:move': {
        if (this.phase !== 'playing' && this.phase !== 'lobby') return;
        if (player.inVent) return;
        const resolved = player.alive
          ? resolveCircleWallCollision(msg.x, msg.z, PLAYER_RADIUS, WALLS, this.doorLocks)
          : { x: msg.x, z: msg.z };
        const moved = Math.hypot(resolved.x - player.x, resolved.z - player.z);
        player.x = resolved.x;
        player.z = resolved.z;
        player.vx = msg.vx;
        player.vz = msg.vz;
        player.yaw = msg.yaw;
        if (this.phase === 'playing') {
          this.recordFootprint(player, moved);
        } else if (this.phase === 'lobby') {
          this.broadcastState();
        }
        break;
      }
      case 'player:visual_task_start': {
        if (
          this.phase !== 'playing' ||
          !this.settings.visualTasks ||
          player.role !== 'parabasi' ||
          player.specialRole === 'pagol'
        ) {
          return;
        }
        player.visualTaskTimer = 3.0;
        this.broadcastState();
        break;
      }
      case 'player:task_complete': {
        if (this.phase !== 'playing' || player.role !== 'parabasi' || player.specialRole === 'pagol') return;
        const station = TASK_STATIONS.find((s) => s.id === msg.taskId);
        if (!station || distance2D(player.x, player.z, station.x, station.z) > station.radius + 1.5) return;
        const taskItem = player.tasks.find((t) => t.taskId === msg.taskId);
        if (taskItem && !taskItem.completed) {
          taskItem.completed = true;
          if (station.isVisual && this.settings.visualTasks) {
            player.visualTaskTimer = 2.6;
          }
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'task' });
          if (!this.checkWin()) {
            this.broadcastState();
          }
        }
        break;
      }
      case 'player:use_ability': {
        if (this.phase !== 'playing' || !player.alive || player.inVent) return;
        if (player.specialRole === 'goyenda') {
          const body = findNearestInspectableBody(player, this.bodies);
          if (!body) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'Goyenda Scanner',
              detail: 'Move near a fallen neighbor body to scan forensic clues.',
            });
            return;
          }
          const clue = inspectBodyClue(body, Date.now());
          this.transport.sendToClient(clientId, { type: 'clue:result', title: clue.title, detail: clue.detail });
          return;
        }
        if (player.specialRole === 'kobiraj') {
          if (player.abilityCooldown > 0.05) return;
          const nearby = msg.targetId
            ? this.players.get(msg.targetId)
            : findNearestShieldTarget(player, Array.from(this.players.values()));
          const receiver =
            nearby && nearby.alive && !nearby.inVent ? nearby : !player.shielded ? player : null;
          if (!receiver) return;
          receiver.shielded = true;
          player.abilityCooldown = KOBIRAJ_COOLDOWN_SEC;
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'shield' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'Tabiz Shield Active',
            detail:
              receiver.id === player.id
                ? 'You placed a protective Tabiz shield on yourself!'
                : `Protected ${receiver.name} with a Kobiraj Tabiz shield!`,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'bohurupi') {
          if (player.disguiseTimer > 0 && (!msg.targetId || msg.targetId === player.id)) {
            player.disguiseColor = null;
            player.disguiseName = null;
            player.disguiseTimer = 0;
            this.broadcastState({ type: 'sfx:event', kind: 'disguise' });
            this.broadcastState();
            return;
          }
          if (player.abilityCooldown > 0.05) return;
          const candidates = Array.from(this.players.values()).filter(
            (p) => p.alive && p.id !== player.id && p.role !== 'vondo',
          );
          const chosen =
            (msg.targetId ? candidates.find((c) => c.id === msg.targetId) : candidates[0]) ?? candidates[0];
          if (!chosen) return;
          player.disguiseColor = chosen.color;
          player.disguiseName = chosen.name;
          player.disguiseTimer = BOHURUPI_DISGUISE_DURATION_SEC;
          player.abilityCooldown = BOHURUPI_COOLDOWN_SEC;
          this.broadcastState({ type: 'sfx:event', kind: 'disguise' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'Bohurupi Shapeshift',
            detail: `Disguised as ${chosen.name} for ${BOHURUPI_DISGUISE_DURATION_SEC}s!`,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'daroga') {
          if (player.abilityCooldown > 0.05) return;
          const target = msg.targetId
            ? this.players.get(msg.targetId)
            : findNearestDarogaTarget(player, Array.from(this.players.values()));
          if (!target) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'Para Daroga',
              detail: 'Move close to a suspect to make an Arrest Shot!',
            });
            return;
          }
          const res = resolveDarogaShot(player, target);
          if (!res.allowed) return;
          this.broadcastState({ type: 'sfx:event', kind: 'daroga' });
          if (res.hitVondo) {
            target.alive = false;
            target.watchingCams = false;
            player.abilityCooldown = DAROGA_COOLDOWN_SEC;
            this.bodies.push({
              id: `body_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              victimId: target.id,
              victimName: target.name,
              color: target.color,
              x: target.x,
              z: target.z,
              reported: false,
              killedAt: Date.now(),
              killerColorHint: getColorShadeHint(player.color),
              killerZoneHint: getZoneNameAt(target.x, target.z),
            });
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'Daroga Bullseye!',
              detail: `${target.name} CHILO ASLI BATPAR! Size kore diso!`,
            });
          } else {
            player.alive = false;
            player.watchingCams = false;
            this.bodies.push({
              id: `body_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              victimId: player.id,
              victimName: player.name,
              color: player.color,
              x: player.x,
              z: player.z,
              reported: false,
              killedAt: Date.now(),
              killerColorHint: getColorShadeHint(player.color),
              killerZoneHint: getZoneNameAt(player.x, player.z),
            });
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'Daroga Misfire!',
              detail: `${target.name} niraparadh Para-basi chilo! Ulto tomar job gelo!`,
            });
          }
          if (!this.checkWin()) {
            this.broadcastState();
          }
          return;
        }
        if (player.specialRole === 'daktar') {
          if ((player.revivesLeft ?? 0) <= 0) return;
          const body = findNearestRevivableBody(player, this.bodies);
          if (!body) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'Para Daktar',
              detail: 'Move near an unreported fallen body to apply Saline!',
            });
            return;
          }
          const victim = this.players.get(body.victimId);
          if (!victim) return;
          this.bodies = this.bodies.filter((b) => b.id !== body.id);
          victim.alive = true;
          victim.x = body.x;
          victim.z = body.z;
          player.revivesLeft = Math.max(0, (player.revivesLeft ?? 1) - 1);
          player.abilityCooldown = 10;
          this.broadcastState({ type: 'sfx:event', kind: 'revive' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'Saline Revive Success!',
            detail: `${victim.name} ke Para Daktar bachaye tulsen!`,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'jharudar') {
          if (player.abilityCooldown > 0.05) return;
          const body = findNearestCleanableBody(player, this.bodies);
          if (!body) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'Safai Batpar',
              detail: 'Move near an unreported fallen body to clean it!',
            });
            return;
          }
          this.bodies = this.bodies.filter((b) => b.id !== body.id);
          player.abilityCooldown = JHARUDAR_CLEAN_COOLDOWN_SEC;
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'clean' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'Lash Gayeb!',
            detail: `Cleaned ${body.victimName}'s body — nobody can report it now!`,
          });
          this.broadcastState();
        }
        break;
      }
      case 'player:kill': {
        if (this.phase !== 'playing') return;
        const target = this.players.get(msg.targetId);
        if (!target) return;
        const check = canExecuteKill(player, target);
        if (!check.allowed) return;
        if (target.shielded) {
          target.shielded = false;
          player.killCooldownRemaining = 6;
          this.broadcastState({ type: 'sfx:event', kind: 'shield' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'Tabiz Shield Shattered!',
            detail: `${target.name} was protected by the Kobiraj!`,
          });
          this.sendToPlayer(target.id, {
            type: 'clue:result',
            title: 'Tabiz Saved You!',
            detail: 'Ekjon Batpar attack korsilo, kintu tomar Tabiz shield bachay dise!',
          });
          this.broadcastState();
          return;
        }
        target.alive = false;
        target.watchingCams = false;
        player.killCooldownRemaining = this.settings.killCooldownSec;
        player.x = target.x;
        player.z = target.z;
        this.bodies.push({
          id: `body_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          victimId: target.id,
          victimName: target.name,
          color: target.color,
          x: target.x,
          z: target.z,
          reported: false,
          killedAt: Date.now(),
          killerColorHint: getColorShadeHint(player.color),
          killerZoneHint: getZoneNameAt(target.x, target.z),
        });
        this.broadcastState({ type: 'sfx:event', kind: 'kill' });
        if (!this.checkWin()) {
          this.broadcastState();
        }
        break;
      }
      case 'player:vent_toggle': {
        if (this.phase !== 'playing' || !canUseVent(player)) return;
        if (!player.inVent) {
          const nearVent = VENTS.find((v) => distance2D(player.x, player.z, v.x, v.z) <= VENT_RANGE);
          if (!nearVent) return;
          player.inVent = true;
          player.x = nearVent.x;
          player.z = nearVent.z;
          this.broadcastState({ type: 'sfx:event', kind: 'vent' });
        } else if (msg.destinationVentId) {
          const dest = resolveVentHopTarget(player.x, player.z, msg.destinationVentId);
          if (!dest) return;
          player.x = dest.x;
          player.z = dest.z;
          this.broadcastState({ type: 'sfx:event', kind: 'vent' });
        } else {
          player.inVent = false;
          if (player.specialRole === 'mistri') {
            player.abilityCooldown = MISTRI_VENT_COOLDOWN_SEC;
          }
          this.broadcastState({ type: 'sfx:event', kind: 'vent' });
        }
        this.broadcastState();
        break;
      }
      case 'player:sabotage': {
        if (this.phase !== 'playing' || !player.alive || player.role !== 'vondo') return;
        if (this.sabotage.active || this.sabotage.cooldownRemaining > 0) return;
        const target = SABOTAGE_TARGETS[msg.sabotageType];
        this.sabotage = {
          active: msg.sabotageType,
          timeRemaining: SABOTAGE_DURATION_SEC,
          fixStationX: target.x,
          fixStationZ: target.z,
          cooldownRemaining: SABOTAGE_COOLDOWN_SEC,
        };
        this.broadcastState({ type: 'sfx:event', kind: 'sabotage' });
        this.broadcastState();
        break;
      }
      case 'player:lock_doors': {
        if (this.phase !== 'playing' || !player.alive || player.role !== 'vondo') return;
        if (this.doorLocks.cooldownRemaining > 0) return;
        this.doorLocks[msg.zoneId] = DOOR_LOCK_DURATION_SEC;
        this.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
        this.broadcastState({ type: 'sfx:event', kind: 'door' });
        this.broadcastState();
        break;
      }
      case 'player:watch_cams': {
        if (this.phase !== 'playing') return;
        player.watchingCams = msg.watching;
        this.broadcastState();
        break;
      }
      case 'player:fix_sabotage': {
        if (this.phase !== 'playing' || !player.alive || !this.sabotage.active) return;
        const range = player.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
        if (distance2D(player.x, player.z, this.sabotage.fixStationX, this.sabotage.fixStationZ) <= range) {
          this.sabotage.active = null;
          this.sabotage.timeRemaining = 0;
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'task' });
          this.broadcastState();
        }
        break;
      }
      case 'player:report_body': {
        if (this.phase !== 'playing' || !player.alive) return;
        const body = this.bodies.find((b) => b.id === msg.bodyId && !b.reported);
        if (!body) return;
        body.reported = true;
        this.startMeeting(player, 'body', body.victimName);
        break;
      }
      case 'player:emergency_meeting': {
        if (
          this.phase !== 'playing' ||
          !player.alive ||
          this.sabotage.active ||
          this.emergencyCooldownRemaining > 0 ||
          player.emergencyMeetingsLeft <= 0
        ) {
          return;
        }
        if (
          distance2D(player.x, player.z, EMERGENCY_BELL_POS.x, EMERGENCY_BELL_POS.z) <=
          EMERGENCY_BELL_POS.interactRadius
        ) {
          player.emergencyMeetingsLeft--;
          this.startMeeting(player, 'emergency');
        }
        break;
      }
      case 'meeting:chat': {
        if (this.phase !== 'meeting') return;
        const text = msg.text.trim().slice(0, 140);
        if (!text) return;
        this.chat.push({
          id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          senderId: player.id,
          senderName: player.alive ? player.name : `${player.name} (Ghost)`,
          senderColor: player.color,
          text,
          timestamp: Date.now(),
          ghostOnly: !player.alive,
        });
        this.broadcastState();
        break;
      }
      case 'meeting:vote': {
        if (this.phase !== 'meeting' || !player.alive || player.hasVoted) return;
        player.votedFor = msg.targetId;
        player.hasVoted = true;
        this.broadcastState();
        break;
      }
      case 'player:meme_sfx': {
        const allowed = new Set(['vine_boom', 'bonk', 'sad_trombone', 'airhorn', 'dun_dun', 'chubani']);
        if (allowed.has(msg.memeId)) {
          this.broadcastState({ type: 'meme:play', memeId: msg.memeId });
        }
        break;
      }
      case 'room:play_again': {
        if (!player.isHost) return;
        this.phase = 'lobby';
        this.bodies = [];
        this.footprints = [];
        this.outcome = null;
        this.ejection = null;
        this.justEjectedPlayer = null;
        this.doorLocks = makeEmptyDoorLocks();
        for (const p of this.players.values()) {
          p.alive = true;
          p.inVent = false;
          p.watchingCams = false;
          p.visualTaskTimer = 0;
          p.abilityCooldown = 0;
          p.shielded = false;
          p.disguiseColor = null;
          p.disguiseName = null;
          p.disguiseTimer = 0;
          p.role = 'parabasi';
          p.specialRole = 'none';
          p.tasks = [];
          p.hasVoted = false;
          p.votedFor = null;
        }
        this.broadcastState();
        break;
      }
    }
  }
}
