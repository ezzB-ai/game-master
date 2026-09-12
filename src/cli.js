'use strict';

const storage = require('./storage');
const { generateNpc } = require('./npcGenerator');
const { generateLocation } = require('./locationGenerator');
const { runConsistencyCheck } = require('./consistency');
const {
  searchNpcs, searchLocations, findNpcByNameOrId, findLocationByNameOrId,
  getRelationships, usedSummary,
} = require('./query');
const { buildSessionPacket, exportSessionPacket } = require('./sessionPrep');
const { RELATIONSHIP_TYPES } = require('./data/wordbanks');

const TWO_WORD_COMMANDS = new Set([
  'generate npc', 'generate location',
  'check consistency',
  'search npc', 'search location',
  'list npcs', 'list locations',
  'show npc', 'show location',
  'session prep', 'session status', 'session end',
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
  generate npc [--role R] [--faction F] [--location L]
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

Session prep
  session prep --npc "Name" [--npc "Name2" ...] --location "Loc" [--location "Loc2" ...] [--session N] [--export]
  session status
  session end [--notes "recap text"]

Editing
  edit npc <name-or-id> [--role R] [--faction F] [--location L] [--notes N]
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
  console.log(`  Role: ${npc.role || 'unset'}`);
  console.log(`  Faction: ${npc.faction || 'unset'}`);
  console.log(`  Location: ${npc.location || 'unset'}`);
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
    console.log(`  ${n.name.padEnd(24)} ${(n.role || '').padEnd(22)} ${(n.location || '-').padEnd(18)} ${n.faction || ''}`);
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
      const { npcIssues, locationIssues } = runConsistencyCheck(npcs, locations);
      printIssues('NPC consistency', npcIssues);
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

    case 'session prep': {
      const npcs = storage.load('npcs').npcs;
      const locations = storage.load('locations').locations;
      const state = storage.load('campaignState');
      const sessionNumber = flags.session ? Number(flags.session) : state.sessionCount + 1;
      const npcRefs = toArray(flags.npc);
      const locationRefs = toArray(flags.location);

      const packet = buildSessionPacket(npcs, locations, { npcRefs, locationRefs, sessionNumber });
      console.log(packet.text);

      state.currentSession = {
        sessionNumber,
        npcIds: packet.resolvedNpcs.map((n) => n.id),
        locationIds: packet.resolvedLocations.map((l) => l.id),
        preparedAt: new Date().toISOString(),
      };
      storage.save('campaignState', state);

      if (flags.export) {
        const file = exportSessionPacket(packet.text, sessionNumber);
        console.log(`\nExported to: ${file}`);
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
      const finished = {
        ...state.currentSession,
        endedAt: new Date().toISOString(),
        notes: flags.notes || '',
      };
      state.sessionLog.push(finished);
      state.sessionCount += 1;
      state.currentSession = null;
      storage.save('campaignState', state);
      console.log(`Session ${finished.sessionNumber} closed out. Total sessions logged: ${state.sessionCount}`);
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
