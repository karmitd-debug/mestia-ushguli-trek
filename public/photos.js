const maxBytes = 5 * 1024 * 1024;
const localImageUrls = new Map();
let opening;

function database() {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('svaneti-journal', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return opening;
}

async function records(mode, run) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', mode);
    const task = run(transaction.objectStore('photos'));
    transaction.oncomplete = () => resolve(task.result);
    transaction.onabort = () => reject(transaction.error || task.error);
    transaction.onerror = () => reject(transaction.error || task.error);
  });
}
const list = () => records('readonly', store => store.getAll());
const save = photo => records('readwrite', store => store.put(photo));

async function scaledJpeg(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth*scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight*scale));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .86));
    if (!blob || blob.size > maxBytes) throw new Error('image conversion failed');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

export function photoJournal({ input, gallery, status }) {
  let day = 1, remote = [], rendering = 0, inFlight, addedWhileSyncing = false, notice = '';

  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-dialog';
  dialog.innerHTML = '<form method="dialog"><button class="outline">סגירה</button></form><img alt="תמונה מוגדלת מיומן הטרק">';
  document.body.append(dialog);

  async function draw() {
    const version = ++rendering;
    let local = [];
    try { local = await list(); } catch { /* The online album is still available. */ }
    if (version !== rendering) return;
    const merged = new Map(remote.map(photo => [photo.id, photo]));
    for (const photo of local) merged.set(photo.id, photo);
    const photos = [...merged.values()].filter(photo => photo.day === day).sort((a,b) => b.created - a.created);
    gallery.replaceChildren();
    if (!photos.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'עדיין אין תמונות ביומן ליום הזה.';
      gallery.append(empty);
    }
    for (const photo of photos) {
      const figure = document.createElement('figure');
      const caption = document.createElement('figcaption');
      const link = document.createElement('a');
      const image = document.createElement('img');
      if (photo.blob && !localImageUrls.has(photo.id)) localImageUrls.set(photo.id, URL.createObjectURL(photo.blob));
      link.href = localImageUrls.get(photo.id) || `api/photos/${photo.day}/${photo.id}`;
      image.src = link.href;
      image.alt = `תמונה מיום ${day}`;
      image.loading = 'lazy';
      link.append(image);
      link.addEventListener('click', event => {
        event.preventDefault();
        dialog.querySelector('img').src = link.href;
        dialog.showModal();
      });
      caption.textContent = photo.pending ? 'ממתינה לסנכרון' : 'באלבום המשותף';
      figure.append(link, caption);
      gallery.append(figure);
    }
    const waiting = local.filter(photo => photo.pending).length;
    status.textContent = [notice, waiting ? `${waiting} תמונות ממתינות לסנכרון.` : 'תמונות שסונכרנו זמינות למשתתפי הטרק.'].filter(Boolean).join(' ');
  }

  async function sync() {
    if (inFlight) { addedWhileSyncing = true; return inFlight; }
    if (!navigator.onLine) { notice = 'אין כרגע חיבור לאינטרנט.'; return draw(); }
    inFlight = (async () => {
      try {
        const local = await list().catch(() => []);
        for (const photo of local.filter(item => item.pending)) {
          const response = await fetch(`api/photos/${photo.day}/${photo.id}`, { method: 'PUT', body: photo.blob, headers: { 'Content-Type': 'image/jpeg' }, signal: AbortSignal.timeout(20000) });
          if (!response.ok) throw new Error(`upload ${response.status}`);
          await save({ ...photo, pending: false });
        }
        const response = await fetch('api/photos', { cache: 'no-store', signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error(`album ${response.status}`);
        remote = await response.json();
        notice = '';
      } catch { notice = 'אין כרגע חיבור לאלבום. תמונות שנשמרו בטלפון יסתנכרנו כשהחיבור יחזור.'; }
      await draw();
    })();
    try { await inFlight; } finally { inFlight = undefined; }
    if (addedWhileSyncing) { addedWhileSyncing = false; return sync(); }
  }

  input.addEventListener('change', async () => {
    const targetDay = day;
    const files = [...input.files];
    input.value = '';
    if (!files.length) return;
    input.disabled = true;
    status.textContent = `שומרים תמונות ליום ${targetDay}…`;
    let failed = 0;
    for (const file of files) {
      try { await save({ id: crypto.randomUUID(), day: targetDay, created: Date.now(), blob: await scaledJpeg(file), pending: true }); }
      catch { failed++; }
    }
    input.disabled = false;
    const errorMessage = failed ? `${failed} תמונות לא נשמרו. נסו קובץ JPEG או PNG ובדקו את שטח האחסון.` : '';
    await draw();
    await sync();
    if (errorMessage) status.textContent = `${errorMessage} ${status.textContent}`;
  });
  window.addEventListener('online', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  window.setInterval(() => { if (!document.hidden && location.hash === '#photos') sync(); }, 45000);
  sync();
  return { show(value) { day = value; draw(); }, refresh: sync };
}
