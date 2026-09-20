// router.js — highlight nav aktif, offline detection, FAB handler

/**
 * highlightNav()
 * Baca pathname saat ini, tandai nav item yang cocok sebagai aktif.
 * Berlaku untuk bottom nav dan sidebar (keduanya pakai data-nav-path).
 */
function highlightNav() {
  const path = window.location.pathname;

  document.querySelectorAll('[data-nav-path]').forEach((el) => {
    const navPath = el.dataset.navPath;
    // Exact match, atau root '/' dianggap sama dengan '/dashboard'
    const isActive = navPath === path || (path === '/' && navPath === '/dashboard');
    el.classList.toggle('active', isActive);
    if (isActive) {
      el.setAttribute('aria-current', 'page');
    } else {
      el.removeAttribute('aria-current');
    }
  });
}

/**
 * initOfflineDetection()
 * Tampilkan/sembunyikan #offline-banner sesuai status koneksi.
 */
function initOfflineDetection() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;

  function update() {
    if (navigator.onLine) {
      banner.classList.add('hidden');
    } else {
      banner.classList.remove('hidden');
    }
  }

  update(); // cek status awal
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
}

/**
 * initFAB()
 * FAB (+) → navigasi ke /transactions?new=1
 * (transactions.js akan deteksi param ini dan buka form otomatis)
 */
function initFAB() {
  const fab = document.getElementById('fab-add');
  if (!fab) return;

  fab.addEventListener('click', () => {
    window.location.href = '/transactions?new=1';
  });
}

// Jalankan semua saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  highlightNav();
  initOfflineDetection();
  initFAB();
});

// Export untuk dipakai halaman lain jika perlu navigate programatically
export function navigate(path) {
  window.location.href = path;
}
