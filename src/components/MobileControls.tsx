import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export interface MobileControlsProps {
  visible: boolean;
  joystickInputRef: React.MutableRefObject<{ x: number; y: number }>;
  onJump?: () => void;
}

const MAX_RADIUS = 38;

export function MobileControls({ visible, joystickInputRef, onJump }: MobileControlsProps) {
  const [sprinting, setSprinting] = useState(false);
  const [isLandscapeCompact, setIsLandscapeCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight <= 540 : false,
  );
  const padRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const setKnobTransform = (ox: number, oy: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
    }
  };

  useEffect(() => {
    const checkViewport = () => {
      setIsLandscapeCompact(window.innerHeight <= 540);
    };
    window.addEventListener('resize', checkViewport);
    window.visualViewport?.addEventListener('resize', checkViewport);
    return () => {
      window.removeEventListener('resize', checkViewport);
      window.visualViewport?.removeEventListener('resize', checkViewport);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      joystickInputRef.current = { x: 0, y: 0 };
      setKnobTransform(0, 0);
      setSprinting(false);
      activePointerIdRef.current = null;
    }
  }, [visible, joystickInputRef]);

  useEffect(() => {
    const resetStick = () => {
      joystickInputRef.current = { x: 0, y: 0 };
      setKnobTransform(0, 0);
      setSprinting(false);
      activePointerIdRef.current = null;
    };
    window.addEventListener('blur', resetStick);
    return () => {
      window.removeEventListener('blur', resetStick);
      joystickInputRef.current = { x: 0, y: 0 };
    };
  }, [joystickInputRef]);

  if (!visible) return null;

  const updateStickFromPointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const ox = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const oy = dist > 0 ? Math.sin(angle) * clampedDist : 0;

    setKnobTransform(ox, oy);

    const norm = clampedDist / MAX_RADIUS;
    if (norm < 0.12) {
      joystickInputRef.current = { x: 0, y: 0 };
      setSprinting((prev) => (prev ? false : prev));
    } else {
      joystickInputRef.current = {
        x: dist > 0 ? Math.cos(angle) * norm : 0,
        y: dist > 0 ? Math.sin(angle) * norm : 0,
      };
      const nextSprint = norm >= 0.85;
      setSprinting((prev) => (prev === nextSprint ? prev : nextSprint));
    }
  };

  return (
    <>
      <div
        className="fixed z-20 pointer-events-auto select-none flex flex-col items-center gap-1"
        style={{
          left: 'max(0.75rem, env(safe-area-inset-left))',
          bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          touchAction: 'none',
        }}
      >
        <div
          ref={padRef}
          role="application"
          aria-label="Virtual movement joystick"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            activePointerIdRef.current = e.pointerId;
            updateStickFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (activePointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            updateStickFromPointer(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (activePointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            activePointerIdRef.current = null;
            setKnobTransform(0, 0);
            setSprinting(false);
            joystickInputRef.current = { x: 0, y: 0 };
          }}
          onPointerCancel={() => {
            activePointerIdRef.current = null;
            setKnobTransform(0, 0);
            setSprinting(false);
            joystickInputRef.current = { x: 0, y: 0 };
          }}
          className={`relative ${
            isLandscapeCompact ? 'w-[98px] h-[98px]' : 'w-[112px] h-[112px] sm:w-[122px] sm:h-[122px]'
          } rounded-full border-2 ${
            sprinting ? 'border-emerald-400/90' : 'border-amber-300/50'
          } flex items-center justify-center shadow-2xl transition-colors`}
          style={{ backgroundColor: 'rgba(12, 18, 30, 0.72)', touchAction: 'none' }}
        >
          {sprinting && (
            <span className="absolute -top-2.5 px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-display text-[8px] font-extrabold tracking-wider pointer-events-none shadow">
              SPRINT
            </span>
          )}
          <div
            className={`${
              isLandscapeCompact ? 'w-[62px] h-[62px]' : 'w-[72px] h-[72px]'
            } rounded-full border border-white/15 pointer-events-none`}
          />
          <div className="w-1.5 h-1.5 rounded-full bg-white/25 pointer-events-none" />
          <div
            ref={knobRef}
            className={`absolute ${
              isLandscapeCompact ? 'w-10 h-10' : 'w-11 h-11 sm:w-12 sm:h-12'
            } rounded-full ${
              sprinting ? 'bg-emerald-400' : 'bg-amber-400'
            } border-2 border-white/90 shadow-lg pointer-events-none will-change-transform`}
            style={{
              transform: 'translate3d(0px, 0px, 0)',
            }}
          />
        </div>
        {!isLandscapeCompact && (
          <span
            className="text-[10px] font-semibold text-slate-300 px-2 py-0.5 rounded-md border border-white/10 max-w-[124px] text-center leading-tight"
            style={{ backgroundColor: 'rgba(12, 18, 30, 0.72)' }}
          >
            Right: 360° · Pinch
          </span>
        )}
      </div>

      {onJump && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onJump();
          }}
          aria-label="Jump"
          className={`fixed z-20 pointer-events-auto select-none ${
            isLandscapeCompact ? 'w-12 h-12 bottom-[4.5rem]' : 'w-14 h-14 bottom-24'
          } rounded-full border-2 border-amber-300/65 flex flex-col items-center justify-center text-amber-200 active:scale-90 transition-transform shadow-2xl`}
          style={{
            right: 'max(0.75rem, env(safe-area-inset-right))',
            backgroundColor: 'rgba(12, 18, 30, 0.84)',
            touchAction: 'none',
          }}
        >
          <ArrowUp className={isLandscapeCompact ? 'w-4 h-4' : 'w-5 h-5'} />
          <span className="text-[8px] sm:text-[9px] font-display font-bold tracking-wider">JUMP</span>
        </button>
      )}
    </>
  );
}
