export const expenseCurrencies = ['GEL', 'ILS', 'USD', 'EUR'];

export function expenseFields(description, currency, amount) {
  const title = typeof description === 'string' ? description.trim() : '';
  if (!title || title.length > 120 || !expenseCurrencies.includes(currency) || !Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000) return null;
  return { description: title, currency, amount };
}

export function parseExpenseAmount(value) {
  const parts = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(String(value).trim());
  return parts ? Number(parts[1]) * 100 + Number((parts[2] || '').padEnd(2, '0')) : NaN;
}

export function settleExpenses(entries, currency, count = 4) {
  const paid = Array(count).fill(0);
  for (const entry of entries) if (entry.currency === currency) paid[entry.payer] += entry.amount;
  const total = paid.reduce((sum, amount) => sum + amount, 0);
  const shares = paid.map((_, index) => Math.floor(total / count) + (index < total % count ? 1 : 0));
  const balances = paid.map((amount, index) => amount - shares[index]);
  const creditors = [], debtors = [];
  balances.forEach((amount, person) => {
    if (amount > 0) creditors.push({ person, amount });
    if (amount < 0) debtors.push({ person, amount: -amount });
  });
  const transfers = [];
  let debtor = 0, creditor = 0;
  while (debtor < debtors.length && creditor < creditors.length) {
    const from = debtors[debtor], to = creditors[creditor];
    const amount = Math.min(from.amount, to.amount);
    transfers.push({ from: from.person, to: to.person, amount });
    from.amount -= amount;
    to.amount -= amount;
    if (!from.amount) debtor++;
    if (!to.amount) creditor++;
  }
  return { paid, shares, balances, transfers };
}
