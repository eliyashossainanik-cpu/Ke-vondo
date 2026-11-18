import {
  MEME_SLOTS,
  getRawClipBuffer,
  getSlotDisplayLabel,
  initMemePackStore,
  type MemeSlotId,
  type QuickMemeId,
} from './memePackStore';

export type MemeSoundId = QuickMemeId;

export function getQuickMemeList(): Array<{ id: MemeSoundId; label: string; shortKey: string }> {
  return MEME_SLOTS.filter((s) => s.category === 'quick').map((s) => ({
    id: s.id as MemeSoundId,
    label: getSlotDisplayLabel(s.id),
    shortKey: s.shortKey ?? '1',
  }));
}

export const MEME_SOUNDS: Array<{ id: MemeSoundId; label: string; shortKey: string }> =
  MEME_SLOTS.filter((s) => s.category === 'quick').map((s) => ({
    id: s.id as MemeSoundId,
    label: s.defaultLabel,
    shortKey: s.shortKey ?? '1',
  }));

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private noiseBuffer: AudioBuffer | null = null;
  private decodedCache = new Map<MemeSlotId, { refBuf: ArrayBuffer; audio: AudioBuffer }>();
  private activeSources = new Map<MemeSlotId, AudioBufferSourceNode>();

  constructor() {
    if (typeof window !== 'undefined') {
      initMemePackStore().catch(() => {});
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public invalidateDecodedSlot(slotId?: MemeSlotId): void {
    if (slotId) {
      this.decodedCache.delete(slotId);
    } else {
      this.decodedCache.clear();
    }
  }

  private playBufferForSlot(ctx: AudioContext, slotId: MemeSlotId, audio: AudioBuffer): void {
    const prev = this.activeSources.get(slotId);
    if (prev) {
      try {
        prev.stop();
        prev.disconnect();
      } catch {
        // ignore already-stopped nodes
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = audio;
    const gain = ctx.createGain();
    gain.gain.value = 0.85;
    src.connect(gain).connect(ctx.destination);
    this.activeSources.set(slotId, src);
    src.onended = () => {
      if (this.activeSources.get(slotId) === src) {
        this.activeSources.delete(slotId);
      }
    };
    src.start(0);
  }

  private tryPlayCustomSlot(slotId: MemeSlotId, fallbackSynth: () => void): void {
    if (this.muted) return;
    const raw = getRawClipBuffer(slotId);
    if (!raw) {
      fallbackSynth();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    const cached = this.decodedCache.get(slotId);
    if (cached && cached.refBuf === raw) {
      this.playBufferForSlot(ctx, slotId, cached.audio);
      return;
    }

    ctx
      .decodeAudioData(raw.slice(0))
      .then((decoded) => {
        this.decodedCache.set(slotId, { refBuf: raw, audio: decoded });
        if (!this.muted) {
          this.playBufferForSlot(ctx, slotId, decoded);
        }
      })
      .catch(() => {
        fallbackSynth();
      });
  }

  public testSlot(slotId: MemeSlotId): void {
    this.tryPlayCustomSlot(slotId, () => {
      switch (slotId) {
        case 'vine_boom':
          this.playVineBoom();
          break;
        case 'bonk':
          this.playCartoonBonk();
          break;
        case 'sad_trombone':
          this.playSadTrombone();
          break;
        case 'airhorn':
          this.playAirhorn();
          break;
        case 'dun_dun':
          this.playDunDunDun();
          break;
        case 'chubani':
          this.playChubaniSplash();
          break;
        case 'event_kill':
          this.playKillSynth();
          break;
        case 'event_report':
        case 'event_meeting':
          this.playMeetingBellSynth();
          break;
        case 'event_eject':
          this.playChubaniSplash();
          break;
        case 'event_sabotage':
          this.playSadTrombone();
          break;
        case 'event_shield':
          this.playShieldSynth();
          break;
        case 'event_task':
          this.playTaskSynth();
          break;
        case 'event_vent':
          this.playVentSynth();
          break;
        case 'event_win':
          this.playAirhorn();
          break;
        case 'event_loss':
          this.playSadTrombone();
          break;
      }
    });
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 0.8);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playMeme(id: MemeSoundId): void {
    this.tryPlayCustomSlot(id, () => {
      switch (id) {
        case 'vine_boom':
          this.playVineBoom();
          break;
        case 'bonk':
          this.playCartoonBonk();
          break;
        case 'sad_trombone':
          this.playSadTrombone();
          break;
        case 'airhorn':
          this.playAirhorn();
          break;
        case 'dun_dun':
          this.playDunDunDun();
          break;
        case 'chubani':
          this.playChubaniSplash();
          break;
      }
    });
  }

  public playVineBoom(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(125, t);
    sub.frequency.exponentialRampToValueAtTime(32, t + 0.55);
    subGain.gain.setValueAtTime(0.38, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    sub.connect(subGain).connect(ctx.destination);
    sub.start(t);
    sub.stop(t + 0.68);

    const punch = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punch.type = 'triangle';
    punch.frequency.setValueAtTime(210, t);
    punch.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    punchGain.gain.setValueAtTime(0.24, t);
    punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    punch.connect(punchGain).connect(ctx.destination);
    punch.start(t);
    punch.stop(t + 0.2);
  }

  public playCartoonBonk(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const bonk = ctx.createOscillator();
    const bonkGain = ctx.createGain();
    bonk.type = 'triangle';
    bonk.frequency.setValueAtTime(310, t);
    bonk.frequency.exponentialRampToValueAtTime(620, t + 0.045);
    bonk.frequency.exponentialRampToValueAtTime(160, t + 0.16);
    bonkGain.gain.setValueAtTime(0.28, t);
    bonkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    bonk.connect(bonkGain).connect(ctx.destination);
    bonk.start(t);
    bonk.stop(t + 0.2);

    const whistle = ctx.createOscillator();
    const wGain = ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(1180, t + 0.08);
    whistle.frequency.exponentialRampToValueAtTime(340, t + 0.34);
    wGain.gain.setValueAtTime(0.001, t + 0.08);
    wGain.gain.linearRampToValueAtTime(0.12, t + 0.11);
    wGain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    whistle.connect(wGain).connect(ctx.destination);
    whistle.start(t + 0.08);
    whistle.stop(t + 0.38);
  }

  public playSadTrombone(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [
      { f: 311.13, start: 0.0, dur: 0.22 },
      { f: 293.66, start: 0.24, dur: 0.22 },
      { f: 277.18, start: 0.48, dur: 0.22 },
      { f: 261.63, start: 0.72, dur: 0.52 },
    ];
    notes.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, t + n.start);
      if (idx === 3) {
        osc.frequency.linearRampToValueAtTime(n.f - 28, t + n.start + n.dur);
      }
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(980, t + n.start);
      filter.frequency.linearRampToValueAtTime(480, t + n.start + n.dur);
      gain.gain.setValueAtTime(0.001, t + n.start);
      gain.gain.linearRampToValueAtTime(0.13, t + n.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur);
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start(t + n.start);
      osc.stop(t + n.start + n.dur + 0.02);
    });
  }

  public playAirhorn(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const hits = [0.0, 0.14, 0.28];
    hits.forEach((offset, idx) => {
      const dur = idx === 2 ? 0.38 : 0.1;
      [466.16, 587.33, 698.46].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + offset);
        gain.gain.setValueAtTime(0.075, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + dur + 0.02);
      });
    });
  }

  public playDunDunDun(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const beats = [
      { f: 196.0, start: 0.0, dur: 0.16 },
      { f: 196.0, start: 0.19, dur: 0.16 },
      { f: 185.0, start: 0.38, dur: 0.55 },
    ];
    beats.forEach((b) => {
      [b.f, b.f * 1.5, b.f * 2].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, t + b.start);
        gain.gain.setValueAtTime(i === 0 ? 0.14 : 0.08, t + b.start);
        gain.gain.exponentialRampToValueAtTime(0.001, t + b.start + b.dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + b.start);
        osc.stop(t + b.start + b.dur + 0.02);
      });
    });
  }

  public playChubaniSplash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const slip = ctx.createOscillator();
    const slipGain = ctx.createGain();
    slip.type = 'sine';
    slip.frequency.setValueAtTime(980, t);
    slip.frequency.exponentialRampToValueAtTime(190, t + 0.28);
    slipGain.gain.setValueAtTime(0.13, t);
    slipGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    slip.connect(slipGain).connect(ctx.destination);
    slip.start(t);
    slip.stop(t + 0.31);

    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, t + 0.24);
    filter.frequency.exponentialRampToValueAtTime(380, t + 0.72);
    filter.Q.value = 1.1;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, t + 0.24);
    nGain.gain.linearRampToValueAtTime(0.28, t + 0.28);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    src.connect(filter).connect(nGain).connect(ctx.destination);
    src.start(t + 0.24);
    src.stop(t + 0.78);
  }

  public playFootstep(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pitchJitter = 0.9 + Math.random() * 0.2;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(125 * pitchJitter, t);
    osc.frequency.exponentialRampToValueAtTime(48 * pitchJitter, t + 0.055);
    gain.gain.setValueAtTime(0.042, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.065);
  }

  public playRoleReveal(isBatpar: boolean): void {
    if (isBatpar) {
      this.playDunDunDun();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    [340, 510, 680].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.09);
      gain.gain.setValueAtTime(0.12, t + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + idx * 0.09);
      osc.stop(t + idx * 0.09 + 0.3);
    });
  }

  public playDoorSlam(): void {
    this.playVineBoom();
  }

  private playTaskSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      gain.gain.setValueAtTime(0.001, t + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.13, t + idx * 0.06 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.24);
    });
  }

  public playTaskComplete(): void {
    this.tryPlayCustomSlot('event_task', () => this.playTaskSynth());
  }

  private playKillSynth(): void {
    this.playVineBoom();
    setTimeout(() => this.playCartoonBonk(), 90);
  }

  public playKill(): void {
    this.tryPlayCustomSlot('event_kill', () => this.playKillSynth());
  }

  private playMeetingBellSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    [0, 0.2].forEach((offset) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(760, t + offset);
      osc2.frequency.setValueAtTime(1140, t + offset);
      gain.gain.setValueAtTime(0.18, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.36);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + offset);
      osc2.start(t + offset);
      osc.stop(t + offset + 0.38);
      osc2.stop(t + offset + 0.38);
    });
    setTimeout(() => this.playDunDunDun(), 260);
  }

  public playMeetingBell(reason: 'body' | 'emergency' = 'emergency'): void {
    const slotId: MemeSlotId = reason === 'body' ? 'event_report' : 'event_meeting';
    this.tryPlayCustomSlot(slotId, () => this.playMeetingBellSynth());
  }

  public playSabotage(): void {
    this.tryPlayCustomSlot('event_sabotage', () => this.playSadTrombone());
  }

  private playVentSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(640, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.2);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.23);
  }

  public playVent(): void {
    this.tryPlayCustomSlot('event_vent', () => this.playVentSynth());
  }

  public playVoteClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.055);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playEject(): void {
    this.tryPlayCustomSlot('event_eject', () => this.playChubaniSplash());
  }

  private playShieldSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const boing = ctx.createOscillator();
    const bGain = ctx.createGain();
    boing.type = 'sine';
    boing.frequency.setValueAtTime(190, t);
    boing.frequency.exponentialRampToValueAtTime(540, t + 0.12);
    boing.frequency.exponentialRampToValueAtTime(320, t + 0.28);
    bGain.gain.setValueAtTime(0.2, t);
    bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    boing.connect(bGain).connect(ctx.destination);
    boing.start(t);
    boing.stop(t + 0.32);

    [520, 780, 1040].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.04);
      gain.gain.setValueAtTime(0.13, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.27);
    });
  }

  public playShieldBlock(): void {
    this.tryPlayCustomSlot('event_shield', () => this.playShieldSynth());
  }

  public playDisguise(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.16);
    osc.frequency.exponentialRampToValueAtTime(310, t + 0.32);
    gain.gain.setValueAtTime(0.13, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playClueScan(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    [660, 880, 1100].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.07);
      gain.gain.setValueAtTime(0.1, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.17);
    });
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(490, t + 0.12);
    gain.gain.setValueAtTime(0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playLand(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(58, t + 0.08);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playOutcome(win: boolean): void {
    if (win) {
      this.tryPlayCustomSlot('event_win', () => this.playAirhorn());
    } else {
      this.tryPlayCustomSlot('event_loss', () => this.playSadTrombone());
    }
  }
}

export const soundEngine = new SoundEngine();
