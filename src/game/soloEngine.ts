import {
  PLAYER_COLORS,
  type DoorZoneId,
  type PlayerColorId,
  type PlayerState,
  type RoomSettings,
  type RoomSnapshot,
  type SabotageType,
  type SpecialRole,
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
  canCompleteTasks,
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
  sanitizeSoloConfig,
  tallyVotes,
} from '../shared/gameRules';
import { soundEngine } from '../audio/soundEngine';

const BOT_ROSTER = [
  { name: 'Chacha Miah', color: 'holud' as PlayerColorId },
  { name: 'Babu Bhai', color: 'neel' as PlayerColorId },
  { name: 'Tuktuki Apa', color: 'beguni' as PlayerColorId },
  { name: 'Pintu Da', color: 'shobuj' as PlayerColorId },
  { name: 'Komola Kaku', color: 'komola' as PlayerColorId },
  { name: 'Kalo Ustad', color: 'kalo' as PlayerColorId },
  { name: 'Sada Dada', color: 'sada' as PlayerColorId },
];

const BOT_CHAT_LINES = [
  'Bhai ami toh Cha-er dokan e shingara khaitasilam, kasam!',
  'Orey Batpar! Gap e niye kaure size kore dise re!',
  'DESCO er fuse box er pashe ke jeno douraisilo, onek sus!',
  'Ami 100% innocent Para-basi, amar shoshur bari eidgah er pashe!',
  'Rickshaw garage e keu chilo? Dren er moddhe uki martasilo!',
  'Current gelo ar amader matha ghuray gelo bhai!',
  'Ektu thik kore bolen toh, aajke ke Batpar?',
  'Ami Fuchka Chottor e tetul tok khaitasilam, shobai shakkhi!',
  'Hero Saloon e chul katte gesilam, keu amake fashayen na!',
  'Para Cricket Math er dugout er piche keu chup kore chilo!',
  'Dadu Pharmacy te Napa ante gesilam bhai, amar kache bill ache!',
  'Biyer Bari Pandal er DJ sound e kichu shuni nai, Batpar okhane chilo!',
];

const PAGOL_CHAT_LINES = [
  'Hehe ami toh kichui kori nai, amake Pukur e chubani diyen na pls!',
  'Ami shudhu pukur ghat e mach dhortesilam bhai, kothao jai nai!',
  'Amake size korle kintu shobai milia afsos korben bhaiya!',
];

interface BotBrain {
  wpIdx: number;
  pauseTimer: number;
  voteTimer: number;
  chatted: boolean;
}

export class SoloMatchEngine {
  public localPlayerId = 'local_hero';
  private snapshot: RoomSnapshot;
  private brains = new Map<string, BotBrain>();
  private phaseTimer = 0;
  private footprintAccum = new Map<string, number>();
  private justEjectedPlayer: PlayerState | null = null;
  public onClueNotice?: (title: string, detail: string) => void;

  constructor(
    playerName: string,
    playerColor: PlayerColorId,
    forceRole?: 'parabasi' | 'vondo',
    skipRoleReveal = false,
    forceSpecialRole?: SpecialRole,
    onClueNotice?: (title: string, detail: string) => void,
    customSettings?: Partial<RoomSettings>,
    requestedPlayerCount: number = 7,
  ) {
    this.onClueNotice = onClueNotice;
    const cleanName = playerName.trim() || 'Lal Mia';
    const { playerCount, settings } = sanitizeSoloConfig(requestedPlayerCount, customSettings);
    const pickedOthers = BOT_ROSTER.filter((b) => b.color !== playerColor).slice(0, playerCount - 1);

    const rawPlayers: PlayerState[] = [
      {
        id: this.localPlayerId,
        name: cleanName,
        color: playerColor,
        x: SPAWN_RING[0].x,
        z: SPAWN_RING[0].z,
        vx: 0,
        vz: 0,
        yaw: SPAWN_RING[0].yaw,
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
        isHost: true,
        tasks: [],
        killCooldownRemaining: 0,
        emergencyMeetingsLeft: settings.emergencyMeetingsPerPlayer,
        revivesLeft: 0,
        votedFor: null,
        hasVoted: false,
      },
      ...pickedOthers.map((b, i) => ({
        id: `bot_${i + 1}`,
        name: b.name,
        color: b.color,
        x: SPAWN_RING[(i + 1) % SPAWN_RING.length].x,
        z: SPAWN_RING[(i + 1) % SPAWN_RING.length].z,
        vx: 0,
        vz: 0,
        yaw: SPAWN_RING[(i + 1) % SPAWN_RING.length].yaw,
        role: 'parabasi' as const,
        specialRole: 'none' as const,
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
        emergencyMeetingsLeft: settings.emergencyMeetingsPerPlayer,
        revivesLeft: 0,
        votedFor: null,
        hasVoted: false,
      })),
    ];

    const effectiveBaseRole =
      forceSpecialRole === 'bohurupi' || forceSpecialRole === 'jharudar'
        ? 'vondo'
        : forceSpecialRole && forceSpecialRole !== 'none'
          ? 'parabasi'
          : forceRole;

    let assigned = assignRoles(rawPlayers, settings.vondoCount);
    if (effectiveBaseRole) {
      assigned = assigned.map((p, idx) => ({
        ...p,
        role:
          effectiveBaseRole === 'vondo'
            ? idx === 0
              ? 'vondo'
              : 'parabasi'
            : idx === 1
              ? 'vondo'
              : 'parabasi',
      }));
    }

    assigned = assignSpecialRoles(
      assigned,
      settings.enableSpecialRoles,
      forceSpecialRole,
      this.localPlayerId,
    );

    for (const p of assigned) {
      p.tasks =
        canCompleteTasks(p)
          ? createPlayerTasks(settings.tasksPerPlayer)
          : [];
      p.killCooldownRemaining = p.role === 'vondo' ? Math.min(12, settings.killCooldownSec) : 0;
      p.abilityCooldown =
        p.specialRole === 'bohurupi' ||
        p.specialRole === 'kobiraj' ||
        p.specialRole === 'daroga' ||
        p.specialRole === 'jharudar'
          ? 6
          : 0;
      p.revivesLeft = p.specialRole === 'daktar' ? 1 : 0;
      if (p.specialRole === 'neta') {
        p.emergencyMeetingsLeft = settings.emergencyMeetingsPerPlayer + 1;
      }
      if (p.isBot) {
        this.brains.set(p.id, {
          wpIdx: Math.floor(Math.random() * BOT_WAYPOINTS.length),
          pauseTimer: 0.4 + Math.random() * 1.2,
          voteTimer: 2 + Math.random() * 4,
          chatted: false,
        });
      }
    }

    const stats = computeTaskProgress(assigned);

    this.snapshot = {
      roomCode: 'SOLO',
      phase: skipRoleReveal ? 'playing' : 'role_reveal',
      players: assigned,
      bodies: [],
      footprints: [],
      sabotage: {
        active: null,
        timeRemaining: 0,
        fixStationX: 0,
        fixStationZ: 0,
        cooldownRemaining: 10,
      },
      doorLocks: {
        cha_dokan: 0,
        rickshaw_garage: 0,
        desco_power: 0,
        dish_roof: 0,
        cooldownRemaining: 0,
      },
      chat: [
        {
          id: 'sys_start',
          senderId: 'system',
          senderName: 'Moholla Announcement',
          senderColor: 'holud',
          text: settings.enableSpecialRoles
            ? 'Khela shuru! Special Moholla roles are active — watch out for Goyenda, Kobiraj, Mistri, Bohurupi & Pagol!'
            : 'Khela shuru! Classic Moholla match — finish Para tasks or expose the Batpar in Shalish!',
          timestamp: Date.now(),
          system: true,
        },
      ],
      meetingCallerId: null,
      meetingReason: null,
      meetingTimer: 0,
      emergencyCooldownRemaining: skipRoleReveal ? 0 : settings.emergencyCooldownSec,
      ejection: null,
      outcome: null,
      settings: { ...settings },
      taskProgress: stats.progress,
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
    };

    this.phaseTimer = skipRoleReveal ? 0 : 2.6;
    const lp = assigned.find((p) => p.id === this.localPlayerId);
    if (!skipRoleReveal && lp) {
      soundEngine.playRoleReveal(lp.role === 'vondo');
    }
  }

  public dismissRoleReveal(): void {
    if (this.snapshot.phase === 'role_reveal') {
      this.snapshot.phase = 'playing';
      this.phaseTimer = 0;
    }
  }

  public getSnapshot(): RoomSnapshot {
    const stats = computeTaskProgress(this.snapshot.players);
    return {
      ...this.snapshot,
      players: this.snapshot.players.map((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t })) })),
      bodies: this.snapshot.bodies.map((b) => ({ ...b })),
      footprints: this.snapshot.footprints.map((f) => ({ ...f })),
      sabotage: { ...this.snapshot.sabotage },
      doorLocks: { ...this.snapshot.doorLocks },
      chat: [...this.snapshot.chat],
      meetingTimer: Math.max(0, Math.ceil(this.snapshot.meetingTimer)),
      emergencyCooldownRemaining: Math.max(0, Math.ceil(this.snapshot.emergencyCooldownRemaining)),
      taskProgress: stats.progress,
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
    };
  }

  private recordFootprint(p: PlayerState, distMoved: number): void {
    if (!p.alive || p.inVent || distMoved < 0.05) return;
    const prev = (this.footprintAccum.get(p.id) ?? 0) + distMoved;
    if (prev >= 2.2) {
      this.footprintAccum.set(p.id, 0);
      const shownColor = p.disguiseColor ?? p.color;
      this.snapshot.footprints.push({
        id: `fp_${Date.now()}_${p.id}_${Math.random().toString(36).slice(2, 5)}`,
        x: p.x,
        z: p.z,
        color: shownColor,
        expiresAt: Date.now() + 7500,
      });
      if (this.snapshot.footprints.length > 36) {
        this.snapshot.footprints.shift();
      }
    } else {
      this.footprintAccum.set(p.id, prev);
    }
  }

  public moveLocal(x: number, z: number, vx: number, vz: number, yaw: number): void {
    if (this.snapshot.phase !== 'playing') return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || lp.inVent) return;
    const resolved = lp.alive
      ? resolveCircleWallCollision(x, z, PLAYER_RADIUS, WALLS, this.snapshot.doorLocks)
      : { x, z };
    const moved = Math.hypot(resolved.x - lp.x, resolved.z - lp.z);
    lp.x = resolved.x;
    lp.z = resolved.z;
    lp.vx = vx;
    lp.vz = vz;
    lp.yaw = yaw;
    this.recordFootprint(lp, moved);
  }

  public setWatchingCams(watching: boolean): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (lp) lp.watchingCams = watching;
  }

  public completeLocalTask(taskId: string): boolean {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || lp.role !== 'parabasi' || lp.specialRole === 'pagol') return false;
    const st = TASK_STATIONS.find((s) => s.id === taskId);
    if (!st || distance2D(lp.x, lp.z, st.x, st.z) > st.radius + 1.5) return false;
    const t = lp.tasks.find((item) => item.taskId === taskId);
    if (t && !t.completed) {
      t.completed = true;
      if (st.isVisual && this.snapshot.settings.visualTasks) {
        lp.visualTaskTimer = 2.8;
      }
      soundEngine.playTaskComplete();
      this.checkWin();
      return true;
    }
    return false;
  }

  public useSpecialAbility(targetId?: string): void {
    if (this.snapshot.phase !== 'playing') return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || lp.inVent) return;

    if (lp.specialRole === 'goyenda') {
      const body = findNearestInspectableBody(lp, this.snapshot.bodies);
      if (!body) {
        this.onClueNotice?.('Goyenda Scanner', 'Move near a fallen neighbor body to scan forensic clues.');
        return;
      }
      const clue = inspectBodyClue(body, Date.now());
      soundEngine.playClueScan();
      this.onClueNotice?.(clue.title, clue.detail);
      this.snapshot.chat.push({
        id: `clue_${Date.now()}`,
        senderId: 'system',
        senderName: 'Goyenda Notebook',
        senderColor: 'neel',
        text: `[${clue.title}] ${clue.detail}`,
        timestamp: Date.now(),
        system: true,
      });
      return;
    }

    if (lp.specialRole === 'kobiraj') {
      if (lp.abilityCooldown > 0.05) return;
      const nearby = targetId
        ? this.snapshot.players.find((p) => p.id === targetId && p.alive && !p.inVent)
        : findNearestShieldTarget(lp, this.snapshot.players);
      const receiver = nearby ?? (!lp.shielded ? lp : null);
      if (!receiver) return;
      receiver.shielded = true;
      lp.abilityCooldown = KOBIRAJ_COOLDOWN_SEC;
      soundEngine.playShieldBlock();
      this.onClueNotice?.(
        'Tabiz Shield Active',
        receiver.id === lp.id
          ? 'You placed a protective Tabiz shield on yourself!'
          : `Protected ${receiver.name} with a Kobiraj Tabiz shield!`,
      );
      return;
    }

    if (lp.specialRole === 'bohurupi') {
      if (lp.disguiseTimer > 0 && (!targetId || targetId === lp.id)) {
        lp.disguiseColor = null;
        lp.disguiseName = null;
        lp.disguiseTimer = 0;
        soundEngine.playDisguise();
        return;
      }
      if (lp.abilityCooldown > 0.05) return;
      const candidates = this.snapshot.players.filter(
        (p) => p.alive && p.id !== lp.id && p.role !== 'vondo',
      );
      const chosen =
        (targetId ? candidates.find((c) => c.id === targetId) : candidates[0]) ?? candidates[0];
      if (!chosen) return;
      lp.disguiseColor = chosen.color;
      lp.disguiseName = chosen.name;
      lp.disguiseTimer = BOHURUPI_DISGUISE_DURATION_SEC;
      lp.abilityCooldown = BOHURUPI_COOLDOWN_SEC;
      soundEngine.playDisguise();
      this.onClueNotice?.(
        'Bohurupi Shapeshift',
        `Disguised as ${chosen.name} for ${BOHURUPI_DISGUISE_DURATION_SEC}s!`,
      );
      return;
    }

    if (lp.specialRole === 'daroga') {
      if (lp.abilityCooldown > 0.05) return;
      const target = targetId
        ? this.snapshot.players.find((p) => p.id === targetId)
        : findNearestDarogaTarget(lp, this.snapshot.players);
      if (!target) {
        this.onClueNotice?.('Para Daroga', 'Move close to a suspect to make an Arrest Shot!');
        return;
      }
      const res = resolveDarogaShot(lp, target);
      if (!res.allowed) return;
      soundEngine.playDarogaShot();
      if (res.hitVondo) {
        target.alive = false;
        target.watchingCams = false;
        lp.abilityCooldown = DAROGA_COOLDOWN_SEC;
        this.snapshot.bodies.push({
          id: `body_${Date.now()}_${target.id}`,
          victimId: target.id,
          victimName: target.name,
          color: target.color,
          x: target.x,
          z: target.z,
          reported: false,
          killedAt: Date.now(),
          killerColorHint: getColorShadeHint(lp.color),
          killerZoneHint: getZoneNameAt(target.x, target.z),
        });
        this.onClueNotice?.(
          'Daroga Bullseye!',
          `${target.name} CHILO ASLI BATPAR! Size kore diso!`,
        );
      } else {
        lp.alive = false;
        lp.watchingCams = false;
        this.snapshot.bodies.push({
          id: `body_${Date.now()}_${lp.id}`,
          victimId: lp.id,
          victimName: lp.name,
          color: lp.color,
          x: lp.x,
          z: lp.z,
          reported: false,
          killedAt: Date.now(),
          killerColorHint: getColorShadeHint(lp.color),
          killerZoneHint: getZoneNameAt(lp.x, lp.z),
        });
        this.onClueNotice?.(
          'Daroga Misfire!',
          `${target.name} niraparadh Para-basi chilo! Ulto tomar job gelo!`,
        );
      }
      this.checkWin();
      return;
    }

    if (lp.specialRole === 'daktar') {
      if ((lp.revivesLeft ?? 0) <= 0) return;
      const body = findNearestRevivableBody(lp, this.snapshot.bodies);
      if (!body) {
        this.onClueNotice?.('Para Daktar', 'Move near an unreported fallen body to apply Saline!');
        return;
      }
      const victim = this.snapshot.players.find((p) => p.id === body.victimId);
      if (!victim) return;
      this.snapshot.bodies = this.snapshot.bodies.filter((b) => b.id !== body.id);
      victim.alive = true;
      victim.x = body.x;
      victim.z = body.z;
      lp.revivesLeft = Math.max(0, (lp.revivesLeft ?? 1) - 1);
      lp.abilityCooldown = 10;
      soundEngine.playRevive();
      this.onClueNotice?.(
        'Saline Revive Success!',
        `${victim.name} ke Para Daktar bachaye tulsen!`,
      );
      return;
    }

    if (lp.specialRole === 'jharudar') {
      if (lp.abilityCooldown > 0.05) return;
      const body = findNearestCleanableBody(lp, this.snapshot.bodies);
      if (!body) {
        this.onClueNotice?.('Safai Batpar', 'Move near an unreported fallen body to clean it!');
        return;
      }
      this.snapshot.bodies = this.snapshot.bodies.filter((b) => b.id !== body.id);
      lp.abilityCooldown = JHARUDAR_CLEAN_COOLDOWN_SEC;
      soundEngine.playCleanBody();
      this.onClueNotice?.(
        'Lash Gayeb!',
        `Cleaned ${body.victimName}'s body — nobody can report it now!`,
      );
    }
  }

  public triggerKill(targetId: string): boolean {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    const target = this.snapshot.players.find((p) => p.id === targetId);
    if (!lp || !target) return false;
    const check = canExecuteKill(lp, target);
    if (!check.allowed) return false;

    if (target.shielded) {
      target.shielded = false;
      lp.killCooldownRemaining = 6;
      soundEngine.playShieldBlock();
      this.onClueNotice?.(
        'Tabiz Shield Shattered!',
        `${target.name} was protected by the Kobiraj's Tabiz! Strike blocked!`,
      );
      return false;
    }

    target.alive = false;
    target.watchingCams = false;
    lp.killCooldownRemaining = this.snapshot.settings.killCooldownSec;
    lp.x = target.x;
    lp.z = target.z;
    this.snapshot.bodies.push({
      id: `body_${Date.now()}`,
      victimId: target.id,
      victimName: target.name,
      color: target.color,
      x: target.x,
      z: target.z,
      reported: false,
      killedAt: Date.now(),
      killerColorHint: getColorShadeHint(lp.color),
      killerZoneHint: getZoneNameAt(target.x, target.z),
    });
    soundEngine.playKill();
    this.checkWin();
    return true;
  }

  public toggleVent(destinationVentId?: string): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !canUseVent(lp)) return;
    if (!lp.inVent) {
      const near = VENTS.find((v) => distance2D(lp.x, lp.z, v.x, v.z) <= VENT_RANGE);
      if (!near) return;
      lp.inVent = true;
      lp.x = near.x;
      lp.z = near.z;
      soundEngine.playVent();
    } else if (destinationVentId) {
      const dest = resolveVentHopTarget(lp.x, lp.z, destinationVentId);
      if (dest) {
        lp.x = dest.x;
        lp.z = dest.z;
        soundEngine.playVent();
      }
    } else {
      lp.inVent = false;
      if (lp.specialRole === 'mistri') {
        lp.abilityCooldown = MISTRI_VENT_COOLDOWN_SEC;
      }
      soundEngine.playVent();
    }
  }

  public triggerSabotage(type: SabotageType): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || lp.role !== 'vondo') return;
    if (this.snapshot.sabotage.active || this.snapshot.sabotage.cooldownRemaining > 0) return;
    const t = SABOTAGE_TARGETS[type];
    this.snapshot.sabotage = {
      active: type,
      timeRemaining: SABOTAGE_DURATION_SEC,
      fixStationX: t.x,
      fixStationZ: t.z,
      cooldownRemaining: SABOTAGE_COOLDOWN_SEC,
    };
    soundEngine.playSabotage();
  }

  public lockDoors(zoneId: DoorZoneId): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || lp.role !== 'vondo') return;
    if (this.snapshot.doorLocks.cooldownRemaining > 0) return;
    this.snapshot.doorLocks[zoneId] = DOOR_LOCK_DURATION_SEC;
    this.snapshot.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
    soundEngine.playDoorSlam();
  }

  public fixSabotage(): boolean {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || !this.snapshot.sabotage.active) return false;
    const range = lp.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
    if (
      distance2D(lp.x, lp.z, this.snapshot.sabotage.fixStationX, this.snapshot.sabotage.fixStationZ) <= range
    ) {
      this.snapshot.sabotage.active = null;
      this.snapshot.sabotage.timeRemaining = 0;
      soundEngine.playTaskComplete();
      return true;
    }
    return false;
  }

  public reportBody(bodyId: string): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    const body = this.snapshot.bodies.find((b) => b.id === bodyId && !b.reported);
    if (!lp || !lp.alive || !body) return;
    body.reported = true;
    this.startMeeting(lp, 'body', body.victimName);
  }

  public callEmergencyMeeting(): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (
      !lp ||
      !lp.alive ||
      this.snapshot.sabotage.active ||
      this.snapshot.emergencyCooldownRemaining > 0 ||
      lp.emergencyMeetingsLeft <= 0
    ) {
      return;
    }
    if (distance2D(lp.x, lp.z, EMERGENCY_BELL_POS.x, EMERGENCY_BELL_POS.z) <= EMERGENCY_BELL_POS.interactRadius) {
      lp.emergencyMeetingsLeft--;
      this.startMeeting(lp, 'emergency');
    }
  }

  public sendChat(text: string): void {
    if (this.snapshot.phase !== 'meeting') return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp) return;
    const clean = text.trim().slice(0, 140);
    if (!clean) return;
    this.snapshot.chat.push({
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      senderId: lp.id,
      senderName: lp.alive ? lp.name : `${lp.name} (Ghost)`,
      senderColor: lp.color,
      text: clean,
      timestamp: Date.now(),
      ghostOnly: !lp.alive,
    });
  }

  public castVote(targetId: string | 'skip'): void {
    if (this.snapshot.phase !== 'meeting') return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || lp.hasVoted) return;
    lp.votedFor = targetId;
    lp.hasVoted = true;
    soundEngine.playVoteClick();
  }

  private startMeeting(caller: PlayerState, reason: 'body' | 'emergency', victimName?: string): void {
    if (this.snapshot.phase !== 'playing') return;
    this.snapshot.phase = 'meeting';
    this.snapshot.meetingCallerId = caller.id;
    this.snapshot.meetingReason = reason;
    this.snapshot.meetingTimer = this.snapshot.settings.meetingTimeSec;
    this.snapshot.sabotage.active = null;
    this.snapshot.sabotage.timeRemaining = 0;
    this.snapshot.footprints = [];
    this.justEjectedPlayer = null;
    this.snapshot.doorLocks = {
      cha_dokan: 0,
      rickshaw_garage: 0,
      desco_power: 0,
      dish_roof: 0,
      cooldownRemaining: 0,
    };

    for (const p of this.snapshot.players) {
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

    for (const b of this.brains.values()) {
      b.voteTimer = 1.6 + Math.random() * 3.8;
      b.chatted = false;
    }

    this.snapshot.chat.push({
      id: `sys_${Date.now()}`,
      senderId: 'system',
      senderName: 'Moholla Shalish',
      senderColor: 'holud',
      text:
        reason === 'body'
          ? `Haire! ${caller.name} dekhlo ${victimName ?? 'ekjon'} size hoye gese! Urgent Shalish!`
          : `${caller.name} Shalish er ghonta bajay dise!`,
      timestamp: Date.now(),
      system: true,
    });
    soundEngine.playMeetingBell(reason);
  }

  private resolveVotes(): void {
    const ejection = tallyVotes(this.snapshot.players, this.snapshot.settings.confirmEjects);
    this.snapshot.ejection = ejection;
    this.snapshot.phase = 'vote_results';
    this.phaseTimer = 2.6;
    soundEngine.playVoteClick();
  }

  private checkWin(sabotageExpired = false): boolean {
    const stats = computeTaskProgress(this.snapshot.players);
    const outcome = evaluateMatchOutcome(
      this.snapshot.players,
      stats.progress,
      sabotageExpired,
      this.justEjectedPlayer,
    );
    if (outcome) {
      this.snapshot.outcome = outcome;
      this.snapshot.phase = 'gameover';
      const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
      const localWon =
        outcome.winner === 'pagol'
          ? lp?.specialRole === 'pagol' && outcome.winnerPlayerId === lp.id
          : lp?.role === outcome.winner && lp?.specialRole !== 'pagol';
      soundEngine.playOutcome(Boolean(localWon));
      return true;
    }
    return false;
  }

  public step(dt: number): void {
    if (this.snapshot.phase === 'role_reveal') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.snapshot.phase = 'playing';
      }
      return;
    }

    if (this.snapshot.phase === 'playing') {
      const now = Date.now();
      this.snapshot.footprints = this.snapshot.footprints.filter((f) => f.expiresAt > now);

      for (const p of this.snapshot.players) {
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
      if (this.snapshot.emergencyCooldownRemaining > 0) {
        this.snapshot.emergencyCooldownRemaining = Math.max(0, this.snapshot.emergencyCooldownRemaining - dt);
      }
      if (this.snapshot.sabotage.cooldownRemaining > 0) {
        this.snapshot.sabotage.cooldownRemaining = Math.max(0, this.snapshot.sabotage.cooldownRemaining - dt);
      }
      if (this.snapshot.doorLocks.cooldownRemaining > 0) {
        this.snapshot.doorLocks.cooldownRemaining = Math.max(0, this.snapshot.doorLocks.cooldownRemaining - dt);
      }
      this.snapshot.doorLocks.cha_dokan = Math.max(0, this.snapshot.doorLocks.cha_dokan - dt);
      this.snapshot.doorLocks.rickshaw_garage = Math.max(0, this.snapshot.doorLocks.rickshaw_garage - dt);
      this.snapshot.doorLocks.desco_power = Math.max(0, this.snapshot.doorLocks.desco_power - dt);
      this.snapshot.doorLocks.dish_roof = Math.max(0, this.snapshot.doorLocks.dish_roof - dt);

      if (this.snapshot.sabotage.active) {
        this.snapshot.sabotage.timeRemaining -= dt;
        if (this.snapshot.sabotage.timeRemaining <= 0) {
          this.checkWin(true);
          return;
        }
      }

      for (const p of this.snapshot.players) {
        if (!p.isBot || !p.alive) continue;
        const brain = this.brains.get(p.id);
        if (!brain) continue;

        // Bot Jharudar sweeps nearby unreported body instead of reporting
        if (p.specialRole === 'jharudar' && p.abilityCooldown <= 0.05) {
          const cleanTarget = findNearestCleanableBody(p, this.snapshot.bodies);
          if (cleanTarget && Math.random() < 0.14) {
            this.snapshot.bodies = this.snapshot.bodies.filter((b) => b.id !== cleanTarget.id);
            p.abilityCooldown = JHARUDAR_CLEAN_COOLDOWN_SEC;
            continue;
          }
        }

        // Bot Daktar revives nearby unreported body once
        if (p.specialRole === 'daktar' && (p.revivesLeft ?? 0) > 0) {
          const revBody = findNearestRevivableBody(p, this.snapshot.bodies);
          if (revBody && Math.random() < 0.16) {
            const victim = this.snapshot.players.find((pl) => pl.id === revBody.victimId);
            if (victim) {
              this.snapshot.bodies = this.snapshot.bodies.filter((b) => b.id !== revBody.id);
              victim.alive = true;
              victim.x = revBody.x;
              victim.z = revBody.z;
              p.revivesLeft = 0;
              soundEngine.playRevive();
              continue;
            }
          }
        }

        const body = findNearestReportableBody(p, this.snapshot.bodies);
        if (body && (p.role === 'parabasi' || (p.specialRole !== 'jharudar' && Math.random() < 0.03))) {
          body.reported = true;
          this.startMeeting(p, 'body', body.victimName);
          return;
        }

        // Bot Kobiraj occasionally shields a nearby ally
        if (p.specialRole === 'kobiraj' && p.abilityCooldown <= 0.05) {
          const ally = findNearestShieldTarget(p, this.snapshot.players);
          if (ally && Math.random() < 0.04) {
            ally.shielded = true;
            p.abilityCooldown = KOBIRAJ_COOLDOWN_SEC;
          }
        }

        // Bot Bohurupi occasionally disguises before hunting
        if (p.specialRole === 'bohurupi' && p.abilityCooldown <= 0.05 && Math.random() < 0.008) {
          const disguises = this.snapshot.players.filter((o) => o.alive && o.role !== 'vondo');
          if (disguises.length > 0) {
            const pick = disguises[Math.floor(Math.random() * disguises.length)];
            p.disguiseColor = pick.color;
            p.disguiseName = pick.name;
            p.disguiseTimer = BOHURUPI_DISGUISE_DURATION_SEC;
            p.abilityCooldown = BOHURUPI_COOLDOWN_SEC;
          }
        }

        // Bot Batpar occasionally triggers sabotage or door shutter lock
        if (p.role === 'vondo') {
          if (
            !this.snapshot.sabotage.active &&
            this.snapshot.sabotage.cooldownRemaining <= 0 &&
            Math.random() < 0.005
          ) {
            const sabType: SabotageType = Math.random() < 0.55 ? 'loadshedding' : 'wifi_down';
            const t = SABOTAGE_TARGETS[sabType];
            this.snapshot.sabotage = {
              active: sabType,
              timeRemaining: SABOTAGE_DURATION_SEC,
              fixStationX: t.x,
              fixStationZ: t.z,
              cooldownRemaining: SABOTAGE_COOLDOWN_SEC,
            };
            soundEngine.playSabotage();
          } else if (this.snapshot.doorLocks.cooldownRemaining <= 0 && Math.random() < 0.004) {
            const zones: DoorZoneId[] = ['cha_dokan', 'rickshaw_garage', 'desco_power', 'dish_roof'];
            const zPick = zones[Math.floor(Math.random() * zones.length)];
            this.snapshot.doorLocks[zPick] = DOOR_LOCK_DURATION_SEC;
            this.snapshot.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
            soundEngine.playDoorSlam();
          }
        }

        // Bot Para-basi helps fix active sabotage if nearby
        if (
          this.snapshot.sabotage.active &&
          p.role === 'parabasi' &&
          p.specialRole !== 'pagol' &&
          distance2D(
            p.x,
            p.z,
            this.snapshot.sabotage.fixStationX,
            this.snapshot.sabotage.fixStationZ,
          ) <= SABOTAGE_FIX_RANGE &&
          Math.random() < 0.06
        ) {
          this.snapshot.sabotage.active = null;
          this.snapshot.sabotage.timeRemaining = 0;
          soundEngine.playTaskComplete();
        }

        if (p.role === 'vondo' && p.killCooldownRemaining <= 0) {
          const victim = findNearestKillTarget(p, this.snapshot.players);
          if (victim && Math.random() < 0.08) {
            const check = canExecuteKill(p, victim);
            if (check.allowed) {
              if (victim.shielded) {
                victim.shielded = false;
                p.killCooldownRemaining = 6;
                soundEngine.playShieldBlock();
                if (victim.id === this.localPlayerId) {
                  this.onClueNotice?.(
                    'Tabiz Saved You!',
                    'Ekjon Batpar tomake gap e nite chaisilo, kintu Tabiz Babar shield bachay dise!',
                  );
                }
              } else {
                victim.alive = false;
                victim.watchingCams = false;
                p.killCooldownRemaining = this.snapshot.settings.killCooldownSec;
                this.snapshot.bodies.push({
                  id: `body_${Date.now()}_${victim.id}`,
                  victimId: victim.id,
                  victimName: victim.name,
                  color: victim.color,
                  x: victim.x,
                  z: victim.z,
                  reported: false,
                  killedAt: Date.now(),
                  killerColorHint: getColorShadeHint(p.color),
                  killerZoneHint: getZoneNameAt(victim.x, victim.z),
                });
                soundEngine.playKill();
                if (this.checkWin()) return;
              }
            }
          }
        }

        if (brain.pauseTimer > 0) {
          brain.pauseTimer -= dt;
          p.vx = 0;
          p.vz = 0;
          if (brain.pauseTimer <= 0 && p.role === 'parabasi' && p.specialRole !== 'pagol') {
            const undone = p.tasks.find((t) => !t.completed);
            if (undone && Math.random() < 0.48) {
              undone.completed = true;
              if (this.checkWin()) return;
            }
          }
        } else {
          const rushSabotage =
            Boolean(this.snapshot.sabotage.active) &&
            p.role === 'parabasi' &&
            p.specialRole !== 'pagol' &&
            (brain.wpIdx % 2 === 0);
          const targetPt = rushSabotage
            ? {
                x: this.snapshot.sabotage.fixStationX,
                z: this.snapshot.sabotage.fixStationZ,
              }
            : BOT_WAYPOINTS[brain.wpIdx % BOT_WAYPOINTS.length];
          const dx = targetPt.x - p.x;
          const dz = targetPt.z - p.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.9) {
            brain.pauseTimer = 1.4 + Math.random() * 2.4;
            brain.wpIdx = Math.floor(Math.random() * BOT_WAYPOINTS.length);
            p.vx = 0;
            p.vz = 0;
          } else {
            const spd = this.snapshot.settings.moveSpeed * 0.72;
            p.vx = (dx / dist) * spd;
            p.vz = (dz / dist) * spd;
            p.yaw = Math.atan2(p.vx, p.vz);
            const res = resolveCircleWallCollision(
              p.x + p.vx * dt,
              p.z + p.vz * dt,
              PLAYER_RADIUS,
              WALLS,
              this.snapshot.doorLocks,
            );
            const moved = Math.hypot(res.x - p.x, res.z - p.z);
            p.x = res.x;
            p.z = res.z;
            this.recordFootprint(p, moved);
          }
        }
      }
    } else if (this.snapshot.phase === 'meeting') {
      this.snapshot.meetingTimer = Math.max(0, this.snapshot.meetingTimer - dt);

      for (const p of this.snapshot.players) {
        if (!p.isBot || !p.alive) continue;
        const brain = this.brains.get(p.id);
        if (!brain) continue;

        if (!brain.chatted && Math.random() < 0.03) {
          brain.chatted = true;
          const pool = p.specialRole === 'pagol' ? PAGOL_CHAT_LINES : BOT_CHAT_LINES;
          this.snapshot.chat.push({
            id: `chat_${Date.now()}_${p.id}`,
            senderId: p.id,
            senderName: p.name,
            senderColor: p.color,
            text: pool[Math.floor(Math.random() * pool.length)],
            timestamp: Date.now(),
          });
        }

        if (!p.hasVoted) {
          brain.voteTimer -= dt;
          if (brain.voteTimer <= 0) {
            const candidates = this.snapshot.players.filter((pl) => pl.alive && pl.id !== p.id);
            p.votedFor =
              candidates.length > 0 && Math.random() < 0.65
                ? candidates[Math.floor(Math.random() * candidates.length)].id
                : 'skip';
            p.hasVoted = true;
          }
        }
      }

      const alive = this.snapshot.players.filter((p) => p.alive);
      if (alive.every((p) => p.hasVoted) || this.snapshot.meetingTimer <= 0) {
        this.resolveVotes();
      }
    } else if (this.snapshot.phase === 'vote_results') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.justEjectedPlayer = null;
        if (this.snapshot.ejection?.ejectedId) {
          const target = this.snapshot.players.find((p) => p.id === this.snapshot.ejection?.ejectedId);
          if (target) {
            target.alive = false;
            this.justEjectedPlayer = target;
            soundEngine.playEject();
          }
        }
        this.snapshot.bodies = [];
        this.snapshot.phase = 'ejecting';
        this.phaseTimer = 4.2;
      }
    } else if (this.snapshot.phase === 'ejecting') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (!this.checkWin()) {
          this.justEjectedPlayer = null;
          this.snapshot.players.forEach((p, idx) => {
            const sp = SPAWN_RING[idx % SPAWN_RING.length];
            p.x = sp.x;
            p.z = sp.z;
            p.yaw = sp.yaw;
            p.hasVoted = false;
            p.votedFor = null;
            if (p.role === 'vondo') p.killCooldownRemaining = 12;
          });
          this.snapshot.emergencyCooldownRemaining = this.snapshot.settings.emergencyCooldownSec;
          this.snapshot.phase = 'playing';
        }
      }
    }
  }
}

export { PLAYER_COLORS };
