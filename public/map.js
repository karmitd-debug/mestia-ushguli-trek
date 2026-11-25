import { itinerary, villages, progressAt, km } from './route.js';

const world = 256 * 2**12;
const latitudeLimit = 85.05112878;
const osm = 'https://tile.openstreetmap.org';
const esri = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer';

export function mercator([latitude, longitude]) {
  const lat = Math.max(-latitudeLimit, Math.min(latitudeLimit, latitude)) * Math.PI / 180;
  return [world * (longitude + 180) / 360, world * (1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2];
}

const origin = mercator([43.048, 42.724]);
const project = p => mercator(p).map((value, i) => value - origin[i]);
const rounded = n => n.toFixed(2);
const scale = world / 40075.017 / Math.cos(43 * Math.PI / 180);

export function visibleTiles(left, top, width, height, pixelWidth) {
  const z = Math.max(10, Math.min(16, Math.round(12 + Math.log2(pixelWidth / width))));
  const size = world / 2**z;
  const tiles = [];
  for (let y = Math.floor((top + origin[1]) / size); y < Math.ceil((top + height + origin[1]) / size); y++) {
    for (let x = Math.floor((left + origin[0]) / size); x < Math.ceil((left + width + origin[0]) / size); x++) {
      tiles.push({ z, x, y, size, left: x*size - origin[0], top: y*size - origin[1] });
    }
  }
  return tiles;
}

function basemap(container) {
  const layer = document.createElement('div');
  const attribution = document.createElement('div');
  const notice = document.createElement('span');
  layer.className = 'map-tiles';
  layer.setAttribute('aria-hidden', 'true');
  attribution.className = 'map-attribution';
  attribution.innerHTML = '<a href="https://www.arcgis.com/home/item.html?id=7dc6cea0b1764a1f9af2e679f642f0f5" target="_blank" rel="noopener">Esri, HERE, Garmin, USGS ואחרים</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';
  notice.className = 'map-background-status';
  notice.hidden = true;
  notice.textContent = 'רקע המפה אינו זמין כרגע. המסלול וקובצי ה־GPX זמינים.';
  container.append(layer, attribution, notice);
  let active = new Map();

  return (left, top, width, height, pixels) => {
    const next = new Map();
    function updateNotice() {
      notice.hidden = [...active.values()].some(tile => tile.complete && tile.naturalWidth);
    }
    for (const tile of visibleTiles(left, top, width, height, pixels)) {
      const { z, x, y, size } = tile;
      const key = `${z}/${x}/${y}`;
      let image = active.get(key);
      if (!image || (image.complete && !image.naturalWidth && navigator.onLine)) {
        image?.remove();
        image = new Image();
        image.alt = '';
        image.referrerPolicy = 'origin';
        image.onload = updateNotice;
        image.onerror = () => {
          image.onerror = updateNotice;
          image.src = `${osm}/${key}.png`;
        };
        image.src = `${esri}/tile/${z}/${y}/${x}`;
        layer.append(image);
      }
      image.style.left = `${100 * (tile.left - left) / width}%`;
      image.style.top = `${100 * (tile.top - top) / height}%`;
      image.style.width = `calc(${100 * size / width}% + 0.4px)`;
      image.style.height = `calc(${100 * size / height}% + 0.4px)`;
      next.set(key, image);
    }
    for (const [key, image] of active) if (!next.has(key)) image.remove();
    active = next;
    updateNotice();
  };
}

export function mapControls({ container, status, locate, setFilter }) {
  let dayId = 0, zoom = 1, fix, watch, gpsMessage;
  const drawBasemap = basemap(container);
  const overlay = document.createElement('div');
  overlay.className = 'map-overlay';
  container.append(overlay);
  const distances = itinerary.map(({ track }) => track.points.map(project));
  const all = distances.flat();
  const labels = [distances[0][0], ...distances.map(d => d.at(-1))];
  const labelOffsets = [[0, -17], [4, -17], [-4, -17], [-7, 24], [-8, 22]];

  function draw() {
    const focus = dayId ? distances[dayId - 1] : all;
    const xs = focus.map(p => p[0]);
    const ys = focus.map(p => p[1]);
    const center = [(Math.max(...xs) + Math.min(...xs))/2, (Math.max(...ys) + Math.min(...ys))/2];
    const fit = [Math.max(220, Math.max(...xs) - Math.min(...xs) + 104), Math.max(180, Math.max(...ys) - Math.min(...ys) + 100)];
    const pixelWidth = Math.max(1, container.clientWidth);
    const pixelHeight = Math.max(1, container.clientHeight);
    const aspect = pixelWidth / pixelHeight;
    const w = Math.max(fit[0], fit[1] * aspect) / zoom;
    const h = w / aspect;
    const [left, top] = [center[0] - w/2, center[1] - h/2];
    const view = [left, top, w, h].join(' ');
    drawBasemap(left, top, w, h, pixelWidth);
    const lines = distances.map((day, i) => {
      const points = day.map(p => p.map(rounded).join(',')).join(' ');
      const opacity = !dayId || dayId === i + 1 ? 1 : .28;
      return `<g opacity="${opacity}"><polyline vector-effect="non-scaling-stroke" points="${points}" stroke="#fffdf1" stroke-width="7"/><polyline vector-effect="non-scaling-stroke" points="${points}" stroke="${itinerary[i].color}" stroke-width="4"/><polyline vector-effect="non-scaling-stroke" points="${points}" stroke="transparent" stroke-width="24" class="map-hit" data-filter="${i+1}"/></g>`;
    }).join('');
    const places = labels.map(([x, y], i) => {
      const [dx, dy] = labelOffsets[i];
      return `<g><circle cx="${x}" cy="${y}" r="5" fill="#f9f7e9" stroke="#293d30" stroke-width="2"/><text x="${x+dx}" y="${y+dy}" text-anchor="middle" class="map-label" font-size="14">${villages[i]}</text></g>`;
    }).join('');
    const point = fix && project(fix.coords);
    const visible = point && point[0] >= left && point[0] <= left+w && point[1] >= top && point[1] <= top+h;
    const marker = visible ? `<circle cx="${point[0]}" cy="${point[1]}" r="${Math.max(9,Math.min(120,fix.accuracy*scale/1000))}" fill="#1589cf22" stroke="#1589cf66"/><circle cx="${point[0]}" cy="${point[1]}" r="7" fill="#087cb8" stroke="white" stroke-width="3"/>` : '';
    overlay.innerHTML = `<svg class="route-svg" viewBox="${view}" role="img" aria-label="מפת שבילי טרק מסטיה עד אושגולי, צפון למעלה" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linejoin="round" stroke-linecap="round">${lines}</g>${places}${marker}<g transform="translate(${left+w-23} ${top+26})" fill="#344b3a" text-anchor="middle"><path d="M0 -13 6 4 0 1 -6 4Z"/><text y="15" font-size="9">N</text></g><g transform="translate(${left+10} ${top+h-13})" fill="#344b3a" font-size="9"><path d="M0 -4V0H${scale}V-4" stroke="#344b3a" fill="none"/><text x="${scale/2}" y="-6" text-anchor="middle" direction="ltr">1 km</text></g></svg>`;
    if (!fix) {
      status.textContent = gpsMessage || 'הפעילו מיקום כדי לראות כמה ק״מ נשארו במקטע שבחרתם.';
      return;
    }
    const candidates = dayId ? [itinerary[dayId - 1]] : itinerary;
    const estimates = candidates.map(day => ({ day, ...progressAt(fix.coords, day.track) }));
    const nearest = estimates.reduce((a, b) => b.offset < a.offset ? b : a);
    const prefix = `דיוק GPS כ־${Math.round(fix.accuracy)} מ׳. `;
    if (gpsMessage) status.textContent = gpsMessage;
    else if (fix.accuracy > 150) status.textContent = prefix + 'המיקום משוער. ממתינים למדידה מדויקת יותר.';
    else if (nearest.offset > Math.max(75, fix.accuracy * 1.5)) status.textContent = prefix + `המיקום מרוחק כ־${km(nearest.offset)} ק״מ מהמקטע הקרוב ביותר בתצוגה.`;
    else status.textContent = prefix + `יום ${nearest.day.id} · כ־${km(nearest.remaining)} ק״מ נותרו עד סוף מקטע ההליכה.`;
    if (!visible) status.textContent += ' המיקום מחוץ לתצוגה הנוכחית.';
  }

  container.addEventListener('click', event => {
    const value = event.target.dataset?.filter;
    if (value) setFilter(Number(value));
  });
  locate.addEventListener('click', () => {
    if (watch !== undefined) {
      navigator.geolocation.clearWatch(watch);
      watch = fix = gpsMessage = undefined;
      locate.textContent = '◎ המיקום שלי';
      draw();
      return;
    }
    if (!navigator.geolocation) {
      gpsMessage = 'שירות המיקום דורש דפדפן תומך וחיבור HTTPS כדי לפתוח את האפליקציה.';
      draw();
      return;
    }
    gpsMessage = 'מחפשים מיקום GPS…';
    locate.textContent = 'עצירת מעקב';
    draw();
    watch = navigator.geolocation.watchPosition(({ coords, timestamp }) => {
      fix = { coords: [coords.latitude, coords.longitude], accuracy: coords.accuracy, timestamp };
      gpsMessage = undefined;
      draw();
    }, ({ code }) => {
      gpsMessage = code === 1 ? 'לא ניתנה הרשאת מיקום. ניתן להפעיל אותה בהגדרות הדפדפן.' : 'אין כרגע מדידת GPS חדשה. נסו במקום פתוח.';
      if (code === 1) {
        navigator.geolocation.clearWatch(watch);
        watch = fix = undefined;
        locate.textContent = '◎ המיקום שלי';
      }
      draw();
    }, { enableHighAccuracy: true, maximumAge: 8000, timeout: 18000 });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && fix && Date.now() - fix.timestamp > 30000) {
      fix = undefined;
      gpsMessage = 'ממתינים למדידת GPS חדשה…';
      draw();
    }
  });
  new ResizeObserver(draw).observe(container);
  window.addEventListener('online', () => { if (!container.querySelector('.map-tiles img')?.naturalWidth) draw(); });
  draw();
  return { show(id) { dayId = id; zoom = 1; draw(); }, zoom(factor) { zoom = Math.max(.65, Math.min(2.45, zoom*factor)); draw(); } };
}
