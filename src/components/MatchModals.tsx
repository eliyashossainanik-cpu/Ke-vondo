import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PLAYER_COLORS,
  SPECIAL_ROLES,
  type EjectionInfo,
  type MatchOutcome,
  type RoomSnapshot,
  type SpecialRole,
} from '../shared/types';
import { loadCareerStats } from '../game/statsStore';
import { getChubaniTaunts, ROLE_COMEDY_TAGLINES } from '../shared/banglaComedy';
import { soundEngine } from '../audio/soundEngine';
import {
  RotateCcw,
  Home,
  Play,
  Trophy,
  Skull,
  Sparkles,
  Music2,
  BookOpen,
  ShieldCheck,
  Users,
  EyeOff,
  Waves,
  Volume2,
} from 'lucide-react';

interface RouletteCardDef {
  id: string;
  label: string;
  bangla: string;
  faction: 'parabasi' | 'vondo' | 'neutral';
  accent: string;
}

const ROLE_ROULETTE_DECK: RouletteCardDef[] = [
  { id: 'none', label: 'PARA-BASI', bangla: 'পাড়াবাসী', faction: 'parabasi', accent: '#38bdf8' },
  { id: 'vondo', label: 'BATPAR', bangla: 'বাটপার', faction: 'vondo', accent: '#fb7185' },
  { id: 'goyenda', label: 'GOYENDA', bangla: 'গোয়েন্দা', faction: 'parabasi', accent: '#22d3ee' },
  { id: 'bohurupi', label: 'BOHURUPI', bangla: 'বহুরূপী', faction: 'vondo', accent: '#f43f5e' },
  { id: 'kobiraj', label: 'KOBIRAJ', bangla: 'তাবিজ বাবা', faction: 'parabasi', accent: '#34d399' },
  { id: 'daroga', label: 'DAROGA', bangla: 'দারোগা', faction: 'parabasi', accent: '#f97316' },
  { id: 'jharudar', label: 'JHARUDAR', bangla: 'সাফাই বাটপার', faction: 'vondo', accent: '#e11d48' },
  { id: 'mistri', label: 'MISTRI', bangla: 'মিস্ত্রি বাবু', faction: 'parabasi', accent: '#fbbf24' },
  { id: 'daktar', label: 'DAKTAR', bangla: 'ডাক্তার', faction: 'parabasi', accent: '#2dd4bf' },
  { id: 'neta', label: 'NETA', bangla: 'মহল্লা নেতা', faction: 'parabasi', accent: '#facc15' },
  { id: 'pagol', label: 'PAGLA BABA', bangla: 'পাগলা বাবা', faction: 'neutral', accent: '#c084fc' },
];

function ChibiRolePortrait({
  colorHex,
  visorTint,
  isVondo,
  isPagol,
  specialRole,
}: {
  colorHex: string;
  visorTint: string;
  isVondo: boolean;
  isPagol: boolean;
  specialRole: SpecialRole;
}) {
  return (
    <svg viewBox="0 0 96 96" className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 drop-shadow-lg" aria-hidden="true">
      {/* Glow ring */}
      <circle
        cx="48"
        cy="48"
        r="44"
        fill={isPagol ? '#3b0764' : isVondo ? '#450a0a' : '#082f49'}
        stroke={isPagol ? '#c084fc' : isVondo ? '#fb7185' : '#38bdf8'}
        strokeWidth="3"
      />
      {/* Backpack */}
      <rect x="20" y="38" width="12" height="30" rx="5" fill="#94a3b8" stroke="#0f172a" strokeWidth="2.5" />
      {/* Body */}
      <rect x="28" y="24" width="42" height="52" rx="20" fill={colorHex} stroke="#0f172a" strokeWidth="3" />
      {/* Legs */}
      <rect x="33" y="68" width="12" height="14" rx="5" fill={colorHex} stroke="#0f172a" strokeWidth="2.5" />
      <rect x="52" y="68" width="12" height="14" rx="5" fill={colorHex} stroke="#0f172a" strokeWidth="2.5" />
      {/* Visor */}
      <rect
        x="42"
        y="34"
        width="26"
        height="15"
        rx="7.5"
        fill={isVondo ? '#fecdd3' : visorTint}
        stroke="#0f172a"
        strokeWidth="2.5"
      />
      <ellipse cx="59" cy="39" rx="5" ry="2.2" fill="#ffffff" opacity="0.8" />
      {/* Role Prop Accent */}
      {isVondo && (
        <g transform="translate(65 44) rotate(-25)">
          <rect x="0" y="10" width="5" height="9" rx="2" fill="#78350f" stroke="#0f172a" strokeWidth="1.5" />
          <polygon points="0,10 5,10 2.5,-4" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
        </g>
      )}
      {isPagol && (
        <text x="48" y="20" textAnchor="middle" fontSize="14" fontWeight="900" fill="#e9d5ff">
          @.@
        </text>
      )}
      {!isVondo && !isPagol && specialRole !== 'none' && (
        <circle cx="71" cy="24" r="9" fill="#fbbf24" stroke="#0f172a" strokeWidth="2" />
      )}
    </svg>
  );
}

function getRoleHowToPlay(isVondo: boolean, isPagol: boolean, specialRole: SpecialRole): string[] {
  if (isVondo) {
    const lines = [
      'Alada thaka Para-basi ke [Q / Gap e Naw] diye size koro ar [V] diye Dren diye palao!',
      '[Tab / Map] theke DESCO Current ba Wi-Fi Sabotage dao jeno shobai chhutachhuti kore.',
    ];
    if (specialRole === 'bohurupi') {
      lines.push('Bohurupi Power [G]: Onno player er chehara churi kore CCTV te tader ke fashao!');
    } else if (specialRole === 'jharudar') {
      lines.push('Jharudar Power [G]: Size korar por Lash gayeb kore daw jeno keu report na kore!');
    } else {
      lines.push('Shalish e bhalo acting koro — nije sus hoile onno kaure dosh diye bachaw!');
    }
    return lines;
  }
  if (isPagol) {
    return [
      'Tumi kono team e nai! Tomar Goal: Shalish e shobai jeno TOMAKE Pukur e fele!',
      'Task na kore ektu shondhojonok bhabe ghuraghuri koro ar chat e ultapalta kotha bolo!',
    ];
  }
  const lines = [
    'Holud marker e giye [E / Task] diye Para Tasks shesh koro — 100% hoile Para-basi WIN!',
    'Lash dekhle [R / Report] dao ba Adda Bell bajiye Shalish e Batpar ke Pukur e felo!',
  ];
  if (specialRole === 'goyenda') {
    lines.push('Goyenda Power [G]: 3D Footprints dekho ar Lash scan kore killer er color hint ber koro!');
  } else if (specialRole === 'kobiraj') {
    lines.push('Kobiraj Power [G]: Kacher neighbor ke Tabiz Shield porao — 1 bar Gap e neowa theke bachabe!');
  } else if (specialRole === 'mistri') {
    lines.push('Mistri Power [V]: Dren diye shortcut nao ar dur thekei DESCO / Wi-Fi fix koro!');
  } else if (specialRole === 'daroga') {
    lines.push('Daroga Power [G]: Batpar ke 1 shot e size koro! (Bhul kore Para-basi marle nijei out!)');
  } else if (specialRole === 'neta') {
    lines.push('Neta Power: Shalish e tomar Vote 2x count hobe ar +1 Extra Adda Bell pabe!');
  } else if (specialRole === 'daktar') {
    lines.push('Daktar Power [G]: Match e 1 bar unreported fallen neighbor ke Saline diye jinda koro!');
  }
  return lines;
}

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
  const [elapsedMs, setElapsedMs] = useState(0);
  const shhhhPlayedRef = useRef(false);
  const lastTickStepRef = useRef(-1);

  const ROULETTE_END_MS = 1800;
  const TOTAL_DISPLAY_MS = onContinue ? 15000 : 8000;

  useEffect(() => {
    shhhhPlayedRef.current = false;
    lastTickStepRef.current = -1;
    setElapsedMs(0);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAt);
    }, 50);
    return () => window.clearInterval(timer);
  }, [localPlayerId, snapshot.roomCode]);

  const isVondo = localPlayer?.role === 'vondo';
  const isPagol = localPlayer?.specialRole === 'pagol';
  const flipped = elapsedMs >= ROULETTE_END_MS;

  // Step-slowing Super Sus deck roulette index
  const rouletteIndex = useMemo(() => {
    if (elapsedMs >= ROULETTE_END_MS) return 0;
    const progress = elapsedMs / ROULETTE_END_MS;
    const step = Math.floor(Math.pow(progress, 0.78) * 14);
    return step;
  }, [elapsedMs]);

  useEffect(() => {
    if (!localPlayer) return;
    if (!flipped) {
      if (rouletteIndex !== lastTickStepRef.current) {
        lastTickStepRef.current = rouletteIndex;
        soundEngine.playCardTick();
      }
      return;
    }
    if (!shhhhPlayedRef.current) {
      shhhhPlayedRef.current = true;
      soundEngine.playShhhhSound(Boolean(isVondo), Boolean(isPagol));
    }
  }, [flipped, rouletteIndex, isVondo, isPagol, localPlayer]);

  if (!localPlayer) return null;

  const specialMeta = SPECIAL_ROLES[localPlayer.specialRole];
  const colorSpec = PLAYER_COLORS.find((col) => col.id === localPlayer.color) ?? PLAYER_COLORS[0];
  const fellowVondos = snapshot.players.filter((p) => p.role === 'vondo');
  const parabasiCount = snapshot.players.filter(
    (p) => p.role === 'parabasi' && p.specialRole !== 'pagol',
  ).length;
  const pagolCount = snapshot.players.filter((p) => p.specialRole === 'pagol').length;
  const progressPct = Math.min(100, (elapsedMs / TOTAL_DISPLAY_MS) * 100);
  const roleSteps = getRoleHowToPlay(isVondo, isPagol, localPlayer.specialRole);

  const factionBg = !flipped
    ? 'radial-gradient(circle at center, rgba(30, 41, 59, 0.96) 0%, rgba(7, 10, 18, 0.99) 75%)'
    : isPagol
      ? 'radial-gradient(circle at center, rgba(88, 28, 135, 0.95) 0%, rgba(7, 10, 18, 0.99) 74%)'
      : isVondo
        ? 'radial-gradient(circle at center, rgba(127, 29, 29, 0.95) 0%, rgba(7, 10, 18, 0.99) 74%)'
        : 'radial-gradient(circle at center, rgba(12, 74, 110, 0.95) 0%, rgba(7, 10, 18, 0.99) 74%)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Role Reveal"
      className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto"
      style={{ background: factionBg }}
    >
      <div className="max-w-2xl w-full max-h-[95dvh] overflow-y-auto rounded-2xl border border-white/15 bg-slate-950/75 shadow-2xl p-3.5 sm:p-6 space-y-3.5 sm:space-y-4">
        {!flipped ? (
          /* STAGE 1: Super Sus Role Card Shuffle & Selection Roulette */
          <div className="py-4 sm:py-8 text-center space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-[11px] font-mono-tabular uppercase tracking-[0.22em] text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              SELECTING YOUR MOHOLLA CARD...
            </span>

            {/* Fanned Shuffle Cards Row */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 pt-1">
              {[-2, -1, 0, 1, 2].map((offset) => {
                const idx =
                  (rouletteIndex + offset + ROLE_ROULETTE_DECK.length * 4) %
                  ROLE_ROULETTE_DECK.length;
                const card = ROLE_ROULETTE_DECK[idx];
                const isCenter = offset === 0;
                return (
                  <div
                    key={`${offset}-${card.id}`}
                    className={`rounded-2xl border transition-all duration-75 flex flex-col items-center justify-center px-2.5 py-3 sm:px-4 sm:py-5 ${
                      isCenter
                        ? 'w-32 sm:w-44 h-40 sm:h-52 scale-105 bg-slate-900 shadow-2xl'
                        : Math.abs(offset) === 1
                          ? 'w-20 sm:w-28 h-28 sm:h-36 opacity-60 bg-slate-900/75 hidden xs:flex sm:flex'
                          : 'w-16 sm:w-22 h-24 sm:h-32 opacity-30 bg-slate-900/50 hidden sm:flex'
                    }`}
                    style={{
                      borderColor: isCenter ? card.accent : 'rgba(255,255,255,0.12)',
                      boxShadow: isCenter ? `0 0 28px ${card.accent}44` : undefined,
                    }}
                  >
                    <span className="text-2xl sm:text-3xl font-display font-black text-white/25 mb-1">
                      ?
                    </span>
                    <span
                      className="font-display font-extrabold text-xs sm:text-base tracking-wide text-center"
                      style={{ color: card.accent }}
                    >
                      {card.label}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-300 mt-0.5">{card.bangla}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-semibold">
              Locking in role for <span className="text-amber-300 font-bold">{localPlayer.name}</span>...
            </p>
          </div>
        ) : (
          /* STAGE 2: SHHHHH! Dramatic Card Reveal + Imposter Gang + Role & Rules Briefing */
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-xs font-mono-tabular uppercase tracking-[0.26em] text-amber-300">
                <Volume2 className="w-3.5 h-3.5" />
                SHHHHH! · নিশ্চুপ!
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 pt-1">
                <ChibiRolePortrait
                  colorHex={colorSpec.hex}
                  visorTint={colorSpec.visorTint}
                  isVondo={isVondo}
                  isPagol={isPagol}
                  specialRole={localPlayer.specialRole}
                />

                <div className="text-center sm:text-left space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {isPagol
                      ? 'CHAOS NEUTRAL CARD'
                      : isVondo
                        ? 'SECRET IMPOSTER CARD'
                        : 'MOHOLLA CREW CARD'}
                  </p>
                  <h2
                    className={`font-display text-3xl sm:text-4xl font-extrabold leading-none ${
                      isPagol ? 'text-purple-300' : isVondo ? 'text-rose-400' : 'text-sky-300'
                    }`}
                  >
                    {isPagol
                      ? 'PAGLA BABA!'
                      : isVondo
                        ? 'TUMI BATPAR!'
                        : 'TUMI PARA-BASI!'}
                  </h2>

                  {localPlayer.specialRole !== 'none' ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-white/15 mt-1">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: specialMeta.accentHex }} />
                      <span className="text-xs sm:text-sm font-bold" style={{ color: specialMeta.accentHex }}>
                        {specialMeta.banglaTitle} · {specialMeta.title}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm font-semibold text-amber-300/95">
                      {isVondo
                        ? 'Ajke kare gap e nibi re Batpar?! Sabdhan, Pukur ready ache!'
                        : ROLE_COMEDY_TAGLINES[localPlayer.specialRole]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Imposter Gang Reveal (ALL Batpars see all fellow Batpar teammates!) */}
            {isVondo && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/35 px-3 py-2.5 text-center space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-200 flex items-center justify-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-rose-400" />
                  {fellowVondos.length > 1
                    ? `Tor Batpar Gang (${fellowVondos.length} Jon Imposter — Ekshathe Kaj Koro!)`
                    : 'Tumi Ekai Ajke Mohollar Asli Batpar!'}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {fellowVondos.map((p) => {
                    const c = PLAYER_COLORS.find((col) => col.id === p.color) ?? PLAYER_COLORS[0];
                    const pSpecial = SPECIAL_ROLES[p.specialRole];
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                          p.id === localPlayer.id
                            ? 'bg-rose-900/60 border-rose-300/60'
                            : 'bg-slate-900/90 border-white/15'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-xs font-bold text-white">
                          {p.name}
                          {p.id === localPlayer.id ? ' (You)' : ''}
                        </span>
                        {p.specialRole !== 'none' && (
                          <span className="text-[10px] font-bold text-rose-200">
                            · {pSpecial.title.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Two-Column Briefing: Role er Kaj + Match er Niom (Rules) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left">
              {/* Role How-To-Play Card */}
              <div className="rounded-xl border border-white/12 bg-slate-900/85 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-display font-bold text-amber-300">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Tomar Role er Kaj &amp; Controls</span>
                </div>
                <ul className="space-y-1 text-[11px] sm:text-xs text-slate-200 leading-snug">
                  {roleSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-300 font-bold shrink-0">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Game Rules Briefing Card */}
              <div className="rounded-xl border border-white/12 bg-slate-900/85 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-display font-bold text-sky-300">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Match er Niom (Rules)</span>
                </div>
                <ul className="space-y-1 text-[11px] sm:text-xs text-slate-200 leading-snug">
                  <li className="flex items-start gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-rose-300">{fellowVondos.length} Batpar</strong> vs{' '}
                      <strong className="text-sky-300">{parabasiCount} Para-basi</strong>
                      {pagolCount > 0 ? ' + 1 Pagla Baba' : ''}.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span>
                      <strong>Para-basi Win:</strong> Shob Tasks ({snapshot.settings.tasksPerPlayer}/jon) sesh ba shob Batpar ke Pukur e felo!
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" />
                    <span>
                      <strong>Ghost Rule:</strong> Morle Adrishyo Ghost hobe — Alive keu dekhbe na, Ghost hoyeo Tasks sesh kora jabe!
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5 font-mono-tabular text-[10px] sm:text-[11px] text-amber-200/90 pt-0.5">
                    <span>
                      Kill CD: {snapshot.settings.killCooldownSec}s · Shalish: {snapshot.settings.meetingTimeSec}s · Eject Reveal: {snapshot.settings.confirmEjects ? 'ON' : 'OFF'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Bottom Countdown Bar + Enter Moholla Action */}
        <div className="space-y-2 pt-1">
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
            <span>
              {!flipped
                ? 'Shuffling Moholla roles...'
                : onContinue
                  ? 'Role card & rules ready!'
                  : `Match starts in ${Math.max(1, Math.ceil((TOTAL_DISPLAY_MS - elapsedMs) / 1000))}s...`}
            </span>
            {onContinue && flipped && (
              <button
                type="button"
                onClick={onContinue}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs sm:text-sm shadow-lg"
              >
                Enter Moholla
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const EJECT_LAST_WORDS_INNOCENT = [
  '"Bhai ami toh shudhu Cha ar Shingara khaitasilam reee!!"',
  '"Amar Task 1 ta baki chilo maaagooo!"',
  '"Satar jani na bhai, tube daw keuuuu!!"',
];

const EJECT_LAST_WORDS_BATPAR = [
  '"Dhore felso bhai... kintu DESCO fuse e pani amii disilam hehe!"',
  '"Tader ke bolbi na ami Dren diye palaitam!!"',
  '"Pukur er mach o amar friend reee!"',
];

const EJECT_LAST_WORDS_PAGOL = [
  '"HAHAHAHAHA! Shobai BAIT khaise!! Ami e Pagla Baba!!"',
  '"Tomader Shalish ke ullu banay gelam reee!!"',
];

export function EjectionModal({
  ejection,
  onContinue,
}: {
  ejection: EjectionInfo;
  onContinue?: () => void;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const splashPlayedRef = useRef(false);

  const TOTAL_MS = ejection.reason === 'voted' ? 7500 : 5000;

  useEffect(() => {
    splashPlayedRef.current = false;
    setElapsedMs(0);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAt);
    }, 50);
    return () => window.clearInterval(timer);
  }, [ejection.ejectedId, ejection.reason]);

  useEffect(() => {
    if (ejection.reason === 'voted' && ejection.ejectedName && elapsedMs >= 2250 && !splashPlayedRef.current) {
      splashPlayedRef.current = true;
      soundEngine.playEject();
    }
  }, [ejection.reason, ejection.ejectedName, elapsedMs]);

  const c = ejection.ejectedColor
    ? PLAYER_COLORS.find((col) => col.id === ejection.ejectedColor) ?? PLAYER_COLORS[0]
    : null;

  if (ejection.reason === 'voted' && ejection.ejectedName) {
    const taunts = getChubaniTaunts(
      ejection.ejectedName,
      ejection.wasVondo,
      ejection.wasSpecialRole === 'pagol',
    );
    const nameSeed = ejection.ejectedName.length;
    const lastWords =
      ejection.wasSpecialRole === 'pagol'
        ? EJECT_LAST_WORDS_PAGOL[nameSeed % EJECT_LAST_WORDS_PAGOL.length]
        : ejection.wasVondo
          ? EJECT_LAST_WORDS_BATPAR[nameSeed % EJECT_LAST_WORDS_BATPAR.length]
          : EJECT_LAST_WORDS_INNOCENT[nameSeed % EJECT_LAST_WORDS_INNOCENT.length];

    const isAct1Windup = elapsedMs < 1400;
    const isAct2FlightAndSplash = elapsedMs >= 1400 && elapsedMs < 2900;
    const isBubbling = elapsedMs >= 2900 && elapsedMs < 3800;
    const showVerdict = elapsedMs >= 3800;
    const progressPct = Math.min(100, (elapsedMs / TOTAL_MS) * 100);

    const countdownLabel =
      elapsedMs < 460
        ? '1... DHORO!'
        : elapsedMs < 920
          ? '2... TULO ORE!'
          : elapsedMs < 1400
            ? '3... CHUBANI TIME!!'
            : elapsedMs < 2250
              ? 'URE JAA PUKUR E!!'
              : 'ZHAPANGGG!! PUKUR E CHUBANI!';

    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-6"
      >
        {/* Top Live Crowd Comedy Banner (center stays completely open for live 3D Pukur throw + pond splash!) */}
        <div className="max-w-2xl w-full mx-auto text-center space-y-2 pt-1 sm:pt-2">
          <div className="inline-flex flex-wrap items-center justify-center gap-2">
            <span
              className={`px-3.5 py-1.5 rounded-xl font-display font-extrabold text-xs sm:text-base shadow-xl ${
                elapsedMs >= 2250
                  ? 'bg-sky-400 text-slate-950 scale-105'
                  : 'bg-amber-400 text-slate-950'
              } transition-transform`}
            >
              {countdownLabel}
            </span>
            {!isAct1Windup && (
              <span className="px-2.5 py-1 rounded-xl bg-slate-900/92 border border-sky-400/50 text-sky-200 font-bold text-xs shadow-lg">
                {taunts[0]}
              </span>
            )}
            {showVerdict && (
              <span className="px-2.5 py-1 rounded-xl bg-slate-900/92 border border-rose-400/50 text-rose-200 font-bold text-xs shadow-lg">
                {taunts[2]}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Progressive Pukur Verdict & Post-Splash Reveal Card */}
        <div
          className="max-w-xl w-full mx-auto rounded-2xl px-4 py-3.5 sm:px-6 sm:py-4 border border-sky-400/45 shadow-2xl text-center space-y-2 pointer-events-auto"
          style={{ backgroundColor: 'rgba(9, 15, 28, 0.92)' }}
        >
          <div className="flex items-center justify-center gap-2.5">
            <span
              className="w-4 h-4 rounded-full border-2 border-amber-300 shrink-0"
              style={{ backgroundColor: c?.hex ?? '#e11d48' }}
            />
            <h2 className="font-display text-lg sm:text-2xl font-extrabold text-white">
              {isAct1Windup
                ? `${ejection.ejectedName} ke Pukur Ghat e niye gese Moholla-bashi!`
                : `${ejection.ejectedName} ke Pukur e Chubani Deowa Holo!`}
            </h2>
          </div>

          {(isAct1Windup || isAct2FlightAndSplash) && (
            <p className="text-xs sm:text-sm italic font-semibold text-amber-200 bg-slate-900/90 border border-amber-400/30 rounded-xl px-3 py-1.5">
              {ejection.ejectedName}: {lastWords}
            </p>
          )}

          {isBubbling && (
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-sky-300 animate-pulse py-1">
              <Waves className="w-4 h-4" />
              <span>Pukur er pani theke ki khobor uthlo...?</span>
            </div>
          )}

          {showVerdict && (
            <div className="space-y-1.5 pt-0.5">
              {ejection.confirmEjects ? (
                <>
                  <div
                    className={`inline-block px-3.5 py-1 rounded-xl border font-display font-extrabold text-xs sm:text-sm tracking-wide ${
                      ejection.wasSpecialRole === 'pagol'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                        : ejection.wasVondo
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-rose-500/20 border-rose-400 text-rose-200'
                    }`}
                  >
                    {ejection.wasSpecialRole === 'pagol'
                      ? 'PAGLA BABA BAIT DIYE JITSE!'
                      : ejection.wasVondo
                        ? 'ASLI BATPAR DHORE FELSI!'
                        : 'HAY RE! NIRAPARADH PARA-BASI CHILO!'}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200">
                    {ejection.wasSpecialRole === 'pagol'
                      ? `${ejection.ejectedName} chilo Pagla Baba — shobai ullu hoye gese!`
                      : ejection.wasVondo
                        ? `${ejection.ejectedName} asolei Batpar${
                            ejection.wasSpecialRole !== 'none'
                              ? ` (${SPECIAL_ROLES[ejection.wasSpecialRole].title})`
                              : ''
                          } chilo! ${taunts[1]}`
                        : `${ejection.ejectedName} nirdosh Para-basi chilo (${
                            ejection.wasSpecialRole !== 'none'
                              ? SPECIAL_ROLES[ejection.wasSpecialRole].title
                              : 'Neighbor'
                          })... Moholla boro bhul korlo!`}
                  </p>
                  <p className="text-xs font-mono-tabular text-amber-300 font-bold">
                    Batpars remaining in Moholla: {ejection.remainingVondos}
                  </p>
                </>
              ) : (
                <p className="text-xs sm:text-sm font-semibold text-slate-300">
                  Confirm Ejects is OFF — {ejection.ejectedName} ki Batpar chilo sheta gopon thaklo!
                </p>
              )}
            </div>
          )}

          {/* Round transition progress bar + Solo Skip */}
          <div className="pt-1 space-y-1.5">
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all duration-100"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
              <span>
                {showVerdict ? 'Next round shuru hocche...' : 'Pukur Chubani in progress...'}
              </span>
              {onContinue && showVerdict && (
                <button
                  type="button"
                  onClick={onContinue}
                  className="px-3.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = Math.min(100, (elapsedMs / TOTAL_MS) * 100);
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.92)' }}
    >
      <div className="max-w-lg w-full rounded-2xl border border-white/15 bg-slate-950/90 p-5 sm:p-7 text-center space-y-4 shadow-2xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center animate-bounce">
          <Waves className="w-7 h-7 text-sky-300" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          {ejection.reason === 'tie'
            ? 'Vote Tai! Pukur er Mach Ajke Uposh Thaklo!'
            : 'Shobai Skip Marlo — Batpar Cha Khaitese!'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          {ejection.reason === 'tie'
            ? 'Dui joner vote shoman! Shalish e jhogra korei shomoy sesh, keu pukur e gelo na!'
            : 'Keu kaure Pukur e felle na — Asli Batpar kop-e Cha ar Shingara niye hashtease!'}
        </p>
        {ejection.confirmEjects && (
          <p className="text-xs font-mono-tabular text-amber-300 font-bold">
            Batpars remaining in Moholla: {ejection.remainingVondos}
          </p>
        )}
        <div className="space-y-2 pt-1">
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {onContinue && elapsedMs >= 1600 && (
            <button
              type="button"
              onClick={onContinue}
              className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs"
            >
              Continue
            </button>
          )}
        </div>
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
    batpars_out: 'Shob Batpar dhora kheye Pukur e chubani khaise! Batpari khotom!',
    batpars_outnumber: 'Batpar ra pura Moholla dokhol kore nise — Cha-er dokan o bondho!',
    critical_sabotage_timeout: 'Gas Phute Pura Para Uthhe Gese! Chulha ar tanki dui-i Blast!',
    pagol_ejected: `${outcome.winnerPlayerName ?? 'Pagla Baba'} shobai ke ullu banay cup niye gelo!`,
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
