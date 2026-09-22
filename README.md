# CatatUang

Aplikasi pencatatan keuangan harian berbasis Flask, MongoDB, dan Vanilla JavaScript.

## Menjalankan

1. Pastikan MongoDB berjalan pada `mongodb://localhost:27017`.
2. Aktifkan virtual environment:

```powershell
.venv\Scripts\Activate.ps1
```

3. Salin `.env.example` menjadi `.env` dan sesuaikan nilainya.
4. Pasang dependensi:

```powershell
pip install -r requirements.txt
```

5. Jalankan Flask:

```powershell
flask --app main run --debug
```

Buka `http://localhost:5000/dashboard`.

## Endpoint

Semua endpoint API selain `/api/health` dan `POST /api/init` menggunakan header `X-Device-ID`.

- `POST /api/init`
- `GET /api/health`
- `GET/POST /api/categories`
- `GET/POST /api/transactions`
- `GET /api/dashboard`
- `GET/POST /api/budgets`
- `GET /api/reports`
- `GET/POST /api/recurring-bills`
- `POST /api/recurring-bills/<id>/pay`
- `GET/POST /api/savings-goals`
- `POST /api/savings-goals/<id>/add-funds`
- `POST /api/export`

## PWA dan Offline

Aset statis dicache oleh service worker. GET `/api/dashboard` memakai fallback cache saat offline; operasi POST, PUT, dan DELETE tidak dicache. Data pengguna pada arsitektur backend disimpan di MongoDB dan diisolasi berdasarkan `device_id`.

## Verifikasi

Kompilasi/diagnostics Python dan smoke check route dapat dijalankan dengan interpreter `.venv`. Uji API lengkap membutuhkan MongoDB aktif dan test suite backend yang sesuai dengan step CRUD masing-masing.
