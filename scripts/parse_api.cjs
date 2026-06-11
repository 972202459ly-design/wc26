const fs = require('fs');
const d = JSON.parse(fs.readFileSync('/tmp/wc_data.json', 'utf8'));
const matches = d.matches;

const teams = {};
for (const m of matches) {
  for (const side of ['homeTeam', 'awayTeam']) {
    const t = m[side];
    if (t) teams[t.name] = t.tla;
  }
}

const groups = {};
for (const m of matches) {
  const g = m.group;
  if (g) {
    if (!groups[g]) groups[g] = new Set();
    groups[g].add(m.homeTeam.name);
    groups[g].add(m.awayTeam.name);
  }
}

console.log('Total matches:', matches.length);
console.log('Total teams:', Object.keys(teams).length);
console.log();

for (const g of Object.keys(groups).sort()) {
  console.log(g + ':', [...groups[g]].sort().join(', '));
}

console.log('\nAll teams (by TLA):');
for (const [name, tla] of Object.entries(teams).sort((a, b) => a[1].localeCompare(b[1]))) {
  console.log('  ' + tla + ': ' + name);
}
