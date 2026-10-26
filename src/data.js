// Sample catalog. Everything here is placeholder data for the UI, not live on-chain listings.
export const CATEGORIES = ['All', 'Art', 'Gaming', 'PFPs', 'Music', '3D'];
export const SORTS = ['Recently listed', 'Price: low to high', 'Price: high to low', 'Most liked'];

const NAMES = [
  ['Cyber Samurai', 'Gaming', 'Neon Ronin', 4.2],
  ['Void Bloom', 'Art', 'Orbit Series', 2.8],
  ['Chrome Serpent', '3D', 'Metal Fauna', 1.9],
  ['Pulse Oracle', 'Music', 'Sound Halo', 0.85],
  ['Glitch Monk', 'PFPs', 'Static Monks', 0.6],
  ['Solar Drift', 'Art', 'Orbit Series', 3.5],
  ['Hex Pilot', 'Gaming', 'Neon Ronin', 1.2],
  ['Prism Whale', '3D', 'Metal Fauna', 5.1],
  ['Echo Vinyl', 'Music', 'Sound Halo', 0.42],
  ['Nebula Kid', 'PFPs', 'Static Monks', 0.75],
  ['Lattice Core', 'Art', 'Orbit Series', 2.1],
  ['Ion Raptor', 'Gaming', 'Neon Ronin', 1.65],
  ['Mirror Moth', '3D', 'Metal Fauna', 0.98],
  ['Bass Garden', 'Music', 'Sound Halo', 2.4],
  ['Zero Saint', 'PFPs', 'Static Monks', 0.33],
  ['Aurora Gate', 'Art', 'Orbit Series', 6.0],
  ['Rift Samurai', 'Gaming', 'Neon Ronin', 2.9],
  ['Quartz Lynx', '3D', 'Metal Fauna', 1.4],
  ['Vapor Choir', 'Music', 'Sound Halo', 0.66],
  ['Dust Angel', 'PFPs', 'Static Monks', 0.51],
  ['Helix Dune', 'Art', 'Orbit Series', 1.05],
  ['Signal Ghost', 'Gaming', 'Neon Ronin', 0.9],
  ['Obsidian Bee', '3D', 'Metal Fauna', 3.2],
  ['Overture 09', 'Music', 'Sound Halo', 1.8],
];

const CHAINS = ['Ethereum Sepolia', 'Polygon Amoy', 'Base Sepolia'];
const OWNERS = ['nova.eth', 'kairo.eth', 'mira.eth', 'sol.eth', 'dex.eth', 'vesper.eth'];

export const NFTS = NAMES.map(([name, category, collection, price], i) => ({
  id: String(i + 1).padStart(3, '0'),
  name: `${name} #${String(i + 1).padStart(3, '0')}`,
  baseName: name,
  category,
  collection,
  price,
  likes: (i * 37) % 210 + 12,
  chain: CHAINS[i % CHAINS.length],
  creator: OWNERS[i % OWNERS.length],
  royalty: [5, 7.5, 10][i % 3],
  listed: i % 4 !== 3,
  hue: (i * 47) % 360,
  rarity: ['Common', 'Rare', 'Epic', 'Legendary'][i % 4],
  description:
    'A sample token rendered in the Orbix studio. Metadata and artwork are placeholders until a real collection is minted.',
  properties: [
    { k: 'Background', v: ['Void', 'Dawn', 'Ember', 'Ice'][i % 4] },
    { k: 'Core', v: ['Prism', 'Ring', 'Shard'][i % 3] },
    { k: 'Rarity', v: ['Common', 'Rare', 'Epic', 'Legendary'][i % 4] },
  ],
  history: [
    { type: 'Listed', by: OWNERS[i % 6], price, when: `${(i % 9) + 1}d ago` },
    { type: 'Minted', by: OWNERS[(i + 2) % 6], price: null, when: `${(i % 9) + 12}d ago` },
  ],
}));

export const COLLECTIONS = [
  { name: 'Neon Ronin', floor: 1.2, items: 8, hue: 280 },
  { name: 'Orbit Series', floor: 1.05, items: 6, hue: 230 },
  { name: 'Metal Fauna', floor: 0.98, items: 5, hue: 190 },
  { name: 'Sound Halo', floor: 0.42, items: 4, hue: 320 },
];

export const CREATORS = [
  { handle: 'nova.eth', name: 'Nova', bio: 'Sample creator profile. Replace with real wallet data after sign-in.' },
  { handle: 'kairo.eth', name: 'Kairo', bio: 'Generative artist. Sample data only.' },
  { handle: 'mira.eth', name: 'Mira', bio: 'Sound and motion. Sample data only.' },
];

export function getNft(id) {
  return NFTS.find((n) => n.id === id);
}

export function getCreatorNfts(handle) {
  return NFTS.filter((n) => n.creator === handle);
}
