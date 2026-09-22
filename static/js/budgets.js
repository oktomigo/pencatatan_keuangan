// budgets.js - anggaran dan progress realtime dari API.

import { apiFetch, ApiError } from './api.js';
import { formatRupiah } from './utils.js';
import { openModal, openBottomSheet, openConfirmDialog, closeModal, closeBottomSheet } from './modal.js';
import { showToast } from './toast.js';

const MAX_AMOUNT = 999999999999;
let root;
let budgets = [];
let categories = [];

export async function init() {
  root = document.getElementById('budgets-page');
  if (!root) return;
  bindEvents();
  renderLoading();
  await loadData();
}

function bindEvents() {
  root.querySelector('#budgets-error')?.addEventListener('click', event => {
    if (event.target.dataset.retry) loadData();
  });
}

async function loadData() {
  renderLoading();
  try {
    const [budgetData, categoryData] = await Promise.all([
      apiFetch('/api/budgets'),
      apiFetch('/api/categories', { query: { type: 'expense' } }),
    ]);
    budgets = Array.isArray(budgetData) ? budgetData : [];
    categories = Array.isArray(categoryData) ? categoryData : [];
    clearError();
    render();
  } catch (error) {
    renderError(error);
  }
}

function renderLoading() {
  root.querySelector('#budgets-empty')?.classList.add('hidden');
  root.querySelector('#unbudgeted-section')?.classList.add('hidden');
  const list = root.querySelector('#budgets-list');
  list.innerHTML = '';
  for (let index = 0; index < 3; index += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.style.cssText = 'height:112px;margin-bottom:var(--space-3);';
    list.appendChild(skeleton);
  }
}

function render() {
  const list = root.querySelector('#budgets-list');
  list.replaceChildren();
  root.querySelector('#budgets-empty')?.classList.toggle('hidden', budgets.length > 0);
  budgets.forEach(budget => list.appendChild(createBudgetCard(budget)));

  const budgetIds = new Set(budgets.map(budget => budget.category_id));
  const unbudgeted = categories.filter(category => !budgetIds.has(category.id));
  const unbudgetedSection = root.querySelector('#unbudgeted-section');
  const unbudgetedList = root.querySelector('#unbudgeted-list');
  unbudgetedList.replaceChildren();
  unbudgetedSection.classList.toggle('hidden', unbudgeted.length === 0);
  unbudgeted.forEach(category => unbudgetedList.appendChild(createUnbudgetedItem(category)));
}

function createBudgetCard(budget) {
  const card = document.createElement('article');
  card.className = 'budget-item';
  card.dataset.budgetId = budget.id;
  card.dataset.catId = budget.category_id;
  card.dataset.catName = budget.category_name || 'Kategori';
  card.tabIndex = 0;
  card.style.cssText = 'padding:var(--space-4);margin-bottom:var(--space-3);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-lg);box-shadow:var(--shadow-sm);cursor:pointer;';
  const percentage = Number(budget.percentage || 0);
  const status = budget.status || statusFor(percentage);
  card.innerHTML = `<div style="display:flex;align-items:center;gap:var(--space-3)"><div style="min-width:0;flex:1"><strong>${escapeHtml(budget.category_name || 'Kategori')}</strong><p class="budget-detail" style="margin-top:var(--space-1);color:var(--color-text-secondary);font-size:var(--text-body-md)">${formatRupiah(budget.spent || 0)} dari ${formatRupiah(budget.amount)} (${percentage}%)</p></div><span class="budget-status" style="font-size:var(--text-caption);font-weight:600">${labelFor(status)}</span><button class="budget-delete" type="button" aria-label="Hapus anggaran" style="min-height:44px;padding:0 var(--space-2);border-radius:var(--rounded-md);color:var(--color-danger-700)">Hapus</button></div><div style="height:8px;margin-top:var(--space-3);background:var(--color-surface-raised);border-radius:var(--rounded-full);overflow:hidden"><div class="budget-progress-fill" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100" aria-label="Anggaran ${escapeHtml(budget.category_name || 'Kategori')}: ${percentage}% terpakai" style="height:100%;width:${Math.min(percentage, 100)}%;background:${colorFor(status)};border-radius:var(--rounded-full);transition:width var(--transition-slow)"></div></div>`;
  card.querySelector('.budget-delete').addEventListener('click', event => { event.stopPropagation(); deleteBudget(budget); });
  card.addEventListener('click', () => openBudgetForm(budget));
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openBudgetForm(budget); }
  });
  return card;
}

function createUnbudgetedItem(category) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `+ Set anggaran ${category.name}`;
  button.style.cssText = 'display:block;width:100%;min-height:44px;padding:0 var(--space-3);margin-bottom:var(--space-2);text-align:left;border:1px solid var(--color-border-light);border-radius:var(--rounded-md);background:var(--color-surface-card);color:var(--color-primary-700);';
  button.addEventListener('click', () => openBudgetForm({ category_id: category.id, category_name: category.name }));
  return button;
}

function openBudgetForm(budget) {
  const existing = Boolean(budget.id);
  const isMobile = window.innerWidth < 768;
  const content = `<form id="budget-form" novalidate><p style="margin-bottom:var(--space-4);color:var(--color-text-secondary)">${escapeHtml(budget.category_name || 'Kategori')}</p><label for="budget-amount" style="display:block;margin-bottom:var(--space-2);font-weight:600">Nominal Anggaran</label><input id="budget-amount" type="number" min="1" max="${MAX_AMOUNT}" step="1" inputmode="numeric" value="${existing ? budget.amount : ''}" style="width:100%;min-height:48px;padding:0 var(--space-3);font-variant-numeric:tabular-nums;border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"/><p id="budget-amount-error" class="hidden" role="alert" style="margin-top:var(--space-2);color:var(--color-danger-700)"></p><label style="display:block;margin:var(--space-4) 0 var(--space-2);font-weight:600">Periode</label><div id="budget-period-toggle" style="display:flex;gap:var(--space-2)"><button type="button" data-period="monthly" style="flex:1;min-height:44px;border-radius:var(--rounded-md)">Bulanan</button><button type="button" data-period="weekly" style="flex:1;min-height:44px;border-radius:var(--rounded-md)">Mingguan</button></div><button id="budget-submit" type="submit" style="width:100%;min-height:48px;margin-top:var(--space-5);border-radius:var(--rounded-md);background:var(--color-primary-500);color:#fff;font-weight:600">Simpan Anggaran</button></form>`;
  (isMobile ? openBottomSheet : openModal)({ title: existing ? `Edit Anggaran ${budget.category_name}` : `Set Anggaran ${budget.category_name}`, contentHTML: content });
  setTimeout(() => {
    const form = document.getElementById('budget-form');
    if (!form) return;
    let period = budget.period || 'monthly';
    const periodButtons = [...form.querySelectorAll('[data-period]')];
    const stylePeriod = () => periodButtons.forEach(button => { const active = button.dataset.period === period; button.style.background = active ? 'var(--color-primary-500)' : 'var(--color-surface-raised)'; button.style.color = active ? '#fff' : 'var(--color-text-secondary)'; });
    periodButtons.forEach(button => button.addEventListener('click', () => { period = button.dataset.period; stylePeriod(); }));
    stylePeriod();
    form.querySelector('#budget-amount').addEventListener('input', () => clearFieldError(form.querySelector('#budget-amount'), form.querySelector('#budget-amount-error')));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const amount = Number(form.querySelector('#budget-amount').value);
      if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT) { showFieldError(form.querySelector('#budget-amount'), form.querySelector('#budget-amount-error'), 'Nominal anggaran tidak valid'); return; }
      const submit = form.querySelector('#budget-submit'); submit.disabled = true; submit.textContent = 'Menyimpan...';
      try {
        const path = existing ? `/api/budgets/${encodeURIComponent(budget.id)}` : '/api/budgets';
        const body = existing ? { amount, period } : { category_id: budget.category_id, amount, period };
        const saved = await apiFetch(path, { method: existing ? 'PUT' : 'POST', body });
        closeForm(isMobile);
        await loadData();
        handleNotify(saved, budget.category_name);
        showToast('Anggaran berhasil disimpan', 'success');
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          const duplicate = budgets.find(item => item.category_id === budget.category_id && item.period === period);
          if (duplicate) { closeForm(isMobile); openBudgetForm(duplicate); }
          else showToast('Anggaran kategori ini sudah ada', 'error');
        } else if (error.fields?.amount || error.message === 'Nominal anggaran tidak valid') {
          showFieldError(form.querySelector('#budget-amount'), form.querySelector('#budget-amount-error'), error.fields?.amount || 'Nominal anggaran tidak valid');
        } else showToast(error.message || 'Gagal memuat data. Coba refresh halaman.', 'error');
        submit.disabled = false; submit.textContent = 'Simpan Anggaran';
      }
    });
  }, 0);
}

function handleNotify(data, fallbackName) {
  if (!data?.notify) return;
  const period = data.notified_period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const key = `budget_notify_${data.category_id || fallbackName}_${period}_${data.notify}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  showToast(data.notify === 'danger' ? `Anggaran ${data.category_name || fallbackName} telah terlampaui` : `Anggaran ${data.category_name || fallbackName} hampir habis`, 'warning');
}

function deleteBudget(budget) {
  openConfirmDialog({ title: 'Hapus Anggaran?', message: 'Batas anggaran ini akan dihapus, transaksi tetap tersimpan.', confirmLabel: 'Hapus', onConfirm: async () => { try { await apiFetch(`/api/budgets/${encodeURIComponent(budget.id)}`, { method: 'DELETE' }); budgets = budgets.filter(item => item.id !== budget.id); render(); showToast('Anggaran berhasil dihapus', 'success'); } catch (error) { showToast(error.message || 'Gagal memuat data. Coba refresh halaman.', 'error'); } } });
}

function showFieldError(input, error, message) { error.textContent = message; error.classList.remove('hidden'); input.setAttribute('aria-invalid', 'true'); input.style.borderColor = 'var(--color-border-error)'; }
function clearFieldError(input, error) { error.textContent = ''; error.classList.add('hidden'); input.removeAttribute('aria-invalid'); input.style.borderColor = 'var(--color-border-light)'; }
function closeForm(mobile) { mobile ? closeBottomSheet() : closeModal(); }
function statusFor(percentage) { return percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : 'safe'; }
function colorFor(status) { return ({ safe: 'var(--color-success-500)', warning: 'var(--color-warning-400)', danger: 'var(--color-danger-500)' })[status] || 'var(--color-success-500)'; }
function labelFor(status) { return ({ safe: 'Aman', warning: 'Hampir habis', danger: 'Terlampaui' })[status] || 'Aman'; }
function renderError(error) { const element = root.querySelector('#budgets-error'); element.classList.remove('hidden'); element.innerHTML = `${escapeHtml(error.message || 'Gagal memuat data. Coba refresh halaman.')} <button type="button" data-retry="1" style="min-height:44px;margin-left:var(--space-2);padding:0 var(--space-3);border:1px solid currentColor;border-radius:var(--rounded-md)">Coba lagi</button>`; root.querySelector('#budgets-list').replaceChildren(); }
function clearError() { root.querySelector('#budgets-error')?.classList.add('hidden'); }
function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
