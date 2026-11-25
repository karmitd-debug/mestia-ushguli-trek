import { georgiaToday } from './route.js';

const settings = 'weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max,wind_gusts_10m_max';
const dateMs = day => Date.parse(`${day}T12:00Z`);
const labels = code => code === null ? 'מצב שמיים לא זמין' : code === 0 ? 'בהיר' : code <= 3 ? 'עננות' : code <= 48 ? 'ערפל' : code >= 95 ? 'סופות רעמים' : [71,73,75,77,85,86].includes(code) ? 'שלג' : 'גשם או ממטרים';

function saved(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function display(element, record, cached) {
  const [code, low, high, rain, wind] = record.values;
  const val = (v, suffix) => Number.isFinite(v) ? `${Math.round(v)}${suffix}` : '—';
  const updated = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Tbilisi', dateStyle: 'short', timeStyle: 'short' }).format(new Date(record.updated));
  element.textContent = `${labels(code)} · ${val(low,'°')} עד ${val(high,'°')} · סיכוי למשקעים ${val(rain,'%')} · משבים ${val(wind,' קמ״ש')}. ${cached ? 'התחזית האחרונה שנשמרה' : 'עודכן'} ב־${updated} (שעון גאורגיה).`;
}

export async function showWeather(day, element) {
  if (!day.date) { element.textContent = 'תחזית יומית תופיע בגרסה עם תאריכי הטרק.'; return; }
  const offset = Math.round((dateMs(day.date) - dateMs(georgiaToday())) / 86400000);
  const key = `svaneti-weather-${day.date}`;
  const old = saved(key);
  if (offset < 0) { element.textContent = 'יום ההליכה כבר עבר.'; return; }
  if (offset > 15) { element.textContent = 'התחזית תופיע כשיום ההליכה יהיה בטווח של עד 16 ימי התחזית.'; return; }
  if (old) display(element, old, true);
  else element.textContent = 'טוענים תחזית לנקודה הגבוהה של היום…';
  const [latitude, longitude, elevation] = day.weather;
  const params = new URLSearchParams({ latitude, longitude, elevation: Math.round(elevation), start_date: day.date, end_date: day.date, daily: settings, timezone: 'Asia/Tbilisi' });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('forecast unavailable');
    const { daily } = await response.json();
    if (daily?.time?.[0] !== day.date) throw new Error('unexpected forecast date');
    const values = settings.split(',').map(key => daily[key]?.[0] ?? null);
    if (!values.some(Number.isFinite)) throw new Error('empty forecast');
    const record = { updated: Date.now(), values };
    try { localStorage.setItem(key, JSON.stringify(record)); } catch { /* Forecast remains visible. */ }
    display(element, record, false);
  } catch {
    if (!old) element.textContent = 'אין תחזית זמינה כרגע. נסו שוב כשיש חיבור לאינטרנט.';
  }
}
