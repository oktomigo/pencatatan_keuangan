// export.js - ekspor Excel/PDF melalui API.

import { apiDownload, apiFetch, ApiError } from './api.js';
import { showToast } from './toast.js';

let state;

export function init() {
  if (!document.getElementById('export-page')) return;
  state = { format: 'excel', period: 'this-month', start: '', end: '' };
  bindFormat();
  bindPeriods();
  bindCustomRange();
  document.getElementById('btn-export')?.addEventListener('click', exportData);
  updateControls();
  updatePreview();
}

function bindFormat() {
  ['fmt-excel', 'fmt-pdf'].forEach(id => document.getElementById(id)?.addEventListener('click', () => { state.format = id === 'fmt-excel' ? 'excel' : 'pdf'; styleChoice('[id^="fmt-"]', id); }));
}

function bindPeriods() {
  document.querySelectorAll('#export-periods [data-period]').forEach(button => button.addEventListener('click', () => { state.period = button.dataset.period; styleChoice('#export-periods [data-period]', state.period); const custom = document.getElementById('export-custom-range'); custom.classList.toggle('hidden', state.period !== 'custom'); custom.style.display = state.period === 'custom' ? 'flex' : 'none'; updateControls(); updatePreview(); }));
}

function bindCustomRange() {
  ['export-start', 'export-end'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { state.start = document.getElementById('export-start').value; state.end = document.getElementById('export-end').value; const invalid = state.start && state.end && state.start > state.end; document.getElementById('export-range-error').classList.toggle('hidden', !invalid); updateControls(); updatePreview(); }));
}

function styleChoice(selector, activeValue) { document.querySelectorAll(selector).forEach(element => { const active = element.id === activeValue || element.dataset.period === activeValue; element.style.background = active ? 'var(--color-primary-500)' : 'var(--color-surface-raised)'; element.style.color = active ? '#fff' : 'var(--color-text-secondary)'; element.classList.toggle('active', active); }); }

function updateControls() { styleChoice('[id^="fmt-"]', state.format === 'excel' ? 'fmt-excel' : 'fmt-pdf'); styleChoice('#export-periods [data-period]', state.period); const valid = state.period !== 'custom' || state.start && state.end && state.start <= state.end; const button = document.getElementById('btn-export'); button.disabled = !valid; button.style.opacity = valid ? '1' : '.5'; }

function periodBody() {
  const now = new Date();
  if (state.period === 'custom') return { period: 'custom', start: state.start, end: state.end };
  if (state.period === 'this-year') return { period: 'year', year: now.getFullYear() };
  const months = state.period === '3-months' ? 3 : state.period === '6-months' ? 6 : 1;
  if (months === 1) return { period: 'month', month: now.getMonth() + 1, year: now.getFullYear() };
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { period: 'custom', start: isoDate(start), end: isoDate(end) };
}

async function updatePreview() {
  const preview = document.getElementById('export-preview');
  if (!preview || state.period === 'custom' && (!state.start || !state.end || state.start > state.end)) return;
  try { const report = await apiFetch('/api/reports', { query: periodBody() }); preview.textContent = `Transaksi dalam periode: ${report.summary?.transaction_count ?? 0}`; } catch (error) { preview.textContent = ''; }
}

async function exportData() {
  const button = document.getElementById('btn-export');
  const invalid = state.period === 'custom' && (!state.start || !state.end || state.start > state.end);
  if (invalid) { document.getElementById('export-range-error').classList.remove('hidden'); return; }
  const originalText = button.textContent; button.disabled = true; button.textContent = 'Menyiapkan file...'; clearStatus();
  try { const body = { format: state.format, period: periodBody() }; const filename = `keuangan_${body.period.start || `${body.period.year || new Date().getFullYear()}0101`}_${body.period.end || `${body.period.year || new Date().getFullYear()}1231`}.${state.format === 'excel' ? 'xlsx' : 'pdf'}`; await apiDownload('/api/export', body, filename); showToast('File berhasil diunduh', 'success'); }
  catch (error) { const message = error instanceof ApiError && error.status === 400 ? 'Tidak ada data transaksi pada periode ini' : 'Ekspor gagal, silakan coba lagi'; showStatus(message, 'error'); }
  finally { button.disabled = false; button.textContent = originalText; updateControls(); }
}

function showStatus(message, variant) { const status = document.getElementById('export-status'); status.textContent = message; status.style.cssText = `margin:var(--space-4) 0;padding:var(--space-3);border-radius:var(--rounded-md);background:${variant === 'error' ? 'var(--color-danger-50)' : 'var(--color-info-50)'};color:${variant === 'error' ? 'var(--color-danger-700)' : 'var(--color-info-700)'}`; }
function clearStatus() { const status = document.getElementById('export-status'); status.textContent = ''; status.removeAttribute('style'); }
function isoDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
