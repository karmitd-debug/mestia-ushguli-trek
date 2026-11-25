import { expenseFields } from '../public/expense-rules.js';

const expensePrefix = 'expenses/';
const expenseId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const privateHeaders = { 'Cache-Control': 'private, no-store' };
const expenseError = status => new Response(null, { status, headers: privateHeaders });
const expenseJson = (body, status = 200) => Response.json(body, { status, headers: privateHeaders });

function participantList(raw) {
  const list = raw ? JSON.parse(raw).participants : null;
  if (!Array.isArray(list) || list.length !== 4) return null;
  if (list.some(person => typeof person?.name !== 'string' || !person.name.trim() || typeof person.email !== 'string' || !person.email.includes('@'))) return null;
  const normalized = list.map(p => ({ name: p.name.trim(), email: p.email.trim().toLowerCase() }));
  return new Set(normalized.map(p => p.email)).size === 4 ? normalized : null;
}

export async function expenseEndpoint(request, bucket, settings, email) {
  const people = participantList(settings);
  if (!bucket || !people) return expenseError(503);
  const me = people.findIndex(person => person.email === email?.toLowerCase());
  if (me < 0) return expenseError(403);
  if (request.method === 'GET') {
    const entries = [];
    let cursor;
    do {
      const page = await bucket.list({ prefix: expensePrefix, cursor, include: ['customMetadata'] });
      for (const object of page.objects) if (object.customMetadata?.entry) entries.push(JSON.parse(object.customMetadata.entry));
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    entries.sort((a, b) => a.created - b.created || a.id.localeCompare(b.id));
    return expenseJson({ entries, names: people.map(person => person.name), me });
  }
  if (request.method !== 'POST') return expenseError(405);
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return expenseError(403);
  if (request.headers.get('Content-Type') !== 'application/json') return expenseError(415);
  const reader = request.body?.getReader();
  if (!reader) return expenseError(400);
  const decoder = new TextDecoder();
  let body = '', size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2048) { await reader.cancel(); return expenseError(413); }
    body += decoder.decode(value, { stream: true });
  }
  let input;
  try { input = JSON.parse(body + decoder.decode()); } catch { return expenseError(400); }
  const fields = expenseFields(input?.description, input?.currency, input?.amount);
  if (!fields || typeof input.id !== 'string' || !expenseId.test(input.id)) return expenseError(400);
  const entry = { ...fields, id: input.id, payer: me, created: Date.now() };
  const key = `${expensePrefix}${me}/${entry.id}`;
  const encoded = JSON.stringify(entry).replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const stored = await bucket.put(key, '', { customMetadata: { entry: encoded }, onlyIf: { etagDoesNotMatch: '*' } });
  if (stored) return expenseJson({ entry }, 201);
  const existing = await bucket.head(key);
  return existing?.customMetadata?.entry ? expenseJson({ entry: JSON.parse(existing.customMetadata.entry) }) : expenseError(409);
}
