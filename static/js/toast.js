// toast.js — menampilkan notifikasi sementara (sukses, error, warning, info)

const VARIANTS = {
  success: {
    bg:     'var(--color-success-50)',
    border: 'var(--color-success-500)',
    color:  'var(--color-success-700)',
    icon:   '✓',
  },
  error: {
    bg:     'var(--color-danger-50)',
    border: 'var(--color-danger-500)',
    color:  'var(--color-danger-700)',
    icon:   '✕',
  },
  warning: {
    bg:     'var(--color-warning-50)',
    border: 'var(--color-warning-500)',
    color:  'var(--color-warning-700)',
    icon:   '⚠',
  },
  info: {
    bg:     'var(--color-info-50)',
    border: 'var(--color-info-500)',
    color:  'var(--color-info-700)',
    icon:   'ℹ',
  },
};

const MAX_TOASTS = 3;

/**
 * showToast(message, variant, duration)
 * Inject elemen toast ke #toast-container yang sudah ada di base.html.
 *
 * @param {string} message   - Teks pesan yang ditampilkan
 * @param {string} variant   - 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration  - Milidetik sebelum auto-dismiss (default 3000)
 */
export function showToast(message, variant = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const v = VARIANTS[variant] ?? VARIANTS.info;

  // Batasi maksimal 3 toast — hapus yang paling lama
  const existing = container.querySelectorAll('.toast');
  if (existing.length >= MAX_TOASTS) {
    existing[0].remove();
  }

  // Buat elemen toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText = `
    background: ${v.bg};
    border-left-color: ${v.border};
    color: ${v.color};
  `;
  toast.innerHTML = `
    <span style="font-weight:600;margin-right:var(--space-2)">${v.icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Animasi masuk — requestAnimationFrame untuk memastikan transisi berjalan
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-enter'));
  });

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);

  // Klik untuk dismiss lebih cepat
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    dismissToast(toast);
  });
}

function dismissToast(toast) {
  toast.classList.remove('toast-enter');
  toast.classList.add('toast-exit');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}
