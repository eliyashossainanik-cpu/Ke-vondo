import {
  PLAYER_COLORS,
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
} from '../shared/mapData';
import { canCompleteTasks } from '../shared/gameRules';
import { Lock, MapPin, X, Zap } from 'lucide-react';

export interface TacticalMapModalProps {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  onClose: () => void;
  onSabotage: (type: SabotageType) => void;
  onLockDoors: (zoneId: DoorZoneId) => void;
}

const DOOR_CARDS: Array<{ zoneId: DoorZoneId; label: string; x: number; z: number }> = [
  { zoneId: 'cha_dokan', label: 'Cha Dokan', x: -31, z: -31 },
  { zoneId: 'rickshaw_garage', label: 'Rickshaw', x: 31, z: -31 },
  { zoneId: 'desco_power', label: 'DESCO', x: -31, z: 31 },
  { zoneId: 'dish_roof', label: 'Dish Hub', x: 31, z: 31 },
];

export function TacticalMapModal({
  snapshot,
  localPlayerId,
  onClose,
  onSabotage,
  onLockDoors,
}: TacticalMapModalProps) {
  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  if (!localPlayer) return null;

  const isVondo = localPlayer.role === 'vondo';
  const showTasks = canCompleteTasks(localPlayer);
  const showVents = isVondo || localPlayer.specialRole === 'mistri';
  const playerColorSpec =
    PLAYER_COLORS.find((c) => c.id === localPlayer.color) ?? PLAYER_COLORS[0];

  const incompleteTasks = showTasks
    ? localPlayer.tasks
        .filter((t) => !t.completed)
        .map((t) => TASK_STATIONS.find((s) => s.id === t.taskId))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Moholla Tactical Map"
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.86)' }}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-amber-400/35 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ backgroundColor: 'rgba(13, 20, 34, 0.98)' }}
      >
        <header className="px-4 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
                {isVondo && localPlayer.alive
                  ? 'Batpar Sabotage Map · কে বাটপার?'
                  : 'Moholla Tactical Map · মহল্লা ম্যাপ'}
              </h2>
              <p className="text-[11px] text-slate-400">
                14 Zones · {incompleteTasks.length > 0 ? `${incompleteTasks.length} Tasks Remaining` : 'Cams, Admin, Vitals & Adda Chowk'} · Press [Tab] or [Esc] to close
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tactical Map"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-3 sm:p-5 overflow-y-auto flex-1 flex flex-col items-center gap-4">
          <div className="w-full max-w-[600px] aspect-square rounded-2xl border border-slate-700/70 bg-slate-950 p-2">
            <svg
              viewBox={`${-MAP_HALF_SIZE - 8} ${-MAP_HALF_SIZE - 8} ${(MAP_HALF_SIZE + 8) * 2} ${(MAP_HALF_SIZE + 8) * 2}`}
              className="w-full h-full"
              role="img"
              aria-label="Detailed 14-zone Moholla map"
            >
              <rect
                x={-MAP_HALF_SIZE - 8}
                y={-MAP_HALF_SIZE - 8}
                width={(MAP_HALF_SIZE + 8) * 2}
                height={(MAP_HALF_SIZE + 8) * 2}
                fill="#0b1322"
                rx="4"
              />

              {/* Main Roads & Outer Boulevard */}
              <rect x={-10} y={-MAP_HALF_SIZE} width={20} height={MAP_HALF_SIZE * 2} fill="#1e293b" opacity={0.65} />
              <rect x={-MAP_HALF_SIZE} y={-10} width={MAP_HALF_SIZE * 2} height={20} fill="#1e293b" opacity={0.65} />
              <rect
                x={-54}
                y={-54}
                width={108}
                height={108}
                fill="none"
                stroke="#334155"
                strokeWidth="4"
                strokeDasharray="3 2"
              />
              <text x={0} y={-51.8} textAnchor="middle" fill="#64748b" fontSize="2.3" fontWeight="700">
                NORTH RING ROAD
              </text>
              <text x={0} y={56.2} textAnchor="middle" fill="#64748b" fontSize="2.3" fontWeight="700">
                SOUTH RAIL &amp; RING ROAD
              </text>

              {/* Layer 1: 14 Zone Footprints */}
              {ZONES.map((z) => {
                const lockedSec =
                  z.id === 'cha_dokan'
                    ? snapshot.doorLocks.cha_dokan
                    : z.id === 'rickshaw_garage'
                      ? snapshot.doorLocks.rickshaw_garage
                      : z.id === 'desco_power'
                        ? snapshot.doorLocks.desco_power
                        : z.id === 'dish_roof'
                          ? snapshot.doorLocks.dish_roof
                          : 0;
                const topY = z.z - z.depth / 2;
                return (
                  <g key={z.id}>
                    <rect
                      x={z.x - z.width / 2}
                      y={topY}
                      width={z.width}
                      height={z.depth}
                      fill={z.color}
                      fillOpacity={0.62}
                      stroke={lockedSec > 0 ? '#f59e0b' : '#94a3b8'}
                      strokeWidth={lockedSec > 0 ? '1.3' : '0.7'}
                      rx="2"
                    />
                    {lockedSec > 0 && (
                      <text
                        x={z.x}
                        y={z.z + 1}
                        textAnchor="middle"
                        fill="#fbbf24"
                        fontSize="2.3"
                        fontWeight="800"
                      >
                        LOCKED {Math.ceil(lockedSec)}s
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Layer 2: Utility Stations */}
              <g>
                <circle cx={EMERGENCY_BELL_POS.x} cy={EMERGENCY_BELL_POS.z} r={2.1} fill="#38bdf8" stroke="#0f172a" strokeWidth="0.7" />
                <text x={EMERGENCY_BELL_POS.x} y={EMERGENCY_BELL_POS.z - 3.0} textAnchor="middle" fill="#7dd3fc" fontSize="2.1" fontWeight="700">
                  BELL
                </text>

                <circle cx={SECURITY_CAMS_POS.x} cy={SECURITY_CAMS_POS.z} r={2.0} fill="#fb7185" stroke="#0f172a" strokeWidth="0.7" />
                <text x={SECURITY_CAMS_POS.x} y={SECURITY_CAMS_POS.z + 4.3} textAnchor="middle" fill="#fda4af" fontSize="2.1" fontWeight="700">
                  CCTV
                </text>

                <circle cx={ADMIN_TABLE_POS.x} cy={ADMIN_TABLE_POS.z} r={2.0} fill="#38bdf8" stroke="#0f172a" strokeWidth="0.7" />
                <text x={ADMIN_TABLE_POS.x} y={ADMIN_TABLE_POS.z + 4.3} textAnchor="middle" fill="#bae6fd" fontSize="2.1" fontWeight="700">
                  ADMIN
                </text>

                <circle cx={VITALS_POS.x} cy={VITALS_POS.z} r={2.0} fill="#34d399" stroke="#0f172a" strokeWidth="0.7" />
                <text x={VITALS_POS.x} y={VITALS_POS.z + 4.3} textAnchor="middle" fill="#6ee7b7" fontSize="2.1" fontWeight="700">
                  VITALS
                </text>
              </g>

              {/* Drain Vent Markers (Batpar & Mistri only) */}
              {showVents &&
                VENTS.map((v) => (
                  <g key={v.id}>
                    <rect
                      x={v.x - 1.3}
                      y={v.z - 1.3}
                      width={2.6}
                      height={2.6}
                      rx="0.6"
                      fill="#10b981"
                      stroke="#0f172a"
                      strokeWidth="0.6"
                    />
                  </g>
                ))}

              {/* Remaining Task Pins */}
              {incompleteTasks.map((st) => {
                const label = st.title.length > 17 ? `${st.title.slice(0, 16)}…` : st.title;
                return (
                  <g key={st.id}>
                    <circle
                      cx={st.x}
                      cy={st.z}
                      r={2.5}
                      fill="#fbbf24"
                      stroke="#0f172a"
                      strokeWidth="0.8"
                    />
                    <rect
                      x={st.x - 13}
                      y={st.z + 3.4}
                      width={26}
                      height={3.9}
                      rx="1.1"
                      fill="#0f172a"
                      fillOpacity={0.94}
                      stroke="#fbbf24"
                      strokeWidth="0.45"
                    />
                    <text
                      x={st.x}
                      y={st.z + 6.1}
                      textAnchor="middle"
                      fill="#fde68a"
                      fontSize="2.1"
                      fontWeight="700"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* Active Sabotage Repair Pin */}
              {snapshot.sabotage.active && (
                <g>
                  <circle
                    cx={snapshot.sabotage.fixStationX}
                    cy={snapshot.sabotage.fixStationZ}
                    r={5.2}
                    fill="#ef4444"
                    fillOpacity={0.28}
                    stroke="#ef4444"
                    strokeWidth="1"
                  />
                  <circle
                    cx={snapshot.sabotage.fixStationX}
                    cy={snapshot.sabotage.fixStationZ}
                    r={2.4}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                  <rect
                    x={snapshot.sabotage.fixStationX - 11}
                    y={snapshot.sabotage.fixStationZ - 9.0}
                    width={22}
                    height={4.2}
                    rx="1.2"
                    fill="#991b1b"
                    stroke="#fecaca"
                    strokeWidth="0.5"
                  />
                  <text
                    x={snapshot.sabotage.fixStationX}
                    y={snapshot.sabotage.fixStationZ - 6.0}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="2.4"
                    fontWeight="800"
                  >
                    FIX SABOTAGE!
                  </text>
                </g>
              )}

              {/* Local Player Live Marker */}
              <g>
                <circle
                  cx={localPlayer.x}
                  cy={localPlayer.z}
                  r={4.5}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.8"
                  strokeOpacity={0.75}
                />
                <circle
                  cx={localPlayer.x}
                  cy={localPlayer.z}
                  r={2.6}
                  fill={playerColorSpec.hex}
                  stroke="#ffffff"
                  strokeWidth="0.9"
                />
                <text
                  x={localPlayer.x}
                  y={localPlayer.z + 6.4}
                  textAnchor="middle"
                  fill="#ffffff"
                  stroke="#090f1d"
                  strokeWidth="1.1"
                  paintOrder="stroke"
                  fontSize="2.4"
                  fontWeight="800"
                >
                  YOU
                </text>
              </g>

              {/* Layer 3: Unobstructed Bilingual District Name Headers (above each zone box) */}
              {ZONES.map((z) => {
                const topY = z.z - z.depth / 2;
                const badgeW = Math.max(z.width + 4, 24);
                const badgeH = 5.4;
                const badgeY = topY - badgeH - 0.35;
                return (
                  <g key={`${z.id}-badge`}>
                    <rect
                      x={z.x - badgeW / 2}
                      y={badgeY}
                      width={badgeW}
                      height={badgeH}
                      rx="1.3"
                      fill="#090f1d"
                      fillOpacity={0.94}
                      stroke={z.color}
                      strokeWidth="0.65"
                    />
                    <text
                      x={z.x}
                      y={badgeY + 2.4}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="2.15"
                      fontWeight="800"
                    >
                      {z.name}
                    </text>
                    <text
                      x={z.x}
                      y={badgeY + 4.55}
                      textAnchor="middle"
                      fill="#fde68a"
                      fontSize="1.9"
                      fontWeight="700"
                    >
                      {z.banglaName}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend or Batpar Sabotage Tactical Strip */}
          {isVondo && localPlayer.alive ? (
            <div className="w-full rounded-xl p-3 bg-rose-950/50 border border-rose-500/40 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-rose-200 flex items-center gap-1.5 mr-1">
                  <Zap className="w-4 h-4 text-amber-300" />
                  Sabotage:
                </span>
                <button
                  type="button"
                  disabled={Boolean(snapshot.sabotage.active) || snapshot.sabotage.cooldownRemaining > 0}
                  onClick={() => {
                    onSabotage('loadshedding');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-bold text-white"
                >
                  Current Khao (DESCO)
                </button>
                <button
                  type="button"
                  disabled={Boolean(snapshot.sabotage.active) || snapshot.sabotage.cooldownRemaining > 0}
                  onClick={() => {
                    onSabotage('wifi_down');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-bold text-white"
                >
                  MB Shesh (Dish Hub)
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1 mr-1">
                  <Lock className="w-3.5 h-3.5" />
                  Shutter{snapshot.doorLocks.cooldownRemaining > 0 ? ` (${Math.ceil(snapshot.doorLocks.cooldownRemaining)}s)` : ':'}
                </span>
                {DOOR_CARDS.map((d) => (
                  <button
                    key={d.zoneId}
                    type="button"
                    disabled={snapshot.doorLocks.cooldownRemaining > 0}
                    onClick={() => onLockDoors(d.zoneId)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-40 text-xs font-semibold text-white transition-colors"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Assigned Tasks
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" /> Adda Bell / Admin
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" /> CCTV Cams
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Vitals Clinic
              </span>
              {showVents && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Gopon Dren
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
