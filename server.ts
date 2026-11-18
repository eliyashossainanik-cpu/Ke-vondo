import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  PLAYER_COLORS,
  type BodyMarker,
  type ChatMessage,
  type ClientMessage,
  type DoorLockState,
  type FootprintDot,
  type PlayerColorId,
  type PlayerState,
  type PublicRoomSummary,
  type RoomSettings,
  type RoomSnapshot,
  type ServerMessage,
} from './src/shared/types.ts';
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
} from './src/shared/mapData.ts';
import {
  BOHURUPI_COOLDOWN_SEC,
  BOHURUPI_DISGUISE_DURATION_SEC,
  DEFAULT_ROOM_SETTINGS,
  DOOR_LOCK_COOLDOWN_SEC,
  DOOR_LOCK_DURATION_SEC,
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
  findNearestInspectableBody,
  findNearestKillTarget,
  findNearestReportableBody,
  findNearestShieldTarget,
  getColorShadeHint,
  inspectBodyClue,
  resolveVentHopTarget,
  tallyVotes,
} from './src/shared/gameRules.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const TICK_RATE_MS = 50; // 20Hz authoritative server tick
const MAX_PLAYERS = 8;

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
  'Kichu bolbo na naki chubani dibo? Khub tension!',
  'Ami Fuchka Chottor e jhal fuchka khaitasilam kasam!',
  'Hero Saloon e Hero-cut dite gesilam bhai!',
  'Para Cricket Math e tape ball kheltesilam, keu sus bolben na!',
  'Dadu Pharmacy theke saline nite gesilam!',
  'Biyer Bari Pandal e Kacchi khaitasilam, Batpar okhane chilo naki?',
];

const PAGOL_BANTER = [
  'Hehe ami toh kichui kori nai, amake Pukur e chubani diyen na pls!',
  'Ami shudhu pukur ghat e boshe chilam bhai, kothao jai nai!',
  'Amake size korle kintu boro bhul korben bhaiya!',
];

interface BotMemory {
  targetWaypointIdx: number;
  pauseTimer: number;
  voteTimer: number;
  hasChatted: boolean;
}

interface RoomInternal {
  code: string;
  phase: 'lobby' | 'role_reveal' | 'playing' | 'meeting' | 'vote_results' | 'ejecting' | 'gameover';
  players: Map<string, PlayerState>;
  clients: Map<string, WebSocket>;
  botMemories: Map<string, BotMemory>;
  footprintAccum: Map<string, number>;
  bodies: BodyMarker[];
  footprints: FootprintDot[];
  sabotage: RoomSnapshot['sabotage'];
  doorLocks: DoorLockState;
  chat: ChatMessage[];
  meetingCallerId: string | null;
  meetingReason: 'body' | 'emergency' | null;
  meetingTimer: number;
  phaseTimer: number;
  emergencyCooldownRemaining: number;
  ejection: RoomSnapshot['ejection'];
  justEjectedPlayer: PlayerState | null;
  outcome: RoomSnapshot['outcome'];
  settings: RoomSettings;
}

const rooms = new Map<string, RoomInternal>();
const socketToPlayer = new Map<WebSocket, { roomCode: string; playerId: string }>();

function makeEmptyDoorLocks(): DoorLockState {
  return {
    cha_dokan: 0,
    rickshaw_garage: 0,
    desco_power: 0,
    dish_roof: 0,
    cooldownRemaining: 0,
  };
}

function generateRoomCode(): string {
  const words = ['ADDA', 'CHAI', 'MAMA', 'PARA', 'DESH', 'KELA', 'PUKR'];
  for (let i = 0; i < 10; i++) {
    const candidate =
      i < 4
        ? `${words[Math.floor(Math.random() * words.length)]}`
        : Math.random().toString(36).substring(2, 6).toUpperCase();
    if (!rooms.has(candidate)) return candidate;
  }
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function pickAvailableColor(room: RoomInternal, preferred?: PlayerColorId): PlayerColorId {
  const used = new Set(Array.from(room.players.values()).map((p) => p.color));
  if (preferred && !used.has(preferred)) return preferred;
  for (const spec of PLAYER_COLORS) {
    if (!used.has(spec.id)) return spec.id;
  }
  return PLAYER_COLORS[room.players.size % PLAYER_COLORS.length].id;
}

function buildSnapshot(room: RoomInternal): RoomSnapshot {
  const players = Array.from(room.players.values());
  const taskStats = computeTaskProgress(players);
  return {
    roomCode: room.code,
    phase: room.phase,
    players,
    bodies: room.bodies,
    footprints: room.footprints,
    sabotage: { ...room.sabotage },
    doorLocks: { ...room.doorLocks },
    chat: room.chat.slice(-40),
    meetingCallerId: room.meetingCallerId,
    meetingReason: room.meetingReason,
    meetingTimer: Math.max(0, Math.ceil(room.meetingTimer)),
    emergencyCooldownRemaining: Math.max(0, Math.ceil(room.emergencyCooldownRemaining)),
    ejection: room.ejection,
    outcome: room.outcome,
    settings: { ...room.settings },
    taskProgress: taskStats.progress,
    totalTasks: taskStats.totalTasks,
    completedTasks: taskStats.completedTasks,
  };
}

function recordFootprint(room: RoomInternal, p: PlayerState, distMoved: number): void {
  if (!p.alive || p.inVent || distMoved < 0.05) return;
  const prev = (room.footprintAccum.get(p.id) ?? 0) + distMoved;
  if (prev >= 2.2) {
    room.footprintAccum.set(p.id, 0);
    room.footprints.push({
      id: `fp_${Date.now()}_${p.id}_${Math.random().toString(36).slice(2, 5)}`,
      x: p.x,
      z: p.z,
      color: p.disguiseColor ?? p.color,
      expiresAt: Date.now() + 7500,
    });
    if (room.footprints.length > 36) {
      room.footprints.shift();
    }
  } else {
    room.footprintAccum.set(p.id, prev);
  }
}

function sendToSocket(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastRoom(room: RoomInternal, msg?: ServerMessage): void {
  const payload = JSON.stringify(msg ?? { type: 'room:state', snapshot: buildSnapshot(room) });
  for (const ws of room.clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function pushSystemChat(room: RoomInternal, text: string): void {
  room.chat.push({
    id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    senderId: 'system',
    senderName: 'Moholla Announcement',
    senderColor: 'holud',
    text,
    timestamp: Date.now(),
    system: true,
  });
}

function createEmptyRoom(code: string): RoomInternal {
  return {
    code,
    phase: 'lobby',
    players: new Map(),
    clients: new Map(),
    botMemories: new Map(),
    footprintAccum: new Map(),
    bodies: [],
    footprints: [],
    sabotage: {
      active: null,
      timeRemaining: 0,
      fixStationX: 0,
      fixStationZ: 0,
      cooldownRemaining: 0,
    },
    doorLocks: makeEmptyDoorLocks(),
    chat: [],
    meetingCallerId: null,
    meetingReason: null,
    meetingTimer: 0,
    phaseTimer: 0,
    emergencyCooldownRemaining: 0,
    ejection: null,
    justEjectedPlayer: null,
    outcome: null,
    settings: { ...DEFAULT_ROOM_SETTINGS },
  };
}

function startMatch(room: RoomInternal): void {
  const playerList = Array.from(room.players.values());
  if (playerList.length < 3) return;

  let assigned = assignRoles(playerList, room.settings.vondoCount);
  assigned = assignSpecialRoles(assigned, room.settings.enableSpecialRoles);
  room.bodies = [];
  room.footprints = [];
  room.footprintAccum.clear();
  room.chat = [];
  room.ejection = null;
  room.justEjectedPlayer = null;
  room.outcome = null;
  room.meetingCallerId = null;
  room.meetingReason = null;
  room.doorLocks = makeEmptyDoorLocks();
  room.emergencyCooldownRemaining = room.settings.emergencyCooldownSec;
  room.sabotage = {
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
    p.abilityCooldown = p.specialRole === 'bohurupi' || p.specialRole === 'kobiraj' ? 6 : 0;
    p.shielded = false;
    p.disguiseColor = null;
    p.disguiseName = null;
    p.disguiseTimer = 0;
    p.hasVoted = false;
    p.votedFor = null;
    p.emergencyMeetingsLeft = room.settings.emergencyMeetingsPerPlayer;
    p.killCooldownRemaining = p.role === 'vondo' ? Math.min(12, room.settings.killCooldownSec) : 0;
    p.tasks =
      p.role === 'parabasi' && p.specialRole !== 'pagol'
        ? createPlayerTasks(room.settings.tasksPerPlayer)
        : [];
    room.players.set(p.id, p);
  });

  room.phase = 'role_reveal';
  room.phaseTimer = 2.8;
  pushSystemChat(room, 'Khela shuru! Para tasks shesh koro ba Batpar ke Pukur e felo!');
  broadcastRoom(room);
}

function startMeeting(room: RoomInternal, caller: PlayerState, reason: 'body' | 'emergency', victimName?: string): void {
  if (room.phase !== 'playing') return;
  room.phase = 'meeting';
  room.meetingCallerId = caller.id;
  room.meetingReason = reason;
  room.meetingTimer = room.settings.meetingTimeSec;
  room.ejection = null;
  room.justEjectedPlayer = null;
  room.footprints = [];
  room.sabotage.active = null;
  room.sabotage.timeRemaining = 0;
  room.doorLocks = makeEmptyDoorLocks();

  for (const p of room.players.values()) {
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

  for (const mem of room.botMemories.values()) {
    mem.voteTimer = 2 + Math.random() * 5;
    mem.hasChatted = false;
  }

  if (reason === 'body') {
    pushSystemChat(room, `${caller.name} found ${victimName ?? 'a fallen neighbor'}! Adda called!`);
  } else {
    pushSystemChat(room, `${caller.name} rang the Adda Bell! Urgent Moholla meeting!`);
  }

  broadcastRoom(room, { type: 'sfx:event', kind: reason === 'body' ? 'report' : 'meeting' });
  broadcastRoom(room);
}

function resolveMeetingVotes(room: RoomInternal): void {
  const players = Array.from(room.players.values());
  const ejection = tallyVotes(players, room.settings.confirmEjects);
  room.ejection = ejection;

  // Transition to Vote Results tally screen for 2.6s first (official Among Us flow!)
  room.phase = 'vote_results';
  room.phaseTimer = 2.6;
  broadcastRoom(room);
}

function checkAndApplyWinCondition(room: RoomInternal, sabotageExpired = false): boolean {
  const players = Array.from(room.players.values());
  const stats = computeTaskProgress(players);
  const outcome = evaluateMatchOutcome(
    players,
    stats.progress,
    sabotageExpired,
    room.justEjectedPlayer,
  );
  if (outcome) {
    room.outcome = outcome;
    room.phase = 'gameover';
    broadcastRoom(room);
    return true;
  }
  return false;
}

function updateRoomBots(room: RoomInternal, dt: number): void {
  for (const p of room.players.values()) {
    if (!p.isBot || !p.alive) continue;
    let mem = room.botMemories.get(p.id);
    if (!mem) {
      mem = {
        targetWaypointIdx: Math.floor(Math.random() * BOT_WAYPOINTS.length),
        pauseTimer: 0,
        voteTimer: 3,
        hasChatted: false,
      };
      room.botMemories.set(p.id, mem);
    }

    if (room.phase === 'playing') {
      const body = findNearestReportableBody(p, room.bodies);
      if (body && (p.role === 'parabasi' || Math.random() < 0.04)) {
        body.reported = true;
        startMeeting(room, p, 'body', body.victimName);
        return;
      }

      if (p.specialRole === 'kobiraj' && p.abilityCooldown <= 0.05) {
        const ally = findNearestShieldTarget(p, Array.from(room.players.values()));
        if (ally && Math.random() < 0.04) {
          ally.shielded = true;
          p.abilityCooldown = KOBIRAJ_COOLDOWN_SEC;
        }
      }

      if (p.specialRole === 'bohurupi' && p.abilityCooldown <= 0.05 && Math.random() < 0.008) {
        const disguises = Array.from(room.players.values()).filter((o) => o.alive && o.role !== 'vondo');
        if (disguises.length > 0) {
          const pick = disguises[Math.floor(Math.random() * disguises.length)];
          p.disguiseColor = pick.color;
          p.disguiseName = pick.name;
          p.disguiseTimer = BOHURUPI_DISGUISE_DURATION_SEC;
          p.abilityCooldown = BOHURUPI_COOLDOWN_SEC;
        }
      }

      if (p.role === 'vondo') {
        if (
          !room.sabotage.active &&
          room.sabotage.cooldownRemaining <= 0 &&
          Math.random() < 0.004
        ) {
          const sabType = Math.random() < 0.55 ? 'loadshedding' : 'wifi_down';
          const t = SABOTAGE_TARGETS[sabType];
          room.sabotage = {
            active: sabType,
            timeRemaining: SABOTAGE_DURATION_SEC,
            fixStationX: t.x,
            fixStationZ: t.z,
            cooldownRemaining: SABOTAGE_COOLDOWN_SEC,
          };
          broadcastRoom(room, { type: 'sfx:event', kind: 'sabotage' });
        } else if (room.doorLocks.cooldownRemaining <= 0 && Math.random() < 0.003) {
          const zones = ['cha_dokan', 'rickshaw_garage', 'desco_power', 'dish_roof'] as const;
          const pick = zones[Math.floor(Math.random() * zones.length)];
          room.doorLocks[pick] = DOOR_LOCK_DURATION_SEC;
          room.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
          broadcastRoom(room, { type: 'sfx:event', kind: 'door' });
        }
      }

      if (
        room.sabotage.active &&
        p.role === 'parabasi' &&
        p.specialRole !== 'pagol' &&
        distance2D(p.x, p.z, room.sabotage.fixStationX, room.sabotage.fixStationZ) <=
          SABOTAGE_FIX_RANGE &&
        Math.random() < 0.06
      ) {
        room.sabotage.active = null;
        room.sabotage.timeRemaining = 0;
      }

      if (p.role === 'vondo' && p.killCooldownRemaining <= 0) {
        const target = findNearestKillTarget(p, Array.from(room.players.values()));
        if (target && Math.random() < 0.12) {
          const check = canExecuteKill(p, target);
          if (check.allowed) {
            if (target.shielded) {
              target.shielded = false;
              p.killCooldownRemaining = 6;
              broadcastRoom(room, { type: 'sfx:event', kind: 'shield' });
              const targetWs = room.clients.get(target.id);
              if (targetWs) {
                sendToSocket(targetWs, {
                  type: 'clue:result',
                  title: 'Tabiz Saved You!',
                  detail: 'Ekjon Batpar tomake gap e nite chaisilo, kintu Tabiz shield bachay dise!',
                });
              }
            } else {
              target.alive = false;
              target.watchingCams = false;
              p.killCooldownRemaining = room.settings.killCooldownSec;
              room.bodies.push({
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
              broadcastRoom(room, { type: 'sfx:event', kind: 'kill' });
              if (checkAndApplyWinCondition(room)) return;
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
            if (checkAndApplyWinCondition(room)) return;
          }
        }
      } else {
        const rushSabotage =
          Boolean(room.sabotage.active) &&
          p.role === 'parabasi' &&
          p.specialRole !== 'pagol' &&
          mem.targetWaypointIdx % 2 === 0;
        const wp = rushSabotage
          ? { x: room.sabotage.fixStationX, z: room.sabotage.fixStationZ }
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
          const speed = room.settings.moveSpeed * 0.72;
          p.vx = (dx / dist) * speed;
          p.vz = (dz / dist) * speed;
          p.yaw = Math.atan2(p.vx, p.vz);
          const resolved = resolveCircleWallCollision(p.x + p.vx * dt, p.z + p.vz * dt, PLAYER_RADIUS, WALLS, room.doorLocks);
          const moved = Math.hypot(resolved.x - p.x, resolved.z - p.z);
          p.x = resolved.x;
          p.z = resolved.z;
          recordFootprint(room, p, moved);
        }
      }
    } else if (room.phase === 'meeting') {
      if (!mem.hasChatted && mem.voteTimer < 3.5 && Math.random() < 0.08) {
        mem.hasChatted = true;
        const pool = p.specialRole === 'pagol' ? PAGOL_BANTER : BOT_BANTER;
        room.chat.push({
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
          const alive = Array.from(room.players.values()).filter((pl) => pl.alive && pl.id !== p.id);
          if (alive.length > 0 && Math.random() < 0.65) {
            p.votedFor = alive[Math.floor(Math.random() * alive.length)].id;
          } else {
            p.votedFor = 'skip';
          }
          p.hasVoted = true;
        }
      }
    }
  }
}

setInterval(() => {
  const dt = TICK_RATE_MS / 1000;
  for (const room of rooms.values()) {
    if (room.clients.size === 0) continue;

    if (room.phase === 'role_reveal') {
      room.phaseTimer -= dt;
      if (room.phaseTimer <= 0) {
        room.phase = 'playing';
        broadcastRoom(room);
      }
    } else if (room.phase === 'playing') {
      const nowMs = Date.now();
      room.footprints = room.footprints.filter((f) => f.expiresAt > nowMs);
      for (const p of room.players.values()) {
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
      if (room.emergencyCooldownRemaining > 0) {
        room.emergencyCooldownRemaining = Math.max(0, room.emergencyCooldownRemaining - dt);
      }
      if (room.sabotage.cooldownRemaining > 0) {
        room.sabotage.cooldownRemaining = Math.max(0, room.sabotage.cooldownRemaining - dt);
      }
      if (room.doorLocks.cooldownRemaining > 0) {
        room.doorLocks.cooldownRemaining = Math.max(0, room.doorLocks.cooldownRemaining - dt);
      }
      room.doorLocks.cha_dokan = Math.max(0, room.doorLocks.cha_dokan - dt);
      room.doorLocks.rickshaw_garage = Math.max(0, room.doorLocks.rickshaw_garage - dt);
      room.doorLocks.desco_power = Math.max(0, room.doorLocks.desco_power - dt);
      room.doorLocks.dish_roof = Math.max(0, room.doorLocks.dish_roof - dt);

      if (room.sabotage.active) {
        room.sabotage.timeRemaining -= dt;
        if (room.sabotage.timeRemaining <= 0) {
          checkAndApplyWinCondition(room, true);
          continue;
        }
      }
      updateRoomBots(room, dt);
      broadcastRoom(room);
    } else if (room.phase === 'meeting') {
      updateRoomBots(room, dt);
      room.meetingTimer -= dt;
      const alivePlayers = Array.from(room.players.values()).filter((p) => p.alive);
      const allVoted = alivePlayers.length > 0 && alivePlayers.every((p) => p.hasVoted);
      if (allVoted || room.meetingTimer <= 0) {
        resolveMeetingVotes(room);
      } else {
        broadcastRoom(room);
      }
    } else if (room.phase === 'vote_results') {
      room.phaseTimer -= dt;
      if (room.phaseTimer <= 0) {
        room.justEjectedPlayer = null;
        if (room.ejection?.ejectedId) {
          const ejected = room.players.get(room.ejection.ejectedId);
          if (ejected) {
            ejected.alive = false;
            room.justEjectedPlayer = ejected;
          }
        }
        room.bodies = [];
        room.phase = 'ejecting';
        room.phaseTimer = 3.0;
        broadcastRoom(room, { type: 'sfx:event', kind: 'eject' });
        broadcastRoom(room);
      }
    } else if (room.phase === 'ejecting') {
      room.phaseTimer -= dt;
      if (room.phaseTimer <= 0) {
        if (!checkAndApplyWinCondition(room)) {
          room.justEjectedPlayer = null;
          let idx = 0;
          for (const p of room.players.values()) {
            const sp = SPAWN_RING[idx % SPAWN_RING.length];
            p.x = sp.x;
            p.z = sp.z;
            p.yaw = sp.yaw;
            p.hasVoted = false;
            p.votedFor = null;
            if (p.role === 'vondo') {
              p.killCooldownRemaining = Math.max(10, room.settings.killCooldownSec * 0.75);
            }
            idx++;
          }
          room.emergencyCooldownRemaining = room.settings.emergencyCooldownSec;
          room.phase = 'playing';
          broadcastRoom(room);
        }
      }
    }
  }
}, TICK_RATE_MS);

function handleSocketMessage(ws: WebSocket, raw: string): void {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw) as ClientMessage;
  } catch {
    return;
  }

  if (msg.type === 'room:list') {
    const list: PublicRoomSummary[] = [];
    for (const r of rooms.values()) {
      if (r.clients.size === 0) continue;
      const host = Array.from(r.players.values()).find((p) => p.isHost);
      list.push({
        roomCode: r.code,
        playerCount: r.players.size,
        maxPlayers: MAX_PLAYERS,
        phase: r.phase,
        hostName: host?.name ?? 'Host',
      });
    }
    sendToSocket(ws, { type: 'room:list_result', rooms: list });
    return;
  }

  if (msg.type === 'room:create' || msg.type === 'room:join') {
    const prev = socketToPlayer.get(ws);
    if (prev) {
      const oldRoom = rooms.get(prev.roomCode);
      if (oldRoom) {
        oldRoom.clients.delete(prev.playerId);
        oldRoom.players.delete(prev.playerId);
        if (oldRoom.clients.size === 0) rooms.delete(oldRoom.code);
        else broadcastRoom(oldRoom);
      }
    }

    let room: RoomInternal | undefined;
    if (msg.type === 'room:create') {
      const code = generateRoomCode();
      room = createEmptyRoom(code);
      rooms.set(code, room);
    } else {
      const code = msg.roomCode.trim().toUpperCase();
      room = rooms.get(code);
      if (!room) {
        sendToSocket(ws, { type: 'room:error', message: `Room "${code}" not found.` });
        return;
      }
      if (room.phase !== 'lobby') {
        sendToSocket(ws, { type: 'room:error', message: 'Match already in progress in this room.' });
        return;
      }
      if (room.players.size >= MAX_PLAYERS) {
        sendToSocket(ws, { type: 'room:error', message: 'Room is full (max 8 players).' });
        return;
      }
    }

    const playerId = `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const color = pickAvailableColor(room, msg.color);
    const sp = SPAWN_RING[room.players.size % SPAWN_RING.length];
    const cleanName = msg.name.trim().slice(0, 16) || 'Babu Bhai';
    const isHost = room.players.size === 0;

    const player: PlayerState = {
      id: playerId,
      name: cleanName,
      color,
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
      emergencyMeetingsLeft: room.settings.emergencyMeetingsPerPlayer,
      votedFor: null,
      hasVoted: false,
    };

    room.players.set(playerId, player);
    room.clients.set(playerId, ws);
    socketToPlayer.set(ws, { roomCode: room.code, playerId });

    sendToSocket(ws, {
      type: 'room:joined',
      playerId,
      snapshot: buildSnapshot(room),
    });
    broadcastRoom(room);
    return;
  }

  const ref = socketToPlayer.get(ws);
  if (!ref) return;
  const room = rooms.get(ref.roomCode);
  if (!room) return;
  const player = room.players.get(ref.playerId);
  if (!player) return;

  switch (msg.type) {
    case 'lobby:settings': {
      if (!player.isHost || room.phase !== 'lobby') return;
      room.settings = { ...room.settings, ...msg.settings };
      broadcastRoom(room);
      break;
    }
    case 'lobby:add_bot': {
      if (!player.isHost || room.phase !== 'lobby' || room.players.size >= MAX_PLAYERS) return;
      const botId = `bot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
      const sp = SPAWN_RING[room.players.size % SPAWN_RING.length];
      const botName = BOT_NAMES[room.players.size % BOT_NAMES.length];
      const botColor = pickAvailableColor(room);
      room.players.set(botId, {
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
        emergencyMeetingsLeft: room.settings.emergencyMeetingsPerPlayer,
        votedFor: null,
        hasVoted: false,
      });
      broadcastRoom(room);
      break;
    }
    case 'lobby:remove_bots': {
      if (!player.isHost || room.phase !== 'lobby') return;
      for (const [id, pl] of room.players.entries()) {
        if (pl.isBot) room.players.delete(id);
      }
      broadcastRoom(room);
      break;
    }
    case 'lobby:start': {
      if (!player.isHost || room.phase !== 'lobby') return;
      if (room.players.size < 3) {
        sendToSocket(ws, {
          type: 'room:error',
          message: 'Need at least 3 players (add Moholla bots or invite friends) to start!',
        });
        return;
      }
      startMatch(room);
      break;
    }
    case 'player:move': {
      if (room.phase !== 'playing' && room.phase !== 'lobby') return;
      if (player.inVent) return;
      const resolved = player.alive
        ? resolveCircleWallCollision(msg.x, msg.z, PLAYER_RADIUS, WALLS, room.doorLocks)
        : { x: msg.x, z: msg.z };
      const moved = Math.hypot(resolved.x - player.x, resolved.z - player.z);
      player.x = resolved.x;
      player.z = resolved.z;
      player.vx = msg.vx;
      player.vz = msg.vz;
      player.yaw = msg.yaw;
      if (room.phase === 'playing') {
        recordFootprint(room, player, moved);
      } else if (room.phase === 'lobby') {
        broadcastRoom(room);
      }
      break;
    }
    case 'player:visual_task_start': {
      if (
        room.phase !== 'playing' ||
        !room.settings.visualTasks ||
        player.role !== 'parabasi' ||
        player.specialRole === 'pagol'
      ) {
        return;
      }
      player.visualTaskTimer = 3.0;
      broadcastRoom(room);
      break;
    }
    case 'player:task_complete': {
      if (room.phase !== 'playing' || player.role !== 'parabasi' || player.specialRole === 'pagol') return;
      const station = TASK_STATIONS.find((s) => s.id === msg.taskId);
      if (!station || distance2D(player.x, player.z, station.x, station.z) > station.radius + 1.5) return;
      const taskItem = player.tasks.find((t) => t.taskId === msg.taskId);
      if (taskItem && !taskItem.completed) {
        taskItem.completed = true;
        if (station.isVisual && room.settings.visualTasks) {
          player.visualTaskTimer = 2.6;
        }
        sendToSocket(ws, { type: 'sfx:event', kind: 'task' });
        if (!checkAndApplyWinCondition(room)) {
          broadcastRoom(room);
        }
      }
      break;
    }
    case 'player:use_ability': {
      if (room.phase !== 'playing' || !player.alive || player.inVent) return;
      if (player.specialRole === 'goyenda') {
        const body = findNearestInspectableBody(player, room.bodies);
        if (!body) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'Goyenda Scanner',
            detail: 'Move near a fallen neighbor body to scan forensic clues.',
          });
          return;
        }
        const clue = inspectBodyClue(body, Date.now());
        sendToSocket(ws, { type: 'clue:result', title: clue.title, detail: clue.detail });
        return;
      }
      if (player.specialRole === 'kobiraj') {
        if (player.abilityCooldown > 0.05) return;
        const nearby = msg.targetId
          ? room.players.get(msg.targetId)
          : findNearestShieldTarget(player, Array.from(room.players.values()));
        const receiver =
          nearby && nearby.alive && !nearby.inVent ? nearby : !player.shielded ? player : null;
        if (!receiver) return;
        receiver.shielded = true;
        player.abilityCooldown = KOBIRAJ_COOLDOWN_SEC;
        sendToSocket(ws, { type: 'sfx:event', kind: 'shield' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'Tabiz Shield Active',
          detail:
            receiver.id === player.id
              ? 'You placed a protective Tabiz shield on yourself!'
              : `Protected ${receiver.name} with a Kobiraj Tabiz shield!`,
        });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'bohurupi') {
        if (player.disguiseTimer > 0 && (!msg.targetId || msg.targetId === player.id)) {
          player.disguiseColor = null;
          player.disguiseName = null;
          player.disguiseTimer = 0;
          broadcastRoom(room, { type: 'sfx:event', kind: 'disguise' });
          broadcastRoom(room);
          return;
        }
        if (player.abilityCooldown > 0.05) return;
        const candidates = Array.from(room.players.values()).filter(
          (p) => p.alive && p.id !== player.id && p.role !== 'vondo',
        );
        const chosen =
          (msg.targetId ? candidates.find((c) => c.id === msg.targetId) : candidates[0]) ?? candidates[0];
        if (!chosen) return;
        player.disguiseColor = chosen.color;
        player.disguiseName = chosen.name;
        player.disguiseTimer = BOHURUPI_DISGUISE_DURATION_SEC;
        player.abilityCooldown = BOHURUPI_COOLDOWN_SEC;
        broadcastRoom(room, { type: 'sfx:event', kind: 'disguise' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'Bohurupi Shapeshift',
          detail: `Disguised as ${chosen.name} for ${BOHURUPI_DISGUISE_DURATION_SEC}s!`,
        });
        broadcastRoom(room);
      }
      break;
    }
    case 'player:kill': {
      if (room.phase !== 'playing') return;
      const target = room.players.get(msg.targetId);
      if (!target) return;
      const check = canExecuteKill(player, target);
      if (!check.allowed) return;
      if (target.shielded) {
        target.shielded = false;
        player.killCooldownRemaining = 6;
        broadcastRoom(room, { type: 'sfx:event', kind: 'shield' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'Tabiz Shield Shattered!',
          detail: `${target.name} was protected by the Kobiraj!`,
        });
        const targetWs = room.clients.get(target.id);
        if (targetWs) {
          sendToSocket(targetWs, {
            type: 'clue:result',
            title: 'Tabiz Saved You!',
            detail: 'Ekjon Batpar attack korsilo, kintu tomar Tabiz shield bachay dise!',
          });
        }
        broadcastRoom(room);
        return;
      }
      target.alive = false;
      target.watchingCams = false;
      player.killCooldownRemaining = room.settings.killCooldownSec;
      player.x = target.x;
      player.z = target.z;
      room.bodies.push({
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
      broadcastRoom(room, { type: 'sfx:event', kind: 'kill' });
      if (!checkAndApplyWinCondition(room)) {
        broadcastRoom(room);
      }
      break;
    }
    case 'player:vent_toggle': {
      if (room.phase !== 'playing' || !canUseVent(player)) return;
      if (!player.inVent) {
        const nearVent = VENTS.find((v) => distance2D(player.x, player.z, v.x, v.z) <= VENT_RANGE);
        if (!nearVent) return;
        player.inVent = true;
        player.x = nearVent.x;
        player.z = nearVent.z;
        broadcastRoom(room, { type: 'sfx:event', kind: 'vent' });
      } else if (msg.destinationVentId) {
        const dest = resolveVentHopTarget(player.x, player.z, msg.destinationVentId);
        if (!dest) return;
        player.x = dest.x;
        player.z = dest.z;
        broadcastRoom(room, { type: 'sfx:event', kind: 'vent' });
      } else {
        player.inVent = false;
        if (player.specialRole === 'mistri') {
          player.abilityCooldown = MISTRI_VENT_COOLDOWN_SEC;
        }
        broadcastRoom(room, { type: 'sfx:event', kind: 'vent' });
      }
      broadcastRoom(room);
      break;
    }
    case 'player:sabotage': {
      if (room.phase !== 'playing' || !player.alive || player.role !== 'vondo') return;
      if (room.sabotage.active || room.sabotage.cooldownRemaining > 0) return;
      const target = SABOTAGE_TARGETS[msg.sabotageType];
      room.sabotage = {
        active: msg.sabotageType,
        timeRemaining: SABOTAGE_DURATION_SEC,
        fixStationX: target.x,
        fixStationZ: target.z,
        cooldownRemaining: SABOTAGE_COOLDOWN_SEC,
      };
      broadcastRoom(room, { type: 'sfx:event', kind: 'sabotage' });
      broadcastRoom(room);
      break;
    }
    case 'player:lock_doors': {
      if (room.phase !== 'playing' || !player.alive || player.role !== 'vondo') return;
      if (room.doorLocks.cooldownRemaining > 0) return;
      room.doorLocks[msg.zoneId] = DOOR_LOCK_DURATION_SEC;
      room.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
      broadcastRoom(room, { type: 'sfx:event', kind: 'door' });
      broadcastRoom(room);
      break;
    }
    case 'player:watch_cams': {
      if (room.phase !== 'playing') return;
      player.watchingCams = msg.watching;
      broadcastRoom(room);
      break;
    }
    case 'player:fix_sabotage': {
      if (room.phase !== 'playing' || !player.alive || !room.sabotage.active) return;
      const range = player.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
      if (
        distance2D(player.x, player.z, room.sabotage.fixStationX, room.sabotage.fixStationZ) <= range
      ) {
        room.sabotage.active = null;
        room.sabotage.timeRemaining = 0;
        sendToSocket(ws, { type: 'sfx:event', kind: 'task' });
        broadcastRoom(room);
      }
      break;
    }
    case 'player:report_body': {
      if (room.phase !== 'playing' || !player.alive) return;
      const body = room.bodies.find((b) => b.id === msg.bodyId && !b.reported);
      if (!body) return;
      body.reported = true;
      startMeeting(room, player, 'body', body.victimName);
      break;
    }
    case 'player:emergency_meeting': {
      if (
        room.phase !== 'playing' ||
        !player.alive ||
        room.sabotage.active ||
        room.emergencyCooldownRemaining > 0 ||
        player.emergencyMeetingsLeft <= 0
      ) {
        return;
      }
      if (distance2D(player.x, player.z, EMERGENCY_BELL_POS.x, EMERGENCY_BELL_POS.z) <= EMERGENCY_BELL_POS.interactRadius) {
        player.emergencyMeetingsLeft--;
        startMeeting(room, player, 'emergency');
      }
      break;
    }
    case 'meeting:chat': {
      if (room.phase !== 'meeting') return;
      const text = msg.text.trim().slice(0, 140);
      if (!text) return;
      room.chat.push({
        id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        senderId: player.id,
        senderName: player.alive ? player.name : `${player.name} (Ghost)`,
        senderColor: player.color,
        text,
        timestamp: Date.now(),
        ghostOnly: !player.alive,
      });
      broadcastRoom(room);
      break;
    }
    case 'meeting:vote': {
      if (room.phase !== 'meeting' || !player.alive || player.hasVoted) return;
      player.votedFor = msg.targetId;
      player.hasVoted = true;
      broadcastRoom(room);
      break;
    }
    case 'player:meme_sfx': {
      const allowed = new Set(['vine_boom', 'bonk', 'sad_trombone', 'airhorn', 'dun_dun', 'chubani']);
      if (allowed.has(msg.memeId)) {
        broadcastRoom(room, { type: 'meme:play', memeId: msg.memeId });
      }
      break;
    }
    case 'room:play_again': {
      if (!player.isHost) return;
      room.phase = 'lobby';
      room.bodies = [];
      room.footprints = [];
      room.outcome = null;
      room.ejection = null;
      room.justEjectedPlayer = null;
      room.doorLocks = makeEmptyDoorLocks();
      for (const p of room.players.values()) {
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
      broadcastRoom(room);
      break;
    }
  }
}

async function bootstrap(): Promise<void> {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      handleSocketMessage(ws, String(data));
    });
    ws.on('close', () => {
      const ref = socketToPlayer.get(ws);
      socketToPlayer.delete(ws);
      if (!ref) return;
      const room = rooms.get(ref.roomCode);
      if (!room) return;
      const wasHost = room.players.get(ref.playerId)?.isHost ?? false;
      room.clients.delete(ref.playerId);
      room.players.delete(ref.playerId);

      if (room.clients.size === 0) {
        rooms.delete(room.code);
        return;
      }
      if (wasHost) {
        const nextHuman = Array.from(room.players.values()).find((p) => !p.isBot);
        if (nextHuman) nextHuman.isHost = true;
      }
      broadcastRoom(room);
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ke Batpar server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
