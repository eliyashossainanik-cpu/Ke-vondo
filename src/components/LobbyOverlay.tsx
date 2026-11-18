import { PLAYER_COLORS, type RoomSettings, type RoomSnapshot } from '../shared/types';
import { Bot, Play, LogOut, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export interface LobbyOverlayProps {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  errorMsg: string | null;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onAddBot: () => void;
  onRemoveBots: () => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
}

export function LobbyOverlay({
  snapshot,
  localPlayerId,
  errorMsg,
  onUpdateSettings,
  onAddBot,
  onRemoveBots,
  onStartMatch,
  onLeaveRoom,
}: LobbyOverlayProps) {
  const [copied, setCopied] = useState(false);
  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  const isHost = Boolean(localPlayer?.isHost);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(snapshot.roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-5 sm:p-8">
      {/* Top Bar: Room Code + Roster Summary */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div
          className="pointer-events-auto rounded-2xl px-5 py-3.5 border border-white/12 flex items-center gap-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
        >
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Moholla Room Code
            </span>
            <span className="font-mono-tabular text-2xl font-bold text-amber-300 tracking-widest">
              {snapshot.roomCode}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Copy room code"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <button
          type="button"
          onClick={onLeaveRoom}
          className="pointer-events-auto px-4 py-2.5 rounded-xl border border-white/12 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
        >
          <LogOut className="w-4 h-4" />
          Leave Room
        </button>
      </div>

      {/* Bottom Dock: Connected Players & Host Controls (keeps center 3D Adda Chowk open!) */}
      <div className="flex flex-col items-center gap-3">
        {errorMsg && (
          <div
            role="alert"
            className="pointer-events-auto px-4 py-2 rounded-xl bg-rose-950 border border-rose-500/40 text-xs text-rose-200"
          >
            {errorMsg}
          </div>
        )}

        <div
          className="pointer-events-auto w-full max-w-3xl rounded-2xl p-4 sm:p-5 border border-white/12 shadow-2xl"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-300">
              Para-basi in Adda ({snapshot.players.length}/8) · WASD Move · Drag 360° &amp; Sky/Ground Look · 1-6 Meme SFX
            </span>
            {isHost && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onAddBot}
                  disabled={snapshot.players.length >= 8}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5 text-amber-300" />
                  Add Bot
                </button>
                {snapshot.players.some((p) => p.isBot) && (
                  <button
                    type="button"
                    onClick={onRemoveBots}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Clear Bots
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {snapshot.players.map((p) => {
              const c = PLAYER_COLORS.find((col) => col.id === p.color) ?? PLAYER_COLORS[0];
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium"
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                  <span className="text-slate-100">{p.name}</span>
                  {p.isHost && <span className="text-amber-300 font-semibold">Host</span>}
                  {p.isBot && <span className="text-slate-400">AI</span>}
                </div>
              );
            })}
          </div>

          {isHost ? (
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-800">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-1.5">
                  <span>Batpars:</span>
                  <select
                    value={snapshot.settings.vondoCount}
                    onChange={(e) => onUpdateSettings({ vondoCount: Number(e.target.value) })}
                    className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value={1}>1 Batpar</option>
                    <option value={2}>2 Batpars</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  <span>Kill CD:</span>
                  <select
                    value={snapshot.settings.killCooldownSec}
                    onChange={(e) => onUpdateSettings({ killCooldownSec: Number(e.target.value) })}
                    className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value={12}>12s</option>
                    <option value={18}>18s</option>
                    <option value={25}>25s</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  <span>Tasks:</span>
                  <select
                    value={snapshot.settings.tasksPerPlayer}
                    onChange={(e) => onUpdateSettings({ tasksPerPlayer: Number(e.target.value) })}
                    className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value={4}>4</option>
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  <span>Shalish:</span>
                  <select
                    value={snapshot.settings.meetingTimeSec}
                    onChange={(e) => onUpdateSettings({ meetingTimeSec: Number(e.target.value) })}
                    className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value={30}>30s</option>
                    <option value={45}>45s</option>
                    <option value={60}>60s</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  <span>Adda Bells:</span>
                  <select
                    value={snapshot.settings.emergencyMeetingsPerPlayer}
                    onChange={(e) =>
                      onUpdateSettings({ emergencyMeetingsPerPlayer: Number(e.target.value) })
                    }
                    className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={snapshot.settings.confirmEjects}
                    onChange={(e) => onUpdateSettings({ confirmEjects: e.target.checked })}
                    className="accent-amber-400 w-4 h-4"
                  />
                  <span>Confirm Ejects</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={snapshot.settings.anonymousVotes}
                    onChange={(e) => onUpdateSettings({ anonymousVotes: e.target.checked })}
                    className="accent-amber-400 w-4 h-4"
                  />
                  <span>Anonymous Votes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={snapshot.settings.visualTasks}
                    onChange={(e) => onUpdateSettings({ visualTasks: e.target.checked })}
                    className="accent-amber-400 w-4 h-4"
                  />
                  <span>Visual Tasks</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={snapshot.settings.enableSpecialRoles}
                    onChange={(e) => onUpdateSettings({ enableSpecialRoles: e.target.checked })}
                    className="accent-amber-400 w-4 h-4"
                  />
                  <span>Special Roles</span>
                </label>
              </div>

              <button
                type="button"
                data-start="true"
                onClick={onStartMatch}
                className="w-full sm:w-auto sm:ml-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Match ({snapshot.players.length}/3+ ready)
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
              Waiting for the Host to start the Moholla match...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
