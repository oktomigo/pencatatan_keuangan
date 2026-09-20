# Requirements Document

## Introduction

Aplikasi pencatatan keuangan harian berbasis web (PWA/mobile-friendly) yang membantu pengguna — terutama anak kos dengan budget terbatas dan individu/keluarga yang kesulitan mengatur keuangan — untuk mencatat pemasukan dan pengeluaran, mengatur anggaran per kategori, melacak tabungan, mendapatkan pengingat tagihan, serta melihat laporan keuangan dalam bentuk grafik dan tabel. Aplikasi tidak memerlukan login; identitas pengguna bersifat anonim dan data tersimpan per perangkat/browser. Aplikasi siap diluncurkan ke publik sebagai produk nyata.

---

## Glossary

- **App**: Aplikasi pencatatan keuangan berbasis web PWA yang menjadi subjek dokumen ini.
- **Transaksi**: Satu catatan keuangan berupa pemasukan atau pengeluaran dengan nilai, tanggal, kategori, dan catatan opsional.
- **Kategori**: Pengelompokan transaksi buatan pengguna (contoh: Makan, Transport, Gaji, Tagihan).
- **Anggaran**: Batas pengeluaran maksimum yang ditetapkan pengguna untuk suatu kategori dalam periode tertentu (bulanan atau mingguan).
- **Saldo**: Jumlah pemasukan dikurangi pengeluaran dalam periode tertentu.
- **Tagihan_Berulang**: Transaksi pengeluaran yang dijadwalkan terjadi secara berkala pada tanggal tertentu.
- **Target_Tabungan**: Tujuan finansial dengan nominal target dan tenggat waktu yang ditetapkan pengguna.
- **Laporan**: Ringkasan keuangan dalam periode tertentu yang mencakup saldo, total pemasukan, total pengeluaran, dan rincian per kategori.
- **Notifikasi**: Pengingat yang ditampilkan oleh App kepada pengguna, baik melalui push notification maupun in-app alert.
- **Device_Storage**: Mekanisme penyimpanan data lokal pada perangkat pengguna (IndexedDB/localStorage).
- **Export_Engine**: Modul yang bertanggung jawab menghasilkan file ekspor dalam format Excel (.xlsx) dan PDF.
- **Chart_Engine**: Modul yang merender grafik dan visualisasi data keuangan.
- **Periode**: Rentang waktu yang digunakan untuk mengagregasi data (harian, mingguan, bulanan, atau kustom).

---

## Requirements

### Requirement 1: Pencatatan Transaksi

**User Story:** Sebagai pengguna, saya ingin mencatat pemasukan dan pengeluaran harian dengan cepat, agar saya dapat melacak ke mana uang saya pergi setiap hari.

#### Acceptance Criteria

1. THE App SHALL menyediakan formulir pencatatan transaksi yang memuat kolom: jenis (pemasukan/pengeluaran), nominal, tanggal, kategori, dan catatan opsional (maks. 255 karakter); nama kategori dibatasi maks. 50 karakter.
2. WHEN pengguna menyimpan transaksi dengan semua kolom wajib terisi, THE App SHALL menyimpan transaksi ke Device_Storage dan menampilkan transaksi tersebut di urutan paling atas daftar transaksi.
3. WHEN pengguna mengisi kolom nominal dengan nilai bukan angka positif atau dengan nilai melebihi 999.999.999.999, THE App SHALL menampilkan pesan kesalahan "Nominal harus berupa angka lebih dari 0 dan tidak melebihi 999.999.999.999" dan mencegah penyimpanan.
4. WHEN pengguna meninggalkan kolom wajib (jenis, nominal, tanggal, kategori) kosong, THE App SHALL menampilkan pesan kesalahan per kolom dan mencegah penyimpanan.
5. WHEN pengguna memilih transaksi dari daftar, THE App SHALL menampilkan formulir edit yang terisi dengan data transaksi tersebut.
6. WHEN pengguna menyimpan hasil edit transaksi, THE App SHALL memperbarui data transaksi di Device_Storage dan memperbarui tampilan daftar dalam waktu tidak lebih dari 1 detik.
7. WHEN pengguna menghapus sebuah transaksi, THE App SHALL menampilkan konfirmasi penghapusan sebelum menghapus data dari Device_Storage.
8. THE App SHALL mendukung pencatatan nominal hingga 999.999.999.999 (satu triliun kurang satu rupiah) tanpa kehilangan presisi.
9. WHEN pengguna mengonfirmasi penghapusan transaksi, THE App SHALL menghapus transaksi dari Device_Storage dan menghilangkan transaksi tersebut dari daftar transaksi.
10. WHEN pengguna membatalkan konfirmasi penghapusan, THE App SHALL menutup dialog konfirmasi dan mempertahankan data transaksi tanpa perubahan.

---

### Requirement 2: Manajemen Kategori

**User Story:** Sebagai pengguna, saya ingin membuat dan mengelola kategori pengeluaran dan pemasukan sendiri, agar pencatatan sesuai dengan kebutuhan hidup saya.

#### Acceptance Criteria

1. THE App SHALL menyediakan daftar kategori default untuk pemasukan (contoh: Gaji, Freelance, Bonus) dan pengeluaran (contoh: Makan, Transport, Kos, Tagihan, Hiburan); kategori default tidak dapat diedit atau dihapus.
2. WHEN pengguna membuat kategori baru dengan nama unik (case-insensitive, unik dalam tipe yang sama: pemasukan atau pengeluaran), THE App SHALL menyimpan kategori tersebut ke Device_Storage dan menampilkannya dalam daftar kategori.
3. WHEN pengguna membuat kategori dengan nama yang sudah ada pada tipe yang sama (case-insensitive), THE App SHALL menampilkan pesan kesalahan "Nama kategori sudah digunakan" dan mencegah penyimpanan.
4. WHEN pengguna mengedit nama kategori buatan pengguna, THE App SHALL memperbarui nama kategori di semua transaksi yang menggunakan kategori tersebut; validasi keunikan nama tetap berlaku saat pengeditan.
5. WHEN pengguna menghapus kategori yang tidak memiliki transaksi, THE App SHALL menghapus kategori dari Device_Storage.
6. IF pengguna mencoba menghapus kategori yang masih memiliki transaksi terkait, THEN THE App SHALL menampilkan peringatan dan meminta pengguna memilih antara memindahkan transaksi ke kategori lain atau membatalkan penghapusan; jika tidak ada kategori lain yang tersedia untuk dipilih, opsi pindah dinonaktifkan.
7. THE App SHALL membatasi jumlah kategori buatan pengguna hingga maks. 50 per tipe (pemasukan dan pengeluaran masing-masing).

---

### Requirement 3: Anggaran per Kategori

**User Story:** Sebagai pengguna dengan budget terbatas, saya ingin menetapkan batas pengeluaran per kategori, agar saya tidak melebihi anggaran yang sudah direncanakan.

#### Acceptance Criteria

1. WHEN pengguna menetapkan anggaran untuk suatu kategori dengan nominal valid (angka positif, maks. 999.999.999.999) dan periode (bulanan/mingguan, didefinisikan sebagai periode kalender), THE App SHALL menyimpan anggaran tersebut ke Device_Storage.
2. WHEN anggaran disimpan atau diperbarui, THE App SHALL menghitung persentase penggunaan anggaran dalam waktu tidak lebih dari 3 detik berdasarkan total pengeluaran kategori tersebut pada periode berjalan.
3. WHEN pengguna mengisi nominal anggaran dengan nilai bukan angka positif atau melebihi 999.999.999.999, THE App SHALL menampilkan pesan kesalahan "Nominal anggaran tidak valid" dan mencegah penyimpanan.
4. WHILE pengeluaran dalam suatu kategori belum melampaui 80% dari anggaran, THE App SHALL menampilkan indikator anggaran berwarna hijau pada kategori tersebut.
5. WHEN pengeluaran dalam suatu kategori pertama kali mencapai atau melampaui 80% dari anggaran dalam suatu periode, THE App SHALL menampilkan Notifikasi in-app satu kali dan mengubah indikator anggaran menjadi kuning.
6. WHEN pengeluaran dalam suatu kategori pertama kali melampaui 100% dari anggaran dalam suatu periode, THE App SHALL menampilkan Notifikasi in-app "Anggaran [Nama Kategori] telah terlampaui" satu kali dan mengubah indikator anggaran menjadi merah.
7. THE App SHALL tetap mengizinkan pencatatan transaksi meskipun anggaran kategori telah terlampaui.
8. WHEN pengguna memperbarui nilai anggaran suatu kategori, THE App SHALL menghitung ulang status anggaran berdasarkan data transaksi yang sudah ada dalam periode yang sama.
9. WHERE pengguna tidak menetapkan anggaran untuk suatu kategori, THE App SHALL menampilkan kategori tersebut tanpa indikator anggaran.

---

### Requirement 4: Laporan Keuangan dan Grafik

**User Story:** Sebagai pengguna, saya ingin melihat laporan dan grafik keuangan bulanan, agar saya dapat memahami pola pengeluaran dan pemasukan saya.

#### Acceptance Criteria

1. WHEN pengguna memilih Periode pada halaman laporan, THE App SHALL menampilkan Laporan yang mencakup: total pemasukan, total pengeluaran, Saldo, dan rincian per Kategori (total nominal dan persentase kontribusi tiap kategori terhadap total pengeluaran atau pemasukan).
2. WHEN pengguna membuka halaman laporan, THE App SHALL menampilkan laporan bulan berjalan secara default.
3. WHEN pengguna memilih Periode pada halaman laporan, THE Chart_Engine SHALL menampilkan grafik pie/donut yang memperlihatkan proporsi pengeluaran per kategori untuk Periode tersebut.
4. WHEN pengguna memilih Periode pada halaman laporan, THE Chart_Engine SHALL menampilkan grafik batang yang memperlihatkan tren pemasukan dan pengeluaran harian dalam Periode tersebut.
5. WHEN tidak ada transaksi dalam Periode yang dipilih, THE App SHALL menampilkan pesan "Belum ada transaksi pada periode ini" dan tidak menampilkan grafik kosong.
6. WHEN pengguna berpindah periode pada halaman laporan, THE App SHALL memperbarui semua data laporan dan grafik dalam waktu kurang dari 500ms.
7. IF pengguna memilih rentang tanggal kustom dengan tanggal mulai setelah tanggal akhir, THEN THE App SHALL menampilkan pesan kesalahan "Tanggal mulai tidak boleh setelah tanggal akhir" dan mempertahankan Periode sebelumnya.

---

### Requirement 5: Pengingat Tagihan Berulang

**User Story:** Sebagai pengguna, saya ingin mendapatkan pengingat untuk tagihan yang harus dibayar secara rutin, agar saya tidak lupa membayar dan terkena denda.

#### Acceptance Criteria

1. WHEN pengguna membuat Tagihan_Berulang dengan nama, nominal, tanggal jatuh tempo, dan frekuensi (bulanan/mingguan/tahunan), THE App SHALL menyimpan Tagihan_Berulang ke Device_Storage dan menjadwalkan Notifikasi.
2. WHEN tanggal sistem sama dengan tanggal jatuh tempo Tagihan_Berulang, THE App SHALL menampilkan Notifikasi in-app yang berisi nama tagihan dan nominalnya.
3. WHERE browser pengguna mendukung Web Push API dan pengguna telah memberikan izin notifikasi, THE App SHALL mengirim push notification untuk Tagihan_Berulang yang jatuh tempo hari ini.
4. WHEN pengguna menandai Tagihan_Berulang sebagai "sudah dibayar" untuk periode berjalan, THE App SHALL mencatat transaksi pengeluaran secara otomatis dengan data dari Tagihan_Berulang tersebut.
5. WHEN pengguna menandai Tagihan_Berulang sebagai "sudah dibayar", THE App SHALL menjadwalkan ulang Notifikasi untuk periode berikutnya sesuai frekuensi.
6. THE App SHALL menampilkan daftar Tagihan_Berulang yang jatuh tempo dalam 7 hari ke depan pada halaman utama (dashboard).
7. WHEN pengguna menghapus Tagihan_Berulang, THE App SHALL membatalkan semua jadwal Notifikasi yang terkait dan tidak menghapus transaksi yang sudah tercatat.

---

### Requirement 6: Target Tabungan

**User Story:** Sebagai pengguna, saya ingin menetapkan target tabungan dengan tenggat waktu, agar saya termotivasi untuk mencapai tujuan finansial saya.

#### Acceptance Criteria

1. WHEN pengguna membuat Target_Tabungan dengan nama, nominal target, dan tanggal target, THE App SHALL menyimpan Target_Tabungan ke Device_Storage dan menampilkan progress 0%.
2. WHEN pengguna mencatat penambahan dana ke Target_Tabungan, THE App SHALL memperbarui jumlah terkumpul dan menghitung ulang persentase progress secara real-time.
3. THE App SHALL menampilkan estimasi kecukupan dana berdasarkan rata-rata tabungan per bulan dibandingkan sisa waktu menuju tanggal target.
4. WHEN jumlah terkumpul mencapai 100% dari nominal target, THE App SHALL menampilkan Notifikasi in-app "Selamat! Target [Nama Target] telah tercapai!" dan menandai Target_Tabungan sebagai selesai.
5. WHILE tanggal target sudah terlewati dan jumlah terkumpul belum mencapai 100% dari nominal target, THE App SHALL menampilkan indikator "Target Terlewat" pada Target_Tabungan tersebut.
6. THE App SHALL menampilkan daftar semua Target_Tabungan aktif beserta progress masing-masing pada halaman khusus tabungan.
7. WHEN pengguna menghapus Target_Tabungan, THE App SHALL menampilkan konfirmasi penghapusan dan menghapus data dari Device_Storage tanpa mempengaruhi transaksi yang sudah tercatat.

---

### Requirement 7: Ekspor Data

**User Story:** Sebagai pengguna, saya ingin mengekspor data keuangan saya ke format Excel atau PDF, agar saya bisa menyimpan arsip atau berbagi laporan dengan orang lain.

#### Acceptance Criteria

1. WHEN pengguna meminta ekspor data dengan memilih format (Excel/.xlsx atau PDF) dan Periode, THE Export_Engine SHALL menghasilkan file yang berisi semua Transaksi dalam periode tersebut beserta ringkasan laporan.
2. THE Export_Engine SHALL menghasilkan file Excel dengan kolom: Tanggal, Jenis, Kategori, Nominal, dan Catatan; serta sheet terpisah untuk ringkasan per kategori.
3. THE Export_Engine SHALL menghasilkan file PDF dengan tata letak yang dapat dibaca manusia, mencakup ringkasan laporan dan daftar transaksi terurut berdasarkan tanggal.
4. WHEN proses ekspor selesai, THE App SHALL memulai unduhan file secara otomatis ke perangkat pengguna.
5. WHEN tidak ada transaksi dalam Periode yang dipilih untuk diekspor, THE App SHALL menampilkan pesan "Tidak ada data transaksi pada periode ini" dan mencegah proses ekspor.
6. IF proses ekspor gagal karena kesalahan teknis, THEN THE App SHALL menampilkan pesan kesalahan "Ekspor gagal, silakan coba lagi" dan tidak meninggalkan file yang tidak lengkap di perangkat pengguna.

---

### Requirement 8: Dashboard Utama

**User Story:** Sebagai pengguna, saya ingin melihat ringkasan keuangan saya di halaman utama, agar saya langsung mengetahui kondisi keuangan hari ini tanpa harus berpindah halaman.

#### Acceptance Criteria

1. THE App SHALL menampilkan dashboard yang memuat: Saldo bulan berjalan, total pemasukan bulan ini, total pengeluaran bulan ini, daftar transaksi terbaru (5 terakhir), Tagihan_Berulang yang jatuh tempo dalam 7 hari, dan ringkasan status anggaran per kategori.
2. WHEN pengguna membuka App, THE App SHALL memuat dan menampilkan dashboard dalam waktu kurang dari 2 detik pada koneksi jaringan 3G.
3. WHEN pengguna menambah, mengedit, atau menghapus transaksi dari halaman mana pun, THE App SHALL memperbarui data dashboard secara otomatis tanpa memerlukan refresh halaman.
4. WHILE App berjalan dalam mode offline (tidak ada koneksi internet), THE App SHALL tetap menampilkan data dari Device_Storage dan memungkinkan pencatatan transaksi baru.
5. THE App SHALL menampilkan indikator status offline yang jelas WHILE koneksi internet tidak tersedia.

---

### Requirement 9: Penyimpanan Data Lokal dan Identitas Anonim

**User Story:** Sebagai pengguna, saya ingin menggunakan aplikasi tanpa membuat akun, agar data saya tersimpan otomatis di perangkat tanpa proses registrasi yang rumit.

#### Acceptance Criteria

1. WHEN pengguna membuka App untuk pertama kali, THE App SHALL membuat identitas anonim unik berbasis perangkat dan menyimpannya ke Device_Storage tanpa memerlukan input dari pengguna.
2. THE App SHALL menyimpan seluruh data (transaksi, kategori, anggaran, tagihan berulang, target tabungan) ke Device_Storage menggunakan IndexedDB.
3. WHILE App digunakan pada perangkat yang sama, THE App SHALL mempertahankan semua data pengguna antara sesi-sesi yang berbeda.
4. THE App SHALL menampilkan halaman atau dialog panduan ekspor data WHEN pengguna mencoba membersihkan cache browser, sebagai peringatan potensi kehilangan data.
5. IF kapasitas Device_Storage mendekati batas (kurang dari 50MB tersisa), THEN THE App SHALL menampilkan peringatan "Penyimpanan perangkat hampir penuh. Segera ekspor data Anda."

---

### Requirement 10: PWA dan Mobile-Friendly

**User Story:** Sebagai pengguna yang sering mengakses dari ponsel, saya ingin aplikasi yang terasa seperti aplikasi native di ponsel saya, agar mudah digunakan kapan saja.

#### Acceptance Criteria

1. THE App SHALL memenuhi kriteria Progressive Web App (PWA) sehingga dapat diinstal ke layar utama (home screen) pada perangkat Android dan iOS.
2. THE App SHALL menyajikan antarmuka yang responsif dan dapat digunakan dengan nyaman pada layar dengan lebar minimum 320px hingga 1440px.
3. THE App SHALL mendaftarkan service worker yang meng-cache aset statis (HTML, CSS, JavaScript) sehingga App dapat dibuka dalam kondisi offline setelah kunjungan pertama.
4. THE App SHALL mendapatkan skor Lighthouse PWA minimal 90 pada kategori Performance, Accessibility, dan Best Practices.
5. WHEN pengguna berinteraksi dengan elemen input (tombol, formulir), THE App SHALL merespons sentuhan dalam waktu kurang dari 100ms untuk memberikan umpan balik visual.
6. THE App SHALL menyediakan ukuran target sentuhan (touch target) minimal 44x44 piksel untuk semua elemen interaktif, sesuai standar aksesibilitas WCAG 2.1 AA.
