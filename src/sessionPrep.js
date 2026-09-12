'use strict';

const fs = require('fs');
const path = require('path');
const { findNpcByNameOrId, findLocationByNameOrId } = require('./query');
const { findPlayerByNameOrId } = require('./players');

const EXPORT_DIR = path.join(__dirname, '..', 'exports');

// Shared by NPCs (when they carry a hero-type stat block) and players.
function statBlockLines(entity) {
  const lines = [];
  const s = entity.stats || {};
  lines.push(`  Hero Type: ${entity.heroType}${entity.lifeForm ? ` (${entity.lifeForm})` : ''}`);
  lines.push(`  Hearts: ${entity.hearts} | Defense: ${entity.defense}`);
  lines.push(`  Stats: STR +${s.STR ?? 0}  DEX +${s.DEX ?? 0}  CON +${s.CON ?? 0}  INT +${s.INT ?? 0}  WIS +${s.WIS ?? 0}  CHA +${s.CHA ?? 0}`);
  if (entity.effortBonuses) {
    const parts = Object.entries(entity.effortBonuses).filter(([, v]) => v > 0).map(([k, v]) => `${k} +${v}`);
    lines.push(`  Effort Bonuses: ${parts.length ? parts.join(' | ') : 'none'}`);
  }
  if (entity.startingAbility) lines.push(`  Ability: ${entity.startingAbility.name} — ${entity.startingAbility.effect}`);
  if (entity.startingLoot) lines.push(`  Starting Loot: ${entity.startingLoot.name} — ${entity.startingLoot.effect}`);
  if (entity.specialTrait) lines.push(`  Special: ${entity.specialTrait}`);
  return lines;
}

function formatNpc(npc) {
  const lines = [
    `NPC: ${npc.name}  [${npc.id}]`,
    `  Role: ${npc.role || 'unset'}`,
    `  Faction: ${npc.faction || 'unset'}`,
    `  Location: ${npc.location || 'unset'}`,
  ];
  if (npc.heroType) lines.push(...statBlockLines(npc));
  if (npc.traits && npc.traits.length) {
    lines.push('  Traits:');
    npc.traits.forEach((t) => lines.push(`    - ${t}`));
  }
  if (npc.relationships && npc.relationships.length) {
    lines.push('  Relationships:');
    npc.relationships.forEach((r) => lines.push(`    - ${r.type} -> ${r.npcId}`));
  }
  if (npc.notes) lines.push(`  Notes: ${npc.notes}`);
  return lines.join('\n');
}

function formatPlayer(player) {
  const lines = [
    `PLAYER: ${player.name}  [${player.id}]${player.playerName ? ` — played by ${player.playerName}` : ''}`,
    ...statBlockLines(player),
  ];
  if (player.pronouns) lines.push(`  Pronouns: ${player.pronouns}`);
  if (player.faction) lines.push(`  Faction: ${player.faction}`);
  if (player.gear && player.gear.length) {
    lines.push('  Gear:');
    player.gear.forEach((g) => lines.push(`    - ${g.name}${g.effect ? `: ${g.effect}` : ''}`));
  }
  if (player.milestones && player.milestones.length) {
    lines.push('  Milestones:');
    player.milestones.forEach((m) => lines.push(`    - ${m}`));
  }
  lines.push(`  XP: ${player.xp ?? 0} | Coin: ${player.coin ?? 0}`);
  if (player.notes) lines.push(`  Notes: ${player.notes}`);
  return lines.join('\n');
}

function formatLocation(loc) {
  const lines = [
    `LOCATION: ${loc.name}  [${loc.id}]`,
    `  Type: ${loc.type || 'unset'}`,
    `  Faction: ${loc.faction || 'unset'}`,
    `  Danger: ${loc.framework && loc.framework.danger || 'unset'}`,
    `  Resources: ${loc.framework && loc.framework.resources || 'unset'}`,
    `  Signature: ${loc.signatureElement || 'unset'}`,
  ];
  if (loc.notes) lines.push(`  Notes: ${loc.notes}`);
  return lines.join('\n');
}

/**
 * Build a session prep packet from name/id references and current registries.
 * Unknown references are reported but don't block the rest of the packet.
 *
 * `playerRefs` defaults to `null`, meaning "include the whole crew" (every
 * player in the roster) — the party is basically always present. Pass an
 * explicit array (even empty) to select only specific players, e.g. for a
 * session where someone is absent.
 */
function buildSessionPacket(npcs, locations, players, { npcRefs = [], locationRefs = [], playerRefs = null, sessionNumber } = {}) {
  const resolvedNpcs = [];
  const missingNpcs = [];
  for (const ref of npcRefs) {
    const npc = findNpcByNameOrId(npcs, ref);
    if (npc) resolvedNpcs.push(npc);
    else missingNpcs.push(ref);
  }

  const resolvedLocations = [];
  const missingLocations = [];
  for (const ref of locationRefs) {
    const loc = findLocationByNameOrId(locations, ref);
    if (loc) resolvedLocations.push(loc);
    else missingLocations.push(ref);
  }

  let resolvedPlayers = [];
  const missingPlayers = [];
  if (playerRefs === null) {
    resolvedPlayers = players.slice();
  } else {
    for (const ref of playerRefs) {
      const player = findPlayerByNameOrId(players, ref);
      if (player) resolvedPlayers.push(player);
      else missingPlayers.push(ref);
    }
  }

  const header = `SESSION PREP${sessionNumber ? ` — Session ${sessionNumber}` : ''}\nGenerated: ${new Date().toISOString()}\n${'='.repeat(60)}`;

  const crewSection = resolvedPlayers.length
    ? `\n\nCREW (${resolvedPlayers.length})\n${'-'.repeat(60)}\n` + resolvedPlayers.map(formatPlayer).join('\n\n')
    : '\n\nCREW\n' + '-'.repeat(60) + '\n(no players in roster)';

  const npcSection = resolvedNpcs.length
    ? `\n\nNPCS (${resolvedNpcs.length})\n${'-'.repeat(60)}\n` + resolvedNpcs.map(formatNpc).join('\n\n')
    : '\n\nNPCS\n' + '-'.repeat(60) + '\n(none selected)';

  const locationSection = resolvedLocations.length
    ? `\n\nLOCATIONS (${resolvedLocations.length})\n${'-'.repeat(60)}\n` + resolvedLocations.map(formatLocation).join('\n\n')
    : '\n\nLOCATIONS\n' + '-'.repeat(60) + '\n(none selected)';

  let warnings = '';
  if (missingNpcs.length || missingLocations.length || missingPlayers.length) {
    warnings = '\n\nWARNINGS\n' + '-'.repeat(60) + '\n';
    if (missingPlayers.length) warnings += `Could not resolve player reference(s): ${missingPlayers.join(', ')}\n`;
    if (missingNpcs.length) warnings += `Could not resolve NPC reference(s): ${missingNpcs.join(', ')}\n`;
    if (missingLocations.length) warnings += `Could not resolve location reference(s): ${missingLocations.join(', ')}\n`;
  }

  const text = header + crewSection + npcSection + locationSection + warnings + '\n';

  return {
    text,
    resolvedPlayers,
    resolvedNpcs,
    resolvedLocations,
    missingPlayers,
    missingNpcs,
    missingLocations,
  };
}

// Writes both a human-readable .txt (for table printout) and a structured
// .json (full stat blocks, for tooling) version of a session packet.
// Returns { textFile, jsonFile }.
function exportSessionPacket(packet, sessionNumber) {
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const label = sessionNumber ? `session-${sessionNumber}` : `session-${Date.now()}`;

  const textFile = path.join(EXPORT_DIR, `${label}-prep.txt`);
  fs.writeFileSync(textFile, packet.text, 'utf8');

  const jsonData = {
    sessionNumber: sessionNumber || null,
    timestamp: new Date().toISOString(),
    players: packet.resolvedPlayers,
    npcs: packet.resolvedNpcs,
    locations: packet.resolvedLocations,
    missingPlayers: packet.missingPlayers,
    missingNpcs: packet.missingNpcs,
    missingLocations: packet.missingLocations,
  };
  const jsonFile = path.join(EXPORT_DIR, `${label}-prep.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2) + '\n', 'utf8');

  return { textFile, jsonFile };
}

module.exports = { buildSessionPacket, exportSessionPacket, formatNpc, formatLocation, formatPlayer };
