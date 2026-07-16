#!/usr/bin/env node
/**
 * Hostinger hPanel always runs `npm run build`.
 * SGR_BUILD_TARGET=web → frontend/out
 * SGR_BUILD_TARGET=api → backend/dist
 */
import { spawnSync } from 'node:child_process';
import { existsSync, cpSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const target = (process.env.SGR_BUILD_TARGET || process.env.BUILD_TARGET || 'web').toLowerCase();

function run(cmd, args, cwd = root) {
  console.log(`\n> ${cmd} ${args.join(' ')}  (cwd: ${cwd})`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true, env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (target === 'api' || target === 'backend') {
  run('npm', ['run', 'build', '-w', 'backend']);
  console.log('\n✓ API build → backend/dist/index.js');
} else if (target === 'web' || target === 'frontend') {
  run('npm', ['run', 'build', '-w', 'frontend']);
  const out = resolve(root, 'frontend', 'out');
  const htaccessSrc = resolve(root, '.htaccess');
  if (existsSync(out) && existsSync(htaccessSrc)) {
    cpSync(htaccessSrc, resolve(out, '.htaccess'));
    console.log('✓ Copied .htaccess → frontend/out/.htaccess');
  }
  console.log('\n✓ Frontend build → frontend/out');
} else {
  console.error(`Unknown SGR_BUILD_TARGET="${target}". Use "web" or "api".`);
  process.exit(1);
}
