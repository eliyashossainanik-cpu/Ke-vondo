import { useState } from 'react';
import type { TaskStation } from '../shared/types';
import { X, CheckCircle2 } from 'lucide-react';

export interface TaskModalProps {
  station: TaskStation;
  onComplete: (taskId: string) => void;
  onClose: () => void;
}

export function TaskModal({ station, onComplete, onClose }: TaskModalProps) {
  const [done, setDone] = useState(false);

  // Task 1: Cha Mix (need 3 stirs)
  const [stirs, setStirs] = useState(0);

  // Task 2: DESCO Fuse Fix (3 switches must all be ON)
  const [fuses, setFuses] = useState([false, true, false]);

  // Task 3: Rickshaw Pump (0 to 100 PSI)
  const [psi, setPsi] = useState(20);

  // Task 4: Dish Tune (slider target 68..82)
  const [freq, setFreq] = useState(25);

  // Task 5: Bazar Hisab (50 + 75 = 125)
  const [hisabError, setHisabError] = useState(false);

  // Task 6: Pukur Water Check (3 sample drops)
  const [samples, setSamples] = useState(0);

  // Task 7: Fuchka Serve (3 sequential ingredients: Puri -> Aloo -> Tetul Tok)
  const [fuchkaStep, setFuchkaStep] = useState(0);

  // Task 8: Hero Saloon Trim (3 hair/beard snips)
  const [trimSpots, setTrimSpots] = useState([false, false, false]);

  // Task 9: Para Cricket Tape Ball (4 wraps to 100%)
  const [tapeWraps, setTapeWraps] = useState(0);

  // Task 10: Dadu Pharmacy ORS Mix (Saline packet + 2 Napa drops)
  const [orsAdded, setOrsAdded] = useState(false);
  const [napaCount, setNapaCount] = useState(0);

  // Task 11: Biyer Bari DJ Bass Sync (80..95 BPM + Drop Beat)
  const [djBpm, setDjBpm] = useState(64);

  const finish = () => {
    if (done) return;
    setDone(true);
    setTimeout(() => {
      onComplete(station.id);
    }, 320);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={station.title}
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.72)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 border border-amber-400/30 shadow-2xl"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.97)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <span className="text-xs font-semibold text-amber-300">{station.zoneName}</span>
            <h2 className="font-display text-2xl font-bold text-white mt-0.5">{station.title}</h2>
            <p className="text-sm text-slate-400">{station.banglaTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task"
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="py-8 flex flex-col items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-12 h-12" />
            <span className="font-display text-lg font-bold">Kaaj Complete!</span>
          </div>
        ) : (
          <div>
            {station.kind === 'cha_mix' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Add condensed milk & stir the clay cup 3 times for Mama&apos;s special Dudh-Cha.
                </p>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${(stirs / 3) * 100}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = stirs + 1;
                    setStirs(next);
                    if (next >= 3) finish();
                  }}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold"
                >
                  Stir Chini & Cha ({stirs}/3)
                </button>
              </div>
            )}

            {station.kind === 'fuse_fix' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Flip all 3 DESCO breakers to ON to stop the Moholla loadshedding.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {fuses.map((on, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const next = [...fuses];
                        next[idx] = !next[idx];
                        setFuses(next);
                        if (next.every(Boolean)) finish();
                      }}
                      className={`py-5 rounded-xl font-display font-bold text-sm border transition-colors ${
                        on
                          ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                          : 'bg-rose-950 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      Line {idx + 1}
                      <span className="block text-xs mt-1">{on ? 'ON' : 'TRIPPED'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {station.kind === 'rickshaw_pump' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Pump air into the rear rickshaw tire up to 100 PSI.
                </p>
                <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-300">
                  <span>Pressure</span>
                  <span className="text-amber-300 font-bold">{psi} PSI</span>
                </div>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all" style={{ width: `${psi}%` }} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(100, psi + 20);
                    setPsi(next);
                    if (next >= 100) finish();
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold"
                >
                  Pump Air (+20 PSI)
                </button>
              </div>
            )}

            {station.kind === 'dish_tune' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Align the satellite frequency between <strong className="text-amber-300">70 – 80 MHz</strong> for Cricket live feed.
                </p>
                <div className="flex items-center justify-between font-mono-tabular text-sm">
                  <span className="text-slate-400">Signal:</span>
                  <span className={freq >= 70 && freq <= 80 ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                    {freq} MHz
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={freq}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFreq(val);
                    if (val >= 70 && val <= 80) finish();
                  }}
                  aria-label="Satellite frequency MHz"
                  className="w-full accent-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFreq(75);
                    finish();
                  }}
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-bold text-sm"
                >
                  Auto-Lock 75 MHz
                </button>
              </div>
            )}

            {station.kind === 'bazar_hisab' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Mudi Dokan Audit: 1kg Aloo (50 TK) + 1kg Peyaj (75 TK) = ?
                </p>
                {hisabError && <p className="text-xs text-rose-400">Bhul hisab! Try again.</p>}
                <div className="grid grid-cols-3 gap-2.5">
                  {[115, 125, 135].map((ans) => (
                    <button
                      key={ans}
                      type="button"
                      onClick={() => {
                        if (ans === 125) finish();
                        else setHisabError(true);
                      }}
                      className="py-3.5 rounded-xl bg-slate-800 hover:bg-amber-400 hover:text-slate-950 font-mono-tabular font-bold text-base text-white transition-colors"
                    >
                      {ans} TK
                    </button>
                  ))}
                </div>
              </div>
            )}

            {station.kind === 'pukur_check' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Test 3 water samples at Pukur Ghat to confirm no Batpar dumped garbage in it.
                </p>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all"
                    style={{ width: `${(samples / 3) * 100}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = samples + 1;
                    setSamples(next);
                    if (next >= 3) finish();
                  }}
                  className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-bold"
                >
                  Test Water Sample ({samples}/3)
                </button>
              </div>
            )}

            {station.kind === 'fuchka_serve' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Prepare a crispy plate of <strong className="text-amber-300">Jhal Fuchka</strong> in 3 steps!
                </p>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${(fuchkaStep / 3) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { idx: 0, label: '1. Crack Puri' },
                    { idx: 1, label: '2. Aloo Bhorta' },
                    { idx: 2, label: '3. Tetul Tok!' },
                  ].map((step) => {
                    const doneStep = fuchkaStep > step.idx;
                    const activeStep = fuchkaStep === step.idx;
                    return (
                      <button
                        key={step.idx}
                        type="button"
                        disabled={!activeStep}
                        onClick={() => {
                          const next = fuchkaStep + 1;
                          setFuchkaStep(next);
                          if (next >= 3) finish();
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-bold border transition-colors ${
                          doneStep
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                            : activeStep
                              ? 'bg-amber-400 hover:bg-amber-300 border-amber-200 text-slate-950'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        {step.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {station.kind === 'saloon_trim' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Trim all 3 Hero-cut spots at <strong className="text-sky-300">Hero Saloon</strong> before the Shalish!
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {['Left Fade', 'Top Spike', 'Beard Line'].map((spot, idx) => {
                    const trimmed = trimSpots[idx];
                    return (
                      <button
                        key={spot}
                        type="button"
                        onClick={() => {
                          if (trimmed) return;
                          const next = [...trimSpots];
                          next[idx] = true;
                          setTrimSpots(next);
                          if (next.every(Boolean)) finish();
                        }}
                        className={`py-4 px-2 rounded-xl font-display font-bold text-xs border transition-colors ${
                          trimmed
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                            : 'bg-sky-950 hover:bg-sky-800 border-sky-400/40 text-sky-200'
                        }`}
                      >
                        {spot}
                        <span className="block text-[10px] mt-1">{trimmed ? 'HERO CUT!' : 'Snip'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {station.kind === 'cricket_tape' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Wrap 4 tight layers of red electrical tape around the tennis ball for Para Tape-Tennis!
                </p>
                <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-300">
                  <span>Tape Grip</span>
                  <span className="text-emerald-300 font-bold">{tapeWraps * 25}%</span>
                </div>
                <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all"
                    style={{ width: `${tapeWraps * 25}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(4, tapeWraps + 1);
                    setTapeWraps(next);
                    if (next >= 4) finish();
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold"
                >
                  Wrap Red Tape ({tapeWraps}/4)
                </button>
              </div>
            )}

            {station.kind === 'pharmacy_mix' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Mix <strong className="text-teal-300">1 Oral Saline</strong> packet and{' '}
                  <strong className="text-amber-300">2 Napa</strong> tablets for Dadu&apos;s Moholla Kit.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={orsAdded}
                    onClick={() => {
                      setOrsAdded(true);
                      if (napaCount >= 2) finish();
                    }}
                    className={`py-4 px-3 rounded-xl font-display font-bold text-xs border transition-colors ${
                      orsAdded
                        ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                        : 'bg-teal-950 hover:bg-teal-800 border-teal-400/40 text-teal-200'
                    }`}
                  >
                    {orsAdded ? 'Saline Mixed!' : '+ Pour Oral Saline'}
                  </button>
                  <button
                    type="button"
                    disabled={napaCount >= 2}
                    onClick={() => {
                      const next = napaCount + 1;
                      setNapaCount(next);
                      if (orsAdded && next >= 2) finish();
                    }}
                    className={`py-4 px-3 rounded-xl font-display font-bold text-xs border transition-colors ${
                      napaCount >= 2
                        ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                        : 'bg-amber-950 hover:bg-amber-800 border-amber-400/40 text-amber-200'
                    }`}
                  >
                    + Add Napa ({napaCount}/2)
                  </button>
                </div>
              </div>
            )}

            {station.kind === 'pandal_dj' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Lock the Biyer Bari DJ mixer between <strong className="text-fuchsia-300">80 – 95 BPM</strong> to hype the Moholla!
                </p>
                <div className="flex items-center justify-between font-mono-tabular text-sm">
                  <span className="text-slate-400">Bass Tempo:</span>
                  <span className={djBpm >= 80 && djBpm <= 95 ? 'text-emerald-400 font-bold' : 'text-fuchsia-300'}>
                    {djBpm} BPM
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={120}
                  value={djBpm}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDjBpm(val);
                    if (val >= 80 && val <= 95) finish();
                  }}
                  aria-label="DJ Bass BPM"
                  className="w-full accent-fuchsia-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setDjBpm(88);
                    finish();
                  }}
                  className="w-full py-2.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-display font-bold text-sm"
                >
                  Drop Biyer Bari Bass (88 BPM)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
