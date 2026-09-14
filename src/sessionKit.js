'use strict';

const fs = require('fs');
const path = require('path');
const storage = require('./storage');
const { generateNpc } = require('./npcGenerator');
const { generateLocation } = require('./locationGenerator');
const { computePartyPowerLevel } = require('./powerLevel');
const { generateEnemies, rollLoot } = require('./encounterEngine');
const { findPlayerByNameOrId } = require('./players');
const { pick } = require('./utils');

const KIT_DIR = path.join(__dirname, '..', 'session-prep');

const DIFFICULTY_OVERRIDE = { EASY: 'Early', MEDIUM: 'Mid', HARD: 'Late' };

/**
 * Build a full session-prep kit: locations, NPCs, enemies, loot, faction
 * state, a party snapshot, and campaign hooks — everything a DM needs pulled
 * from real, persistent campaign state rather than invented fresh each time.
 * Newly generated NPCs/locations are persisted to the normal registries
 * (same as running `generate npc`/`generate location` directly).
 *
 * `playerRefs` defaults to `null`, meaning "the whole roster" — same
 * convention as `session prep`. Pass an explicit array of names/ids (even a
 * single one) to run with only some players present — a partial-attendance
 * session, or a solo test run. Party power level, enemy/loot scaling, and
 * the party snapshot all reflect only the selected subset.
 */
function buildSessionKit({ sessionNumber, factionFocus, difficulty, playerRefs = null } = {}) {
  const npcsData = storage.load('npcs');
  const locationsData = storage.load('locations');
  const allPlayers = storage.load('players').players;
  const campaignState = storage.load('campaignState');
  const factionStates = storage.load('factionStates');

  let players;
  if (playerRefs === null) {
    players = allPlayers;
  } else {
    players = [];
    const missing = [];
    for (const ref of playerRefs) {
      const player = findPlayerByNameOrId(allPlayers, ref);
      if (player) players.push(player);
      else missing.push(ref);
    }
    if (missing.length) {
      throw new Error(
        `Could not resolve player reference(s): ${missing.join(', ')}. ` +
        `Known players: ${allPlayers.map((p) => p.name).join(', ')}`
      );
    }
    if (!players.length) {
      throw new Error('No players selected for this session kit — pass at least one --player, or omit --player for the whole roster.');
    }
  }

  const computedPower = computePartyPowerLevel(players);
  const powerId = difficulty && DIFFICULTY_OVERRIDE[difficulty.toUpperCase()]
    ? DIFFICULTY_OVERRIDE[difficulty.toUpperCase()]
    : computedPower.powerId;

  // 5 locations, themed loosely by reusing the existing faction/type generators.
  const locations = [];
  for (let i = 0; i < 5; i++) {
    const loc = generateLocation(locationsData.locations, factionFocus ? { faction: factionFocus } : {});
    locationsData.locations.push(loc);
    locations.push(loc);
  }

  // 15 NPCs: reuse up to 3 existing (recurring contacts), generate the rest new.
  const npcs = [];
  const existingPool = [...npcsData.npcs];
  const recurringCount = Math.min(3, existingPool.length);
  for (let i = 0; i < recurringCount; i++) {
    const idx = Math.floor(Math.random() * existingPool.length);
    npcs.push({ ...existingPool.splice(idx, 1)[0], recurring: true });
  }
  for (let i = npcs.length; i < 15; i++) {
    const overrides = factionFocus && i % 3 === 0 ? { faction: factionFocus } : {};
    const npc = generateNpc(npcsData.npcs, overrides);
    npcsData.npcs.push(npc);
    npcs.push(npc);
  }

  const enemies = {
    lowLevel: generateEnemies(5, powerId),
    mediumHigh: generateEnemies(3, powerId, { excludeTiers: ['I'] }),
  };

  const loot = {
    lowLevel: rollLoot('sciFi', 10),
    midHigh: rollLoot('epic', 5),
  };

  const factionUpdates = Object.fromEntries(
    factionStates.factions.map((f) => [f.name, {
      reputation: f.reputation,
      goals: f.goals,
      lastAction: (f.recentActions && f.recentActions.length) ? f.recentActions[f.recentActions.length - 1].action : null,
      nextActions: f.nextActions,
    }])
  );

  const partySnapshot = players.map((p) => ({
    name: p.name,
    heroType: p.heroType,
    lifeForm: p.lifeForm,
    hearts: p.hearts,
    defense: p.defense,
    milestonesEarned: (p.milestones || []).length,
    heroCoin: !!p.heroCoin,
    xp: p.xp || 0,
    coin: p.coin || 0,
  }));

  const lastLogEntry = campaignState.sessionLog.length ? campaignState.sessionLog[campaignState.sessionLog.length - 1] : null;
  const resolvedSessionNumber = sessionNumber || campaignState.sessionCount + 1;

  storage.save('npcs', npcsData);
  storage.save('locations', locationsData);

  // Mirrors what `session prep` sets, so `session end` works regardless of
  // which prep path (manual packet vs. automated kit) was used.
  campaignState.currentSession = {
    sessionNumber: resolvedSessionNumber,
    playerIds: players.map((p) => p.id),
    npcIds: npcs.map((n) => n.id),
    locationIds: locations.map((l) => l.id),
    preparedAt: new Date().toISOString(),
    preparedVia: 'session kit',
  };
  storage.save('campaignState', campaignState);

  const absentPlayers = allPlayers.filter((p) => !players.some((sel) => sel.id === p.id)).map((p) => p.name);

  const kit = {
    sessionNumber: resolvedSessionNumber,
    generatedAt: new Date().toISOString(),
    roster: {
      present: players.map((p) => p.name),
      absent: absentPlayers,
      note: playerRefs === null
        ? 'Whole roster included (no --player filter given).'
        : `Filtered to ${players.length} of ${allPlayers.length} players via --player.`,
    },
    partyPowerLevel: { ...computedPower, effectivePowerId: powerId, difficultyOverride: difficulty || null },
    locations,
    npcs,
    enemies,
    loot,
    factionUpdates,
    partySnapshot,
    campaignHooks: [...(campaignState.currentHooks || []), ...(campaignState.unresolvedThreads || [])],
    storyNotes: lastLogEntry ? `Last session (#${lastLogEntry.sessionNumber}) notes: ${lastLogEntry.notes || '(none recorded)'}` : 'No prior session logged yet.',
  };

  if (!fs.existsSync(KIT_DIR)) fs.mkdirSync(KIT_DIR, { recursive: true });
  const file = path.join(KIT_DIR, `session-${kit.sessionNumber}-kit.json`);
  fs.writeFileSync(file, JSON.stringify(kit, null, 2) + '\n', 'utf8');

  return { kit, file };
}

module.exports = { buildSessionKit };
