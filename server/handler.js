import { expenseEndpoint } from './expenses.js';
import { imageSource, media } from '../public/media.js';

const photoPath = /^api\/photos\/([1-4])\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;
const photoLimit = 5 * 1024 * 1024;
const text = (body, status) => new Response(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
const json = body => Response.json(body, { headers: { 'Cache-Control': 'private, no-store' } });

function tripDetails(raw, email) {
  if (!raw) return {};
  const settings = JSON.parse(raw);
  const owner = Boolean(email && settings.bookingOwner && email.toLowerCase() === settings.bookingOwner.toLowerCase());
  const days = settings.days?.slice(0, 4).map(({ date, stay, booking, confirmation }) => ({
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) ? date : undefined,
    stay: typeof stay === 'string' ? stay : undefined,
    booking: /^[a-z0-9-]+$/.test(booking) ? booking : undefined,
    privateLink: owner && /^https:\/\/mail\.google\.com\//.test(confirmation) ? confirmation : undefined
  }));
  return { label: typeof settings.label === 'string' ? settings.label : '', days };
}

async function readPhoto(request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > photoLimit) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return data;
}

async function photoRequest(request, path, album) {
  if (!album) return text('Album storage unavailable', 503);
  if (path === 'api/photos' && request.method === 'GET') return json(await album.list());
  const match = path.match(photoPath);
  if (!match) return text('Not found', 404);
  const [, day, id] = match;
  const key = `photos/${day}/${id}`;
  if (request.method === 'GET') {
    const photo = await album.get(key);
    if (!photo) return text('Not found', 404);
    return new Response(photo, { headers: { 'Content-Type': 'image/jpeg', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' } });
  }
  if (request.method !== 'PUT') return text('Method not allowed', 405);
  if (request.headers.get('Content-Type') !== 'image/jpeg') return text('Expected a JPEG photo', 415);
  const data = await readPhoto(request);
  if (!data) return text('Photo exceeds upload limit', 413);
  if (data.length < 8 || data[0] !== 255 || data[1] !== 216 || data[2] !== 255 || data.at(-2) !== 255 || data.at(-1) !== 217) return text('Invalid JPEG', 415);
  await album.put(key, data);
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } });
}

export function photoMetadata(key, created) {
  const match = `api/${key}`.match(photoPath);
  return match ? { id: match[2], day: Number(match[1]), created: +created } : null;
}

async function landscape(key) {
  if (!Object.hasOwn(media, key)) return text('Not found', 404);
  for (const url of imageSource(key)) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'SvanetiTrekJournal/1.0 (Wikimedia photo attribution in app)' }, signal: AbortSignal.timeout(6500) });
      if (res.ok && res.headers.get('Content-Type')?.startsWith('image/')) {
        return new Response(res.body, { headers: { 'Content-Type': res.headers.get('Content-Type'), 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
      }
      await res.body?.cancel();
    } catch { /* Try the original image if the thumbnail is unavailable. */ }
  }
  return text('Landscape temporarily unavailable', 502);
}

export async function handle(request, { assets, album, expenseBucket, settings, identity }) {
  const url = new URL(request.url);
  const path = url.pathname.slice(1) || 'index.html';
  if (!identity) return text('Sign in to access the trip', 401);
  try {
    if (path === 'api/expenses') return await expenseEndpoint(request, expenseBucket, settings, identity.email);
    if (path === 'api/trip' && request.method === 'GET') return json(tripDetails(settings, identity.email));
    if (path === 'api/photos' || path.startsWith('api/photos/')) return await photoRequest(request, path, album);
    if (request.method !== 'GET' && request.method !== 'HEAD') return text('Method not allowed', 405);
    if (path.startsWith('media/')) return landscape(path.slice(6));
    const asset = Object.hasOwn(assets, path) && assets[path];
    if (!asset) return text('Not found', 404);
    const [mime, data] = asset;
    return new Response(request.method === 'HEAD' ? null : data, { headers: {
      'Content-Type': mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-cache',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: https://upload.wikimedia.org https://services.arcgisonline.com https://tile.openstreetmap.org; connect-src 'self' https://api.open-meteo.com; object-src 'none'; base-uri 'none'; form-action 'self'"
    } });
  } catch (error) {
    console.error('Trek request failed:', error?.name);
    return text('Service temporarily unavailable', 503);
  }
}
