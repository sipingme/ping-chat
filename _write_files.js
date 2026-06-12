const fs = require('fs');
const files = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const [p, lines] of Object.entries(files)) {
  fs.writeFileSync(p, lines.join('\n') + '\n');
  console.log('OK:', p);
}
