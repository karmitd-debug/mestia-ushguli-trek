import { itinerary, georgiaToday, formatDate, km } from './route.js';
import { mapControls } from './map.js';
import { photoJournal } from './photos.js';
import { showWeather } from './weather.js';
import { imageSource, media } from './media.js';

const byId = id => document.getElementById(id);
async function loadTrip() {
  try {
    const response = await fetch('api/trip', { cache: 'no-store', signal: AbortSignal.timeout(4500) });
    if (!response.ok) throw new Error('trip unavailable');
    const config = await response.json();
    try { localStorage.setItem('svaneti-trip', JSON.stringify(config)); } catch { /* The trip remains available in this session. */ }
    return config;
  } catch {
    try { return JSON.parse(localStorage.getItem('svaneti-trip')) || {}; } catch { return {}; }
  }
}
const config = {};
for (const [i, day] of itinerary.entries()) if (config.days?.[i]) Object.assign(day, config.days[i]);
const today = itinerary.find(day => day.date === georgiaToday());
let dayId = today?.id || 1;
let filter = 0;
const travels = 'https://secure.booking.com/myreservations.html';
const guideStages = [
  [
    "מכיכר מסטיה יוצאים אל הנהר, חוצים אותו ופונים לדרך המסומנת. בעלייה חפשו את השלט לז׳בשי.",
    "ממשיכים דרך יער ומרעה אל התצפית על עמק מולחורה. בירידה עוקבים אחר התוואי שבקובץ.",
    "עוברים דרך ז׳אמושי וצ׳ולאשי. חוצים את נהר מולחורה מדרום לצ׳ולאשי וממשיכים דרך צ׳וואביאני עד ז׳בשי."
  ],
  [
    "עולים מז׳בשי לאורך הפלג וחוצים אותו ליד קצה הכפר. בצומת הבא מחפשים את השלט לאדישי.",
    "מטפסים דרך מרעה ויער אל אזור הרכבל של טטנולדי. במעלה דרך הסקי חפשו את הפנייה המשולטת Hadiish.",
    "חוצים מדרונות פתוחים ויורדים דרך יער ופלג עד אדישי."
  ],
  [
    "יוצאים מזרחה מאדישי לאורך הנהר עד נקודת החצייה. בררו מראש בכפר מה מצב הזרימה ואיזה סיוע זמין.",
    "מעבר לנהר עולים למעבר צ׳חונדרי, שממנו נשקף קרחון אדישי. יורדים לעמק שמצדו השני.",
    "ממשיכים לאורך נהר חלדצ׳אלה, עוברים בכפר חלדה ומסיימים באיפרלי."
  ],
  [
    "מאיפרלי יורדים לכיוון גשר חלדצ׳אלה וממשיכים לכיוון דאווברי. השוו את הפניות לקובץ היומי, שכן יש כמה חלופות.",
    "ממשיכים על צלע ההר מעל העמק. היעזרו במפה בקטעים שבהם הסימון דליל.",
    "לקראת אושגולי השביל מתקרב לכביש. המשיכו לפי המפה עד נקודת הסיום באושגולי."
  ]
];
const chip = (day, title) => `<span class="chip" style="--accent:${day.color}"><span class="dot"></span>${title}</span>`;
const link = (url, title, extra = '') => `<a class="outline" href="${url}" target="_blank" rel="noopener noreferrer" ${extra}>${title}</a>`;
const dayButton = (day, selected) => `<button type="button" data-value="${day.id}" aria-pressed="${selected}" style="--accent:${day.color}"><span class="dot"></span>יום ${day.id}</button>`;
const actions = byId('hero-action');
byId('trip-dates').textContent = 'ארבעה ימי הליכה בסוואנתי';
if (today) { actions.href = `#day/${today.id}`; actions.textContent = 'למסלול של היום ←'; }
byId('total-distance').textContent = km(itinerary.reduce((sum, day) => sum + day.track.length, 0));
byId('day-cards').innerHTML = itinerary.map(day => `<a class="day-card" style="--accent:${day.color}" href="#day/${day.id}" data-day="${day.id}"><div class="card-image"><img data-media="${day.image}" alt="${media[day.image][4]}">${chip(day, `יום ${day.id}${today?.id === day.id ? ' · היום' : ''}`)}</div><div class="card-copy"><time datetime="${day.date}">${day.date ? formatDate(day.date) : ""}</time><h3>${day.title}</h3><small>${km(day.track.length)} ק״מ · ${day.range}</small></div></a>`).join('');
for (const img of document.querySelectorAll('.hero img, .card-image img')) {
  const key = img.dataset.media;
  const sources = imageSource(key);
  function fallback() {
    const next = sources.shift();
    if (next) img.src = next;
    else img.hidden = true;
  }
  img.addEventListener('error', fallback);
  fallback();
}
byId('credits').innerHTML = Object.values(media).map(([file,, author, license, place]) => `<li>${place} — <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}" target="_blank" rel="noopener">${author}</a> · <a href="https://creativecommons.org/${license.startsWith('zero') ? 'publicdomain' : 'licenses'}/${license}/" target="_blank" rel="noopener">${license.toUpperCase()}</a></li>`).join('');

const map = mapControls({ container: byId('route-map'), status: byId('gps-status'), locate: byId('location'), setFilter });
const photos = photoJournal({ input: byId('photo-input'), gallery: byId('gallery'), status: byId('photo-status'), shared: false });
const photoStatus = byId('photos-day');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function setFilter(id) {
  filter = id;
  byId('map-filter').innerHTML = `<button type="button" data-value="0" aria-pressed="${!id}">כל הטרק</button>` + itinerary.map(d => dayButton(d, id === d.id)).join('');
  map.show(id);
}

function setPhotoDay(id) {
  byId('photo-days').innerHTML = itinerary.map(d => dayButton(d, id === d.id)).join('');
  const day = itinerary[id-1];
  photoStatus.textContent = `יום ${id} · ${day.title} · ${day.date ? formatDate(day.date) : ""}`;
  photos.show(id);
}

function showDay(id) {
  dayId = id;
  const day = itinerary[id-1];
  for (const card of document.querySelectorAll('[data-day]')) card.setAttribute('aria-current', String(Number(card.dataset.day) === id));
  const element = byId('day');
  element.style.setProperty('--accent', day.color);
  element.innerHTML = `${chip(day, `יום ${id} · ${day.date ? formatDate(day.date) : ""}${today?.id === id ? ' · היום' : ''}`)}<h2>${day.title}</h2><div class="detail-grid"><div><div class="metrics"><span>${km(day.track.length)} ק״מ</span><span>${day.range}</span><span>${day.effort}</span></div><h3>מהלך הדרך</h3><ol class="steps">${day.pointsOfInterest.map(step => `<li>${step}</li>`).join('')}</ol><p class="attention">${day.note}</p><div class="day-links"><a class="outline" id="day-map" href="#map">מקטע היום במפה</a><a class="outline" href="gpx/${day.file}" download>↓ קובץ GPX</a><a class="outline" href="#photos">תמונות מהיום</a><a class="outline" href="#guide/${id}">מדריך המסלול של יום ${id}</a></div></div><div class="side-stack"><div class="inset"><h3>מזג האוויר במסלול</h3><p>נקודת תחזית: כ־${Math.round(day.weather[2])} מ׳, באזור הגבוה במקטע.</p><p id="forecast" role="status"></p><div class="day-links"><button id="refresh-weather" class="outline" type="button">רענון תחזית</button></div></div><div class="inset"><h3>לינה בסוף היום</h3><p><b dir="ltr">${escape(day.stay)}</b></p><div class="day-links">${day.booking ? link(`https://www.booking.com/hotel/ge/${day.booking}.he.html`, 'דף מקום הלינה') : ''}${link(travels, 'ההזמנה שלי ב־Booking', 'id="booking-entry"')}</div><details><summary>שמירת קישור ישיר להזמנה</summary><p>הדביקי קישור לניהול ההזמנה שקיבלת מ־Booking. הוא יישמר בדפדפן הזה בלבד.</p><form class="booking-form"><input type="url" name="booking" maxlength="3000" placeholder="https://…" aria-label="קישור פרטי להזמנה"><button class="outline" type="submit">שמירה</button><button class="outline" type="button" id="clear-booking">איפוס קישור</button><p id="booking-status" role="status"></p></form></details></div></div></div>`;
  const forecast = byId('forecast');
  showWeather(day, forecast);
  byId('refresh-weather').onclick = () => showWeather(day, forecast);
  byId('day-map').onclick = () => setFilter(id);
  bookingControls(element, id);
  setPhotoDay(id);
}

function bookingControls(element, id) {
  const form = element.querySelector('form');
  const entry = byId('booking-entry');
  const defaultLink = itinerary[id-1].privateLink || travels;
  entry.textContent = itinerary[id-1].privateLink ? 'אישור ההזמנה במייל' : 'ההזמנות שלי ב־Booking';
  entry.href = defaultLink;
  const status = byId('booking-status');
  const key = `svaneti-private-booking-${id}`;
  try {
    const savedLink = localStorage.getItem(key);
    if (savedLink) { entry.href = savedLink; entry.textContent = 'פתיחת ההזמנה ב־Booking'; }
  } catch { /* Keep the standard Booking login link. */ }
  form.onsubmit = event => {
    event.preventDefault();
    try {
      const url = new URL(form.elements.booking.value.trim());
      if (url.protocol !== 'https:' || !/(^|\.)booking\.com$/i.test(url.hostname) || url.username || url.password || url.port) throw new TypeError();
      localStorage.setItem(key, url.href);
      entry.href = url.href;
      entry.textContent = 'פתיחת ההזמנה ב־Booking';
      form.reset();
      status.textContent = 'הקישור נשמר במכשיר הזה.';
    } catch { status.textContent = 'יש להזין קישור HTTPS תקין מאתר Booking.com ולאפשר שמירה בדפדפן.'; }
  };
  byId('clear-booking').onclick = () => {
    try { localStorage.removeItem(key); entry.href = defaultLink; entry.textContent = itinerary[id-1].privateLink ? 'אישור ההזמנה במייל' : 'ההזמנות שלי ב־Booking'; form.reset(); status.textContent = 'הקישור הישיר הוסר מהמכשיר.'; }
    catch { status.textContent = 'הדפדפן חסם את שינוי הקישור.'; }
  };
}

byId('map-filter').onclick = event => {
  const button = event.target.closest('button[data-value]');
  if (button) setFilter(Number(button.dataset.value));
};
byId('photo-days').onclick = event => {
  const button = event.target.closest('button[data-value]');
  if (button) setPhotoDay(Number(button.dataset.value));
};
byId('zoom-in').onclick = () => map.zoom(1.3);
byId('zoom-out').onclick = () => map.zoom(1/1.3);
const guidePanel = document.createElement('section');
guidePanel.className = 'panel day-detail';
guidePanel.id = 'daily-guide';
guidePanel.hidden = true;
byId('day').after(guidePanel);

function onHash() {
  const guideMatch = location.hash.match(/^#guide\/([1-4])$/);
  guidePanel.hidden = !guideMatch;
  if (guideMatch) {
    const id = Number(guideMatch[1]);
    const day = itinerary[id - 1];
    showDay(id);
    guidePanel.style.setProperty('--accent', day.color);
    guidePanel.innerHTML = `${chip(day, `מדריך יום ${id}`)}<h2 tabindex="-1">${day.title}</h2><p class="metrics">${km(day.track.length)} ק״מ · ${day.range}</p><ol class="steps">${guideStages[id-1].map(step => `<li>${step}</li>`).join('')}</ol><p class="attention">${day.note}</p><div class="day-links"><a class="outline" href="#day/${id}">חזרה ליום ${id}</a><a class="outline" href="gpx/${day.file}" download>↓ קובץ GPX</a></div>`;
    guidePanel.querySelector('h2').focus({ preventScroll: true });
    guidePanel.scrollIntoView({ block: 'start' });
    return;
  }
  const match = location.hash.match(/^#day\/([1-4])$/);
  if (match) {
    showDay(Number(match[1]));
    byId('day').scrollIntoView({ block: 'start' });
  } else if (location.hash === '#photos') photos.refresh();
}
window.addEventListener('hashchange', onHash);
byId('day-cards').addEventListener('click', event => {
  const card = event.target.closest('.day-card');
  if (card && card.hash === location.hash) onHash();
});
document.querySelector('nav a[href="#map"]').onclick = () => { if (filter) setFilter(0); };
showDay(dayId);
setFilter(0);
onHash();

const offlineButton = byId('offline');
const offlineStatus = byId('offline-status');
const worker = 'serviceWorker' in navigator ? navigator.serviceWorker.register('sw.js').catch(() => null) : Promise.resolve(null);
offlineButton.onclick = async () => {
  offlineStatus.hidden = false;
  offlineButton.disabled = true;
  offlineStatus.textContent = 'שומרים את המפה ומדריך המסלול במכשיר…';
  try {
    const registered = await worker;
    if (!registered) throw new Error('no service worker');
    const result = await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(reject, 20000))]);
    if (!result.active) throw new Error('service worker inactive');
    const message = new MessageChannel();
    const cached = new Promise((resolve, reject) => {
      const timeout = setTimeout(reject, 25000);
      message.port1.onmessage = event => { clearTimeout(timeout); resolve(event.data); };
    });
    result.active.postMessage('cache-trip', [message.port2]);
    const { ok, images } = await cached;
    message.port1.close();
    if (!ok) throw new Error('cache incomplete');
    await Promise.all(itinerary.map(day => showWeather(day, day.id === dayId ? byId('forecast') : document.createElement('p'))));
    offlineStatus.textContent = `המפה, ארבעת הימים וקובצי ה־GPX שמורים במכשיר.${images < 5 ? ' חלק מצילומי הנוף ייטענו כשיהיה חיבור.' : ''}`;
    offlineButton.textContent = '✓ המסלול שמור במכשיר';
  } catch { offlineStatus.textContent = 'שמירה ללא קליטה לא הושלמה. נסו שוב בחיבור יציב.'; }
  finally { offlineButton.disabled = false; }
};
