'use strict';

const fs = require('fs');
const path = require('path');
const { findNpcByNameOrId, findLocationByNameOrId } = require('./query');

const EXPORT_DIR = path.join(__dirname, '..', 'exports');

function formatNpc(npc) {
  const lines = [
    `NPC: ${npc.name}  [${npc.id}]`,
    `  Role: ${npc.role || 'unset'}`,
    `  Faction: ${npc.faction || 'unset'}`,
    `  Location: ${npc.location || 'unset'}`,
  ];
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
 */
function buildSessionPacket(npcs, locations, { npcRefs = [], locationRefs = [], sessionNumber } = {}) {
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

  const header = `SESSION PREP${sessionNumber ? ` — Session ${sessionNumber}` : ''}\nGenerated: ${new Date().toISOString()}\n${'='.repeat(60)}`;

  const npcSection = resolvedNpcs.length
    ? `\n\nNPCS (${resolvedNpcs.length})\n${'-'.repeat(60)}\n` + resolvedNpcs.map(formatNpc).join('\n\n')
    : '\n\nNPCS\n' + '-'.repeat(60) + '\n(none selected)';

  const locationSection = resolvedLocations.length
    ? `\n\nLOCATIONS (${resolvedLocations.length})\n${'-'.repeat(60)}\n` + resolvedLocations.map(formatLocation).join('\n\n')
    : '\n\nLOCATIONS\n' + '-'.repeat(60) + '\n(none selected)';

  let warnings = '';
  if (missingNpcs.length || missingLocations.length) {
    warnings = '\n\nWARNINGS\n' + '-'.repeat(60) + '\n';
    if (missingNpcs.length) warnings += `Could not resolve NPC reference(s): ${missingNpcs.join(', ')}\n`;
    if (missingLocations.length) warnings += `Could not resolve location reference(s): ${missingLocations.join(', ')}\n`;
  }

  const text = header + npcSection + locationSection + warnings + '\n';

  return {
    text,
    resolvedNpcs,
    resolvedLocations,
    missingNpcs,
    missingLocations,
  };
}

function exportSessionPacket(text, sessionNumber) {
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const label = sessionNumber ? `session-${sessionNumber}` : `session-${Date.now()}`;
  const file = path.join(EXPORT_DIR, `${label}-prep.txt`);
  fs.writeFileSync(file, text, 'utf8');
  return file;
}

module.exports = { buildSessionPacket, exportSessionPacket, formatNpc, formatLocation };
