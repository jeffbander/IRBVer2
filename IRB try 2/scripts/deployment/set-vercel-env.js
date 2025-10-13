#!/usr/bin/env node

const { execSync } = require('child_process');

const envVars = {
  'DATABASE_URL': 'file:./dev.db',
  'JWT_SECRET': 'prod-jwt-secret-change-this-to-minimum-32-random-characters',
  'SESSION_SECRET': 'prod-session-secret-change-this-to-minimum-32-random-chars',
  'AIGENTS_API_URL': 'https://start-chain-run-943506065004.us-central1.run.app',
  'AIGENTS_EMAIL': 'notifications@providerloop.com',
  'NODE_ENV': 'production'
};

console.log('========================================');
console.log('Setting Vercel Environment Variables');
console.log('========================================\n');

let count = 0;
const total = Object.keys(envVars).length;

for (const [key, value] of Object.entries(envVars)) {
  count++;
  console.log(`[${count}/${total}] Setting ${key}...`);

  try {
    // Use echo to pipe the value into vercel env add
    const command = process.platform === 'win32'
      ? `echo ${value} | vercel env add ${key} production`
      : `echo "${value}" | vercel env add ${key} production`;

    execSync(command, { stdio: 'inherit', shell: true });
    console.log(`✓ ${key} set successfully\n`);
  } catch (error) {
    console.error(`✗ Failed to set ${key}\n`);
  }
}

console.log('========================================');
console.log('Environment variables setup complete!');
console.log('========================================\n');
console.log('Redeploying to apply changes...\n');

try {
  execSync('vercel --prod', { stdio: 'inherit' });
  console.log('\n========================================');
  console.log('Deployment complete! 🎉');
  console.log('========================================');
} catch (error) {
  console.error('Deployment failed. Please run "vercel --prod" manually.');
}
