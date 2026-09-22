// recurring_bills.js - CRUD dan pengingat tagihan berulang dari API.

import { apiFetch, ApiError } from './api.js';
import { formatRupiah, daysFromNow, today } from './utils.js';
import { openModal, openBottomSheet, openConfirmDialog, closeModal, closeBottomSheet } from './modal.js';
import { showToast } from './toast.js';

const MAX_AMOUNT = 999999999999;
let root;
let bills = [];
let categories = [];

export async function init() {
  root = document.getElementById('bills-page');
  if (!root) return;
  bindEvents();
  renderLoading();
  await loadBills();
}

function bindEvents() { root.querySelector('#btn-add-bill')?.addEventListener('click', () => openBillForm()); }

async function loadBills() {
  renderLoading();
  try {
    const [billData, categoryData] = await Promise.all([
      apiFetch('/api/recurring-bills', { query: { status: 'all' } }),
      apiFetch('/api/categories', { query: { type: 'expense' } }),
    ]);
    bills = Array.isArray(billData) ? billData : [];
    categories = Array.isArray(categoryData) ? categoryData : [];
    clearError();
    render();
    bills.filter(bill => bill.is_due_today || daysFromNow(bill.next_due) === 0).forEach(notifyBill);
  } catch (error) { renderError(error); }
}

function renderLoading() {
  root.querySelector('#bills-empty')?.classList.add('hidden');
  const list = root.querySelector('#bills-list'); list.innerHTML = '';
  for (let index = 0; index < 3; index += 1) { const skeleton = document.createElement('div'); skeleton.className = 'skeleton'; skeleton.style.cssText = 'height:92px;margin-bottom:var(--space-3)'; list.appendChild(skeleton); }
}

function render() {
  const list = root.querySelector('#bills-list'); list.replaceChildren();
  root.querySelector('#bills-empty')?.classList.toggle('hidden', bills.length > 0);
  bills.forEach(bill => list.appendChild(createBillItem(bill)));
}

function createBillItem(bill) {
  const item = document.createElement('article');
  item.className = 'bill-item'; item.dataset.billId = bill.id; item.tabIndex = 0;
  item.style.cssText = 'display:flex;align-items:center;gap:var(--space-3);padding:var(--space-4);margin-bottom:var(--space-3);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-lg);box-shadow:var(--shadow-sm);cursor:pointer;';
  const days = Number(bill.days_left ?? daysFromNow(bill.next_due));
  const paid = Boolean(bill.is_paid_this_period || bill.last_paid_at && bill.next_due > today());
  const status = paid ? 'Lunas periode ini' : bill.is_due_today || days === 0 ? 'Jatuh tempo hari ini' : days < 0 ? 'Terlambat' : `H-${days}`;
  const statusColor = paid ? 'var(--color-success-700)' : days <= 0 ? 'var(--color-danger-700)' : 'var(--color-info-700)';
  item.innerHTML = `<div style="min-width:0;flex:1"><strong class="bill-name">${escapeHtml(bill.name)}</strong><p class="bill-amount tabular-nums" style="margin-top:var(--space-1);color:var(--color-text-secondary)">${formatRupiah(bill.amount)}</p></div><span class="bill-status-badge" style="padding:var(--space-1) var(--space-2);border-radius:var(--rounded-full);background:var(--color-surface-raised);color:${statusColor};font-size:var(--text-caption);white-space:nowrap">${status}</span><button class="btn-mark-paid" type="button" ${paid ? 'disabled' : ''} style="min-height:44px;padding:0 var(--space-2);border-radius:var(--rounded-md);color:var(--color-primary-700);font-weight:600">${paid ? 'Lunas' : 'Tandai Lunas'}</button>`;
  item.querySelector('.btn-mark-paid').addEventListener('click', event => { event.stopPropagation(); markPaid(bill); });
  item.addEventListener('click', () => openBillDetail(bill));
  item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openBillDetail(bill); } });
  return item;
}

function markPaid(bill) {
  openConfirmDialog({ title: 'Tandai Lunas?', message: `Transaksi pengeluaran untuk <strong>${escapeHtml(bill.name)}</strong> sebesar <strong>${formatRupiah(bill.amount)}</strong> akan otomatis dicatat.`, variant: 'info', confirmLabel: 'Ya, Catat', onConfirm: async () => {
    try { await apiFetch(`/api/recurring-bills/${encodeURIComponent(bill.id)}/pay`, { method: 'POST' }); await loadBills(); document.dispatchEvent(new CustomEvent('data:changed')); showToast('Tagihan ditandai lunas & transaksi tercatat', 'success'); }
    catch (error) { if (error instanceof ApiError && error.status === 409) showToast(error.message, 'warning'); else showToast(error.message || 'Gagal memuat data. Coba refresh halaman.', 'error'); }
  } });
}

function notifyBill(bill) {
  const key = `bill_notified_${bill.id}_${today()}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  const message = `${bill.name} jatuh tempo hari ini: ${formatRupiah(bill.amount)}`;
  showToast(message, 'warning');
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    navigator.serviceWorker?.ready.then(registration => registration.showNotification('Tagihan jatuh tempo', { body: message })).catch(() => {});
  }
}

function openBillDetail(bill) {
  const mobile = window.innerWidth < 768;
  const frequency = { monthly: 'Bulanan', weekly: 'Mingguan', yearly: 'Tahunan' }[bill.frequency] || bill.frequency;
  const content = `<dl style="display:grid;gap:var(--space-3);margin-bottom:var(--space-5)"><div style="display:flex;justify-content:space-between"><dt style="color:var(--color-text-secondary)">Nominal</dt><dd>${formatRupiah(bill.amount)}</dd></div><div style="display:flex;justify-content:space-between"><dt style="color:var(--color-text-secondary)">Frekuensi</dt><dd>${frequency}</dd></div><div style="display:flex;justify-content:space-between"><dt style="color:var(--color-text-secondary)">Jatuh tempo</dt><dd>${escapeHtml(bill.next_due || '')}</dd></div></dl><div style="display:flex;gap:var(--space-3)"><button id="bill-edit" type="button" style="flex:1;min-height:44px;border:1px solid var(--color-border-medium);border-radius:var(--rounded-md)">Edit</button><button id="bill-delete" type="button" style="flex:1;min-height:44px;border-radius:var(--rounded-md);background:var(--color-danger-50);color:var(--color-danger-700)">Hapus</button></div>`;
  (mobile ? openBottomSheet : openModal)({ title: escapeHtml(bill.name), contentHTML: content });
  setTimeout(() => {
    document.getElementById('bill-edit')?.addEventListener('click', () => { closeForm(mobile); openBillForm(bill); });
    document.getElementById('bill-delete')?.addEventListener('click', () => { closeForm(mobile); confirmDelete(bill); });
  }, 0);
}

function confirmDelete(bill) { openConfirmDialog({ title: `Hapus "${escapeHtml(bill.name)}"?`, message: 'Tagihan ini akan dihapus. Transaksi yang sudah tercatat tidak ikut terhapus.', confirmLabel: 'Hapus', onConfirm: async () => { try { await apiFetch(`/api/recurring-bills/${encodeURIComponent(bill.id)}`, { method: 'DELETE' }); bills = bills.filter(item => item.id !== bill.id); render(); showToast('Tagihan berhasil dihapus', 'success'); } catch (error) { showToast(error.message || 'Gagal memuat data. Coba refresh halaman.', 'error'); } } }); }

function openBillForm(bill = null) {
  const edit = Boolean(bill); const mobile = window.innerWidth < 768;
  const content = `<form id="bill-form" novalidate><label for="bill-name">Nama Tagihan</label><input id="bill-name" maxlength="50" value="${escapeHtml(bill?.name || '')}" style="width:100%;min-height:44px;margin:var(--space-2) 0 var(--space-1);padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"><p id="bill-name-error" class="field-error"></p><label for="bill-amount">Nominal</label><input id="bill-amount" type="number" min="1" max="${MAX_AMOUNT}" step="1" value="${bill?.amount || ''}" style="width:100%;min-height:44px;margin:var(--space-2) 0 var(--space-1);padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"><p id="bill-amount-error" class="field-error"></p><label for="bill-frequency">Frekuensi</label><select id="bill-frequency" style="width:100%;min-height:44px;margin:var(--space-2) 0 var(--space-3);padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"><option value="monthly">Bulanan</option><option value="weekly">Mingguan</option><option value="yearly">Tahunan</option></select><label id="bill-due-label" for="bill-due-day">Tanggal jatuh tempo</label><input id="bill-due-day" type="number" min="1" max="31" value="${bill?.due_day || ''}" style="width:100%;min-height:44px;margin:var(--space-2) 0 var(--space-1);padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"><input id="bill-due-date" type="text" placeholder="MM-DD" value="${bill?.due_date || ''}" class="hidden" style="width:100%;min-height:44px;margin:var(--space-2) 0 var(--space-1);padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"><p id="bill-due-error" class="field-error"></p><label for="bill-category">Kategori (opsional)</label><select id="bill-category" style="width:100%;min-height:44px;margin:var(--space-2) 0 var(--space-3);padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"><option value="">Otomatis: Tagihan</option>${categories.map(category => `<option value="${escapeHtml(category.id)}" ${category.id === bill?.category_id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('')}</select><button id="bill-submit" type="submit" style="width:100%;min-height:48px;border-radius:var(--rounded-md);background:var(--color-primary-500);color:#fff;font-weight:600">Simpan</button></form>`;
  (mobile ? openBottomSheet : openModal)({ title: edit ? `Edit ${escapeHtml(bill.name)}` : 'Tambah Tagihan Berulang', contentHTML: content });
  setTimeout(() => {
    const form = document.getElementById('bill-form'); if (!form) return;
    const frequency = form.querySelector('#bill-frequency'); frequency.value = bill?.frequency || 'monthly'; updateDueInput(form);
    frequency.addEventListener('change', () => updateDueInput(form));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const name = form.querySelector('#bill-name').value.trim(); const amount = Number(form.querySelector('#bill-amount').value); const freq = frequency.value; const dueDay = Number(form.querySelector('#bill-due-day').value); const dueDate = form.querySelector('#bill-due-date').value.trim();
      const errors = {}; if (!name) errors.name = 'Nama tagihan wajib diisi'; if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT) errors.amount = 'Nominal harus berupa angka lebih dari 0 dan tidak melebihi 999.999.999.999'; if (freq === 'yearly' ? !/^((0[1-9])|(1[0-2]))-(0[1-9]|[12][0-9]|3[01])$/.test(dueDate) : !Number.isInteger(dueDay) || dueDay < 0 || dueDay > (freq === 'weekly' ? 6 : 31)) errors.due_day = 'Tanggal jatuh tempo tidak valid';
      if (Object.keys(errors).length) { Object.entries(errors).forEach(([field, message]) => showError(form, field, message)); return; }
      const submit = form.querySelector('#bill-submit'); submit.disabled = true; submit.textContent = 'Menyimpan...';
      const body = { name, amount, frequency: freq, due_day: freq === 'yearly' ? undefined : dueDay, due_date: freq === 'yearly' ? dueDate : undefined, category_id: form.querySelector('#bill-category').value || undefined };
      try { await apiFetch(edit ? `/api/recurring-bills/${encodeURIComponent(bill.id)}` : '/api/recurring-bills', { method: edit ? 'PUT' : 'POST', body }); closeForm(mobile); await loadBills(); showToast(edit ? 'Tagihan berhasil diperbarui' : 'Tagihan berhasil ditambahkan', 'success'); }
      catch (error) { if (error.fields) Object.entries(error.fields).forEach(([field, message]) => showError(form, field, message)); else showToast(error.message || 'Gagal memuat data. Coba refresh halaman.', 'error'); submit.disabled = false; submit.textContent = 'Simpan'; }
    });
  }, 0);
}

function updateDueInput(form) { const frequency = form.querySelector('#bill-frequency').value; const day = form.querySelector('#bill-due-day'); const date = form.querySelector('#bill-due-date'); const label = form.querySelector('#bill-due-label'); const yearly = frequency === 'yearly'; day.classList.toggle('hidden', yearly); date.classList.toggle('hidden', !yearly); label.textContent = yearly ? 'Tanggal tahunan (MM-DD)' : frequency === 'weekly' ? 'Hari (0=Senin sampai 6=Minggu)' : 'Tanggal jatuh tempo (1-31)'; }
function showError(form, field, message) { const map = { name: 'bill-name', amount: 'bill-amount', due_day: 'bill-due-day' }; const input = form.querySelector(`#${map[field] || field}`); const error = form.querySelector(`#${map[field] || field}-error`); if (error) { error.textContent = message; error.style.cssText = 'display:block;margin:0 0 var(--space-2);color:var(--color-danger-700);font-size:var(--text-caption)'; } if (input) input.style.borderColor = 'var(--color-border-error)'; }
function closeForm(mobile) { mobile ? closeBottomSheet() : closeModal(); }
function renderError(error) { const element = root.querySelector('#bills-error'); element.classList.remove('hidden'); element.innerHTML = `${escapeHtml(error.message || 'Gagal memuat data. Coba refresh halaman.')} <button id="bills-retry" type="button" style="min-height:44px;margin-left:var(--space-2);padding:0 var(--space-3);border:1px solid currentColor;border-radius:var(--rounded-md)">Coba lagi</button>`; element.querySelector('#bills-retry').addEventListener('click', loadBills); root.querySelector('#bills-list').replaceChildren(); }
function clearError() { root.querySelector('#bills-error')?.classList.add('hidden'); }
function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
