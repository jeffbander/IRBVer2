const fs = require('fs');
const path = require('path');

const testsDir = path.join(__dirname, 'tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(testsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace admin@example.com with admin@test.com
  content = content.replace(/admin@example\.com/g, 'admin@test.com');

  // Replace IRB System with Mount Sinai in tests
  content = content.replace(/'IRB System'/g, "'Mount Sinai'");
  content = content.replace(/"IRB System"/g, '"Mount Sinai"');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${file}`);
});

console.log('✅ All test files fixed!');
