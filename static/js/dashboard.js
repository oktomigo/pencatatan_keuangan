// dashboard.js - ringkasan dashboard dari satu endpoint API.

import { apiFetch, ApiError } from './api.js';
import { formatRupiah, formatDate, getMonthYear } from './utils.js';
import { openConfirmDialog } from './modal.js';
import { showToast } from './toast.js';

const DASHBOARD_CACHE_KEY = 'dashboard_cache';
let dashboardRoot;
let refreshInProgress = false;

export async function init() {
  dashboardRoot = document.getElementById('dashboard-page');
  if (!dashboardRoot) return;
  document.addEventListener('data:changed', refreshDashboard);
  renderLoading();
  await refreshDashboard();
}

async function refreshDashboard() {
  if (refreshInProgress) return;
  refreshInProgress = true;
  try {
    const data = await apiFetch('/api/dashboard');
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(data));
    clearError();
    renderDashboard(data);
  } catch (error) {
    const cached = readCachedDashboard();
    if (cached) {
      renderDashboard(cached);
      renderError('Mode offline: menampilkan data terakhir yang tersimpan.');
    } else {
      renderError(error);
    }
  } finally {
    refreshInProgress = false;
  }
}

function renderLoading() {
  const card = dashboardRoot?.querySelector('#saldo-card');
  if (card) card.classList.add('skeleton');
  const recent = dashboardRoot?.querySelector('#recent-transactions');
  if (recent) {
    recent.innerHTML = '';
    for (let index = 0; index < 3; index += 1) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton';
      skeleton.style.cssText = 'height:64px;margin-bottom:var(--space-2);';
      recent.appendChild(skeleton);
    }
  }
}

function renderDashboard(data) {
  const period = data.period || {};
  const summary = data.summary || {};
  const monthEl = dashboardRoot.querySelector('#dashboard-month');
  if (monthEl) monthEl.textContent = period.label || getMonthYear();
  dashboardRoot.querySelector('#dashboard-title').textContent = period.label ? `Keuangan ${period.label}` : 'Keuangan Bulan Ini';
  dashboardRoot.querySelector('#saldo-card')?.classList.remove('skeleton');

  updateSaldoCard(summary);
  updateBudgetChips(data.budgets || data.budget_summary || []);
  updateBillsSection(data.upcoming_bills || []);
  updateRecentTransactions(data.recent_transactions || []);
}

function updateSaldoCard(summary) {
  const balance = Number(summary.balance || 0);
  const card = dashboardRoot.querySelector('#saldo-card');
  dashboardRoot.querySelector('#saldo-amount').textContent = formatRupiah(balance);
  dashboardRoot.querySelector('#income-amount').textContent = `↑ ${formatRupiah(Number(summary.total_income || 0))}`;
  dashboardRoot.querySelector('#expense-amount').textContent = `↓ ${formatRupiah(Number(summary.total_expense || 0))}`;
  if (balance >= 0) {
    card.style.background = 'var(--color-primary-500)';
    card.style.color = 'var(--color-text-inverse)';
  } else {
    card.style.background = 'var(--color-danger-50)';
    card.style.color = 'var(--color-danger-700)';
  }
}

function updateBudgetChips(budgets) {
  const section = dashboardRoot.querySelector('#budget-section');
  const container = dashboardRoot.querySelector('#budget-chips');
  container.replaceChildren();
  section.style.display = budgets.length ? '' : 'none';
  budgets.forEach(budget => {
    const chip = document.createElement('span');
    chip.className = `budget-chip budget-chip--${budget.status || 'safe'}`;
    chip.dataset.categoryId = budget.category_id || '';
    chip.textContent = `${budget.category_name || 'Kategori'} · ${Number(budget.percentage || 0)}%`;
    chip.style.cssText = `display:inline-flex;align-items:center;min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-full);font-size:var(--text-body-md);white-space:nowrap;${budgetStyle(budget.status)}`;
    container.appendChild(chip);
  });
}

function budgetStyle(status) {
  const styles = {
    safe: 'background:var(--color-success-50);border:1px solid var(--color-success-500);color:var(--color-success-700);',
    warning: 'background:var(--color-warning-50);border:1px solid var(--color-warning-400);color:var(--color-warning-700);',
    danger: 'background:var(--color-danger-50);border:1px solid var(--color-danger-500);color:var(--color-danger-700);',
  };
  return styles[status] || styles.safe;
}

function updateBillsSection(bills) {
  const section = dashboardRoot.querySelector('#bills-section');
  const list = dashboardRoot.querySelector('#bills-list');
  section.style.display = bills.length ? '' : 'none';
  list.replaceChildren();
  bills.forEach(bill => {
    const item = document.createElement('article');
    item.className = 'bill-item';
    item.dataset.billId = bill.id;
    item.style.cssText = 'display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);margin-bottom:var(--space-2);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-md);';
    const content = document.createElement('div');
    content.style.cssText = 'min-width:0;flex:1;';
    const name = document.createElement('strong');
    name.textContent = bill.name;
    const due = document.createElement('p');
    due.className = 'bill-days';
    due.textContent = bill.is_due_today ? 'Hari ini' : `${Number(bill.days_left ?? 0)} hari lagi`;
    due.style.cssText = 'color:var(--color-text-secondary);font-size:var(--text-caption);';
    content.append(name, due);
    const amount = document.createElement('strong');
    amount.className = 'bill-amount tabular-nums';
    amount.textContent = formatRupiah(bill.amount);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-mark-paid';
    button.textContent = 'Tandai Lunas';
    button.dataset.billId = bill.id;
    button.dataset.billName = bill.name;
    button.dataset.billAmount = bill.amount;
    button.style.cssText = 'min-height:44px;padding:0 var(--space-2);border-radius:var(--rounded-md);color:var(--color-primary-700);font-size:var(--text-body-md);font-weight:600;';
    button.addEventListener('click', event => {
      event.stopPropagation();
      markBillPaid(bill);
    });
    item.append(content, amount, button);
    list.appendChild(item);
  });
}

function markBillPaid(bill) {
  openConfirmDialog({
    title: 'Tandai Lunas?',
    message: `Transaksi pengeluaran untuk ${escapeHtml(bill.name)} sebesar ${formatRupiah(bill.amount)} akan otomatis dicatat.`,
    variant: 'info',
    confirmLabel: 'Ya, Catat',
    cancelLabel: 'Batal',
    onConfirm: async () => {
      try {
        await apiFetch(`/api/recurring-bills/${encodeURIComponent(bill.id)}/pay`, { method: 'POST' });
        await refreshDashboard();
        document.dispatchEvent(new CustomEvent('data:changed'));
        showToast(`${bill.name} ditandai lunas`, 'success');
      } catch (error) {
        showToast(error.message || 'Gagal memuat data. Coba refresh halaman.', 'error');
      }
    },
  });
}

function updateRecentTransactions(recentTransactions) {
  const container = dashboardRoot.querySelector('#recent-transactions');
  container.replaceChildren();
  if (!recentTransactions.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Belum ada transaksi. Yuk mulai catat!';
    empty.style.cssText = 'padding:var(--space-6) 0;color:var(--color-text-secondary);';
    container.appendChild(empty);
    return;
  }
  recentTransactions.slice(0, 5).forEach(transaction => {
    const item = document.createElement('article');
    item.className = 'transaction-item';
    item.dataset.txId = transaction.id;
    item.style.cssText = 'display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--color-border-light);';
    const icon = document.createElement('span');
    icon.className = 'tx-icon';
    icon.style.cssText = `display:grid;place-items:center;width:40px;height:40px;border-radius:var(--rounded-full);background:${transaction.category_color || 'var(--color-surface-raised)'};`;
    icon.innerHTML = `<i data-lucide="${escapeHtml(transaction.category_icon || 'tag')}" width="20" height="20"></i>`;
    const body = document.createElement('div');
    body.style.cssText = 'min-width:0;flex:1;';
    const category = document.createElement('strong');
    category.className = 'tx-category';
    category.textContent = transaction.category_name || 'Lainnya';
    const meta = document.createElement('p');
    meta.className = 'tx-meta';
    meta.textContent = transaction.note ? `${transaction.note} · ${formatDate(transaction.date, 'short')}` : formatDate(transaction.date, 'short');
    meta.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-text-secondary);font-size:var(--text-caption);';
    body.append(category, meta);
    const amount = document.createElement('strong');
    amount.className = 'tx-amount tabular-nums';
    amount.textContent = `${transaction.type === 'income' ? '+' : '−'}${formatRupiah(transaction.amount)}`;
    amount.style.color = transaction.type === 'income' ? 'var(--color-text-income)' : 'var(--color-text-expense)';
    item.append(icon, body, amount);
    renderIcons(item);
    container.appendChild(item);
  });
}

function readCachedDashboard() {
  try {
    const cached = JSON.parse(localStorage.getItem(DASHBOARD_CACHE_KEY));
    return cached && typeof cached === 'object' ? cached : null;
  } catch (error) {
    return null;
  }
}

function renderError(error) {
  const element = dashboardRoot.querySelector('#dashboard-error');
  element.classList.remove('hidden');
  element.textContent = error instanceof ApiError ? error.message : String(error || 'Gagal memuat data. Coba refresh halaman.');
}

function clearError() {
  dashboardRoot.querySelector('#dashboard-error')?.classList.add('hidden');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderIcons(container = document) {
  if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons({ root: container });
}
