import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.gpx': 'application/gpx+xml; charset=utf-8'
};

export async function loadAssets(root, prefix = '') {
  const assets = {};
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) Object.assign(assets, await loadAssets(root, `${path}/`));
    else {
      const type = types[extname(path)];
      if (!type) throw new Error(`Unknown web asset: ${path}`);
      assets[path] = [type, await readFile(join(root, path), 'utf8')];
    }
  }
  return assets;
}
