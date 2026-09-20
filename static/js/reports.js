// reports.js - laporan dan grafik dari API.

import { apiFetch } from './api.js';
import { formatRupiah } from './utils.js';

let root;
let donutChart = null;
let barChart = null;
let requestController = null;
let activePeriod = { period: 'month' };

export async function init() {
  createShell();
  bindEvents();
  renderLoading();
  await loadReport(activePeriod);
}

function createShell() {
  root = document.getElementById('reports-page');
  if (!root) {
    root = document.createElement('section');
    root.id = 'reports-page';
    root.style.cssText = 'max-width:1100px;margin:0 auto;padding:var(--space-6) var(--space-4) var(--space-20);';
    root.innerHTML = `<header style="margin-bottom:var(--space-5)"><p style="color:var(--color-text-secondary);font-size:var(--text-body-md)">Pahami pola keuangan</p><h1 style="font-size:var(--text-heading-1);font-weight:700">Laporan</h1></header><div id="report-period-tabs" role="tablist" style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)"><button id="tab-this-month" data-period="month" type="button" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md)">Bulan ini</button><button id="tab-last-month" data-period="last-month" type="button" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md)">Bulan lalu</button><button id="tab-custom" data-period="custom" type="button" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md)">Kustom</button></div><div id="custom-range" class="hidden" style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-4)"><input id="range-start" type="date" aria-label="Tanggal mulai" style="min-height:44px;padding:0 var(--space-2);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"><input id="range-end" type="date" aria-label="Tanggal akhir" style="min-height:44px;padding:0 var(--space-2);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)"><span id="range-error" class="hidden" role="alert" style="width:100%;color:var(--color-danger-700)">Tanggal mulai tidak boleh setelah tanggal akhir</span></div><div id="reports-error" class="hidden" role="alert" style="padding:var(--space-4);margin-bottom:var(--space-4);border:1px solid var(--color-danger-500);border-radius:var(--rounded-md);background:var(--color-danger-50);color:var(--color-danger-700)"></div><div id="empty-state" class="hidden" role="status" style="padding:var(--space-8);text-align:center;border:1px dashed var(--color-border-medium);border-radius:var(--rounded-lg);color:var(--color-text-secondary)">Belum ada transaksi pada periode ini</div><section id="report-content"><div id="report-summary" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-3);margin-bottom:var(--space-5)"><div style="padding:var(--space-4);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-lg)"><p style="font-size:var(--text-caption)">Pemasukan</p><strong id="summary-income" class="tabular-nums">Rp 0</strong></div><div style="padding:var(--space-4);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-lg)"><p style="font-size:var(--text-caption)">Pengeluaran</p><strong id="summary-expense" class="tabular-nums">Rp 0</strong></div><div style="padding:var(--space-4);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-lg)"><p style="font-size:var(--text-caption)">Saldo</p><strong id="summary-balance" class="tabular-nums">Rp 0</strong></div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--space-4);margin-bottom:var(--space-5)"><figure style="min-height:280px;padding:var(--space-4);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-lg)"><figcaption style="font-weight:600;margin-bottom:var(--space-3)">Proporsi pengeluaran</figcaption><div id="chart-error" class="hidden" role="status" style="color:var(--color-text-secondary)">Grafik tidak dapat ditampilkan</div><div style="height:220px"><canvas id="donut-chart" aria-label="Grafik pengeluaran per kategori"></canvas></div><div id="donut-legend" style="display:grid;gap:var(--space-2);margin-top:var(--space-3)"></div></figure><figure style="min-height:280px;padding:var(--space-4);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-lg)"><figcaption style="font-weight:600;margin-bottom:var(--space-3)">Tren harian</figcaption><div style="height:220px"><canvas id="bar-chart" aria-label="Grafik tren pemasukan dan pengeluaran"></canvas></div></figure></div><div id="category-breakdown"></div></section>`;
    document.getElementById('page-content')?.appendChild(root);
  }
  setActiveTab('month');
}

function bindEvents() {
  root.querySelectorAll('#report-period-tabs button').forEach(button => button.addEventListener('click', () => {
    const type = button.dataset.period;
    setActiveTab(type);
    const custom = root.querySelector('#custom-range');
    if (type === 'custom') { custom.classList.remove('hidden'); custom.style.display = 'flex'; return; }
    custom.classList.add('hidden');
    custom.style.display = 'none';
    loadReport(periodFor(type));
  }));
  ['range-start', 'range-end'].forEach(id => root.querySelector(`#${id}`)?.addEventListener('change', () => {
    const start = root.querySelector('#range-start').value;
    const end = root.querySelector('#range-end').value;
    if (!start || !end) return;
    if (start > end) { root.querySelector('#range-error').classList.remove('hidden'); return; }
    root.querySelector('#range-error').classList.add('hidden');
    loadReport({ period: 'custom', start, end });
  }));
}

function periodFor(type) {
  const now = new Date();
  if (type === 'last-month') return { period: 'month', month: now.getMonth() || 12, year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear() };
  return { period: 'month', month: now.getMonth() + 1, year: now.getFullYear() };
}

async function loadReport(period) {
  if (requestController) requestController.abort();
  requestController = new AbortController();
  const previousPeriod = activePeriod;
  activePeriod = period;
  renderLoading();
  try {
    const data = await apiFetch('/api/reports', { signal: requestController.signal, query: period });
    clearError();
    renderReport(data || {});
  } catch (error) {
    if (error.code === 'ABORTED') return;
    activePeriod = previousPeriod;
    renderError(error);
  }
}

function renderLoading() {
  root.querySelector('#report-content')?.classList.add('skeleton');
  root.querySelector('#empty-state')?.classList.add('hidden');
}

function renderReport(data) {
  root.querySelector('#report-content')?.classList.remove('skeleton');
  const empty = data.is_empty === true || Number(data.summary?.transaction_count || 0) === 0 && !(data.by_category || []).length;
  root.querySelector('#empty-state').classList.toggle('hidden', !empty);
  root.querySelector('#report-content').style.display = empty ? 'none' : '';
  if (empty) { destroyCharts(); return; }
  const summary = data.summary || {};
  setText('summary-income', formatRupiah(summary.total_income || 0));
  setText('summary-expense', formatRupiah(summary.total_expense || 0));
  setText('summary-balance', formatRupiah(summary.balance || 0));
  root.querySelector('#summary-balance').style.color = Number(summary.balance || 0) >= 0 ? 'var(--color-text-income)' : 'var(--color-text-expense)';
  renderDonut(data.by_category || []);
  renderBar(data.daily_trend || []);
  renderBreakdown(data.by_category || []);
}

function renderDonut(categories) {
  const expense = categories.filter(category => category.type === 'expense' ? category.total > 0 : category.expense > 0).map(category => ({ ...category, value: category.total ?? category.expense, label: category.name || 'Lainnya', color: category.color || '#0D9488', percentage: category.percentage ?? category.pct_expense ?? 0 }));
  const legend = root.querySelector('#donut-legend');
  legend.replaceChildren();
  expense.forEach(category => { const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:var(--space-2);font-size:var(--text-body-md)'; row.innerHTML = `<span style="width:12px;height:12px;margin-top:4px;background:${escapeHtml(category.color)}"></span><span>${escapeHtml(category.label)}</span><span style="margin-left:auto">${category.percentage}%</span>`; legend.appendChild(row); });
  if (typeof Chart === 'undefined') { root.querySelector('#chart-error')?.classList.remove('hidden'); return; }
  root.querySelector('#chart-error')?.classList.add('hidden');
  const canvas = root.querySelector('#donut-chart');
  const config = { labels: expense.map(item => item.label), datasets: [{ data: expense.map(item => item.value), backgroundColor: expense.map(item => item.color), borderColor: '#fff', borderWidth: 2 }] };
  if (!donutChart) donutChart = new Chart(canvas, { type: 'doughnut', data: config, options: { cutout: '65%', maintainAspectRatio: false, plugins: { legend: { display: false } } } });
  else { donutChart.data = config; donutChart.update(); }
}

function renderBar(trend) {
  if (typeof Chart === 'undefined') return;
  const canvas = root.querySelector('#bar-chart');
  const config = { labels: trend.map(item => item.date.slice(5)), datasets: [{ label: 'Pemasukan', data: trend.map(item => item.income || 0), backgroundColor: '#22C55E' }, { label: 'Pengeluaran', data: trend.map(item => item.expense || 0), backgroundColor: '#EF4444' }] };
  if (!barChart) barChart = new Chart(canvas, { type: 'bar', data: config, options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } });
  else { barChart.data = config; barChart.update(); }
}

function renderBreakdown(categories) {
  const container = root.querySelector('#category-breakdown');
  container.innerHTML = `<h2 style="font-size:var(--text-heading-2);margin-bottom:var(--space-3)">Rincian per kategori</h2><div style="overflow:auto"><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:var(--space-2)">Kategori</th><th style="text-align:right;padding:var(--space-2)">Total</th><th style="text-align:right;padding:var(--space-2)">%</th></tr></thead><tbody>${categories.map(category => `<tr><td style="padding:var(--space-2)">${escapeHtml(category.name || 'Lainnya')}</td><td style="padding:var(--space-2);text-align:right">${formatRupiah(category.total || category.expense || category.income || 0)}</td><td style="padding:var(--space-2);text-align:right">${category.percentage ?? category.pct_expense ?? category.pct_income ?? 0}%</td></tr>`).join('')}</tbody></table></div>`;
}

function destroyCharts() { donutChart?.destroy(); barChart?.destroy(); donutChart = null; barChart = null; }
function setActiveTab(type) { root.querySelectorAll('#report-period-tabs button').forEach(button => { const active = button.dataset.period === type; button.classList.toggle('active', active); button.style.background = active ? 'var(--color-primary-500)' : 'var(--color-surface-raised)'; button.style.color = active ? '#fff' : 'var(--color-text-secondary)'; }); }
function setText(id, value) { const element = root.querySelector(`#${id}`); if (element) element.textContent = value; }
function renderError(error) { root.querySelector('#report-content').classList.remove('skeleton'); root.querySelector('#report-content').style.display = ''; const element = root.querySelector('#reports-error'); element.classList.remove('hidden'); element.textContent = error.message || 'Gagal memuat data. Coba refresh halaman.'; }
function clearError() { root.querySelector('#reports-error')?.classList.add('hidden'); }
function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
