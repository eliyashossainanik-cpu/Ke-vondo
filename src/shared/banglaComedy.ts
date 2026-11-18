import { PLAYER_COLORS, type PlayerColorId, type PlayerState, type SpecialRole } from './types';

export interface AutoIdentity {
  name: string;
  color: PlayerColorId;
}

export const FUNNY_MULTIPLAYER_IDENTITIES: AutoIdentity[] = [
  { name: 'Chacha 420', color: 'holud' },
  { name: 'Fuchka King', color: 'komola' },
  { name: 'Biryani Bablu', color: 'lal' },
  { name: 'Cha-Pagol Titu', color: 'shobuj' },
  { name: 'Wi-Fi Wasim', color: 'neel' },
  { name: 'Pukur Pintu', color: 'beguni' },
  { name: 'Daktar Dulal', color: 'sada' },
  { name: 'Kalo Kalu', color: 'kalo' },
  { name: 'Shingara Shafiq', color: 'holud' },
  { name: 'Auto Akash', color: 'komola' },
  { name: 'Biyer Bari Babul', color: 'lal' },
  { name: 'Muri-Chana Mofiz', color: 'shobuj' },
];

export function pickAutoMultiplayerIdentity(
  usedNames: Iterable<string> = [],
  usedColors: Iterable<PlayerColorId> = [],
  rng: () => number = Math.random,
): AutoIdentity {
  const takenNameSet = new Set(Array.from(usedNames, (n) => n.trim().toLowerCase()));
  const takenColorSet = new Set(usedColors);

  const openColorPool = PLAYER_COLORS.filter((c) => !takenColorSet.has(c.id));
  const openIdentityPool = FUNNY_MULTIPLAYER_IDENTITIES.filter(
    (entry) => !takenNameSet.has(entry.name.toLowerCase()),
  );

  const exactMatches = openIdentityPool.filter((entry) => !takenColorSet.has(entry.color));
  if (exactMatches.length > 0) {
    return exactMatches[Math.floor(rng() * exactMatches.length)];
  }

  const pickedName =
    openIdentityPool.length > 0
      ? openIdentityPool[Math.floor(rng() * openIdentityPool.length)].name
      : `Para Hero ${Math.floor(10 + rng() * 89)}`;

  const pickedColor =
    openColorPool.length > 0
      ? openColorPool[Math.floor(rng() * openColorPool.length)].id
      : PLAYER_COLORS[Math.floor(rng() * PLAYER_COLORS.length)].id;

  return { name: pickedName, color: pickedColor };
}

export function resolveUniqueMultiplayerIdentity(
  requestedName: string | undefined,
  requestedColor: PlayerColorId | undefined,
  existingPlayers: ReadonlyArray<Pick<PlayerState, 'name' | 'color'>>,
  rng: () => number = Math.random,
): AutoIdentity {
  const usedNames = new Set(existingPlayers.map((p) => p.name.trim().toLowerCase()));
  const usedColors = new Set(existingPlayers.map((p) => p.color));

  const trimmed = (requestedName ?? '').trim().slice(0, 16);
  const auto = pickAutoMultiplayerIdentity(usedNames, usedColors, rng);

  let finalName = trimmed;
  if (!finalName || usedNames.has(finalName.toLowerCase())) {
    if (!trimmed) {
      finalName = auto.name;
    } else if (!usedNames.has(auto.name.toLowerCase())) {
      finalName = auto.name;
    } else {
      let suffix = 2;
      while (usedNames.has(`${trimmed.slice(0, 13)} ${suffix}`.toLowerCase())) {
        suffix++;
      }
      finalName = `${trimmed.slice(0, 13)} ${suffix}`;
    }
  }

  let finalColor: PlayerColorId;
  if (requestedColor && !usedColors.has(requestedColor)) {
    finalColor = requestedColor;
  } else if (!usedColors.has(auto.color)) {
    finalColor = auto.color;
  } else {
    const remaining = PLAYER_COLORS.find((c) => !usedColors.has(c.id));
    finalColor = remaining ? remaining.id : PLAYER_COLORS[existingPlayers.length % PLAYER_COLORS.length].id;
  }

  return { name: finalName, color: finalColor };
}

export const QUICK_BANGLISH_ALIVE = [
  'Ami toh Cha khaitasilam bhai!',
  '100% Or-e Pukur e chubani dao!',
  'Tui e Batpar, chokh dekhei bujhsi!',
  'Proof chara kotha bolbi na mama!',
  'Fuchka Chottor e sus ghurtesilo!',
  'Current jawa matroi kam sarche!',
  'Skip mar, pore dekha jabe!',
];

export const QUICK_BANGLISH_GHOST = [
  'Amake size kore dise re bhai!',
  'Batpar amar piche chilo, dhoro ore!',
  'Ghost hoye Cha khacchi hehe!',
];

export const ROLE_COMEDY_TAGLINES: Record<SpecialRole, string> = {
  none: 'Cha-Biscuit khao, Task saro — ar Batpar dekhlei Shalish dako!',
  goyenda: 'Chokh-e magnifying glass lagao — ajke asli Batpar dhora porbei!',
  kobiraj: 'Tabiz er power ON! Dhorai dileo ajke keu katte parbe na!',
  mistri: 'Tester haate niye ghuro — Current ar Dren duitai tomar dokhole!',
  daroga: 'Ek guli te Batpar khotom — kintu bhul korlei nijeri chakri sesh!',
  neta: 'Vote e 2x power! Bhashon dilei shobai Pukur e jabe!',
  daktar: 'Saline niye ready thako — mora Para-basi ke jinda kore dao!',
  bohurupi: 'Chehara bodlay onno kaure fashao — ekdom cinema level natok!',
  jharudar: 'Jharu diye shob proof gayeb koro — keu kono lash-i pabe na!',
  pagol: 'Emon acting koro jeno shobai tomakei Pukur e fele — taholei WIN!',
};

export function getChubaniTaunts(name: string, wasVondo: boolean, wasPagol: boolean): string[] {
  if (wasPagol) {
    return [
      `${name}: "Hahahaha shobai BAIT khaise!"`,
      'Pukur er mach-o hashte hashte kheye gelo!',
      'Moholla ke choto-khato ullu banay gelo!',
    ];
  }
  if (wasVondo) {
    return [
      `1... 2... 3... ${name} PUKUR E JAA!!`,
      '"Batpari chharbi naki chubani khabi?!"',
      'Satar na janle tube niye nam re!',
    ];
  }
  return [
    `1... 2... 3... ZHAPANG!!`,
    `"Bhai ami toh shudhu Fuchka khaitasilam!"`,
    `Moholla ajke boro ekta bhul korlo naki?!`,
  ];
}
