import './app.js';

const views = [...document.querySelectorAll('[data-view]')];
const navigation = document.querySelector('.field-nav');
const extras = document.getElementById('more');
const expenses = document.getElementById('expenses');
expenses.dataset.view = 'expenses';
views.push(expenses);
extras.append(document.getElementById('flights'));
const mapStatus = document.getElementById('gps-status');
const mapFooter = document.createElement('div');
mapFooter.className = 'field-map-footer';
mapStatus.before(mapFooter);
mapFooter.append(mapStatus, document.getElementById('location'));
navigation.insertBefore(navigation.querySelector('a[href="#expenses"]'), navigation.querySelector('a[href="#more"]'));

function showView() {
  const fragment = location.hash.slice(1);
  const view = fragment === 'flights' || fragment === 'more' || fragment.startsWith('flight-ticket/') ? 'more' :
    ['map', 'photos', 'expenses'].includes(fragment) ? fragment : 'today';
  for (const page of views) page.hidden = page.dataset.view !== view;
  for (const link of navigation.querySelectorAll('a')) {
    const target = view === 'today' ? '#home' : '#' + view;
    if (link.hash === target) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (fragment.startsWith('day/')) document.getElementById('day').scrollIntoView({ block: 'start', behavior: 'instant' });
  else window.scrollTo({ top: 0, behavior: 'instant' });
}
window.addEventListener('hashchange', showView);
showView();
