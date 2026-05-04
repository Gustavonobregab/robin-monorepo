const procs = [
  Bun.spawn(['bun', 'run', 'src/server.ts'], { stdout: 'inherit', stderr: 'inherit' }),
  Bun.spawn(['bun', 'run', 'src/worker/index.ts'], { stdout: 'inherit', stderr: 'inherit' }),
];

const shutdown = () => {
  for (const p of procs) p.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await Promise.race(procs.map((p) => p.exited));
shutdown();
