import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRoles,
  assignSpecialRoles,
  canCompleteTasks,
  canExecuteKill,
  canUseVent,
  computeTaskProgress,
  createPlayerTasks,
  evaluateMatchOutcome,
  findNearestInspectableBody,
  findNearestShieldTarget,
  getColorShadeHint,
  getConnectedVents,
  getDirectionCompass,
  inspectBodyClue,
  resolveVentHopTarget,
  sanitizeSoloConfig,
  tallyVotes,
} from './gameRules';
import {
  BOT_WAYPOINTS,
  PLAYER_RADIUS,
  SPAWN_RING,
  TASK_STATIONS,
  VENTS,
  WALLS,
  resolveCircleWallCollision,
} from './mapData';
import type { BodyMarker, DoorLockState, PlayerState } from './types';

function makePlayer(overrides: Partial<PlayerState>): PlayerState {
  return {
    id: 'p1',
    name: 'Player',
    color: 'lal',
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
    tasks: [],
    killCooldownRemaining: 0,
    emergencyMeetingsLeft: 2,
    votedFor: null,
    hasVoted: false,
    ...overrides,
  };
}

test('all spawn ring positions are clear of walls', () => {
  for (const sp of SPAWN_RING) {
    const resolved = resolveCircleWallCollision(sp.x, sp.z, PLAYER_RADIUS);
    assert.ok(
      Math.abs(resolved.x - sp.x) < 0.01 && Math.abs(resolved.z - sp.z) < 0.01,
      `Spawn (${sp.x}, ${sp.z}) overlapped wall`,
    );
  }
});

test('all task stations, vents, and bot waypoints are reachable outside wall AABBs', () => {
  for (const st of TASK_STATIONS) {
    const resolved = resolveCircleWallCollision(st.x, st.z, PLAYER_RADIUS);
    assert.ok(
      Math.abs(resolved.x - st.x) < 0.5 && Math.abs(resolved.z - st.z) < 0.5,
      `Task station ${st.id} at (${st.x}, ${st.z}) is inside a wall`,
    );
  }
  for (const v of VENTS) {
    const resolved = resolveCircleWallCollision(v.x, v.z, PLAYER_RADIUS);
    assert.ok(
      Math.abs(resolved.x - v.x) < 0.25 && Math.abs(resolved.z - v.z) < 0.25,
      `Vent ${v.id} at (${v.x}, ${v.z}) overlapped a wall`,
    );
  }
  for (const wp of BOT_WAYPOINTS) {
    const resolved = resolveCircleWallCollision(wp.x, wp.z, PLAYER_RADIUS);
    assert.ok(
      Math.abs(resolved.x - wp.x) < 0.25 && Math.abs(resolved.z - wp.z) < 0.25,
      `Bot waypoint (${wp.x}, ${wp.z}) overlapped a wall`,
    );
  }
});

test('door lock blocks doorway traversal when locked and allows passage when unlocked', () => {
  const unlocked: DoorLockState = {
    cha_dokan: 0,
    rickshaw_garage: 0,
    desco_power: 0,
    dish_roof: 0,
    cooldownRemaining: 0,
  };
  const locked: DoorLockState = { ...unlocked, cha_dokan: 8 };

  const openStep = resolveCircleWallCollision(-31.2, -22.95, PLAYER_RADIUS, WALLS, unlocked);
  assert.ok(Math.abs(openStep.z - -22.95) < 0.01);

  const blockedStep = resolveCircleWallCollision(-31.2, -22.95, PLAYER_RADIUS, WALLS, locked);
  assert.ok(Math.abs(blockedStep.z - -22.95) > 0.4, 'Locked shutter should push player out of doorway');
});

test('assignRoles assigns exact requested Vondo count within player bounds', () => {
  const roster: Array<Pick<PlayerState, 'id' | 'role'>> = Array.from({ length: 7 }, (_, i) => ({
    id: `p${i}`,
    role: 'parabasi',
  }));
  const assigned = assignRoles(roster, 2, () => 0.42);
  const vondos = assigned.filter((p) => p.role === 'vondo');
  assert.equal(vondos.length, 2);
});

test('assignSpecialRoles assigns Bohurupi, Goyenda, Kobiraj, Mistri, and Pagol across 7 players', () => {
  const roster = Array.from({ length: 7 }, (_, i) =>
    makePlayer({
      id: `p${i}`,
      role: i === 0 ? 'vondo' : 'parabasi',
    }),
  );
  const withSpecials = assignSpecialRoles(roster, true, undefined, undefined, () => 0.37);
  assert.equal(withSpecials.find((p) => p.role === 'vondo')?.specialRole, 'bohurupi');
  const crewSpecials = new Set(withSpecials.filter((p) => p.role === 'parabasi').map((p) => p.specialRole));
  assert.ok(crewSpecials.has('goyenda'));
  assert.ok(crewSpecials.has('kobiraj'));
  assert.ok(crewSpecials.has('mistri'));
  assert.ok(crewSpecials.has('pagol'));

  const disabled = assignSpecialRoles(roster, false);
  assert.ok(disabled.every((p) => p.specialRole === 'none'));
});

test('canExecuteKill enforces role, cooldown, vent, and distance', () => {
  const killer = makePlayer({ id: 'k', role: 'vondo', x: 0, z: 4, killCooldownRemaining: 0 });
  const victim = makePlayer({ id: 'v', role: 'parabasi', x: 1.5, z: 4 });
  assert.equal(canExecuteKill(killer, victim).allowed, true);

  const farVictim = makePlayer({ id: 'v2', role: 'parabasi', x: 10, z: 4 });
  assert.equal(canExecuteKill(killer, farVictim).allowed, false);

  const coolingKiller = makePlayer({ ...killer, killCooldownRemaining: 5 });
  assert.equal(canExecuteKill(coolingKiller, victim).allowed, false);

  const crew = makePlayer({ id: 'c', role: 'parabasi', x: 0, z: 4 });
  assert.equal(canExecuteKill(crew, victim).allowed, false);
});

test('computeTaskProgress counts only non-Pagol parabasi tasks', () => {
  const tasks = createPlayerTasks(4, () => 0.5);
  tasks[0].completed = true;
  tasks[1].completed = true;

  const players = [
    makePlayer({ id: 'p1', role: 'parabasi', tasks }),
    makePlayer({ id: 'p2', role: 'vondo', tasks: createPlayerTasks(4, () => 0.5) }),
    makePlayer({ id: 'p3', role: 'parabasi', specialRole: 'pagol', tasks: createPlayerTasks(4, () => 0.5) }),
  ];
  const res = computeTaskProgress(players);
  assert.equal(res.completedTasks, 2);
  assert.equal(res.totalTasks, 4);
  assert.equal(res.progress, 0.5);
});

test('Goyenda clue inspection, Kobiraj shield targeting, and Mistri vent permissions work accurately', () => {
  const goyenda = makePlayer({ id: 'g', role: 'parabasi', specialRole: 'goyenda', x: 5, z: 5 });
  const body: BodyMarker = {
    id: 'b1',
    victimId: 'v1',
    victimName: 'Neel Babu',
    color: 'neel',
    x: 6.2,
    z: 5.4,
    reported: false,
    killedAt: 10000,
    killerColorHint: getColorShadeHint('lal'),
    killerZoneHint: 'Cha Dokan',
  };
  assert.equal(findNearestInspectableBody(goyenda, [body])?.id, 'b1');
  const clue = inspectBodyClue(body, 25000);
  assert.ok(clue.detail.includes('15s ago'));
  assert.ok(clue.detail.includes('Cha Dokan'));

  const kobiraj = makePlayer({ id: 'k', role: 'parabasi', specialRole: 'kobiraj', x: 0, z: 0 });
  const ally = makePlayer({ id: 'a', role: 'parabasi', x: 2.2, z: 0, shielded: false });
  const shieldedAlly = makePlayer({ id: 'a2', role: 'parabasi', x: 1.0, z: 0, shielded: true });
  assert.equal(findNearestShieldTarget(kobiraj, [kobiraj, ally, shieldedAlly])?.id, 'a');

  const mistriReady = makePlayer({ id: 'm', role: 'parabasi', specialRole: 'mistri', abilityCooldown: 0 });
  const mistriCooldown = makePlayer({ id: 'm2', role: 'parabasi', specialRole: 'mistri', abilityCooldown: 8 });
  assert.equal(canUseVent(mistriReady), true);
  assert.equal(canUseVent(mistriCooldown), false);
});

test('tallyVotes handles majority ejection, ties, skips, and confirmEjects flag', () => {
  const players = [
    makePlayer({ id: 'p1', name: 'Lal', role: 'vondo', hasVoted: true, votedFor: 'p2' }),
    makePlayer({ id: 'p2', name: 'Neel', role: 'parabasi', hasVoted: true, votedFor: 'p1' }),
    makePlayer({ id: 'p3', name: 'Shobuj', role: 'parabasi', hasVoted: true, votedFor: 'p1' }),
    makePlayer({ id: 'p4', name: 'Holud', role: 'parabasi', hasVoted: true, votedFor: 'skip' }),
  ];

  const ejected = tallyVotes(players, false);
  assert.equal(ejected.reason, 'voted');
  assert.equal(ejected.ejectedId, 'p1');
  assert.equal(ejected.wasVondo, true);
  assert.equal(ejected.confirmEjects, false);

  players[2].votedFor = 'p2';
  players[3].votedFor = 'p1';
  const tied = tallyVotes(players);
  assert.equal(tied.reason, 'tie');
  assert.equal(tied.ejectedId, null);

  players[0].votedFor = 'skip';
  players[1].votedFor = 'skip';
  const skipped = tallyVotes(players);
  assert.equal(skipped.reason, 'skipped');
  assert.equal(skipped.ejectedId, null);
});

test('evaluateMatchOutcome detects Pagol ejection victory and all standard win/loss states', () => {
  const pagol = makePlayer({ id: 'j1', name: 'Pagol Bhai', role: 'parabasi', specialRole: 'pagol', alive: false });
  assert.deepEqual(evaluateMatchOutcome([pagol], 0.2, false, pagol), {
    winner: 'pagol',
    reason: 'jester_ejected',
    winnerPlayerId: 'j1',
    winnerPlayerName: 'Pagol Bhai',
  });

  const allVondosDead = [
    makePlayer({ id: 'p1', role: 'vondo', alive: false }),
    makePlayer({ id: 'p2', role: 'parabasi', alive: true }),
    makePlayer({ id: 'p3', role: 'parabasi', alive: true }),
  ];
  assert.deepEqual(evaluateMatchOutcome(allVondosDead, 0.2), {
    winner: 'parabasi',
    reason: 'vondos_ejected',
  });

  const tasksDone = [
    makePlayer({ id: 'p1', role: 'vondo', alive: true }),
    makePlayer({ id: 'p2', role: 'parabasi', alive: true }),
    makePlayer({ id: 'p3', role: 'parabasi', alive: true }),
  ];
  assert.deepEqual(evaluateMatchOutcome(tasksDone, 1), {
    winner: 'parabasi',
    reason: 'tasks_completed',
  });

  const vondoEqual = [
    makePlayer({ id: 'p1', role: 'vondo', alive: true }),
    makePlayer({ id: 'p2', role: 'parabasi', alive: true }),
  ];
  assert.deepEqual(evaluateMatchOutcome(vondoEqual, 0.5), {
    winner: 'vondo',
    reason: 'vondos_outnumber',
  });

  assert.deepEqual(evaluateMatchOutcome(tasksDone, 0.5, true), {
    winner: 'vondo',
    reason: 'sabotage_timeout',
  });
});

test('all 13 drain vents form a symmetric connected graph and resolveVentHopTarget enforces edges', () => {
  const ventIds = new Set(VENTS.map((v) => v.id));
  for (const v of VENTS) {
    assert.ok(v.targetIds.length >= 2, `Vent ${v.id} should connect to at least 2 neighbors`);
    for (const targetId of v.targetIds) {
      assert.ok(ventIds.has(targetId), `Vent ${v.id} references unknown target ${targetId}`);
      const neighbor = VENTS.find((other) => other.id === targetId)!;
      assert.ok(
        neighbor.targetIds.includes(v.id),
        `Vent connection ${v.id} -> ${targetId} should be symmetric`,
      );
    }
  }

  const chaVent = VENTS.find((v) => v.id === 'vent_cha')!;
  const graph = getConnectedVents(chaVent.x, chaVent.z);
  assert.equal(graph.currentVent?.id, 'vent_cha');
  assert.equal(graph.targets.length, chaVent.targetIds.length);
  assert.equal(resolveVentHopTarget(chaVent.x, chaVent.z, 'vent_pukur')?.id, 'vent_pukur');
  assert.equal(resolveVentHopTarget(chaVent.x, chaVent.z, 'vent_pandal'), null);
});

test('ghost para-basi can still complete tasks and count toward win progress', () => {
  const ghostCrew = makePlayer({ id: 'g1', role: 'parabasi', specialRole: 'none', alive: false });
  const ghostPagol = makePlayer({ id: 'g2', role: 'parabasi', specialRole: 'pagol', alive: false });
  const vondo = makePlayer({ id: 'v1', role: 'vondo', alive: true });
  assert.equal(canCompleteTasks(ghostCrew), true);
  assert.equal(canCompleteTasks(ghostPagol), false);
  assert.equal(canCompleteTasks(vondo), false);
});

test('getDirectionCompass computes cardinal arrows and sanitizeSoloConfig clamps bounds', () => {
  assert.equal(getDirectionCompass(0, 0, 0, -30).cardinal, 'N');
  assert.equal(getDirectionCompass(0, 0, 25, -25).cardinal, 'NE');
  assert.equal(getDirectionCompass(0, 0, -20, 0).cardinal, 'W');
  assert.equal(getDirectionCompass(0, 0, 0.5, 0.5).cardinal, 'HERE');

  const fivePlayer = sanitizeSoloConfig(5, { vondoCount: 2, tasksPerPlayer: 8 });
  assert.equal(fivePlayer.playerCount, 5);
  assert.equal(fivePlayer.settings.vondoCount, 1);
  assert.equal(fivePlayer.settings.tasksPerPlayer, 8);

  const eightPlayer = sanitizeSoloConfig(12, { vondoCount: 2, killCooldownSec: 5 });
  assert.equal(eightPlayer.playerCount, 8);
  assert.equal(eightPlayer.settings.vondoCount, 2);
  assert.equal(eightPlayer.settings.killCooldownSec, 10);
});
