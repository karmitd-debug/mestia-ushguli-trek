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
    [
      "יציאה ממסטיה",
      "התחילו בכיכר המרכזית. רדו לכיוון הנהר, חצו אותו ופנו שמאלה לדרך המסומנת. אחרי בתי הכפר, הרחוב הופך לדרך עפר בעלייה."
    ],
    [
      "העלייה לתצפית",
      "בשלט לכיוון ז׳בשי פנו ימינה בעלייה. הדרך עוברת ביער דליל ובמרעה. עקבו אחר הסימון כששביל קצר ותלול ביער חותך את דרך העפר וחוזר אליה."
    ],
    [
      "תצפית על עמק מולחורה",
      "המשיכו אל האחו ואל נקודת התצפית על העמק ורכס טטנולדי. זו נקודת עצירה נוחה לפני הירידה."
    ],
    [
      "הירידה לעמק",
      "בירידה תגיעו לפיצול ליד מבנה הרוס. השביל העליון הוא חלופה. כדי להישאר במסלול היומי, השוו לקובץ ה־GPX והמשיכו בירידה לכיוון הכפרים שבעמק."
    ],
    [
      "הכפרים האחרונים",
      "עברו בז׳אמושי, חצו את פלג חראז׳י והמשיכו לצ׳ולאשי. משם התקדמו אל הגשר מדרום לכפר, חצו את נהר מולחורה, ועברו דרך צ׳וואביאני עד ז׳בשי. אם הגישה לגשר השתנתה, בררו בכפר לפני שתמשיכו."
    ]
  ],
  [
    [
      "יציאה מז׳בשי",
      "עלו דרומה לאורך הפלג של הכפר. ליד הבית והמגדל האחרונים חצו את הפלג והמשיכו בשביל עד הצומת המשולט לאדישי."
    ],
    [
      "עלייה דרך המרעה",
      "השביל עולה דרך מרעה ויער, עם נוף שנפתח בהדרגה לעמק מולחורה. כששבילי עדרים מתפצלים, היצמדו לסימון ולתוואי שבמפה."
    ],
    [
      "אזור הסקי טטנולדי",
      "כשתגיעו לקו הרכבל, המשיכו במעלה הדרך של אזור הסקי. חפשו את הפנייה המשולטת Hadiish, באזור 2,500 מטר."
    ],
    [
      "מהפנייה אל אדישי",
      "המסלול שבקובץ יורד מהמדרונות הפתוחים לעבר היער והפלג. אל תמשיכו לעלות לכיוון תחנת הרכבל העליונה אם אתם עוקבים אחר המקטע היומי."
    ],
    [
      "הגעה לכפר",
      "אחרי חציית הפלג, המשיכו בירידה עד שהבתים הראשונים של אדישי יופיעו מתחת למדרון. קחו בחשבון שהכפר עשוי להיות מוסתר עד סמוך להגעה."
    ]
  ],
  [
    [
      "מאדישי לנקודת החצייה",
      "צאו מזרחה בשביל לאורך עמק אדישי, לכיוון הקרחון. אחרי כשעה בקירוב מגיעים לנהר שחוצה את התוואי. בררו בכפר ערב קודם מה מצב הזרימה ואם אפשר לתאם סיוע מקומי."
    ],
    [
      "חציית נהר אדישי",
      "אם אין דרך בטוחה לחצות, עצרו וחזרו לכפר לתיאום חלופה. המסלול בקובץ מציין את התוואי המתוכנן בלבד. בדקו את תנאי החצייה בשטח באותו יום."
    ],
    [
      "עלייה למעבר צ׳חונדרי",
      "אחרי הנהר השביל מתחדש ומטפס למעבר צ׳חונדרי. העלייה ממושכת. סמוך למעבר נפתח מבט אל קרחון אדישי, אם הראות מאפשרת."
    ],
    [
      "ירידה לעמק חלדה",
      "מהמעבר יורדים אל העמק שמעבר לרכס. בתחתית הירידה, ממשיכים לאורך נהר חלדצ׳אלה בכיוון הכפר חלדה."
    ],
    [
      "מחלדה לאיפרלי",
      "עוברים בכפר חלדה וממשיכים במורד העמק עד איפרלי. חלדה היא נקודת מעבר ביום הזה. המקטע מסתיים באיפרלי."
    ]
  ],
  [
    [
      "יציאה מאיפרלי",
      "רדו מאיפרלי דרך אזור גשר חלדצ׳אלה והמשיכו לכיוון דאווברי. יש כאן יותר מדרך אחת. השוו את הפנייה למסלול היומי במפה."
    ],
    [
      "הטיפוס מאזור דאווברי",
      "אם הגישה לתוואי ההליכה פתוחה, עולים מאזור דאווברי בשביל אל צלע ההר. בדקו את השילוט ואת המפה, במיוחד אם יש גדר או שינוי בגישה."
    ],
    [
      "הליכה מעל העמק",
      "אחרי העלייה, התוואי ממשיך לאורך המדרון. בקטעי היער הסימון עשוי להיות דליל. פתחו את מפת המקטע לפני פיצולים ובדקו שהמיקום תואם לקו המסלול."
    ],
    [
      "ההתקרבות לאושגולי",
      "השביל מתקרב שוב לדרך המכוניות. כשצועדים בצמוד אליה, שימו לב לג׳יפים. יש גם חלופות דרך כפרי העמק, ולכן כדאי להשוות לקובץ היומי לפני סטייה."
    ],
    [
      "סיום הטרק",
      "עקבו אחר המפה עד סמן הסיום באושגולי. ההליכה לקרחון שחארה, אם תצאו אליה למחרת, היא מסלול נפרד."
    ]
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
  element.innerHTML = `${chip(day, `יום ${id} · ${day.date ? formatDate(day.date) : ""}${today?.id === id ? ' · היום' : ''}`)}<h2>${day.title}</h2><div class="detail-grid"><div><div class="metrics"><span>${km(day.track.length)} ק״מ</span><span>${day.range}</span><span>${day.effort}</span></div><h3>מהלך הדרך</h3><ol class="steps">${day.pointsOfInterest.map(step => `<li>${step}</li>`).join('')}</ol><p class="attention">${day.note}</p><div class="day-links"><a class="outline" id="day-map" href="#map">מקטע היום במפה</a><a class="outline" href="gpx/${day.file}" download>↓ קובץ GPX</a><a class="outline" href="#photos">תמונות מהיום</a><a class="outline" href="#guide/${id}">מדריך המסלול המלא</a></div></div><div class="side-stack"><div class="inset"><h3>מזג האוויר במסלול</h3><p>נקודת תחזית: כ־${Math.round(day.weather[2])} מ׳, באזור הגבוה במקטע.</p><p id="forecast" role="status"></p><div class="day-links"><button id="refresh-weather" class="outline" type="button">רענון תחזית</button></div></div><div class="inset"><h3>לינה בסוף היום</h3><p><b dir="ltr">${escape(day.stay)}</b></p><div class="day-links">${day.booking ? link(`https://www.booking.com/hotel/ge/${day.booking}.he.html`, 'דף מקום הלינה') : ''}${link(travels, 'ההזמנה שלי ב־Booking', 'id="booking-entry"')}</div><details><summary>שמירת קישור ישיר להזמנה</summary><p>הדביקי קישור לניהול ההזמנה שקיבלת מ־Booking. הוא יישמר בדפדפן הזה בלבד.</p><form class="booking-form"><input type="url" name="booking" maxlength="3000" placeholder="https://…" aria-label="קישור פרטי להזמנה"><button class="outline" type="submit">שמירה</button><button class="outline" type="button" id="clear-booking">איפוס קישור</button><p id="booking-status" role="status"></p></form></details></div></div></div>`;
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
const flightPanel = document.createElement('section');
flightPanel.id = 'flights';
flightPanel.className = 'panel photo-panel';
flightPanel.innerHTML = '<div class="section-head"><div><h2>כרטיסי טיסה</h2><p id="flight-status" role="status"></p></div><a class="primary" hidden id="flight-open" target="_blank" rel="noopener noreferrer">פתיחת אישור הלוך וחזור</a></div>';
document.querySelector('.trip-stats').after(flightPanel);
const flightButton = byId('flight-open');
flightButton.style.display = 'none';
const flightStatus = byId('flight-status');
const flightKey = 'svaneti-ticket-gmail-id';
const validTicket = value => typeof value === 'string' && /^[0-9a-f]{16}$/.test(value);
let ticket;
try { ticket = localStorage.getItem(flightKey); } catch { /* Session still works. */ }

function openFlightSection() {
  const incoming = /^#flight-ticket\/([0-9a-f]{16})$/.exec(location.hash);
  if (incoming) {
    ticket = incoming[1];
    try { localStorage.setItem(flightKey, ticket); } catch { /* Use the link for this session. */ }
    history.replaceState(null, '', '#flights');
    flightPanel.scrollIntoView({ block: 'start' });
  }
  flightButton.hidden = !validTicket(ticket);
  flightButton.style.display = flightButton.hidden ? 'none' : 'inline-flex';
  if (validTicket(ticket)) flightButton.href = `https://mail.google.com/mail/u/0/#all/${ticket}`;
  flightStatus.textContent = validTicket(ticket)
    ? 'אישור ההזמנה כולל את שתי הטיסות. הפתיחה דורשת כניסה לחשבון Gmail שקיבל את האישור.'
    : 'אפשר לחבר את אישור ההזמנה במכשיר הזה באמצעות הקישור האישי.';
}
openFlightSection();
window.addEventListener('hashchange', openFlightSection);

const guidePanel = document.createElement('dialog');
guidePanel.className = 'panel day-detail';
guidePanel.style.cssText = 'width:min(720px,calc(100% - 24px));max-height:85vh;overflow:auto;margin:auto';
guidePanel.addEventListener('close', () => {
  const day = /^#guide\/([1-4])$/.exec(location.hash);
  if (day) location.hash = `day/${day[1]}`;
});
guidePanel.id = 'daily-guide';
guidePanel.hidden = true;
byId('day').after(guidePanel);

function onHash() {
  const guideMatch = location.hash.match(/^#guide\/([1-4])$/);
  if (!guideMatch && guidePanel.open) guidePanel.close();
  if (guideMatch) {
    const id = Number(guideMatch[1]);
    const day = itinerary[id - 1];
    showDay(id);
    guidePanel.style.setProperty('--accent', day.color);
    guidePanel.innerHTML = `${chip(day, `מדריך יום ${id}`)}<h2 tabindex="-1">${day.title}</h2><p class="metrics">${km(day.track.length)} ק״מ · ${day.range}</p><ol class="steps">${guideStages[id-1].map(([title, step]) => `<li><strong>${title}</strong><br>${step}</li>`).join('')}</ol><p class="attention">${day.note}</p><div class="day-links"><a class="outline" href="#day/${id}">חזרה ליום ${id}</a><a class="outline" href="gpx/${day.file}" download>↓ קובץ GPX</a><a class="outline" href="https://www.caucasus-trekking.com/treks/trek-mestia-to-ushguli#day${id}" target="_blank" rel="noopener noreferrer">מקור המסלול · יום ${id}</a></div>`;
    guidePanel.hidden = false;
    if (!guidePanel.open) guidePanel.showModal();
    guidePanel.scrollTop = 0;
    guidePanel.querySelector('h2').focus({ preventScroll: true });
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
