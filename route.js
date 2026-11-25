import tracks from './tracks.js';

const radians = Math.PI / 180;
const earth = 6371000;
export const villages = ['מסטיה', 'ז׳בשי', 'אדישי', 'איפרלי', 'אושגולי'];
const dateFmt = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', timeZone: 'Asia/Tbilisi' });
const dateKey = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tbilisi' });
export const georgiaToday = (now = new Date()) => dateKey.format(now);
export const formatDate = iso => dateFmt.format(new Date(`${iso}T12:00:00Z`));

export function distance(a, b) {
  const dLat = (b[0] - a[0]) * radians;
  const dLon = (b[1] - a[1]) * radians;
  const h = Math.sin(dLat / 2)**2 + Math.cos(a[0]*radians)*Math.cos(b[0]*radians)*Math.sin(dLon / 2)**2;
  return 2 * earth * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function prepareTrack(points) {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]));
  return { points, cumulative, length: cumulative.at(-1) };
}

export function progressAt(fix, track) {
  const lonScale = Math.cos(fix[0] * radians);
  const relative = p => [(p[1] - fix[1]) * lonScale, p[0] - fix[0]];
  let closest = { offset: Infinity, walked: 0 };
  for (let i = 1; i < track.points.length; i++) {
    const [x, y] = relative(track.points[i - 1]);
    const [bX, bY] = relative(track.points[i]);
    const dx = bX - x;
    const dy = bY - y;
    const size = dx*dx + dy*dy;
    const t = size ? Math.max(0, Math.min(1, -(x*dx + y*dy)/size)) : 0;
    const offset = Math.hypot(x + t*dx, y + t*dy) * earth * radians;
    if (offset < closest.offset) closest = { offset, walked: track.cumulative[i - 1] + t*(track.cumulative[i] - track.cumulative[i - 1]) };
  }
  return { ...closest, remaining: Math.max(0, track.length - closest.walked) };
}

export const itinerary = [
  {
    color: '#216b4f', image: 'zhabeshi', range: '5–7 שעות', effort: 'בינוני', file: 'day-1-mestia-zhabeshi.gpx',
    pointsOfInterest: ['יוצאים מכיכר מסטיה, חוצים את הנהר ומתחילים בעלייה הדרגתית בדרך עפר ושבילי מרעה. בנקודת הפיצול עקבו אחר המקטע שהורדתם מראש.', 'אחרי העלייה יורדים לעמק מולאחורה. עוברים ליד כפרים ומגדלים סוואניים, וממשיכים מזרחה עד ז׳בשי.'],
    note: 'כדאי למלא מים ולצאת ממסטיה עם ארוחת צהריים. זהו יום ארוך עם עלייה מוקדמת.'
  },
  {
    color: '#a34c16', image: 'adishi', range: '5–6 שעות', effort: 'בינוני–מאתגר', file: 'day-2-zhabeshi-adishi.gpx',
    pointsOfInterest: ['יוצאים מז׳בשי בגדה הדרומית ומתחילים בעלייה ממושכת דרך היער והמרעה, לכיוון אזור הסקי טטנולדי.', 'עוקבים אחר המסלול התחתון בקובץ היומי ויורדים דרך מדרונות פתוחים לכפר אדישי.'],
    note: 'העלייה בתחילת היום ממושכת. השאירו זמן לעצירות, ובדקו את התחזית באזור טטנולדי.'
  },
  {
    color: '#5f4b9e', image: 'glacier', range: '7–9 שעות', effort: 'מאתגר', file: 'day-3-adishi-iprali.gpx',
    pointsOfInterest: ['יוצאים מוקדם מאדישי לאורך העמק אל חציית נהר אדישיצ׳אלה. בררו ערב קודם אצל המארחים על מצב הזרימה ועל אפשרות לחצייה בסיוע מקומי.', 'לאחר החצייה מטפסים אל מעבר צ׳חונדֶרי. ממנו יורדים לעמק חלדה ועוברים בכפר חלדה לפני שממשיכים לאיפרלי.'],
    note: 'אם הזרימה חזקה או החצייה אינה בטוחה, עוצרים וחוזרים לאדישי כדי לתאם חלופה מקומית. בדקו גם שלג וראות במעבר.'
  },
  {
    color: '#23648c', image: 'ushguli', range: '4–6 שעות', effort: 'בינוני', file: 'day-4-iprali-ushguli.gpx',
    pointsOfInterest: ['יוצאים מאיפרלי לכיוון לַלחוֹרי ודבראלי. לאורך העמק יש אפשרויות הליכה שונות. במפה מסומן המקטע שבקובץ ה־GPX היומי.', 'ממשיכים לאורך העמק עד למקבץ הכפרים של אושגולי. מסיימים את הטרק באושגולי.'],
    note: 'בחלקים הסמוכים לדרך הרכב שימו לב לתנועת כלי רכב. הביקור בקרחון שחארה הוא טיול נפרד.'
  }
].map((day, i) => {
  const track = prepareTrack(tracks[i]);
  const weather = track.points.reduce((a, b) => (b[2] ?? 0) > (a[2] ?? 0) ? b : a);
  return { ...day, id: i + 1, track, weather, stay: villages[i + 1], title: `${villages[i]} ← ${villages[i + 1]}` };
});

export const km = meters => (meters / 1000).toFixed(1);
