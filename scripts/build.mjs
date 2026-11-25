import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadAssets } from './assets.mjs';

const load = async file => (await readFile(file, 'utf8')).replace(/^import .+\r?\n/gm, '').replace(/^export (?=(?:async )?function|const)/gm, '');
const media = await load('public/media.js');
const handler = await load('server/handler.js');
const worker = await load('server/worker.js');
const assets = await loadAssets('public');
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await writeFile('dist/server/index.js', `const assets = ${JSON.stringify(assets)};\n${media}\n${handler}\n${worker}`);
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
