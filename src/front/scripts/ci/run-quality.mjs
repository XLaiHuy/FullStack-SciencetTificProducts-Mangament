import { spawnSync } from 'node:child_process';

const baseUrl = process.env.BENCH_BASE_URL || 'http://localhost:5173';

const runCommand = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
};

const isReachable = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const main = async () => {
  console.log('== Quality Gate: Build ==');
  runCommand('npm', ['run', 'build']);

  const reachable = await isReachable(baseUrl);

  if (!reachable) {
    console.log(`== Quality Gate: Perf skipped (${baseUrl} unreachable) ==`);
    return;
  }

  console.log('== Quality Gate: Perf Login ==');
  runCommand('npm', ['run', 'perf:login']);

  console.log('== Quality Gate: Perf Routes ==');
  runCommand('npm', ['run', 'perf:routes']);
};

main().catch((error) => {
  console.error('Quality pipeline failed:', error?.message || error);
  process.exit(1);
});
