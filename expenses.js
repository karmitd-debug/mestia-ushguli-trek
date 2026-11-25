import { expenseCurrencies, expenseFields, parseExpenseAmount, settleExpenses } from './expense-rules.js';

const storageKey = 'svaneti-expenses-preview-v1';
const currencyNames = { GEL: 'לארי', ILS: 'שקל', USD: 'דולר', EUR: 'אירו' };
const formatters = Object.fromEntries(expenseCurrencies.map(currency => [currency, new Intl.NumberFormat('he-IL', { style: 'currency', currency })]));
const money = (minor, currency) => formatters[currency].format(minor / 100);

function label(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function readDeviceExpenses() {
  try {
    const entries = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(entries) ? entries.filter(e => e && expenseFields(e.description, e.currency, e.amount) && Number.isInteger(e.payer) && e.payer >= 0 && e.payer < 4) : [];
  } catch { return []; }
}

export function mountExpenses({ shared }) {
  const section = document.createElement('section');
  section.id = 'expenses';
  section.className = 'panel photo-panel';
  section.innerHTML = '<div class="section-head"><div><h2>הוצאות משותפות</h2><p>כל הוצאה מתחלקת שווה בשווה בין ארבעת המטיילים. ההחזרים מוצגים בכל מטבע בנפרד.</p></div></div><p id="expenses-status" class="status" role="status"></p><form class="expense-form"><label>מי שילם<select name="payer" required></select></label><label>על מה שילמתם<input name="description" maxlength="120" placeholder="למשל, הסעה למסטיה" required></label><label>סכום<input name="amount" inputmode="decimal" placeholder="0.00" required></label><label>מטבע<select name="currency" required></select></label><button class="primary" type="submit">הוספת הוצאה</button></form><div id="expense-balances" class="expense-results"></div><div id="expense-list" class="expense-results"></div>';
  document.querySelector('footer').before(section);
  const nav = label('a', 'הוצאות');
  nav.href = '#expenses';
  document.querySelector('nav').append(nav);
  const form = section.querySelector('form');
  const payer = form.elements.payer;
  const status = section.querySelector('#expenses-status');
  const add = form.querySelector('button');
  const summary = section.querySelector('#expense-balances');
  const list = section.querySelector('#expense-list');
  let names = Array.from({ length: 4 }, (_, i) => `מטייל/ת ${i + 1}`);
  let entries = shared ? [] : readDeviceExpenses();
  let me = null, submitting = false, canSubmit = !shared, pending, revision = 0;

  for (const code of expenseCurrencies) form.elements.currency.add(new Option(`${currencyNames[code]} (${code})`, code));
  if (shared) payer.disabled = true;
  function payerChoices() {
    const old = payer.value;
    payer.replaceChildren(...names.map((name, i) => new Option(name, i)));
    payer.value = shared && me !== null ? String(me) : old || '0';
  }

  function render() {
    payerChoices();
    add.disabled = !canSubmit || submitting;
    summary.replaceChildren(label('h3', 'מי מחזיר למי'));
    list.replaceChildren(label('h3', 'הוצאות שנרשמו'));
    if (!entries.length) {
      summary.append(label('p', 'האיזון יופיע אחרי הוספת ההוצאה הראשונה.'));
      return;
    }
    for (const currency of expenseCurrencies.filter(code => entries.some(item => item.currency === code))) {
      const result = settleExpenses(entries, currency, names.length);
      const panel = document.createElement('article');
      panel.className = 'inset';
      panel.append(label('h4', `${currencyNames[currency]} (${currency})`));
      const balances = document.createElement('ul');
      result.paid.forEach((paid, i) => balances.append(label('li', `${names[i]} · שילם ${money(paid, currency)} · חלקו ${money(result.shares[i], currency)}`)));
      panel.append(balances);
      if (!result.transfers.length) panel.append(label('p', 'ההוצאות במטבע הזה מאוזנות.'));
      else {
        const transfers = document.createElement('ul');
        transfers.className = 'expense-transfers';
        for (const { from, to, amount } of result.transfers) transfers.append(label('li', `${names[from]} יעביר ל־${names[to]} ${money(amount, currency)}`));
        panel.append(transfers);
      }
      summary.append(panel);
    }
    const recorded = document.createElement('ul');
    for (const entry of [...entries].reverse()) recorded.append(label('li', `${entry.description} · ${names[entry.payer]} · ${money(entry.amount, entry.currency)}`));
    list.append(recorded);
  }

  async function refresh() {
    if (submitting) return;
    const current = ++revision;
    try {
      const response = await fetch('api/expenses', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (current !== revision) return;
      entries = result.entries;
      names = result.names;
      me = result.me;
      canSubmit = true;
      status.textContent = 'ההוצאות נשמרות ביומן הפרטי המשותף של הקבוצה.';
    } catch {
      if (current !== revision) return;
      canSubmit = false;
      status.textContent = 'יומן ההוצאות המשותף אינו זמין. בדקו שיש חיבור ושנכנסתם בחשבון של אחד המטיילים.';
    }
    render();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    const item = expenseFields(form.elements.description.value, form.elements.currency.value, parseExpenseAmount(form.elements.amount.value));
    if (!item) { status.textContent = 'הזינו תיאור וסכום חיובי עם עד שתי ספרות אחרי הנקודה.'; return; }
    submitting = true;
    revision++;
    render();
    try {
      if (shared) {
        const signature = JSON.stringify(item);
        if (pending?.signature !== signature) pending = { signature, id: crypto.randomUUID() };
        const response = await fetch('api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, id: pending.id }), signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error();
        const { entry } = await response.json();
        if (!entries.some(value => value.id === entry.id)) entries.push(entry);
        pending = null;
      } else {
        const updated = [...readDeviceExpenses(), { ...item, payer: Number(payer.value) }];
        localStorage.setItem(storageKey, JSON.stringify(updated));
        entries = updated;
      }
      form.elements.amount.value = '';
      form.elements.description.value = '';
      status.textContent = shared ? 'ההוצאה נוספה ליומן המשותף.' : 'ההוצאה נשמרה במכשיר הזה בלבד.';
    } catch { status.textContent = 'שמירת ההוצאה נכשלה.'; }
    finally { submitting = false; render(); }
  });
  status.textContent = shared ? 'טוענים את יומן ההוצאות…' : 'תצוגה מקדימה. ההוצאות נשמרות במכשיר הזה בלבד.';
  render();
  if (shared) {
    refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('hashchange', () => { if (location.hash === '#expenses') refresh(); });
    window.setInterval(() => { if (location.hash === '#expenses' && !document.hidden && navigator.onLine) refresh(); }, 20000);
  }
}
