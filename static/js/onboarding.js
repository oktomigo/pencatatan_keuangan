// onboarding.js — slide behavior, swipe gesture, cek status onboarding

export function init() {
  // Jika sudah pernah onboarding, langsung ke dashboard
  if (localStorage.getItem('onboarded')) {
    window.location.href = '/dashboard';
    return;
  }

  // ── State ──────────────────────────────────────────────────
  let currentSlide = 0;
  const totalSlides = 3;

  // ── Data slide ─────────────────────────────────────────────
  const slides = [
    {
      icon: `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="40" fill="var(--color-primary-50)"/>
        <rect x="18" y="28" width="44" height="28" rx="4" fill="var(--color-primary-500)" opacity=".15"/>
        <rect x="18" y="28" width="44" height="28" rx="4" stroke="var(--color-primary-500)" stroke-width="2.5"/>
        <circle cx="28" cy="42" r="5" fill="var(--color-primary-500)"/>
        <rect x="36" y="38" width="18" height="3" rx="1.5" fill="var(--color-primary-400)"/>
        <rect x="36" y="44" width="12" height="3" rx="1.5" fill="var(--color-primary-300)"/>
        <rect x="30" y="22" width="20" height="8" rx="4" fill="var(--color-primary-500)"/>
      </svg>`,
      heading: 'Catat Pemasukan & Pengeluaran',
      sub:     'Catat setiap transaksi harian dalam hitungan detik',
    },
    {
      icon: `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="40" fill="var(--color-primary-50)"/>
        <rect x="16" y="52" width="10" height="16" rx="2" fill="var(--color-primary-300)"/>
        <rect x="30" y="42" width="10" height="26" rx="2" fill="var(--color-primary-400)"/>
        <rect x="44" y="32" width="10" height="36" rx="2" fill="var(--color-primary-500)"/>
        <rect x="58" y="24" width="10" height="44" rx="2" fill="var(--color-primary-600)"/>
        <path d="M18 38 L32 30 L46 22 L60 16" stroke="var(--color-warning-500)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="18" cy="38" r="3" fill="var(--color-warning-500)"/>
        <circle cx="60" cy="16" r="3" fill="var(--color-warning-500)"/>
      </svg>`,
      heading: 'Atur Anggaran & Pantau Tagihan',
      sub:     'Tetap dalam batas pengeluaran, tidak ada tagihan terlupa',
    },
    {
      icon: `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="40" fill="var(--color-primary-50)"/>
        <path d="M40 16 L58 24 L58 44 C58 54 40 64 40 64 C40 64 22 54 22 44 L22 24 Z"
              fill="var(--color-primary-100)" stroke="var(--color-primary-500)" stroke-width="2.5"/>
        <path d="M32 40 L38 46 L50 34" stroke="var(--color-primary-600)" stroke-width="3"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      heading: 'Data Aman di Perangkat Ini',
      sub:     'Tanpa daftar, tanpa akun — langsung mulai pakai',
    },
  ];

  // ── Render HTML ke #onboarding-container ───────────────────
  const container = document.getElementById('onboarding-container');
  if (!container) return;

  container.innerHTML = `
    <div id="onboarding-wrap" style="
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--color-surface-base);
      overflow: hidden;
    ">
      <!-- Tombol Skip -->
      <button id="btn-skip" style="
        position: absolute;
        top: var(--space-5);
        left: var(--space-5);
        min-height: 44px;
        padding: 0 var(--space-3);
        color: var(--color-text-secondary);
        font-size: var(--text-body-md);
        background: none;
        border: none;
        cursor: pointer;
        z-index: 10;
      ">Lewati</button>

      <!-- Slides -->
      <div id="slides-viewport" style="
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-16) var(--space-6) var(--space-6);
        overflow: hidden;
      ">
        <div id="slides-track" style="
          display: flex;
          width: ${totalSlides * 100}%;
          transition: transform var(--transition-slow);
        ">
          ${slides.map((s, i) => `
            <div class="slide" style="
              width: ${100 / totalSlides}%;
              flex-shrink: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              padding: 0 var(--space-6);
              gap: var(--space-6);
            ">
              <div>${s.icon}</div>
              <div>
                <h1 style="
                  font-size: var(--text-heading-1);
                  font-weight: 700;
                  color: var(--color-text-primary);
                  margin-bottom: var(--space-3);
                ">${s.heading}</h1>
                <p style="
                  font-size: var(--text-body-lg);
                  color: var(--color-text-secondary);
                  line-height: 1.6;
                  max-width: 320px;
                ">${s.sub}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Footer: dots + tombol -->
      <div style="
        padding: var(--space-6);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-5);
      ">
        <!-- Dots indicator -->
        <div id="dots-container" style="display:flex;gap:var(--space-2);">
          ${slides.map((_, i) => `
            <span class="dot" data-index="${i}" style="
              width: 8px; height: 8px;
              border-radius: var(--rounded-full);
              background: ${i === 0 ? 'var(--color-primary-500)' : 'var(--color-border-medium)'};
              transition: background var(--transition-normal), width var(--transition-normal);
              display: inline-block;
            "></span>
          `).join('')}
        </div>

        <!-- Tombol Lanjut / Mulai Pakai -->
        <button id="btn-next" style="
          min-height: 44px;
          width: 100%;
          max-width: 320px;
          background: var(--color-primary-500);
          color: var(--color-text-inverse);
          font-size: var(--text-body-lg);
          font-weight: 600;
          border-radius: var(--rounded-md);
          border: none;
          cursor: pointer;
          transition: background var(--transition-fast);
        ">Lanjut</button>
      </div>
    </div>
  `;

  // ── Fungsi: tampilkan slide ke-index ───────────────────────
  function showSlide(index) {
    currentSlide = Math.max(0, Math.min(index, totalSlides - 1));

    // Geser track
    const track = document.getElementById('slides-track');
    track.style.transform = `translateX(-${currentSlide * (100 / totalSlides)}%)`;

    // Update dots
    document.querySelectorAll('.dot').forEach((dot, i) => {
      dot.style.background = i === currentSlide
        ? 'var(--color-primary-500)'
        : 'var(--color-border-medium)';
    });

    // Update teks tombol
    const btnNext = document.getElementById('btn-next');
    btnNext.textContent = currentSlide === totalSlides - 1 ? 'Mulai Pakai' : 'Lanjut';
  }

  // ── Events ─────────────────────────────────────────────────
  document.getElementById('btn-skip').addEventListener('click', () => {
    window.location.href = '/dashboard';
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    if (currentSlide < totalSlides - 1) {
      showSlide(currentSlide + 1);
    } else {
      // Selesai onboarding
      localStorage.setItem('onboarded', 'true');
      window.location.href = '/dashboard';
    }
  });

  // ── Swipe gesture (mobile) ─────────────────────────────────
  let touchStartX = 0;
  const viewport = document.getElementById('slides-viewport');

  viewport.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  viewport.addEventListener('touchend', (e) => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) < 50) return; // minimal 50px
    if (delta < 0) showSlide(currentSlide + 1); // swipe kiri → slide berikut
    else           showSlide(currentSlide - 1); // swipe kanan → slide sebelum
  });

  // Tampilkan slide pertama
  showSlide(0);
}
