const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('.');
files.forEach(file => {
  if (['.ts', '.tsx', '.html', '.json', '.js', '.md'].some(ext => file.endsWith(ext))) {
    let content = fs.readFileSync(file, 'utf8');
    let updated = content;

    // Replace variations of Isra Miraj / Isra Mi'raj
    updated = updated.replace(/isra\s*mi['`]?raj/gi, (match) => {
      if (match === match.toUpperCase()) return 'MAULID NABI';
      if (match[0] === match[0].toUpperCase()) return 'Maulid Nabi';
      return 'maulid nabi';
    });

    updated = updated.replace(/isra_miraj/gi, 'maulid_nabi');
    updated = updated.replace(/isra-miraj/gi, 'maulid-nabi');

    if (updated !== content) {
      fs.writeFileSync(file, updated, 'utf8');
      console.log('Updated:', file);
    }
  }
});

// Also rename isra_miraj_db.json if it exists
const oldDbPath = path.join('data', 'isra_miraj_db.json');
const newDbPath = path.join('data', 'maulid_nabi_db.json');
if (fs.existsSync(oldDbPath)) {
  fs.renameSync(oldDbPath, newDbPath);
  console.log('Renamed database file to:', newDbPath);
}
