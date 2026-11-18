import { useEffect, useState } from 'react';
import {
  PLAYER_COLORS,
  SPECIAL_ROLES,
  type PlayerColorId,
  type PublicRoomSummary,
  type RoomSettings,
  type SpecialRole,
} from '../shared/types';
import { getLoadedCustomCount, subscribeMemePack } from '../audio/memePackStore';
import { loadCareerStats } from '../game/statsStore';
import {
  Users,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Music2,
  SlidersHorizontal,
  BookOpen,
  Trophy,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  isFullscreenActive,
  subscribeFullscreenChange,
  toggleFullscreenMode,
} from '../utils/mobileFullscreen';

export interface TitleOverlayProps {
  playerName: string;
  playerColor: PlayerColorId;
  publicRooms: PublicRoomSummary[];
  errorMsg: string | null;
  soloPlayerCount: number;
  soloSettings: RoomSettings;
  onChangeName: (name: string) => void;
  onChangeColor: (color: PlayerColorId) => void;
  onChangeSoloPlayerCount: (count: number) => void;
  onUpdateSoloSettings: (settings: Partial<RoomSettings>) => void;
  onStartSolo: (forceRole?: 'parabasi' | 'vondo', forceSpecialRole?: SpecialRole) => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onRefreshRooms: () => void;
  onOpenMemePack: () => void;
  onOpenGuide: () => void;
}

const SOLO_SPECIAL_OPTIONS: Array<{ value: SpecialRole | 'random'; label: string }> = [
  { value: 'random', label: 'Random Special Roles' },
  { value: 'goyenda', label: 'CID Mofiz (Goyenda)' },
  { value: 'kobiraj', label: 'Tabiz Baba (Kobiraj)' },
  { value: 'mistri', label: 'Current Babu (Mistri)' },
  { value: 'bohurupi', label: 'Bohurupi Batpar (Shapeshifter)' },
  { value: 'pagol', label: 'Pagla Baba (Jester Chaos)' },
];

export function TitleOverlay({
  playerName,
  playerColor,
  publicRooms,
  errorMsg,
  soloPlayerCount,
  soloSettings,
  onChangeName,
  onChangeColor,
  onChangeSoloPlayerCount,
  onUpdateSoloSettings,
  onStartSolo,
  onCreateRoom,
  onJoinRoom,
  onRefreshRooms,
  onOpenMemePack,
  onOpenGuide,
}: TitleOverlayProps) {
  const [joinCode, setJoinCode] = useState('');
  const [modeTab, setModeTab] = useState<'solo' | 'multi'>('solo');
  const [soloSpecial, setSoloSpecial] = useState<SpecialRole | 'random'>('random');
  const [showSoloSettings, setShowSoloSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() => isFullscreenActive());
  const [, setPackVer] = useState(0);

  useEffect(() => subscribeMemePack(() => setPackVer((v) => v + 1)), []);
  useEffect(() => subscribeFullscreenChange(setIsFullscreen), []);
  const customMemeCount = getLoadedCustomCount();
  const career = loadCareerStats();

  const selectedSpec = PLAYER_COLORS.find((c) => c.id === playerColor) ?? PLAYER_COLORS[0];

  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none overflow-y-auto"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Top-Right Quick Fullscreen Toggle */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-5 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            void toggleFullscreenMode(true);
          }}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="px-3 py-2 rounded-xl border border-amber-400/40 bg-slate-950/85 hover:bg-slate-900 text-amber-200 text-xs font-bold flex items-center gap-1.5 shadow-lg"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
        </button>
      </div>

      {/* Subtle left-side scrim for crisp typography contrast over the live 3D Moholla flyover */}
      <div
        className="fixed inset-y-0 left-0 w-full max-w-2xl pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,15,25,0.92) 0%, rgba(10,15,25,0.72) 65%, rgba(10,15,25,0) 100%)',
        }}
      />

      <main className="relative z-10 flex flex-col justify-center flex-1 px-4 py-4 sm:px-12 max-w-xl pointer-events-auto">
        {/* Custom Inline SVG Emblem Lockup */}
        <div className="mb-3 sm:mb-6">
          <svg
            viewBox="0 0 470 114"
            className="w-full max-w-[300px] sm:max-w-[420px] h-auto"
            role="img"
            aria-label="Ke Batpar? - Bangla 3D Social Deduction Comedy Game"
          >
            <g transform="translate(8, 12)">
              {/* Cute Chibi Moholla Crewmate with Sprout, Rosy Cheeks & Visor Sparkle */}
              <path d="M33 14 L33 4 M33 7 Q22 1 20 8 Q26 11 33 7 M33 7 Q44 1 46 8 Q40 11 33 7" fill="#4ade80" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" />
              <rect x="6" y="14" width="54" height="70" rx="26" fill={selectedSpec.hex} stroke="#fbbf24" strokeWidth="4" />
              <rect x="26" y="27" width="32" height="19" rx="9.5" fill="#bae6fd" stroke="#0f172a" strokeWidth="3" />
              <ellipse cx="48" cy="33" rx="4.5" ry="2.2" fill="#ffffff" />
              <ellipse cx="23" cy="52" rx="4.5" ry="2.6" fill="#fb7185" opacity="0.8" />
              <ellipse cx="52" cy="52" rx="4.5" ry="2.6" fill="#fb7185" opacity="0.8" />
              <rect x="0" y="34" width="12" height="32" rx="5" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2.5" />
              <path d="M58 46 L68 46 L66 57 L60 57 Z" fill="#b45309" stroke="#fbbf24" strokeWidth="1.8" />
              <path d="M16 82 L16 94 M46 82 L46 94" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" />
            </g>
            <text
              x="82"
              y="56"
              fill="#f8fafc"
              fontFamily="'Bricolage Grotesque', sans-serif"
              fontWeight="800"
              fontSize="44"
              letterSpacing="-1"
            >
              KE BATPAR?
            </text>
            <text
              x="84"
              y="88"
              fill="#fbbf24"
              fontFamily="'Noto Sans Bengali', 'Plus Jakarta Sans', sans-serif"
              fontWeight="700"
              fontSize="22"
            >
              কে বাটপার? · Moholla Comedy
            </text>
          </svg>
          <p className="hidden sm:block mt-2 text-sm sm:text-base text-slate-300 leading-relaxed max-w-md">
            Dudh-Cha khao, Loadshedding samlao, ar para theke asli Batpar ke khuje pukur e chubani dao!
          </p>
        </div>

        {/* Character Setup Card */}
        <section
          aria-label="Player setup"
          className="rounded-2xl p-4 sm:p-5 border border-white/12 shadow-2xl"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="player-name-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Para Nickname
              </label>
              <input
                id="player-name-input"
                type="text"
                maxLength={16}
                value={playerName}
                onChange={(e) => onChangeName(e.target.value)}
                placeholder="e.g. Lal Mia"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-1.5">
                Avatar Color · {selectedSpec.label}
              </span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose avatar color">
                {PLAYER_COLORS.map((c) => {
                  const active = c.id === playerColor;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onChangeColor(c.id)}
                      aria-label={`Color ${c.label}`}
                      aria-checked={active}
                      role="radio"
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        active ? 'border-amber-300 scale-110' : 'border-white/25 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mode Segmented Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 mb-4">
            <button
              type="button"
              onClick={() => setModeTab('solo')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                modeTab === 'solo' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Solo Match (vs AI)
            </button>
            <button
              type="button"
              onClick={() => {
                setModeTab('multi');
                onRefreshRooms();
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                modeTab === 'multi' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Online Multiplayer
            </button>
          </div>

          {errorMsg && (
            <div role="alert" className="mb-3 px-3 py-2 rounded-lg bg-rose-950/90 border border-rose-500/40 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {modeTab === 'solo' ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
                <label
                  htmlFor="solo-role-select"
                  className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Special Role
                </label>
                <select
                  id="solo-role-select"
                  value={soloSpecial}
                  onChange={(e) => setSoloSpecial(e.target.value as SpecialRole | 'random')}
                  className="flex-1 max-w-[230px] px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-semibold text-amber-200 focus:outline-none focus:border-amber-400"
                >
                  {SOLO_SPECIAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {soloSpecial !== 'random' && (
                <p className="text-[11px] text-slate-300/90 px-1 leading-snug">
                  {SPECIAL_ROLES[soloSpecial].shortDesc}
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowSoloSettings((v) => !v)}
                  aria-expanded={showSoloSettings}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-300" />
                  Match Rules ({soloPlayerCount}P · {soloSettings.vondoCount} Batpar · {soloSettings.tasksPerPlayer} Tasks)
                </button>
                {career.matchesPlayed > 0 && (
                  <span className="text-[11px] font-mono-tabular font-semibold text-emerald-300 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-300" />
                    {career.wins}W/{career.matchesPlayed}M
                  </span>
                )}
              </div>

              {showSoloSettings && (
                <div className="rounded-xl p-3 bg-slate-900/95 border border-slate-700/80 grid grid-cols-2 gap-2 text-xs text-slate-200">
                  <label className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-400">Players</span>
                    <select
                      value={soloPlayerCount}
                      onChange={(e) => onChangeSoloPlayerCount(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                    >
                      <option value={5}>5 Players</option>
                      <option value={6}>6 Players</option>
                      <option value={7}>7 Players</option>
                      <option value={8}>8 Players</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-400">Batpars</span>
                    <select
                      value={soloSettings.vondoCount}
                      onChange={(e) => onUpdateSoloSettings({ vondoCount: Number(e.target.value) })}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                    >
                      <option value={1}>1 Batpar</option>
                      <option value={2} disabled={soloPlayerCount < 6}>
                        2 Batpars {soloPlayerCount < 6 ? '(6P+)' : ''}
                      </option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-400">Kill CD</span>
                    <select
                      value={soloSettings.killCooldownSec}
                      onChange={(e) => onUpdateSoloSettings({ killCooldownSec: Number(e.target.value) })}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                    >
                      <option value={12}>12s</option>
                      <option value={18}>18s</option>
                      <option value={25}>25s</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-400">Tasks</span>
                    <select
                      value={soloSettings.tasksPerPlayer}
                      onChange={(e) => onUpdateSoloSettings({ tasksPerPlayer: Number(e.target.value) })}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                    >
                      <option value={4}>4 Tasks</option>
                      <option value={6}>6 Tasks</option>
                      <option value={8}>8 Tasks</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={soloSettings.confirmEjects}
                      onChange={(e) => onUpdateSoloSettings({ confirmEjects: e.target.checked })}
                      className="accent-amber-400 w-3.5 h-3.5"
                    />
                    <span>Confirm Ejects</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={soloSettings.anonymousVotes}
                      onChange={(e) => onUpdateSoloSettings({ anonymousVotes: e.target.checked })}
                      className="accent-amber-400 w-3.5 h-3.5"
                    />
                    <span>Anonymous Votes</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={soloSettings.visualTasks}
                      onChange={(e) => onUpdateSoloSettings({ visualTasks: e.target.checked })}
                      className="accent-amber-400 w-3.5 h-3.5"
                    />
                    <span>Visual Tasks</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={soloSettings.enableSpecialRoles}
                      onChange={(e) => onUpdateSoloSettings({ enableSpecialRoles: e.target.checked })}
                      className="accent-amber-400 w-3.5 h-3.5"
                    />
                    <span>Special Roles</span>
                  </label>
                </div>
              )}

              <button
                type="button"
                data-start="true"
                onClick={() =>
                  onStartSolo(undefined, soloSpecial === 'random' ? undefined : soloSpecial)
                }
                className="w-full py-3.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                Play Solo in Moholla
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onStartSolo(
                      'parabasi',
                      soloSpecial !== 'random' && soloSpecial !== 'bohurupi'
                        ? soloSpecial
                        : undefined,
                    )
                  }
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  Practice as Para-basi
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onStartSolo(
                      'vondo',
                      soloSpecial === 'bohurupi' ? 'bohurupi' : undefined,
                    )
                  }
                  className="flex-1 py-2 px-3 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-500/30 text-rose-200 text-xs font-semibold transition-colors"
                >
                  Practice as Batpar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCreateRoom}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Create Room
                </button>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="text"
                    maxLength={6}
                    aria-label="Room code"
                    placeholder="CODE"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-24 px-3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono-tabular uppercase focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    disabled={joinCode.trim().length < 3}
                    onClick={() => onJoinRoom(joinCode.trim())}
                    className="px-4 py-3 rounded-xl bg-amber-400 disabled:opacity-40 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap"
                  >
                    Join
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Active Public Rooms</span>
                  <button
                    type="button"
                    onClick={onRefreshRooms}
                    aria-label="Refresh public rooms"
                    className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </div>
                {publicRooms.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No open rooms yet. Create one and share the 4-letter code!</p>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {publicRooms.map((r) => (
                      <div
                        key={r.roomCode}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-800"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono-tabular font-bold text-amber-300">{r.roomCode}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-200">{r.hostName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono-tabular text-slate-400 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {r.playerCount}/{r.maxPlayers}
                          </span>
                          <button
                            type="button"
                            onClick={() => onJoinRoom(r.roomCode)}
                            className="px-2.5 py-1 rounded bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300"
                          >
                            Join
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Original Meme Pack & Rules Guide Bar */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenMemePack}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-400/35 text-amber-200 text-xs font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <Music2 className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="truncate">Meme Pack</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 font-mono-tabular text-[11px] shrink-0">
                {customMemeCount > 0 ? `${customMemeCount} Clips` : 'Upload'}
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenGuide}
              className="py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-400/35 text-sky-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <BookOpen className="w-4 h-4 text-sky-300 shrink-0" />
              Rules &amp; Roles
            </button>
          </div>
        </section>
      </main>

      {/* Clean Single-Line Bottom Control Hint (hidden on small/touch mobile) */}
      <footer className="hidden md:block relative z-10 px-6 sm:px-12 pb-5">
        <p className="text-xs text-slate-300/85 font-medium tracking-wide">
          WASD Move · Space Jump · Shift Sprint · Drag Free 360°/Sky Look · Wheel Zoom · 1-6 Meme SFX · E Use · R Report · F Shalish
        </p>
      </footer>
    </div>
  );
}
