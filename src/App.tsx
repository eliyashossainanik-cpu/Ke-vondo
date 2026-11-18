import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DoorZoneId,
  GamePhase,
  PlayerColorId,
  RoomSettings,
  RoomSnapshot,
  SabotageType,
  SpecialRole,
} from './shared/types';
import {
  ADMIN_TABLE_POS,
  EMERGENCY_BELL_POS,
  SECURITY_CAMS_POS,
  TASK_STATIONS,
  VITALS_POS,
  distance2D,
} from './shared/mapData';
import {
  DEFAULT_ROOM_SETTINGS,
  MISTRI_FIX_RANGE,
  SABOTAGE_FIX_RANGE,
  canCompleteTasks,
  canUseVent,
  findNearestKillTarget,
  findNearestReportableBody,
  sanitizeSoloConfig,
} from './shared/gameRules';
import { WorldScene } from './three/WorldScene';
import { SoloMatchEngine } from './game/soloEngine';
import { useMultiplayerClient } from './game/useMultiplayerClient';
import { incrementCareerTasksCompleted, recordCareerMatchOutcome } from './game/statsStore';
import { MEME_SOUNDS, soundEngine, type MemeSoundId } from './audio/soundEngine';
import { TitleOverlay } from './components/TitleOverlay';
import { LobbyOverlay } from './components/LobbyOverlay';
import { GameHud } from './components/GameHud';
import { TaskModal } from './components/TaskModal';
import { MeetingModal } from './components/MeetingModal';
import { EjectionModal, OutcomeModal, PauseModal, RoleRevealModal } from './components/MatchModals';
import { MobileControls } from './components/MobileControls';
import { StationModal, type StationModalKind } from './components/StationModals';
import { MemePackModal } from './components/MemePackModal';
import { TacticalMapModal } from './components/TacticalMapModal';
import { GuideModal } from './components/GuideModal';
import {
  enterMobileFullscreenAndLandscape,
  isTouchOrMobileDevice,
} from './utils/mobileFullscreen';

export default function App() {
  const [playerName, setPlayerName] = useState('Lal Mia');
  const [playerColor, setPlayerColor] = useState<PlayerColorId>('lal');
  const [mode, setMode] = useState<'title' | 'solo' | 'multi'>('title');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeStationModal, setActiveStationModal] = useState<StationModalKind | null>(null);
  const [soloSnapshot, setSoloSnapshot] = useState<RoomSnapshot | null>(null);
  const [soloPlayerCount, setSoloPlayerCount] = useState(7);
  const [soloSettings, setSoloSettings] = useState<RoomSettings>(() => ({ ...DEFAULT_ROOM_SETTINGS }));
  const [pointerLookEnabled, setPointerLookEnabled] = useState(false);
  const [clueNotice, setClueNotice] = useState<{ title: string; detail: string } | null>(null);
  const [showMemePack, setShowMemePack] = useState(false);
  const [showTacticalMap, setShowTacticalMap] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [killFlash, setKillFlash] = useState(false);
  const touchOverrideRef = useRef(false);
  const recordedOutcomeRef = useRef(false);
  const [touchControlsEnabled, setTouchControlsEnabled] = useState<boolean>(() =>
    isTouchOrMobileDevice(),
  );

  useEffect(() => {
    const onResize = () => {
      if (!touchOverrideRef.current) {
        setTouchControlsEnabled(isTouchOrMobileDevice());
      }
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  const soloEngineRef = useRef<SoloMatchEngine | null>(null);
  const shakeTriggerRef = useRef<((amount: number) => void) | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);
  const jumpTriggerRef = useRef<(() => void) | null>(null);
  const joystickInputRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const clueTimerRef = useRef<number | null>(null);

  const showClueNotice = useCallback((title: string, detail: string) => {
    setClueNotice({ title, detail });
    if (clueTimerRef.current !== null) {
      window.clearTimeout(clueTimerRef.current);
    }
    clueTimerRef.current = window.setTimeout(() => {
      setClueNotice(null);
      clueTimerRef.current = null;
    }, 6000);
  }, []);

  useEffect(() => {
    return () => {
      if (clueTimerRef.current !== null) window.clearTimeout(clueTimerRef.current);
    };
  }, []);

  const mp = useMultiplayerClient(
    (amount) => {
      shakeTriggerRef.current?.(amount);
    },
    showClueNotice,
  );

  const isMulti = mode === 'multi';
  const activeSnapshot = isMulti ? mp.snapshot : soloSnapshot;
  const activePlayerId = isMulti ? mp.localPlayerId : soloEngineRef.current?.localPlayerId ?? null;

  const derivedPhase: GamePhase = (() => {
    if (mode === 'title' || !activeSnapshot) return 'title';
    if (paused && activeSnapshot.phase === 'playing') return 'paused';
    return activeSnapshot.phase;
  })();

  // Sync document.body.dataset.state for accessibility & automated checks
  useEffect(() => {
    const bodyState =
      derivedPhase === 'role_reveal' ||
      derivedPhase === 'meeting' ||
      derivedPhase === 'vote_results' ||
      derivedPhase === 'ejecting'
        ? 'playing'
        : derivedPhase;
    document.body.dataset.state = bodyState;
  }, [derivedPhase]);

  // Clear open station/task/map modals whenever gameplay is interrupted (meeting, ejection, gameover)
  useEffect(() => {
    if (derivedPhase !== 'playing') {
      setActiveTaskId(null);
      setActiveStationModal(null);
      setShowTacticalMap(false);
    }
  }, [derivedPhase]);

  // Persist Career Stats once per match when entering gameover
  useEffect(() => {
    if (derivedPhase === 'gameover' && activeSnapshot?.outcome && activePlayerId) {
      if (!recordedOutcomeRef.current) {
        recordedOutcomeRef.current = true;
        recordCareerMatchOutcome(activeSnapshot, activePlayerId, activeSnapshot.outcome);
      }
    } else if (derivedPhase === 'playing' || derivedPhase === 'role_reveal' || derivedPhase === 'title') {
      recordedOutcomeRef.current = false;
    }
  }, [derivedPhase, activeSnapshot, activePlayerId]);

  const handleChangeSoloPlayerCount = useCallback((count: number) => {
    setSoloSettings((prev) => {
      const sanitized = sanitizeSoloConfig(count, prev);
      setSoloPlayerCount(sanitized.playerCount);
      return sanitized.settings;
    });
  }, []);

  const handleUpdateSoloSettings = useCallback(
    (partial: Partial<RoomSettings>) => {
      setSoloSettings((prev) => sanitizeSoloConfig(soloPlayerCount, { ...prev, ...partial }).settings);
    },
    [soloPlayerCount],
  );

  const startSoloMatch = useCallback(
    (
      forceRole?: 'parabasi' | 'vondo',
      forceSpecialRole?: SpecialRole,
      skipRoleReveal = false,
    ) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const engine = new SoloMatchEngine(
        playerName,
        playerColor,
        forceRole,
        skipRoleReveal,
        forceSpecialRole,
        showClueNotice,
        soloSettings,
        soloPlayerCount,
      );
      soloEngineRef.current = engine;
      recordedOutcomeRef.current = false;
      setSoloSnapshot(engine.getSnapshot());
      setMode('solo');
      setPaused(false);
      setActiveTaskId(null);
      setActiveStationModal(null);
      setShowTacticalMap(false);
      setShowGuide(false);
      setClueNotice(null);
    },
    [playerName, playerColor, showClueNotice, soloSettings, soloPlayerCount],
  );

  // Support ?autostart=1 to jump straight into active 3D gameplay
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startSoloMatch(undefined, undefined, true);
    }
  }, [startSoloMatch]);

  // Solo 20Hz simulation loop
  useEffect(() => {
    if (mode !== 'solo') return;
    const timer = window.setInterval(() => {
      const engine = soloEngineRef.current;
      if (!engine || paused) return;
      engine.step(0.05);
      setSoloSnapshot(engine.getSnapshot());
    }, 50);
    return () => clearInterval(timer);
  }, [mode, paused]);

  const handleLocalMove = useCallback(
    (x: number, z: number, vx: number, vz: number, yaw: number) => {
      if (mode === 'solo') {
        soloEngineRef.current?.moveLocal(x, z, vx, vz, yaw);
      } else if (mode === 'multi') {
        mp.send({ type: 'player:move', x, z, vx, vz, yaw });
      }
    },
    [mode, mp],
  );

  const handleOpenStation = useCallback(
    (kind: StationModalKind) => {
      setActiveStationModal(kind);
      if (kind === 'cams') {
        if (mode === 'solo' && soloEngineRef.current) {
          soloEngineRef.current.setWatchingCams(true);
          setSoloSnapshot(soloEngineRef.current.getSnapshot());
        } else if (mode === 'multi') {
          mp.send({ type: 'player:watch_cams', watching: true });
        }
      }
    },
    [mode, mp],
  );

  const handleCloseStation = useCallback(() => {
    setActiveStationModal((prev) => {
      if (prev === 'cams') {
        if (mode === 'solo' && soloEngineRef.current) {
          soloEngineRef.current.setWatchingCams(false);
          setSoloSnapshot(soloEngineRef.current.getSnapshot());
        } else if (mode === 'multi') {
          mp.send({ type: 'player:watch_cams', watching: false });
        }
      }
      return null;
    });
  }, [mode, mp]);

  const handleCompleteTask = useCallback(
    (taskId: string) => {
      if (mode === 'solo' && soloEngineRef.current) {
        if (soloEngineRef.current.completeLocalTask(taskId)) {
          incrementCareerTasksCompleted(1);
        }
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:task_complete', taskId });
        incrementCareerTasksCompleted(1);
      }
      setActiveTaskId(null);
    },
    [mode, mp],
  );

  const handleReportBody = useCallback(
    (bodyId: string) => {
      setActiveTaskId(null);
      setShowTacticalMap(false);
      handleCloseStation();
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.reportBody(bodyId);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:report_body', bodyId });
      }
    },
    [mode, mp, handleCloseStation],
  );

  const handleEmergencyMeeting = useCallback(() => {
    setActiveTaskId(null);
    setShowTacticalMap(false);
    handleCloseStation();
    if (mode === 'solo' && soloEngineRef.current) {
      soloEngineRef.current.callEmergencyMeeting();
      setSoloSnapshot(soloEngineRef.current.getSnapshot());
    } else if (mode === 'multi') {
      mp.send({ type: 'player:emergency_meeting' });
    }
  }, [mode, mp, handleCloseStation]);

  const handleKill = useCallback(
    (targetId: string) => {
      shakeTriggerRef.current?.(0.75);
      setKillFlash(true);
      window.setTimeout(() => setKillFlash(false), 380);
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.triggerKill(targetId);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:kill', targetId });
      }
    },
    [mode, mp],
  );

  const handleSabotage = useCallback(
    (sabotageType: SabotageType) => {
      shakeTriggerRef.current?.(0.45);
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.triggerSabotage(sabotageType);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:sabotage', sabotageType });
      }
    },
    [mode, mp],
  );

  const handleLockDoors = useCallback(
    (zoneId: DoorZoneId) => {
      shakeTriggerRef.current?.(0.35);
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.lockDoors(zoneId);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:lock_doors', zoneId });
      }
    },
    [mode, mp],
  );

  const handleFixSabotage = useCallback(() => {
    if (mode === 'solo' && soloEngineRef.current) {
      soloEngineRef.current.fixSabotage();
      setSoloSnapshot(soloEngineRef.current.getSnapshot());
    } else if (mode === 'multi') {
      mp.send({ type: 'player:fix_sabotage' });
    }
  }, [mode, mp]);

  const handleVentToggle = useCallback(
    (destVentId?: string) => {
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.toggleVent(destVentId);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:vent_toggle', destinationVentId: destVentId });
      }
    },
    [mode, mp],
  );

  const handleUseAbility = useCallback(
    (targetId?: string) => {
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.useSpecialAbility(targetId);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:use_ability', targetId });
      }
    },
    [mode, mp],
  );

  const handleTogglePointerLook = useCallback(() => {
    setPointerLookEnabled((prev) => {
      const next = !prev;
      if (!next && document.pointerLockElement) {
        try {
          document.exitPointerLock?.();
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  const handleResetCamera = useCallback(() => {
    resetCameraRef.current?.();
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handlePlayMeme = useCallback(
    (memeId: MemeSoundId) => {
      if (mode === 'multi') {
        mp.send({ type: 'player:meme_sfx', memeId });
      } else {
        soundEngine.playMeme(memeId);
      }
    },
    [mode, mp],
  );

  const handleReturnToTitle = useCallback(() => {
    if (isMulti) mp.disconnectRoom();
    soloEngineRef.current = null;
    setSoloSnapshot(null);
    setPaused(false);
    setActiveTaskId(null);
    setActiveStationModal(null);
    setClueNotice(null);
    setShowMemePack(false);
    setShowTacticalMap(false);
    setShowGuide(false);
    setPointerLookEnabled(false);
    setMode('title');
  }, [isMulti, mp]);

  // Global keyboard bindings for Title Start, Pause, Mute, Map, Guide, and Gameplay Actions
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';

      if (derivedPhase === 'title' && !inInput && !showMemePack && !showGuide && (e.code === 'Enter' || e.code === 'Space')) {
        if (target?.tagName === 'BUTTON') return;
        e.preventDefault();
        startSoloMatch();
        return;
      }

      if (inInput) return;

      if (e.code === 'KeyM') {
        handleToggleMute();
        return;
      }

      if (e.code === 'KeyH') {
        setShowGuide((v) => !v);
        return;
      }

      if (e.code === 'Tab' && derivedPhase === 'playing') {
        e.preventDefault();
        setShowTacticalMap((v) => !v);
        return;
      }

      if (e.code === 'KeyC' && (derivedPhase === 'playing' || derivedPhase === 'lobby')) {
        handleTogglePointerLook();
        return;
      }

      if (e.code === 'KeyY' && (derivedPhase === 'playing' || derivedPhase === 'lobby')) {
        handleResetCamera();
        return;
      }

      if (
        (derivedPhase === 'playing' || derivedPhase === 'lobby') &&
        e.code.startsWith('Digit')
      ) {
        const idx = Number(e.code.replace('Digit', '')) - 1;
        if (idx >= 0 && idx < MEME_SOUNDS.length) {
          handlePlayMeme(MEME_SOUNDS[idx].id);
          return;
        }
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (showGuide) {
          setShowGuide(false);
          return;
        }
        if (showTacticalMap) {
          setShowTacticalMap(false);
          return;
        }
        if (showMemePack) {
          setShowMemePack(false);
          return;
        }
        if (activeTaskId) {
          setActiveTaskId(null);
          return;
        }
        if (activeStationModal) {
          handleCloseStation();
          return;
        }
        if (derivedPhase === 'playing') {
          setPaused(true);
        } else if (derivedPhase === 'paused') {
          setPaused(false);
        }
        return;
      }

      if (
        derivedPhase !== 'playing' ||
        showMemePack ||
        showTacticalMap ||
        showGuide ||
        activeTaskId ||
        activeStationModal ||
        !activeSnapshot ||
        !activePlayerId
      ) {
        return;
      }
      const lp = activeSnapshot.players.find((p) => p.id === activePlayerId);
      if (!lp) return;

      const fixRange = lp.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
      if (e.code === 'KeyE') {
        if (
          activeSnapshot.sabotage.active &&
          lp.alive &&
          distance2D(lp.x, lp.z, activeSnapshot.sabotage.fixStationX, activeSnapshot.sabotage.fixStationZ) <=
            fixRange
        ) {
          handleFixSabotage();
          return;
        }
        // Alive or Ghost Para-basi (non-Pagol) can open tasks at TASK_STATIONS
        if (canCompleteTasks(lp)) {
          const st = TASK_STATIONS.find((s) => {
            const undone = lp.tasks.some((t) => t.taskId === s.id && !t.completed);
            return undone && distance2D(lp.x, lp.z, s.x, s.z) <= s.radius;
          });
          if (st) {
            setActiveTaskId(st.id);
            return;
          }
        }
        if (lp.alive) {
          if (distance2D(lp.x, lp.z, SECURITY_CAMS_POS.x, SECURITY_CAMS_POS.z) <= SECURITY_CAMS_POS.radius) {
            handleOpenStation('cams');
            return;
          }
          if (distance2D(lp.x, lp.z, ADMIN_TABLE_POS.x, ADMIN_TABLE_POS.z) <= ADMIN_TABLE_POS.radius) {
            handleOpenStation('admin');
            return;
          }
          if (distance2D(lp.x, lp.z, VITALS_POS.x, VITALS_POS.z) <= VITALS_POS.radius) {
            handleOpenStation('vitals');
            return;
          }
        }
      } else if (e.code === 'KeyR') {
        const body = findNearestReportableBody(lp, activeSnapshot.bodies);
        if (body) handleReportBody(body.id);
      } else if (e.code === 'KeyF') {
        if (
          lp.alive &&
          !activeSnapshot.sabotage.active &&
          activeSnapshot.emergencyCooldownRemaining <= 0 &&
          lp.emergencyMeetingsLeft > 0 &&
          distance2D(lp.x, lp.z, EMERGENCY_BELL_POS.x, EMERGENCY_BELL_POS.z) <=
            EMERGENCY_BELL_POS.interactRadius
        ) {
          handleEmergencyMeeting();
        }
      } else if (e.code === 'KeyG' && lp.alive) {
        if (lp.specialRole === 'bohurupi' && !lp.disguiseColor) {
          const firstTarget = activeSnapshot.players.find(
            (p) => p.alive && p.id !== lp.id && p.role !== 'vondo',
          );
          if (firstTarget) handleUseAbility(firstTarget.id);
        } else {
          handleUseAbility();
        }
      } else if (e.code === 'KeyQ' && lp.role === 'vondo') {
        const targetPlayer = findNearestKillTarget(lp, activeSnapshot.players);
        if (targetPlayer) handleKill(targetPlayer.id);
      } else if (e.code === 'KeyV' && canUseVent(lp)) {
        handleVentToggle();
      } else if (e.code === 'KeyX' && lp.role === 'vondo') {
        handleSabotage('loadshedding');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    derivedPhase,
    showMemePack,
    showTacticalMap,
    showGuide,
    activeTaskId,
    activeStationModal,
    activeSnapshot,
    activePlayerId,
    startSoloMatch,
    handleToggleMute,
    handleTogglePointerLook,
    handleResetCamera,
    handleFixSabotage,
    handleOpenStation,
    handleCloseStation,
    handleReportBody,
    handleEmergencyMeeting,
    handleUseAbility,
    handleKill,
    handleVentToggle,
    handleSabotage,
    handlePlayMeme,
  ]);

  const activeTaskStation = activeTaskId ? TASK_STATIONS.find((s) => s.id === activeTaskId) ?? null : null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Persistent 3D WebGL Moholla World */}
      <WorldScene
        phase={derivedPhase}
        snapshot={activeSnapshot}
        localPlayerId={activePlayerId}
        moveSpeed={activeSnapshot?.settings.moveSpeed ?? 8.6}
        isModalOpen={
          showMemePack ||
          showTacticalMap ||
          showGuide ||
          Boolean(activeTaskId) ||
          Boolean(activeStationModal) ||
          derivedPhase === 'role_reveal' ||
          derivedPhase === 'meeting' ||
          derivedPhase === 'vote_results' ||
          derivedPhase === 'paused' ||
          derivedPhase === 'gameover'
        }
        joystickInputRef={joystickInputRef}
        onLocalMove={handleLocalMove}
        onShakeTriggerRef={shakeTriggerRef}
        pointerLookEnabled={pointerLookEnabled}
        onPointerLookChange={setPointerLookEnabled}
        resetCameraRef={resetCameraRef}
        jumpTriggerRef={jumpTriggerRef}
      />

      {/* Title Screen */}
      {derivedPhase === 'title' && (
        <TitleOverlay
          playerName={playerName}
          playerColor={playerColor}
          publicRooms={mp.publicRooms}
          errorMsg={mp.errorMsg}
          soloPlayerCount={soloPlayerCount}
          soloSettings={soloSettings}
          onChangeName={setPlayerName}
          onChangeColor={setPlayerColor}
          onChangeSoloPlayerCount={handleChangeSoloPlayerCount}
          onUpdateSoloSettings={handleUpdateSoloSettings}
          onStartSolo={(forceRole, forceSpecial) => {
            if (isTouchOrMobileDevice()) {
              void enterMobileFullscreenAndLandscape();
            }
            startSoloMatch(forceRole, forceSpecial);
          }}
          onCreateRoom={() => {
            if (isTouchOrMobileDevice()) {
              void enterMobileFullscreenAndLandscape();
            }
            setMode('multi');
            mp.createRoom(playerName, playerColor);
          }}
          onJoinRoom={(code) => {
            if (isTouchOrMobileDevice()) {
              void enterMobileFullscreenAndLandscape();
            }
            setMode('multi');
            mp.joinRoom(code, playerName, playerColor);
          }}
          onRefreshRooms={mp.refreshRooms}
          onOpenMemePack={() => setShowMemePack(true)}
          onOpenGuide={() => setShowGuide(true)}
        />
      )}

      {/* Multiplayer Waiting Lobby */}
      {derivedPhase === 'lobby' && activeSnapshot && activePlayerId && (
        <LobbyOverlay
          snapshot={activeSnapshot}
          localPlayerId={activePlayerId}
          errorMsg={mp.errorMsg}
          onUpdateSettings={(s: Partial<RoomSettings>) => mp.send({ type: 'lobby:settings', settings: s })}
          onAddBot={() => mp.send({ type: 'lobby:add_bot' })}
          onRemoveBots={() => mp.send({ type: 'lobby:remove_bots' })}
          onStartMatch={() => mp.send({ type: 'lobby:start' })}
          onLeaveRoom={handleReturnToTitle}
        />
      )}

      {/* Role Reveal Intro Banner */}
      {derivedPhase === 'role_reveal' && activeSnapshot && activePlayerId && (
        <RoleRevealModal
          snapshot={activeSnapshot}
          localPlayerId={activePlayerId}
          onContinue={
            mode === 'solo'
              ? () => {
                  soloEngineRef.current?.dismissRoleReveal();
                  if (soloEngineRef.current) setSoloSnapshot(soloEngineRef.current.getSnapshot());
                }
              : undefined
          }
        />
      )}

      {/* Active Gameplay HUD & Mobile Virtual Thumbstick */}
      {derivedPhase === 'playing' && activeSnapshot && activePlayerId && (
        <>
          <GameHud
            snapshot={activeSnapshot}
            localPlayerId={activePlayerId}
            muted={muted}
            touchControlsEnabled={touchControlsEnabled}
            pointerLookEnabled={pointerLookEnabled}
            clueNotice={clueNotice}
            killFlash={killFlash}
            onToggleTouchControls={() => {
              touchOverrideRef.current = true;
              setTouchControlsEnabled((v) => !v);
            }}
            onTogglePointerLook={handleTogglePointerLook}
            onResetCamera={handleResetCamera}
            onToggleMute={handleToggleMute}
            onPause={() => setPaused(true)}
            onOpenTacticalMap={() => setShowTacticalMap(true)}
            onOpenGuide={() => setShowGuide(true)}
            onOpenTask={(id) => setActiveTaskId(id)}
            onOpenStation={handleOpenStation}
            onReportBody={handleReportBody}
            onEmergencyMeeting={handleEmergencyMeeting}
            onKill={handleKill}
            onSabotage={handleSabotage}
            onLockDoors={handleLockDoors}
            onFixSabotage={handleFixSabotage}
            onVentToggle={handleVentToggle}
            onUseAbility={handleUseAbility}
            onPlayMeme={handlePlayMeme}
            onOpenMemePack={() => setShowMemePack(true)}
          />
          <MobileControls
            visible={
              touchControlsEnabled &&
              !activeTaskId &&
              !activeStationModal &&
              !showMemePack &&
              !showTacticalMap &&
              !showGuide
            }
            joystickInputRef={joystickInputRef}
            onJump={() => jumpTriggerRef.current?.()}
          />
        </>
      )}

      {/* Interactive Mini-Task Modal */}
      {derivedPhase === 'playing' && activeTaskStation && (
        <TaskModal
          station={activeTaskStation}
          onComplete={handleCompleteTask}
          onClose={() => setActiveTaskId(null)}
        />
      )}

      {/* Security Cams / Admin Radar / Vitals ECG Modal */}
      {derivedPhase === 'playing' && activeStationModal && activeSnapshot && (
        <StationModal
          kind={activeStationModal}
          snapshot={activeSnapshot}
          onClose={handleCloseStation}
        />
      )}

      {/* Full-Screen Moholla Tactical & Sabotage Map Modal */}
      {derivedPhase === 'playing' && showTacticalMap && activeSnapshot && activePlayerId && (
        <TacticalMapModal
          snapshot={activeSnapshot}
          localPlayerId={activePlayerId}
          onClose={() => setShowTacticalMap(false)}
          onSabotage={handleSabotage}
          onLockDoors={handleLockDoors}
        />
      )}

      {/* Emergency Adda Voting, Vote Tally & Chat Modal */}
      {(derivedPhase === 'meeting' || derivedPhase === 'vote_results') &&
        activeSnapshot &&
        activePlayerId && (
          <MeetingModal
            snapshot={activeSnapshot}
            localPlayerId={activePlayerId}
            onSendChat={(text) => {
              if (isMulti) mp.send({ type: 'meeting:chat', text });
              else soloEngineRef.current?.sendChat(text);
            }}
            onCastVote={(targetId) => {
              if (isMulti) mp.send({ type: 'meeting:vote', targetId });
              else {
                soloEngineRef.current?.castVote(targetId);
                if (soloEngineRef.current) setSoloSnapshot(soloEngineRef.current.getSnapshot());
              }
            }}
            onPlayMeme={handlePlayMeme}
          />
        )}

      {/* Ejection Transition Banner */}
      {derivedPhase === 'ejecting' && activeSnapshot?.ejection && (
        <EjectionModal ejection={activeSnapshot.ejection} />
      )}

      {/* Pause Modal */}
      {derivedPhase === 'paused' && (
        <PauseModal
          onResume={() => setPaused(false)}
          onRestart={() => {
            if (isMulti) {
              setPaused(false);
            } else {
              startSoloMatch();
            }
          }}
          onTitle={handleReturnToTitle}
          onOpenMemePack={() => setShowMemePack(true)}
        />
      )}

      {/* Victory / Defeat Outcome Modal */}
      {derivedPhase === 'gameover' && activeSnapshot?.outcome && activePlayerId && (
        <OutcomeModal
          snapshot={activeSnapshot}
          localPlayerId={activePlayerId}
          outcome={activeSnapshot.outcome}
          isMultiplayer={isMulti}
          onPlayAgain={() => {
            if (isMulti) mp.send({ type: 'room:play_again' });
            else startSoloMatch();
          }}
          onTitle={handleReturnToTitle}
        />
      )}

      {/* Original Bangla Meme Pack Manager Modal */}
      {showMemePack && <MemePackModal onClose={() => setShowMemePack(false)} />}

      {/* Rules, Roles & Controls Guide Modal */}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
