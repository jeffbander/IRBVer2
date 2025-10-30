const fs = require('fs');
const path = require('path');

const testsDir = path.join(__dirname, 'tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));

let totalChanges = 0;

files.forEach(file => {
  const filePath = path.join(testsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Pattern 1: Add waitForURL before expecting dashboard URL
  const dashboardPattern = /await page\.click\([^)]+\);[\s\n]+await expect\(page\)\.toHaveURL\('\/dashboard'\)/g;
  const dashboardMatches = content.match(dashboardPattern);
  if (dashboardMatches) {
    content = content.replace(
      /await page\.click\(([^)]+)\);([\s\n]+)await expect\(page\)\.toHaveURL\('\/dashboard'\)/g,
      'await page.click($1);$2await page.waitForURL(\'/dashboard\', { timeout: 10000 });$2await expect(page).toHaveURL(\'/dashboard\')'
    );
    changes += dashboardMatches.length;
  }

  // Pattern 2: Add waitForURL before expecting login URL
  const loginPattern = /await page\.click\([^)]+\);[\s\n]+await expect\(page\)\.toHaveURL\('\/login'\)/g;
  const loginMatches = content.match(loginPattern);
  if (loginMatches) {
    content = content.replace(
      /await page\.click\(([^)]+)\);([\s\n]+)await expect\(page\)\.toHaveURL\('\/login'\)/g,
      'await page.click($1);$2await page.waitForURL(\'/login\', { timeout: 10000 });$2await expect(page).toHaveURL(\'/login\')'
    );
    changes += loginMatches.length;
  }

  // Pattern 3: Add waitForURL('/dashboard/coordinator') for coordinator tests
  const coordinatorPattern = /await page\.goto\('\/dashboard\/coordinator'\);[\s\n]+await expect\(page\)\.toHaveURL/g;
  const coordinatorMatches = content.match(coordinatorPattern);
  if (coordinatorMatches) {
    content = content.replace(
      /await page\.goto\('\/dashboard\/coordinator'\);([\s\n]+)await expect\(page\)\.toHaveURL/g,
      'await page.goto(\'/dashboard/coordinator\');$1await page.waitForURL(\'/dashboard/coordinator\', { timeout: 30000 });$1await expect(page).toHaveURL'
    );
    changes += coordinatorMatches.length;
  }

  // Pattern 4: Increase timeout for slow page loads
  content = content.replace(
    /await page\.goto\('\/dashboard\/coordinator'\)/g,
    'await page.goto(\'/dashboard/coordinator\', { waitUntil: \'networkidle\', timeout: 30000 })'
  );

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${file}: ${changes} timing issues`);
    totalChanges += changes;
  }
});

console.log(`\n✅ Total: Fixed ${totalChanges} timing issues across ${files.length} files`);
