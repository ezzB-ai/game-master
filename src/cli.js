'use strict';

const storage = require('./storage');
const { generateNpc } = require('./npcGenerator');
const { generateLocation } = require('./locationGenerator');
const { runConsistencyCheck } = require('./consistency');
const {
  searchNpcs, searchLocations, findNpcByNameOrId, findLocationByNameOrId,
  getRelationships, usedSummary,
} = require('./query');
const { buildSessionPacket, exportSessionPacket, formatPlayer } = require('./sessionPrep');
const { RELATIONSHIP_TYPES } = require('./data/wordbanks');
const { HERO_TYPE_KEYS, LIFE_FORM_DISPLAY, buildHeroStatBlock, validatePlayerStatBlock, loadMechanicsRef } = require('./statBlock');
const { findPlayerByNameOrId, buildPlayer, applyPlayerEdits } = require('./players');
const { findFaction, applyFactionChange } = require('./factions');
const { computePartyPowerLevel } = require('./powerLevel');
const { buildSessionKit } = require('./sessionKit');

const TWO_WORD_COMMANDS = new Set([
  'generate npc', 'generate location',
  'check consistency',
  'search npc', 'search location',
  'list npcs', 'list locations', 'list players',
  'show npc', 'show location', 'show player',
  'add player',
  'edit player', 'update player',
  'delete player',
  'session prep', 'session status', 'session end', 'session kit',
  'check progression', 'faction status', 'campaign status',
]);

function parseArgs(tokens) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith('--')) {
      let key, val;
      if (t.includes('=')) {
        const idx = t.indexOf('=');
        key = t.slice(2, idx);
        val = t.slice(idx + 1);
      } else {
        key = t.slice(2);
        const next = tokens[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          val = next;
          i++;
        } else {
          val = true;
        }
      }
      if (flags[key] !== undefined) {
        flags[key] = Array.isArray(flags[key]) ? [...flags[key], val] : [flags[key], val];
      } else {
        flags[key] = val;
      }
    } else {
      positional.push(t);
    }
  }
  return { positional, flags };
}

function toArray(val) {
  if (val === undefined) return [];
  return Array.isArray(val) ? val : [val];
}

function printHelp() {
  console.log(`
Warp Shell ICRPG Campaign Manager

Usage: node index.js <command> [options]

NPC & Location generation
  generate npc [--role R] [--faction F] [--location L] [--species S] [--hero-type T] [--life-form F]
      --species forces a background species (see the 25-entry pool in wordbanks.js);
      omit to pick one at random, weighted by rarity. Ignored if --life-form is set,
      since the life form IS the NPC's species in that case.
      --hero-type attaches a full Warp Shell mechanical stat block (independent
      of --role, which is flavor occupation). Valid: ${HERO_TYPE_KEYS.map((k) => k[0].toUpperCase() + k.slice(1)).join(', ')}
      --life-form applies a species bonus on top of a hero type. Valid: ${Object.values(LIFE_FORM_DISPLAY).join(', ')}
      Each species/life form has its own gender & pronoun system, picked at random.
  generate location [--type T] [--faction F] [--danger D] [--resources R]

Consistency
  check consistency

Search & lookup
  search npc <term> [--role R] [--faction F] [--location L]
  search location <term> [--type T] [--faction F]
  list npcs [--role R] [--faction F] [--location L]
  list locations [--type T] [--faction F]
  show npc <name-or-id>
  show location <name-or-id>
  relationships <name-or-id>
  relate <npc-a> <relationship-type> <npc-b>   (types: ${RELATIONSHIP_TYPES.join(', ')})
  used                                          (see what roles/factions/elements are used)

Player characters (canonical, persistent — not randomly generated)
  add player <name> --hero-type T [--life-form F] [--player "Real Name"] [--faction F]
      --stats "STR=0,DEX=0,CON=3,INT=0,WIS=3,CHA=0" --effort "WEAPONS=4,GUNS=0"
      [--hearts N] [--defense N] [--ability "Name"] [--loot "Name"] [--notes N]
      Every mechanical field is typed in explicitly — nothing is rolled, since a
      player's stats are choices made at the table, not GM flavor.
  list players
  show player <name-or-id>
  edit player <name-or-id> (same flags as add, all optional; also:
      [--add-hearts N] [--gear "Name: effect"] [--milestone "Name"]
      [--xp N] [--add-xp N] [--coin N] [--add-coin N]
      [--award-hero-coin] [--redeem-hero-coin]   (a player holds at most 1 at a time)
  update player <name-or-id>                    (alias for edit player)
  delete player <name-or-id>

Session prep (manual — pick specific NPCs/locations into a packet)
  session prep --npc "Name" [--npc "Name2" ...] --location "Loc" [--location "Loc2" ...]
      [--player "Name" ...] [--session N] [--export]
      Omitting --player includes the whole crew roster by default; pass one or
      more --player flags to select only specific players (e.g. someone absent).
  session status
  session end [--notes "recap text"] [--milestone "PlayerName=Milestone Name" ...]
      [--faction-change "FactionName=+1" ...] (or "FactionName=+1|what they did")
      Milestones are GM-awarded by feel (no XP tracked) and validated against
      that player's real ability pool by "check progression".

Session Engine (automated — full kit generation from live campaign state)
  session kit [--session N] [--faction-focus FactionName] [--difficulty EASY|MEDIUM|HARD]
      Generates 5 locations, 15 NPCs, 8 enemies (Tier I-IV, weighted to party
      power level), 15 loot items (cited from Sci-Fi/Epic Loot tables), current
      faction state, a party snapshot, and campaign hooks — written to
      session-prep/session-N-kit.json. New NPCs/locations are saved to the
      normal registries, same as running "generate npc"/"generate location".
  check progression                              (milestones earned per player, what's left to claim)
  faction status [FactionName]                   (reputation, goals, recent + planned actions)
  campaign status                                 (full overview: power level, crew, factions, hooks)

Editing
  edit npc <name-or-id> [--role R] [--faction F] [--location L] [--notes N] [--hero-type T] [--life-form F]
  edit location <name-or-id> [--type T] [--faction F] [--danger D] [--resources R] [--notes N]
  delete npc <name-or-id>
  delete location <name-or-id>

  help
`);
}

function printIssues(label, issues) {
  console.log(`\n${label} (${issues.length})`);
  console.log('-'.repeat(50));
  if (!issues.length) {
    console.log('  No issues found.');
    return;
  }
  const order = { error: 0, warning: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
  for (const issue of sorted) {
    const tag = issue.severity.toUpperCase().padEnd(7);
    console.log(`  [${tag}] ${issue.message}`);
  }
}

function printNpc(npc) {
  console.log(`\n${npc.name}  [${npc.id}]`);
  console.log(`  Species: ${npc.species || 'unset'}${npc.gender ? ` — ${npc.gender} (${npc.pronouns})` : ''}`);
  console.log(`  Role: ${npc.role || 'unset'}`);
  console.log(`  Faction: ${npc.faction || 'unset'}`);
  console.log(`  Location: ${npc.location || 'unset'}`);
  if (npc.heroType) {
    const s = npc.stats || {};
    console.log(`  Hero Type: ${npc.heroType}${npc.lifeForm ? ` (${npc.lifeForm})` : ''}`);
    console.log(`  Hearts: ${npc.hearts} | Defense: ${npc.defense}`);
    console.log(`  Stats: STR +${s.STR ?? 0}  DEX +${s.DEX ?? 0}  CON +${s.CON ?? 0}  INT +${s.INT ?? 0}  WIS +${s.WIS ?? 0}  CHA +${s.CHA ?? 0}`);
    if (npc.effortBonuses) {
      const parts = Object.entries(npc.effortBonuses).filter(([, v]) => v > 0).map(([k, v]) => `${k} +${v}`);
      console.log(`  Effort Bonuses: ${parts.length ? parts.join(' | ') : 'none'}`);
    }
    if (npc.startingAbility) console.log(`  Ability: ${npc.startingAbility.name} — ${npc.startingAbility.effect}`);
    if (npc.startingLoot) console.log(`  Starting Loot: ${npc.startingLoot.name} — ${npc.startingLoot.effect}`);
    if (npc.specialTrait) console.log(`  Special: ${npc.specialTrait}`);
  }
  if (npc.traits && npc.traits.length) {
    console.log('  Traits:');
    npc.traits.forEach((t) => console.log(`    - ${t}`));
  }
  if (npc.relationships && npc.relationships.length) {
    console.log('  Relationships:');
    npc.relationships.forEach((r) => console.log(`    - ${r.type} -> ${r.npcId}`));
  }
  if (npc.notes) console.log(`  Notes: ${npc.notes}`);
}

function printLocation(loc) {
  console.log(`\n${loc.name}  [${loc.id}]`);
  console.log(`  Type: ${loc.type || 'unset'}`);
  console.log(`  Faction: ${loc.faction || 'unset'}`);
  console.log(`  Danger: ${(loc.framework && loc.framework.danger) || 'unset'}`);
  console.log(`  Resources: ${(loc.framework && loc.framework.resources) || 'unset'}`);
  console.log(`  Signature: ${loc.signatureElement || 'unset'}`);
  if (loc.notes) console.log(`  Notes: ${loc.notes}`);
}

function printNpcList(npcs) {
  if (!npcs.length) {
    console.log('  (no matches)');
    return;
  }
  for (const n of npcs) {
    console.log(`  ${n.name.padEnd(24)} ${(n.species || '').padEnd(16)} ${(n.role || '').padEnd(22)} ${(n.location || '-').padEnd(18)} ${n.faction || ''}`);
  }
}

function printLocationList(locations) {
  if (!locations.length) {
    console.log('  (no matches)');
    return;
  }
  for (const l of locations) {
    console.log(`  ${l.name.padEnd(24)} ${(l.type || '').padEnd(16)} ${((l.framework && l.framework.danger) || '').padEnd(10)} ${l.faction || ''}`);
  }
}

function printPlayerList(players) {
  if (!players.length) {
    console.log('  (no players in roster)');
    return;
  }
  for (const p of players) {
    const heroLabel = `${p.heroType}${p.lifeForm ? ` (${p.lifeForm})` : ''}`;
    console.log(`  ${p.name.padEnd(20)} ${heroLabel.padEnd(22)} Hearts ${String(p.hearts).padEnd(3)} Defense ${String(p.defense).padEnd(3)} ${p.playerName ? `— ${p.playerName}` : ''}`);
  }
}

function run(argv) {
  const tokens = argv.slice(2);
  if (tokens.length === 0) {
    printHelp();
    return;
  }

  let command = tokens[0];
  let rest = tokens.slice(1);
  const twoWord = `${tokens[0]} ${tokens[1] || ''}`.trim();
  if (TWO_WORD_COMMANDS.has(twoWord)) {
    command = twoWord;
    rest = tokens.slice(2);
  }

  const { positional, flags } = parseArgs(rest);

  switch (command) {
    case 'generate npc': {
      const npcs = storage.load('npcs');
      const npc = generateNpc(npcs.npcs, {
        role: flags.role,
        faction: flags.faction,
        location: flags.location,
        species: flags.species,
        heroType: flags['hero-type'],
        lifeForm: flags['life-form'],
      });
      npcs.npcs.push(npc);
      storage.save('npcs', npcs);
      console.log('Generated NPC:');
      printNpc(npc);
      break;
    }

    case 'generate location': {
      const locations = storage.load('locations');
      const loc = generateLocation(locations.locations, {
        type: flags.type,
        faction: flags.faction,
        danger: flags.danger,
        resources: flags.resources,
      });
      locations.locations.push(loc);
      storage.save('locations', locations);
      console.log('Generated Location:');
      printLocation(loc);
      break;
    }

    case 'check consistency': {
      const npcs = storage.load('npcs').npcs;
      const locations = storage.load('locations').locations;
      const players = storage.load('players').players;
      const { npcIssues, mechanicsIssues, locationIssues } = runConsistencyCheck(npcs, locations);
      printIssues('NPC consistency', npcIssues);
      printIssues('NPC mechanics rule validation', mechanicsIssues);
      const playerIssues = players.flatMap((p) => validatePlayerStatBlock(p).map((message) => ({ severity: 'error', type: 'player-mechanics', message })));
      printIssues('Player mechanics validation', playerIssues);
      printIssues('Location consistency', locationIssues);
      break;
    }

    case 'search npc': {
      const npcs = storage.load('npcs').npcs;
      const results = searchNpcs(npcs, {
        term: positional[0],
        role: flags.role,
        location: flags.location,
        faction: flags.faction,
      });
      console.log(`\nFound ${results.length} NPC(s):`);
      printNpcList(results);
      break;
    }

    case 'search location': {
      const locations = storage.load('locations').locations;
      const results = searchLocations(locations, {
        term: positional[0],
        type: flags.type,
        faction: flags.faction,
      });
      console.log(`\nFound ${results.length} location(s):`);
      printLocationList(results);
      break;
    }

    case 'list npcs': {
      const npcs = storage.load('npcs').npcs;
      const results = searchNpcs(npcs, { role: flags.role, location: flags.location, faction: flags.faction });
      console.log(`\n${results.length} NPC(s):`);
      printNpcList(results);
      break;
    }

    case 'list locations': {
      const locations = storage.load('locations').locations;
      const results = searchLocations(locations, { type: flags.type, faction: flags.faction });
      console.log(`\n${results.length} location(s):`);
      printLocationList(results);
      break;
    }

    case 'show npc': {
      const npcs = storage.load('npcs').npcs;
      const npc = findNpcByNameOrId(npcs, positional[0]);
      if (!npc) {
        console.log(`No NPC found matching "${positional[0]}"`);
        break;
      }
      printNpc(npc);
      break;
    }

    case 'show location': {
      const locations = storage.load('locations').locations;
      const loc = findLocationByNameOrId(locations, positional[0]);
      if (!loc) {
        console.log(`No location found matching "${positional[0]}"`);
        break;
      }
      printLocation(loc);
      break;
    }

    case 'relationships': {
      const npcs = storage.load('npcs').npcs;
      const result = getRelationships(npcs, positional[0]);
      if (!result) {
        console.log(`No NPC found matching "${positional[0]}"`);
        break;
      }
      console.log(`\nRelationships for ${result.npc.name}:`);
      if (!result.relationships.length) {
        console.log('  (none recorded)');
      } else {
        result.relationships.forEach((r) => console.log(`  - ${r.type} -> ${r.npc}`));
      }
      break;
    }

    case 'relate': {
      const [aRef, type, bRef] = positional;
      if (!aRef || !type || !bRef) {
        console.log('Usage: relate <npc-a> <relationship-type> <npc-b>');
        break;
      }
      const npcsData = storage.load('npcs');
      const a = findNpcByNameOrId(npcsData.npcs, aRef);
      const b = findNpcByNameOrId(npcsData.npcs, bRef);
      if (!a || !b) {
        console.log(`Could not resolve ${!a ? `"${aRef}"` : `"${bRef}"`}`);
        break;
      }
      a.relationships = a.relationships || [];
      a.relationships.push({ npcId: b.id, type });
      storage.save('npcs', npcsData);
      console.log(`Added relationship: ${a.name} --${type}--> ${b.name}`);
      break;
    }

    case 'used': {
      const npcs = storage.load('npcs').npcs;
      const locations = storage.load('locations').locations;
      const summary = usedSummary(npcs, locations);
      console.log('\nRoles in use:');
      summary.roles.forEach((r) => console.log(`  - ${r}`));
      console.log('\nFactions in use:');
      summary.factions.forEach((f) => console.log(`  - ${f}`));
      console.log('\nLocation types in use:');
      summary.locationTypes.forEach((t) => console.log(`  - ${t}`));
      console.log('\nSignature elements in use:');
      summary.signatureElements.forEach((s) => console.log(`  - ${s}`));
      break;
    }

    case 'add player': {
      const playersData = storage.load('players');
      const player = buildPlayer({
        name: positional[0],
        playerName: flags.player,
        pronouns: flags.pronouns,
        heroType: flags['hero-type'],
        lifeForm: flags['life-form'],
        faction: flags.faction,
        stats: flags.stats,
        effort: flags.effort,
        hearts: flags.hearts,
        defense: flags.defense,
        ability: flags.ability,
        loot: flags.loot,
        notes: flags.notes,
      });
      playersData.players.push(player);
      storage.save('players', playersData);
      console.log('Added player:');
      console.log('\n' + formatPlayer(player));
      const violations = validatePlayerStatBlock(player);
      if (violations.length) {
        console.log('\nWarning — mechanics validation found issues:');
        violations.forEach((v) => console.log(`  - ${v}`));
      }
      break;
    }

    case 'list players': {
      const players = storage.load('players').players;
      console.log(`\n${players.length} player(s):`);
      printPlayerList(players);
      break;
    }

    case 'show player': {
      const players = storage.load('players').players;
      const player = findPlayerByNameOrId(players, positional[0]);
      if (!player) {
        console.log(`No player found matching "${positional[0]}"`);
        break;
      }
      console.log('\n' + formatPlayer(player));
      break;
    }

    case 'edit player':
    case 'update player': {
      const playersData = storage.load('players');
      const player = findPlayerByNameOrId(playersData.players, positional[0]);
      if (!player) {
        console.log(`No player found matching "${positional[0]}"`);
        break;
      }
      applyPlayerEdits(player, flags);
      storage.save('players', playersData);
      console.log('Updated:');
      console.log('\n' + formatPlayer(player));
      const violations = validatePlayerStatBlock(player);
      if (violations.length) {
        console.log('\nWarning — mechanics validation found issues:');
        violations.forEach((v) => console.log(`  - ${v}`));
      }
      break;
    }

    case 'delete player': {
      const playersData = storage.load('players');
      const player = findPlayerByNameOrId(playersData.players, positional[0]);
      if (!player) {
        console.log(`No player found matching "${positional[0]}"`);
        break;
      }
      playersData.players = playersData.players.filter((p) => p.id !== player.id);
      storage.save('players', playersData);
      console.log(`Deleted player "${player.name}"`);
      break;
    }

    case 'session prep': {
      const npcs = storage.load('npcs').npcs;
      const locations = storage.load('locations').locations;
      const players = storage.load('players').players;
      const state = storage.load('campaignState');
      const sessionNumber = flags.session ? Number(flags.session) : state.sessionCount + 1;
      const npcRefs = toArray(flags.npc);
      const locationRefs = toArray(flags.location);
      const playerRefs = flags.player === undefined ? null : toArray(flags.player);

      const packet = buildSessionPacket(npcs, locations, players, { npcRefs, locationRefs, playerRefs, sessionNumber });
      console.log(packet.text);

      state.currentSession = {
        sessionNumber,
        playerIds: packet.resolvedPlayers.map((p) => p.id),
        npcIds: packet.resolvedNpcs.map((n) => n.id),
        locationIds: packet.resolvedLocations.map((l) => l.id),
        preparedAt: new Date().toISOString(),
      };
      storage.save('campaignState', state);

      if (flags.export) {
        const { textFile, jsonFile } = exportSessionPacket(packet, sessionNumber);
        console.log(`\nExported to:\n  ${textFile}\n  ${jsonFile}`);
      }
      break;
    }

    case 'session status': {
      const state = storage.load('campaignState');
      if (!state.currentSession) {
        console.log('No session currently prepped. Run "session prep" first.');
        break;
      }
      console.log('\nCurrent session:');
      console.log(JSON.stringify(state.currentSession, null, 2));
      console.log(`\nSessions completed so far: ${state.sessionCount}`);
      break;
    }

    case 'session end': {
      const state = storage.load('campaignState');
      if (!state.currentSession) {
        console.log('No active session to end. Run "session prep" first.');
        break;
      }

      // --milestone "PlayerName=Milestone Name" — GM-awarded, no XP/threshold
      // involved (the rulebook awards these by feel, "roughly every other
      // session"), validated against that player's real milestone pool.
      const milestoneAwards = [];
      for (const entry of toArray(flags.milestone)) {
        const eq = entry.indexOf('=');
        if (eq === -1) {
          console.log(`Skipping malformed --milestone "${entry}" — expected "PlayerName=Milestone Name"`);
          continue;
        }
        const playerRef = entry.slice(0, eq).trim();
        const milestoneName = entry.slice(eq + 1).trim();
        const playersData = storage.load('players');
        const player = findPlayerByNameOrId(playersData.players, playerRef);
        if (!player) {
          console.log(`Could not resolve player "${playerRef}" for milestone award`);
          continue;
        }
        player.milestones = player.milestones || [];
        player.milestones.push(milestoneName);
        player.updatedAt = new Date().toISOString();
        storage.save('players', playersData);
        milestoneAwards.push({ player: player.name, milestone: milestoneName });
      }

      // --faction-change "FactionName=+1" or "FactionName=+1|what they did"
      // (the action text is per-change, not a single flag shared across all
      // of them — each faction can have its own reason logged).
      const factionChanges = [];
      for (const entry of toArray(flags['faction-change'])) {
        const eq = entry.indexOf('=');
        if (eq === -1) {
          console.log(`Skipping malformed --faction-change "${entry}" — expected "FactionName=+1" or "FactionName=+1|action text"`);
          continue;
        }
        const factionRef = entry.slice(0, eq).trim();
        const rest = entry.slice(eq + 1);
        const pipeIdx = rest.indexOf('|');
        const deltaText = pipeIdx === -1 ? rest : rest.slice(0, pipeIdx);
        const action = pipeIdx === -1 ? null : rest.slice(pipeIdx + 1).trim();
        const delta = Number(deltaText.trim());
        if (!Number.isInteger(delta)) {
          console.log(`Skipping --faction-change "${entry}" — delta must be an integer`);
          continue;
        }
        const factionData = storage.load('factionStates');
        const faction = findFaction(factionData.factions, factionRef);
        if (!faction) {
          console.log(`Could not resolve faction "${factionRef}"`);
          continue;
        }
        applyFactionChange(faction, delta, { session: state.currentSession.sessionNumber, action });
        storage.save('factionStates', factionData);
        factionChanges.push({ faction: faction.name, delta, newReputation: faction.reputation });
      }

      const finished = {
        ...state.currentSession,
        endedAt: new Date().toISOString(),
        notes: flags.notes || '',
        milestoneAwards,
        factionChanges,
      };
      state.sessionLog.push(finished);
      state.sessionCount += 1;
      state.currentSession = null;
      storage.save('campaignState', state);

      console.log(`Session ${finished.sessionNumber} closed out. Total sessions logged: ${state.sessionCount}`);
      if (milestoneAwards.length) {
        console.log('\nMilestones awarded:');
        milestoneAwards.forEach((m) => console.log(`  - ${m.player}: ${m.milestone}`));
      }
      if (factionChanges.length) {
        console.log('\nFaction changes:');
        factionChanges.forEach((f) => console.log(`  - ${f.faction}: ${f.delta > 0 ? '+' : ''}${f.delta} (now ${f.newReputation})`));
      }
      break;
    }

    case 'session kit': {
      const { kit, file } = buildSessionKit({
        sessionNumber: flags.session ? Number(flags.session) : undefined,
        factionFocus: flags['faction-focus'],
        difficulty: flags.difficulty,
      });
      console.log(`\nSession ${kit.sessionNumber} kit generated.`);
      console.log(`Party power level: ${kit.partyPowerLevel.effectivePowerId} (score ${kit.partyPowerLevel.powerScore.toFixed(1)}, ${kit.partyPowerLevel.totalHearts} total HEARTS)${kit.partyPowerLevel.difficultyOverride ? ` — difficulty override: ${kit.partyPowerLevel.difficultyOverride}` : ''}`);
      console.log(`Locations: ${kit.locations.length} | NPCs: ${kit.npcs.length} (${kit.npcs.filter((n) => n.recurring).length} recurring) | Enemies: ${kit.enemies.lowLevel.length} low + ${kit.enemies.mediumHigh.length} medium-high | Loot: ${kit.loot.lowLevel.length} low + ${kit.loot.midHigh.length} mid-high`);
      console.log('\nFaction updates:');
      Object.entries(kit.factionUpdates).forEach(([name, f]) => console.log(`  - ${name}: reputation ${f.reputation}${f.lastAction ? `, last action: "${f.lastAction}"` : ''}`));
      console.log('\nCampaign hooks:');
      kit.campaignHooks.forEach((h) => console.log(`  - ${h}`));
      console.log(`\n${kit.storyNotes}`);
      console.log(`\nFull kit written to: ${file}`);
      break;
    }

    case 'check progression': {
      const players = storage.load('players').players;
      const ref = loadMechanicsRef();
      players.forEach((p) => {
        const heroKey = p.heroType ? p.heroType.toLowerCase() : null;
        const roleData = heroKey && ref.warpShellRoles[heroKey];
        console.log(`\n${p.name} (${p.heroType || 'unset'}${p.lifeForm ? `, ${p.lifeForm}` : ''})`);
        console.log(`  Hearts: ${p.hearts} | Defense: ${p.defense} | Hero Coin: ${p.heroCoin ? 'YES' : 'no'}`);
        console.log(`  Milestones earned (${(p.milestones || []).length}): ${(p.milestones || []).join(', ') || 'none yet'}`);
        if (roleData) {
          const earnedNames = (p.milestones || []).map((m) => m.toLowerCase());
          const available = roleData.milestoneAbilities.filter((entry) => {
            const name = entry.split(':')[0].trim().toLowerCase();
            return !earnedNames.some((e) => e.includes(name) || name.includes(e));
          });
          console.log(`  Not yet claimed from ${p.heroType}'s pool: ${available.length ? available.join(' | ') : 'all claimed'}`);
        }
      });
      console.log('\nReminder: Milestone Rewards are GM-awarded by feel (roughly every other session) — there is no XP threshold to track.');
      break;
    }

    case 'faction status': {
      const factionData = storage.load('factionStates');
      const target = positional[0] || flags.faction;
      const factions = target ? [findFaction(factionData.factions, target)].filter(Boolean) : factionData.factions;
      if (target && !factions.length) {
        console.log(`No faction found matching "${target}"`);
        break;
      }
      factions.forEach((f) => {
        console.log(`\n${f.name}  (reputation: ${f.reputation})`);
        console.log(`  ${f.description}`);
        console.log(`  Goals: ${f.goals.join(', ')}`);
        if (f.recentActions && f.recentActions.length) {
          console.log('  Recent actions:');
          f.recentActions.slice(-5).forEach((a) => console.log(`    - [session ${a.session ?? '?'}] ${a.action}`));
        }
        if (f.nextActions && f.nextActions.length) {
          console.log('  Planned next actions:');
          f.nextActions.forEach((n) => console.log(`    - if "${n.trigger}": ${n.action}`));
        }
      });
      break;
    }

    case 'campaign status': {
      const state = storage.load('campaignState');
      const players = storage.load('players').players;
      const factionData = storage.load('factionStates');
      const power = computePartyPowerLevel(players);
      console.log(`\n${state.campaignName || 'Campaign'} — Session ${state.sessionCount} completed, ${state.currentSession ? `session ${state.currentSession.sessionNumber} currently prepped` : 'no session currently prepped'}`);
      console.log(`\nParty power level: ${power.powerId} (score ${power.powerScore.toFixed(1)}, ${power.totalHearts} total HEARTS across ${power.playerCount} players)`);
      console.log('\nCrew:');
      players.forEach((p) => console.log(`  - ${p.name}: ${p.heroType}${p.lifeForm ? ` (${p.lifeForm})` : ''}, ${p.hearts} HEARTS, ${(p.milestones || []).length} milestones, ${p.heroCoin ? 'holding a Hero Coin' : 'no Hero Coin'}`));
      console.log('\nFaction standings:');
      factionData.factions.forEach((f) => console.log(`  - ${f.name}: ${f.reputation}`));
      console.log('\nCurrent hooks:');
      (state.currentHooks || []).forEach((h) => console.log(`  - ${h}`));
      if (state.unresolvedThreads && state.unresolvedThreads.length) {
        console.log('\nUnresolved threads:');
        state.unresolvedThreads.forEach((t) => console.log(`  - ${t}`));
      }
      break;
    }

    case 'edit npc': {
      const npcsData = storage.load('npcs');
      const npc = findNpcByNameOrId(npcsData.npcs, positional[0]);
      if (!npc) {
        console.log(`No NPC found matching "${positional[0]}"`);
        break;
      }
      if (flags.role) npc.role = flags.role;
      if (flags.faction) npc.faction = flags.faction;
      if (flags.location) npc.location = flags.location;
      if (flags.notes) npc.notes = flags.notes;
      if (flags['hero-type']) {
        Object.assign(npc, buildHeroStatBlock({ heroType: flags['hero-type'], lifeForm: flags['life-form'] || npc.lifeForm }));
      }
      storage.save('npcs', npcsData);
      console.log('Updated:');
      printNpc(npc);
      break;
    }

    case 'edit location': {
      const locData = storage.load('locations');
      const loc = findLocationByNameOrId(locData.locations, positional[0]);
      if (!loc) {
        console.log(`No location found matching "${positional[0]}"`);
        break;
      }
      if (flags.type) loc.type = flags.type;
      if (flags.faction) loc.faction = flags.faction;
      if (flags.danger) loc.framework.danger = flags.danger;
      if (flags.resources) loc.framework.resources = flags.resources;
      if (flags.notes) loc.notes = flags.notes;
      storage.save('locations', locData);
      console.log('Updated:');
      printLocation(loc);
      break;
    }

    case 'delete npc': {
      const npcsData = storage.load('npcs');
      const npc = findNpcByNameOrId(npcsData.npcs, positional[0]);
      if (!npc) {
        console.log(`No NPC found matching "${positional[0]}"`);
        break;
      }
      npcsData.npcs = npcsData.npcs.filter((n) => n.id !== npc.id);
      storage.save('npcs', npcsData);
      console.log(`Deleted NPC "${npc.name}"`);
      break;
    }

    case 'delete location': {
      const locData = storage.load('locations');
      const loc = findLocationByNameOrId(locData.locations, positional[0]);
      if (!loc) {
        console.log(`No location found matching "${positional[0]}"`);
        break;
      }
      locData.locations = locData.locations.filter((l) => l.id !== loc.id);
      storage.save('locations', locData);
      console.log(`Deleted location "${loc.name}"`);
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;

    default:
      console.log(`Unknown command: "${tokens.join(' ')}"`);
      printHelp();
      process.exitCode = 1;
  }
}

module.exports = { run, parseArgs };
