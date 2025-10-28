const fs = require('fs');
const path = require('path');

const testsDir = path.join(__dirname, 'tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(testsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const original = content;

  // Fix coordinator password when using coordinator1@test.com
  content = content.replace(
    /(coordinator1@test\.com['"][\s\S]{0,200}?password['"][\s\S]{0,50}?['"])test123/g,
    '$1admin123'
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  }
});

console.log('✅ All coordinator passwords fixed!');
