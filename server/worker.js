import { assets } from './generated-assets.js';
import { handle, photoMetadata } from './handler.js';

function bucketAlbum(bucket) {
  return {
    async list() {
      const photos = [];
      let cursor;
      do {
        const page = await bucket.list({ prefix: 'photos/', cursor });
        for (const { key, uploaded } of page.objects) {
          const photo = photoMetadata(key, uploaded);
          if (photo) photos.push(photo);
        }
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      return photos;
    },
    async get(key) { return (await bucket.get(key))?.body; },
    async put(key, bytes) { await bucket.put(key, bytes, { onlyIf: { etagDoesNotMatch: '*' } }); }
  };
}

export default {
  fetch(request, env) {
    const id = request.headers.get('oai-authenticated-user-id');
    return handle(request, {
      assets,
      settings: env.TRIP_SETTINGS,
      identity: id ? { email: request.headers.get('oai-authenticated-user-email') } : null,
      album: env.BUCKET ? bucketAlbum(env.BUCKET) : null
    });
  }
};
