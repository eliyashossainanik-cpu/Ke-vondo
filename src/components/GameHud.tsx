import { memo, useEffect, useState } from 'react';
import {
  PLAYER_COLORS,
  SPECIAL_ROLES,
  type DoorZoneId,
  type RoomSnapshot,
  type SabotageType,
} from '../shared/types';
import {
  ADMIN_TABLE_POS,
  EMERGENCY_BELL_POS,
  MAP_HALF_SIZE,
  SECURITY_CAMS_POS,
  TASK_STATIONS,
  VENTS,
  VITALS_POS,
  ZONES,
  distance2D,
  getZoneNameAt,
} from '../shared/mapData';
import {
  MISTRI_FIX_RANGE,
  SABOTAGE_FIX_RANGE,
  VENT_RANGE,
  canCompleteTasks,
  canUseVent,
  findNearestCleanableBody,
  findNearestDarogaTarget,
  findNearestInspectableBody,
  findNearestKillTarget,
  findNearestReportableBody,
  findNearestRevivableBody,
  findNearestShieldTarget,
  getConnectedVents,
  getDirectionCompass,
} from '../shared/gameRules';
import type { StationModalKind } from './StationModals';
import { getQuickMemeList, soundEngine, type MemeSoundId } from '../audio/soundEngine';
import { subscribeMemePack } from '../audio/memePackStore';
import {
  Volume2,
  VolumeX,
  Pause,
  Map as MapIcon,
  Zap,
  Skull,
  Bell,
  Wrench,
  DoorOpen,
  Video,
  Radar,
  Activity,
  Lock,
  Gamepad2,
  Crosshair,
  RotateCcw,
  Sparkles,
  Shield,
  Search,
  Smile,
  Music,
  Music2,
  HelpCircle,
  Navigation,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Smartphone,
  X,
  Gavel,
  HeartPulse,
  Sparkle,
} from 'lucide-react';
import {
  enterMobileFullscreenAndLandscape,
  isFullscreenActive,
  subscribeFullscreenChange,
  toggleFullscreenMode,
} from '../utils/mobileFullscreen';

export interface GameHudProps {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  muted: boolean;
  touchControlsEnabled: boolean;
  pointerLookEnabled: boolean;
  clueNotice: { title: string; detail: string } | null;
  killFlash?: boolean;
  onToggleTouchControls: () => void;
  onTogglePointerLook: () => void;
  onResetCamera: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onOpenTacticalMap: () => void;
  onOpenGuide: () => void;
  onOpenTask: (taskId: string) => void;
  onOpenStation: (station: StationModalKind) => void;
  onReportBody: (bodyId: string) => void;
  onEmergencyMeeting: () => void;
  onKill: (targetId: string) => void;
  onSabotage: (type: SabotageType) => void;
  onLockDoors: (zoneId: DoorZoneId) => void;
  onFixSabotage: () => void;
  onVentToggle: (destVentId?: string) => void;
  onUseAbility: (targetId?: string) => void;
  onPlayMeme: (memeId: MemeSoundId) => void;
  onOpenMemePack: () => void;
}

const DOOR_OPTIONS: Array<{ zoneId: DoorZoneId; label: string }> = [
  { zoneId: 'cha_dokan', label: 'Cha Dokan' },
  { zoneId: 'rickshaw_garage', label: 'Rickshaw' },
  { zoneId: 'desco_power', label: 'DESCO' },
  { zoneId: 'dish_roof', label: 'Dish Hub' },
];

const SHORT_ZONE_LABELS: Record<string, string> = {
  adda_chowk: 'Adda',
  cha_dokan: 'Cha',
  rickshaw_garage: 'Garage',
  desco_power: 'DESCO',
  dish_roof: 'Dish',
  pukur_ghat: 'Pukur',
  bazar_stall: 'Bazar',
  eidgah_north: 'Eidgah',
  south_tank: 'WASA',
  fuchka_corner: 'Fuchka',
  saloon_goli: 'Saloon',
  cricket_math: 'Cricket',
  pharmacy_mor: 'Pharma',
  biyer_pandal: 'Pandal',
};

const MinimapStaticZones = memo(function MinimapStaticZones() {
  return (
    <>
      <rect
        x={-MAP_HALF_SIZE}
        y={-MAP_HALF_SIZE}
        width={MAP_HALF_SIZE * 2}
        height={MAP_HALF_SIZE * 2}
        fill="#0f172a"
        rx="2"
      />
      <rect x={-6} y={-MAP_HALF_SIZE} width={12} height={MAP_HALF_SIZE * 2} fill="#1e293b" opacity={0.6} />
      <rect x={-MAP_HALF_SIZE} y={-6} width={MAP_HALF_SIZE * 2} height={12} fill="#1e293b" opacity={0.6} />
      {ZONES.map((z) => (
        <rect
          key={z.id}
          x={z.x - z.width / 2}
          y={z.z - z.depth / 2}
          width={z.width}
          height={z.depth}
          fill={z.color}
          fillOpacity={0.62}
          stroke="#94a3b8"
          strokeWidth="0.6"
          rx="1.5"
        />
      ))}
      <circle cx={SECURITY_CAMS_POS.x} cy={SECURITY_CAMS_POS.z} r={1.45} fill="#fb7185" />
      <circle cx={ADMIN_TABLE_POS.x} cy={ADMIN_TABLE_POS.z} r={1.45} fill="#38bdf8" />
      <circle cx={VITALS_POS.x} cy={VITALS_POS.z} r={1.45} fill="#34d399" />
    </>
  );
});

const MinimapStaticLabels = memo(function MinimapStaticLabels() {
  return (
    <>
      {ZONES.map((z) => (
        <text
          key={`${z.id}-lbl`}
          x={z.x}
          y={z.z - z.depth / 2 + 4.4}
          textAnchor="middle"
          fill="#f8fafc"
          stroke="#090f1d"
          strokeWidth="1.5"
          paintOrder="stroke"
          fontSize="4.1"
          fontWeight="800"
        >
          {SHORT_ZONE_LABELS[z.id] ?? z.name}
        </text>
      ))}
    </>
  );
});

export function GameHud({
  snapshot,
  localPlayerId,
  muted,
  touchControlsEnabled,
  pointerLookEnabled,
  clueNotice,
  killFlash = false,
  onToggleTouchControls,
  onTogglePointerLook,
  onResetCamera,
  onToggleMute,
  onPause,
  onOpenTacticalMap,
  onOpenGuide,
  onOpenTask,
  onOpenStation,
  onReportBody,
  onEmergencyMeeting,
  onKill,
  onSabotage,
  onLockDoors,
  onFixSabotage,
  onVentToggle,
  onUseAbility,
  onPlayMeme,
  onOpenMemePack,
}: GameHudProps) {
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));
  const [isFullscreen, setIsFullscreen] = useState(() => isFullscreenActive());
  const [mobileTasksExpanded, setMobileTasksExpanded] = useState(false);
  const [dismissRotatePrompt, setDismissRotatePrompt] = useState(false);
  const [showSabotageMenu, setShowSabotageMenu] = useState(false);
  const [showDisguiseMenu, setShowDisguiseMenu] = useState(false);
  const [showMemeDrawer, setShowMemeDrawer] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(() => soundEngine.isBgmEnabled());
  const [, setPackVer] = useState(0);

  useEffect(() => subscribeMemePack(() => setPackVer((v) => v + 1)), []);
  useEffect(() => subscribeFullscreenChange(setIsFullscreen), []);
  useEffect(
    () => soundEngine.subscribeBgmState(() => setBgmEnabled(soundEngine.isBgmEnabled())),
    [],
  );
  useEffect(() => {
    const updateVp = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', updateVp);
    window.visualViewport?.addEventListener('resize', updateVp);
    return () => {
      window.removeEventListener('resize', updateVp);
      window.visualViewport?.removeEventListener('resize', updateVp);
    };
  }, []);

  const isLandscapeCompact = viewport.h <= 540;
  const isNarrowMobile = viewport.w < 640;
  const isMobileHud = isLandscapeCompact || isNarrowMobile || touchControlsEnabled;
  const showMinimap = true;
  const quickMemes = getQuickMemeList();

  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  if (!localPlayer) return null;

  const isVondo = localPlayer.role === 'vondo';
  const isPagol = localPlayer.specialRole === 'pagol';
  const taskEligible = canCompleteTasks(localPlayer);
  const specialMeta = SPECIAL_ROLES[localPlayer.specialRole];
  const currentZone = getZoneNameAt(localPlayer.x, localPlayer.z);
  const currentZoneDef = ZONES.find((z) => z.name === currentZone);

  // Allow alive OR ghost Para-basi (non-Pagol) to complete remaining tasks!
  const nearbyTask = taskEligible
    ? TASK_STATIONS.find((st) => {
        const hasUndone = localPlayer.tasks.some((t) => t.taskId === st.id && !t.completed);
        return hasUndone && distance2D(localPlayer.x, localPlayer.z, st.x, st.z) <= st.radius;
      })
    : null;

  const nearCams =
    localPlayer.alive &&
    distance2D(localPlayer.x, localPlayer.z, SECURITY_CAMS_POS.x, SECURITY_CAMS_POS.z) <=
      SECURITY_CAMS_POS.radius;
  const nearAdmin =
    localPlayer.alive &&
    distance2D(localPlayer.x, localPlayer.z, ADMIN_TABLE_POS.x, ADMIN_TABLE_POS.z) <=
      ADMIN_TABLE_POS.radius;
  const nearVitals =
    localPlayer.alive &&
    distance2D(localPlayer.x, localPlayer.z, VITALS_POS.x, VITALS_POS.z) <= VITALS_POS.radius;

  const fixRange = localPlayer.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
  const nearSabotageFix =
    snapshot.sabotage.active &&
    localPlayer.alive &&
    distance2D(
      localPlayer.x,
      localPlayer.z,
      snapshot.sabotage.fixStationX,
      snapshot.sabotage.fixStationZ,
    ) <= fixRange;

  const nearbyBody = findNearestReportableBody(localPlayer, snapshot.bodies);
  const inspectableBody = findNearestInspectableBody(localPlayer, snapshot.bodies);
  const shieldTarget = findNearestShieldTarget(localPlayer, snapshot.players);
  const darogaTarget = findNearestDarogaTarget(localPlayer, snapshot.players);
  const cleanableBody = findNearestCleanableBody(localPlayer, snapshot.bodies);
  const revivableBody = findNearestRevivableBody(localPlayer, snapshot.bodies);

  const nearBell =
    localPlayer.alive &&
    !snapshot.sabotage.active &&
    distance2D(localPlayer.x, localPlayer.z, EMERGENCY_BELL_POS.x, EMERGENCY_BELL_POS.z) <=
      EMERGENCY_BELL_POS.interactRadius;

  const killTarget = isVondo ? findNearestKillTarget(localPlayer, snapshot.players) : null;
  const playerCanVent = canUseVent(localPlayer);
  const nearVent =
    (isVondo || localPlayer.specialRole === 'mistri') && localPlayer.alive
      ? VENTS.find((v) => distance2D(localPlayer.x, localPlayer.z, v.x, v.z) <= VENT_RANGE)
      : null;

  const disguiseTargets =
    localPlayer.specialRole === 'bohurupi'
      ? snapshot.players.filter((p) => p.alive && p.id !== localPlayer.id && p.role !== 'vondo')
      : [];

  const taskPct = Math.round(snapshot.taskProgress * 100);
  const emergencyCd = Math.ceil(snapshot.emergencyCooldownRemaining);
  const canCallEmergency =
    nearBell && emergencyCd <= 0 && localPlayer.emergencyMeetingsLeft > 0;
  const anyDoorLocked =
    snapshot.doorLocks.cha_dokan > 0 ||
    snapshot.doorLocks.rickshaw_garage > 0 ||
    snapshot.doorLocks.desco_power > 0 ||
    snapshot.doorLocks.dish_roof > 0;

  const ventGraph = localPlayer.inVent
    ? getConnectedVents(localPlayer.x, localPlayer.z)
    : { currentVent: null, targets: [] };

  // Compute nearest incomplete task or active sabotage compass bearing
  const nextTaskStation = taskEligible
    ? localPlayer.tasks
        .filter((t) => !t.completed)
        .map((t) => TASK_STATIONS.find((s) => s.id === t.taskId))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .sort(
          (a, b) =>
            distance2D(localPlayer.x, localPlayer.z, a.x, a.z) -
            distance2D(localPlayer.x, localPlayer.z, b.x, b.z),
        )[0] ?? null
    : null;

  const activeCompass = snapshot.sabotage.active
    ? {
        urgent: true,
        label: snapshot.sabotage.active === 'loadshedding' ? 'DESCO Breaker' : 'Dish Hub',
        ...getDirectionCompass(
          localPlayer.x,
          localPlayer.z,
          snapshot.sabotage.fixStationX,
          snapshot.sabotage.fixStationZ,
        ),
      }
    : nextTaskStation
      ? {
          urgent: false,
          label: nextTaskStation.title,
          ...getDirectionCompass(
            localPlayer.x,
            localPlayer.z,
            nextTaskStation.x,
            nextTaskStation.z,
          ),
        }
      : null;

  return (
    <div
      className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.65rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.65rem, env(safe-area-inset-right))',
      }}
    >
      {/* Subtle Crimson Vignette Flash on Kill / Size Event */}
      {killFlash && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 110px rgba(225, 29, 72, 0.72)',
            backgroundColor: 'rgba(159, 18, 57, 0.16)',
          }}
        />
      )}

      {/* Top Container: Portrait Fullscreen Banner (when in portrait) + Left/Right HUD Clusters */}
      <div className="flex flex-col gap-1.5">
        {/* Non-blocking Portrait Mobile Fullscreen Landscape Quick Chip */}
        {touchControlsEnabled &&
          !isFullscreen &&
          viewport.w < viewport.h &&
          !dismissRotatePrompt &&
          !clueNotice && (
            <div className="self-center pointer-events-auto flex items-center gap-1.5 rounded-xl px-2.5 py-1 border border-amber-400/45 shadow-lg bg-slate-950/92 text-[11px] font-bold text-amber-200 whitespace-nowrap shrink-0">
              <button
                type="button"
                onClick={() => {
                  void enterMobileFullscreenAndLandscape();
                }}
                className="flex items-center gap-1.5 text-amber-200 hover:text-white"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-300" />
                <span>Fullscreen Landscape</span>
                <Maximize2 className="w-3 h-3 text-amber-300" />
              </button>
              <button
                type="button"
                onClick={() => setDismissRotatePrompt(true)}
                aria-label="Dismiss fullscreen tip"
                className="p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

        {/* Top Row: Left Task/Role Cluster & Right Utility/Minimap Cluster */}
        <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Top-Left Cluster */}
        <div
          className={`flex flex-col gap-1.5 w-full ${
            isLandscapeCompact ? 'max-w-[210px]' : 'max-w-[205px] sm:max-w-xs'
          }`}
        >
          <div
            className={`pointer-events-auto rounded-xl border border-white/12 shadow-lg ${
              isLandscapeCompact ? 'px-2.5 py-1.5' : 'px-3 py-2 sm:px-4 sm:py-3'
            }`}
            style={{ backgroundColor: 'rgba(12, 18, 30, 0.86)' }}
          >
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-300">Para Tasks</span>
              <span className="font-mono-tabular text-amber-300">
                {snapshot.completedTasks}/{snapshot.totalTasks} · {taskPct}%
              </span>
            </div>
            <div className="w-full h-2 sm:h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${taskPct}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs gap-2">
              <span
                className="font-display font-bold truncate"
                style={{
                  color:
                    localPlayer.specialRole !== 'none'
                      ? specialMeta.accentHex
                      : isVondo
                        ? '#fb7185'
                        : '#7dd3fc',
                }}
              >
                {localPlayer.specialRole !== 'none'
                  ? specialMeta.title.split(' ')[0].toUpperCase()
                  : isVondo
                    ? 'BATPAR'
                    : 'PARA-BASI'}
                {localPlayer.specialRole === 'neta' && localPlayer.alive ? ' · 2x Vote' : ''}
                {!localPlayer.alive ? ' · Ghost' : ''}
              </span>
              <span className="text-slate-200 font-semibold truncate max-w-[130px] sm:max-w-[155px]" title={currentZone}>
                {currentZoneDef ? `${currentZoneDef.name}` : currentZone}
              </span>
            </div>

            {activeCompass && (
              <div
                className={`mt-1.5 pt-1.5 border-t border-slate-800/90 flex items-center justify-between gap-2 text-[11px] font-semibold ${
                  activeCompass.urgent ? 'text-rose-300' : 'text-amber-200'
                }`}
              >
                <span className="flex items-center gap-1 truncate">
                  <Navigation className="w-3 h-3 shrink-0" />
                  <span className="truncate">{activeCompass.label}</span>
                </span>
                <span className="font-mono-tabular shrink-0 px-1.5 py-0.5 rounded bg-slate-800/90 text-white">
                  {activeCompass.arrow} {activeCompass.distance}m
                </span>
              </div>
            )}

            {!localPlayer.alive && taskEligible && (
              <div className="mt-1 text-[10px] font-semibold text-sky-300">
                Ghost Mode: Fly through walls &amp; finish tasks!
              </div>
            )}

            {(localPlayer.shielded || localPlayer.disguiseName) && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[11px] font-semibold flex items-center gap-1.5">
                {localPlayer.shielded && (
                  <span className="text-amber-300 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Tabiz Shielded
                  </span>
                )}
                {localPlayer.disguiseName && (
                  <span className="text-rose-300 font-mono-tabular">
                    Shifted: {localPlayer.disguiseName} ({Math.ceil(localPlayer.disguiseTimer)}s)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Assigned Task List (Desktop expanded; Mobile/Landscape compact collapsible pill so joystick stays unobstructed) */}
          {isPagol ? (
            !isLandscapeCompact && (
              <div
                className="hidden sm:block rounded-xl px-3.5 py-2.5 border border-purple-500/40 shadow-lg text-xs text-purple-200"
                style={{ backgroundColor: 'rgba(28, 14, 44, 0.9)' }}
              >
                <span className="font-display font-bold text-purple-300 block mb-0.5">
                  পাগলা বাবা · Pagla Baba Goal
                </span>
                Shondhojonok ghuraghuri koro ar Shalish e nijeke Pukur e chubani khawao!
              </div>
            )
          ) : (
            !isVondo &&
            (isLandscapeCompact || isNarrowMobile ? (
              <div className="pointer-events-auto">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setMobileTasksExpanded((v) => !v);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-white/12 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 shadow"
                  style={{ backgroundColor: 'rgba(10, 15, 28, 0.84)' }}
                >
                  <span>
                    Tasks ({localPlayer.tasks.filter((t) => t.completed).length}/{localPlayer.tasks.length})
                  </span>
                  {mobileTasksExpanded ? (
                    <ChevronUp className="w-3 h-3 text-amber-300" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-amber-300" />
                  )}
                </button>
                {mobileTasksExpanded && (
                  <div
                    className="mt-1 rounded-xl px-2.5 py-2 border border-white/15 shadow-lg text-[11px] space-y-1 max-h-[120px] overflow-y-auto"
                    style={{ backgroundColor: 'rgba(10, 15, 28, 0.94)' }}
                  >
                    {localPlayer.tasks.map((t) => {
                      const st = TASK_STATIONS.find((s) => s.id === t.taskId);
                      if (!st) return null;
                      return (
                        <div
                          key={t.taskId}
                          className={`flex items-center justify-between gap-2 ${
                            t.completed
                              ? 'text-emerald-400 line-through opacity-75'
                              : 'text-slate-100 font-medium'
                          }`}
                        >
                          <span className="truncate">{st.title}</span>
                          <span className="text-[10px] text-slate-300 shrink-0">{st.zoneName}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="rounded-xl px-3.5 py-2.5 border border-white/15 shadow-lg text-xs space-y-1"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.92)' }}
              >
                {localPlayer.tasks.map((t) => {
                  const st = TASK_STATIONS.find((s) => s.id === t.taskId);
                  if (!st) return null;
                  return (
                    <div
                      key={t.taskId}
                      className={`flex items-center justify-between gap-2 ${
                        t.completed ? 'text-emerald-400 line-through opacity-75' : 'text-slate-100 font-medium'
                      }`}
                    >
                      <span className="truncate">{st.title}</span>
                      <span className="text-[11px] text-slate-300 shrink-0">{st.zoneName}</span>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {/* Active Sabotage Alert */}
          {snapshot.sabotage.active && (
            <div
              role="alert"
              className="rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 border border-rose-500/60 text-[11px] sm:text-xs font-bold text-rose-100 flex items-center justify-between gap-2"
              style={{ backgroundColor: 'rgba(127, 29, 29, 0.92)' }}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                {snapshot.sabotage.active === 'loadshedding' ? (
                  <>
                    <span className="sm:hidden">BATTI GELO! DESCO JAO</span>
                    <span className="hidden sm:inline">BATTI GELO! DESCO Fuse e Pani Dise!</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">WI-FI NAI! DISH JAO</span>
                    <span className="hidden sm:inline">WI-FI NAI! TikTok Atke Gese — Dish Jao!</span>
                  </>
                )}
              </span>
              <span className="font-mono-tabular text-amber-300 shrink-0">
                {Math.ceil(snapshot.sabotage.timeRemaining)}s
              </span>
            </div>
          )}

          {anyDoorLocked && (
            <div
              className="rounded-xl px-3 py-1.5 border border-amber-400/50 text-[11px] font-bold text-amber-200 flex items-center gap-1.5"
              style={{ backgroundColor: 'rgba(120, 53, 15, 0.9)' }}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              SHUTTER NAMAY DISE!
            </div>
          )}
        </div>

        {/* Top-Right Cluster: Utility Buttons + Live Moholla SVG Minimap */}
        <div className="flex flex-col items-end gap-1.5 sm:gap-2">
          <div
            className={`pointer-events-auto ${
              isLandscapeCompact
                ? 'flex items-center justify-end gap-1'
                : 'grid grid-cols-4 sm:flex sm:flex-wrap items-center justify-end gap-1.5 sm:gap-2'
            }`}
          >
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                void toggleFullscreenMode(true);
              }}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              title={isFullscreen ? 'Exit Fullscreen' : 'PUBG Fullscreen Mode'}
              className={`${
                isLandscapeCompact
                  ? 'min-w-[34px] min-h-[34px] px-2'
                  : 'min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] sm:px-2.5'
              } rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold ${
                isFullscreen
                  ? 'border-emerald-400/60 text-emerald-300'
                  : 'border-amber-400/45 text-amber-200 hover:text-white'
              }`}
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.88)' }}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden xl:inline">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                setShowMemeDrawer((v) => !v);
              }}
              aria-label="Toggle Meme Soundboard [1-6]"
              aria-expanded={showMemeDrawer}
              title="Bangla Meme SFX [1-6]"
              className={`${
                isLandscapeCompact
                  ? 'min-w-[34px] min-h-[34px]'
                  : 'min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] sm:px-2.5'
              } rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold ${
                showMemeDrawer
                  ? 'border-amber-400 text-amber-300'
                  : 'border-white/12 text-amber-200 hover:text-amber-100'
              }`}
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.88)' }}
            >
              <Smile className="w-4 h-4" />
              {!isLandscapeCompact && <span className="hidden sm:inline">Memes</span>}
            </button>
            {!isMobileHud && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTogglePointerLook();
                }}
                aria-label="Toggle Free Mouse Look [C]"
                title="PUBG Free Mouse Look [C]"
                className={`hidden sm:flex min-w-[44px] min-h-[44px] px-2.5 rounded-xl border items-center justify-center gap-1.5 text-xs font-semibold ${
                  pointerLookEnabled
                    ? 'border-amber-400 text-amber-300'
                    : 'border-white/12 text-slate-200 hover:text-white'
                }`}
                style={{ backgroundColor: 'rgba(12, 18, 30, 0.88)' }}
              >
                <Crosshair className="w-4 h-4" />
                <span className="hidden lg:inline">{pointerLookEnabled ? 'Look ON' : 'Mouse Look'}</span>
              </button>
            )}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onResetCamera();
              }}
              aria-label="Reset Camera Angle [Y]"
              title="Reset Camera [Y]"
              className={`${
                isLandscapeCompact
                  ? 'min-w-[34px] min-h-[34px]'
                  : 'min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px]'
              } rounded-xl border border-white/12 flex items-center justify-center text-slate-200 hover:text-white`}
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.88)' }}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {!isLandscapeCompact && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleTouchControls();
                }}
                aria-label="Toggle Touch Joystick"
                title="Touch Controls"
                className={`min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] rounded-xl border flex items-center justify-center ${
                  touchControlsEnabled
                    ? 'border-amber-400/60 text-amber-300'
                    : 'border-white/12 text-slate-200 hover:text-white'
                }`}
                style={{ backgroundColor: 'rgba(12, 18, 30, 0.88)' }}
              >
                <Gamepad2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenTacticalMap();
              }}
              aria-label="Open Full Tactical Map [Tab]"
              title="Full Moholla Map [Tab]"
              className={`${
                isLandscapeCompact
                  ? 'min-w-[34px] min-h-[34px]'
                  : 'min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] sm:px-2.5'
              } rounded-xl border border-white/12 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-amber-300`}
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.88)' }}
            >
              <MapIcon className="w-4 h-4" />
              {!isLandscapeCompact && <span className="hidden lg:inline">Map</span>}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenGuide();
              }}
              aria-label="Open Rules and Roles Guide [H]"
              title="Rules & Roles [H]"
              className={`${
                isLandscapeCompact
                  ? 'min-w-[34px] min-h-[34px]'
                  : 'min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px]'
              } rounded-xl border border-white/12 flex items-center justify-center text-slate-200 hover:text-amber-300`}
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.88)' }}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                soundEngine.toggleBgm();
              }}
              aria-label={bgmEnabled ? 'Turn Off Background Music' : 'Turn On Background Music'}
              title={bgmEnabled ? 'BGM On (Click to Mute Music)' : 'BGM Off (Click to Play Music)'}
              className={`${
                isLandscapeCompact
                  ? 'min-w-[34px] min-h-[34px]'
                  : 'min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px]'
              } rounded-xl border flex items-center justify-center ${
                bgmEnabled
                  ? 'border-emerald-400/50 text-emerald-300 hover:text-emerald-200'
                  : 'border-white/12 text-slate-400 hover:text-white'
              }`}
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.88)' }}
            >
              <Music className="w-4 h-4" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
              title="Mute All [M]"
              className={`${
                isLandscapeCompact
                  ? 'min-w-[34px] min-h-[34px]'
                  : 'min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px]'
              } rounded-xl border border-white/12 flex items-center justify-center text-slate-200 hover:text-white`}
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.88)' }}
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pause Game [P]"
              title="Pause [P]"
              className={`${
                isLandscapeCompact
                  ? 'min-w-[34px] min-h-[34px]'
                  : 'min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px]'
              } rounded-xl border border-white/12 flex items-center justify-center text-slate-200 hover:text-white`}
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.88)' }}
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {showMemeDrawer && (
            <div
              role="region"
              aria-label="Bangla Meme Soundboard"
              className="pointer-events-auto rounded-xl p-2.5 border border-amber-400/40 shadow-2xl grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-[210px] sm:w-[376px]"
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.96)' }}
            >
              {quickMemes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onPlayMeme(m.id);
                  }}
                  className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-[11px] font-bold text-amber-200 text-left flex items-center justify-between gap-2 transition-colors"
                >
                  <span className="truncate">{m.label}</span>
                  <span className="font-mono-tabular text-[10px] opacity-75 shrink-0">[{m.shortKey}]</span>
                </button>
              ))}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowMemeDrawer(false);
                  onOpenMemePack();
                }}
                className="sm:col-span-2 mt-1 px-3 py-2 rounded-lg bg-amber-400/15 hover:bg-amber-400 hover:text-slate-950 border border-amber-400/40 text-[11px] font-bold text-amber-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Music2 className="w-3.5 h-3.5" />
                Upload / Customize Original Memes
              </button>
            </div>
          )}

          {showMinimap && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenTacticalMap();
              }}
              aria-label="Expand Moholla Tactical Map"
              title="Click to Expand Tactical Map [Tab]"
              className={`pointer-events-auto rounded-xl border border-white/12 hover:border-amber-400/50 shadow-lg transition-colors ${
                isLandscapeCompact || isNarrowMobile ? 'p-1' : 'p-2'
              }`}
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.84)' }}
            >
              <svg
                viewBox={`${-MAP_HALF_SIZE} ${-MAP_HALF_SIZE} ${MAP_HALF_SIZE * 2} ${MAP_HALF_SIZE * 2}`}
                className={
                  isLandscapeCompact
                    ? 'w-[92px] h-[92px]'
                    : isNarrowMobile
                      ? 'w-24 h-24'
                      : 'w-44 h-44'
                }
                aria-hidden="true"
              >
                <MinimapStaticZones />

                {/* Dynamic Incomplete Task Markers */}
                {!isVondo &&
                  !isPagol &&
                  localPlayer.tasks
                    .filter((t) => !t.completed)
                    .map((t) => {
                      const st = TASK_STATIONS.find((s) => s.id === t.taskId);
                      if (!st) return null;
                      return (
                        <circle
                          key={st.id}
                          cx={st.x}
                          cy={st.z}
                          r={1.9}
                          fill="#fbbf24"
                          stroke="#0f172a"
                          strokeWidth="0.7"
                        />
                      );
                    })}

                {/* Sabotage Marker */}
                {snapshot.sabotage.active && (
                  <circle
                    cx={snapshot.sabotage.fixStationX}
                    cy={snapshot.sabotage.fixStationZ}
                    r={2.5}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                )}

                {/* Local Player Marker */}
                <circle
                  cx={localPlayer.x}
                  cy={localPlayer.z}
                  r={2.3}
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="0.85"
                />

                <MinimapStaticLabels />
              </svg>
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Top-Center Clue / Ability Toast */}
      {clueNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-30 max-w-md w-[90vw] rounded-xl px-4 py-2.5 border border-cyan-400/50 shadow-2xl text-center"
          style={{ backgroundColor: 'rgba(10, 18, 32, 0.94)' }}
        >
          <div className="text-xs font-display font-bold text-cyan-300">{clueNotice.title}</div>
          <div className="text-[11px] sm:text-xs text-slate-100 mt-0.5">{clueNotice.detail}</div>
        </div>
      )}

      {/* Bottom Row: Vent/Sabotage/Disguise Drawers + Thumb-Friendly Action Buttons */}
      <div className="flex items-end justify-between gap-2 sm:gap-4">
        {!isMobileHud && (
          <div
            className="text-xs text-slate-200 hidden md:block px-3 py-1.5 rounded-lg border border-slate-700/50"
            style={{ backgroundColor: 'rgba(10, 15, 25, 0.84)' }}
          >
            WASD Move · Space Jump · Shift Sprint · Drag 360°/Sky · Tab Map · E Use · R Report · F Shalish · H Guide
          </div>
        )}

        <div
          className={`pointer-events-auto flex flex-col items-end gap-2 ml-auto ${
            isLandscapeCompact
              ? 'mr-14'
              : touchControlsEnabled
                ? 'mr-16 max-w-[46vw] sm:max-w-none'
                : 'max-w-[54vw] sm:max-w-none'
          }`}
        >
          {localPlayer.inVent && (
            <div
              className="rounded-xl p-2.5 border border-emerald-500/40 flex flex-wrap items-center justify-end gap-2"
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.94)' }}
            >
              <span className="text-xs font-bold text-emerald-300 mr-1">
                {ventGraph.currentVent ? `Inside ${ventGraph.currentVent.label}:` : 'Gopon Dren:'}
              </span>
              {ventGraph.targets.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onVentToggle(v.id)}
                  className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-xs font-semibold text-white"
                >
                  → {v.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onVentToggle()}
                className="min-h-[40px] px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold"
              >
                Uki Maro! [V]
              </button>
            </div>
          )}

          {showSabotageMenu && isVondo && (
            <div
              className="rounded-xl p-3 border border-rose-500/40 flex flex-col gap-2"
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.95)' }}
            >
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={Boolean(snapshot.sabotage.active) || snapshot.sabotage.cooldownRemaining > 0}
                  onClick={() => {
                    onSabotage('loadshedding');
                    setShowSabotageMenu(false);
                  }}
                  className="min-h-[42px] px-3 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-xs font-bold text-white"
                >
                  Current Khao! (Loadshedding)
                </button>
                <button
                  type="button"
                  disabled={Boolean(snapshot.sabotage.active) || snapshot.sabotage.cooldownRemaining > 0}
                  onClick={() => {
                    onSabotage('wifi_down');
                    setShowSabotageMenu(false);
                  }}
                  className="min-h-[42px] px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-xs font-bold text-white"
                >
                  MB Shesh! Wi-Fi Kat!
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1 mr-1">
                  <Lock className="w-3 h-3" />
                  Shutter Namaw{snapshot.doorLocks.cooldownRemaining > 0 ? ` (${Math.ceil(snapshot.doorLocks.cooldownRemaining)}s)` : ':'}
                </span>
                {DOOR_OPTIONS.map((d) => (
                  <button
                    key={d.zoneId}
                    type="button"
                    disabled={snapshot.doorLocks.cooldownRemaining > 0}
                    onClick={() => {
                      onLockDoors(d.zoneId);
                      setShowSabotageMenu(false);
                    }}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-600 disabled:opacity-40 text-[11px] font-semibold text-white"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showDisguiseMenu && localPlayer.specialRole === 'bohurupi' && !localPlayer.disguiseColor && (
            <div
              className="rounded-xl p-2.5 border border-rose-500/40 flex flex-wrap items-center justify-end gap-1.5 max-w-md"
              style={{ backgroundColor: 'rgba(12, 18, 30, 0.95)' }}
            >
              <span className="text-[11px] font-bold text-rose-300 mr-1">Shapeshift Into:</span>
              {disguiseTargets.map((target) => {
                const c = PLAYER_COLORS.find((col) => col.id === target.color) ?? PLAYER_COLORS[0];
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => {
                      onUseAbility(target.id);
                      setShowDisguiseMenu(false);
                    }}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-700 text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                    {target.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {nearSabotageFix && (
              <button
                type="button"
                onClick={onFixSabotage}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 transition-transform text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg"
              >
                <Wrench className="w-4 h-4" />
                Fix Sabotage [E]
              </button>
            )}

            {nearbyTask && (
              <button
                type="button"
                onClick={() => onOpenTask(nearbyTask.id)}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 transition-transform text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg"
              >
                <Wrench className="w-4 h-4" />
                {nearbyTask.title} [E]
              </button>
            )}

            {nearCams && (
              <button
                type="button"
                onClick={() => onOpenStation('cams')}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 active:scale-95 transition-transform text-white font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg"
              >
                <Video className="w-4 h-4" />
                CCTV [E]
              </button>
            )}

            {nearAdmin && (
              <button
                type="button"
                onClick={() => onOpenStation('admin')}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 transition-transform text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg"
              >
                <Radar className="w-4 h-4" />
                Admin Map [E]
              </button>
            )}

            {nearVitals && (
              <button
                type="button"
                onClick={() => onOpenStation('vitals')}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-transform text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg"
              >
                <Activity className="w-4 h-4" />
                Vitals [E]
              </button>
            )}

            {nearBell && (
              <button
                type="button"
                disabled={!canCallEmergency}
                onClick={onEmergencyMeeting}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 transition-transform disabled:opacity-45 text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg font-mono-tabular"
              >
                <Bell className="w-4 h-4" />
                {localPlayer.emergencyMeetingsLeft <= 0
                  ? 'Bell Shesh!'
                  : emergencyCd > 0
                  ? `Shalish CD ${emergencyCd}s`
                  : `Shalish Dako! [F] (${localPlayer.emergencyMeetingsLeft})`}
              </button>
            )}

            {nearbyBody && (
              <button
                type="button"
                onClick={() => onReportBody(nearbyBody.id)}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-transform text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg"
              >
                <Bell className="w-4 h-4" />
                Haire! {nearbyBody.victimName} Size! [R]
              </button>
            )}

            {/* Special Role Active Ability [G] */}
            {localPlayer.alive && localPlayer.specialRole === 'goyenda' && (
              <button
                type="button"
                disabled={!inspectableBody}
                onClick={() => onUseAbility()}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 transition-transform disabled:opacity-35 text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg"
              >
                <Search className="w-4 h-4" />
                {inspectableBody ? `Inspect Clue [G]` : 'Clue [G]'}
              </button>
            )}

            {localPlayer.alive && localPlayer.specialRole === 'kobiraj' && (
              <button
                type="button"
                disabled={localPlayer.abilityCooldown > 0.05}
                onClick={() => onUseAbility()}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-transform disabled:opacity-35 text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 font-mono-tabular shadow-lg"
              >
                <Shield className="w-4 h-4" />
                {localPlayer.abilityCooldown > 0.05
                  ? `Tabiz (${Math.ceil(localPlayer.abilityCooldown)}s)`
                  : shieldTarget
                    ? `Shield ${shieldTarget.name} [G]`
                    : 'Self Tabiz [G]'}
              </button>
            )}

            {localPlayer.alive && localPlayer.specialRole === 'daroga' && (
              <button
                type="button"
                disabled={!darogaTarget || localPlayer.abilityCooldown > 0.05}
                onClick={() => darogaTarget && onUseAbility(darogaTarget.id)}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-transform disabled:opacity-35 text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 font-mono-tabular shadow-lg"
              >
                <Gavel className="w-4 h-4" />
                {localPlayer.abilityCooldown > 0.05
                  ? `Daroga (${Math.ceil(localPlayer.abilityCooldown)}s)`
                  : darogaTarget
                    ? `Arrest ${darogaTarget.name} [G]`
                    : 'Arrest Shot [G]'}
              </button>
            )}

            {localPlayer.alive && localPlayer.specialRole === 'daktar' && (
              <button
                type="button"
                disabled={!revivableBody || (localPlayer.revivesLeft ?? 0) <= 0}
                onClick={() => revivableBody && onUseAbility(revivableBody.id)}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 active:scale-95 transition-transform disabled:opacity-35 text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 font-mono-tabular shadow-lg"
              >
                <HeartPulse className="w-4 h-4" />
                {(localPlayer.revivesLeft ?? 0) <= 0
                  ? 'Saline Used'
                  : revivableBody
                    ? `Revive ${revivableBody.victimName} [G]`
                    : `Saline Revive (${localPlayer.revivesLeft ?? 0}) [G]`}
              </button>
            )}

            {localPlayer.alive && localPlayer.specialRole === 'jharudar' && (
              <button
                type="button"
                disabled={!cleanableBody || localPlayer.abilityCooldown > 0.05}
                onClick={() => cleanableBody && onUseAbility(cleanableBody.id)}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 active:scale-95 transition-transform disabled:opacity-35 text-white font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 font-mono-tabular shadow-lg"
              >
                <Sparkle className="w-4 h-4" />
                {localPlayer.abilityCooldown > 0.05
                  ? `Clean (${Math.ceil(localPlayer.abilityCooldown)}s)`
                  : cleanableBody
                    ? `Clean ${cleanableBody.victimName} [G]`
                    : 'Clean Lash [G]'}
              </button>
            )}

            {localPlayer.alive && localPlayer.specialRole === 'bohurupi' && (
              <button
                type="button"
                disabled={!localPlayer.disguiseColor && localPlayer.abilityCooldown > 0.05}
                onClick={() => {
                  if (localPlayer.disguiseColor) {
                    onUseAbility();
                    setShowDisguiseMenu(false);
                  } else {
                    setShowDisguiseMenu((s) => !s);
                  }
                }}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 active:scale-95 transition-transform disabled:opacity-35 text-white font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 font-mono-tabular shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                {localPlayer.disguiseColor
                  ? `Drop Shift [G] (${Math.ceil(localPlayer.disguiseTimer)}s)`
                  : localPlayer.abilityCooldown > 0.05
                    ? `Shift (${Math.ceil(localPlayer.abilityCooldown)}s)`
                    : 'Shapeshift [G]'}
              </button>
            )}

            {/* Drain Vent Button (Batpar OR Current Babu) */}
            {localPlayer.alive && (isVondo || localPlayer.specialRole === 'mistri') && (
              <button
                type="button"
                disabled={(!nearVent && !localPlayer.inVent) || !playerCanVent}
                onClick={() => onVentToggle()}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-transform disabled:opacity-35 text-white font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 font-mono-tabular shadow-lg"
              >
                <DoorOpen className="w-4 h-4" />
                {localPlayer.specialRole === 'mistri' && !localPlayer.inVent && localPlayer.abilityCooldown > 0.05
                  ? `Dren (${Math.ceil(localPlayer.abilityCooldown)}s)`
                  : 'Dren e Dhuko [V]'}
              </button>
            )}

            {isVondo && localPlayer.alive && (
              <>
                <button
                  type="button"
                  onClick={() => setShowSabotageMenu((s) => !s)}
                  className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 transition-transform text-white font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 font-mono-tabular shadow-lg"
                >
                  <Zap className="w-4 h-4" />
                  {snapshot.sabotage.cooldownRemaining > 0
                    ? `Jhamela (${Math.ceil(snapshot.sabotage.cooldownRemaining)}s)`
                    : 'Jhamela Koro [X]'}
                </button>

                <button
                  type="button"
                  disabled={!killTarget || localPlayer.killCooldownRemaining > 0.05}
                  onClick={() => killTarget && onKill(killTarget.id)}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 transition-transform disabled:opacity-35 text-white font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 font-mono-tabular shadow-lg"
                >
                  <Skull className="w-4 h-4" />
                  {localPlayer.killCooldownRemaining > 0.05
                    ? `${Math.ceil(localPlayer.killCooldownRemaining)}s`
                    : killTarget
                    ? `Size Koro ${killTarget.name} [Q]`
                    : 'Gap e Nao! [Q]'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
