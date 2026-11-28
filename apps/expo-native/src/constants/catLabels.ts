/**
 * Exact 67-class feline breed & coat catalog aligned 1:1 with
 * `assets/models/cat_breed_67_labels.txt` and `cat_breed_67.tflite`.
 */
export const CAT_BREED_67_LABELS: readonly string[] = [
  'Abyssinian',
  'American Bobtail',
  'American Curl',
  'American Shorthair',
  'American Wirehair',
  'Applehead Siamese',
  'Balinese',
  'Bengal',
  'Birman',
  'Bombay',
  'British Shorthair',
  'Burmese',
  'Burmilla',
  'Calico',
  'Canadian Hairless',
  'Chartreux',
  'Chausie',
  'Chinchilla',
  'Cornish Rex',
  'Cymric',
  'Devon Rex',
  'Dilute Calico',
  'Dilute Tortoiseshell',
  'Domestic Long Hair',
  'Domestic Medium Hair',
  'Domestic Short Hair',
  'Egyptian Mau',
  'Exotic Shorthair',
  'Hemingway Polydactyl',
  'Havana',
  'Himalayan',
  'Japanese Bobtail',
  'Javanese',
  'Korat',
  'LaPerm',
  'Maine Coon',
  'Manx',
  'Munchkin',
  'Nebelung',
  'Norwegian Forest',
  'Ocicat',
  'Oriental Long Hair',
  'Oriental Short Hair',
  'Oriental Tabby',
  'Persian',
  'Pixiebob',
  'Ragamuffin',
  'Ragdoll',
  'Russian Blue',
  'Scottish Fold',
  'Selkirk Rex',
  'Siamese',
  'Siberian',
  'Silver',
  'Singapura',
  'Snowshoe',
  'Somali',
  'Sphynx - Hairless',
  'Tabby',
  'Tiger',
  'Tonkinese',
  'Torbie',
  'Tortoiseshell',
  'Turkish Angora',
  'Turkish Van',
  'Tuxedo',
  'York Chocolate',
];

/**
 * Exact 12-class Oxford-IIIT Pet feline breed catalog aligned 1:1 with
 * `assets/models/cat_breed_12_labels.txt` and `cat_breed_oxford12.tflite`.
 */
export const CAT_BREED_12_LABELS: readonly string[] = [
  'British Shorthair',
  'Siamese',
  'Bengal',
  'Egyptian Mau',
  'Birman',
  'Maine Coon',
  'Abyssinian',
  'Sphynx',
  'Ragdoll',
  'Russian Blue',
  'Bombay',
  'Persian',
];

/**
 * Pascal VOC 2012 semantic class table used by `deeplab_v3.tflite`
 * (class index `8` represents `'cat'`).
 */
export const PASCAL_VOC_LABELS: readonly string[] = [
  'background',
  'aeroplane',
  'bicycle',
  'bird',
  'boat',
  'bottle',
  'bus',
  'car',
  'cat',
  'chair',
  'cow',
  'diningtable',
  'dog',
  'horse',
  'motorbike',
  'person',
  'pottedplant',
  'sheep',
  'sofa',
  'train',
  'tvmonitor',
];

/**
 * Companion COCO object classes highlighted alongside detected cats.
 */
export const CAT_SCENE_CONTEXT_CLASSES: readonly string[] = [
  'person',
  'bird',
  'dog',
  'bowl',
  'cup',
  'chair',
  'couch',
  'potted plant',
  'bed',
  'mouse',
];

export interface CatBreedProfile {
  origin: string;
  size: 'Small' | 'Medium' | 'Large' | 'Variable';
  coatStyle: string;
  temperament: string;
  summary: string;
  kampungAlias?: string;
}

const DEFAULT_BREED_PROFILE: CatBreedProfile = {
  origin: 'International Registry',
  size: 'Medium',
  coatStyle: 'Varies by lineage',
  temperament: 'Curious, observant, agile',
  summary: 'Distinctive feline lineage detected from facial proportions and coat texture.',
};

export const CAT_BREED_PROFILES: Readonly<Record<string, CatBreedProfile>> = {
  'Domestic Short Hair': {
    origin: 'Mixed / Worldwide',
    size: 'Medium',
    coatStyle: 'Short, resilient coat',
    temperament: 'Adaptable, street-smart, affectionate',
    summary: 'Classic short-haired household companion with diverse coat genetics.',
    kampungAlias: 'Kucing Kampung / Domestik',
  },
  'Domestic Medium Hair': {
    origin: 'Mixed / Worldwide',
    size: 'Medium',
    coatStyle: 'Semi-long plush coat',
    temperament: 'Gentle, playful, social',
    summary: 'Medium-length mixed-breed coat with soft ruff around neck and tail.',
    kampungAlias: 'Kucing Kampung / Mix Lokal',
  },
  'Domestic Long Hair': {
    origin: 'Mixed / Worldwide',
    size: 'Medium',
    coatStyle: 'Long flowing double coat',
    temperament: 'Calm, expressive, companionable',
    summary: 'Long-coated domestic cat combining tufted ears and plumed tail.',
    kampungAlias: 'Kucing Kampung Long Hair',
  },
  Tabby: {
    origin: 'Universal Pattern',
    size: 'Medium',
    coatStyle: 'Mackerel, classic, or spotted stripes',
    temperament: 'Alert, expressive, spirited',
    summary: 'Iconic forehead "M" marking with agouti ticked or striped fur pattern.',
    kampungAlias: 'Kucing Kampung Loreng',
  },
  Calico: {
    origin: 'Universal Tri-Color',
    size: 'Medium',
    coatStyle: 'Tri-color patches (white, orange, black)',
    temperament: 'Spirited, independent, vocal',
    summary: 'Tri-color patchwork coat classically linked with XX chromosomes.',
    kampungAlias: 'Kucing Belang Tiga',
  },
  'Dilute Calico': {
    origin: 'Universal Tri-Color',
    size: 'Medium',
    coatStyle: 'Pastel tri-color (white, cream, blue-grey)',
    temperament: 'Sweet, expressive, curious',
    summary: 'Muted cream and slate-grey patches over a crisp white base.',
    kampungAlias: 'Kucing Belang Tiga Pastel',
  },
  Tortoiseshell: {
    origin: 'Universal Mosaic',
    size: 'Medium',
    coatStyle: 'Mottled amber and black brindle',
    temperament: 'Bold, witty, strongly bonded',
    summary: 'Dense speckled amber-and-black coat with minimal or no white spotting.',
    kampungAlias: 'Kucing Kembang Telon',
  },
  Tuxedo: {
    origin: 'Universal Bicolor',
    size: 'Medium',
    coatStyle: 'Crisp black & white formal bicolor',
    temperament: 'Clever, vocal, routine-loving',
    summary: 'High-contrast dark mantle paired with white paws, bib, or muzzle.',
    kampungAlias: 'Kucing Tuksedo',
  },
  'British Shorthair': {
    origin: 'United Kingdom',
    size: 'Large',
    coatStyle: 'Dense plush velvet coat',
    temperament: 'Placid, dignified, steady',
    summary: 'Round moon-shaped face, copper/gold eyes, and thick teddy-bear fur.',
  },
  Persian: {
    origin: 'Iran / Greater Persia',
    size: 'Medium',
    coatStyle: 'Ultra-long dense double coat',
    temperament: 'Serene, sweet, indoor-loving',
    summary: 'Flat brachycephalic muzzle, rounded ears, and luxurious flowing ruff.',
  },
  Siamese: {
    origin: 'Thailand',
    size: 'Medium',
    coatStyle: 'Sleek short colorpoint coat',
    temperament: 'Chatty, social, highly intelligent',
    summary: 'Wedge-shaped head, striking almond blue eyes, and darker extremities.',
  },
  Bengal: {
    origin: 'United States',
    size: 'Large',
    coatStyle: 'Glittered rosetted or marbled pelt',
    temperament: 'Athletic, inquisitive, energetic',
    summary: 'Leopard-inspired two-tone rosettes and muscular predatory build.',
  },
  'Maine Coon': {
    origin: 'United States (Maine)',
    size: 'Large',
    coatStyle: 'Shaggy water-resistant overcoat',
    temperament: 'Gentle giant, chirpy, loyal',
    summary: 'Lynx-tipped ears, square muzzle, neck ruff, and sweeping raccoon tail.',
  },
  Ragdoll: {
    origin: 'United States (California)',
    size: 'Large',
    coatStyle: 'Silky semi-long colorpoint',
    temperament: 'Docile, relaxed, affectionate',
    summary: 'Vivid sapphire eyes and plush cream coat with point shading.',
  },
  'Russian Blue': {
    origin: 'Russia (Arkhangelsk)',
    size: 'Medium',
    coatStyle: 'Silvery-blue shimmer double coat',
    temperament: 'Reserved with strangers, devoted',
    summary: 'Emerald green eyes, wedge-broad skull, and silver-tipped blue fur.',
  },
  Abyssinian: {
    origin: 'Indian Ocean / Southeast Asia',
    size: 'Medium',
    coatStyle: 'Warm ticked agouti short coat',
    temperament: 'Active, curious, acrobatic',
    summary: 'Lithesome build, large cupped ears, and banded glowing reddish ticks.',
  },
  Sphynx: {
    origin: 'Canada',
    size: 'Medium',
    coatStyle: 'Hairless suede-like warm skin',
    temperament: 'Extroverted, cuddly, mischievous',
    summary: 'Sculpted cheekbones, oversized bat ears, and characteristic wrinkles.',
  },
  'Sphynx - Hairless': {
    origin: 'Canada',
    size: 'Medium',
    coatStyle: 'Hairless suede-like warm skin',
    temperament: 'Extroverted, cuddly, mischievous',
    summary: 'Sculpted cheekbones, oversized bat ears, and characteristic wrinkles.',
  },
  Scottish_Fold: DEFAULT_BREED_PROFILE,
  'Scottish Fold': {
    origin: 'Scotland',
    size: 'Medium',
    coatStyle: 'Plush short or long coat',
    temperament: 'Calm, endearing, adaptable',
    summary: 'Signature forward-folded ears and round owl-like expression.',
  },
  Birman: {
    origin: 'Myanmar',
    size: 'Large',
    coatStyle: 'Silky colorpoint with white gloves',
    temperament: 'Gentle, playful, balanced',
    summary: 'Sapphire blue eyes, Roman nose, and snow-white paw "gloves".',
  },
  'Egyptian Mau': {
    origin: 'Egypt',
    size: 'Medium',
    coatStyle: 'Naturally spotted glossy short coat',
    temperament: 'Fast, musical, discerning',
    summary: 'Gooseberry-green eyes and characteristic "worry" brow lines.',
  },
  Bombay: {
    origin: 'United States',
    size: 'Medium',
    coatStyle: 'Patent-leather jet-black short coat',
    temperament: 'Gregarious, lap-seeking, confident',
    summary: 'Miniature black panther look with glowing copper-gold eyes.',
  },
  'Exotic Shorthair': {
    origin: 'United States',
    size: 'Medium',
    coatStyle: 'Plush thick shorthair Persian coat',
    temperament: 'Sweet, quiet, affectionate',
    summary: 'Teddy-bear Persian expression with easy-care short plush fur.',
  },
  Himalayan: {
    origin: 'United Kingdom / United States',
    size: 'Medium',
    coatStyle: 'Long Persian coat with colorpoints',
    temperament: 'Tranquil, devoted, gentle',
    summary: 'Combines Persian conformation with vivid blue eyes and Siamese points.',
  },
  'Norwegian Forest': {
    origin: 'Norway',
    size: 'Large',
    coatStyle: 'Thick woolly undercoat & glossy guard hair',
    temperament: 'Confident, alert, outdoorsy',
    summary: 'Triangular Nordic profile, snowy neck bib, and tufted paw pads.',
  },
  Siberian: {
    origin: 'Russia',
    size: 'Large',
    coatStyle: 'Triple-layered winter coat',
    temperament: 'Fearless, buoyant, problem-solving',
    summary: 'Barrel-chested agility with rounded tufts and expressive golden/green eyes.',
  },
  'American Shorthair': {
    origin: 'United States',
    size: 'Medium',
    coatStyle: 'Thick, dense classic coat',
    temperament: 'Easygoing, sturdy, playful',
    summary: 'Balanced athleticism often seen in crisp silver classic tabby patterns.',
  },
  'Turkish Van': {
    origin: 'Lake Van, Turkey',
    size: 'Large',
    coatStyle: 'Cashmere-like water-resistant fur',
    temperament: 'Energetic, clever, water-curious',
    summary: 'Chalk-white body with colorful head & tail markings ("Van pattern").',
  },
  'Turkish Angora': {
    origin: 'Ankara, Turkey',
    size: 'Medium',
    coatStyle: 'Single-layered silky medium-long coat',
    temperament: 'Graceful, assertive, playful',
    summary: 'Fine-boned agility, plumed tail, and almond-shaped luminous eyes.',
  },
  Munchkin: {
    origin: 'United States',
    size: 'Small',
    coatStyle: 'Plush short or semi-long coat',
    temperament: 'Cheerful, curious, fast cornering',
    summary: 'Compact low-slung stance paired with standard expressive feline features.',
  },
};

export function getCatBreedProfile(label: string): CatBreedProfile {
  const exact = CAT_BREED_PROFILES[label];
  if (exact) {
    return exact;
  }

  const normalized = label.toLowerCase();
  if (normalized.includes('domestic') || normalized.includes('tabby') || normalized.includes('tiger')) {
    return {
      ...DEFAULT_BREED_PROFILE,
      kampungAlias: 'Kucing Kampung / Mix',
      summary: `${label} traits detected via coat patterning and facial proportion markers.`,
    };
  }

  return DEFAULT_BREED_PROFILE;
}
