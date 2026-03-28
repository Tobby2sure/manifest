#!/usr/bin/env node
/**
 * Patches @privy-io/react-auth SDK to accept app IDs with cmn* prefix.
 * Privy's newer accounts generate cmn* IDs but older SDK versions have a
 * hardcoded length===25 check that rejects them.
 */
const fs = require('fs');
const path = require('path');

const patterns = [
  ['"string"!=typeof(a=r.appId)||25!==a.length', '"string"!=typeof(a=r.appId)||a.length<10'],
  ['"string"!=typeof(r=a.appId)||25!==r.length', '"string"!=typeof(r=a.appId)||r.length<10'],
  ['"string"!=typeof e||25!==e.length)throw new c.PrivyClientError', '"string"!=typeof e||e.length<10)throw new c.PrivyClientError'],
  ['"string"!=typeof e||25!==e.length)throw new F.PrivyClientError', '"string"!=typeof e||e.length<10)throw new F.PrivyClientError'],
  ['"string"!=typeof e||25!==e.length)throw new L.PrivyClientError', '"string"!=typeof e||e.length<10)throw new L.PrivyClientError'],
  ['"string"!=typeof e||25!==e.length)throw new Ue', '"string"!=typeof e||e.length<10)throw new Ue'],
];

function findFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) findFiles(full, results);
      else if (entry.endsWith('.js') || entry.endsWith('.mjs')) results.push(full);
    } catch {}
  }
  return results;
}

const distDir = path.join(__dirname, '..', 'node_modules', '@privy-io', 'react-auth', 'dist');
const files = findFiles(distDir);

let patchedCount = 0;
for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [old, replacement] of patterns) {
      if (content.includes(old)) {
        content = content.split(old).join(replacement);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, content);
      patchedCount++;
    }
  } catch {}
}

console.log(patchedCount > 0
  ? `[patch-privy] Patched ${patchedCount} file(s) — cmn* app IDs accepted`
  : '[patch-privy] Already patched or no matching patterns found');
