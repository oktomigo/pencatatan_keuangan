// modal.js — openModal, openBottomSheet, openConfirmDialog, closeModal, closeBottomSheet

let activeModal      = null;
let activeSheet      = null;
let lastFocusedEl    = null; // untuk restore fokus saat tutup

/* ============================================================
   FOCUS TRAP
============================================================ */
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  });

  first.focus();
}

/* ============================================================
   OVERLAY HELPER
============================================================ */
function createOverlay(onClick) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: var(--color-surface-overlay);
    z-index: 500;
    opacity: 0;
    transition: opacity var(--transition-slow);
  `;
  if (onClick) overlay.addEventListener('click', onClick);
  return overlay;
}

/* ============================================================
   openModal
============================================================ */
/**
 * @param {object} opts
 * @param {string}   opts.title
 * @param {string}   opts.contentHTML  — markup HTML isi modal
 * @param {'sm'|'md'|'lg'} [opts.size]
 * @param {Function} [opts.onClose]
 */
export function openModal({ title, contentHTML, size = 'md', onClose } = {}) {
  closeModal(); // tutup modal sebelumnya jika ada
  lastFocusedEl = document.activeElement;

  const widths = { sm: '400px', md: '560px', lg: '720px' };

  const overlay = createOverlay(() => closeModal(onClose));
  const panel   = document.createElement('div');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'modal-title');
  panel.style.cssText = `
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) scale(0.95);
    z-index: 501;
    width: min(${widths[size]}, 92vw);
    max-height: 90vh;
    overflow-y: auto;
    background: var(--color-surface-card);
    border-radius: var(--rounded-xl);
    box-shadow: var(--shadow-lg);
    opacity: 0;
    transition: opacity var(--transition-slow), transform var(--transition-slow);
  `;
  panel.innerHTML = `
    <div style="
      display:flex; align-items:center; justify-content:space-between;
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--color-border-light);
    ">
      <h2 id="modal-title" style="font-size:var(--text-heading-2);font-weight:600">
        ${title ?? ''}
      </h2>
      <button id="modal-close-btn"
              aria-label="Tutup"
              style="
                min-height:44px; min-width:44px;
                display:flex; align-items:center; justify-content:center;
                border-radius:var(--rounded-full);
                font-size:1.25rem;
                color:var(--color-text-secondary);
              ">✕</button>
    </div>
    <div style="padding: var(--space-5)">
      ${contentHTML ?? ''}
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  activeModal = { overlay, panel, onClose };

  // Animasi masuk
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      panel.style.opacity   = '1';
      panel.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  });

  // Event tutup
  panel.querySelector('#modal-close-btn').addEventListener('click', () => closeModal(onClose));
  document.addEventListener('keydown', _handleModalEsc);

  trapFocus(panel);
}

function _handleModalEsc(e) {
  if (e.key === 'Escape') closeModal();
}

export function closeModal(onClose) {
  if (!activeModal) return;
  const { overlay, panel, onClose: storedClose } = activeModal;
  const cb = onClose ?? storedClose;

  overlay.style.opacity = '0';
  panel.style.opacity   = '0';
  panel.style.transform = 'translate(-50%, -50%) scale(0.95)';

  setTimeout(() => {
    overlay.remove();
    panel.remove();
    document.removeEventListener('keydown', _handleModalEsc);
    if (lastFocusedEl) lastFocusedEl.focus();
    if (cb) cb();
    activeModal = null;
  }, 300);
}

/* ============================================================
   openBottomSheet
============================================================ */
/**
 * @param {object} opts
 * @param {string}   opts.title
 * @param {string}   opts.contentHTML
 * @param {boolean}  [opts.draggable]
 * @param {Function} [opts.onClose]
 */
export function openBottomSheet({ title, contentHTML, draggable = true, onClose } = {}) {
  closeBottomSheet();
  lastFocusedEl = document.activeElement;

  const overlay = createOverlay(() => closeBottomSheet(onClose));
  const sheet   = document.createElement('div');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'sheet-title');
  sheet.style.cssText = `
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 501;
    max-height: 85vh;
    overflow-y: auto;
    background: var(--color-surface-card);
    border-radius: var(--rounded-xl) var(--rounded-xl) 0 0;
    box-shadow: var(--shadow-lg);
    transform: translateY(100%);
    transition: transform var(--transition-spring);
    padding-bottom: env(safe-area-inset-bottom, 0);
  `;
  sheet.innerHTML = `
    ${draggable ? `
      <div id="sheet-drag-handle"
           style="
             width:32px; height:4px;
             background:var(--color-border-medium);
             border-radius:var(--rounded-full);
             margin: var(--space-3) auto var(--space-1);
           ">
      </div>` : ''}
    <div style="
      display:flex; align-items:center; justify-content:space-between;
      padding: var(--space-3) var(--space-5) var(--space-3);
      border-bottom: 1px solid var(--color-border-light);
    ">
      <h2 id="sheet-title" style="font-size:var(--text-heading-2);font-weight:600">
        ${title ?? ''}
      </h2>
      <button id="sheet-close-btn"
              aria-label="Tutup"
              style="
                min-height:44px; min-width:44px;
                display:flex; align-items:center; justify-content:center;
                border-radius:var(--rounded-full);
                font-size:1.25rem;
                color:var(--color-text-secondary);
              ">✕</button>
    </div>
    <div style="padding: var(--space-5)">
      ${contentHTML ?? ''}
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(sheet);
  activeSheet = { overlay, sheet, onClose };

  // Animasi masuk
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity   = '1';
      sheet.style.transform   = 'translateY(0)';
    });
  });

  sheet.querySelector('#sheet-close-btn').addEventListener('click', () => closeBottomSheet(onClose));
  document.addEventListener('keydown', _handleSheetEsc);

  // Touch drag to dismiss
  if (draggable) {
    const handle = sheet.querySelector('#sheet-drag-handle');
    if (handle) _setupDragDismiss(handle, sheet, onClose);
  }

  trapFocus(sheet);
}

function _handleSheetEsc(e) {
  if (e.key === 'Escape') closeBottomSheet();
}

export function closeBottomSheet(onClose) {
  if (!activeSheet) return;
  const { overlay, sheet, onClose: storedClose } = activeSheet;
  const cb = onClose ?? storedClose;

  overlay.style.opacity  = '0';
  sheet.style.transform  = 'translateY(100%)';

  setTimeout(() => {
    overlay.remove();
    sheet.remove();
    document.removeEventListener('keydown', _handleSheetEsc);
    if (lastFocusedEl) lastFocusedEl.focus();
    if (cb) cb();
    activeSheet = null;
  }, 300);
}

function _setupDragDismiss(handle, sheet, onClose) {
  let startY = 0, currentY = 0, isDragging = false;

  handle.addEventListener('touchstart', (e) => {
    startY    = e.touches[0].clientY;
    isDragging = true;
    sheet.style.transition = 'none';
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const delta = Math.max(0, currentY - startY);
    sheet.style.transform = `translateY(${delta}px)`;
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    sheet.style.transition = '';
    const delta = currentY - startY;
    if (delta > 100) {
      closeBottomSheet(onClose);
    } else {
      sheet.style.transform = 'translateY(0)';
    }
  });
}

/* ============================================================
   openConfirmDialog
============================================================ */
/**
 * @param {object} opts
 * @param {string}   opts.title
 * @param {string}   opts.message
 * @param {'danger'|'warning'|'info'} [opts.variant]
 * @param {string}   [opts.confirmLabel]
 * @param {string}   [opts.cancelLabel]
 * @param {Function} [opts.onConfirm]
 * @param {Function} [opts.onCancel]
 */
export function openConfirmDialog({
  title         = 'Konfirmasi',
  message       = '',
  variant       = 'danger',
  confirmLabel  = 'Konfirmasi',
  cancelLabel   = 'Batal',
  onConfirm,
  onCancel,
} = {}) {
  const confirmColor = {
    danger:  'var(--color-danger-500)',
    warning: 'var(--color-warning-500)',
    info:    'var(--color-info-500)',
  }[variant] ?? 'var(--color-danger-500)';

  const contentHTML = `
    <p style="color:var(--color-text-secondary);font-size:var(--text-body-lg);margin-bottom:var(--space-6)">
      ${message}
    </p>
    <div style="display:flex;gap:var(--space-3);justify-content:flex-end">
      <button id="confirm-cancel-btn"
              style="
                min-height:44px; padding:0 var(--space-5);
                border:1px solid var(--color-border-medium);
                border-radius:var(--rounded-md);
                font-size:var(--text-body-md);
                color:var(--color-text-secondary);
                background:transparent;
              ">${cancelLabel}</button>
      <button id="confirm-ok-btn"
              style="
                min-height:44px; padding:0 var(--space-5);
                border-radius:var(--rounded-md);
                font-size:var(--text-body-md);
                font-weight:600;
                background:${confirmColor};
                color:#fff;
              ">${confirmLabel}</button>
    </div>
  `;

  // Gunakan openModal tapi dengan role alertdialog dan tidak bisa close overlay
  closeModal();
  lastFocusedEl = document.activeElement;

  const overlay = createOverlay(null); // null = tidak bisa tutup lewat overlay
  const panel   = document.createElement('div');
  panel.setAttribute('role', 'alertdialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'confirm-title');
  panel.setAttribute('aria-describedby', 'confirm-desc');
  panel.style.cssText = `
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) scale(0.95);
    z-index: 502;
    width: min(400px, 92vw);
    background: var(--color-surface-card);
    border-radius: var(--rounded-xl);
    box-shadow: var(--shadow-lg);
    opacity: 0;
    transition: opacity var(--transition-slow), transform var(--transition-slow);
    padding: var(--space-6);
  `;
  panel.innerHTML = `
    <h2 id="confirm-title" style="font-size:var(--text-heading-2);font-weight:700;margin-bottom:var(--space-3)">
      ${title}
    </h2>
    ${contentHTML}
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  activeModal = { overlay, panel, onClose: onCancel };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      panel.style.opacity   = '1';
      panel.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  });

  // Fokus awal pada Cancel
  const cancelBtn  = panel.querySelector('#confirm-cancel-btn');
  const confirmBtn = panel.querySelector('#confirm-ok-btn');

  cancelBtn.focus();

  cancelBtn.addEventListener('click', () => {
    closeModal();
    if (onCancel) onCancel();
  });
  confirmBtn.addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });

  trapFocus(panel);
}
