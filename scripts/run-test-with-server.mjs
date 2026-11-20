import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testScript = process.argv[2] || 'scripts/check-sync-automation.mjs';

console.log(`Starting dev server to run: ${testScript}...`);

const server = spawn(process.execPath, ['scripts/run-framework.mjs', 'dev'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: '5173' }
});

server.stdout.on('data', (d) => {
  console.log('[Server stdout]', d.toString().trim());
});

server.stderr.on('data', (d) => {
  console.error('[Server stderr]', d.toString().trim());
});

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch (e) {
      // wait a bit
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

try {
  await waitForServer('http://localhost:5173', 25000);
  console.log('✓ Dev server ready on http://localhost:5173. Running test...\n');

  const testProcess = spawn(process.execPath, [testScript], {
    stdio: 'inherit'
  });

  const exitCode = await new Promise((resolve) => {
    testProcess.on('exit', (code) => resolve(code ?? 0));
  });

  console.log(`\nTest finished with exit code: ${exitCode}`);
  server.kill('SIGTERM');
  process.exit(exitCode);
} catch (err) {
  console.error('Test execution failed:', err);
  server.kill('SIGTERM');
  process.exit(1);
}
