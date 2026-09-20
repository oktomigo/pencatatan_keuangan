// export.js - ekspor Excel/PDF melalui API.

import { apiDownload, apiFetch, ApiError } from './api.js';
import { showToast } from './toast.js';

let state;

export function init() {
  createShell();
  state = { format: 'excel', period: 'this-month', start: '', end: '' };
  bindFormat();
  bindPeriods();
  bindCustomRange();
  document.getElementById('btn-export')?.addEventListener('click', exportData);
  updateControls();
  updatePreview();
}

function createShell() {
  if (document.getElementById('export-page')) return;
  const root = document.createElement('section');
  root.id = 'export-page';
  root.style.cssText = 'max-width:720px;margin:0 auto;padding:var(--space-6) var(--space-4) var(--space-20);';
  root.innerHTML = `<header style="margin-bottom:var(--space-5)"><p style="color:var(--color-text-secondary);font-size:var(--text-body-md)">Simpan arsip keuangan</p><h1 style="font-size:var(--text-heading-1);font-weight:700">Ekspor Data</h1></header><div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-5)"><button id="fmt-excel" type="button" style="flex:1;min-height:44px;border-radius:var(--rounded-md)">Excel (.xlsx)</button><button id="fmt-pdf" type="button" style="flex:1;min-height:44px;border-radius:var(--rounded-md)">PDF</button></div><h2 style="font-size:var(--text-heading-2);margin-bottom:var(--space-3)">Periode</h2><div id="export-periods" style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)"><button id="period-this-month" type="button" data-period="this-month" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md)">Bulan ini</button><button id="period-3-months" type="button" data-period="3-months" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md)">3 bulan</button><button id="period-6-months" type="button" data-period="6-months" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md)">6 bulan</button><button id="period-this-year" type="button" data-period="this-year" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md)">Tahun ini</button><button id="period-custom" type="button" data-period="custom" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md)">Kustom</button></div><div id="export-custom-range" class="hidden" style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-4)"><input id="export-start" type="date" aria-label="Tanggal mulai" style="min-height:44px;padding:0 var(--space-2);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"><input id="export-end" type="date" aria-label="Tanggal akhir" style="min-height:44px;padding:0 var(--space-2);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"><p id="export-range-error" class="hidden" role="alert" style="width:100%;color:var(--color-danger-700)">Tanggal mulai tidak boleh setelah tanggal akhir</p></div><p id="export-preview" style="margin:var(--space-4) 0;color:var(--color-text-secondary)"></p><div id="export-status" role="status" aria-live="polite"></div><button id="btn-export" type="button" style="width:100%;min-height:48px;border-radius:var(--rounded-md);background:var(--color-primary-500);color:#fff;font-weight:600">Ekspor sekarang</button>`;
  document.getElementById('page-content')?.appendChild(root);
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
