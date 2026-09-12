'use strict';

const {
  NPC_FIRST_NAMES, NPC_SURNAMES, NPC_CALLSIGNS, NPC_CALLSIGN_STYLE_CHANCE,
  NPC_ROLES, NPC_TRAITS, NPC_SPECIES, FACTIONS,
} = require('./data/wordbanks');
const { pick, pickMany, makeId, normalize } = require('./utils');
const { buildHeroStatBlock } = require('./statBlock');

const MAX_ATTEMPTS = 100;

// Guides how often each rarity tier is picked (Common/Uncommon/Rare), not a
// hard requirement — matches the ~60/30/10 split the species list itself
// was written to.
const SPECIES_RARITY_WEIGHTS = { Common: 60, Uncommon: 30, Rare: 10 };

function randomSpecies() {
  const totalWeight = Object.values(SPECIES_RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let rarity = 'Common';
  for (const [tier, weight] of Object.entries(SPECIES_RARITY_WEIGHTS)) {
    if (roll < weight) { rarity = tier; break; }
    roll -= weight;
  }
  const pool = NPC_SPECIES.filter((s) => s.rarity === rarity);
  return pick(pool.length ? pool : NPC_SPECIES);
}

function randomName() {
  const first = pick(NPC_FIRST_NAMES);
  if (Math.random() < NPC_CALLSIGN_STYLE_CHANCE) {
    return `${first} ${pick(NPC_CALLSIGNS)}`;
  }
  return `${first} ${pick(NPC_SURNAMES)}`;
}

/**
 * Generate a new NPC that doesn't collide with existing registry entries.
 * Uniqueness is enforced on: exact name match, and (role + faction + location)
 * combo match, since two "Smugglers" with the same faction and haunt read as
 * duplicates at the table even with different names.
 * @param {object} opts
 * @param {Array} existingNpcs
 * @param {object} [overrides] - force specific fields (role, faction, location).
 *   `heroType` (Pilot/Gunner/Mechanic/Navigator/Scientist/Echo) and `lifeForm`
 *   (Geno/Xill/Reptoid/Kitt/Mecha/Ghost Armor) are independent of `role`: role
 *   is flavor occupation (Bar Owner, Smuggler, ...), heroType is an optional
 *   mechanical stat block for NPCs who might actually fight or be played.
 */
function generateNpc(existingNpcs, overrides = {}) {
  const existingNames = new Set(existingNpcs.map((n) => normalize(n.name)));
  const existingCombos = new Set(
    existingNpcs.map((n) => `${normalize(n.role)}|${normalize(n.faction)}|${normalize(n.location)}`)
  );

  let npc = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const name = randomName();
    if (existingNames.has(normalize(name))) continue;

    const role = overrides.role || pick(NPC_ROLES);
    const faction = overrides.faction || pick(FACTIONS);
    const location = overrides.location || null;
    const combo = `${normalize(role)}|${normalize(faction)}|${normalize(location)}`;
    if (existingCombos.has(combo)) continue;

    const traits = pickMany(NPC_TRAITS, 2);
    const species = overrides.species
      ? (NPC_SPECIES.find((s) => normalize(s.name) === normalize(overrides.species)) || { name: overrides.species })
      : randomSpecies();

    npc = {
      id: makeId('npc'),
      name,
      role,
      species: species.name,
      traits,
      location,
      faction,
      relationships: [],
      notes: '',
      createdAt: new Date().toISOString(),
    };

    if (overrides.heroType) {
      Object.assign(npc, buildHeroStatBlock({ heroType: overrides.heroType, lifeForm: overrides.lifeForm }));
    }
    break;
  }

  if (!npc) {
    throw new Error(
      `Could not generate a unique NPC after ${MAX_ATTEMPTS} attempts. ` +
      `The registry may be saturated for the given constraints — widen the word banks or relax overrides.`
    );
  }

  return npc;
}

module.exports = { generateNpc, randomName, randomSpecies };
