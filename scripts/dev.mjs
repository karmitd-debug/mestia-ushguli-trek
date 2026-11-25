import { createServer } from 'node:http';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import { handle, photoMetadata } from '../server/handler.js';
import { loadAssets } from './assets.mjs';

const directory = join('.local', 'album');
const settings = await readFile('trip-settings.local.json', 'utf8').catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return undefined;
});
const localConfig = settings ? JSON.parse(settings) : {};
const album = {
  async list() {
    const photos = [];
    for (const day of ['1','2','3','4']) {
      const folder = join(directory, day);
      const files = await readdir(folder).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
      for (const id of files) {
        const created = (await stat(join(folder, id))).mtime;
        const photo = photoMetadata(`photos/${day}/${id}`, created);
        if (photo) photos.push(photo);
      }
    }
    return photos;
  },
  async get(key) {
    return readFile(join('.local', key.replace(/^photos\//, 'album/'))).catch(error => { if (error.code !== 'ENOENT') throw error; });
  },
  async put(key, bytes) {
    const [, day, id] = key.split('/');
    const folder = join(directory, day);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, id), bytes, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error; });
  }
};
const port = Number(process.env.PORT || 4173);
const origin = `http://127.0.0.1:${port}`;
const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, origin);
    if (url.origin !== origin) { outgoing.writeHead(400).end(); return; }
    const method = incoming.method;
    if (method === 'PUT' && incoming.headers.origin && incoming.headers.origin !== origin) { outgoing.writeHead(403).end(); return; }
    const request = new Request(url, { method, headers: incoming.headers, ...(['HEAD','GET'].includes(method) ? {} : { body: Readable.toWeb(incoming), duplex: 'half' }) });
    const response = await handle(request, { assets: await loadAssets('public'), album, settings, identity: { email: localConfig.bookingOwner } });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
  } catch { outgoing.writeHead(500).end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: ${origin}`));
