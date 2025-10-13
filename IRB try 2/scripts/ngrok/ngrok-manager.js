#!/usr/bin/env node

/**
 * Ngrok Tunnel Manager - Node.js Version
 * Safely manage multiple ngrok tunnels with reserved domains
 * Supports IRB app (port 3009) and HeartVoice app (port 3000)
 */

const { exec, spawn } = require('child_process');
const http = require('http');
const https = require('https');

const CONFIG = {
  authToken: '31wbk8kVUqHXH8umAHFOnOlR1Dg_3Cd2PSnnJZA5W9qY8FFtK',
  configFile: 'ngrok.yml',
  webInterfaceUrl: 'http://127.0.0.1:4040',
  apiUrl: 'http://127.0.0.1:4040/api/tunnels',
  tunnels: {
    irb: {
      name: 'irb',
      url: 'https://irb.providerloop.ngrok.app',
      port: 3009,
      description: 'IRB Management System'
    },
    heartvoice: {
      name: 'heartvoice',
      url: 'https://heartvoice.providerloop.ngrok.app',
      port: 3000,
      description: 'HeartVoice Monitor'
    },
    main: {
      name: 'main',
      url: 'https://providerloop.ngrok.app',
      port: 3009,
      description: 'Main Application'
    },
    api: {
      name: 'api',
      url: 'https://api.providerloop.ngrok.app',
      port: 5000,
      description: 'API Endpoint'
    }
  }
};

// Utility functions
function log(message, type = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    rocket: '🚀'
  };
  console.log(`${icons[type] || '•'} ${message}`);
}

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error && !stderr.includes('not found') && !stderr.includes('No tasks')) {
        resolve({ success: false, error, stderr });
      } else {
        resolve({ success: true, stdout, stderr });
      }
    });
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if ngrok is running
async function isNgrokRunning() {
  const command = process.platform === 'win32'
    ? 'tasklist | findstr ngrok.exe'
    : 'pgrep -f ngrok';

  const result = await execPromise(command);
  return result.success && result.stdout.trim().length > 0;
}

// Configure ngrok with auth token
async function configureNgrok() {
  log('Configuring ngrok with auth token...', 'info');
  const result = await execPromise(`ngrok config add-authtoken ${CONFIG.authToken}`);
  return result.success;
}

// Clear existing ngrok sessions
async function clearSessions() {
  log('Clearing existing ngrok sessions...', 'info');

  // Kill local processes
  const killCommand = process.platform === 'win32'
    ? 'taskkill /F /IM ngrok.exe'
    : 'pkill -f ngrok';

  await execPromise(killCommand);

  // Clear remote sessions via API
  return new Promise((resolve) => {
    const options = {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${CONFIG.authToken}`,
        'Ngrok-Version': '2'
      }
    };

    const req = https.request('https://api.ngrok.com/tunnel_sessions', options, (res) => {
      resolve(true);
    });

    req.on('error', () => resolve(false));
    req.end();
  });
}

// Start tunnels
async function startTunnels(tunnelNames = null) {
  await configureNgrok();
  await clearSessions();
  await delay(2000);

  const startCommand = tunnelNames
    ? `ngrok start ${tunnelNames} --config ${CONFIG.configFile}`
    : `ngrok start --all --config ${CONFIG.configFile}`;

  log(`Starting tunnels: ${tunnelNames || 'all'}...`, 'rocket');

  // Start ngrok in background
  const ngrokProcess = spawn('ngrok',
    ['start', ...(tunnelNames ? tunnelNames.split(' ') : ['--all']), '--config', CONFIG.configFile],
    { detached: true, stdio: 'ignore' }
  );

  ngrokProcess.unref();

  await delay(5000);

  return ngrokProcess;
}

// Get tunnel status from API
async function getTunnelStatus() {
  return new Promise((resolve) => {
    http.get(CONFIG.apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Display tunnel information
function displayTunnels(tunnelNames = null) {
  console.log('\n' + '='.repeat(80));
  console.log('                    PERMANENT TUNNEL URLS');
  console.log('='.repeat(80) + '\n');

  const tunnelsToShow = tunnelNames
    ? tunnelNames.split(' ').map(name => CONFIG.tunnels[name]).filter(Boolean)
    : Object.values(CONFIG.tunnels);

  tunnelsToShow.forEach(tunnel => {
    console.log(`  ${tunnel.description.padEnd(25)} ${tunnel.url}`);
  });

  console.log(`\n  ${'Web Interface'.padEnd(25)} ${CONFIG.webInterfaceUrl}`);
  console.log('\n' + '='.repeat(80));
  console.log('\n✨ These URLs NEVER change - you can safely bookmark them!\n');
}

// Stop all tunnels
async function stopTunnels() {
  log('Stopping all ngrok tunnels...', 'warning');
  await clearSessions();
  log('All tunnels stopped', 'success');
}

// Check status
async function checkStatus() {
  const isRunning = await isNgrokRunning();

  if (!isRunning) {
    log('ngrok is not currently running', 'info');
    return;
  }

  log('ngrok is running', 'success');

  const status = await getTunnelStatus();
  if (status && status.tunnels) {
    console.log('\nActive tunnels:');
    status.tunnels.forEach(tunnel => {
      console.log(`  • ${tunnel.name}: ${tunnel.public_url} -> ${tunnel.config.addr}`);
    });
    console.log(`\n📊 Visit ${CONFIG.webInterfaceUrl} for detailed status\n`);
  } else {
    console.log('\nUnable to retrieve tunnel details from API\n');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('\n🔧 Ngrok Tunnel Manager\n');

  switch (command) {
    case 'start':
      const tunnelArg = args[1];
      if (tunnelArg && CONFIG.tunnels[tunnelArg]) {
        await startTunnels(tunnelArg);
        displayTunnels(tunnelArg);
      } else if (tunnelArg === 'all' || !tunnelArg) {
        await startTunnels();
        displayTunnels();
      } else {
        log(`Unknown tunnel: ${tunnelArg}`, 'error');
        log('Available tunnels: irb, heartvoice, main, api', 'info');
      }
      break;

    case 'stop':
      await stopTunnels();
      break;

    case 'status':
      await checkStatus();
      break;

    case 'restart':
      await stopTunnels();
      await delay(2000);
      await startTunnels();
      displayTunnels();
      break;

    default:
      console.log('Usage:');
      console.log('  node ngrok-manager.js start [tunnel]  - Start tunnel(s)');
      console.log('  node ngrok-manager.js stop            - Stop all tunnels');
      console.log('  node ngrok-manager.js status          - Check tunnel status');
      console.log('  node ngrok-manager.js restart         - Restart all tunnels');
      console.log('\nTunnel options:');
      console.log('  irb        - Start IRB app tunnel only (port 3009)');
      console.log('  heartvoice - Start HeartVoice tunnel only (port 3000)');
      console.log('  all        - Start all tunnels (default)');
      console.log('\nExamples:');
      console.log('  node ngrok-manager.js start irb');
      console.log('  node ngrok-manager.js start heartvoice');
      console.log('  node ngrok-manager.js start all');
      console.log('  node ngrok-manager.js status\n');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  startTunnels,
  stopTunnels,
  checkStatus,
  getTunnelStatus,
  isNgrokRunning
};
