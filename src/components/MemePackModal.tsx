import { useEffect, useRef, useState } from 'react';
import {
  MEME_SLOTS,
  clearAllClips,
  clearSlotClip,
  exportMemePackJson,
  getLoadedCustomCount,
  getSlotMeta,
  hasCustomClip,
  importMemePackJson,
  matchFilenameToSlot,
  setSlotAudioClip,
  setSlotCustomLabel,
  subscribeMemePack,
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
} from 'lucide-react';

export interface MemePackModalProps {
  onClose: () => void;
}

export function MemePackModal({ onClose }: MemePackModalProps) {
  const [, setVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<'event' | 'quick'>('event');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const importPackRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return subscribeMemePack(() => setVersion((v) => v + 1));
  }, []);

  const customCount = getLoadedCustomCount();
  const visibleSlots = MEME_SLOTS.filter((s) => s.category === activeTab);

  const handleUploadSingle = async (slotId: MemeSlotId, file: File | null) => {
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      await setSlotAudioClip(slotId, file.name, file.type, buf);
      soundEngine.invalidateDecodedSlot(slotId);
      setStatusMsg(`Loaded "${file.name}" into slot!`);
      soundEngine.testSlot(slotId);
    } catch {
      setStatusMsg(`Could not load "${file.name}". Try .mp3, .wav, or .ogg.`);
    }
  };

  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const used = new Set<MemeSlotId>();
    let loaded = 0;
    for (const file of Array.from(files)) {
      const target = matchFilenameToSlot(file.name, used);
      if (!target) break;
      used.add(target);
      const buf = await file.arrayBuffer();
      await setSlotAudioClip(target, file.name, file.type, buf);
      soundEngine.invalidateDecodedSlot(target);
      loaded++;
    }
    setStatusMsg(`Auto-loaded ${loaded} meme audio file${loaded === 1 ? '' : 's'} into your pack!`);
  };

  const handleExportPack = () => {
    if (customCount === 0) {
      setStatusMsg('Upload at least 1 custom audio clip before exporting a pack.');
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
    try {
      const text = await file.text();
      const count = await importMemePackJson(text);
      soundEngine.invalidateDecodedSlot();
      setStatusMsg(`Imported ${count} custom meme clips from "${file.name}"!`);
    } catch {
      setStatusMsg('Invalid meme pack JSON file.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Original Meme Audio Pack Manager"
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-6"
      style={{ backgroundColor: 'rgba(6, 10, 18, 0.86)' }}
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
              <h2 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                Original Bangla Meme Pack Manager
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Upload your own MP3/WAV/OGG meme clips — saved in browser IndexedDB ({customCount}/{MEME_SLOTS.length} custom)
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
              Auto Event Sounds (10)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quick')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'quick' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Quick Soundboard [1-6]
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
                handleBulkUpload(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={importPackRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                handleImportPack(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => bulkInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <FolderUp className="w-3.5 h-3.5" />
              Bulk Auto-Load Audio
            </button>
            <button
              type="button"
              onClick={() => importPackRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5"
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
            {customCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearAllClips().then(() => {
                    soundEngine.invalidateDecodedSlot();
                    setStatusMsg('Reset all slots back to built-in funny sound synths.');
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
            const inputId = `upload_${slot.id}`;

            return (
              <div
                key={slot.id}
                className={`rounded-xl p-3.5 border flex flex-col gap-2.5 ${
                  hasClip
                    ? 'bg-emerald-950/25 border-emerald-500/45'
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
                      hasClip
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {hasClip ? 'Custom Clip' : 'Default Synth'}
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
                      onChange={(e) => setSlotCustomLabel(slot.id, e.target.value)}
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
                      handleUploadSingle(slot.id, e.target.files?.[0] ?? null);
                      e.target.value = '';
                    }}
                  />
                  <label
                    htmlFor={inputId}
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {hasClip ? 'Replace Audio' : 'Upload MP3 / WAV'}
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
                        clearSlotClip(slot.id).then(() => {
                          soundEngine.invalidateDecodedSlot(slot.id);
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
