import { SPECIAL_ROLES, type SpecialRole } from '../shared/types';
import { BookOpen, Compass, Gamepad2, ShieldAlert, X } from 'lucide-react';

export interface GuideModalProps {
  onClose: () => void;
}

const ROLE_ORDER: SpecialRole[] = [
  'none',
  'goyenda',
  'kobiraj',
  'mistri',
  'daroga',
  'neta',
  'daktar',
  'bohurupi',
  'jharudar',
  'pagol',
];

export function GuideModal({ onClose }: GuideModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ke Batpar Rules and Controls Guide"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.88)' }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-amber-400/35 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'rgba(13, 20, 34, 0.98)' }}
      >
        <header className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                Moholla Rules &amp; Roles Guide
              </h2>
              <p className="text-xs text-slate-400">
                Complete social deduction rules, special powers, and controls
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Guide"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-200">
          {/* Core Win Conditions */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl p-3.5 bg-sky-950/45 border border-sky-400/30">
              <h3 className="font-display font-bold text-sky-300 text-sm mb-1 flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                Para-basi (Neighbors) Win If:
              </h3>
              <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                <li>Finish all Moholla tasks (even as a Ghost — Ghosts fly through walls!)</li>
                <li>Or eject every Batpar into the Pukur during Shalish voting.</li>
              </ul>
            </div>
            <div className="rounded-xl p-3.5 bg-rose-950/45 border border-rose-400/30">
              <h3 className="font-display font-bold text-rose-300 text-sm mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Batpar (Impostors) Win If:
              </h3>
              <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                <li>Eliminate enough Para-basi to equal or outnumber living neighbors.</li>
                <li>Or run out the clock on Loadshedding (DESCO) / Wi-Fi Down (Dish Hub).</li>
              </ul>
            </div>
          </section>

          {/* Special Roles */}
          <section>
            <h3 className="font-display font-bold text-amber-300 text-sm mb-2.5">
              Moholla Characters &amp; Special Roles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="rounded-xl p-3 bg-slate-900 border border-rose-500/30">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-rose-300">Batpar (আসল বাটপার)</span>
                  <span className="text-[11px] font-mono-tabular text-rose-200">Kill [Q] · Vent [V] · Sabotage [X]</span>
                </div>
                <p className="text-xs text-slate-300">
                  Gap e niye size koro, travel through connected Gopon Dren tunnels, slam shutters, and sabotage power or Wi-Fi.
                </p>
              </div>
              {ROLE_ORDER.map((r) => {
                const meta = SPECIAL_ROLES[r];
                return (
                  <div key={r} className="rounded-xl p-3 bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold" style={{ color: meta.accentHex }}>
                        {meta.title}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-slate-400">{meta.abilityLabel}</span>
                    </div>
                    <p className="text-xs text-slate-300">{meta.shortDesc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Stations & Controls */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl p-3.5 bg-slate-900 border border-slate-800">
              <h3 className="font-display font-bold text-amber-300 text-sm mb-1.5">
                Moholla Surveillance Stations
              </h3>
              <ul className="space-y-1 text-xs text-slate-300">
                <li><strong className="text-white">CCTV Booth (North):</strong> Watch live camera feeds across 8 Moholla hotspots.</li>
                <li><strong className="text-white">Admin Radar (East):</strong> Track live headcounts inside each zone.</li>
                <li><strong className="text-white">Vitals Clinic (West):</strong> Check who is Alive or Size in real time.</li>
                <li><strong className="text-white">Shalish Bell (Center):</strong> Call an emergency vote [F] at Adda Chowk.</li>
              </ul>
            </div>

            <div className="rounded-xl p-3.5 bg-slate-900 border border-slate-800">
              <h3 className="font-display font-bold text-amber-300 text-sm mb-1.5 flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4" />
                Controls
              </h3>
              <ul className="space-y-1 text-xs text-slate-300 font-mono-tabular">
                <li><strong>WASD / Arrows</strong> Move · <strong>Space</strong> Jump · <strong>Shift</strong> Sprint</li>
                <li><strong>Drag / [C] Look</strong> 360° + Sky/Ground · <strong>Wheel</strong> Zoom</li>
                <li><strong>[Tab]</strong> Full Moholla Map · <strong>[Y]</strong> Reset Camera</li>
                <li><strong>[E]</strong> Task / Station / Fix · <strong>[R]</strong> Report · <strong>[F]</strong> Bell</li>
                <li><strong>[G]</strong> Role Ability · <strong>[Q]</strong> Kill · <strong>[V]</strong> Vent · <strong>[X]</strong> Sabotage</li>
                <li><strong>[1–6]</strong> Bangla Meme SFX · <strong>[M]</strong> Mute · <strong>[P/Esc]</strong> Pause</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
