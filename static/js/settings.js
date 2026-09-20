// settings.js - pengaturan PWA, storage, dan notifikasi.

import { apiFetch } from './api.js';
import { showToast } from './toast.js';

let deferredInstallPrompt = null;

export async function init() {
  createShell();
  initPWAInstall();
  initNotifToggle();
  await updateTxCount();
  await updateStorageWarning();
}

function createShell() {
  if (document.getElementById('settings-page')) return;
  const root = document.createElement('section'); root.id = 'settings-page'; root.style.cssText = 'max-width:720px;margin:0 auto;padding:var(--space-6) var(--space-4) var(--space-20);';
  root.innerHTML = `<header style="margin-bottom:var(--space-5)"><p style="color:var(--color-text-secondary);font-size:var(--text-body-md)">Kendalikan aplikasi</p><h1 style="font-size:var(--text-heading-1);font-weight:700">Pengaturan</h1></header><div id="storage-warning" class="hidden" role="alert" style="padding:var(--space-4);margin-bottom:var(--space-4);border:1px solid var(--color-warning-500);border-radius:var(--rounded-md);background:var(--color-warning-50);color:var(--color-warning-700)">Penyimpanan perangkat hampir penuh. Segera ekspor data Anda.</div><section style="display:grid;gap:var(--space-3)"><div style="padding:var(--space-4);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-lg)"><strong>Data tersimpan</strong><p style="margin-top:var(--space-2);color:var(--color-text-secondary)"><span id="tx-count">-</span> transaksi</p><a href="/export" style="display:inline-flex;align-items:center;min-height:44px;margin-top:var(--space-2);color:var(--color-primary-700)">Ekspor data</a></div><div style="padding:var(--space-4);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-lg)"><strong>Notifikasi tagihan</strong><p id="notif-status" style="margin:var(--space-2) 0;color:var(--color-text-secondary)">Nonaktif</p><button id="btn-notif-toggle" type="button" role="switch" aria-checked="false" style="min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border-medium);border-radius:var(--rounded-md)">Ubah izin notifikasi</button><p id="notif-blocked-msg" class="hidden" role="alert" style="margin-top:var(--space-2);color:var(--color-danger-700)">Aktifkan notifikasi di pengaturan browser untuk pengingat tagihan.</p></div><div style="padding:var(--space-4);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-lg)"><strong>Instal aplikasi</strong><p style="margin:var(--space-2) 0;color:var(--color-text-secondary)">Gunakan CatatUang seperti aplikasi di perangkat.</p><button id="btn-install-pwa" type="button" class="hidden" style="min-height:44px;padding:0 var(--space-3);border-radius:var(--rounded-md);background:var(--color-primary-500);color:#fff">Instal aplikasi</button></div></section>`;
  document.getElementById('page-content')?.appendChild(root);
}

async function updateTxCount() { try { const data = await apiFetch('/api/transactions', { query: { limit: 1, skip: 0 } }); const count = data?.meta?.total ?? (Array.isArray(data) ? data.length : 0); document.getElementById('tx-count').textContent = count; } catch (error) { document.getElementById('tx-count').textContent = '-'; } }

async function updateStorageWarning() { if (!navigator.storage?.estimate) return; try { const estimate = await navigator.storage.estimate(); const remaining = Number(estimate.quota || 0) - Number(estimate.usage || 0); document.getElementById('storage-warning')?.classList.toggle('hidden', remaining >= 50 * 1024 * 1024); } catch (error) { /* Storage estimate is optional. */ } }

function initPWAInstall() {
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; document.getElementById('btn-install-pwa')?.classList.remove('hidden'); });
  document.getElementById('btn-install-pwa')?.addEventListener('click', async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); const result = await deferredInstallPrompt.userChoice; if (result.outcome === 'accepted') showToast('Aplikasi berhasil diinstal!', 'success'); deferredInstallPrompt = null; document.getElementById('btn-install-pwa')?.classList.add('hidden'); });
}

function initNotifToggle() {
  const status = document.getElementById('notif-status'); const button = document.getElementById('btn-notif-toggle'); const blocked = document.getElementById('notif-blocked-msg');
  const supported = typeof Notification !== 'undefined'; let enabled = supported && Notification.permission === 'granted' && localStorage.getItem('notif-enabled') === 'true';
  const update = () => { status.textContent = enabled ? 'Aktif' : 'Nonaktif'; button.setAttribute('aria-checked', String(enabled)); };
  update();
  button.addEventListener('click', async () => { if (!supported) { blocked.classList.remove('hidden'); return; } if (enabled) { enabled = false; localStorage.removeItem('notif-enabled'); update(); showToast('Pengingat tagihan dinonaktifkan', 'info'); return; } if (Notification.permission === 'denied') { blocked.classList.remove('hidden'); return; } const permission = await Notification.requestPermission(); if (permission === 'granted') { enabled = true; localStorage.setItem('notif-enabled', 'true'); blocked.classList.add('hidden'); update(); showToast('Notifikasi diaktifkan', 'success'); } else blocked.classList.remove('hidden'); });
}
