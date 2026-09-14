'use strict';

const {
  NPC_FIRST_NAMES, NPC_SURNAMES, NPC_CALLSIGNS, NPC_CALLSIGN_STYLE_CHANCE,
  NPC_ROLES, NPC_TRAITS, NPC_SPECIES, FACTIONS,
} = require('./data/wordbanks');
const { LIFE_FORM_GENDERS, NPC_SPECIES_GENDERS } = require('./data/genders');
const { pick, pickMany, pickWeighted, makeId, normalize } = require('./utils');
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

// Picks a gender/pronoun for a species/life-form name. Handles The Unbound
// Choir's special case: its "Host's Own" option means the drone-host is an
// ordinary individual of some OTHER species, so its pronoun is borrowed from
// a random different species' own gender table rather than being fixed.
function randomGender(kindName, table) {
  const entry = table[kindName];
  if (!entry) return null;
  const choice = pickWeighted(entry.genders);
  if (choice.label === "Host's Own") {
    const otherNames = Object.keys(NPC_SPECIES_GENDERS).filter((n) => n !== kindName);
    const hostSpecies = pick(otherNames);
    const hostChoice = randomGender(hostSpecies, NPC_SPECIES_GENDERS);
    return hostChoice ? { ...hostChoice, label: `Host's Own (${hostChoice.label}, ${hostSpecies})` } : null;
  }
  return { label: choice.label, pronouns: choice.pronouns };
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
 *   When a lifeForm is present, it IS the NPC's species — the background
 *   NPC_SPECIES pool is not also layered on top (a Gunner/Reptoid isn't also
 *   randomly a Corvane).
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

    const heroBlock = overrides.heroType
      ? buildHeroStatBlock({ heroType: overrides.heroType, lifeForm: overrides.lifeForm })
      : null;

    let speciesName;
    let genderChoice;
    if (heroBlock && heroBlock.lifeForm) {
      speciesName = heroBlock.lifeForm;
      genderChoice = randomGender(heroBlock.lifeForm, LIFE_FORM_GENDERS);
    } else {
      const species = overrides.species
        ? (NPC_SPECIES.find((s) => normalize(s.name) === normalize(overrides.species)) || { name: overrides.species })
        : randomSpecies();
      speciesName = species.name;
      genderChoice = randomGender(species.name, NPC_SPECIES_GENDERS);
    }

    npc = {
      id: makeId('npc'),
      name,
      role,
      species: speciesName,
      gender: genderChoice ? genderChoice.label : null,
      pronouns: genderChoice ? genderChoice.pronouns : null,
      traits,
      location,
      faction,
      relationships: [],
      notes: '',
      createdAt: new Date().toISOString(),
    };

    if (heroBlock) Object.assign(npc, heroBlock);
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

module.exports = { generateNpc, randomName, randomSpecies, randomGender };
