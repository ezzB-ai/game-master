'use strict';

const fs = require('fs');
const path = require('path');
const { pick } = require('./utils');

const MECHANICS_REF_PATH = path.join(__dirname, '..', 'data', 'mechanics-reference.json');

const HERO_TYPE_KEYS = ['pilot', 'gunner', 'mechanic', 'navigator', 'scientist', 'echo'];
const LIFE_FORM_KEYS = ['geno', 'xill', 'reptoid', 'kitt', 'mecha', 'ghostArmor'];
const LIFE_FORM_DISPLAY = {
  geno: 'Geno', xill: 'Xill', reptoid: 'Reptoid', kitt: 'Kitt', mecha: 'Mecha', ghostArmor: 'Ghost Armor',
};
const STAT_LIST = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const EFFORT_CATEGORIES = ['basic', 'weaponsAndTools', 'guns', 'magicAndEnergy'];
// Accepts common shorthand (e.g. "WEAPONS", "ENERGY") typed at the CLI and
// maps it to the real category keys used everywhere else in this file.
const EFFORT_ALIASES = {
  basic: 'basic',
  weapons: 'weaponsAndTools', tools: 'weaponsAndTools', weaponsandtools: 'weaponsAndTools', weapon: 'weaponsAndTools',
  guns: 'guns', gun: 'guns',
  energy: 'magicAndEnergy', magic: 'magicAndEnergy', magicandenergy: 'magicAndEnergy', magicenergy: 'magicAndEnergy',
};
const BASE_STAT_POINTS = 6;
const BASE_EFFORT_POINTS = 4;
const BASE_HEARTS = 1;
const MAX_STAT = 10;
const MAX_DEFENSE = 10;

let cachedRef = null;
function loadMechanicsRef() {
  if (!cachedRef) {
    cachedRef = JSON.parse(fs.readFileSync(MECHANICS_REF_PATH, 'utf8'));
  }
  return cachedRef;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeKey(input, validKeys, displayNames) {
  if (input === undefined || input === null) return null;
  const target = String(input).trim().toLowerCase().replace(/[\s_-]+/g, '');
  for (const key of validKeys) {
    const keyNormalized = key.toLowerCase();
    const displayNormalized = (displayNames && displayNames[key] || key).toLowerCase().replace(/[\s_-]+/g, '');
    if (target === keyNormalized || target === displayNormalized) return key;
  }
  return undefined; // signals "provided but not found"
}

function normalizeHeroType(input) {
  if (input === undefined || input === null) return null;
  const key = normalizeKey(input, HERO_TYPE_KEYS);
  if (key === undefined) {
    throw new Error(
      `Unknown hero type "${input}". Valid hero types (see mechanics-reference.json warpShellRoles): ` +
      HERO_TYPE_KEYS.map((k) => k[0].toUpperCase() + k.slice(1)).join(', ')
    );
  }
  return key;
}

function normalizeEffortCategory(input) {
  const target = String(input || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (EFFORT_CATEGORIES.includes(target)) return target;
  return EFFORT_ALIASES[target];
}

// Parses "STR=1,DEX=2,CON=3" style CLI input into a plain object with the
// canonical keys, validating key names and integer values along the way.
function parseKeyValuePoints(input, { validKeys, normalizeFn, label }) {
  const result = {};
  if (input === undefined || input === null || input === '') return result;
  const pairs = String(input).split(',').map((s) => s.trim()).filter(Boolean);
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq === -1) {
      throw new Error(`Invalid ${label} entry "${pair}" — expected KEY=VALUE (e.g. "CON=3")`);
    }
    const rawKey = pair.slice(0, eq).trim();
    const rawVal = pair.slice(eq + 1).trim();
    const key = normalizeFn ? normalizeFn(rawKey) : rawKey;
    if (!key || (validKeys && !validKeys.includes(key))) {
      throw new Error(`Unknown ${label} "${rawKey}". Valid: ${validKeys.join(', ')}`);
    }
    const value = Number(rawVal);
    if (!Number.isInteger(value)) {
      throw new Error(`${label} "${rawKey}" must be an integer, got "${rawVal}"`);
    }
    result[key] = value;
  }
  return result;
}

function normalizeLifeForm(input) {
  if (input === undefined || input === null) return null;
  const key = normalizeKey(input, LIFE_FORM_KEYS, LIFE_FORM_DISPLAY);
  if (key === undefined) {
    throw new Error(
      `Unknown life form "${input}". Valid life forms (see mechanics-reference.json warpShellLifeForms): ` +
      LIFE_FORM_KEYS.map((k) => LIFE_FORM_DISPLAY[k]).join(', ')
    );
  }
  return key;
}

// Randomly distribute `total` points across `keys`, each capped at `max`.
// Not a uniform distribution — good enough for flavor NPC generation.
function distributePoints(total, keys, max) {
  const result = Object.fromEntries(keys.map((k) => [k, 0]));
  let remaining = total;
  let guard = total * 50 + 10; // avoid infinite loop if max is too restrictive
  while (remaining > 0 && guard-- > 0) {
    const key = pick(keys);
    if (result[key] < max) {
      result[key] += 1;
      remaining -= 1;
    }
  }
  return result;
}

function parseDefenseBonus(effectText) {
  if (!effectText) return 0;
  const match = String(effectText).match(/\+(\d+)\s*DEFENSE/i);
  return match ? Number(match[1]) : 0;
}

// Static description of each life form's mechanical effect, independent of
// whether the numeric deltas were auto-rolled (NPCs) or entered by hand
// (players) — the fact of "Reptoid grants claw weapons" doesn't change either
// way, only who decided which STAT a Geno's +2 landed on.
const LIFE_FORM_NOTES = {
  geno: 'Geno: +2 to any 1 STAT',
  xill: 'Xill: +1 WIS, innate Create Device ability',
  reptoid: 'Reptoid: claw weapons, can walk on any surface',
  kitt: 'Kitt: +2 DEX',
  mecha: 'Mecha: +1 HEART',
  ghostArmor: 'Ghost Armor: +2 DEFENSE, 1 Ghost Ability (see warpShellLifeForms.ghostArmor.backgrounds)',
};

// Applies a LIFE FORM's mechanical effect. The JSON only stores a human-readable
// "bonus" string (e.g. "+2 DEX"), so the mapping from life form -> concrete
// stat/hearts/defense delta is encoded here rather than parsed, since there
// are only 6 and getting it wrong would silently corrupt generated stats.
function applyLifeForm(block, lifeFormKey) {
  if (!lifeFormKey) return block;
  switch (lifeFormKey) {
    case 'geno': {
      const stat = pick(STAT_LIST);
      block.stats[stat] = clamp(block.stats[stat] + 2, 0, MAX_STAT);
      block.specialTrait = `Geno: +2 ${stat} (adaptable — bonus stat chosen at random for this NPC)`;
      break;
    }
    case 'xill':
      block.stats.WIS = clamp(block.stats.WIS + 1, 0, MAX_STAT);
      block.specialTrait = 'Xill: +1 WIS, innate Create Device ability';
      break;
    case 'reptoid':
      block.specialTrait = 'Reptoid: claw weapons, can walk on any surface';
      break;
    case 'kitt':
      block.stats.DEX = clamp(block.stats.DEX + 2, 0, MAX_STAT);
      block.specialTrait = 'Kitt: +2 DEX';
      break;
    case 'mecha':
      block.hearts += 1;
      block.specialTrait = 'Mecha: +1 HEART';
      break;
    case 'ghostArmor':
      block.defense = clamp(block.defense + 2, 0, MAX_DEFENSE);
      block.specialTrait = 'Ghost Armor: +2 DEFENSE, 1 Ghost Ability (see warpShellLifeForms.ghostArmor.backgrounds)';
      break;
    default:
      break;
  }
  return block;
}

/**
 * Build a full Warp Shell mechanical stat block for an NPC.
 * heroType is one of the 6 player-character archetypes (Pilot/Gunner/Mechanic/
 * Navigator/Scientist/Echo) — distinct from the NPC's flavor `role` (occupation).
 * lifeForm is optional (Geno/Xill/Reptoid/Kitt/Mecha/Ghost Armor).
 */
function buildHeroStatBlock({ heroType, lifeForm } = {}) {
  const heroKey = normalizeHeroType(heroType);
  if (!heroKey) return null;
  const lifeFormKey = normalizeLifeForm(lifeForm);

  const ref = loadMechanicsRef();
  const roleData = ref.warpShellRoles[heroKey];
  if (!roleData) {
    throw new Error(`Hero type "${heroKey}" has no entry under warpShellRoles in mechanics-reference.json.`);
  }

  const stats = distributePoints(BASE_STAT_POINTS, STAT_LIST, MAX_STAT);
  const effortBonuses = distributePoints(BASE_EFFORT_POINTS, EFFORT_CATEGORIES, BASE_EFFORT_POINTS);
  const startingAbility = pick(roleData.startingAbility);
  const startingLoot = pick(roleData.startingLoot);

  const block = {
    heroType: heroKey[0].toUpperCase() + heroKey.slice(1),
    lifeForm: lifeFormKey ? LIFE_FORM_DISPLAY[lifeFormKey] : null,
    hearts: BASE_HEARTS,
    stats,
    effortBonuses,
    defense: 0,
    startingAbility,
    startingLoot,
    specialTrait: null,
  };

  applyLifeForm(block, lifeFormKey);

  // DEFENSE = CON stat + DEFENSE granted by equipped LOOT (Ghost Armor's own
  // +2 is applied separately above, since it comes from the life form, not gear).
  const lootDefense = parseDefenseBonus(startingLoot && startingLoot.effect);
  block.defense = clamp(block.stats.CON + lootDefense + block.defense, 0, MAX_DEFENSE);

  return block;
}

/**
 * Validate a generated stat block against mechanics-reference.json. Returns
 * an array of human-readable violation strings (empty = valid).
 */
function validateHeroStatBlock(npc) {
  const errors = [];
  if (!npc.heroType) return errors;

  const heroKey = normalizeKey(npc.heroType, HERO_TYPE_KEYS);
  if (!heroKey) {
    errors.push(`NPC "${npc.name}": heroType "${npc.heroType}" is not one of ${HERO_TYPE_KEYS.join(', ')}`);
    return errors;
  }
  const ref = loadMechanicsRef();
  const roleData = ref.warpShellRoles[heroKey];

  const lifeFormKey = npc.lifeForm ? normalizeKey(npc.lifeForm, LIFE_FORM_KEYS, LIFE_FORM_DISPLAY) : null;
  if (npc.lifeForm && !lifeFormKey) {
    errors.push(`NPC "${npc.name}": lifeForm "${npc.lifeForm}" is not one of ${LIFE_FORM_KEYS.map((k) => LIFE_FORM_DISPLAY[k]).join(', ')}`);
  }

  // Stats: each in [0, 10], sum matches base points + life form's raw stat bonus
  const lifeFormStatBonus = { geno: 2, xill: 1, kitt: 2, reptoid: 0, mecha: 0, ghostArmor: 0 }[lifeFormKey] || 0;
  const expectedStatSum = BASE_STAT_POINTS + lifeFormStatBonus;
  let statSum = 0;
  for (const stat of STAT_LIST) {
    const value = npc.stats ? npc.stats[stat] : undefined;
    if (typeof value !== 'number' || value < 0 || value > MAX_STAT) {
      errors.push(`NPC "${npc.name}": stat ${stat} (${value}) is outside the valid [0, ${MAX_STAT}] range`);
    } else {
      statSum += value;
    }
  }
  if (statSum !== expectedStatSum) {
    errors.push(`NPC "${npc.name}": stats sum to ${statSum}, expected ${expectedStatSum} (${BASE_STAT_POINTS} base + ${lifeFormStatBonus} life form bonus)`);
  }

  // Effort bonuses: sum to exactly 4, each >= 0
  const effortSum = EFFORT_CATEGORIES.reduce((sum, cat) => sum + ((npc.effortBonuses && npc.effortBonuses[cat]) || 0), 0);
  if (effortSum !== BASE_EFFORT_POINTS) {
    errors.push(`NPC "${npc.name}": EFFORT bonuses sum to ${effortSum}, expected exactly ${BASE_EFFORT_POINTS}`);
  }

  // Hearts: 1, +1 if Mecha
  const expectedHearts = BASE_HEARTS + (lifeFormKey === 'mecha' ? 1 : 0);
  if (npc.hearts !== expectedHearts) {
    errors.push(`NPC "${npc.name}": hearts is ${npc.hearts}, expected ${expectedHearts}`);
  }

  // Starting ability/loot must be one of that role's actual options
  if (roleData) {
    const validAbilities = roleData.startingAbility.map((a) => a.name);
    if (npc.startingAbility && !validAbilities.includes(npc.startingAbility.name)) {
      errors.push(`NPC "${npc.name}": startingAbility "${npc.startingAbility.name}" is not one of ${heroKey}'s options (${validAbilities.join(', ')})`);
    }
    const validLoot = roleData.startingLoot.map((l) => l.name);
    if (npc.startingLoot && !validLoot.includes(npc.startingLoot.name)) {
      errors.push(`NPC "${npc.name}": startingLoot "${npc.startingLoot.name}" is not one of ${heroKey}'s options (${validLoot.join(', ')})`);
    }
  }

  // Defense: 0-10, and matches CON + loot defense + life form defense bonus
  const lootDefense = parseDefenseBonus(npc.startingLoot && npc.startingLoot.effect);
  const lifeFormDefenseBonus = lifeFormKey === 'ghostArmor' ? 2 : 0;
  const conStat = (npc.stats && npc.stats.CON) || 0;
  const expectedDefense = clamp(conStat + lootDefense + lifeFormDefenseBonus, 0, MAX_DEFENSE);
  if (npc.defense !== expectedDefense) {
    errors.push(`NPC "${npc.name}": defense is ${npc.defense}, expected ${expectedDefense} (CON ${conStat} + loot ${lootDefense} + life form ${lifeFormDefenseBonus})`);
  }

  return errors;
}

/**
 * Validate a PLAYER's stat block. Unlike a freshly-rolled NPC, a player
 * character persists and legitimately grows over a campaign — HEARTS and
 * STATS can increase via Milestone Rewards (e.g. "Ever Stronger: +1 to any
 * STAT", or loot that adds a HEART), so this checks absolute rules (the +10
 * STAT/DEFENSE caps, non-negative values, valid hero type/life form, and that
 * the recorded starting ability/loot actually belong to that hero type) but
 * does NOT enforce the day-1 stat/hearts totals the way validateHeroStatBlock
 * does for NPCs.
 */
function validatePlayerStatBlock(player) {
  const errors = [];
  const name = player.name || '(unnamed player)';

  const heroKey = normalizeKey(player.heroType, HERO_TYPE_KEYS);
  if (!heroKey) {
    errors.push(`Player "${name}": heroType "${player.heroType}" is not one of ${HERO_TYPE_KEYS.join(', ')}`);
    return errors;
  }
  const ref = loadMechanicsRef();
  const roleData = ref.warpShellRoles[heroKey];

  const lifeFormKey = player.lifeForm ? normalizeKey(player.lifeForm, LIFE_FORM_KEYS, LIFE_FORM_DISPLAY) : null;
  if (player.lifeForm && !lifeFormKey) {
    errors.push(`Player "${name}": lifeForm "${player.lifeForm}" is not one of ${LIFE_FORM_KEYS.map((k) => LIFE_FORM_DISPLAY[k]).join(', ')}`);
  }

  for (const stat of STAT_LIST) {
    const value = player.stats ? player.stats[stat] : undefined;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_STAT) {
      errors.push(`Player "${name}": stat ${stat} (${value}) is outside the valid [0, ${MAX_STAT}] range`);
    }
  }

  for (const cat of EFFORT_CATEGORIES) {
    const value = player.effortBonuses ? player.effortBonuses[cat] : undefined;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      errors.push(`Player "${name}": EFFORT bonus "${cat}" (${value}) must be a non-negative integer`);
    }
  }

  if (typeof player.hearts !== 'number' || !Number.isInteger(player.hearts) || player.hearts < 1) {
    errors.push(`Player "${name}": hearts (${player.hearts}) must be a positive integer`);
  }

  if (typeof player.defense !== 'number' || !Number.isInteger(player.defense) || player.defense < 0 || player.defense > MAX_DEFENSE) {
    errors.push(`Player "${name}": defense (${player.defense}) is outside the valid [0, ${MAX_DEFENSE}] range`);
  }

  if (roleData) {
    const validAbilities = roleData.startingAbility.map((a) => a.name);
    if (player.startingAbility && !validAbilities.includes(player.startingAbility.name)) {
      errors.push(`Player "${name}": startingAbility "${player.startingAbility.name}" is not one of ${heroKey}'s character-creation options (${validAbilities.join(', ')})`);
    }
    const validLoot = roleData.startingLoot.map((l) => l.name);
    if (player.startingLoot && !validLoot.includes(player.startingLoot.name)) {
      errors.push(`Player "${name}": startingLoot "${player.startingLoot.name}" is not one of ${heroKey}'s character-creation options (${validLoot.join(', ')})`);
    }
  }

  return errors;
}

module.exports = {
  HERO_TYPE_KEYS,
  LIFE_FORM_KEYS,
  LIFE_FORM_DISPLAY,
  LIFE_FORM_NOTES,
  STAT_LIST,
  EFFORT_CATEGORIES,
  MAX_STAT,
  MAX_DEFENSE,
  clamp,
  loadMechanicsRef,
  normalizeHeroType,
  normalizeLifeForm,
  normalizeEffortCategory,
  parseKeyValuePoints,
  parseDefenseBonus,
  buildHeroStatBlock,
  validateHeroStatBlock,
  validatePlayerStatBlock,
};
