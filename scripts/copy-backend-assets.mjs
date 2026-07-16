import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Placeholder — keeps build pipeline consistent with Hostinger entrypoint expectations
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'backend', 'dist');
if (!existsSync(dist)) mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, '.build'), new Date().toISOString());
console.log('backend assets ok');
