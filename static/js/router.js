// router.js — highlight nav aktif, offline detection, FAB handler, more drawer

/**
 * highlightNav()
 * Baca pathname saat ini, tandai nav item yang cocok sebagai aktif.
 * Berlaku untuk bottom nav, sidebar, dan more-drawer (keduanya pakai data-nav-path).
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

  // Tandai tombol "Lainnya" aktif jika halaman aktif ada di dalam drawer
  const drawerPaths = ['/budgets', '/recurring-bills', '/categories', '/export', '/settings'];
  const moreBtn = document.getElementById('btn-more-nav');
  if (moreBtn) {
    const isMoreActive = drawerPaths.includes(path);
    moreBtn.classList.toggle('active', isMoreActive);
    if (isMoreActive) {
      moreBtn.setAttribute('aria-current', 'page');
    } else {
      moreBtn.removeAttribute('aria-current');
    }
  }
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

/**
 * initMoreDrawer()
 * Tombol "Lainnya" di bottom nav membuka bottom sheet drawer berisi
 * semua halaman yang tidak muat di nav bar.
 */
function initMoreDrawer() {
  const btn     = document.getElementById('btn-more-nav');
  const drawer  = document.getElementById('more-drawer');
  const overlay = document.getElementById('more-drawer-overlay');
  const close   = document.getElementById('more-drawer-close');

  if (!btn || !drawer || !overlay) return;

  let isOpen = false;

  function openDrawer() {
    isOpen = true;
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    overlay.removeAttribute('aria-hidden');
    btn.setAttribute('aria-expanded', 'true');
    // Re-render lucide icons di dalam drawer
    if (globalThis.lucide?.createIcons) {
      globalThis.lucide.createIcons({ nodes: drawer.querySelectorAll('[data-lucide]') });
    }
    // Fokus ke close button untuk aksesibilitas
    setTimeout(() => close?.focus(), 50);
  }

  function closeDrawer() {
    isOpen = false;
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.focus(); // kembalikan fokus ke trigger
  }

  btn.addEventListener('click', () => {
    if (isOpen) closeDrawer(); else openDrawer();
  });

  overlay.addEventListener('click', closeDrawer);
  close?.addEventListener('click', closeDrawer);

  // Tutup dengan Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeDrawer();
  });

  // Touch drag-to-dismiss
  let startY = 0;
  drawer.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });
  drawer.addEventListener('touchend', (e) => {
    const delta = e.changedTouches[0].clientY - startY;
    if (delta > 80) closeDrawer();
  }, { passive: true });
}

// Jalankan semua saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  highlightNav();
  initOfflineDetection();
  initFAB();
  initMoreDrawer();
});

// Export untuk dipakai halaman lain jika perlu navigate programatically
export function navigate(path) {
  window.location.href = path;
}
