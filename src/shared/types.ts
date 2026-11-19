export type GamePhase =
  | 'title'
  | 'lobby'
  | 'role_reveal'
  | 'playing'
  | 'meeting'
  | 'vote_results'
  | 'ejecting'
  | 'paused'
  | 'gameover';

export type PlayerRole = 'parabasi' | 'vondo';

export type SpecialRole =
  | 'none'
  | 'goyenda'
  | 'kobiraj'
  | 'mistri'
  | 'daroga'
  | 'neta'
  | 'daktar'
  | 'bohurupi'
  | 'jharudar'
  | 'pagol';

export interface SpecialRoleMeta {
  id: SpecialRole;
  title: string;
  banglaTitle: string;
  faction: 'parabasi' | 'vondo' | 'neutral';
  accentHex: string;
  abilityLabel: string;
  shortDesc: string;
}

export const SPECIAL_ROLES: Record<SpecialRole, SpecialRoleMeta> = {
  none: {
    id: 'none',
    title: 'Moholla Neighbor',
    banglaTitle: 'পাড়াবাসী',
    faction: 'parabasi',
    accentHex: '#38bdf8',
    abilityLabel: 'Complete Tasks',
    shortDesc: 'Mohollar shob kaaj shesh koro ar Shalish e Batpar ke dhoraye dao!',
  },
  goyenda: {
    id: 'goyenda',
    title: 'Goyenda (CID Mofiz)',
    banglaTitle: 'গোয়েন্দা মফিজ',
    faction: 'parabasi',
    accentHex: '#22d3ee',
    abilityLabel: 'CID Check [G]',
    shortDesc: '3D footprints dekhte pabe ar lash scan kore Batpar er color hint ber korte parbe!',
  },
  kobiraj: {
    id: 'kobiraj',
    title: 'Kobiraj (Tabiz Baba)',
    banglaTitle: 'তাবিজ বাবা',
    faction: 'parabasi',
    accentHex: '#34d399',
    abilityLabel: 'Tabiz Shield [G]',
    shortDesc: 'Neighbor ke golden Tabiz shield poraye daw — 1 bar Gap e neowa theke bachabe!',
  },
  mistri: {
    id: 'mistri',
    title: 'Mistri (Current Babu)',
    banglaTitle: 'মিস্ত্রি বাবু',
    faction: 'parabasi',
    accentHex: '#fbbf24',
    abilityLabel: 'Dren e Dhuko [V]',
    shortDesc: 'Dren diye palay jete parbe ar dur thekei DESCO/Wi-Fi jhamela thik korte parbe!',
  },
  daroga: {
    id: 'daroga',
    title: 'Daroga (Para Sheriff)',
    banglaTitle: 'পাড়া দারোগা',
    faction: 'parabasi',
    accentHex: '#f97316',
    abilityLabel: 'Batpar Arrest [G]',
    shortDesc: 'Asli Batpar ke dhorle ek shot e size! Kintu niraparadh Para-basi ke marle nijei out hobe!',
  },
  neta: {
    id: 'neta',
    title: 'Neta (Moholla Mayor)',
    banglaTitle: 'মহল্লা নেতা',
    faction: 'parabasi',
    accentHex: '#facc15',
    abilityLabel: '2x Vote + Extra Bell',
    shortDesc: 'Shalish e tomar vote 2 ta hisebe count hobe ar extra 1 ta Adda Bell pabe!',
  },
  daktar: {
    id: 'daktar',
    title: 'Daktar (Para Doctor)',
    banglaTitle: 'পাড়া ডাক্তার',
    faction: 'parabasi',
    accentHex: '#2dd4bf',
    abilityLabel: 'Saline Revive [G]',
    shortDesc: 'Match e 1 bar unreported fallen neighbor ke Saline diye live bachaye tulte parbe!',
  },
  bohurupi: {
    id: 'bohurupi',
    title: 'Bohurupi Batpar',
    banglaTitle: 'বহুরূপী বাটপার',
    faction: 'vondo',
    accentHex: '#fb7185',
    abilityLabel: 'Chehara Bodlaw [G]',
    shortDesc: 'Onno Para-basir besh dhore tader ke CCTV te fashaye daw!',
  },
  jharudar: {
    id: 'jharudar',
    title: 'Jharudar (Safai Batpar)',
    banglaTitle: 'সাফাই বাটপার',
    faction: 'vondo',
    accentHex: '#f43f5e',
    abilityLabel: 'Clean Lash [G]',
    shortDesc: 'Size korar por fallen body clean kore gayeb kore dao jeno keu report korte na pare!',
  },
  pagol: {
    id: 'pagol',
    title: 'Pagol (Pagla Baba)',
    banglaTitle: 'পাগলা বাবা',
    faction: 'neutral',
    accentHex: '#c084fc',
    abilityLabel: 'Bait Shalish Votes',
    shortDesc: 'Chaos neutral! Shobai ke shondeho lagao jeno tomake Pukur e chubani dey — taholei WIN!',
  },
};

export type PlayerColorId =
  | 'lal'
  | 'neel'
  | 'shobuj'
  | 'holud'
  | 'beguni'
  | 'komola'
  | 'sada'
  | 'kalo';

export interface PlayerColorSpec {
  id: PlayerColorId;
  label: string;
  banglaName: string;
  hex: string;
  visorTint: string;
}

export const PLAYER_COLORS: PlayerColorSpec[] = [
  { id: 'lal', label: 'Lal Mia', banglaName: 'লাল মিয়া', hex: '#e11d48', visorTint: '#7dd3fc' },
  { id: 'neel', label: 'Neel Babu', banglaName: 'নীল বাবু', hex: '#2563eb', visorTint: '#bae6fd' },
  { id: 'shobuj', label: 'Shobuj Bhai', banglaName: 'সবুজ ভাই', hex: '#16a34a', visorTint: '#a7f3d0' },
  { id: 'holud', label: 'Holud Chacha', banglaName: 'হলুদ চাচা', hex: '#eab308', visorTint: '#fef08a' },
  { id: 'beguni', label: 'Beguni Apa', banglaName: 'বেগুনি আপা', hex: '#9333ea', visorTint: '#e9d5ff' },
  { id: 'komola', label: 'Komola Kaku', banglaName: 'কমলা কাকু', hex: '#ea580c', visorTint: '#fed7aa' },
  { id: 'sada', label: 'Sada Dada', banglaName: 'সাদা দাদা', hex: '#e2e8f0', visorTint: '#38bdf8' },
  { id: 'kalo', label: 'Kalo Ustad', banglaName: 'কালো ওস্তাদ', hex: '#334155', visorTint: '#67e8f9' },
];

export type TaskKind =
  | 'cha_mix'
  | 'fuse_fix'
  | 'rickshaw_pump'
  | 'dish_tune'
  | 'bazar_hisab'
  | 'pukur_check'
  | 'fuchka_serve'
  | 'saloon_trim'
  | 'cricket_tape'
  | 'pharmacy_mix'
  | 'pandal_dj';

export type TaskCategory = 'common' | 'short' | 'long';
export type TaskMedium = 'physical' | 'digital';

export interface TaskStation {
  id: string;
  kind: TaskKind;
  title: string;
  banglaTitle: string;
  zoneName: string;
  x: number;
  z: number;
  radius: number;
  category: TaskCategory;
  medium: TaskMedium;
  holdDurationSec: number;
  isVisual?: boolean;
}

export interface VentNode {
  id: string;
  label: string;
  x: number;
  z: number;
  targetIds: string[];
}

export interface WallAABB {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  zone?: string;
}

export type DoorZoneId = 'cha_dokan' | 'rickshaw_garage' | 'desco_power' | 'dish_roof';

export interface DoorSpec {
  id: string;
  zoneId: DoorZoneId;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export interface ZoneDef {
  id: string;
  name: string;
  banglaName: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  color: string;
}

export interface SecurityCamDef {
  id: string;
  label: string;
  zoneId: string;
  camX: number;
  camZ: number;
  viewCenterX: number;
  viewCenterZ: number;
  viewRadius: number;
}

export interface PlayerTaskState {
  taskId: string;
  completed: boolean;
  isFake?: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  color: PlayerColorId;
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  role: PlayerRole;
  specialRole: SpecialRole;
  alive: boolean;
  inVent: boolean;
  watchingCams: boolean;
  visualTaskTimer: number; // >0 shows 3D scan/steam visual task effect within 6m
  abilityCooldown: number;
  shielded: boolean;
  disguiseColor: PlayerColorId | null;
  disguiseName: string | null;
  disguiseTimer: number;
  isBot: boolean;
  isHost: boolean;
  ready: boolean;
  pingMs?: number;
  tasks: PlayerTaskState[];
  killCooldownRemaining: number;
  emergencyMeetingsLeft: number;
  scansLeft?: number;
  shotsLeft?: number;
  cleansLeft?: number;
  revivesLeft?: number;
  pranksLeft?: number;
  jharuTargetBodyId?: string | null;
  jharuTimer?: number;
  votedFor: string | null; // playerId | 'skip' | null
  hasVoted: boolean;
}

export interface BodyMarker {
  id: string;
  victimId: string;
  victimName: string;
  color: PlayerColorId;
  x: number;
  z: number;
  reported: boolean;
  killedAt: number;
  killerColorHint: string;
  killerZoneHint: string;
}

export interface FootprintDot {
  id: string;
  x: number;
  z: number;
  color: PlayerColorId;
  expiresAt: number;
}

export type SabotageType = 'loadshedding' | 'wifi_down' | 'gas_leak';
export type SabotageSeverity = 'non_critical' | 'critical';

export interface GasValveState {
  id: 'valve_cha' | 'valve_rickshaw';
  label: string;
  zoneName: string;
  x: number;
  z: number;
  holderId: string | null;
}

export interface SabotageState {
  active: SabotageType | null;
  kind: SabotageSeverity | null;
  timeRemaining: number;
  fixStationX: number;
  fixStationZ: number;
  fixProgress: number; // 0..1 progress while holding E at fix station or both gas valves
  fixerId: string | null;
  valves: GasValveState[];
  cooldownRemaining: number;
}

export interface DoorLockState {
  cha_dokan: number; // seconds remaining
  rickshaw_garage: number;
  desco_power: number;
  dish_roof: number;
  cooldownRemaining: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: PlayerColorId;
  text: string;
  timestamp: number;
  system?: boolean;
  ghostOnly?: boolean;
}

export interface EjectionInfo {
  ejectedId: string | null;
  ejectedName: string | null;
  ejectedColor: PlayerColorId | null;
  wasVondo: boolean;
  wasSpecialRole: SpecialRole;
  reason: 'voted' | 'tie' | 'skipped';
  remainingVondos: number;
  confirmEjects: boolean;
}

export interface RoomSettings {
  vondoCount: number;
  killCooldownSec: number;
  meetingTimeSec: number;
  discussionTimeSec: number;
  moveSpeed: number;
  tasksPerPlayer: number;
  emergencyCooldownSec: number;
  emergencyMeetingsPerPlayer: number;
  confirmEjects: boolean;
  anonymousVotes: boolean;
  visualTasks: boolean;
  enableSpecialRoles: boolean;
  enableNeutralRoles: boolean;
  autoFillBots: boolean;
}

export type MatchOutcomeReason =
  | 'pagol_ejected'
  | 'tasks_completed'
  | 'batpars_out'
  | 'batpars_outnumber'
  | 'critical_sabotage_timeout';

export interface MatchOutcome {
  winner: 'parabasi' | 'vondo' | 'pagol';
  reason: MatchOutcomeReason;
  winnerPlayerId?: string;
  winnerPlayerName?: string;
}

export interface RoomSnapshot {
  roomCode: string;
  isSolo?: boolean;
  phase: 'lobby' | 'role_reveal' | 'playing' | 'meeting' | 'vote_results' | 'ejecting' | 'gameover';
  players: PlayerState[];
  bodies: BodyMarker[];
  footprints: FootprintDot[];
  sabotage: SabotageState;
  doorLocks: DoorLockState;
  chat: ChatMessage[];
  lobbyChat?: ChatMessage[];
  lobbyCountdownSec?: number | null;
  hostAbortedReason?: string | null;
  netaRevealedId?: string | null;
  prankedLampUntil?: number;
  meetingCallerId: string | null;
  meetingReason: 'body' | 'emergency' | null;
  meetingTimer: number;
  discussionTimer?: number;
  emergencyCooldownRemaining: number;
  ejection: EjectionInfo | null;
  outcome: MatchOutcome | null;
  settings: RoomSettings;
  taskProgress: number;
  totalTasks: number;
  completedTasks: number;
}

export interface PublicRoomSummary {
  roomCode: string;
  playerCount: number;
  maxPlayers: number;
  phase: string;
  hostName: string;
}

export type ClientMessage =
  | { type: 'room:create'; name: string; color: PlayerColorId }
  | { type: 'room:join'; roomCode: string; name: string; color: PlayerColorId; reconnectToken?: string }
  | { type: 'room:list' }
  | { type: 'lobby:settings'; settings: Partial<RoomSettings> }
  | { type: 'lobby:customize'; name?: string; color?: PlayerColorId }
  | { type: 'lobby:ready'; ready: boolean }
  | { type: 'lobby:kick'; targetPlayerId: string }
  | { type: 'lobby:chat'; text: string }
  | { type: 'lobby:add_bot' }
  | { type: 'lobby:remove_bot'; targetPlayerId?: string }
  | { type: 'lobby:remove_bots' }
  | { type: 'lobby:start' }
  | { type: 'lobby:cancel_start' }
  | { type: 'player:move'; x: number; z: number; vx: number; vz: number; yaw: number }
  | { type: 'player:task_complete'; taskId: string }
  | { type: 'player:visual_task_start'; taskId: string }
  | { type: 'player:kill'; targetId: string }
  | { type: 'player:vent_toggle'; ventId?: string; destinationVentId?: string }
  | { type: 'player:use_ability'; targetId?: string }
  | { type: 'player:sabotage'; sabotageType: SabotageType }
  | { type: 'player:lock_doors'; zoneId: DoorZoneId }
  | { type: 'player:fix_sabotage'; holding?: boolean; valveId?: 'valve_cha' | 'valve_rickshaw' }
  | { type: 'player:watch_cams'; watching: boolean }
  | { type: 'player:report_body'; bodyId: string }
  | { type: 'player:emergency_meeting' }
  | { type: 'meeting:chat'; text: string }
  | { type: 'meeting:vote'; targetId: string | 'skip' }
  | { type: 'player:meme_sfx'; memeId: string }
  | { type: 'room:play_again' }
  | { type: 'room:leave' };

export type ServerMessage =
  | { type: 'room:joined'; playerId: string; snapshot: RoomSnapshot; reconnectToken?: string }
  | { type: 'room:list_result'; rooms: PublicRoomSummary[] }
  | { type: 'room:state'; snapshot: RoomSnapshot }
  | { type: 'room:error'; message: string }
  | { type: 'room:kicked'; message: string }
  | { type: 'clue:result'; title: string; detail: string }
  | { type: 'meme:play'; memeId: string }
  | { type: 'memes:updated'; updatedAt: number }
  | {
      type: 'sfx:event';
      kind:
        | 'kill'
        | 'report'
        | 'meeting'
        | 'sabotage'
        | 'sabotage_critical'
        | 'task'
        | 'eject'
        | 'vent'
        | 'door'
        | 'shield'
        | 'disguise'
        | 'daroga'
        | 'clean'
        | 'revive'
        | 'prank'
        | 'lobby_join'
        | 'lobby_ready'
        | 'lobby_tick'
        | 'lobby_start';
    };

