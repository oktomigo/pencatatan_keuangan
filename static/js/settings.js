// settings.js - pengaturan PWA, storage, notifikasi, dan backup/restore sinkronisasi.

import { apiFetch, getDeviceId } from './api.js';
import { showToast } from './toast.js';

let deferredInstallPrompt = null;

export async function init() {
  if (!document.getElementById('settings-page')) return;
  initPWAInstall();
  initNotifToggle();
  initDeviceSync();
  initBackupRestore();
  await updateTxCount();
  await updateStorageWarning();
}

async function updateTxCount() {
  try {
    const data = await apiFetch('/api/transactions', { query: { limit: 1, skip: 0 } });
    const count = data?.meta?.total ?? (Array.isArray(data) ? data.length : 0);
    const countEl = document.getElementById('tx-count');
    if (countEl) countEl.textContent = count;
  } catch (error) {
    const countEl = document.getElementById('tx-count');
    if (countEl) countEl.textContent = '-';
  }
}

async function updateStorageWarning() {
  if (!navigator.storage?.estimate) return;
  try {
    const estimate = await navigator.storage.estimate();
    const remaining = Number(estimate.quota || 0) - Number(estimate.usage || 0);
    document.getElementById('storage-warning')?.classList.toggle('hidden', remaining >= 50 * 1024 * 1024);
  } catch (error) {
    /* Storage estimate is optional. */
  }
}

function initPWAInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    document.getElementById('btn-install-pwa')?.classList.remove('hidden');
    document.getElementById('pwa-installed-badge')?.classList.add('hidden');
  });

  document.getElementById('btn-install-pwa')?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    if (result.outcome === 'accepted') {
      showToast('Aplikasi berhasil diinstal di perangkat Anda!', 'success');
    }
    deferredInstallPrompt = null;
    document.getElementById('btn-install-pwa')?.classList.add('hidden');
  });
}

function initNotifToggle() {
  const status = document.getElementById('notif-status');
  const button = document.getElementById('btn-notif-toggle');
  const blocked = document.getElementById('notif-blocked-msg');
  if (!status || !button) return;

  const supported = typeof Notification !== 'undefined';
  let enabled = supported && Notification.permission === 'granted' && localStorage.getItem('notif-enabled') === 'true';

  const update = () => {
    status.textContent = enabled ? 'Aktif' : 'Nonaktif';
    status.className = enabled
      ? 'inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full'
      : 'inline-flex items-center gap-1 text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full';
    button.setAttribute('aria-checked', String(enabled));
  };

  update();

  button.addEventListener('click', async () => {
    if (!supported) {
      blocked?.classList.remove('hidden');
      return;
    }
    if (enabled) {
      enabled = false;
      localStorage.removeItem('notif-enabled');
      update();
      showToast('Pengingat tagihan dinonaktifkan', 'info');
      return;
    }
    if (Notification.permission === 'denied') {
      blocked?.classList.remove('hidden');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      enabled = true;
      localStorage.setItem('notif-enabled', 'true');
      blocked?.classList.add('hidden');
      update();
      showToast('Notifikasi pengingat diaktifkan', 'success');
    } else {
      blocked?.classList.remove('hidden');
    }
  });
}

async function initDeviceSync() {
  try {
    const deviceId = await getDeviceId();
    const keyEl = document.getElementById('device-key-display');
    if (keyEl) keyEl.textContent = deviceId;

    document.getElementById('btn-copy-device-id')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(deviceId);
        showToast('Kunci sinkronisasi disalin ke clipboard!', 'success');
      } catch (e) {
        showToast('Gagal menyalin. Silakan pilih dan salin manual.', 'error');
      }
    });

    document.getElementById('btn-switch-device')?.addEventListener('click', () => {
      const input = prompt('Masukkan Kunci Perangkat / Sync ID tujuan:');
      if (input && input.trim()) {
        localStorage.setItem('device_id', input.trim());
        showToast('Perangkat dialihkan. Memuat ulang data...', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    });
  } catch (error) {
    /* Device ID fallback */
  }
}

function initBackupRestore() {
  // Download Backup JSON
  document.getElementById('btn-backup-json')?.addEventListener('click', async () => {
    try {
      showToast('Menyiapkan file cadangan...', 'info');
      const res = await apiFetch('/api/backup');
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catatuang-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('File cadangan berhasil diunduh!', 'success');
    } catch (err) {
      showToast('Gagal mencadangkan data: ' + (err.message || 'Terjadi kesalahan'), 'error');
    }
  });

  // Restore Backup JSON
  const fileInput = document.getElementById('restore-file-input');
  document.getElementById('btn-restore-json')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      showToast('Memulihkan data keuangan...', 'info');
      await apiFetch('/api/restore', { method: 'POST', body: { data: json } });
      showToast('Data berhasil dipulihkan! Memperbarui tampilan...', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      showToast('File tidak valid atau gagal dipulihkan: ' + (err.message || 'Format salah'), 'error');
    } finally {
      fileInput.value = '';
    }
  });
}
