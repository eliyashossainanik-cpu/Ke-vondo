import { useEffect, useState } from 'react';
import { PLAYER_COLORS, type RoomSnapshot } from '../shared/types';
import { getQuickMemeList, type MemeSoundId } from '../audio/soundEngine';
import { subscribeMemePack } from '../audio/memePackStore';
import { Send, Check, Skull, SkipForward, Volume2, MessageSquareText } from 'lucide-react';

const QUICK_BANGLISH_ALIVE = [
  'Ami innocent bhai!',
  'Ke gap e nilo?',
  'Fuchka Chottor e chilam',
  'Cricket Math e sus dekhsi!',
  'Pukur e chubani dao!',
  'Skip koro, proof nai',
];

const QUICK_BANGLISH_GHOST = [
  'Amake size kore dise re!',
  'Batpar amar piche chilo!',
  'Ghost ra shob dekhtese hehe',
];

export interface MeetingModalProps {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  onSendChat: (text: string) => void;
  onCastVote: (targetId: string | 'skip') => void;
  onPlayMeme?: (memeId: MemeSoundId) => void;
}

export function MeetingModal({
  snapshot,
  localPlayerId,
  onSendChat,
  onCastVote,
  onPlayMeme,
}: MeetingModalProps) {
  const [chatText, setChatText] = useState('');
  const [, setPackVer] = useState(0);
  useEffect(() => subscribeMemePack(() => setPackVer((v) => v + 1)), []);
  const quickMemes = getQuickMemeList();

  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  const caller = snapshot.players.find((p) => p.id === snapshot.meetingCallerId);
  const isVoteResults = snapshot.phase === 'vote_results';
  const canVote = Boolean(!isVoteResults && localPlayer?.alive && !localPlayer?.hasVoted);

  const visibleChat = snapshot.chat.filter((msg) => !msg.ghostOnly || !localPlayer?.alive);
  const quickMsgPool = localPlayer?.alive ? QUICK_BANGLISH_ALIVE : QUICK_BANGLISH_GHOST;
  const skipVoters = isVoteResults
    ? snapshot.players.filter((v) => v.alive && (!v.hasVoted || v.votedFor === 'skip'))
    : [];

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText);
    setChatText('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Emergency Adda Voting"
      className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-6"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.84)' }}
    >
      <div
        className="w-full max-w-5xl rounded-2xl border border-amber-400/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.98)' }}
      >
        {/* Header */}
        <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-amber-300">
              {snapshot.meetingReason === 'body' ? 'Ekjon Size Hoye Gese!' : 'Emergency Shalish Bell'}
              {caller ? ` · Dakse ${caller.name}` : ''}
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              {isVoteResults ? 'ভোটের ফলাফল · Shalish Tally' : 'জরুরি শালিশ · Ke Batpar Bolen?'}
            </h2>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-right">
            <span className="block text-[11px] text-slate-400">
              {isVoteResults ? 'Tallying' : 'Voting Ends'}
            </span>
            <span className="font-mono-tabular text-lg sm:text-xl font-bold text-amber-300">
              {isVoteResults ? 'Final' : `${Math.max(0, Math.ceil(snapshot.meetingTimer))}s`}
            </span>
          </div>
        </header>

        {/* Body: Left Suspect Voting Grid, Right Live Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* Suspect Grid */}
          <div className="lg:col-span-7 p-4 sm:p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {snapshot.players.map((p) => {
                const c = PLAYER_COLORS.find((col) => col.id === p.color) ?? PLAYER_COLORS[0];
                const isSelected = localPlayer?.votedFor === p.id;
                const votersForP = isVoteResults
                  ? snapshot.players.filter((v) => v.alive && v.votedFor === p.id)
                  : [];

                return (
                  <div
                    key={p.id}
                    className={`rounded-xl p-3 border flex flex-col gap-2 ${
                      p.alive
                        ? isSelected
                          ? 'bg-amber-950/60 border-amber-400'
                          : 'bg-slate-900 border-slate-800'
                        : 'bg-slate-950/70 border-slate-900 opacity-55'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-9 h-9 rounded-full shrink-0 border-2 border-white/20 flex items-center justify-center"
                          style={{ backgroundColor: c.hex }}
                        >
                          {!p.alive && <Skull className="w-4 h-4 text-white" />}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-white truncate">{p.name}</span>
                            {p.id === localPlayerId && (
                              <span className="text-[11px] text-amber-300">(You)</span>
                            )}
                            {p.id === localPlayerId && p.specialRole === 'neta' && p.alive && (
                              <span className="px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 text-[10px] font-bold">
                                2x Vote
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {!p.alive ? 'Eliminated' : p.hasVoted ? 'Voted' : 'Thinking...'}
                          </span>
                        </div>
                      </div>

                      {p.alive && !isVoteResults && (
                        <button
                          type="button"
                          disabled={!canVote}
                          onClick={() => onCastVote(p.id)}
                          className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 hover:bg-rose-600 disabled:opacity-40 text-white'
                          }`}
                        >
                          {isSelected ? (
                            <span className="flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Voted
                            </span>
                          ) : (
                            'Vote'
                          )}
                        </button>
                      )}
                    </div>

                    {isVoteResults && votersForP.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                        {votersForP.flatMap((voter) => {
                          const vc = PLAYER_COLORS.find((col) => col.id === voter.color) ?? PLAYER_COLORS[0];
                          const weight = voter.specialRole === 'neta' ? 2 : 1;
                          return Array.from({ length: weight }, (_, pipIdx) => (
                            <span
                              key={`${voter.id}_${pipIdx}`}
                              title={snapshot.settings.anonymousVotes ? 'Anonymous Vote' : voter.name}
                              className="w-4 h-4 rounded-full border border-white/30 inline-block"
                              style={{
                                backgroundColor: snapshot.settings.anonymousVotes ? '#94a3b8' : vc.hex,
                              }}
                            />
                          ));
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              {isVoteResults ? (
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="font-semibold">Skipped Votes:</span>
                  {skipVoters.length === 0 ? (
                    <span className="text-slate-500">None</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      {skipVoters.map((voter) => {
                        const vc = PLAYER_COLORS.find((col) => col.id === voter.color) ?? PLAYER_COLORS[0];
                        return (
                          <span
                            key={voter.id}
                            title={snapshot.settings.anonymousVotes ? 'Anonymous Skip' : voter.name}
                            className="w-4 h-4 rounded-full border border-white/30 inline-block"
                            style={{
                              backgroundColor: snapshot.settings.anonymousVotes ? '#94a3b8' : vc.hex,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span className="text-xs text-slate-400">
                    {localPlayer?.alive
                      ? localPlayer.hasVoted
                        ? 'Vote locked! Waiting for remaining Moholla members.'
                        : 'Pick a suspect or skip this round.'
                      : 'Ghosts cannot vote — ghost chat is visible only to other ghosts.'}
                  </span>
                  <button
                    type="button"
                    disabled={!canVote}
                    onClick={() => onCastVote('skip')}
                    className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      localPlayer?.votedFor === 'skip'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200'
                    }`}
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Kichu Bolbo Na (Skip)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Live Adda Chat */}
          <div className="lg:col-span-5 flex flex-col min-h-[200px] max-h-[320px] lg:max-h-none">
            <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Moholla Adda Chat</span>
              {!localPlayer?.alive && <span className="text-sky-300">Ghost Channel Active</span>}
            </div>
            <div className="flex-1 p-4 space-y-2.5 overflow-y-auto">
              {visibleChat.map((msg) => {
                const c = PLAYER_COLORS.find((col) => col.id === msg.senderColor) ?? PLAYER_COLORS[0];
                return (
                  <div
                    key={msg.id}
                    className={`rounded-xl px-3 py-2 text-xs ${
                      msg.system
                        ? 'bg-amber-950/60 border border-amber-500/30 text-amber-200'
                        : msg.ghostOnly
                        ? 'bg-sky-950/50 border border-sky-500/30 text-sky-100'
                        : 'bg-slate-900 text-slate-200'
                    }`}
                  >
                    {!msg.system && (
                      <div className="flex items-center gap-1.5 font-bold mb-0.5" style={{ color: c.hex }}>
                        <span>{msg.senderName}</span>
                      </div>
                    )}
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick Banglish Chat Chips */}
            <div
              role="region"
              aria-label="Quick Banglish Messages"
              className="px-3 py-2 border-t border-slate-800 bg-slate-900/80 flex items-center gap-1.5 overflow-x-auto"
            >
              <MessageSquareText className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              {quickMsgPool.map((qmsg) => (
                <button
                  key={qmsg}
                  type="button"
                  onClick={() => onSendChat(qmsg)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-400 hover:text-slate-950 text-[11px] font-semibold text-sky-200 whitespace-nowrap transition-colors shrink-0"
                >
                  {qmsg}
                </button>
              ))}
            </div>

            {onPlayMeme && (
              <div className="px-3 py-2 border-t border-slate-800 bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto">
                <Volume2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                {quickMemes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onPlayMeme(m.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-[11px] font-semibold text-amber-200 whitespace-nowrap transition-colors shrink-0"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmitChat} className="p-3 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                maxLength={140}
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder={!localPlayer?.alive ? 'Ghost chat (hidden from living)...' : 'Write accusation in Banglish...'}
                aria-label="Chat message"
                className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
