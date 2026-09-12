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

// Background NPC species — distinct from the 6 playable Warp Shell LIFE FORMS
// (Geno/Xill/Reptoid/Kitt/Mecha/Ghost Armor) and from Rax/Xevosian/Zurin.
// `rarity` guides encounter design and weights random selection in
// npcGenerator.js (Common/Uncommon/Rare), and isn't stored on individual NPCs.
const NPC_SPECIES = [
  {
    name: 'Drommel',
    description: "Barrel-bodied, thick-hided laborers whose skin cures into leather-like plates as they age, worn as a visible record of decades on the job. Organized into rigid seniority guilds that outlasted the Imperium's collapse entirely intact. Ubiquitous on any station with heavy freight to move.",
    rarity: 'Common',
    archetypes: ['Dockhand', 'Freight Foreman', 'Union Rep'],
    interactionStyle: 'Methodical and unbothered by chaos; will quote you a guild rate before acknowledging an emergency.',
    settingNote: 'Cargo bays, freight elevators, dockworker guild halls',
  },
  {
    name: 'Skitterkin',
    description: "Small, many-legged scavengers that nest in wall cavities and ductwork, technically tenants on every ship they've ever infested. Sell salvaged wiring and parts back to the crew that unknowingly hosts them, and will negotiate rent in the form of not chewing through anything vital.",
    rarity: 'Common',
    archetypes: ['Scrap Broker', 'Informal Cargo Inspector', 'Stowaway'],
    interactionStyle: 'Transactional to the point of pettiness; keeps scrupulous mental tabs on every favor owed.',
    settingNote: 'Ship interiors, wall vents, scrapyards',
  },
  {
    name: 'Vondu',
    description: "Broad, moist-skinned amphibians who bargain through a ritualized croaking cadence that outsiders find impossible to fake convincingly. Their trade posts are always built near a station's water reclamation systems, which they treat as sacred infrastructure rather than plumbing.",
    rarity: 'Common',
    archetypes: ['Trader', 'Water Reclamation Tech', 'Hydroponics Broker'],
    interactionStyle: 'Warm once the ritual greeting is completed correctly; visibly offended if you rush it.',
    settingNote: 'Hydroponic bays, water reclamation districts, wet markets',
  },
  {
    name: 'Ashgrub',
    description: 'Pale, blind burrowers with skin sensitive enough to read vibration through solid rock. Generations of asteroid-belt mining work left them nearly voiceless — they communicate mostly through tapped rhythms on metal, a code most outsiders never fully learn.',
    rarity: 'Common',
    archetypes: ['Miner', 'Tunnel Guide', 'Structural Inspector'],
    interactionStyle: 'Taciturn and literal; distrusts anyone who talks more than they work.',
    settingNote: 'Asteroid mines, derelict hull interiors, maintenance crawlspaces',
  },
  {
    name: 'Corvane',
    description: "Sharp-eyed, crow-like avians with an open fondness for anything reflective, which they'll happily trade information for. Their flocks maintain an informal gossip network spanning entire trade routes, making them the closest thing the sector has to a free press.",
    rarity: 'Common',
    archetypes: ['Informant', 'Courier', 'Market Scavenger'],
    interactionStyle: 'Chatty and opportunistic; information is currency, and they know it.',
    settingNote: 'Markets, spaceport concourses, cantina rafters',
  },
  {
    name: 'Thistlewrought',
    description: "Slow-moving, photosynthetic humanoids with bark-like skin that shifts color with the season, or with the station's grow-light cycle when there is no season to speak of. They speak in unhurried, complete sentences and are physically incapable of being rushed.",
    rarity: 'Common',
    archetypes: ['Hydroponic Technician', 'Gardener', 'Life-Support Engineer'],
    interactionStyle: 'Patient to a fault; will finish their thought regardless of the emergency happening around them.',
    settingNote: 'Hydroponic decks, station greenhouses, life-support cores',
  },
  {
    name: 'Muckrender',
    description: 'Heavyset amphibian-mammal hybrids built for swamp worlds that mostly no longer exist for them to return to. Their size and even temperament make them natural bouncers, though they take genuine offense at being asked to actually fight rather than just stand there.',
    rarity: 'Common',
    archetypes: ['Bouncer', 'Bodyguard', 'Cargo Muscle'],
    interactionStyle: 'Gruff but fundamentally fair; will warn you twice before doing anything about it.',
    settingNote: 'Cantina doors, cargo checkpoints, black-market fronts',
  },
  {
    name: 'Bellowfin',
    description: "Enormous, whale-like beings who live out their lives inside modified water-filled freighters, speaking through bio-sonar translated into halting mechanical speech. Long-haul trade routes are practically theirs by tradition — nobody else wants a six-month haul, and they genuinely don't mind it.",
    rarity: 'Common',
    archetypes: ['Freight Hauler', 'Long-Route Captain', 'Deep-Space Courier'],
    interactionStyle: 'Slow to respond, unbothered by delay; thinks in schedules measured in months.',
    settingNote: 'Long-haul freighters, deep-space trade lanes, cargo docks',
  },
  {
    name: 'Ratlin',
    description: "Small, quick, fur-covered scrappers found stowed away on essentially every vessel in the sector, whether invited or not. What they lack in size they make up for in an uncanny ability to know exactly which panel to pry open to find something worth selling.",
    rarity: 'Common',
    archetypes: ['Stowaway', 'Pickpocket', 'Salvager'],
    interactionStyle: 'Quick-talking and opportunistic; will apologize sincerely while still pocketing your credits.',
    settingNote: 'Cargo holds, ventilation systems, black markets',
  },
  {
    name: 'Duskwing',
    description: "Bat-winged nocturnal flyers who navigate by a soft internal clicking most other species can't consciously hear. Bright station lighting genuinely pains them, so they cluster in the dimmer, cheaper districts and take work that keeps them there.",
    rarity: 'Common',
    archetypes: ['Courier', 'Night-Shift Worker', 'Message Runner'],
    interactionStyle: 'Skittish in bright or crowded spaces; far more at ease and talkative in the dark.',
    settingNote: 'Low-light districts, night markets, unlit maintenance decks',
  },
  {
    name: 'Grael',
    description: "Stocky, grey-skinned descendants of an indentured mining caste bred by the old Imperium for asteroid work and never fully released from it even after the collapse. They keep working the same jobs out of habit and necessity, with a resentment toward authority they rarely bother voicing anymore.",
    rarity: 'Common',
    archetypes: ['Dockworker', 'Miner', 'Demolitions Hand'],
    interactionStyle: 'Quietly pragmatic; complies with orders while making it clear they are only doing so for the pay.',
    settingNote: 'Mining rigs, cargo yards, salvage outposts',
  },
  {
    name: 'Sable Moth',
    description: "Moth-winged humanoids whose wings shed a fine dust that induces mild, dreamlike hallucination in anyone who disturbs it too much. They've built a modest trade out of exactly that, selling curated 'sittings' in dim cantina backrooms to anyone looking to see something they can't quite explain later.",
    rarity: 'Common',
    archetypes: ['Cantina Entertainer', 'Dream Dealer', 'Fortune Teller'],
    interactionStyle: 'Dreamy and evasive; answers questions with something adjacent to what you actually asked.',
    settingNote: 'Cantina backrooms, market stalls, dim entertainment districts',
  },
  {
    name: 'Ironhide',
    description: "Broad, thick-plated brutes whose natural armor shrugs off small-arms fire well enough that most people don't bother testing it twice. Slow to anger and slower to move, they're valued more for the deterrent of their presence than anything they actually have to do.",
    rarity: 'Common',
    archetypes: ['Mercenary Muscle', 'Bodyguard', 'Debt Collector'],
    interactionStyle: 'Calm and unhurried; violence is a last resort mostly because it is rarely necessary.',
    settingNote: 'Mercenary camps, debt-collection fronts, dockside security posts',
  },
  {
    name: 'Wrenfolk',
    description: 'Small, dexterous, four-armed tinkerers who narrate their own work out loud constantly, whether or not anyone is listening. Their hands move faster than their mouths, which is saying something, and most ships in the sector have at least one part held together by uncredited Wrenfolk ingenuity.',
    rarity: 'Common',
    archetypes: ['Mechanic', 'Engineer', 'Salvage Fabricator'],
    interactionStyle: 'Warm, talkative, and easily distracted by an interesting problem mid-conversation.',
    settingNote: 'Repair bays, engineering decks, salvage yards',
  },
  {
    name: 'Cindergrass',
    description: "Ash-grey nomadic herders descended from a colony world scorched in an old resource war, now drifting between frontier outposts trading livestock and protein cultures. Deals struck with a Cindergrass are absolute — breaking one is treated as a form of self-erasure within their culture.",
    rarity: 'Common',
    archetypes: ['Livestock Trader', 'Frontier Herder', 'Caravan Guard'],
    interactionStyle: 'Wary of strangers at first contact, but rigidly, almost ceremonially honest once a deal is struck.',
    settingNote: 'Frontier outposts, trade caravans, agricultural stations',
  },
  {
    name: 'Volterrai',
    description: "Translucent, crystalline humanoids whose homeworld's core was hollowed out by Xevosian mining operations and now slowly disintegrates behind them. Rather than a single dramatic exodus, their diaspora has been a decades-long trickle of families quietly leaving before the next collapse.",
    rarity: 'Uncommon',
    archetypes: ['Academic', 'Engineer', 'Archivist'],
    interactionStyle: 'Guarded with strangers, genuinely warm to anyone who asks about their homeworld with real interest.',
    settingNote: 'Stations with university or archive districts, refugee enclaves',
  },
  {
    name: 'Umbral Kin',
    description: 'Living shadow-beings bound permanently to a single physical object — a blade, a locket, a battered toolbox — outside of which they cannot exist for long. Whoever holds their anchor effectively holds them, which has made Umbral Kin both prized bodyguards and a grim, quietly-traded commodity.',
    rarity: 'Uncommon',
    archetypes: ['Bodyguard', 'Assassin-for-Hire', 'Anchor Smuggler'],
    interactionStyle: 'Unsettlingly calm and formal; loyalty is absolute to whoever currently holds their anchor, not negotiable otherwise.',
    settingNote: 'Black markets, private security contracts, smuggler dens',
  },
  {
    name: 'Choralite',
    description: 'Colonial organisms — thousands of tiny linked polyps holding a rough humanoid shape — who communicate in layered harmonic humming rather than speech. They tend to respond to the feeling behind a question rather than its literal wording, which makes them excellent healers and maddening witnesses.',
    rarity: 'Uncommon',
    archetypes: ['Healer', 'Musician', 'Mediator'],
    interactionStyle: 'Empathic but obliquely alien; may answer the question you meant instead of the one you asked.',
    settingNote: 'Med bays, cantina stages, mediation halls',
  },
  {
    name: 'Palewrack',
    description: "Bioluminescent scavengers who evolved in the gutted husks of derelict ships, their blind eyes replaced by light-sensing patches across pale skin. They claim to be able to 'read' a wreck's history through touch, and enough of their salvage finds pan out that most crews pay for the service without asking how it works.",
    rarity: 'Uncommon',
    archetypes: ['Wreck Guide', 'Salvage Diviner', 'Derelict Scout'],
    interactionStyle: 'Eerie and soft-spoken; genuinely helpful, for a price, and never quite explains their method.',
    settingNote: 'Derelict hulks, shipbreaking yards, salvage guild offices',
  },
  {
    name: 'Husk-Bonded',
    description: 'Human-scale hosts permanently fused to a semi-sentient exosuit grown from a defunct Imperium bio-weapons program, host and passenger sharing one body but not always one opinion. Conversations with a Husk-Bonded sometimes pause mid-sentence while the two halves visibly argue about what to say next.',
    rarity: 'Uncommon',
    archetypes: ['Smuggler', 'Soldier-for-Hire', 'Black-Market Enforcer'],
    interactionStyle: "Inconsistent by nature; you're never quite sure which half of them you're negotiating with.",
    settingNote: 'Smuggler dens, mercenary contracts, black-market fronts',
  },
  {
    name: 'Tallowkin',
    description: "Tall, waxy-skinned beings whose features slowly melt and reform over years, so a Tallowkin's face today may bear little resemblance to the one from a decade ago. This slow-motion identity shift has made them the sector's most trusted (and most feared) forgers and identity brokers.",
    rarity: 'Uncommon',
    archetypes: ['Forger', 'Identity Broker', 'Information Fence'],
    interactionStyle: 'Smooth and hard to read; treats their own shifting face as simply a professional asset.',
    settingNote: 'Forger dens, black markets, immigration/customs blind spots',
  },
  {
    name: 'Rin-Kaathe',
    description: "Descendants of an Imperium prison-world population abandoned outright when the Xevos war cut off resupply, marked by ritual scarification denoting their ancestors' original crime-caste. Generations of improvising locks, restraints, and weapons out of nothing have made them exceptional at getting through — or out of — anything built to hold someone.",
    rarity: 'Uncommon',
    archetypes: ['Locksmith', 'Escape Artist', 'Prison-Tech Fabricator'],
    interactionStyle: 'Bitter toward anything resembling authority, but pragmatic and reliable once a fair price is on the table.',
    settingNote: 'Black markets, former prison colonies, salvage underworlds',
  },
  {
    name: 'Mirrorkind',
    description: "Near-perfect mimics capable of copying a person's appearance after enough prolonged contact, though mannerisms and small habits never quite transfer. Rare enough that most people have never knowingly met one — and unnerved enough by the idea that they'd rather not find out they have.",
    rarity: 'Rare',
    archetypes: ['Con Artist', 'Spy', 'Bounty Target'],
    interactionStyle: 'Convincing on the surface, subtly off underneath; rarely trusted long enough to form lasting ties.',
    settingNote: 'High-security stations, espionage circles, bounty boards',
  },
  {
    name: 'Voidborn',
    description: 'Vacuum-adapted beings who gestate their young in biological pressure-sacs exposed to open space, a trait that makes shipboard life feel cramped and unnatural to them. What few surviving breeding colonies remain produce hazardous-salvage specialists who work open hull breaches without a suit, entirely unbothered by the void that would kill anyone else in the room.',
    rarity: 'Rare',
    archetypes: ['Hazard Salvager', 'Hull Breach Specialist', 'Deep-Void Scout'],
    interactionStyle: 'Alien and taciturn; unnervingly calm in situations that should be lethal to them and everyone nearby.',
    settingNote: 'Derelict hulks, hull breaches, deep-void salvage operations',
  },
  {
    name: 'The Unbound Choir',
    description: "A single ancient hive-consciousness whose 'bodies' are scattered, non-contiguous drone-hosts spread across multiple star systems — each drone lives an ordinary life and believes itself an individual until the Choir speaks through it without warning. Nobody knows how many hosts it has, including, likely, the Choir itself.",
    rarity: 'Rare',
    archetypes: ['Oracle', 'Unwitting Informant', 'Cult Figure'],
    interactionStyle: 'Ordinary and unaware most of the time; deeply strange and purposeful in the rare moments the Choir takes over.',
    settingNote: "Anywhere, unpredictably — a host doesn't know it's a host until it happens",
  },
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
  NPC_SPECIES,
  FACTIONS,
  LOCATION_TYPES,
  LOCATION_NAME_PREFIXES,
  LOCATION_NAME_SUFFIXES,
  LOCATION_SIGNATURE_ELEMENTS,
  LOCATION_DANGER,
  LOCATION_RESOURCES,
  RELATIONSHIP_TYPES,
};
