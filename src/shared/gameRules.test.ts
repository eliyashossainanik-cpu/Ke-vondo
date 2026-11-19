import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAROGA_ARREST_RANGE,
  advanceSabotageState,
  assignMatchTasks,
  assignRoles,
  assignSpecialRoles,
  canCompleteTasks,
  canExecuteKill,
  canUseVent,
  computeTaskProgress,
  createEmptySabotageState,
  createPlayerTasks,
  createSabotageState,
  evaluateMatchOutcome,
  findNearestCleanableBody,
  findNearestDarogaTarget,
  findNearestInspectableBody,
  findNearestReportableBody,
  findNearestRevivableBody,
  findNearestShieldTarget,
  getColorShadeHint,
  getConnectedVents,
  getDirectionCompass,
  getPlayerVoteWeight,
  inspectBodyClue,
  isCriticalSabotage,
  isTaskLockedBySabotage,
  makeDefaultPlayerState,
  resolveDarogaShot,
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
  return makeDefaultPlayerState({
    id: 'p1',
    name: 'Player',
    color: 'lal',
    ...overrides,
  });
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

test('assignSpecialRoles respects balanced distribution, 0 neutrals at 5P, and >=2 plain Parabasi', () => {
  const roster5 = Array.from({ length: 5 }, (_, i) =>
    makePlayer({ id: `p5_${i}`, role: i === 0 ? 'vondo' : 'parabasi' }),
  );
  const assigned5 = assignSpecialRoles(roster5, true, undefined, undefined, () => 0.2, true);
  assert.equal(assigned5.filter((p) => p.specialRole === 'pagol').length, 0);
  assert.equal(assigned5.filter((p) => p.role === 'parabasi' && p.specialRole === 'none').length, 3);

  const roster7 = Array.from({ length: 7 }, (_, i) =>
    makePlayer({
      id: `p${i}`,
      role: i === 0 ? 'vondo' : 'parabasi',
    }),
  );
  const withSpecials = assignSpecialRoles(roster7, true, undefined, undefined, () => 0.2, true);
  const plainCrew7 = withSpecials.filter((p) => p.role === 'parabasi' && p.specialRole === 'none').length;
  assert.ok(plainCrew7 >= 2, `Expected >=2 plain Parabasi in 7P, got ${plainCrew7}`);
  assert.ok(withSpecials.filter((p) => p.role === 'vondo' && p.specialRole !== 'none').length <= 1);

  const disabled = assignSpecialRoles(roster7, false);
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

test('evaluateMatchOutcome detects Pagol ejection victory, neutrals in parity, and exact priority', () => {
  const pagol = makePlayer({ id: 'j1', name: 'Pagol Bhai', role: 'parabasi', specialRole: 'pagol', alive: false });
  assert.deepEqual(evaluateMatchOutcome([pagol], 0.2, false, pagol), {
    winner: 'pagol',
    reason: 'pagol_ejected',
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
    reason: 'batpars_out',
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

  // Parity MUST count alive neutrals (1 Batpar vs 1 Parabasi + 1 Pagol = 1 vs 2 -> match continues!)
  const parityWithPagol = [
    makePlayer({ id: 'p1', role: 'vondo', alive: true }),
    makePlayer({ id: 'p2', role: 'parabasi', alive: true }),
    makePlayer({ id: 'p3', role: 'parabasi', specialRole: 'pagol', alive: true }),
  ];
  assert.equal(evaluateMatchOutcome(parityWithPagol, 0.5), null);

  const vondoEqual = [
    makePlayer({ id: 'p1', role: 'vondo', alive: true }),
    makePlayer({ id: 'p2', role: 'parabasi', alive: true }),
  ];
  assert.deepEqual(evaluateMatchOutcome(vondoEqual, 0.5), {
    winner: 'vondo',
    reason: 'batpars_outnumber',
  });

  assert.deepEqual(evaluateMatchOutcome(tasksDone, 0.5, true), {
    winner: 'vondo',
    reason: 'critical_sabotage_timeout',
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

test('Daroga Sheriff shot hits Batpar cleanly and backfires on innocent Para-basi', () => {
  const daroga = makePlayer({ id: 'd1', role: 'parabasi', specialRole: 'daroga', x: 0, z: 0 });
  const vondo = makePlayer({ id: 'v1', role: 'vondo', x: 2.0, z: 0 });
  const innocent = makePlayer({ id: 'c1', role: 'parabasi', x: 2.5, z: 0 });
  const farVondo = makePlayer({ id: 'v2', role: 'vondo', x: 10.0, z: 0 });

  assert.equal(findNearestDarogaTarget(daroga, [daroga, vondo, farVondo])?.id, 'v1');
  assert.deepEqual(resolveDarogaShot(daroga, vondo), {
    allowed: true,
    hitVondo: true,
    backfired: false,
  });
  assert.deepEqual(resolveDarogaShot(daroga, innocent), {
    allowed: true,
    hitVondo: false,
    backfired: true,
  });
  assert.equal(resolveDarogaShot(daroga, farVondo).allowed, false);
});

test('Neta Mayor vote counts as 2x weight in tallyVotes', () => {
  const neta = makePlayer({ id: 'n1', name: 'Neta', specialRole: 'neta', hasVoted: true, votedFor: 'v1' });
  const p2 = makePlayer({ id: 'v1', name: 'Batpar', role: 'vondo', hasVoted: true, votedFor: 'n1' });
  const p3 = makePlayer({ id: 'p3', name: 'Bhai', hasVoted: true, votedFor: 'n1' });
  const p4 = makePlayer({ id: 'p4', name: 'Apa', hasVoted: true, votedFor: 'skip' });

  assert.equal(getPlayerVoteWeight(neta), 2);
  assert.equal(getPlayerVoteWeight(p2), 1);

  // Neta gives 2 votes to v1 vs 2 votes (p2 + p3) to n1 -> tie!
  const tiedByMayor = tallyVotes([neta, p2, p3, p4]);
  assert.equal(tiedByMayor.reason, 'tie');

  // If p3 joins Neta on v1 -> 3 votes vs 1 vote -> v1 ejected!
  p3.votedFor = 'v1';
  const ejectedByMayor = tallyVotes([neta, p2, p3, p4]);
  assert.equal(ejectedByMayor.reason, 'voted');
  assert.equal(ejectedByMayor.ejectedId, 'v1');
});

test('Jharudar body clean & Daktar Saline revive body range and limits', () => {
  const body: BodyMarker = {
    id: 'b_clean',
    victimId: 'v1',
    victimName: 'Lal',
    color: 'lal',
    x: 2,
    z: 2,
    reported: false,
    killedAt: 1000,
    killerColorHint: 'Light',
    killerZoneHint: 'Adda',
  };
  const reportedBody: BodyMarker = { ...body, id: 'b_rep', reported: true };

  const jharudar = makePlayer({ id: 'j1', role: 'vondo', specialRole: 'jharudar', x: 3.5, z: 2 });
  assert.equal(findNearestCleanableBody(jharudar, [reportedBody, body])?.id, 'b_clean');

  const daktarReady = makePlayer({ id: 'doc1', role: 'parabasi', specialRole: 'daktar', x: 2.5, z: 2, revivesLeft: 1 });
  const daktarEmpty = makePlayer({ ...daktarReady, revivesLeft: 0 });
  assert.equal(findNearestRevivableBody(daktarReady, [body])?.id, 'b_clean');
  assert.equal(findNearestRevivableBody(daktarEmpty, [body]), null);

  // 8-player 2-vondo leaves >=2 plain Parabasi & assigns specials from pool
  const roster8 = Array.from({ length: 8 }, (_, i) =>
    makePlayer({ id: `r${i}`, role: i < 2 ? 'vondo' : 'parabasi' }),
  );
  const assigned8 = assignSpecialRoles(roster8, true, undefined, undefined, () => 0.25, true);
  assert.ok(assigned8.filter((p) => p.role === 'parabasi' && p.specialRole === 'none').length >= 2);
});

test('Phase 1 sabotage rules: non-critical auto-expires harmlessly, gas_leak requires 2 holders or triggers critical expiry', () => {
  assert.equal(isCriticalSabotage('loadshedding'), false);
  assert.equal(isCriticalSabotage('wifi_down'), false);
  assert.equal(isCriticalSabotage('gas_leak'), true);

  // Loadshedding 90s auto-expiry never sets expiredCritical
  const load = createSabotageState('loadshedding');
  const p1 = makePlayer({ id: 'p1', x: -35, z: 33 });
  const loadRes = advanceSabotageState(load, [p1], 91, new Map());
  assert.equal(loadRes.expiredCritical, false);
  assert.equal(loadRes.expiredNonCriticalType, 'loadshedding');
  assert.equal(load.active, null);

  // Wi-Fi down locks digital tasks only
  const wifi = createSabotageState('wifi_down');
  assert.equal(isTaskLockedBySabotage('task_dish', wifi), true);
  assert.equal(isTaskLockedBySabotage('task_cha', wifi), false);

  // Gas leak requires 2 DIFFERENT players at the 2 valves held simultaneously for 2s
  const gas = createSabotageState('gas_leak');
  const c1 = makePlayer({ id: 'c1', x: gas.valves[0].x, z: gas.valves[0].z });
  const c2 = makePlayer({ id: 'c2', x: gas.valves[1].x, z: gas.valves[1].z });
  const singleHold = new Map<string, { valveId?: 'valve_cha' | 'valve_rickshaw' }>([
    ['c1', { valveId: 'valve_cha' }],
  ]);
  advanceSabotageState(gas, [c1, c2], 3.0, singleHold);
  assert.equal(gas.active, 'gas_leak');

  const dualHold = new Map<string, { valveId?: 'valve_cha' | 'valve_rickshaw' }>([
    ['c1', { valveId: 'valve_cha' }],
    ['c2', { valveId: 'valve_rickshaw' }],
  ]);
  const fixedRes = advanceSabotageState(gas, [c1, c2], 2.1, dualHold);
  assert.equal(fixedRes.fixed, true);
  assert.equal(gas.active, null);

  // Gas leak 45s timeout ends match
  const gasTimeout = createSabotageState('gas_leak');
  const expRes = advanceSabotageState(gasTimeout, [c1, c2], 46, new Map());
  assert.equal(expRes.expiredCritical, true);
});

test('Phase 1 tasks & LOS: common tasks shared across crew, Batpar gets fake tasks, DAROGA range is 6m, walls block body reports', () => {
  assert.equal(DAROGA_ARREST_RANGE, 6.0);
  const roster = [
    makePlayer({ id: 'v1', role: 'vondo' }),
    makePlayer({ id: 'c1', role: 'parabasi' }),
    makePlayer({ id: 'c2', role: 'parabasi' }),
    makePlayer({ id: 'pag', role: 'parabasi', specialRole: 'pagol' }),
  ];
  assignMatchTasks(roster, 5, () => 0.4);
  assert.equal(roster[0].tasks.length, 5);
  assert.equal(roster[0].tasks.every((t) => t.isFake === true), true);
  assert.equal(roster[3].tasks.length, 0);
  assert.equal(roster[1].tasks.length, 5);
  assert.equal(roster[2].tasks.length, 5);
  // Both crew share the first 2 common tasks
  assert.deepEqual(
    roster[1].tasks.slice(0, 2).map((t) => t.taskId),
    roster[2].tasks.slice(0, 2).map((t) => t.taskId),
  );

  // Solid wall cha_s_stub (-45..-36.5, z -23.4..-22.5) blocks body report LOS from z -21.5 to z -24.5
  const finder = makePlayer({ id: 'f1', x: -40.0, z: -21.5 });
  const hiddenBody: BodyMarker = {
    id: 'b_wall',
    victimId: 'vx',
    victimName: 'Hidden',
    color: 'neel',
    x: -40.0,
    z: -24.5,
    reported: false,
    killedAt: 1000,
    killerColorHint: 'Light',
    killerZoneHint: 'Cha Dokan',
  };
  assert.equal(findNearestReportableBody(finder, [hiddenBody]), null);

  // Clear LOS inside same doorway/yard allows report
  const clearBody: BodyMarker = { ...hiddenBody, id: 'b_clear', x: -39.0, z: -21.5 };
  assert.equal(findNearestReportableBody(finder, [clearBody])?.id, 'b_clear');
});
