import {
  PLAYER_COLORS,
  SPECIAL_ROLES,
  type EjectionInfo,
  type MatchOutcome,
  type RoomSnapshot,
} from '../shared/types';
import { loadCareerStats } from '../game/statsStore';
import { getChubaniTaunts, ROLE_COMEDY_TAGLINES } from '../shared/banglaComedy';
import { RotateCcw, Home, Play, Trophy, Skull, Sparkles, Music2 } from 'lucide-react';

export function RoleRevealModal({
  snapshot,
  localPlayerId,
  onContinue,
}: {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  onContinue?: () => void;
}) {
  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  if (!localPlayer) return null;
  const isVondo = localPlayer.role === 'vondo';
  const isPagol = localPlayer.specialRole === 'pagol';
  const specialMeta = SPECIAL_ROLES[localPlayer.specialRole];
  const fellowVondos = snapshot.players.filter((p) => p.role === 'vondo');
  const parabasiCount = snapshot.players.filter(
    (p) => p.role === 'parabasi' && p.specialRole !== 'pagol',
  ).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Role Reveal"
      className="fixed inset-0 z-30 flex items-center justify-center p-5"
      style={{
        background: isPagol
          ? 'radial-gradient(circle at center, rgba(88, 28, 135, 0.94) 0%, rgba(7, 10, 18, 0.98) 72%)'
          : isVondo
            ? 'radial-gradient(circle at center, rgba(127, 29, 29, 0.94) 0%, rgba(7, 10, 18, 0.98) 72%)'
            : 'radial-gradient(circle at center, rgba(12, 74, 110, 0.94) 0%, rgba(7, 10, 18, 0.98) 72%)',
      }}
    >
      <div className="max-w-lg w-full text-center space-y-5">
        <span className="inline-block text-xs font-mono-tabular uppercase tracking-[0.28em] text-amber-300">
          SHHHHH! · নিশ্চুপ!
        </span>

        <h2
          className={`font-display text-4xl sm:text-5xl font-extrabold ${
            isPagol ? 'text-purple-300' : isVondo ? 'text-rose-400' : 'text-sky-300'
          }`}
        >
          {isPagol ? 'PAGLA BABA (JESTER)' : isVondo ? 'BATPAR' : 'PARA-BASI'}
        </h2>

        {localPlayer.specialRole !== 'none' && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900/90 border border-white/15">
            <Sparkles className="w-4 h-4 shrink-0" style={{ color: specialMeta.accentHex }} />
            <span className="text-sm font-bold" style={{ color: specialMeta.accentHex }}>
              {specialMeta.banglaTitle} · {specialMeta.title}
            </span>
          </div>
        )}

        <p className="text-sm sm:text-base text-slate-200 max-w-md mx-auto">
          {localPlayer.specialRole !== 'none'
            ? specialMeta.shortDesc
            : isVondo
              ? 'Gap e niye size koro, current khao, dren diye palaw — ar dhora kheye pukur e chubani khao na!'
              : `Moholla te ${fellowVondos.length === 1 ? '1 ta Batpar' : `${fellowVondos.length} ta Batpar`} ghurteche (${parabasiCount + fellowVondos.length} jon er moddhe). Kaaj sesh koro ba Shalish e chubani dao!`}
        </p>

        <p className="text-xs sm:text-sm font-semibold text-amber-300/95 max-w-md mx-auto">
          {isVondo && localPlayer.specialRole === 'none'
            ? 'Ajke kare gap e nibi re Batpar?! Sabdhan, Pukur ready ache!'
            : ROLE_COMEDY_TAGLINES[localPlayer.specialRole]}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {(isVondo ? fellowVondos : [localPlayer]).map((p) => {
            const c = PLAYER_COLORS.find((col) => col.id === p.color) ?? PLAYER_COLORS[0];
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-white/15"
              >
                <span className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: c.hex }} />
                <span className="text-xs font-bold text-white">{p.name}</span>
              </div>
            );
          })}
        </div>

        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm"
          >
            Enter Moholla
          </button>
        )}
      </div>
    </div>
  );
}

export function EjectionModal({ ejection }: { ejection: EjectionInfo }) {
  const c = ejection.ejectedColor
    ? PLAYER_COLORS.find((col) => col.id === ejection.ejectedColor) ?? PLAYER_COLORS[0]
    : null;

  if (ejection.reason === 'voted' && ejection.ejectedName) {
    const taunts = getChubaniTaunts(
      ejection.ejectedName,
      ejection.wasVondo,
      ejection.wasSpecialRole === 'pagol',
    );
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-6"
      >
        {/* Top Live Crowd Comedy Banner (center stays open so players watch the live 3D Pukur throw!) */}
        <div className="max-w-2xl w-full mx-auto text-center space-y-2 pt-1 sm:pt-2">
          <div className="inline-flex flex-wrap items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-display font-extrabold text-xs sm:text-sm shadow-lg">
              {taunts[0]}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-sky-400/50 text-sky-200 font-bold text-xs shadow-lg">
              {taunts[1]}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-rose-400/50 text-rose-200 font-bold text-xs shadow-lg">
              {taunts[2]}
            </span>
          </div>
        </div>

        {/* Bottom Verdict Card */}
        <div
          className="max-w-xl w-full mx-auto rounded-2xl px-4 py-3.5 sm:px-6 sm:py-4 border border-sky-400/40 shadow-2xl text-center space-y-1.5"
          style={{ backgroundColor: 'rgba(9, 15, 28, 0.9)' }}
        >
          <div className="flex items-center justify-center gap-2.5">
            <span
              className="w-4 h-4 rounded-full border-2 border-amber-300 shrink-0"
              style={{ backgroundColor: c?.hex ?? '#e11d48' }}
            />
            <h2 className="font-display text-xl sm:text-3xl font-extrabold text-white">
              {ejection.ejectedName} ke Pukur e Chubani Deowa Holo!
            </h2>
          </div>

          {ejection.confirmEjects ? (
            <p
              className={`text-sm sm:text-base font-bold ${
                ejection.wasSpecialRole === 'pagol'
                  ? 'text-purple-300'
                  : ejection.wasVondo
                    ? 'text-emerald-300'
                    : 'text-rose-300'
              }`}
            >
              {ejection.wasSpecialRole === 'pagol'
                ? `${ejection.ejectedName} CHILO ASLI PAGLA BABA! Shobai bait kheye gese!`
                : ejection.wasVondo
                  ? `${ejection.ejectedName} CHILO ASLI BATPAR${
                      ejection.wasSpecialRole !== 'none'
                        ? ` (${SPECIAL_ROLES[ejection.wasSpecialRole].title})`
                        : ''
                    }!`
                  : `${ejection.ejectedName} niraparadh Para-basi chilo (${
                      ejection.wasSpecialRole !== 'none'
                        ? SPECIAL_ROLES[ejection.wasSpecialRole].title
                        : 'Neighbor'
                    })...`}
            </p>
          ) : (
            <p className="text-xs sm:text-sm font-semibold text-slate-300">
              Confirm Ejects is OFF — ke Batpar chilo sheta gopon thaklo!
            </p>
          )}

          {ejection.confirmEjects && (
            <p className="text-xs font-mono-tabular text-amber-300">
              Batpars remaining in Moholla: {ejection.remainingVondos}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-30 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.92)' }}
    >
      <div className="max-w-lg w-full text-center space-y-4">
        <h2 className="font-display text-3xl font-extrabold text-white">
          {ejection.reason === 'tie'
            ? 'Vote Tai! Pukur er Mach Ajke Uposh Thaklo!'
            : 'Shobai Skip Marlo — Batpar Cha Khaitese!'}
        </h2>
        <p className="text-sm text-slate-300">Asli Batpar ekhono mohollay ghurtese ar hashtease!</p>
        {ejection.confirmEjects && (
          <p className="text-xs font-mono-tabular text-amber-300">
            Batpars remaining in Moholla: {ejection.remainingVondos}
          </p>
        )}
      </div>
    </div>
  );
}

export function PauseModal({
  onResume,
  onRestart,
  onTitle,
  onOpenMemePack,
}: {
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  onOpenMemePack?: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.8)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 border border-white/15 shadow-2xl space-y-4 text-center"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.98)' }}
      >
        <h2 className="font-display text-2xl font-bold text-white">Adda Paused</h2>
        <p className="text-xs text-slate-400">Take a Cha break before returning to the Moholla.</p>
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Match
          </button>
          {onOpenMemePack && (
            <button
              type="button"
              onClick={onOpenMemePack}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/35 text-amber-200 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Music2 className="w-4 h-4 text-amber-300" />
              Original Meme Pack
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Match
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
}

export function OutcomeModal({
  snapshot,
  localPlayerId,
  outcome,
  isMultiplayer,
  onPlayAgain,
  onTitle,
}: {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  outcome: MatchOutcome;
  isMultiplayer: boolean;
  onPlayAgain: () => void;
  onTitle: () => void;
}) {
  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  const won =
    outcome.winner === 'pagol'
      ? localPlayer?.specialRole === 'pagol'
      : localPlayer?.role === outcome.winner && localPlayer?.specialRole !== 'pagol';
  const vondos = snapshot.players.filter((p) => p.role === 'vondo');

  const career = loadCareerStats();

  const reasonText: Record<MatchOutcome['reason'], string> = {
    tasks_completed: 'Mohollar shob kaaj shesh — ajke shobar jonne Biryani party!',
    vondos_ejected: 'Shob Batpar dhora kheye Pukur e chubani khaise! Batpari khotom!',
    vondos_outnumber: 'Batpar ra pura Moholla dokhol kore nise — Cha-er dokan o bondho!',
    sabotage_timeout: 'Loadshedding / Wi-Fi thik hoy nai — TikTok ar Charge dui-i sesh!',
    jester_ejected: `${outcome.winnerPlayerName ?? 'Pagla Baba'} shobai ke ullu banay cup niye gelo!`,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Match Outcome"
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.88)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-5 sm:p-7 border border-amber-400/30 shadow-2xl text-center space-y-4 max-h-[92vh] overflow-y-auto"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.98)' }}
      >
        <div
          className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
            won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}
        >
          {won ? <Trophy className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            {outcome.winner === 'pagol'
              ? 'Pagla Baba Chaos Victory'
              : outcome.winner === 'parabasi'
                ? 'Para-basi Victory'
                : 'Batpar Victory'}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-1">
            {won ? 'Khela Hobe! Jitsi Bhai!' : 'Dhora Khaisi! Khela Shesh!'}
          </h2>
          <p className="text-sm text-slate-300 mt-1">{reasonText[outcome.reason]}</p>
        </div>

        {/* 3 Tabular Match Stats */}
        <div className="grid grid-cols-3 gap-2.5 text-left">
          <div className="rounded-xl p-3 bg-slate-900 border border-slate-800">
            <span className="block text-[11px] text-slate-400">Para Tasks</span>
            <span className="font-mono-tabular text-lg font-bold text-emerald-400">
              {snapshot.completedTasks}/{snapshot.totalTasks}
            </span>
          </div>
          <div className="rounded-xl p-3 bg-slate-900 border border-slate-800">
            <span className="block text-[11px] text-slate-400">Survivors</span>
            <span className="font-mono-tabular text-lg font-bold text-white">
              {snapshot.players.filter((p) => p.alive).length}/{snapshot.players.length}
            </span>
          </div>
          <div className="rounded-xl p-3 bg-slate-900 border border-slate-800">
            <span className="block text-[11px] text-slate-400">The Batpar</span>
            <span className="text-sm font-bold text-rose-400 truncate block">
              {vondos.map((v) => v.name).join(', ')}
            </span>
          </div>
        </div>

        {/* Full Post-Match Player Role Reveal Roster */}
        <div className="rounded-xl p-3 bg-slate-900/90 border border-slate-800 text-left">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
            <span>Full Moholla Role Reveal</span>
            <span className="font-mono-tabular text-amber-300">
              Career: {career.wins}W / {career.matchesPlayed}M · {career.tasksCompleted} Tasks
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {snapshot.players.map((p) => {
              const col = PLAYER_COLORS.find((c) => c.id === p.color) ?? PLAYER_COLORS[0];
              const meta = SPECIAL_ROLES[p.specialRole];
              const roleLabel =
                p.specialRole !== 'none'
                  ? meta.title.split(' ')[0]
                  : p.role === 'vondo'
                    ? 'Batpar'
                    : 'Para-basi';
              const roleColor =
                p.role === 'vondo'
                  ? '#fb7185'
                  : p.specialRole === 'pagol'
                    ? '#c084fc'
                    : p.specialRole !== 'none'
                      ? meta.accentHex
                      : '#7dd3fc';
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/25"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="font-semibold text-white truncate">
                      {p.name}
                      {p.id === localPlayerId ? ' (You)' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold" style={{ color: roleColor }}>
                      {roleLabel}
                    </span>
                    <span className={`text-[10px] ${p.alive ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {p.alive ? 'Alive' : 'Out'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 py-3.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {isMultiplayer ? 'Back to Lobby' : 'Play Again'}
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}
