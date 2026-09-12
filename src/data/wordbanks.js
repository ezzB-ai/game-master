'use strict';

// Flavor word banks for the Warp Shell setting (ICRPG). Kept large enough
// that name/trait/element combinations give real variance before repeats.

const NPC_FIRST_NAMES = [
  'Vex', 'Corin', 'Ashra', 'Boone', 'Talis', 'Nyra', 'Ossian', 'Kade',
  'Ferra', 'Ronin', 'Sable', 'Iska', 'Dax', 'Junia', 'Marrow', 'Petra',
  'Quenn', 'Rask', 'Sevrin', 'Tova', 'Ulric', 'Vashti', 'Wrenna', 'Xeno',
  'Yara', 'Zeph', 'Cass', 'Dorian', 'Elowen', 'Finch', 'Gorrik', 'Hesper',
  'Ilyn', 'Jocasta', 'Kessa', 'Lorne', 'Moxie', 'Niles', 'Orsa', 'Pike',
];

const NPC_SURNAMES = [
  'Okonkwo', 'Vantage', 'Halloway', 'Ashfield', 'Drayce', 'Korrin', 'Bathory',
  'Merrow', 'Steelgrave', 'Nakamoto', 'Ferro', 'Quillon', 'Redshift',
  'Blackwood', 'Voss', 'Ashcombe', 'Tarrow', 'Winslet', 'Dune', 'Halcyon',
  'Ironside', 'Marrow', 'Sundown', 'Vesper', 'Wolfe', 'Cassian', 'Dresden',
  'Ellery', 'Frost', 'Grieve',
];

const NPC_CALLSIGN_STYLE_CHANCE = 0.3; // odds an NPC gets a callsign instead of surname
const NPC_CALLSIGNS = [
  '"Rustcoat"', '"Nine-Lives"', '"Static"', '"Low Orbit"', '"Widow"',
  '"Scrap"', '"Ghostline"', '"Hexbolt"', '"Sundog"', '"Ballast"',
  '"Marrow"', '"Cinder"', '"Driftwood"', '"Payload"', '"Wick"',
];

const NPC_ROLES = [
  'Salvage Captain', 'Station Quartermaster', 'Black-Market Fixer',
  'Cult Preacher', 'Bounty Hunter', 'Reactor Tech', 'Smuggler',
  'Corporate Enforcer', 'Freelance Medic', 'Void Pilot', 'Info Broker',
  'Mercenary Sergeant', 'Cargo Inspector', 'AI Handler', 'Prospector',
  'Dock Boss', 'Diplomat', 'Weapons Dealer', 'Cryo-Tech Engineer',
  'Rogue Scientist', 'Bar Owner', 'Debt Collector', 'Signal Runner',
  'Exo-Suit Mechanic', 'Cartographer', 'Refugee Elder', 'Pit Fighter',
  'Customs Officer', 'Relic Hunter', 'Ship Broker',
];

const NPC_TRAITS = [
  'missing an eye, replaced with a flickering optic',
  'speaks only in trade-lingo shorthand',
  'never removes their vac-suit gloves',
  'collects pre-Warp coins',
  'owes a debt to a faction they won\'t name',
  'has a pet void-moth that rides on their shoulder',
  'laughs at the worst possible moments',
  'keeps a countdown tattooed on their forearm',
  'refuses to fly on ships without a name',
  'always double-checks the airlock seals, twice',
  'carries a photo of a planet that no longer exists',
  'quotes an old religious text when nervous',
  'has a cybernetic arm that occasionally glitches',
  'never sleeps more than four hours',
  'won\'t say the word "hull breach" out loud',
  'trades favors instead of currency whenever possible',
  'has a bounty on their head they deny exists',
  'keeps score of every favor owed to them',
  'talks to their ship\'s AI like an old friend',
  'is fluent in a dead colony dialect',
  'wears a faction pin from a war that ended badly',
  'is allergic to synth-protein and hides it',
  'has a habit of humming old Earth songs',
  'distrusts anyone who doesn\'t barter',
  'keeps a locked box no one has seen opened',
  'was declared dead once and never corrected the record',
  'flinches at sudden bursts of static',
  'insists on being paid in physical scrip, not credits',
  'has a rival somewhere on the station, unspoken',
  'sketches the faces of everyone they meet',
];

const FACTIONS = [
  'The Rust Choir', 'Kessel Salvage Guild', 'Obsidian Concordat',
  'Free Traders\' Compact', 'The Hollow Star Cult', 'Meridian Corporate Authority',
  'The Drift Runners', 'Ashfall Remnant', 'The Quiet Ledger',
  'Vanguard Reclamation Corps', 'The Static Choir', 'Independent (no faction)',
];

const LOCATION_TYPES = [
  'planet', 'spaceport', 'space station', 'moon colony', 'derelict hulk',
  'orbital ring', 'asteroid outpost', 'trade hub', 'mining rig',
];

const LOCATION_NAME_PREFIXES = [
  'Kessel', 'Vantage', 'Ashfall', 'Meridian', 'Drift', 'Halcyon', 'Rust',
  'Obsidian', 'Static', 'Hollow', 'Cinder', 'Wraith', 'Umbral', 'Frost',
  'Sundown', 'Ferro', 'Marrow', 'Vesper', 'Ironside', 'Grieve',
];

const LOCATION_NAME_SUFFIXES = [
  'Station', 'Point', 'Reach', 'Anchorage', 'Hollow', 'Drift', 'Yard',
  'Rest', 'Berth', "'s Folly", 'Terminus', 'Landing', 'Hold', 'Crown',
  'Gate', 'Span',
];

const LOCATION_SIGNATURE_ELEMENTS = [
  'the artificial gravity fails on a slow, unpredictable cycle',
  'a derelict warship is fused into the outer hull, still powered',
  'the local sun bathes everything in a permanent violet twilight',
  'a market runs entirely on barter — no currency accepted',
  'the air recyclers hum a specific chord that locals swear is a warning',
  'a religious shrine occupies the old command deck',
  'the population is entirely nocturnal by local custom',
  'a shipwreck graveyard orbits the site, salvaged endlessly',
  'the water supply is rationed by a lottery system',
  'an AI runs the docking bay and refuses certain ships entry for no stated reason',
  'bioluminescent fungus lights every corridor instead of electricity',
  'the last war left a minefield no one has fully mapped',
  'a black-market cloning operation hides beneath the surface',
  'the atmosphere is breathable but carries a permanent chemical taste',
  'gravity is a third of standard, and everyone moves in long, slow arcs',
  'a single massive vault dominates the settlement, origin unknown',
  'the comms relay picks up a looping distress signal from decades ago',
  'local law is enforced entirely by bounty contract, not police',
  'the settlement is built inside the ribcage of a dead space-whale',
  'time itself seems to run fast near the core, per local folklore',
];

const LOCATION_DANGER = ['Low', 'Moderate', 'High', 'Extreme'];
const LOCATION_RESOURCES = [
  'Ore & Salvage', 'Water & Ice', 'Fuel & Reactants', 'Black-Market Tech',
  'Foodstuffs', 'Rare Minerals', 'Information', 'Weapons', 'Medical Supplies',
];

const RELATIONSHIP_TYPES = [
  'ally', 'rival', 'debtor', 'creditor', 'family', 'former partner',
  'informant', 'employer', 'employee', 'enemy', 'mentor', 'protege',
];

module.exports = {
  NPC_FIRST_NAMES,
  NPC_SURNAMES,
  NPC_CALLSIGN_STYLE_CHANCE,
  NPC_CALLSIGNS,
  NPC_ROLES,
  NPC_TRAITS,
  FACTIONS,
  LOCATION_TYPES,
  LOCATION_NAME_PREFIXES,
  LOCATION_NAME_SUFFIXES,
  LOCATION_SIGNATURE_ELEMENTS,
  LOCATION_DANGER,
  LOCATION_RESOURCES,
  RELATIONSHIP_TYPES,
};
