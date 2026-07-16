#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = (process.env.SGR_BUILD_TARGET || process.env.BUILD_TARGET || 'api').toLowerCase();

if (target === 'api' || target === 'backend') {
  const r = spawnSync('node', ['dist/index.js'], {
    cwd: resolve(root, 'backend'),
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(r.status ?? 1);
}

console.error('start is only for API (SGR_BUILD_TARGET=api). Frontend is served by Apache.');
process.exit(1);
