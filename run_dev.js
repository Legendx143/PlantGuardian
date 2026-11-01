const { spawn } = require('child_process');

console.log('🌱 Starting PlantGuardian (Backend Express + Frontend Vite)...');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// Start Backend server on http://localhost:5000
const backend = spawn(npmCmd, ['--prefix', 'Backend', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

// Start Frontend Vite on http://localhost:5173
const frontend = spawn(npmCmd, ['--prefix', 'Frontend', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  console.log('\n🛑 Shutting down PlantGuardian services...');
  try { backend.kill(); } catch {}
  try { frontend.kill(); } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
