'use strict';

const { makeId, normalize } = require('./utils');
const {
  STAT_LIST, EFFORT_CATEGORIES, MAX_STAT, MAX_DEFENSE, clamp, LIFE_FORM_DISPLAY, LIFE_FORM_NOTES,
  loadMechanicsRef, normalizeHeroType, normalizeLifeForm, normalizeEffortCategory,
  parseKeyValuePoints,
} = require('./statBlock');

function findPlayerByNameOrId(players, nameOrId) {
  const key = normalize(nameOrId);
  return players.find((p) => normalize(p.id) === key) ||
    players.find((p) => normalize(p.name) === key) ||
    players.find((p) => normalize(p.name).includes(key));
}

function parseStats(input) {
  const parsed = parseKeyValuePoints(input, { validKeys: STAT_LIST, label: 'stat' });
  const stats = Object.fromEntries(STAT_LIST.map((s) => [s, 0]));
  Object.assign(stats, parsed);
  for (const stat of STAT_LIST) {
    if (stats[stat] < 0 || stats[stat] > MAX_STAT) {
      throw new Error(`Stat ${stat} (${stats[stat]}) must be within [0, ${MAX_STAT}]`);
    }
  }
  return stats;
}

function parseEffortBonuses(input) {
  const parsed = parseKeyValuePoints(input, {
    validKeys: EFFORT_CATEGORIES,
    normalizeFn: normalizeEffortCategory,
    label: 'EFFORT category',
  });
  const bonuses = Object.fromEntries(EFFORT_CATEGORIES.map((c) => [c, 0]));
  Object.assign(bonuses, parsed);
  for (const cat of EFFORT_CATEGORIES) {
    if (bonuses[cat] < 0) {
      throw new Error(`EFFORT bonus "${cat}" (${bonuses[cat]}) cannot be negative`);
    }
  }
  return bonuses;
}

// Unlike parseStats/parseEffortBonuses (which fill in 0 for every unspecified
// key, correct for a fresh `add player`), these return ONLY the keys the
// caller actually typed — used for `edit player` so an update like
// --stats "CON=0" doesn't zero out every other stat via Object.assign.
function parsePartialStats(input) {
  const parsed = parseKeyValuePoints(input, { validKeys: STAT_LIST, label: 'stat' });
  for (const [stat, value] of Object.entries(parsed)) {
    if (value < 0 || value > MAX_STAT) throw new Error(`Stat ${stat} (${value}) must be within [0, ${MAX_STAT}]`);
  }
  return parsed;
}

function parsePartialEffortBonuses(input) {
  const parsed = parseKeyValuePoints(input, {
    validKeys: EFFORT_CATEGORIES,
    normalizeFn: normalizeEffortCategory,
    label: 'EFFORT category',
  });
  for (const [cat, value] of Object.entries(parsed)) {
    if (value < 0) throw new Error(`EFFORT bonus "${cat}" (${value}) cannot be negative`);
  }
  return parsed;
}

// Matches a free-typed ability/loot name against a hero type's real
// character-creation options (case-insensitive), so "energy star" resolves
// to the exact { name, effect } entry from mechanics-reference.json.
function resolveRoleOption(roleOptions, input, label, heroKey) {
  if (input === undefined) return null;
  const key = normalize(input);
  const match = roleOptions.find((opt) => normalize(opt.name) === key);
  if (!match) {
    throw new Error(
      `"${input}" is not one of ${heroKey}'s ${label} options: ${roleOptions.map((o) => o.name).join(', ')}`
    );
  }
  return match;
}

function parseGearEntry(input) {
  const idx = String(input).indexOf(':');
  if (idx === -1) return { name: String(input).trim(), effect: '' };
  return { name: input.slice(0, idx).trim(), effect: input.slice(idx + 1).trim() };
}

/**
 * Build a new player character from explicit CLI flags. Nothing here is
 * randomly rolled — a PC's stats are the real choices a person made at the
 * table, so every mechanical field must be supplied (or explicitly defaults
 * to 0 / none) rather than generated.
 */
function buildPlayer({ name, playerName, pronouns, heroType, lifeForm, faction, stats, effort, hearts, defense, ability, loot, notes }) {
  if (!name) throw new Error('Player character name is required.');
  const heroKey = normalizeHeroType(heroType);
  if (!heroKey) throw new Error('--hero-type is required when adding a player (Pilot/Gunner/Mechanic/Navigator/Scientist/Echo).');
  const lifeFormKey = normalizeLifeForm(lifeForm);

  const ref = loadMechanicsRef();
  const roleData = ref.warpShellRoles[heroKey];
  const heroDisplay = heroKey[0].toUpperCase() + heroKey.slice(1);

  const parsedStats = parseStats(stats);
  const parsedEffort = parseEffortBonuses(effort);
  const resolvedAbility = ability !== undefined ? resolveRoleOption(roleData.startingAbility, ability, 'startingAbility', heroDisplay) : null;
  const resolvedLoot = loot !== undefined ? resolveRoleOption(roleData.startingLoot, loot, 'startingLoot', heroDisplay) : null;

  const parsedHearts = hearts !== undefined ? Number(hearts) : 1;
  const parsedDefense = defense !== undefined ? Number(defense) : clamp(parsedStats.CON, 0, MAX_DEFENSE);
  if (!Number.isInteger(parsedHearts) || parsedHearts < 1) throw new Error(`--hearts must be a positive integer, got "${hearts}"`);
  if (!Number.isInteger(parsedDefense) || parsedDefense < 0 || parsedDefense > MAX_DEFENSE) {
    throw new Error(`--defense must be within [0, ${MAX_DEFENSE}], got "${defense}"`);
  }

  const now = new Date().toISOString();
  return {
    id: makeId('player'),
    name,
    playerName: playerName || null,
    pronouns: pronouns || null,
    heroType: heroDisplay,
    lifeForm: lifeFormKey ? LIFE_FORM_DISPLAY[lifeFormKey] : null,
    specialTrait: lifeFormKey ? LIFE_FORM_NOTES[lifeFormKey] : null,
    faction: faction || null,
    hearts: parsedHearts,
    stats: parsedStats,
    effortBonuses: parsedEffort,
    defense: parsedDefense,
    startingAbility: resolvedAbility,
    startingLoot: resolvedLoot,
    gear: [],
    milestones: [],
    xp: 0,
    coin: 0,
    heroCoin: false,
    notes: notes || '',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Apply partial edits to an existing player (mutates and returns it).
 * Every field is set explicitly by the caller — this never re-derives a
 * value (e.g. DEFENSE) automatically, since ongoing play (loot, milestones)
 * can move these numbers in ways this tool doesn't try to model for you.
 */
function applyPlayerEdits(player, flags) {
  if (flags.stats !== undefined) Object.assign(player.stats, parsePartialStats(flags.stats));
  if (flags.effort !== undefined) Object.assign(player.effortBonuses, parsePartialEffortBonuses(flags.effort));
  if (flags.hearts !== undefined) {
    const v = Number(flags.hearts);
    if (!Number.isInteger(v) || v < 1) throw new Error(`--hearts must be a positive integer, got "${flags.hearts}"`);
    player.hearts = v;
  }
  if (flags['add-hearts'] !== undefined) {
    const v = Number(flags['add-hearts']);
    if (!Number.isInteger(v)) throw new Error(`--add-hearts must be an integer, got "${flags['add-hearts']}"`);
    player.hearts = Math.max(1, player.hearts + v);
  }
  if (flags.defense !== undefined) {
    const v = Number(flags.defense);
    if (!Number.isInteger(v) || v < 0 || v > MAX_DEFENSE) throw new Error(`--defense must be within [0, ${MAX_DEFENSE}], got "${flags.defense}"`);
    player.defense = v;
  }
  if (flags.faction !== undefined) player.faction = flags.faction;
  if (flags.player !== undefined) player.playerName = flags.player;
  if (flags.pronouns !== undefined) player.pronouns = flags.pronouns;
  if (flags.notes !== undefined) player.notes = flags.notes;
  if (flags['life-form'] !== undefined) {
    const key = normalizeLifeForm(flags['life-form']);
    player.lifeForm = key ? LIFE_FORM_DISPLAY[key] : null;
  }
  if (flags.ability !== undefined || flags.loot !== undefined) {
    const ref = loadMechanicsRef();
    const heroKey = normalizeHeroType(player.heroType);
    const roleData = ref.warpShellRoles[heroKey];
    if (flags.ability !== undefined) player.startingAbility = resolveRoleOption(roleData.startingAbility, flags.ability, 'startingAbility', player.heroType);
    if (flags.loot !== undefined) player.startingLoot = resolveRoleOption(roleData.startingLoot, flags.loot, 'startingLoot', player.heroType);
  }
  if (flags.gear !== undefined) {
    const entries = Array.isArray(flags.gear) ? flags.gear : [flags.gear];
    entries.forEach((g) => player.gear.push(parseGearEntry(g)));
  }
  if (flags.milestone !== undefined) {
    const entries = Array.isArray(flags.milestone) ? flags.milestone : [flags.milestone];
    entries.forEach((m) => player.milestones.push(m));
  }
  if (flags.xp !== undefined) player.xp = Number(flags.xp);
  if (flags['add-xp'] !== undefined) player.xp = (player.xp || 0) + Number(flags['add-xp']);
  if (flags.coin !== undefined) player.coin = Number(flags.coin);
  if (flags['add-coin'] !== undefined) player.coin = (player.coin || 0) + Number(flags['add-coin']);
  // A player can only hold 1 HERO COIN at a time (mechanics-reference.json
  // gmToolkit.rewards.heroCoin) — it's a boolean, not a count.
  if (flags['award-hero-coin'] !== undefined) player.heroCoin = true;
  if (flags['redeem-hero-coin'] !== undefined) player.heroCoin = false;
  if (flags['hero-coin'] !== undefined) player.heroCoin = String(flags['hero-coin']).toLowerCase() === 'true';

  player.updatedAt = new Date().toISOString();
  return player;
}

module.exports = { findPlayerByNameOrId, buildPlayer, applyPlayerEdits, parseGearEntry };
