const fs = require('fs');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = dir + '/' + f;
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory()) {
      walkDir(dirPath, callback);
    } else if (stat.isFile() && (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.js'))) {
      callback(dirPath);
    }
  });
}

walkDir('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = content;
  
  updated = updated.replace(/isra\s+mi[^a-z0-9]*raj/gi, (match) => {
    return match === match.toUpperCase() ? 'MAULID NABI' : 'Maulid Nabi';
  });
  updated = updated.replace(/isra\s+miraj/gi, (match) => {
    return match === match.toUpperCase() ? 'MAULID NABI' : 'Maulid Nabi';
  });
  
  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('Updated robustly:', filePath);
  }
});
