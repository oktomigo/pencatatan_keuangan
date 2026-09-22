// settings.js - pengaturan PWA, storage, dan notifikasi.

import { apiFetch } from './api.js';
import { showToast } from './toast.js';

let deferredInstallPrompt = null;

export async function init() {
  if (!document.getElementById('settings-page')) return;
  initPWAInstall();
  initNotifToggle();
  await updateTxCount();
  await updateStorageWarning();
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
