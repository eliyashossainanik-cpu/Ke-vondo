import { useEffect, useRef, useState } from 'react';
import {
  MEME_SLOTS,
  doesServerRequirePin,
  exportMemePackJson,
  getLoadedCustomCount,
  getRawClipBuffer,
  getServerClipCount,
  getSlotMeta,
  hasCustomClip,
  importMemePackJson,
  isServerClip,
  matchFilenameToSlot,
  subscribeMemePack,
  syncServerMemePack,
  uploadSlotAudioToServer,
  saveSlotLabelToServer,
  deleteSlotAudioFromServer,
  clearAllServerMemes,
  type MemeSlotId,
} from '../audio/memePackStore';
import { soundEngine } from '../audio/soundEngine';
import {
  X,
  Upload,
  Play,
  Trash2,
  Download,
  FolderUp,
  Music2,
  RotateCcw,
  Sparkles,
  Globe,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

export interface MemePackModalProps {
  onClose: () => void;
}

export function MemePackModal({ onClose }: MemePackModalProps) {
  const [, setVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<'event' | 'quick'>('event');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(() => doesServerRequirePin());
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const importPackRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void syncServerMemePack();
    return subscribeMemePack(() => setVersion((v) => v + 1));
  }, []);

  const customCount = getLoadedCustomCount();
  const serverCount = getServerClipCount();
  const requiresPin = doesServerRequirePin();
  const eventCount = MEME_SLOTS.filter((s) => s.category === 'event').length;
  const quickCount = MEME_SLOTS.filter((s) => s.category === 'quick').length;
  const visibleSlots = MEME_SLOTS.filter((s) => s.category === activeTab);

  const handleUploadSingle = async (slotId: MemeSlotId, file: File | null) => {
    if (!file) return;
    setErrorMsg(null);
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const res = await uploadSlotAudioToServer(
        slotId,
        file.name,
        file.type,
        buf,
        undefined,
        adminPin.trim() || undefined,
      );
      soundEngine.invalidateDecodedSlot(slotId);
      if (res.ok) {
        setStatusMsg(`Published "${file.name}" to Server! All players hear it now.`);
      } else {
        setErrorMsg(res.error ?? 'Could not upload to server.');
      }
      soundEngine.testSlot(slotId);
    } catch {
      setErrorMsg(`Could not load "${file.name}". Try .mp3, .wav, or .ogg under 6MB.`);
    } finally {
      setBusy(false);
    }
  };

  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);
    setBusy(true);
    const used = new Set<MemeSlotId>();
    let loaded = 0;
    let failed = 0;
    for (const file of Array.from(files)) {
      const target = matchFilenameToSlot(file.name, used);
      if (!target) break;
      used.add(target);
      try {
        const buf = await file.arrayBuffer();
        const res = await uploadSlotAudioToServer(
          target,
          file.name,
          file.type,
          buf,
          undefined,
          adminPin.trim() || undefined,
        );
        soundEngine.invalidateDecodedSlot(target);
        if (res.ok) loaded++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setBusy(false);
    if (failed > 0 && loaded === 0) {
      setErrorMsg('Server rejected bulk upload (check Admin PIN or 6MB file limit).');
    } else {
      setStatusMsg(
        `Server-published ${loaded} viral Bangla meme clip${loaded === 1 ? '' : 's'}${failed > 0 ? ` (${failed} failed)` : ''}!`,
      );
    }
  };

  const handleExportPack = () => {
    if (customCount === 0) {
      setErrorMsg('Upload at least 1 custom audio clip before exporting a pack.');
      return;
    }
    const json = exportMemePackJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ke-batpar-meme-pack.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatusMsg(`Exported ${customCount} custom meme clips to ke-batpar-meme-pack.json!`);
  };

  const handleImportPack = async (file: File | null) => {
    if (!file) return;
    setErrorMsg(null);
    setBusy(true);
    try {
      const text = await file.text();
      const count = await importMemePackJson(text);
      soundEngine.invalidateDecodedSlot();
      // Push imported clips to server so all multiplayer peers receive them
      let synced = 0;
      for (const s of MEME_SLOTS) {
        const buf = getRawClipBuffer(s.id);
        const meta = getSlotMeta(s.id);
        if (buf && meta) {
          const res = await uploadSlotAudioToServer(
            s.id,
            meta.fileName || `${s.id}.mp3`,
            meta.mimeType || 'audio/mpeg',
            buf,
            meta.customLabel,
            adminPin.trim() || undefined,
          );
          if (res.ok) synced++;
        }
      }
      setStatusMsg(`Imported ${count} clips and synced ${synced} to the live game server!`);
    } catch {
      setErrorMsg('Invalid meme pack JSON file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Server Viral Bangla Meme Admin Panel"
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-6"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.88)' }}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-amber-400/35 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ backgroundColor: 'rgba(12, 19, 32, 0.98)' }}
      >
        {/* Header */}
        <header className="px-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Music2 className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                  Viral Bangla Meme Admin Panel
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/35 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Server Live: {serverCount}/{MEME_SLOTS.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Upload MP3/WAV/OGG once here — auto-syncs to Server so every multiplayer friend hears them!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close meme pack manager"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Toolbar */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2.5">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('event')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'event' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Auto Event Sounds ({eventCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quick')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'quick' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Quick Soundboard ({quickCount})
            </button>
          </div>

          {/* Bulk / Pack Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={bulkInputRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleBulkUpload(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={importPackRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                void handleImportPack(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              disabled={busy}
              onClick={() => bulkInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <FolderUp className="w-3.5 h-3.5" />
              Bulk Upload Audio
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => importPackRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Import .JSON
            </button>
            <button
              type="button"
              onClick={handleExportPack}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Pack
            </button>
            <button
              type="button"
              onClick={() => {
                void syncServerMemePack().then(() => {
                  soundEngine.invalidateDecodedSlot();
                  setStatusMsg('Synced latest meme pack from game server!');
                });
              }}
              aria-label="Sync from Server"
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync
            </button>
            <button
              type="button"
              onClick={() => setShowPinInput((v) => !v)}
              className={`px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1 ${
                requiresPin || adminPin
                  ? 'bg-amber-950/70 border-amber-500/40 text-amber-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              PIN
            </button>
            {customCount > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setErrorMsg(null);
                  void clearAllServerMemes(adminPin.trim() || undefined).then((res) => {
                    soundEngine.invalidateDecodedSlot();
                    if (res.ok) {
                      setStatusMsg('Reset all server & browser slots back to built-in synths.');
                    } else {
                      setErrorMsg(res.error ?? 'Failed to clear server slots.');
                    }
                  });
                }}
                className="px-2.5 py-2 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-rose-500/35 text-rose-200 font-semibold text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {(showPinInput || requiresPin) && (
          <div className="px-4 sm:px-6 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <label htmlFor="meme-admin-pin" className="font-semibold text-amber-200 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              Admin Passcode{requiresPin ? ' (Required by Server):' : ' (Optional if ADMIN_PASSCODE unset):'}
            </label>
            <input
              id="meme-admin-pin"
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="Enter admin passcode..."
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        )}

        {errorMsg && (
          <div role="alert" className="px-4 sm:px-6 py-2 bg-rose-950/80 border-b border-rose-500/40 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {statusMsg && (
          <div className="px-4 sm:px-6 py-2 bg-amber-950/50 border-b border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Slot List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleSlots.map((slot) => {
            const meta = getSlotMeta(slot.id);
            const hasClip = hasCustomClip(slot.id);
            const onServer = isServerClip(slot.id);
            const inputId = `upload_${slot.id}`;

            return (
              <div
                key={slot.id}
                className={`rounded-xl p-3.5 border flex flex-col gap-2.5 ${
                  onServer
                    ? 'bg-emerald-950/25 border-emerald-500/45'
                    : hasClip
                      ? 'bg-sky-950/25 border-sky-500/40'
                      : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {slot.shortKey && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono-tabular text-[11px] font-bold">
                          [{slot.shortKey}]
                        </span>
                      )}
                      <h3 className="font-display text-sm font-bold text-white truncate">
                        {slot.defaultLabel}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{slot.banglaHint}</p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      onServer
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : hasClip
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                          : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {onServer ? 'Server Live' : hasClip ? 'Local Clip' : 'Default Synth'}
                  </span>
                </div>

                {slot.category === 'quick' && (
                  <div className="flex items-center gap-2">
                    <label htmlFor={`label_${slot.id}`} className="text-[11px] text-slate-400 shrink-0">
                      Button Text:
                    </label>
                    <input
                      id={`label_${slot.id}`}
                      type="text"
                      maxLength={22}
                      value={meta?.customLabel ?? ''}
                      placeholder={slot.defaultLabel}
                      onChange={(e) => {
                        void saveSlotLabelToServer(
                          slot.id,
                          e.target.value,
                          adminPin.trim() || undefined,
                        );
                      }}
                      className="flex-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                {hasClip && meta?.fileName && (
                  <div className="text-[11px] text-emerald-300 font-mono-tabular truncate bg-slate-950/70 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    File: {meta.fileName}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    id={inputId}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleUploadSingle(slot.id, e.target.files?.[0] ?? null);
                      e.target.value = '';
                    }}
                  />
                  <label
                    htmlFor={inputId}
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {hasClip ? 'Replace Server Audio' : 'Upload to Server'}
                  </label>

                  <button
                    type="button"
                    onClick={() => soundEngine.testSlot(slot.id)}
                    aria-label={`Test ${slot.defaultLabel}`}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Test
                  </button>

                  {hasClip && (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        void deleteSlotAudioFromServer(slot.id, adminPin.trim() || undefined).then((res) => {
                          soundEngine.invalidateDecodedSlot(slot.id);
                          if (!res.ok && res.error) setErrorMsg(res.error);
                        });
                      }}
                      aria-label={`Reset ${slot.defaultLabel}`}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
