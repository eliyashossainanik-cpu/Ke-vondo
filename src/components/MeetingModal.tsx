import { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYER_COLORS, type RoomSnapshot } from '../shared/types';
import { QUICK_BANGLISH_ALIVE, QUICK_BANGLISH_GHOST } from '../shared/banglaComedy';
import { getQuickMemeList, type MemeSoundId } from '../audio/soundEngine';
import { subscribeMemePack } from '../audio/memePackStore';
import {
  Check,
  X,
  Send,
  SkipForward,
  Volume2,
  MessageSquareText,
  Megaphone,
  Vote,
  MessageCircle,
  Crown,
} from 'lucide-react';

export interface MeetingModalProps {
  snapshot: RoomSnapshot;
  localPlayerId: string;
  onSendChat: (text: string) => void;
  onCastVote: (targetId: string | 'skip') => void;
  onPlayMeme?: (memeId: MemeSoundId) => void;
}

function ChibiSuspectAvatar({
  hex,
  alive,
  isCaller,
}: {
  hex: string;
  alive: boolean;
  isCaller: boolean;
}) {
  return (
    <div className="relative shrink-0 w-9 h-9 sm:w-10 sm:h-10 [@media(max-height:540px)]:w-8 [@media(max-height:540px)]:h-8">
      <svg viewBox="0 0 48 48" className={`w-full h-full ${alive ? '' : 'opacity-50 grayscale'}`}>
        {/* Backpack */}
        <rect x="3" y="16" width="8" height="18" rx="3.5" fill="#94a3b8" stroke="#0f172a" strokeWidth="2.2" />
        {/* Body */}
        <rect
          x="9"
          y="7"
          width="32"
          height="35"
          rx="15"
          fill={hex}
          stroke={isCaller ? '#fbbf24' : '#0f172a'}
          strokeWidth={isCaller ? '2.8' : '2.2'}
        />
        {alive ? (
          <>
            {/* Glossy Visor */}
            <rect x="20" y="13" width="18" height="11" rx="5.5" fill="#bae6fd" stroke="#0f172a" strokeWidth="2.2" />
            <ellipse cx="32" cy="16.5" rx="3" ry="1.4" fill="#ffffff" />
            {/* Rosy Cheeks */}
            <ellipse cx="18" cy="27" rx="2.6" ry="1.5" fill="#fb7185" opacity="0.85" />
            <ellipse cx="36" cy="27" rx="2.6" ry="1.5" fill="#fb7185" opacity="0.85" />
          </>
        ) : (
          <>
            {/* KO Visor with X eyes */}
            <rect x="20" y="13" width="18" height="11" rx="5.5" fill="#475569" stroke="#0f172a" strokeWidth="2.2" />
            <path d="M24 16 L28 20 M28 16 L24 20 M31 16 L35 20 M35 16 L31 20" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
      </svg>
      {isCaller && alive && (
        <span
          title="Called this Shalish"
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow"
        >
          <Megaphone className="w-2.5 h-2.5" />
        </span>
      )}
    </div>
  );
}

export function MeetingModal({
  snapshot,
  localPlayerId,
  onSendChat,
  onCastVote,
  onPlayMeme,
}: MeetingModalProps) {
  const [chatText, setChatText] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | 'skip' | null>(null);
  const [mobileTab, setMobileTab] = useState<'vote' | 'chat'>('vote');
  const [seenChatCount, setSeenChatCount] = useState(0);
  const [, setPackVer] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => subscribeMemePack(() => setPackVer((v) => v + 1)), []);
  const quickMemes = getQuickMemeList();

  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  const caller = snapshot.players.find((p) => p.id === snapshot.meetingCallerId);
  const isVoteResults = snapshot.phase === 'vote_results';
  const canVote = Boolean(!isVoteResults && localPlayer?.alive && !localPlayer?.hasVoted);

  const visibleChat = useMemo(
    () => snapshot.chat.filter((msg) => !msg.ghostOnly || !localPlayer?.alive),
    [snapshot.chat, localPlayer?.alive],
  );

  useEffect(() => {
    if (mobileTab === 'chat') {
      setSeenChatCount(visibleChat.length);
    }
  }, [mobileTab, visibleChat.length]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [visibleChat.length, mobileTab]);

  useEffect(() => {
    if (!canVote || isVoteResults) {
      setSelectedTargetId(null);
    }
  }, [canVote, isVoteResults]);

  const unreadCount = mobileTab === 'vote' ? Math.max(0, visibleChat.length - seenChatCount) : 0;
  const quickMsgPool = localPlayer?.alive ? QUICK_BANGLISH_ALIVE : QUICK_BANGLISH_GHOST;
  const skipVoters = isVoteResults
    ? snapshot.players.filter((v) => v.alive && (!v.hasVoted || v.votedFor === 'skip'))
    : [];

  const alivePlayers = snapshot.players.filter((p) => p.alive);
  const votedCount = alivePlayers.filter((p) => p.hasVoted).length;

  const sortedPlayers = useMemo(() => {
    return [...snapshot.players].sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      if (a.id === localPlayerId) return -1;
      if (b.id === localPlayerId) return 1;
      return 0;
    });
  }, [snapshot.players, localPlayerId]);

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText);
    setChatText('');
  };

  const confirmVote = (target: string | 'skip') => {
    if (!canVote) return;
    setSelectedTargetId(null);
    onCastVote(target);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Emergency Adda Voting"
      className="fixed inset-0 z-30 flex items-center justify-center p-1.5 sm:p-3 lg:p-5"
      style={{ backgroundColor: 'rgba(5, 9, 17, 0.88)' }}
    >
      <div
        className="w-full max-w-5xl h-[95dvh] sm:h-[92dvh] lg:h-[min(86dvh,720px)] rounded-2xl border border-amber-400/35 shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'rgba(13, 20, 36, 0.99)' }}
      >
        {/* Compact Courtroom Header */}
        <header className="px-3 sm:px-5 py-2 sm:py-3 [@media(max-height:540px)]:py-1.5 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-950/60">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 truncate">
              <span>
                {snapshot.meetingReason === 'body'
                  ? 'Ekjon Size Hoye Gese!'
                  : 'Emergency Shalish Bell'}
              </span>
              {caller && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">Dakse {caller.name}</span>
                </>
              )}
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="hidden sm:inline font-mono-tabular text-slate-300">
                {votedCount}/{alivePlayers.length} Voted
              </span>
            </div>
            <h2 className="font-display text-base sm:text-xl [@media(max-height:540px)]:text-base font-extrabold text-white truncate">
              {isVoteResults
                ? 'ভোটের ফলাফল · Pukur e Ke Jabe?'
                : snapshot.meetingReason === 'body'
                  ? 'লাশ পাওয়া গেছে! কে বাটপার বলো?'
                  : 'জরুরি শালিশ · কে বাটপার ধরো!'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {localPlayer?.specialRole === 'neta' && localPlayer.alive && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-400/15 border border-amber-400/35 text-[11px] font-bold text-amber-300">
                <Crown className="w-3 h-3" /> 2x Vote
              </span>
            )}
            <div className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-right">
              <span className="block text-[10px] text-slate-400 leading-none">
                {isVoteResults ? 'Verdict' : 'Time Left'}
              </span>
              <span className="font-mono-tabular text-base sm:text-xl [@media(max-height:540px)]:text-sm font-extrabold text-amber-300 leading-tight">
                {isVoteResults ? 'LOCKED' : `${Math.max(0, Math.ceil(snapshot.meetingTimer))}s`}
              </span>
            </div>
          </div>
        </header>

        {/* Portrait Mobile (< 640px) Tab Switcher */}
        <div className="sm:hidden px-2.5 pt-2 pb-1.5 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setMobileTab('vote')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                mobileTab === 'vote'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Vote className="w-4 h-4 shrink-0" />
              <span>Shalish Vote</span>
              {canVote && (
                <span className="font-mono-tabular text-[10px] opacity-80">
                  ({votedCount}/{alivePlayers.length})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('chat')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                mobileTab === 'chat'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Adda Chat</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono-tabular text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Body: Split Side-by-Side on >=640px (Landscape Phones & Desktop), Tabbed on Portrait Phones */}
        <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-12 overflow-hidden">
          {/* LEFT: Suspect Voting Roster */}
          <section
            aria-label="Suspect voting list"
            className={`${
              mobileTab === 'vote' ? 'flex' : 'hidden sm:flex'
            } sm:col-span-7 flex-col min-h-0 sm:border-r border-slate-800`}
          >
            <div className="flex-1 min-h-0 p-2.5 sm:p-3.5 [@media(max-height:540px)]:p-2 overflow-y-auto">
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 [@media(max-height:540px)]:gap-1.5">
                {sortedPlayers.map((p) => {
                  const c = PLAYER_COLORS.find((col) => col.id === p.color) ?? PLAYER_COLORS[0];
                  const isSelf = p.id === localPlayerId;
                  const isVotedByMe = localPlayer?.votedFor === p.id;
                  const isSelected = canVote && selectedTargetId === p.id;
                  const isEjectedWinner = isVoteResults && snapshot.ejection?.ejectedId === p.id;
                  const votersForP = isVoteResults
                    ? snapshot.players.filter((v) => v.alive && v.votedFor === p.id)
                    : [];
                  const totalVoteWeight = votersForP.reduce(
                    (acc, voter) => acc + (voter.specialRole === 'neta' ? 2 : 1),
                    0,
                  );

                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border transition-colors ${
                        !p.alive
                          ? 'bg-slate-950/75 border-slate-900 opacity-55'
                          : isEjectedWinner
                            ? 'bg-rose-950/75 border-rose-400'
                            : isVotedByMe
                              ? 'bg-amber-950/65 border-amber-400'
                              : isSelected
                                ? 'bg-slate-800/95 border-amber-400'
                                : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {/* Big Tap-to-Select Suspect Row */}
                      <button
                        type="button"
                        disabled={!p.alive || !canVote}
                        onClick={() => {
                          if (!canVote || !p.alive) return;
                          setSelectedTargetId((prev) => (prev === p.id ? null : p.id));
                        }}
                        aria-label={`Select suspect ${p.name}`}
                        className="w-full min-h-[54px] [@media(max-height:540px)]:min-h-[46px] p-2 sm:p-2.5 [@media(max-height:540px)]:p-1.5 flex items-center justify-between gap-2 text-left disabled:cursor-default active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChibiSuspectAvatar
                            hex={c.hex}
                            alive={p.alive}
                            isCaller={snapshot.meetingCallerId === p.id}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-xs sm:text-sm text-white truncate">
                                {p.name}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-bold text-amber-300 shrink-0">
                                  (You)
                                </span>
                              )}
                            </div>
                            <span className="block text-[11px] text-slate-400 truncate">
                              {!p.alive
                                ? 'Pukur e Chubani Khaise'
                                : isVotedByMe
                                  ? 'Tomar Vote Locked'
                                  : p.hasVoted
                                    ? 'Vote Dise'
                                    : snapshot.meetingCallerId === p.id
                                      ? 'Shalish Dakse!'
                                      : 'Katha boltese...'}
                            </span>
                          </div>
                        </div>

                        {/* Right Status Indicator */}
                        <div className="shrink-0 flex items-center gap-1">
                          {isVotedByMe && (
                            <span className="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-extrabold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> VOTED
                            </span>
                          )}
                          {!isVotedByMe && p.alive && p.hasVoted && !isVoteResults && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-bold">
                              Ready
                            </span>
                          )}
                          {isVoteResults && totalVoteWeight > 0 && (
                            <span className="font-mono-tabular px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-extrabold">
                              {totalVoteWeight}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Selected Target Confirm / Cancel Row (Anti-Mis-Tap) */}
                      {isSelected && (
                        <div className="px-2 pb-2 pt-0.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => confirmVote(p.id)}
                            aria-label={`Confirm vote for ${p.name}`}
                            className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 active:scale-95 text-white font-display font-bold text-xs flex items-center justify-center gap-1 transition-transform whitespace-nowrap"
                          >
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span>Pukur e Felo!</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTargetId(null)}
                            aria-label="Cancel selection"
                            className="min-h-[38px] min-w-[38px] px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Live Vote Tally Pips During vote_results */}
                      {isVoteResults && votersForP.length > 0 && (
                        <div className="px-2.5 pb-2 pt-1 border-t border-slate-800/80 flex flex-wrap items-center gap-1">
                          {votersForP.flatMap((voter) => {
                            const vc =
                              PLAYER_COLORS.find((col) => col.id === voter.color) ?? PLAYER_COLORS[0];
                            const weight = voter.specialRole === 'neta' ? 2 : 1;
                            return Array.from({ length: weight }, (_, pipIdx) => (
                              <span
                                key={`${voter.id}_${pipIdx}`}
                                title={snapshot.settings.anonymousVotes ? 'Anonymous Vote' : voter.name}
                                className="w-4 h-4 rounded-full border border-white/35 inline-block"
                                style={{
                                  backgroundColor: snapshot.settings.anonymousVotes
                                    ? '#94a3b8'
                                    : vc.hex,
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
            </div>

            {/* Bottom Thumb Action Bar (Skip Vote / Tally Status) */}
            <div className="px-2.5 sm:px-3.5 py-2 [@media(max-height:540px)]:py-1.5 border-t border-slate-800 bg-slate-950/75 flex items-center justify-between gap-2 shrink-0">
              {isVoteResults ? (
                <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="font-semibold">Skipped:</span>
                    {skipVoters.length === 0 ? (
                      <span className="text-slate-500">Keu skip kore nai</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {skipVoters.map((voter) => {
                          const vc =
                            PLAYER_COLORS.find((col) => col.id === voter.color) ?? PLAYER_COLORS[0];
                          return (
                            <span
                              key={voter.id}
                              title={snapshot.settings.anonymousVotes ? 'Anonymous Skip' : voter.name}
                              className="w-4 h-4 rounded-full border border-white/30 inline-block"
                              style={{
                                backgroundColor: snapshot.settings.anonymousVotes
                                  ? '#94a3b8'
                                  : vc.hex,
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-amber-300">
                    {snapshot.ejection?.ejectedName
                      ? `${snapshot.ejection.ejectedName} ke Pukur e Chubani!`
                      : snapshot.ejection?.reason === 'tie'
                        ? 'Vote Tai — Keu Pukur e Jabe Na!'
                        : 'Shobai Skip Marlo — Batpar Bachlo!'}
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-[11px] sm:text-xs text-slate-300 truncate">
                    {!localPlayer?.alive
                      ? 'Ghost mode: vote off, chat only.'
                      : localPlayer.hasVoted
                        ? 'Vote locked! Baki Shobar jonno wait...'
                        : 'Suspect tap kore Pukur e Felo, ba Skip maro!'}
                  </span>

                  {selectedTargetId === 'skip' && canVote ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => confirmVote('skip')}
                        className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1 whitespace-nowrap"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirm Skip
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTargetId(null)}
                        aria-label="Cancel skip"
                        className="min-h-[42px] min-w-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canVote}
                      onClick={() => setSelectedTargetId('skip')}
                      className={`min-h-[42px] [@media(max-height:540px)]:min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                        localPlayer?.votedFor === 'skip'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 border border-slate-700'
                      }`}
                    >
                      <SkipForward className="w-3.5 h-3.5 shrink-0" />
                      <span>Kichu Bolbo Na (Skip)</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {/* RIGHT: Live Adda Chat + Quick Roasts + Meme SFX */}
          <section
            aria-label="Moholla Adda Chat"
            className={`${
              mobileTab === 'chat' ? 'flex' : 'hidden sm:flex'
            } sm:col-span-5 flex-col min-h-0 bg-slate-950/35`}
          >
            <div className="px-3 py-2 [@media(max-height:540px)]:py-1.5 border-b border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-between shrink-0">
              <span>Moholla Adda Chat</span>
              {!localPlayer?.alive ? (
                <span className="text-sky-300">Ghost Adda Active</span>
              ) : (
                <span className="text-[11px] text-slate-400">Shobai dekhtese</span>
              )}
            </div>

            <div
              ref={chatScrollRef}
              className="flex-1 min-h-0 p-2.5 sm:p-3 space-y-2 overflow-y-auto"
            >
              {visibleChat.map((msg) => {
                const c = PLAYER_COLORS.find((col) => col.id === msg.senderColor) ?? PLAYER_COLORS[0];
                return (
                  <div
                    key={msg.id}
                    className={`rounded-xl px-2.5 py-1.5 text-xs ${
                      msg.system
                        ? 'bg-amber-950/60 border border-amber-500/30 text-amber-200'
                        : msg.ghostOnly
                          ? 'bg-sky-950/50 border border-sky-500/30 text-sky-100'
                          : 'bg-slate-900 text-slate-200 border border-slate-800/70'
                    }`}
                  >
                    {!msg.system && (
                      <div
                        className="flex items-center gap-1.5 font-bold text-[11px]"
                        style={{ color: c.id === 'kalo' ? '#cbd5e1' : c.hex }}
                      >
                        <span>{msg.senderName}</span>
                      </div>
                    )}
                    <p className="leading-snug">{msg.text}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick Banglish Roasts */}
            <div
              role="region"
              aria-label="Quick Banglish Messages"
              className="px-2.5 py-1.5 border-t border-slate-800 bg-slate-900/80 flex items-center gap-1.5 overflow-x-auto shrink-0"
            >
              <MessageSquareText className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              {quickMsgPool.map((qmsg) => (
                <button
                  key={qmsg}
                  type="button"
                  onClick={() => onSendChat(qmsg)}
                  className="min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-400 hover:text-slate-950 text-[11px] font-semibold text-sky-200 whitespace-nowrap transition-colors shrink-0"
                >
                  {qmsg}
                </button>
              ))}
            </div>

            {onPlayMeme && (
              <div className="px-2.5 py-1.5 border-t border-slate-800 bg-slate-950/70 flex items-center gap-1.5 overflow-x-auto shrink-0">
                <Volume2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                {quickMemes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onPlayMeme(m.id)}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-[11px] font-semibold text-amber-200 whitespace-nowrap transition-colors shrink-0"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSubmitChat}
              className="p-2 sm:p-2.5 border-t border-slate-800 flex items-center gap-1.5 shrink-0"
            >
              <input
                type="text"
                maxLength={140}
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder={
                  !localPlayer?.alive
                    ? 'Ghost chat (hidden from living)...'
                    : 'Banglish e jhogra koro...'
                }
                aria-label="Chat message"
                className="flex-1 min-w-0 min-h-[42px] [@media(max-height:540px)]:min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="min-h-[42px] [@media(max-height:540px)]:min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
