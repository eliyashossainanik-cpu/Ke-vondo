import type {
  DoorLockState,
  DoorSpec,
  SabotageType,
  SecurityCamDef,
  TaskStation,
  VentNode,
  WallAABB,
  ZoneDef,
} from './types';

export const MAP_HALF_SIZE = 80;
export const PLAYER_RADIUS = 0.55;

export const ZONES: ZoneDef[] = [
  // Core 9 Inner Moholla Districts
  {
    id: 'adda_chowk',
    name: 'Adda Chowk',
    banglaName: 'আড্ডা চক',
    x: 0,
    z: 0,
    width: 18,
    depth: 18,
    color: '#334155',
  },
  {
    id: 'cha_dokan',
    name: 'Cha-er Dokan',
    banglaName: 'চায়ের দোকান',
    x: -35,
    z: -32,
    width: 18,
    depth: 17,
    color: '#78350f',
  },
  {
    id: 'rickshaw_garage',
    name: 'Rickshaw Stand',
    banglaName: 'রিকশা গ্যারেজ',
    x: 35,
    z: -32,
    width: 18,
    depth: 17,
    color: '#065f46',
  },
  {
    id: 'desco_power',
    name: 'DESCO Powerhouse',
    banglaName: 'লোডশেডিং ঘর',
    x: -35,
    z: 32,
    width: 18,
    depth: 17,
    color: '#7f1d1d',
  },
  {
    id: 'dish_roof',
    name: 'Dish Cable Hub',
    banglaName: 'ডিশ কন্ট্রোল',
    x: 35,
    z: 32,
    width: 18,
    depth: 17,
    color: '#1e3a8a',
  },
  {
    id: 'pukur_ghat',
    name: 'Pukur Ghat',
    banglaName: 'পুকুর ঘাট',
    x: -40,
    z: 0,
    width: 18,
    depth: 18,
    color: '#0e7490',
  },
  {
    id: 'bazar_stall',
    name: 'Moholla Bazar',
    banglaName: 'মহল্লা বাজার',
    x: 40,
    z: 0,
    width: 18,
    depth: 18,
    color: '#9a3412',
  },
  {
    id: 'eidgah_north',
    name: 'Eidgah Maidan',
    banglaName: 'ঈদগাহ মাঠ',
    x: 0,
    z: -37,
    width: 20,
    depth: 15,
    color: '#064e3b',
  },
  {
    id: 'south_tank',
    name: 'WASA Water Tower',
    banglaName: 'পানির ট্যাংক',
    x: 0,
    z: 37,
    width: 20,
    depth: 15,
    color: '#1e293b',
  },

  // 5 Brand-New Outer Moholla Districts (160m × 160m expansion)
  {
    id: 'fuchka_corner',
    name: 'Fuchka Chottor',
    banglaName: 'ফুচকা চত্বর',
    x: 0,
    z: -66,
    width: 24,
    depth: 15,
    color: '#b45309',
  },
  {
    id: 'saloon_goli',
    name: 'Hero Saloon',
    banglaName: 'হিরো সেলুন',
    x: -66,
    z: -26,
    width: 18,
    depth: 18,
    color: '#9d174d',
  },
  {
    id: 'cricket_math',
    name: 'Para Cricket Math',
    banglaName: 'ক্রিকেট মাঠ',
    x: 66,
    z: -26,
    width: 18,
    depth: 22,
    color: '#15803d',
  },
  {
    id: 'pharmacy_mor',
    name: 'Dadu Pharmacy',
    banglaName: 'দাদু ফার্মেসি',
    x: -66,
    z: 26,
    width: 18,
    depth: 18,
    color: '#0369a1',
  },
  {
    id: 'biyer_pandal',
    name: 'Biyer Bari Pandal',
    banglaName: 'বিয়ে বাড়ি প্যান্ডেল',
    x: 66,
    z: 26,
    width: 18,
    depth: 22,
    color: '#be123c',
  },
];

export const WALLS: WallAABB[] = [
  // Expanded 160m × 160m Outer Brick Compound Perimeter Walls
  { id: 'outer_n', minX: -80, maxX: 80, minZ: -80, maxZ: -78.2, height: 3.4 },
  { id: 'outer_s', minX: -80, maxX: 80, minZ: 78.2, maxZ: 80, height: 3.4 },
  { id: 'outer_w', minX: -80, maxX: -78.2, minZ: -80, maxZ: 80, height: 3.4 },
  { id: 'outer_e', minX: 78.2, maxX: 80, minZ: -80, maxZ: 80, height: 3.4 },

  { id: 'adda_table', minX: -2.0, maxX: 2.0, minZ: -2.0, maxZ: 2.0, height: 1.2, zone: 'adda_chowk' },

  // Sightline-breaking Moholla Alley Walls (ambush pockets, flanks, and blind corners)
  { id: 'alley_nw', minX: -17.5, maxX: -15.5, minZ: -20.5, maxZ: -9.5, height: 2.7 },
  { id: 'alley_ne', minX: 15.5, maxX: 17.5, minZ: -20.5, maxZ: -9.5, height: 2.7 },
  { id: 'alley_sw', minX: -17.5, maxX: -15.5, minZ: 9.5, maxZ: 20.5, height: 2.7 },
  { id: 'alley_se', minX: 15.5, maxX: 17.5, minZ: 9.5, maxZ: 20.5, height: 2.7 },
  { id: 'lane_nw', minX: -22.0, maxX: -12.5, minZ: -35.5, maxZ: -33.8, height: 2.7 },
  { id: 'lane_ne', minX: 12.5, maxX: 22.0, minZ: -35.5, maxZ: -33.8, height: 2.7 },
  { id: 'lane_sw', minX: -22.0, maxX: -12.5, minZ: 33.8, maxZ: 35.5, height: 2.7 },
  { id: 'lane_se', minX: 12.5, maxX: 22.0, minZ: 33.8, maxZ: 35.5, height: 2.7 },

  // Cha-er Dokan (NW)
  { id: 'cha_n_wall', minX: -45.0, maxX: -25.0, minZ: -41.0, maxZ: -40.1, height: 3.0, zone: 'cha_dokan' },
  { id: 'cha_w_wall', minX: -45.0, maxX: -44.1, minZ: -41.0, maxZ: -22.5, height: 3.0, zone: 'cha_dokan' },
  { id: 'cha_e_wall', minX: -25.9, maxX: -25.0, minZ: -41.0, maxZ: -22.5, height: 3.0, zone: 'cha_dokan' },
  { id: 'cha_s_stub', minX: -45.0, maxX: -36.5, minZ: -23.4, maxZ: -22.5, height: 3.0, zone: 'cha_dokan' },
  { id: 'cha_counter', minX: -39.5, maxX: -31.5, minZ: -37.2, maxZ: -35.2, height: 1.15, zone: 'cha_dokan' },

  // Rickshaw Garage (NE)
  { id: 'rick_n_wall', minX: 25.0, maxX: 45.0, minZ: -41.0, maxZ: -40.1, height: 3.0, zone: 'rickshaw_garage' },
  { id: 'rick_e_wall', minX: 44.1, maxX: 45.0, minZ: -41.0, maxZ: -22.5, height: 3.0, zone: 'rickshaw_garage' },
  { id: 'rick_w_wall', minX: 25.0, maxX: 25.9, minZ: -41.0, maxZ: -22.5, height: 3.0, zone: 'rickshaw_garage' },
  { id: 'rick_s_stub', minX: 36.5, maxX: 45.0, minZ: -23.4, maxZ: -22.5, height: 3.0, zone: 'rickshaw_garage' },

  // DESCO Powerhouse (SW)
  { id: 'desco_s_wall', minX: -45.0, maxX: -25.0, minZ: 40.1, maxZ: 41.0, height: 3.0, zone: 'desco_power' },
  { id: 'desco_w_wall', minX: -45.0, maxX: -44.1, minZ: 22.5, maxZ: 41.0, height: 3.0, zone: 'desco_power' },
  { id: 'desco_e_wall', minX: -25.9, maxX: -25.0, minZ: 22.5, maxZ: 41.0, height: 3.0, zone: 'desco_power' },
  { id: 'desco_n_stub', minX: -45.0, maxX: -36.5, minZ: 22.5, maxZ: 23.4, height: 3.0, zone: 'desco_power' },
  { id: 'desco_gen', minX: -40.5, maxX: -36.0, minZ: 30.5, maxZ: 34.8, height: 2.1, zone: 'desco_power' },

  // Dish Cable Hub (SE)
  { id: 'dish_s_wall', minX: 25.0, maxX: 45.0, minZ: 40.1, maxZ: 41.0, height: 3.0, zone: 'dish_roof' },
  { id: 'dish_e_wall', minX: 44.1, maxX: 45.0, minZ: 22.5, maxZ: 41.0, height: 3.0, zone: 'dish_roof' },
  { id: 'dish_w_wall', minX: 25.0, maxX: 25.9, minZ: 22.5, maxZ: 41.0, height: 3.0, zone: 'dish_roof' },
  { id: 'dish_n_stub', minX: 36.5, maxX: 45.0, minZ: 22.5, maxZ: 23.4, height: 3.0, zone: 'dish_roof' },
  { id: 'dish_desk', minX: 32.5, maxX: 37.5, minZ: 33.2, maxZ: 35.8, height: 1.15, zone: 'dish_roof' },

  // Pukur Water (West)
  { id: 'pukur_water', minX: -51.0, maxX: -42.0, minZ: -8.0, maxZ: 8.0, height: 0.4, zone: 'pukur_ghat' },

  // Bazar Counter (East)
  { id: 'bazar_counter', minX: 42.5, maxX: 46.5, minZ: -5.0, maxZ: 5.0, height: 1.2, zone: 'bazar_stall' },

  // South WASA Water Tower Core
  { id: 'tank_core', minX: -2.4, maxX: 2.4, minZ: 36.5, maxZ: 41.5, height: 4.5, zone: 'south_tank' },

  // Parked Green CNG Auto-Rickshaw along South-East Avenue
  { id: 'cng_parked', minX: 10.0, maxX: 12.0, minZ: 21.4, maxZ: 24.6, height: 1.9 },

  // Tactical Supply Crate & Drum Clusters + Perimeter Sandbag Barricades
  { id: 'supply_rickshaw', minX: 39.8, maxX: 42.8, minZ: -38.4, maxZ: -36.0, height: 1.85, zone: 'rickshaw_garage' },
  { id: 'supply_desco', minX: -43.0, maxX: -39.8, minZ: 36.4, maxZ: 38.8, height: 1.85, zone: 'desco_power' },
  { id: 'supply_dish', minX: 39.8, maxX: 42.8, minZ: 25.0, maxZ: 27.4, height: 1.85, zone: 'dish_roof' },
  { id: 'supply_bazar', minX: 41.8, maxX: 44.8, minZ: 7.0, maxZ: 9.4, height: 1.85, zone: 'bazar_stall' },
  { id: 'barricade_nw', minX: -16.0, maxX: -11.4, minZ: -46.0, maxZ: -44.4, height: 1.1 },
  { id: 'barricade_ne', minX: 11.4, maxX: 16.0, minZ: -46.0, maxZ: -44.4, height: 1.1 },
  { id: 'barricade_sw', minX: -14.0, maxX: -9.4, minZ: 44.4, maxZ: 46.0, height: 1.1 },
  { id: 'barricade_se', minX: 9.4, maxX: 14.0, minZ: 44.4, maxZ: 46.0, height: 1.1 },

  // --- New Outer Moholla Buildings & Landmarks ---
  // 1. Fuchka Chottor (Far North)
  { id: 'fuchka_cart', minX: -2.6, maxX: 2.6, minZ: -69.5, maxZ: -66.5, height: 2.3, zone: 'fuchka_corner' },
  { id: 'supply_fuchka', minX: 7.6, maxX: 10.6, minZ: -71.4, maxZ: -69.0, height: 1.85, zone: 'fuchka_corner' },

  // 2. Hero Saloon (Far NW) — open East doorway z: -29.5 .. -22.5
  { id: 'saloon_w_wall', minX: -75.0, maxX: -74.1, minZ: -35.0, maxZ: -17.0, height: 3.1, zone: 'saloon_goli' },
  { id: 'saloon_n_wall', minX: -75.0, maxX: -57.0, minZ: -35.0, maxZ: -34.1, height: 3.1, zone: 'saloon_goli' },
  { id: 'saloon_s_wall', minX: -75.0, maxX: -57.0, minZ: -17.9, maxZ: -17.0, height: 3.1, zone: 'saloon_goli' },
  { id: 'saloon_e_n', minX: -57.9, maxX: -57.0, minZ: -35.0, maxZ: -29.5, height: 3.1, zone: 'saloon_goli' },
  { id: 'saloon_e_s', minX: -57.9, maxX: -57.0, minZ: -22.5, maxZ: -17.0, height: 3.1, zone: 'saloon_goli' },
  { id: 'saloon_counter', minX: -73.8, maxX: -71.8, minZ: -32.0, maxZ: -20.0, height: 1.15, zone: 'saloon_goli' },

  // 3. Para Cricket Math (Far NE)
  { id: 'cricket_dugout', minX: 72.2, maxX: 74.2, minZ: -30.5, maxZ: -21.5, height: 1.3, zone: 'cricket_math' },

  // 4. Dadu Pharmacy (Far SW) — open East doorway z: 22.5 .. 29.5
  { id: 'pharm_w_wall', minX: -75.0, maxX: -74.1, minZ: 17.0, maxZ: 35.0, height: 3.1, zone: 'pharmacy_mor' },
  { id: 'pharm_n_wall', minX: -75.0, maxX: -57.0, minZ: 17.0, maxZ: 17.9, height: 3.1, zone: 'pharmacy_mor' },
  { id: 'pharm_s_wall', minX: -75.0, maxX: -57.0, minZ: 34.1, maxZ: 35.0, height: 3.1, zone: 'pharmacy_mor' },
  { id: 'pharm_e_n', minX: -57.9, maxX: -57.0, minZ: 17.0, maxZ: 22.5, height: 3.1, zone: 'pharmacy_mor' },
  { id: 'pharm_e_s', minX: -57.9, maxX: -57.0, minZ: 29.5, maxZ: 35.0, height: 3.1, zone: 'pharmacy_mor' },
  { id: 'pharm_counter', minX: -73.8, maxX: -71.6, minZ: 20.0, maxZ: 32.0, height: 1.2, zone: 'pharmacy_mor' },

  // 5. Biyer Bari Pandal (Far SE)
  { id: 'pandal_stage', minX: 70.5, maxX: 74.2, minZ: 22.5, maxZ: 29.5, height: 1.4, zone: 'biyer_pandal' },
  { id: 'supply_pandal', minX: 60.5, maxX: 63.5, minZ: 33.0, maxZ: 35.4, height: 1.85, zone: 'biyer_pandal' },

  // Outer Ring Sightline Dividers & South Rail Gate Cabins
  { id: 'outer_alley_nw', minX: -32.0, maxX: -29.8, minZ: -64.0, maxZ: -56.5, height: 2.7 },
  { id: 'outer_alley_ne', minX: 29.8, maxX: 32.0, minZ: -64.0, maxZ: -56.5, height: 2.7 },
  { id: 'outer_alley_sw', minX: -32.0, maxX: -29.8, minZ: 56.5, maxZ: 64.0, height: 2.7 },
  { id: 'outer_alley_se', minX: 29.8, maxX: 32.0, minZ: 56.5, maxZ: 64.0, height: 2.7 },
  { id: 'rail_cabin_w', minX: -12.0, maxX: -8.2, minZ: 66.2, maxZ: 69.8, height: 2.8 },
  { id: 'rail_cabin_e', minX: 8.2, maxX: 12.0, minZ: 66.2, maxZ: 69.8, height: 2.8 },
];

// Rolling Tin Shutters across building doorways when Vondo triggers Door Lock Sabotage
export const DOORS: DoorSpec[] = [
  {
    id: 'door_cha_s',
    zoneId: 'cha_dokan',
    label: 'Cha-er Dokan Shutter',
    minX: -36.5,
    maxX: -25.9,
    minZ: -23.4,
    maxZ: -22.5,
    height: 2.9,
  },
  {
    id: 'door_rick_s',
    zoneId: 'rickshaw_garage',
    label: 'Rickshaw Garage Shutter',
    minX: 25.9,
    maxX: 36.5,
    minZ: -23.4,
    maxZ: -22.5,
    height: 2.9,
  },
  {
    id: 'door_desco_n',
    zoneId: 'desco_power',
    label: 'DESCO Shutter',
    minX: -36.5,
    maxX: -25.9,
    minZ: 22.5,
    maxZ: 23.4,
    height: 2.9,
  },
  {
    id: 'door_dish_n',
    zoneId: 'dish_roof',
    label: 'Dish Hub Shutter',
    minX: 25.9,
    maxX: 36.5,
    minZ: 22.5,
    maxZ: 23.4,
    height: 2.9,
  },
];

export const TASK_STATIONS: TaskStation[] = [
  {
    id: 'task_cha',
    kind: 'cha_mix',
    title: 'Brew Dudh-Cha',
    banglaTitle: 'দুধ-চা বানানো',
    zoneName: 'Cha-er Dokan',
    x: -35.5,
    z: -32.2,
    radius: 2.8,
    isVisual: true,
  },
  {
    id: 'task_rickshaw',
    kind: 'rickshaw_pump',
    title: 'Pump Rickshaw Tire',
    banglaTitle: 'রিকশার চাকা পাম্প',
    zoneName: 'Rickshaw Stand',
    x: 32.5,
    z: -29.5,
    radius: 2.8,
  },
  {
    id: 'task_desco',
    kind: 'fuse_fix',
    title: 'Fix DESCO Fuse',
    banglaTitle: 'ফিউজ ঠিক করা',
    zoneName: 'DESCO Powerhouse',
    x: -31.2,
    z: 32.5,
    radius: 2.8,
  },
  {
    id: 'task_dish',
    kind: 'dish_tune',
    title: 'Tune Dish Antenna',
    banglaTitle: 'ডিশ সিগন্যাল সেট',
    zoneName: 'Dish Cable Hub',
    x: 34.5,
    z: 29.0,
    radius: 2.8,
  },
  {
    id: 'task_pukur',
    kind: 'pukur_check',
    title: 'Pukur Med-Scan',
    banglaTitle: 'পুকুর পানি ও স্ক্যান',
    zoneName: 'Pukur Ghat',
    x: -37.5,
    z: 0,
    radius: 2.9,
    isVisual: true,
  },
  {
    id: 'task_bazar',
    kind: 'bazar_hisab',
    title: 'Verify Bazar Hisab',
    banglaTitle: 'বাজারের হিসাব',
    zoneName: 'Moholla Bazar',
    x: 38.5,
    z: 0,
    radius: 2.8,
  },
  {
    id: 'task_eidgah',
    kind: 'fuse_fix',
    title: 'Light Eidgah Lamps',
    banglaTitle: 'ঈদগাহর বাতি জ্বালানো',
    zoneName: 'Eidgah Maidan',
    x: 0,
    z: -37.0,
    radius: 2.8,
  },
  {
    id: 'task_wasa',
    kind: 'rickshaw_pump',
    title: 'Pressurize WASA Tank',
    banglaTitle: 'পানির ট্যাংক পাম্প',
    zoneName: 'WASA Water Tower',
    x: 0,
    z: 32.5,
    radius: 2.8,
  },
  // 5 New Tasks in the Expanded Outer Moholla Locations
  {
    id: 'task_fuchka',
    kind: 'fuchka_serve',
    title: 'Serve Spicy Fuchka',
    banglaTitle: 'ঝাল ফুচকা বানানো',
    zoneName: 'Fuchka Chottor',
    x: 0,
    z: -63.8,
    radius: 3.1,
  },
  {
    id: 'task_saloon',
    kind: 'saloon_trim',
    title: 'Hero Haircut & Perfume',
    banglaTitle: 'হিরো চুল কাটা',
    zoneName: 'Hero Saloon',
    x: -65.5,
    z: -26.0,
    radius: 3.1,
  },
  {
    id: 'task_cricket',
    kind: 'cricket_tape',
    title: 'Wrap Tape Tennis Ball',
    banglaTitle: 'টেপ টেনিস বল রেডি',
    zoneName: 'Para Cricket Math',
    x: 65.5,
    z: -26.0,
    radius: 3.2,
  },
  {
    id: 'task_pharmacy',
    kind: 'pharmacy_mix',
    title: 'Mix Napa & Saline',
    banglaTitle: 'ওরাল স্যালাইন ও নাপা',
    zoneName: 'Dadu Pharmacy',
    x: -65.5,
    z: 26.0,
    radius: 3.1,
  },
  {
    id: 'task_pandal',
    kind: 'pandal_dj',
    title: 'Drop Biyer DJ Beat',
    banglaTitle: 'বিয়ে বাড়ির ডিজে বাজাও',
    zoneName: 'Biyer Bari Pandal',
    x: 64.0,
    z: 26.0,
    radius: 3.2,
    isVisual: true,
  },
];

// Official Among Us Utility Stations: Security Cams, Admin Radar Table, Vitals ECG Monitor
export const SECURITY_CAMS_POS = { x: 35.0, z: 38.0, radius: 2.8, label: 'Security CCTV [E]' };
export const ADMIN_TABLE_POS = { x: 36.5, z: -6.5, radius: 2.8, label: 'Admin Para Map [E]' };
export const VITALS_POS = { x: -36.5, z: 6.5, radius: 2.8, label: 'Para Vitals ECG [E]' };

export const SECURITY_CAMERAS: SecurityCamDef[] = [
  {
    id: 'cam_adda',
    label: 'CAM 01 · Adda Chowk',
    zoneId: 'adda_chowk',
    camX: -9.2,
    camZ: -9.2,
    viewCenterX: 0,
    viewCenterZ: 0,
    viewRadius: 13.5,
  },
  {
    id: 'cam_cha',
    label: 'CAM 02 · NW Cha & Alley',
    zoneId: 'cha_dokan',
    camX: -20.5,
    camZ: -20.5,
    viewCenterX: -29,
    viewCenterZ: -24,
    viewRadius: 13.0,
  },
  {
    id: 'cam_rickshaw',
    label: 'CAM 03 · NE Rickshaw Lane',
    zoneId: 'rickshaw_garage',
    camX: 20.5,
    camZ: -20.5,
    viewCenterX: 29,
    viewCenterZ: -24,
    viewRadius: 13.0,
  },
  {
    id: 'cam_desco',
    label: 'CAM 04 · SW DESCO Gate',
    zoneId: 'desco_power',
    camX: -20.5,
    camZ: 20.5,
    viewCenterX: -29,
    viewCenterZ: 24,
    viewRadius: 13.0,
  },
  {
    id: 'cam_dish',
    label: 'CAM 05 · SE Dish Road',
    zoneId: 'dish_roof',
    camX: 20.5,
    camZ: 20.5,
    viewCenterX: 29,
    viewCenterZ: 24,
    viewRadius: 13.0,
  },
  {
    id: 'cam_bazar',
    label: 'CAM 06 · East Bazar Crossing',
    zoneId: 'bazar_stall',
    camX: 24.0,
    camZ: -6.0,
    viewCenterX: 35,
    viewCenterZ: 0,
    viewRadius: 13.0,
  },
  {
    id: 'cam_fuchka',
    label: 'CAM 07 · North Fuchka Chottor',
    zoneId: 'fuchka_corner',
    camX: 11.5,
    camZ: -55.0,
    viewCenterX: 0,
    viewCenterZ: -64,
    viewRadius: 15.0,
  },
  {
    id: 'cam_south_rail',
    label: 'CAM 08 · South Rail Crossing',
    zoneId: 'south_tank',
    camX: -11.5,
    camZ: 55.0,
    viewCenterX: 0,
    viewCenterZ: 62,
    viewRadius: 15.0,
  },
];

export const VENTS: VentNode[] = [
  {
    id: 'vent_cha',
    label: 'Cha Drain',
    x: -28.0,
    z: -38.5,
    targetIds: ['vent_pukur', 'vent_eidgah', 'vent_saloon', 'vent_rickshaw'],
  },
  {
    id: 'vent_rickshaw',
    label: 'Garage Manhole',
    x: 28.0,
    z: -38.5,
    targetIds: ['vent_cha', 'vent_eidgah', 'vent_bazar', 'vent_cricket'],
  },
  {
    id: 'vent_desco',
    label: 'DESCO Drain',
    x: -28.0,
    z: 38.5,
    targetIds: ['vent_pukur', 'vent_wasa', 'vent_pharmacy'],
  },
  {
    id: 'vent_dish',
    label: 'Dish Culvert',
    x: 28.0,
    z: 38.5,
    targetIds: ['vent_bazar', 'vent_wasa', 'vent_pandal'],
  },
  {
    id: 'vent_pukur',
    label: 'Ghat Pipe',
    x: -33.0,
    z: -7.5,
    targetIds: ['vent_cha', 'vent_desco', 'vent_saloon'],
  },
  {
    id: 'vent_bazar',
    label: 'Bazar Alley Drain',
    x: 33.0,
    z: 7.5,
    targetIds: ['vent_rickshaw', 'vent_dish', 'vent_pandal'],
  },
  {
    id: 'vent_eidgah',
    label: 'Eidgah North Drain',
    x: -10.5,
    z: -39.0,
    targetIds: ['vent_cha', 'vent_rickshaw', 'vent_fuchka'],
  },
  {
    id: 'vent_wasa',
    label: 'WASA South Drain',
    x: 10.5,
    z: 39.0,
    targetIds: ['vent_desco', 'vent_dish', 'vent_pharmacy', 'vent_pandal'],
  },
  // 4 Outer Sector Drains
  {
    id: 'vent_fuchka',
    label: 'Fuchka Gutter',
    x: 9.0,
    z: -62.5,
    targetIds: ['vent_eidgah', 'vent_saloon', 'vent_cricket'],
  },
  {
    id: 'vent_saloon',
    label: 'Saloon Drain',
    x: -60.5,
    z: -32.5,
    targetIds: ['vent_fuchka', 'vent_cha', 'vent_pukur', 'vent_pharmacy'],
  },
  {
    id: 'vent_cricket',
    label: 'Cricket Culvert',
    x: 60.5,
    z: -32.5,
    targetIds: ['vent_fuchka', 'vent_rickshaw', 'vent_pandal'],
  },
  {
    id: 'vent_pharmacy',
    label: 'Pharmacy Drain',
    x: -60.5,
    z: 32.5,
    targetIds: ['vent_saloon', 'vent_desco', 'vent_wasa'],
  },
  {
    id: 'vent_pandal',
    label: 'Pandal Sewer',
    x: 60.5,
    z: 32.5,
    targetIds: ['vent_cricket', 'vent_dish', 'vent_bazar', 'vent_wasa'],
  },
];

export const EMERGENCY_BELL_POS = { x: 0, z: 0, interactRadius: 4.8 };

export const SABOTAGE_TARGETS: Record<SabotageType, { x: number; z: number; label: string; banglaLabel: string }> = {
  loadshedding: {
    x: -31.2,
    z: 32.5,
    label: 'DESCO Main Breaker',
    banglaLabel: 'লোডশেডিং মেইন সুইচ',
  },
  wifi_down: {
    x: 34.5,
    z: 29.0,
    label: 'Dish Router Reset',
    banglaLabel: 'ওয়াইফাই রাউটার রিসেট',
  },
};

export const SPAWN_RING: Array<{ x: number; z: number; yaw: number }> = [
  { x: 0, z: 4.5, yaw: Math.PI },
  { x: 3.3, z: 3.3, yaw: (Math.PI * 5) / 4 },
  { x: 4.5, z: 0, yaw: -Math.PI / 2 },
  { x: 3.3, z: -3.3, yaw: -Math.PI / 4 },
  { x: 0, z: -4.5, yaw: 0 },
  { x: -3.3, z: -3.3, yaw: Math.PI / 4 },
  { x: -4.5, z: 0, yaw: Math.PI / 2 },
  { x: -3.3, z: 3.3, yaw: (Math.PI * 3) / 4 },
];

export const BOT_WAYPOINTS: Array<{ x: number; z: number }> = [
  { x: 0, z: 7.2 },
  { x: 7.5, z: 0 },
  { x: 0, z: -7.5 },
  { x: -7.5, z: 0 },
  { x: 0, z: -26.0 },
  { x: 0, z: -37.0 },
  { x: 0, z: 26.0 },
  { x: 0, z: 32.5 },
  { x: -31.0, z: -15.0 },
  { x: -35.5, z: -32.2 },
  { x: 31.0, z: -15.0 },
  { x: 32.5, z: -29.5 },
  { x: -31.0, z: 15.0 },
  { x: -31.2, z: 32.5 },
  { x: 31.0, z: 15.0 },
  { x: 34.5, z: 29.0 },
  { x: -37.5, z: 0 },
  { x: 38.5, z: 0 },
  // Outer Boulevard & 5 New Hi-Poly Locations
  { x: 0, z: -52.0 },
  { x: 0, z: -63.5 },
  { x: -52.0, z: -26.0 },
  { x: -64.5, z: -26.0 },
  { x: 52.0, z: -26.0 },
  { x: 64.5, z: -26.0 },
  { x: -52.0, z: 26.0 },
  { x: -64.5, z: 26.0 },
  { x: 52.0, z: 26.0 },
  { x: 64.0, z: 26.0 },
  { x: -52.0, z: 0 },
  { x: 52.0, z: 0 },
  { x: 0, z: 52.0 },
  { x: 0, z: 68.0 },
];

export function resolveCircleWallCollision(
  x: number,
  z: number,
  radius: number = PLAYER_RADIUS,
  walls: WallAABB[] = WALLS,
  doorLocks?: DoorLockState,
): { x: number; z: number } {
  let nx = Math.max(-MAP_HALF_SIZE + radius, Math.min(MAP_HALF_SIZE - radius, x));
  let nz = Math.max(-MAP_HALF_SIZE + radius, Math.min(MAP_HALF_SIZE - radius, z));

  const activeObstacles: WallAABB[] = doorLocks
    ? [
        ...walls,
        ...DOORS.filter((d) => doorLocks[d.zoneId] > 0),
      ]
    : walls;

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < activeObstacles.length; i++) {
      const w = activeObstacles[i];
      const closestX = Math.max(w.minX, Math.min(w.maxX, nx));
      const closestZ = Math.max(w.minZ, Math.min(w.maxZ, nz));
      const dx = nx - closestX;
      const dz = nz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          nx += (dx / dist) * push;
          nz += (dz / dist) * push;
        } else {
          const penLeft = nx - w.minX;
          const penRight = w.maxX - nx;
          const penTop = nz - w.minZ;
          const penBottom = w.maxZ - nz;
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) nx = w.minX - radius;
          else if (minPen === penRight) nx = w.maxX + radius;
          else if (minPen === penTop) nz = w.minZ - radius;
          else nz = w.maxZ + radius;
        }
      }
    }
  }

  return { x: nx, z: nz };
}

export function distance2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function getZoneNameAt(x: number, z: number): string {
  for (const zone of ZONES) {
    const hw = zone.width / 2;
    const hd = zone.depth / 2;
    if (x >= zone.x - hw && x <= zone.x + hw && z >= zone.z - hd && z <= zone.z + hd) {
      return zone.name;
    }
  }
  return 'Moholla Boulevard';
}

export function getZoneIdAt(x: number, z: number): string | null {
  for (const zone of ZONES) {
    const hw = zone.width / 2;
    const hd = zone.depth / 2;
    if (x >= zone.x - hw && x <= zone.x + hw && z >= zone.z - hd && z <= zone.z + hd) {
      return zone.id;
    }
  }
  return null;
}
