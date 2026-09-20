// state.js — state management ringan tanpa library

import { generateDeviceId } from './utils.js';

const _data = {
  deviceId:     null,
  currentMonth: null,
  currentYear:  null,
};

const _subscribers = new Map(); // key → Set<callback>

export const AppState = {

  /** Baca nilai dari state */
  get(key) {
    return _data[key];
  },

  /** Update nilai + panggil semua subscriber key tersebut */
  set(key, value) {
    _data[key] = value;
    if (_subscribers.has(key)) {
      _subscribers.get(key).forEach(fn => fn(value));
    }
  },

  /**
   * Daftar callback yang dipanggil saat key berubah.
   * @returns {Function} fungsi unsubscribe
   */
  subscribe(key, fn) {
    if (!_subscribers.has(key)) _subscribers.set(key, new Set());
    _subscribers.get(key).add(fn);
    return () => _subscribers.get(key).delete(fn);
  },

  /** Baca deviceId dari localStorage, buat baru jika belum ada */
  getDeviceId() {
    if (_data.deviceId) return _data.deviceId;
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem('deviceId', id);
    }
    _data.deviceId = id;
    return id;
  },

  /** Kembalikan bulan dan tahun aktif */
  getCurrentPeriod() {
    return {
      month: _data.currentMonth,
      year:  _data.currentYear,
    };
  },
};

// Inisialisasi saat module diload
(function init() {
  const now = new Date();
  AppState.set('currentMonth', now.getMonth() + 1); // 1–12
  AppState.set('currentYear',  now.getFullYear());
  AppState.getDeviceId(); // pastikan deviceId sudah di-set
})();
