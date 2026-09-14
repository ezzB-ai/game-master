'use strict';

// Gender/pronoun systems for the 25 background NPC_SPECIES and the 6 playable
// Warp Shell LIFE FORMS. This is original worldbuilding (not sourced from the
// rulebook), designed per-species/per-life-form rather than reusing generic
// human pronouns — see the design review this was approved from. 'weight'
// guides random selection frequency in npcGenerator.js.

const LIFE_FORM_GENDERS = {
  "Geno": {
    note: "Human-derived — keeps the full human range as baseline, plus one rarer engineered variant.",
    genders: [
    { label: "Woman", pronouns: "she/her/hers", weight: 38 },
    { label: "Man", pronouns: "he/him/his", weight: 38 },
    { label: "Nonbinary", pronouns: "they/them/theirs", weight: 14 },
    { label: "Blended", pronouns: "fen/fen/fenn's", weight: 10, flavor: "A rare engineered trait where gender expression shifts with context or role — a quiet echo of the Psyker tinkering in Geno ancestry." }
    ],
  },
  "Xill": {
    note: "Silicate variable-state beings — pronoun tracks which physical state (solid/liquid/transitional) an individual most often presents in, unrelated to reproduction.",
    genders: [
    { label: "Solid-Phase", pronouns: "xe/xir/xirs", weight: 38 },
    { label: "Liquid-Phase", pronouns: "fer/fen/fers", weight: 38 },
    { label: "Transitional", pronouns: "vel/veth/veln", weight: 24 }
    ],
  },
  "Reptoid": {
    note: "Clutch-role tied to their commando/military caste culture.",
    genders: [
    { label: "Broodmother", pronouns: "sha/shas/shasen", weight: 25 },
    { label: "Sire", pronouns: "rhez/rhezh/rhezen", weight: 25 },
    { label: "Warden", pronouns: "krix/krix/krixen", weight: 50, flavor: "The largest caste — non-reproductive Reptoids raised for military/defense duty, the ones most crews actually meet." }
    ],
  },
  "Kitt": {
    note: "Pack-loyalty culture outweighs breeding-pair distinction for most Kitt.",
    genders: [
    { label: "Kin", pronouns: "ry/ry/ryn", weight: 60 },
    { label: "Packmother", pronouns: "mira/mir/miren", weight: 20 },
    { label: "Packfather", pronouns: "dor/dor/doren", weight: 20 }
    ],
  },
  "Mecha": {
    note: "Gender isn't part of the base design — it/its is the true default. Self-chosen options are personal 'designations' a Mecha adopts as its personality outgrows its programming, not borrowed human identities.",
    genders: [
    { label: "Unspecified", pronouns: "it/it/its", weight: 55 },
    { label: "Self-Chosen: Sy", pronouns: "sy/syn/syne", weight: 15 },
    { label: "Self-Chosen: Kor", pronouns: "kor/kor/koren", weight: 15 },
    { label: "Self-Chosen: Wyr", pronouns: "wyr/wyr/wyren", weight: 15 }
    ],
  },
  "Ghost Armor": {
    note: "If a ghost remembers who they were before consciousness-transfer, they keep that person's actual original pronoun — it isn't replaced with something alien, because the whole point of 'Remembered' is that it's genuinely theirs. Only a ghost that has lost that memory entirely gets the distinct 'Unremembered' pronoun.",
    genders: [
    { label: "Remembered (She)", pronouns: "she/her/hers", weight: 27 },
    { label: "Remembered (He)", pronouns: "he/him/his", weight: 27 },
    { label: "Remembered (They)", pronouns: "they/them/theirs", weight: 26, flavor: "Also covers a remembered non-human pronoun, if the ghost's original species used one." },
    { label: "Unremembered", pronouns: "hush/hush/hushen", weight: 20, flavor: "No longer recalls their original identity." }
    ],
  },
};

const NPC_SPECIES_GENDERS = {
  "Drommel": {
    note: "Blunt, sturdy guild phonetics.",
    genders: [
    { label: "Dur", pronouns: "dur/dur/duren", weight: 34 },
    { label: "Gorn", pronouns: "gorn/gorn/gornen", weight: 33 },
    { label: "Brol", pronouns: "brol/brol/brolen", weight: 33 }
    ],
  },
  "Skitterkin": {
    note: "Chitinous, chittering brood-culture — most never take a breeding role.",
    genders: [
    { label: "Broodkin", pronouns: "chit/chit/chitten", weight: 70 },
    { label: "Layer", pronouns: "skri/skri/skrien", weight: 15 },
    { label: "Coupler", pronouns: "tazz/tazz/tazzen", weight: 15 }
    ],
  },
  "Vondu": {
    note: "Sequential across the lifetime, echoing amphibian metamorphosis.",
    genders: [
    { label: "Rising", pronouns: "glub/glub/gluben", weight: 35, flavor: "Early life stage." },
    { label: "Deepened", pronouns: "vrok/vrok/vroken", weight: 35, flavor: "Mid-life stage." },
    { label: "Twice-Bloomed", pronouns: "quor/quor/quoren", weight: 30, flavor: "Later life, having passed through both." }
    ],
  },
  "Ashgrub": {
    note: "Blind, vibration-sensing — genders correspond to the frequency an individual emits.",
    genders: [
    { label: "Thrum-Low", pronouns: "murn/murn/murnen", weight: 30 },
    { label: "Thrum-High", pronouns: "velk/velk/velken", weight: 30 },
    { label: "Still", pronouns: "thae/thae/thaen", weight: 40, flavor: "The common default." }
    ],
  },
  "Corvane": {
    note: "Sharp, avian call-based.",
    genders: [
    { label: "Kree", pronouns: "kree/kree/kreen", weight: 34 },
    { label: "Corr", pronouns: "corr/corr/corren", weight: 33 },
    { label: "Skaw", pronouns: "skaw/skaw/skawen", weight: 33, flavor: "Never took a flock-mating role — common among solitary informants." }
    ],
  },
  "Thistlewrought": {
    note: "Slow, plant-rooted phonetics.",
    genders: [
    { label: "Vira", pronouns: "vira/vira/viren", weight: 34 },
    { label: "Thorn", pronouns: "thorn/thorn/thornen", weight: 33 },
    { label: "Leif", pronouns: "leif/leif/leifen", weight: 33 }
    ],
  },
  "Muckrender": {
    note: "Blunt swamp-bouncer phonetics.",
    genders: [
    { label: "Grum", pronouns: "grum/grum/grummen", weight: 34 },
    { label: "Dask", pronouns: "dask/dask/dasken", weight: 33 },
    { label: "Wole", pronouns: "wole/wole/wolen", weight: 33 }
    ],
  },
  "Bellowfin": {
    note: "Deep, resonant cetacean-pod tones.",
    genders: [
    { label: "Moro", pronouns: "moro/moro/moren", weight: 35 },
    { label: "Dhum", pronouns: "dhum/dhum/dhummen", weight: 35 },
    { label: "Lull", pronouns: "lull/lull/lullen", weight: 30, flavor: "Kept a pre-maturity pod-name into adulthood by choice." }
    ],
  },
  "Ratlin": {
    note: "Quick, clipped scrapper phonetics.",
    genders: [
    { label: "Skit", pronouns: "skit/skit/skitten", weight: 34 },
    { label: "Nib", pronouns: "nib/nib/nibben", weight: 33 },
    { label: "Rae", pronouns: "rae/rae/raen", weight: 33 }
    ],
  },
  "Duskwing": {
    note: "Echolocation-click based.",
    genders: [
    { label: "Chirr", pronouns: "chirr/chirr/chirren", weight: 35 },
    { label: "Vrom", pronouns: "vrom/vrom/vromen", weight: 35 },
    { label: "Shen", pronouns: "shen/shen/shenen", weight: 30, flavor: "Communicates more by touch and subtle click than voice." }
    ],
  },
  "Grael": {
    note: "Worn, clipped Imperium mining-caste dialect — plain but still their own words, not borrowed ones.",
    genders: [
    { label: "Dun", pronouns: "dun/dun/dunnen", weight: 34 },
    { label: "Gor", pronouns: "gor/gor/gorren", weight: 33 },
    { label: "Vek", pronouns: "vek/vek/veken", weight: 33 }
    ],
  },
  "Sable Moth": {
    note: "Dust and wing-pattern phonetics.",
    genders: [
    { label: "Silt", pronouns: "silt/silt/silten", weight: 34 },
    { label: "Wisp", pronouns: "wisp/wisp/wispen", weight: 33 },
    { label: "Haze", pronouns: "haze/haze/hazen", weight: 33 }
    ],
  },
  "Ironhide": {
    note: "Hard, armored phonetics.",
    genders: [
    { label: "Grit", pronouns: "grit/grit/gritten", weight: 34 },
    { label: "Barr", pronouns: "barr/barr/barren", weight: 33 },
    { label: "Stel", pronouns: "stel/stel/stellen", weight: 33 }
    ],
  },
  "Wrenfolk": {
    note: "Chattery, tool-adjacent phonetics.",
    genders: [
    { label: "Tik", pronouns: "tik/tik/tikken", weight: 34 },
    { label: "Cog", pronouns: "cog/cog/coggen", weight: 33 },
    { label: "Whir", pronouns: "whir/whir/whirren", weight: 33 }
    ],
  },
  "Cindergrass": {
    note: "Ash and herd-trail phonetics.",
    genders: [
    { label: "Ash", pronouns: "ash/ash/ashen", weight: 30 },
    { label: "Sorn", pronouns: "sorn/sorn/sornen", weight: 30 },
    { label: "Dray", pronouns: "dray/dray/drayen", weight: 40, flavor: "Non-breeding herd members who travel and trade — the ones most often met off-world." }
    ],
  },
  "Volterrai": {
    note: "Light-refraction phonetics — social/aesthetic, not biological.",
    genders: [
    { label: "Lus", pronouns: "lus/lus/lussen", weight: 34 },
    { label: "Obar", pronouns: "obar/obar/obaren", weight: 33 },
    { label: "Vitra", pronouns: "vitra/vitra/vitren", weight: 33 }
    ],
  },
  "Umbral Kin": {
    note: "Formless and anchor-bound — self-chosen upon first bonding, no biological basis.",
    genders: [
    { label: "Nyx", pronouns: "nyx/nyx/nyxen", weight: 34 },
    { label: "Umbra", pronouns: "umbra/umbra/umbren", weight: 33 },
    { label: "Vane", pronouns: "vane/vane/vanen", weight: 33 }
    ],
  },
  "Choralite": {
    note: "A colony of linked polyps communicating in harmonic hums — individual gender barely applies, so the colony hum is the overwhelming default.",
    genders: [
    { label: "Hum", pronouns: "hum/hum/hummen", weight: 80 },
    { label: "Chora", pronouns: "chora/chora/choren", weight: 10, flavor: "Formed from a singing-pair bonding ritual." },
    { label: "Dror", pronouns: "dror/dror/droren", weight: 10, flavor: "Formed from a singing-pair bonding ritual." }
    ],
  },
  "Palewrack": {
    note: "Bioluminescence-pattern based, for a blind species.",
    genders: [
    { label: "Glim", pronouns: "glim/glim/glimmen", weight: 34 },
    { label: "Lume", pronouns: "lume/lume/lumen", weight: 33 },
    { label: "Shade", pronouns: "shade/shade/shaden", weight: 33 }
    ],
  },
  "Husk-Bonded": {
    note: "Gender multiplicity is baked into their host/passenger duality lore.",
    genders: [
    { label: "Dyad", pronouns: "dyad/dyad/dyaden", weight: 50, flavor: "Host and passenger identify differently and haven't reconciled it." },
    { label: "Esh", pronouns: "esh/esh/eshen", weight: 25, flavor: "Host and passenger have reached accord." },
    { label: "Corr", pronouns: "corr/corr/corren", weight: 25, flavor: "Host and passenger have reached accord." }
    ],
  },
  "Tallowkin": {
    note: "Face melts and reforms over years — pronoun is a current snapshot, not fixed.",
    genders: [
    { label: "Wex", pronouns: "wex/wex/wexen", weight: 34 },
    { label: "Mold", pronouns: "mold/mold/molden", weight: 33 },
    { label: "Flux", pronouns: "flux/flux/fluxen", weight: 33, flavor: "The safe fallback when addressing a Tallowkin you haven't seen in years." }
    ],
  },
  "Rin-Kaathe": {
    note: "Ritual scarification traditionally marked gender; some reject the marking now.",
    genders: [
    { label: "Kaath", pronouns: "kaath/kaath/kaathen", weight: 30 },
    { label: "Rin", pronouns: "rin/rin/rinnen", weight: 30 },
    { label: "Esk", pronouns: "esk/esk/esken", weight: 40, flavor: "Rejects the old prison-caste gender-marking scars." }
    ],
  },
  "Mirrorkind": {
    note: "Presents as whoever they're mimicking; this is their rarely-seen true form.",
    genders: [
    { label: "Sim", pronouns: "sim/sim/simmen", weight: 100, flavor: "In practice, most encounters are with a Mirrorkind mid-disguise, whose apparent pronouns match whoever they're impersonating." }
    ],
  },
  "Voidborn": {
    note: "Gestation happens externally in vacuum pressure-sacs — no egg-bearer/sire distinction exists.",
    genders: [
    { label: "Void", pronouns: "void/void/voiden", weight: 100, flavor: "Universal within Voidborn culture." }
    ],
  },
  "The Unbound Choir": {
    note: "Each drone-host keeps its own ordinary, pre-existing identity (they could be any other species on this list) — the ancient Choir consciousness itself is genderless, surfacing only in rare possession moments.",
    genders: [
    { label: "Host's Own", pronouns: "(inherit whichever species the host actually is)", weight: 90, flavor: "The host lives an ordinary life and is unaware it carries the Choir." },
    { label: "The Choir", pronouns: "sevr/sevr/sevren", weight: 10, flavor: "Used only in the rare moment the Choir speaks through the host, overriding the host's own pronoun." }
    ],
  },
};

module.exports = { LIFE_FORM_GENDERS, NPC_SPECIES_GENDERS };
