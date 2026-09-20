// transactions.js - daftar, filter, dan CRUD transaksi berbasis API.

import { apiFetch, ApiError } from './api.js';
import { formatRupiah, formatDate, today } from './utils.js';
import {
  openModal,
  openBottomSheet,
  openConfirmDialog,
  closeModal,
  closeBottomSheet,
} from './modal.js';
import { showToast } from './toast.js';

const MAX_AMOUNT = 999999999999;
const PAGE_SIZE = 20;

let pageRoot;
let transactionList;
let emptyState;
let errorState;
let loadMoreButton;
let transactions = [];
let filters = { type: 'all', query: '', month: '', year: '', categoryId: '' };
let skip = 0;
let hasMore = true;
let requestController = null;
let searchTimer = null;
let categoryCache = new Map();

export async function init() {
  createPageShell();
  bindPageEvents();
  initFABAndNewParam();
  await loadTransactions(true);
}

function createPageShell() {
  pageRoot = document.getElementById('transactions-page');
  if (!pageRoot) {
    pageRoot = document.createElement('section');
    pageRoot.id = 'transactions-page';
    pageRoot.setAttribute('aria-labelledby', 'transactions-title');
    pageRoot.style.cssText = 'max-width:820px;margin:0 auto;padding:var(--space-6) var(--space-4) var(--space-20);';
    pageRoot.innerHTML = `
      <header style="margin-bottom:var(--space-5)">
        <p style="color:var(--color-text-secondary);font-size:var(--text-body-md);margin-bottom:var(--space-1)">Catatan harian</p>
        <h1 id="transactions-title" style="font-size:var(--text-heading-1);font-weight:700">Transaksi</h1>
      </header>
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)">
        <input id="search-input" type="search" placeholder="Cari catatan atau kategori" aria-label="Cari transaksi" style="flex:1;min-width:220px;min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md);background:var(--color-surface-card)" />
        <select id="category-filter" aria-label="Filter kategori" style="min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md);background:var(--color-surface-card)"><option value="">Semua kategori</option></select>
      </div>
      <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-3);flex-wrap:wrap">
        <button id="filter-all" type="button" data-filter="all" class="active" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md)">Semua</button>
        <button id="filter-income" type="button" data-filter="income" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md)">Pemasukan</button>
        <button id="filter-expense" type="button" data-filter="expense" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md)">Pengeluaran</button>
        <input id="period-month" type="number" min="1" max="12" placeholder="Bulan" aria-label="Bulan" style="width:92px;min-height:44px;padding:0 var(--space-2);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)" />
        <input id="period-year" type="number" min="2000" max="9999" placeholder="Tahun" aria-label="Tahun" style="width:110px;min-height:44px;padding:0 var(--space-2);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)" />
      </div>
      <div id="transactions-error" class="hidden" role="alert" style="padding:var(--space-4);margin-bottom:var(--space-4);border:1px solid var(--color-danger-500);border-radius:var(--rounded-md);background:var(--color-danger-50);color:var(--color-danger-700)"></div>
      <div id="transactions-empty" class="hidden" role="status" style="padding:var(--space-8);text-align:center;border:1px dashed var(--color-border-medium);border-radius:var(--rounded-lg);color:var(--color-text-secondary)">Belum ada transaksi pada periode ini.</div>
      <div id="transaction-list" aria-live="polite"></div>
      <button id="transactions-load-more" type="button" class="hidden" style="width:100%;min-height:44px;margin-top:var(--space-3);border:1px solid var(--color-border-medium);border-radius:var(--rounded-md);color:var(--color-primary-700)">Muat lebih banyak</button>
    `;
    document.getElementById('page-content')?.appendChild(pageRoot);
  }

  transactionList = pageRoot.querySelector('#transaction-list');
  emptyState = pageRoot.querySelector('#transactions-empty');
  errorState = pageRoot.querySelector('#transactions-error');
  loadMoreButton = pageRoot.querySelector('#transactions-load-more');
  setActiveFilter(filters.type);
}

function bindPageEvents() {
  ['filter-all', 'filter-income', 'filter-expense'].forEach(id => {
    pageRoot.querySelector(`#${id}`)?.addEventListener('click', event => {
      filters.type = event.currentTarget.dataset.filter;
      setActiveFilter(filters.type);
      loadTransactions(true);
    });
  });

  pageRoot.querySelector('#search-input')?.addEventListener('input', event => {
    filters.query = event.target.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadTransactions(true), 300);
  });

  pageRoot.querySelector('#category-filter')?.addEventListener('change', event => {
    filters.categoryId = event.target.value;
    loadTransactions(true);
  });

  ['period-month', 'period-year'].forEach(id => {
    pageRoot.querySelector(`#${id}`)?.addEventListener('change', () => {
      filters.month = pageRoot.querySelector('#period-month').value;
      filters.year = pageRoot.querySelector('#period-year').value;
      loadTransactions(true);
    });
  });

  loadMoreButton?.addEventListener('click', () => loadTransactions(false));
}

function setActiveFilter(type) {
  pageRoot.querySelectorAll('[id^="filter-"]').forEach(button => {
    const active = button.dataset.filter === type;
    button.classList.toggle('active', active);
    button.style.background = active ? 'var(--color-primary-500)' : 'var(--color-surface-raised)';
    button.style.color = active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)';
  });
}

async function loadTransactions(reset) {
  if (requestController) requestController.abort();
  requestController = new AbortController();
  if (reset) {
    skip = 0;
    hasMore = true;
    transactions = [];
    renderLoading();
  } else if (!hasMore) {
    return;
  }

  try {
    const data = await apiFetch('/api/transactions', {
      signal: requestController.signal,
      query: {
        month: filters.month,
        year: filters.year,
        type: filters.type === 'all' ? '' : filters.type,
        category_id: filters.categoryId,
        q: filters.query,
        limit: PAGE_SIZE,
        skip,
      },
    });
    const page = Array.isArray(data) ? data : [];
    transactions = reset ? page : [...transactions, ...page];
    skip += page.length;
    hasMore = page.length === PAGE_SIZE;
    clearError();
    renderTransactions();
    await loadCategoryFilter();
  } catch (error) {
    if (error.code === 'ABORTED') return;
    renderError(error);
  }
}

function renderLoading() {
  emptyState?.classList.add('hidden');
  errorState?.classList.add('hidden');
  if (!transactionList) return;
  transactionList.setAttribute('aria-busy', 'true');
  transactionList.innerHTML = '';
  for (let index = 0; index < 4; index += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.style.cssText = 'height:76px;margin-bottom:var(--space-3);';
    transactionList.appendChild(skeleton);
  }
  loadMoreButton?.classList.add('hidden');
}

function renderTransactions() {
  transactionList?.setAttribute('aria-busy', 'false');
  if (!transactionList) return;
  transactionList.replaceChildren();
  emptyState?.classList.toggle('hidden', transactions.length > 0);
  loadMoreButton?.classList.toggle('hidden', !hasMore || transactions.length === 0);

  const groups = new Map();
  transactions.forEach(transaction => {
    if (!groups.has(transaction.date)) groups.set(transaction.date, []);
    groups.get(transaction.date).push(transaction);
  });

  [...groups.entries()].forEach(([date, groupTransactions]) => {
    const group = document.createElement('section');
    group.className = 'date-group';
    group.dataset.date = date;
    group.style.cssText = 'margin-bottom:var(--space-5);';
    const heading = document.createElement('h2');
    heading.textContent = formatDate(date, 'group');
    heading.style.cssText = 'margin-bottom:var(--space-2);font-size:var(--text-body-md);font-weight:600;color:var(--color-text-secondary);';
    group.appendChild(heading);
    groupTransactions.forEach(transaction => group.appendChild(createTransactionItem(transaction)));
    transactionList.appendChild(group);
  });
}

function createTransactionItem(transaction) {
  const item = document.createElement('article');
  item.className = 'transaction-item';
  item.dataset.txId = transaction.id;
  item.dataset.type = transaction.type;
  item.dataset.category = transaction.category_name || '';
  item.dataset.note = transaction.note || '';
  item.style.cssText = 'display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--color-border-light);cursor:pointer;';
  item.tabIndex = 0;
  item.setAttribute('role', 'button');
  item.setAttribute('aria-label', `${transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${transaction.category_name || 'Lainnya'} ${formatRupiah(transaction.amount)}`);

  const icon = document.createElement('span');
  icon.className = 'tx-icon';
  icon.textContent = transaction.category_icon || '📦';
  icon.style.cssText = `display:grid;place-items:center;width:40px;height:40px;flex-shrink:0;border-radius:var(--rounded-full);background:${transaction.category_color || 'var(--color-surface-raised)'};`;
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
  item.addEventListener('click', () => openDetailSheet(transaction));
  item.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetailSheet(transaction);
    }
  });
  return item;
}

async function loadCategoryFilter() {
  const select = pageRoot.querySelector('#category-filter');
  if (!select) return;
  const type = filters.type === 'all' ? '' : filters.type;
  const key = type || 'all';
  if (!categoryCache.has(key)) {
    try {
      const data = await apiFetch('/api/categories', { query: type ? { type } : {} });
      categoryCache.set(key, Array.isArray(data) ? data : []);
    } catch (error) {
      return;
    }
  }
  const selected = select.value;
  select.replaceChildren(new Option('Semua kategori', ''));
  categoryCache.get(key).forEach(category => select.appendChild(new Option(category.name, category.id)));
  select.value = selected;
}

function openDetailSheet(transaction) {
  const isMobile = window.innerWidth < 768;
  const categoryName = transaction.category_name || 'Lainnya';
  const detailHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <span style="display:grid;place-items:center;width:44px;height:44px;border-radius:var(--rounded-full);background:${transaction.category_color || 'var(--color-surface-raised)'}">${escapeHtml(transaction.category_icon || '📦')}</span>
        <div><strong>${escapeHtml(categoryName)}</strong><p style="color:var(--color-text-secondary);font-size:var(--text-caption)">${transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p></div>
        <strong class="tabular-nums" style="margin-left:auto;color:${transaction.type === 'income' ? 'var(--color-text-income)' : 'var(--color-text-expense)'}">${transaction.type === 'income' ? '+' : '−'}${formatRupiah(transaction.amount)}</strong>
      </div>
      <dl style="display:grid;gap:var(--space-2);font-size:var(--text-body-md)">
        <div style="display:flex;justify-content:space-between"><dt style="color:var(--color-text-secondary)">Tanggal</dt><dd>${formatDate(transaction.date, 'long')}</dd></div>
        ${transaction.note ? `<div style="display:flex;justify-content:space-between;gap:var(--space-3)"><dt style="color:var(--color-text-secondary)">Catatan</dt><dd style="text-align:right">${escapeHtml(transaction.note)}</dd></div>` : ''}
      </dl>
      <div style="display:flex;gap:var(--space-3)">
        <button id="detail-edit-btn" type="button" style="flex:1;min-height:44px;border:1px solid var(--color-border-medium);border-radius:var(--rounded-md);font-weight:600">Edit</button>
        <button id="detail-delete-btn" type="button" style="flex:1;min-height:44px;border-radius:var(--rounded-md);background:var(--color-danger-50);color:var(--color-danger-700);font-weight:600">Hapus</button>
      </div>
    </div>`;
  (isMobile ? openBottomSheet : openModal)({ title: 'Detail Transaksi', contentHTML: detailHTML });
  setTimeout(() => {
    document.getElementById('detail-edit-btn')?.addEventListener('click', () => {
      closeTransactionOverlay(isMobile);
      openTransactionForm(transaction);
    });
    document.getElementById('detail-delete-btn')?.addEventListener('click', () => {
      closeTransactionOverlay(isMobile);
      openConfirmDialog({
        title: 'Hapus Transaksi?',
        message: 'Transaksi ini akan dihapus permanen.',
        variant: 'danger',
        confirmLabel: 'Hapus',
        onConfirm: () => deleteTransaction(transaction),
      });
    });
  }, 0);
}

function openTransactionForm(transaction = null) {
  const isEdit = Boolean(transaction);
  const isMobile = window.innerWidth < 768;
  const formHTML = `
    <form id="transaction-form" novalidate>
      <div id="type-toggle" style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4)">
        <button type="button" data-type="expense" style="flex:1;min-height:44px;border-radius:var(--rounded-md)">Pengeluaran</button>
        <button type="button" data-type="income" style="flex:1;min-height:44px;border-radius:var(--rounded-md)">Pemasukan</button>
      </div>
      <label for="tx-amount" style="display:block;margin-bottom:var(--space-2);font-weight:600">Nominal</label>
      <input id="tx-amount" type="number" min="1" max="${MAX_AMOUNT}" step="1" inputmode="numeric" required value="${isEdit ? transaction.amount : ''}" style="width:100%;min-height:48px;padding:0 var(--space-3);font-size:var(--text-number-md);font-variant-numeric:tabular-nums;border:1px solid var(--color-border-light);border-radius:var(--rounded-md)" />
      <p id="tx-amount-error" class="hidden" role="alert" style="margin-top:var(--space-2);color:var(--color-danger-700);font-size:var(--text-body-md)"></p>
      <label for="tx-category" style="display:block;margin:var(--space-4) 0 var(--space-2);font-weight:600">Kategori</label>
      <select id="tx-category" required style="width:100%;min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"><option value="">Memuat kategori...</option></select>
      <p id="tx-category-error" class="hidden" role="alert" style="margin-top:var(--space-2);color:var(--color-danger-700);font-size:var(--text-body-md)"></p>
      <label for="tx-date" style="display:block;margin:var(--space-4) 0 var(--space-2);font-weight:600">Tanggal</label>
      <input id="tx-date" type="date" required value="${isEdit ? transaction.date : today()}" style="width:100%;min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)" />
      <p id="tx-date-error" class="hidden" role="alert" style="margin-top:var(--space-2);color:var(--color-danger-700);font-size:var(--text-body-md)"></p>
      <label for="tx-note" style="display:block;margin:var(--space-4) 0 var(--space-2);font-weight:600">Catatan <span style="font-weight:400;color:var(--color-text-secondary)">(opsional)</span></label>
      <textarea id="tx-note" maxlength="255" rows="3" style="width:100%;padding:var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)">${escapeHtml(transaction?.note || '')}</textarea>
      <p id="tx-note-error" class="hidden" role="alert" style="margin-top:var(--space-2);color:var(--color-danger-700);font-size:var(--text-body-md)"></p>
      <p id="note-counter" style="margin-top:var(--space-1);text-align:right;color:var(--color-text-tertiary);font-size:var(--text-caption)">0/255</p>
      <button id="transaction-submit" type="submit" style="width:100%;min-height:48px;margin-top:var(--space-4);border-radius:var(--rounded-md);background:var(--color-primary-500);color:#fff;font-weight:600">${isEdit ? 'Simpan perubahan' : 'Simpan transaksi'}</button>
    </form>`;
  (isMobile ? openBottomSheet : openModal)({ title: isEdit ? 'Edit Transaksi' : 'Catat Transaksi', contentHTML: formHTML });

  setTimeout(() => {
    const form = document.getElementById('transaction-form');
    if (!form) return;
    let selectedType = transaction?.type || 'expense';
    const typeButtons = [...form.querySelectorAll('#type-toggle [data-type]')];
    const categorySelect = form.querySelector('#tx-category');
    typeButtons.forEach(button => button.addEventListener('click', async () => {
      selectedType = button.dataset.type;
      styleTypeButtons(typeButtons, selectedType);
      categorySelect.value = '';
      await populateCategories(categorySelect, selectedType);
    }));
    styleTypeButtons(typeButtons, selectedType);
    form.querySelector('#tx-note').addEventListener('input', event => {
      form.querySelector('#note-counter').textContent = `${event.target.value.length}/255`;
      clearFormError(form.querySelector('#tx-note'), form.querySelector('#tx-note-error'));
    });
    ['tx-amount', 'tx-category', 'tx-date'].forEach(id => {
      form.querySelector(`#${id}`)?.addEventListener('input', () => clearFormError(form.querySelector(`#${id}`), form.querySelector(`#${id}-error`)));
      form.querySelector(`#${id}`)?.addEventListener('change', () => clearFormError(form.querySelector(`#${id}`), form.querySelector(`#${id}-error`)));
    });
    populateCategories(categorySelect, selectedType, transaction?.category_id);
    form.querySelector('#note-counter').textContent = `${form.querySelector('#tx-note').value.length}/255`;
    form.addEventListener('submit', event => submitTransaction(event, form, transaction, selectedType, isMobile));
  }, 0);
}

async function populateCategories(select, type, selectedId = '') {
  select.disabled = true;
  select.replaceChildren(new Option('Memuat kategori...', ''));
  try {
    const key = type;
    if (!categoryCache.has(key)) {
      const data = await apiFetch('/api/categories', { query: { type } });
      categoryCache.set(key, Array.isArray(data) ? data : []);
    }
    select.replaceChildren(new Option('Pilih kategori', ''));
    categoryCache.get(key).forEach(category => select.appendChild(new Option(category.name, category.id)));
    select.value = selectedId;
  } catch (error) {
    select.replaceChildren(new Option('Kategori gagal dimuat', ''));
  } finally {
    select.disabled = false;
  }
}

async function submitTransaction(event, form, existing, type, isMobile) {
  event.preventDefault();
  const errors = validateForm(form);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([field, message]) => showFormError(form, field, message));
    return;
  }
  const submit = form.querySelector('#transaction-submit');
  submit.disabled = true;
  submit.textContent = 'Menyimpan...';
  const body = {
    type,
    amount: Number(form.querySelector('#tx-amount').value),
    category_id: form.querySelector('#tx-category').value,
    date: form.querySelector('#tx-date').value,
    note: form.querySelector('#tx-note').value.trim(),
  };
  try {
    await apiFetch(existing ? `/api/transactions/${encodeURIComponent(existing.id)}` : '/api/transactions', {
      method: existing ? 'PUT' : 'POST',
      body,
    });
    closeTransactionOverlay(isMobile);
    await loadTransactions(true);
    document.dispatchEvent(new CustomEvent('data:changed'));
    showToast(existing ? 'Transaksi berhasil diperbarui' : 'Transaksi berhasil dicatat', 'success');
  } catch (error) {
    if (error.fields) {
      Object.entries(error.fields).forEach(([field, message]) => showFormError(form, field, message));
    } else {
      showToast(error.message || 'Gagal memuat data. Coba refresh halaman.', 'error');
    }
    submit.disabled = false;
    submit.textContent = existing ? 'Simpan perubahan' : 'Simpan transaksi';
  }
}

function validateForm(form) {
  const errors = {};
  const amountRaw = form.querySelector('#tx-amount').value;
  const amount = Number(amountRaw);
  if (!amountRaw) errors.amount = 'Nominal wajib diisi';
  else if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT) errors.amount = 'Nominal harus berupa angka lebih dari 0 dan tidak melebihi 999.999.999.999';
  if (!form.querySelector('#tx-category').value) errors.category_id = 'Kategori wajib dipilih';
  if (!form.querySelector('#tx-date').value) errors.date = 'Tanggal wajib diisi';
  if (form.querySelector('#tx-note').value.length > 255) errors.note = 'Catatan maksimal 255 karakter';
  return errors;
}

function showFormError(form, field, message) {
  const map = { amount: 'tx-amount', category_id: 'tx-category', date: 'tx-date', note: 'tx-note' };
  const input = form.querySelector(`#${map[field] || field}`);
  const error = form.querySelector(`#${map[field] || field}-error`);
  if (!input || !error) return;
  error.textContent = message;
  error.classList.remove('hidden');
  input.setAttribute('aria-invalid', 'true');
  input.style.borderColor = 'var(--color-border-error)';
}

function clearFormError(input, error) {
  if (!input || !error) return;
  error.textContent = '';
  error.classList.add('hidden');
  input.removeAttribute('aria-invalid');
  input.style.borderColor = 'var(--color-border-light)';
}

function deleteTransaction(transaction) {
  apiFetch(`/api/transactions/${encodeURIComponent(transaction.id)}`, { method: 'DELETE' })
    .then(() => {
      transactions = transactions.filter(item => item.id !== transaction.id);
      renderTransactions();
      document.dispatchEvent(new CustomEvent('data:changed'));
      showToast('Transaksi berhasil dihapus', 'success');
    })
    .catch(error => showToast(error.message || 'Gagal memuat data. Coba refresh halaman.', 'error'));
}

function initFABAndNewParam() {
  document.getElementById('fab-add')?.addEventListener('click', event => {
    event.preventDefault();
    openTransactionForm();
  });
  if (new URLSearchParams(window.location.search).get('new') === '1') openTransactionForm();
}

function styleTypeButtons(buttons, selectedType) {
  buttons.forEach(button => {
    const active = button.dataset.type === selectedType;
    button.classList.toggle('active', active);
    button.style.background = active ? 'var(--color-primary-500)' : 'var(--color-surface-raised)';
    button.style.color = active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)';
  });
}

function closeTransactionOverlay(isMobile) {
  if (isMobile) closeBottomSheet(); else closeModal();
}

function renderError(error) {
  transactionList?.replaceChildren();
  emptyState?.classList.add('hidden');
  if (!errorState) return;
  errorState.classList.remove('hidden');
  errorState.replaceChildren();
  const text = document.createElement('span');
  text.textContent = error.message || 'Gagal memuat data. Coba refresh halaman.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Coba lagi';
  retry.style.cssText = 'margin-left:var(--space-3);min-height:44px;padding:0 var(--space-3);border:1px solid currentColor;border-radius:var(--rounded-md);';
  retry.addEventListener('click', () => loadTransactions(true));
  errorState.append(text, retry);
}

function clearError() {
  errorState?.classList.add('hidden');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
