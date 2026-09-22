# Design Document — Pencatatan Keuangan Harian

## Overview

Dokumen ini mendefinisikan arsitektur UI/UX, komponen, alur pengguna, dan spesifikasi teknis untuk aplikasi pencatatan keuangan harian berbasis PWA. Aplikasi ini dirancang secara khusus untuk anak kos dengan budget terbatas dan individu/keluarga yang kesulitan mengatur keuangan. Data sepenuhnya bersifat lokal (IndexedDB), tanpa login, dan berjalan offline-first.

---

## 1. Design Principles

### Prinsip 1: Satu Tindakan, Satu Langkah (*Single-Action Immediacy*)

Pengguna anak kos mencatat transaksi di kondisi nyata: baru selesai bayar warung, lagi di angkot, atau di kasir minimarket. Mereka tidak punya waktu untuk navigasi berlapis. Setiap aksi utama — catat transaksi, cek saldo, lihat tagihan — harus bisa diselesaikan dalam ≤ 2 tap dari halaman mana pun. Form tidak boleh memiliki lebih dari 5 field yang ditampilkan sekaligus tanpa progressive disclosure.

**Implikasi teknis:** FAB (Floating Action Button) selalu terlihat untuk catat transaksi baru. Bottom sheet digunakan alih-alih full-page navigation untuk aksi sekunder. Default values cerdas (tanggal = hari ini, jenis = pengeluaran) mengurangi input yang diperlukan.

### Prinsip 2: Angka Harus Berbicara (*Numbers Must Tell a Story*)

Data keuangan yang hanya berupa angka mentah tidak membantu pengguna yang belum terbiasa mengatur keuangan. Setiap angka harus memiliki konteks visual: progress bar, warna indikator, perbandingan dengan periode lalu, atau tanda arah (naik/turun). Pengguna keluarga yang awam keuangan harus bisa mengerti kondisi keuangannya dalam 5 detik pertama membuka dashboard.

**Implikasi teknis:** Warna semantik (hijau/kuning/merah) dipakai konsisten di seluruh app, bukan hanya di anggaran. Angka selalu disertai label konteks. Grafik lebih dominan dari tabel di layar laporan.

### Prinsip 3: Aman Meski Tidak Punya Cloud (*Locally Trustworthy*)

Karena semua data ada di device dan tidak bisa dipulihkan dari server, pengguna harus selalu merasa datanya aman. Setiap aksi destruktif (hapus transaksi, hapus kategori, hapus target) harus melalui konfirmasi eksplisit. Status storage harus terlihat. Peringatan risiko kehilangan data (cache clear, ganti browser) harus muncul pada momen yang tepat tanpa mengganggu alur normal.

**Implikasi teknis:** Semua delete flow wajib pakai confirmation dialog. Storage usage indicator di settings. Export data mudah dijangkau dari dashboard dan settings.

---

## 2. Visual Direction

### Mood dan Feel

Bukan "clean and modern" — melainkan **"trusted notebook"**: terasa seperti buku catatan keuangan fisik yang sudah didigitalkan dengan baik. Hangat tapi serius. Memberi rasa kontrol, bukan kecemasan. Pengguna yang buka app di tengah malam untuk ngecek saldo harus merasa tenang, bukan anxious dengan interface yang terlalu sterile atau terlalu playful.

Referensi spesifik:
- **Money Manager (iOS)** — kejelasan hierarki angka dan color-coding yang tegas
- **Spendee** — card-based layout yang nyaman di thumb zone
- **Notion** — typographic hierarchy yang bersih dengan whitespace memadai
- **Buku Warung** — familiaritas lokal Indonesia, input yang cepat dan tanpa hambatan

### Yang Dihindari

| Yang Dihindari | Alasan |
|---|---|
| Gradien biru-ungu generik fintech | Terasa impersonal, terlalu enterprise, tidak cocok untuk budget app |
| Dark mode as default | Target pengguna sering pakai di luar ruangan / siang hari; light mode lebih mudah dibaca |
| Ilustrasi 3D / karakter | Menambah berat halaman, tidak menambah nilai fungsional |
| Animasi loading yang panjang | Pengguna butuh data cepat, animasi > 300ms adalah hambatan |
| Typography all-caps di body | Sulit dibaca untuk teks panjang, terutama di angka |
| Warna pastel terlalu soft | Angka keuangan butuh kontras yang cukup untuk dibaca dengan cepat |

---

## 3. Design Tokens

### 3.1 Warna

Palet dipilih berdasarkan prinsip: hijau untuk kondisi baik (uang masuk, anggaran aman), merah untuk bahaya (anggaran terlampaui, deficit), kuning untuk peringatan (hampir habis), dengan primary biru-teal yang netral namun tidak dingin — cocok untuk aplikasi keuangan yang perlu terasa terpercaya tanpa kesan bank korporat yang intimidatif.

#### Brand Colors

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-primary-50` | `#E8F5F3` | Background tint ringan |
| `--color-primary-100` | `#C5E8E2` | Hover state ringan |
| `--color-primary-200` | `#9DD5CB` | Disabled active state |
| `--color-primary-300` | `#6EBFB3` | Secondary elements |
| `--color-primary-400` | `#3DA897` | Icon tint |
| `--color-primary-500` | `#0D9488` | **Primary brand color** — CTA utama, link aktif |
| `--color-primary-600` | `#0A7D74` | Hover state primary |
| `--color-primary-700` | `#076860` | Active/pressed state |
| `--color-primary-800` | `#055249` | Dark emphasis |
| `--color-primary-900` | `#023D37` | Darkest tint |

#### Semantic Colors

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-success-50` | `#F0FDF4` | Background success ringan |
| `--color-success-500` | `#22C55E` | Anggaran aman (<80%), pemasukan, konfirmasi berhasil |
| `--color-success-600` | `#16A34A` | Hover success |
| `--color-success-700` | `#15803D` | Text success di light bg |
| `--color-warning-50` | `#FFFBEB` | Background warning ringan |
| `--color-warning-400` | `#FBBF24` | Anggaran mendekati batas (80–99%) |
| `--color-warning-500` | `#F59E0B` | Warning default |
| `--color-warning-700` | `#B45309` | Text warning di light bg |
| `--color-danger-50` | `#FEF2F2` | Background danger ringan |
| `--color-danger-500` | `#EF4444` | Anggaran terlampaui (≥100%), pengeluaran, error, hapus |
| `--color-danger-600` | `#DC2626` | Hover danger |
| `--color-danger-700` | `#B91C1C` | Text danger di light bg |
| `--color-info-50` | `#EFF6FF` | Background info ringan |
| `--color-info-500` | `#3B82F6` | Informasi netral, tagihan berulang |
| `--color-info-600` | `#2563EB` | Hover info |
| `--color-info-700` | `#1D4ED8` | Text info di light bg |

#### Surface & Background

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-surface-base` | `#FAFAF9` | Background aplikasi utama |
| `--color-surface-card` | `#FFFFFF` | Background card/panel |
| `--color-surface-raised` | `#F5F5F4` | Background section elevated |
| `--color-surface-overlay` | `rgba(0,0,0,0.5)` | Modal overlay |
| `--color-surface-nav` | `#FFFFFF` | Bottom nav / sidebar |

#### Text Hierarchy

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-text-primary` | `#1C1917` | Heading utama, label penting |
| `--color-text-secondary` | `#57534E` | Subheading, label sekunder |
| `--color-text-tertiary` | `#A8A29E` | Placeholder, caption, disabled |
| `--color-text-inverse` | `#FFFFFF` | Teks di atas background gelap |
| `--color-text-link` | `#0D9488` | Link aktif |
| `--color-text-income` | `#16A34A` | Teks nominal pemasukan |
| `--color-text-expense` | `#DC2626` | Teks nominal pengeluaran |

#### Border

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-border-light` | `#E7E5E4` | Border default card, input |
| `--color-border-medium` | `#D6D3D1` | Border divider, separator |
| `--color-border-focus` | `#0D9488` | Focus ring input |
| `--color-border-error` | `#EF4444` | Input error state |

---

### 3.2 Tipografi

**Font Stack:** `'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`

**Alasan pemilihan:**
- **Plus Jakarta Sans** — font Indonesia-friendly yang dibuat dengan mempertimbangkan keterbacaan pada layar kecil. Karakter angka yang jelas dan tegas sangat penting untuk aplikasi keuangan. Tersedia gratis di Google Fonts.
- **Inter** sebagai fallback — dioptimalkan untuk layar digital, angka tabular dengan `font-variant-numeric: tabular-nums` untuk alignment kolom nominal.
- Kedua font memiliki weight 400–700 yang cukup untuk hierarchy tanpa perlu font tambahan.

**Font untuk angka:** `font-variant-numeric: tabular-nums` diaktifkan di semua elemen yang menampilkan angka keuangan agar alignment kolom selalu rapi.

#### Type Scale

| Token | Size | Line Height | Weight | Penggunaan |
|---|---|---|---|---|
| `--text-display` | `2rem / 32px` | `1.25` | `700` | Saldo utama di dashboard |
| `--text-heading-1` | `1.5rem / 24px` | `1.33` | `700` | Judul halaman |
| `--text-heading-2` | `1.25rem / 20px` | `1.4` | `600` | Judul section, card header |
| `--text-heading-3` | `1.125rem / 18px` | `1.44` | `600` | Subheading |
| `--text-body-lg` | `1rem / 16px` | `1.5` | `400` | Body text utama |
| `--text-body-md` | `0.875rem / 14px` | `1.57` | `400` | Body text sekunder, label |
| `--text-caption` | `0.75rem / 12px` | `1.5` | `400` | Caption, timestamp, hint |
| `--text-label-sm` | `0.6875rem / 11px` | `1.45` | `500` | Badge, chip label |
| `--text-number-lg` | `1.75rem / 28px` | `1.2` | `700` | Angka nominal besar di card |
| `--text-number-md` | `1.25rem / 20px` | `1.3` | `600` | Angka nominal medium |

---

### 3.3 Spacing Scale

Base unit: **4px**

| Token | Value | Penggunaan |
|---|---|---|
| `--space-1` | `4px` | Micro spacing, icon gap |
| `--space-2` | `8px` | Inner padding kecil, gap antar icon-text |
| `--space-3` | `12px` | Padding input, gap antar item kecil |
| `--space-4` | `16px` | Padding card, gap antar elemen |
| `--space-5` | `20px` | Padding section, gap medium |
| `--space-6` | `24px` | Padding page, gap besar |
| `--space-7` | `28px` | Margin section |
| `--space-8` | `32px` | Padding besar |
| `--space-9` | `36px` | Gap antar card di grid |
| `--space-10` | `40px` | Margin vertikal besar |
| `--space-11` | `44px` | Minimum touch target height |
| `--space-12` | `48px` | Bottom nav height, FAB size |
| `--space-16` | `64px` | Hero section padding |
| `--space-20` | `80px` | Bottom padding di atas nav bar |

---

### 3.4 Border Radius

| Token | Value | Penggunaan |
|---|---|---|
| `--rounded-sm` | `4px` | Badge, chip, tooltip |
| `--rounded-md` | `8px` | Input field, button |
| `--rounded-lg` | `12px` | Card, panel |
| `--rounded-xl` | `16px` | Bottom sheet, modal |
| `--rounded-2xl` | `20px` | Large card, illustration container |
| `--rounded-full` | `9999px` | Avatar, FAB, pill badge |

---

### 3.5 Shadow

| Token | Value | Penggunaan |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Input field, chip |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | Card default |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | Bottom sheet, modal |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` | Floating elements |
| `--shadow-inner` | `inset 0 2px 4px rgba(0,0,0,0.05)` | Input focus, progress bar track |
| `--shadow-nav` | `0 -1px 0 rgba(0,0,0,0.06), 0 -4px 12px rgba(0,0,0,0.08)` | Bottom navigation bar |

---

### 3.6 Transition

| Token | Value | Penggunaan |
|---|---|---|
| `--transition-fast` | `100ms ease` | Button tap feedback |
| `--transition-normal` | `200ms ease` | Hover state, color change |
| `--transition-slow` | `300ms ease-in-out` | Modal open/close, page transition |
| `--transition-spring` | `300ms cubic-bezier(0.34,1.56,0.64,1)` | FAB, bottom sheet spring |

---

## 4. Screen Inventory

| # | Screen Name | Tujuan | Primary Action | Key Components |
|---|---|---|---|---|
| S1 | Dashboard | Ringkasan keuangan sekilas pandang | Catat transaksi baru (FAB) | SaldoCard, TransactionList, BillDueList, BudgetSummary |
| S2 | Transaction Form | Catat / edit transaksi | Simpan transaksi | Form fields, CategoryPicker, DatePicker, ToggleType |
| S3 | Transaction List | Melihat & mencari semua transaksi | Filter / Search | SearchBar, FilterChips, TransactionItem, DateGroupHeader |
| S4 | Transaction Detail | Lihat detail & aksi edit/hapus | Edit transaksi | DetailCard, ActionMenu |
| S5 | Category List | Kelola kategori | Tambah kategori | CategoryItem, AddCategoryButton |
| S6 | Category Form | Buat / edit kategori | Simpan kategori | NameInput, TypeToggle |
| S7 | Budget List | Kelola anggaran per kategori | Set / update budget | BudgetProgressBar, CategoryBudgetItem |
| S8 | Budget Form | Set / edit anggaran satu kategori | Simpan anggaran | AmountInput, PeriodSelector |
| S9 | Report | Laporan & grafik keuangan | Ganti periode | PeriodFilter, DonutChart, BarChart, CategoryBreakdown |
| S10 | Recurring Bill List | Kelola tagihan berulang | Tambah tagihan | BillItem, MarkAsPaidButton |
| S11 | Recurring Bill Form | Buat / edit tagihan berulang | Simpan tagihan | NameInput, AmountInput, FrequencySelector, DatePicker |
| S12 | Savings Goal List | Kelola target tabungan | Tambah target | SavingsCard, ProgressBar |
| S13 | Savings Goal Form | Buat target tabungan | Simpan target | NameInput, TargetAmountInput, DeadlinePicker |
| S14 | Add Funds (Savings) | Tambah dana ke target | Konfirmasi tambah dana | CurrentProgress, AmountInput |
| S15 | Export | Ekspor data keuangan | Ekspor | FormatSelector, PeriodSelector, ExportButton |
| S16 | Settings | Pengaturan app | — | StorageUsage, ExportShortcut, PWAInstall, NotifSettings |
| S17 | Onboarding | Panduan pertama kali buka app | Mulai pakai | OnboardingSlide, SkipButton |

---

## 5. User Flows

### Flow 1: First Visit & Onboarding

```
1. Pengguna membuka app pertama kali
2. App membuat anonymous ID dan menyimpan ke IndexedDB
3. Onboarding screen ditampilkan (3 slide):
   - Slide 1: "Catat pemasukan & pengeluaran setiap hari"
   - Slide 2: "Atur anggaran, pantau tagihan, raih target tabungan"
   - Slide 3: "Data tersimpan aman di perangkat ini"
4. Pengguna bisa skip kapan saja atau swipe ke slide berikutnya
5. Klik "Mulai Pakai" → masuk ke Dashboard
6. Dashboard tampil dalam state kosong dengan empty state guidance
```

### Flow 2: Catat Transaksi Baru

```
1. Dari halaman mana pun, tap FAB (+) di kanan bawah
2. Bottom sheet Transaction Form muncul dengan animasi spring
3. Default: Jenis = Pengeluaran, Tanggal = Hari ini
4. Pengguna mengisi:
   a. Toggle Jenis (Pemasukan / Pengeluaran)
   b. Input Nominal (keyboard numerik otomatis muncul)
   c. Pilih Kategori (bottom sheet kategori)
   d. Tanggal (date picker, default hari ini)
   e. Catatan (opsional, max 255 karakter)
5. Tap "Simpan"
6. Validasi:
   - Jika ada field kosong → tampil error per field inline
   - Jika nominal tidak valid → tampil pesan error nominal
7. Jika valid → simpan ke IndexedDB
8. Bottom sheet tutup
9. Toast "Transaksi berhasil dicatat" muncul 2 detik
10. Dashboard / daftar transaksi diperbarui otomatis
```

### Flow 3: Set Anggaran Kategori

```
1. Tap menu "Anggaran" di bottom navigation
2. Muncul daftar kategori pengeluaran
3. Tap kategori yang ingin diset anggaran
4. Budget Form terbuka (bottom sheet)
5. Input nominal anggaran
6. Pilih periode (Bulanan / Mingguan)
7. Tap "Simpan Anggaran"
8. Sistem menghitung persentase penggunaan saat ini
9. Indikator warna (hijau/kuning/merah) muncul di card kategori
10. Kembali ke Budget List dengan animasi update
```

### Flow 4: Lihat Laporan Bulanan

```
1. Tap menu "Laporan" di bottom navigation
2. Laporan bulan berjalan dimuat otomatis
3. Layout:
   a. Period selector di atas (bulan ini default)
   b. Summary card: total pemasukan, pengeluaran, saldo
   c. Donut chart proporsi pengeluaran per kategori
   d. Bar chart tren harian
   e. Tabel breakdown per kategori (scroll ke bawah)
4. Tap period selector untuk ganti bulan/periode
5. Semua chart dan data refresh < 500ms
6. Jika tidak ada data → tampil empty state "Belum ada transaksi"
```

### Flow 5: Tambah Tagihan Berulang & Mark as Paid

```
1. Tap menu atau akses dari Dashboard (widget tagihan jatuh tempo)
2. Tap (+) di halaman Recurring Bill List
3. Isi form:
   - Nama tagihan (mis. "Kos", "Spotify")
   - Nominal
   - Tanggal jatuh tempo (tanggal dalam bulan)
   - Frekuensi: Bulanan / Mingguan / Tahunan
4. Tap "Simpan" → tersimpan dan terjadwal notifikasi
5. Kembali ke daftar, tagihan muncul

Mark as Paid:
6. Di hari jatuh tempo, notifikasi in-app muncul di dashboard
7. Tap tagihan → opsi "Tandai Sudah Dibayar"
8. Konfirmasi: "Transaksi pengeluaran sebesar Rp X akan otomatis dicatat"
9. Tap "Ya, Catat" → transaksi dibuat otomatis
10. Notifikasi dijadwalkan ulang untuk periode berikutnya
11. Toast "Tagihan berhasil ditandai lunas" muncul
```

### Flow 6: Buat Target Tabungan & Tambah Dana

```
1. Tap menu "Tabungan" di bottom navigation
2. Tap (+) di halaman Savings Goal List
3. Isi form:
   - Nama target (mis. "DP Motor")
   - Nominal target (mis. Rp 5.000.000)
   - Tanggal target (deadline)
4. Tap "Buat Target" → tersimpan, progress 0%
5. Kembali ke daftar

Tambah Dana:
6. Tap target tabungan → muncul detail
7. Tap "Tambah Dana"
8. Input nominal yang ditabung
9. Tap "Simpan"
10. Progress bar update secara animasi
11. Estimasi diperbarui: "Rata-rata butuh Rp X/bulan, sisa Y bulan"
12. Jika 100% → notifikasi "Selamat! Target tercapai!" + badge selesai
```

### Flow 7: Ekspor Data

```
1. Tap menu "Pengaturan" atau akses dari Dashboard widget
2. Tap "Ekspor Data"
3. Export Screen:
   a. Pilih format: Excel (.xlsx) / PDF
   b. Pilih periode: Bulan ini / 3 Bulan / 6 Bulan / Tahun ini / Kustom
   c. Jika kustom → muncul date range picker
4. Tap "Ekspor Sekarang"
5. Loading state: "Sedang menyiapkan file..."
6. Jika tidak ada data → pesan error inline
7. Jika sukses → download otomatis dimulai
8. Toast "File berhasil diunduh" muncul
9. Jika gagal → pesan error + tombol "Coba Lagi"
```

---

## 6. Layout per Screen

### S1: Dashboard

```
┌─────────────────────────────┐
│ Header: "Keuangan Bulan Ini"│ ← text-heading-1, bulan/tahun
├─────────────────────────────┤
│ SaldoCard (full-width)      │ ← angka besar, warna dinamis
│  Saldo: Rp X.XXX.XXX        │
│  ↑ Pemasukan  ↓ Pengeluaran │
├─────────────────────────────┤
│ BudgetSummary (horizontal   │ ← scroll horizontal
│  scroll chips)              │
├─────────────────────────────┤
│ Section: "Tagihan Jatuh     │
│ Tempo" (collapsible)        │ ← hanya muncul jika ada tagihan
│  [BillDueItem] [BillDueItem]│
├─────────────────────────────┤
│ Section: "Transaksi Terbaru"│
│  [TransactionItem x5]       │
│  [Lihat Semua →]            │
├─────────────────────────────┤
│ Bottom Navigation Bar       │
└─────────────────────────────┘
        [FAB +] (fixed, bottom-right, above nav)
```

- **Grid:** single-column, padding horizontal `--space-4`
- **SaldoCard:** full-width, rounded-xl, shadow-md, primary brand bg
- **BudgetSummary:** horizontal scroll, chip dengan warna status
- **FAB:** position fixed, `--space-4` dari kanan, `--space-20` dari bawah

### S2: Transaction Form (Bottom Sheet)

```
┌─────────────────────────────┐
│ ─── drag handle ───         │
│ "Catat Transaksi"  [✕]      │
├─────────────────────────────┤
│ Toggle: [Pengeluaran|Pemasukan] ← full-width segmented
├─────────────────────────────┤
│ Nominal Input               │ ← number, large font, autofocus
│ Kategori Picker             │ ← opens nested bottom sheet
│ Tanggal Input               │ ← date picker
│ Catatan (optional)          │ ← textarea, max 255
├─────────────────────────────┤
│ [Simpan Transaksi]          │ ← primary button, full-width
└─────────────────────────────┘
```

- **Layout:** Bottom sheet 80vh, drag to dismiss
- **Keyboard:** Numeric keyboard untuk nominal
- **Autofocus:** Nominal field aktif saat sheet buka

### S9: Report

```
┌─────────────────────────────┐
│ Header: "Laporan"           │
│ PeriodSelector (tabbed)     │ ← Bulan Ini / Bulan lalu / Kustom
├─────────────────────────────┤
│ SummaryCard                 │ ← 3 kolom: income/expense/balance
├─────────────────────────────┤
│ DonutChart + Legend         │ ← Chart_Engine, proporsi kategori
├─────────────────────────────┤
│ BarChart (income vs expense)│ ← tren harian dalam periode
├─────────────────────────────┤
│ CategoryBreakdown Table     │ ← collapsible rows
└─────────────────────────────┘
```

### S12: Savings Goal List

```
┌─────────────────────────────┐
│ Header: "Target Tabungan"   │
│ Total Terkumpul Summary     │
├─────────────────────────────┤
│ [SavingsCard]               │ ← progress bar + estimasi
│ [SavingsCard]               │
│ ...                         │
├─────────────────────────────┤
│ [+ Tambah Target] (sticky)  │
└─────────────────────────────┘
```

---

## 7. Component Library

### Button

**Variants:** `primary` | `secondary` | `ghost` | `danger` | `icon`

**States:** `default` | `hover` | `active` | `disabled` | `loading`

**Props:**

| Prop | Type | Default |
|---|---|---|
| `variant` | string | `primary` |
| `size` | `sm` \| `md` \| `lg` | `md` |
| `loading` | boolean | `false` |
| `disabled` | boolean | `false` |
| `fullWidth` | boolean | `false` |
| `leftIcon` | ReactNode | — |
| `rightIcon` | ReactNode | — |

**Specs:**
- `sm`: h-8, px-3, text-body-md
- `md`: h-11 (44px min), px-4, text-body-lg
- `lg`: h-12, px-6, text-heading-3
- Loading: spinner menggantikan icon kiri, text tetap, disabled otomatis
- Touch target minimum 44x44px (padding diperbesar jika diperlukan)

---

### Input

**Variants:** `text` | `number` | `date` | `textarea`

**States:** `default` | `focus` | `error` | `disabled` | `filled`

**Props:**

| Prop | Type | Default |
|---|---|---|
| `type` | string | `text` |
| `label` | string | — |
| `placeholder` | string | — |
| `error` | string | — |
| `hint` | string | — |
| `required` | boolean | `false` |
| `maxLength` | number | — |
| `prefix` | string/ReactNode | — |
| `suffix` | string/ReactNode | — |

**Specs:**
- Border: 1px `--color-border-light`, radius `--rounded-md`
- Focus ring: 2px `--color-border-focus`, outline-offset 1px
- Error state: border `--color-border-error`, error text merah di bawah
- Number input: `font-variant-numeric: tabular-nums`
- Prefix "Rp" untuk semua input nominal

---

### Select / Dropdown

**Variants:** `select` | `combobox`

**States:** `default` | `open` | `selected` | `disabled` | `error`

**Props:**

| Prop | Type |
|---|---|
| `options` | `{label, value, icon?}[]` |
| `value` | string |
| `onChange` | function |
| `placeholder` | string |
| `searchable` | boolean |
| `error` | string |

---

### Toggle / Segmented Control

**Variants:** `toggle` (2 pilihan) | `segmented` (2-4 pilihan)

**Props:**

| Prop | Type |
|---|---|
| `options` | `{label, value}[]` |
| `value` | string |
| `onChange` | function |
| `fullWidth` | boolean |

**Specs:**
- Segmented control digunakan untuk Pemasukan/Pengeluaran di form transaksi
- Active segment: background `--color-primary-500`, text putih
- Inactive: background `--color-surface-raised`, text `--color-text-secondary`

---

### Card

**Variants:** `default` | `flat` | `elevated` | `interactive`

**Props:**

| Prop | Type |
|---|---|
| `variant` | string |
| `padding` | string |
| `onClick` | function |
| `as` | string/component |

**Specs:**
- Default: bg `--color-surface-card`, border `--color-border-light`, radius `--rounded-lg`, shadow-md
- Interactive: hover shadow-lg, cursor pointer, transition-normal
- Flat: no shadow, hanya border

---

### TransactionItem

**Props:**

| Prop | Type |
|---|---|
| `id` | string |
| `type` | `income` \| `expense` |
| `amount` | number |
| `category` | string |
| `categoryIcon` | string |
| `date` | Date |
| `note` | string |
| `onClick` | function |

**Layout:**
```
[icon kategori] [nama kategori]     [+/- nominal]
                [catatan/tanggal]
```
- Nominal pemasukan: `--color-text-income`, prefix "+"
- Nominal pengeluaran: `--color-text-expense`, prefix "-"
- Tap anywhere → buka detail/edit

---

### BudgetProgressBar

**Props:**

| Prop | Type |
|---|---|
| `category` | string |
| `spent` | number |
| `budget` | number |
| `period` | string |
| `status` | `safe` \| `warning` \| `danger` |

**Specs:**
- Track: rounded-full, height 8px, bg `--color-surface-raised`
- Fill: rounded-full, warna sesuai status (green/yellow/red)
- Label: "Rp X dari Rp Y (Z%)"
- Jika tidak ada budget: kategori ditampilkan tanpa progress bar

---

### SavingsProgressCard

**Props:**

| Prop | Type |
|---|---|
| `name` | string |
| `targetAmount` | number |
| `savedAmount` | number |
| `deadline` | Date |
| `status` | `active` \| `completed` \| `overdue` |

**Specs:**
- Progress bar penuh lebar card
- Warna sesuai status: active=primary, completed=success, overdue=danger
- Estimasi: "Butuh Rp X/bulan" atau "Target tercapai!" atau "Target terlewat"

---

### Chart Container

**Props:**

| Prop | Type |
|---|---|
| `type` | `donut` \| `bar` |
| `data` | ChartData |
| `period` | string |
| `loading` | boolean |
| `empty` | boolean |

**Specs:**
- Loading: skeleton dengan shimmer animation
- Empty: pesan di tengah chart area, no blank chart
- Responsive: menggunakan `ResizeObserver` untuk re-render saat ukuran berubah
- Library: Chart.js (ringan, support touch, no SSR issues)

---

### Modal / Bottom Sheet

**Variants:** `modal` (desktop/tablet) | `bottom-sheet` (mobile)

**Props:**

| Prop | Type |
|---|---|
| `isOpen` | boolean |
| `onClose` | function |
| `title` | string |
| `size` | `sm` \| `md` \| `lg` \| `full` |
| `draggable` | boolean |

**Specs:**
- Bottom sheet: drag handle di atas, `--rounded-xl` radius atas, animasi spring
- Modal: centered, overlay blur ringan, close on overlay click / ESC
- `full`: fullscreen mode untuk form kompleks di mobile

---

### Toast / Notification Banner

**Variants:** `success` | `error` | `warning` | `info`

**Props:**

| Prop | Type | Default |
|---|---|---|
| `message` | string | — |
| `variant` | string | `info` |
| `duration` | number | `3000` ms |
| `action` | `{label, onClick}` | — |

**Specs:**
- Posisi: top-center di mobile, bottom-right di desktop
- Auto-dismiss setelah duration
- Stack jika ada multiple toast
- Tidak memblokir interaksi user

---

### Empty State

**Props:**

| Prop | Type |
|---|---|
| `icon` | string/ReactNode |
| `title` | string |
| `description` | string |
| `action` | `{label, onClick}` |

**Template per screen:**
- Dashboard kosong: "Belum ada transaksi. Yuk mulai catat!" + tombol Catat
- Budget kosong: "Belum ada anggaran. Set batas pengeluaran!" + tombol Set
- Tabungan kosong: "Belum ada target. Mulai rencanakan tabungan!" + tombol Tambah
- Laporan kosong: "Tidak ada transaksi di periode ini"

---

### Loading Skeleton

**Variants:** `card` | `list-item` | `chart` | `text`

**Specs:**
- Animasi shimmer: gradient bergerak kiri-ke-kanan, 1.5s loop
- Warna: `--color-surface-raised` dengan highlight `rgba(255,255,255,0.6)`
- Setiap skeleton harus mereplikasi layout konten aslinya

---

### Confirmation Dialog

**Props:**

| Prop | Type |
|---|---|
| `title` | string |
| `message` | string |
| `confirmLabel` | string |
| `cancelLabel` | string |
| `variant` | `danger` \| `warning` \| `info` |
| `onConfirm` | function |
| `onCancel` | function |

**Specs:**
- Selalu modal/bottom-sheet, tidak bisa close dengan overlay click
- Confirm button: merah untuk variant `danger`
- Cancel button: ghost style
- Fokus awal pada Cancel button (mencegah accidental confirm)

---

### Navigation Bar

**Mobile (Bottom Navigation):**

| Tab | Icon | Label |
|---|---|---|
| Dashboard | `home` | Beranda |
| Transaksi | `list` | Transaksi |
| Laporan | `chart-bar` | Laporan |
| Tabungan | `piggy-bank` | Tabungan |
| Lainnya | `menu` | Lainnya |

**Specs:**
- Height: 64px (dengan safe-area-inset-bottom untuk iOS)
- Active state: icon + label berwarna primary, indicator dot
- FAB (+) di tengah atau kanan-bawah (di luar nav)

**Desktop (Sidebar Navigation):**
- Lebar: 240px, fixed left
- Item: icon + label, active bg `--color-primary-50`
- Collapsible menjadi icon-only di lebar < 1200px

---

### Badge / Chip

**Variants:** `badge` (notification count) | `chip` (filter/tag) | `status` (state indicator)

**Props:**

| Prop | Type |
|---|---|
| `label` | string |
| `variant` | `default` \| `success` \| `warning` \| `danger` \| `info` |
| `size` | `sm` \| `md` |
| `removable` | boolean |

---

### Avatar / Icon Button

**Variants:** `icon-button` | `category-icon`

**Specs:**
- Icon Button: min 44x44px touch target, radius `--rounded-full`
- Category Icon: 40px circle dengan warna kategori, ikon emoji/SVG di tengah

---

## 8. States per Screen

### S1: Dashboard

| State | Deskripsi | Visual |
|---|---|---|
| **Empty** | Belum ada transaksi sama sekali | Ilustrasi ringan + teks panduan + tombol "Catat Transaksi Pertama" |
| **Loading** | Data sedang dimuat dari IndexedDB | Skeleton untuk SaldoCard, 3 TransactionItem skeleton |
| **Error** | IndexedDB gagal dibaca | Banner merah "Gagal memuat data. Coba refresh." + tombol Refresh |
| **Success** | Data berhasil dimuat | Tampilan normal |
| **Offline** | Tidak ada koneksi internet | Banner info "Mode Offline — Data tersimpan lokal" di bagian atas |

### S2: Transaction Form

| State | Deskripsi | Visual |
|---|---|---|
| **Empty** | Form baru dibuka | Semua field kosong, tombol Simpan disabled |
| **Validation Error** | Field wajib tidak diisi / nilai tidak valid | Inline error message per field, field border merah |
| **Saving** | Sedang menyimpan ke IndexedDB | Tombol Simpan loading state |
| **Success** | Berhasil disimpan | Bottom sheet tutup + toast sukses |
| **Edit Mode** | Edit transaksi existing | Form terisi dengan data transaksi, judul "Edit Transaksi" |

### S9: Report

| State | Deskripsi | Visual |
|---|---|---|
| **Empty** | Tidak ada transaksi di periode ini | Pesan "Belum ada transaksi pada periode ini", tidak ada chart |
| **Loading** | Chart sedang dimuat | Skeleton lingkaran (donut) + skeleton bar chart |
| **Error** | Chart gagal render | Pesan "Gagal memuat grafik" + tombol Coba Lagi |
| **Success** | Data berhasil ditampilkan | Chart + tabel breakdown |

### S12: Savings Goal List

| State | Deskripsi | Visual |
|---|---|---|
| **Empty** | Belum ada target tabungan | Empty state dengan ilustrasi celengan + tombol Tambah Target |
| **Loading** | Memuat daftar target | 2 SavingsCard skeleton |
| **Completed** | Ada target yang sudah tercapai | Card dengan badge "Selesai ✓", warna hijau |
| **Overdue** | Target terlewat deadline | Card dengan badge "Terlewat", warna merah |

### S15: Export

| State | Deskripsi | Visual |
|---|---|---|
| **No Data** | Tidak ada transaksi di periode yang dipilih | Pesan error inline, tombol Ekspor disabled |
| **Generating** | File sedang dibuat | Progress indicator "Menyiapkan file..." |
| **Success** | File berhasil diunduh | Toast "File berhasil diunduh" |
| **Error** | Ekspor gagal | Pesan error + tombol Coba Lagi |

### S16: Settings

| State | Deskripsi | Visual |
|---|---|---|
| **Storage Warning** | Penyimpanan < 50MB tersisa | Banner kuning "Penyimpanan hampir penuh. Ekspor data Anda." |
| **Notif Blocked** | Izin notifikasi ditolak user | Info "Aktifkan notifikasi di pengaturan browser untuk pengingat tagihan" |

---

## 9. Responsive Behaviour

### Breakpoints

| Token | Value | Nama |
|---|---|---|
| `--bp-xs` | `320px` | Extra small (minimum support) |
| `--bp-sm` | `480px` | Small mobile |
| `--bp-md` | `768px` | Tablet portrait |
| `--bp-lg` | `1024px` | Tablet landscape / small desktop |
| `--bp-xl` | `1280px` | Desktop |
| `--bp-2xl` | `1440px` | Large desktop |

### Mobile (320px–767px)

**Layout:**
- Single column, `--space-4` padding horizontal
- Bottom navigation bar (fixed, 64px)
- FAB (+) di kanan bawah, 72px dari kanan, di atas nav
- Form menggunakan full-screen bottom sheet
- Chart tampil dalam card single-column

**Navigation pattern:**
- Bottom navigation 5 tab
- Back navigation: swipe atau tombol kembali di header
- Sheets dan dialogs dari bawah layar (spring animation)

**Komponen yang berubah:**
- Modal → Bottom Sheet
- Sidebar → Bottom Navigation
- Hover states → tidak aktif (pure tap/press)
- Tooltip → tidak ditampilkan (replaced with long-press sheet)

### Tablet (768px–1023px)

**Layout:**
- 2 kolom pada Dashboard (summary + transaksi)
- Grid 2 kolom untuk Budget List dan Savings List
- Chart tampil lebih besar (60% lebar konten)
- Bottom navigation tetap dipertahankan

**Navigation pattern:**
- Bottom navigation tetap (dengan label)
- Modal (centered) untuk form, bukan bottom sheet

**Komponen yang berubah:**
- Bottom Sheet → Modal centered
- Card list → grid 2 kolom

### Desktop (1024px+)

**Layout:**
- Sidebar navigation kiri (240px fixed)
- Konten: max-width 1200px, centered
- Dashboard: grid 3 kolom (saldo | grafik mini | transaksi terbaru)
- Report: chart dan tabel side-by-side (50/50)
- Form tampil sebagai modal di tengah halaman

**Navigation pattern:**
- Left sidebar dengan icon + label
- Breadcrumb untuk navigasi dalam
- Keyboard shortcut: `Ctrl+N` untuk catat transaksi baru

**Komponen yang berubah:**
- Bottom Nav → Sidebar
- Bottom Sheet → Modal
- FAB → Tombol "Catat" di sidebar atau header

---

## 10. Accessibility

### Rasio Kontras (WCAG 2.1 AA)

| Pasangan Warna | Rasio | Level |
|---|---|---|
| `--color-text-primary` (#1C1917) / `--color-surface-card` (#FFFFFF) | 18.1:1 | AAA |
| `--color-text-secondary` (#57534E) / `--color-surface-card` (#FFFFFF) | 7.4:1 | AAA |
| `--color-text-inverse` (#FFF) / `--color-primary-500` (#0D9488) | 4.6:1 | AA |
| `--color-success-700` (#15803D) / `--color-success-50` (#F0FDF4) | 7.2:1 | AAA |
| `--color-danger-700` (#B91C1C) / `--color-danger-50` (#FEF2F2) | 6.8:1 | AAA |
| `--color-warning-700` (#B45309) / `--color-warning-50` (#FFFBEB) | 5.4:1 | AA |
| `--color-text-tertiary` (#A8A29E) / bg white | 2.8:1 | hanya dekoratif/placeholder |

> Catatan: `--color-text-tertiary` digunakan HANYA untuk placeholder dan teks dekoratif, tidak untuk informasi fungsional — sesuai WCAG 1.4.3 pengecualian placeholder.

### Focus Order per Screen

**Dashboard:**
1. Skip to main content link (visually hidden, pertama di DOM)
2. Header / period indicator
3. SaldoCard (tidak fokusable, hanya display)
4. Budget chips (horizontal scroll, tab melalui setiap chip)
5. Tagihan jatuh tempo items
6. Transaksi terbaru items
7. "Lihat Semua" link
8. Bottom navigation (Dashboard, Transaksi, Laporan, Tabungan, Lainnya)
9. FAB (+) Catat Transaksi

**Transaction Form:**
1. Dismiss/close button (×)
2. Type toggle (Pengeluaran / Pemasukan)
3. Nominal input (autofocus)
4. Category picker trigger
5. Date input
6. Note textarea
7. Simpan button

### Keyboard Navigation

| Key | Aksi |
|---|---|
| `Tab` / `Shift+Tab` | Navigasi antar elemen fokusable |
| `Enter` / `Space` | Aktivasi tombol, toggle, link |
| `Escape` | Tutup modal, bottom sheet, dropdown |
| `Arrow keys` | Navigasi dalam segmented control, pilihan dropdown |
| `Ctrl+N` (desktop) | Buka form transaksi baru |
| `Home` / `End` | Scroll ke awal/akhir list |

### ARIA Labels dan Roles Wajib

```html
<!-- Bottom Navigation -->
<nav aria-label="Navigasi utama">
  <a aria-current="page" aria-label="Beranda (halaman aktif)">...</a>
</nav>

<!-- FAB -->
<button aria-label="Catat transaksi baru" aria-expanded="false">+</button>

<!-- Saldo Card -->
<section aria-label="Ringkasan keuangan bulan ini">
  <p>Saldo <span aria-live="polite">Rp 1.234.567</span></p>
</section>

<!-- Progress Bar (Anggaran) -->
<div role="progressbar" 
     aria-valuenow="75" 
     aria-valuemin="0" 
     aria-valuemax="100"
     aria-label="Anggaran Makan: 75% terpakai">
</div>

<!-- Toast Notification -->
<div role="status" aria-live="polite" aria-atomic="true">
  Transaksi berhasil dicatat
</div>

<!-- Error Alert -->
<div role="alert" aria-live="assertive">
  Nominal harus berupa angka lebih dari 0
</div>

<!-- Modal Dialog -->
<div role="dialog" 
     aria-modal="true" 
     aria-labelledby="dialog-title"
     aria-describedby="dialog-desc">
</div>

<!-- Chart (informational) -->
<figure aria-label="Grafik pengeluaran bulan Oktober 2024">
  <figcaption>Data pengeluaran: Makan 40%, Transport 20%, ...</figcaption>
  <!-- canvas/svg chart -->
</figure>

<!-- Transaction Item -->
<article aria-label="Pengeluaran Makan Rp 25.000 pada 15 Oktober">
</article>

<!-- Savings Progress -->
<div role="progressbar"
     aria-valuenow="60"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Target DP Motor: Rp 3.000.000 dari Rp 5.000.000 terkumpul (60%)">
</div>
```

### Handling untuk Screen Reader

1. **Angka nominal:** Gunakan `aria-label` yang menulis angka secara lengkap. Contoh: `aria-label="Pengeluaran dua puluh lima ribu rupiah"` — atau setidaknya format angka dengan `lang="id"` agar screen reader membaca dalam bahasa Indonesia.

2. **Status indicator (warna):** Jangan andalkan warna semata. Setiap indikator warna (hijau/kuning/merah anggaran) harus juga memiliki teks: "Aman", "Hampir Habis", "Terlampaui".

3. **Chart:** Semua chart harus memiliki data tabel alternatif yang bisa diakses screen reader, disembunyikan secara visual dengan `visually-hidden` class tapi accessible secara DOM.

4. **Dynamic content update:** Gunakan `aria-live="polite"` untuk update saldo dan `aria-live="assertive"` untuk error validation. Hindari `assertive` untuk notifikasi non-kritis.

5. **Form errors:** Error message harus terhubung ke field via `aria-describedby`. Field yang error mendapat `aria-invalid="true"`.

6. **Loading state:** Saat skeleton ditampilkan, region konten diberi `aria-busy="true"`. Saat selesai, diubah ke `aria-busy="false"` dan konten aktual mengambil fokus jika relevan.

7. **Bottom sheet / modal:** Focus trap aktif saat modal terbuka. Focus kembali ke trigger element saat modal ditutup. Pengguna VoiceOver iOS dapat swipe dismiss dengan gesture standar.

---

## Architecture

### Technology Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | React 18 + Vite | SPA performan, ekosistem matang, support PWA |
| Styling | Tailwind CSS v3 | Design tokens via CSS variables, purge otomatis |
| State Management | Zustand | Ringan, tanpa boilerplate Redux, support persist |
| Storage | Dexie.js (IndexedDB wrapper) | API bersih, support TypeScript, transaksi ACID |
| Charts | Chart.js + react-chartjs-2 | Ringan, mobile-friendly, touch support |
| Export Excel | SheetJS (xlsx) | Standar de facto, no server required |
| Export PDF | jsPDF + jsPDF-AutoTable | Berjalan di browser, tidak perlu server |
| PWA | Vite PWA Plugin (Workbox) | Service worker otomatis, manifest generation |
| Testing PBT | fast-check | Property-based testing untuk JS/TS |
| Notification | Web Push API + service worker | Push notification saat app tertutup |
| Icons | Lucide React | Konsisten, tree-shakeable, accessible |

### Data Layer Architecture

```
IndexedDB (via Dexie.js)
├── transactions       (id, type, amount, date, categoryId, note, createdAt)
├── categories         (id, name, type, isDefault, icon, color)
├── budgets            (id, categoryId, amount, period, createdAt)
├── recurringBills     (id, name, amount, dueDay, frequency, nextDue, isActive)
├── savingsGoals       (id, name, targetAmount, savedAmount, deadline, status)
├── savingsEntries     (id, goalId, amount, date, note)
└── appMeta            (key, value) ← anonymous ID, onboarding status, version
```

### PWA & Offline Architecture

```
Service Worker (Workbox)
├── Cache Strategy: CacheFirst untuk aset statis
├── Cache Strategy: NetworkFirst untuk data (tidak ada remote, hanya local)
├── Background Sync: queue untuk operasi gagal (offline safeguard)
└── Push Notification: menerima push dari scheduled local notification
```

---

## Components and Interfaces

### Core Data Interfaces (TypeScript)

```typescript
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number; // integer, rupiah
  date: string;   // ISO 8601 YYYY-MM-DD
  categoryId: string;
  note?: string;  // max 255 chars
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;   // max 50 chars, unique per type
  type: 'income' | 'expense';
  isDefault: boolean;
  icon: string;   // emoji atau icon name
  color: string;  // hex color
}

interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: 'monthly' | 'weekly';
  createdAt: string;
}

interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;      // 1-31 untuk monthly, 0-6 untuk weekly
  frequency: 'monthly' | 'weekly' | 'yearly';
  nextDue: string;     // ISO 8601
  isActive: boolean;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;    // ISO 8601
  status: 'active' | 'completed' | 'overdue';
  createdAt: string;
}
```

---

## Data Models

Seluruh data disimpan di IndexedDB melalui Dexie.js. Tidak ada network request untuk data pengguna. Semua operasi bersifat sinkron terhadap state (Zustand store) dan asinkron terhadap IndexedDB.

### Budget Calculation Logic

```
budgetPercentage = (totalSpentInPeriod / budgetAmount) * 100

Status:
  < 80%  → "safe"    → indikator hijau
  80-99% → "warning" → indikator kuning + one-time notification
  ≥ 100% → "danger"  → indikator merah + one-time notification
```

### Savings Estimation Logic

```
monthsRemaining = differenceInMonths(deadline, today)
amountNeeded = targetAmount - savedAmount

IF monthsRemaining <= 0:
  status = 'overdue' (jika savedAmount < targetAmount)
  status = 'completed' (jika savedAmount >= targetAmount)
ELSE:
  requiredMonthly = amountNeeded / monthsRemaining
  avgMonthlySaving = totalSavedAmount / monthsElapsed (atau 0 jika baru)
  
  IF avgMonthlySaving >= requiredMonthly: "On track"
  ELSE: "Butuh Rp X/bulan untuk mencapai target"
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Implementasi menggunakan **fast-check** (JavaScript PBT library), setiap property test dikonfigurasi minimal **100 iterasi**.

---

### Property 1: Transaction Storage Round-Trip

*For any* valid transaction (nominal positif ≤ 999.999.999.999, jenis valid, tanggal valid, kategori valid), menyimpan transaksi ke IndexedDB kemudian mengambilnya kembali harus menghasilkan objek yang identik dengan yang disimpan.

**Validates: Requirements 1.2**

---

### Property 2: Invalid Nominal Rejection

*For any* nilai nominal yang tidak valid — termasuk semua angka ≤ 0, semua angka > 999.999.999.999, string non-numerik, dan NaN — sistem harus menolak penyimpanan dan mengembalikan pesan error yang sesuai, tanpa memodifikasi state transaksi yang sudah ada.

**Validates: Requirements 1.3**

---

### Property 3: Required Field Validation

*For any* kombinasi field wajib (jenis, nominal, tanggal, kategori) yang dihilangkan, sistem harus menampilkan error message inline untuk setiap field yang kosong dan mencegah penyimpanan transaksi.

**Validates: Requirements 1.4**

---

### Property 4: Edit Form Population & Update Round-Trip

*For any* transaksi yang tersimpan, membuka form edit harus mengisi semua field dengan nilai yang tersimpan; setelah disimpan dengan nilai yang diubah, data di storage harus mencerminkan nilai baru — bukan nilai lama.

**Validates: Requirements 1.5, 1.6**

---

### Property 5: Category Name Uniqueness (Case-Insensitive)

*For any* pasangan nama kategori (nameA, nameB) di mana `nameA.toLowerCase() === nameB.toLowerCase()` dan keduanya bertipe sama (income/expense), percobaan membuat kategori kedua harus ditolak dengan pesan error "Nama kategori sudah digunakan".

**Validates: Requirements 2.3**

---

### Property 6: Category Rename Propagation

*For any* kategori dengan N transaksi yang menggunakannya (N ≥ 0), setelah nama kategori diganti menjadi nama baru yang unik, semua N transaksi tersebut harus menggunakan nama kategori baru — tidak ada yang masih menggunakan nama lama.

**Validates: Requirements 2.4**

---

### Property 7: Budget Percentage Calculation

*For any* pasangan (totalSpent, budgetAmount) di mana keduanya adalah angka positif, persentase yang dihitung oleh sistem harus sama dengan `(totalSpent / budgetAmount) * 100`, dengan presisi yang cukup untuk menentukan threshold 80% dan 100% secara benar.

**Validates: Requirements 3.2**

---

### Property 8: Budget Status Indicator

*For any* nilai (totalSpent, budgetAmount) di mana kedua nilai positif, indikator warna yang ditampilkan harus sesuai aturan: hijau jika `(totalSpent/budgetAmount) < 0.8`, kuning jika `0.8 ≤ (totalSpent/budgetAmount) < 1.0`, merah jika `(totalSpent/budgetAmount) ≥ 1.0`.

**Validates: Requirements 3.4, 3.5, 3.6**

---

### Property 9: Report Aggregation Accuracy

*For any* kumpulan transaksi dalam suatu periode, laporan yang dihasilkan harus memenuhi: `totalIncome = sum of all income transactions`, `totalExpense = sum of all expense transactions`, `balance = totalIncome - totalExpense`. Tidak ada transaksi yang boleh hilang atau terhitung dua kali.

**Validates: Requirements 4.1**

---

### Property 10: Date Range Validation

*For any* pasangan tanggal (startDate, endDate) di mana `startDate > endDate`, sistem harus menampilkan pesan error "Tanggal mulai tidak boleh setelah tanggal akhir" dan mempertahankan periode laporan sebelumnya tanpa perubahan.

**Validates: Requirements 4.7**

---

### Property 11: Recurring Bill Mark-as-Paid Creates Matching Transaction

*For any* tagihan berulang (nama, nominal, tanggal), menandainya sebagai "sudah dibayar" harus menghasilkan sebuah transaksi pengeluaran baru di storage dengan nominal dan nama yang identik dengan tagihan tersebut.

**Validates: Requirements 5.4**

---

### Property 12: Savings Progress Calculation

*For any* target tabungan dengan totalSaved dan targetAmount yang positif, persentase progress yang ditampilkan harus sama dengan `(totalSaved / targetAmount) * 100`, dan status harus: `completed` jika ≥ 100%, `overdue` jika deadline terlewat dan < 100%, `active` selainnya.

**Validates: Requirements 6.2, 6.3**

---

### Property 13: Export Completeness

*For any* set transaksi dalam suatu periode yang diekspor, file yang dihasilkan (Excel atau PDF) harus mengandung semua transaksi tersebut — tidak ada transaksi yang hilang, tidak ada transaksi dari luar periode yang ikut masuk.

**Validates: Requirements 7.1**

---

### Property 14: Anonymous ID Uniqueness

*For any* N sesi pertama kali membuka aplikasi di N device/browser berbeda, semua anonymous ID yang dihasilkan harus unik — tidak ada dua ID yang sama.

**Validates: Requirements 9.1**

---

## Error Handling

### Strategi Umum

1. **IndexedDB Failure:** Semua operasi Dexie.js dibungkus `try/catch`. Error ditangkap di layer repository dan dilempar sebagai custom `StorageError`. Zustand store memiliki field `error` per slice untuk menyimpan state error.

2. **Quota Exceeded:** `navigator.storage.estimate()` dipanggil setiap kali app dibuka. Jika `quota - usage < 50MB`, peringatan ditampilkan. Jika terjadi `QuotaExceededError`, transaksi dibatalkan dan user diminta ekspor data.

3. **Export Failure:** SheetJS / jsPDF dibungkus `try/catch`. Jika file generation gagal, pesan error ditampilkan dan tidak ada partial file yang tertinggal (blob URL di-revoke).

4. **Service Worker Error:** Jika SW registration gagal, app tetap berfungsi dalam mode non-PWA. Banner info ditampilkan: "Fitur offline tidak tersedia di browser ini."

5. **Validation Error:** Selalu inline per field, tidak pernah dialog terpisah. Error hilang saat user mulai mengedit field yang error.

6. **Chart Render Error:** Chart.js error dibungkus ErrorBoundary. Fallback: pesan teks "Grafik tidak dapat ditampilkan" + tabel data.

### Error Messages (Standard)

| Kondisi | Pesan |
|---|---|
| Nominal kosong | "Nominal wajib diisi" |
| Nominal tidak valid | "Nominal harus berupa angka lebih dari 0 dan tidak melebihi 999.999.999.999" |
| Kategori kosong | "Kategori wajib dipilih" |
| Nama kategori duplikat | "Nama kategori sudah digunakan" |
| Tanggal mulai > akhir | "Tanggal mulai tidak boleh setelah tanggal akhir" |
| Tidak ada data ekspor | "Tidak ada data transaksi pada periode ini" |
| Ekspor gagal | "Ekspor gagal, silakan coba lagi" |
| Storage penuh | "Penyimpanan perangkat hampir penuh. Segera ekspor data Anda." |
| Storage error umum | "Gagal memuat data. Coba refresh halaman." |

---

## Testing Strategy

### Pendekatan Dual Testing

Testing menggunakan dua pendekatan komplementer:

1. **Unit + Integration Tests** (Vitest) — untuk behavior spesifik, edge case, dan integrasi komponen
2. **Property-Based Tests** (fast-check) — untuk properti universal yang harus berlaku di semua input

### Unit & Integration Testing

**Fokus:**
- Validation logic per field (contoh, nominal boundary values)
- Delete confirmation flow (confirm vs cancel)
- Category delete flow (with/without transactions)
- Budget notification trigger (tepat di threshold 80% dan 100%)
- Recurring bill auto-create transaction flow
- Savings goal completion notification
- Export file generation (correct columns, correct data)
- PWA offline behavior

**Tools:** Vitest + Testing Library + jsdom + fake-indexeddb

### Property-Based Testing

**Library:** `fast-check` (npm: `fast-check`)

**Konfigurasi:** Minimum 100 iterasi per property, seed disimpan untuk reproducibility.

**Tag format setiap test:**
```
// Feature: pencatatan-keuangan, Property {N}: {deskripsi singkat}
```

**Daftar test yang harus diimplementasi:**

| Property | Test ID | Generator |
|---|---|---|
| Transaction Storage Round-Trip | PBT-01 | `fc.record({type, amount, date, categoryId, note})` |
| Invalid Nominal Rejection | PBT-02 | `fc.oneof(fc.float({max: 0}), fc.float({min: 1e12}), fc.string())` |
| Required Field Validation | PBT-03 | `fc.subarray(['type','amount','date','categoryId'])` (subset yang dihilangkan) |
| Edit Form Population & Update | PBT-04 | `fc.tuple(transactionArb, transactionArb)` |
| Category Name Uniqueness | PBT-05 | `fc.string()` + case variations |
| Category Rename Propagation | PBT-06 | `fc.array(transactionArb)` + `fc.string()` |
| Budget Percentage Calculation | PBT-07 | `fc.tuple(fc.float({min:0}), fc.float({min:0.01}))` |
| Budget Status Indicator | PBT-08 | `fc.tuple(fc.float({min:0}), fc.float({min:0.01}))` |
| Report Aggregation Accuracy | PBT-09 | `fc.array(transactionArb, {minLength: 0, maxLength: 100})` |
| Date Range Validation | PBT-10 | `fc.tuple(fc.date(), fc.date()).filter(([a,b]) => a > b)` |
| Mark-as-Paid Creates Transaction | PBT-11 | `fc.record({name, amount, dueDay, frequency})` |
| Savings Progress Calculation | PBT-12 | `fc.tuple(fc.float({min:0}), fc.float({min:0.01}), fc.date())` |
| Export Completeness | PBT-13 | `fc.array(transactionArb)` + `fc.tuple(dateArb, dateArb)` |
| Anonymous ID Uniqueness | PBT-14 | `fc.integer({min: 2, max: 50})` (jumlah N sessions) |

### Performance Testing

- Dashboard load < 2 detik pada throttled 3G: Lighthouse CI check
- Period switch < 500ms: manual timing assertion di integration test
- Input response < 100ms: E2E test dengan Playwright

### Accessibility Testing

- Lighthouse Accessibility score ≥ 90: CI check
- axe-core integration tests untuk ARIA compliance
- Manual testing dengan VoiceOver (iOS) dan TalkBack (Android)
