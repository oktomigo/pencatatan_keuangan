// mock.js — data dummy realistis untuk development UI-first (Fase 1–2)

export const MOCK = {

  /* ==========================================================
     KATEGORI — 11 total (7 expense + 4 income)
  ========================================================== */
  categories: [
    // --- Pengeluaran ---
    { id: 'cat-01', name: 'Makan',     type: 'expense', is_default: true,  icon: '🍜', color: '#0D9488' },
    { id: 'cat-02', name: 'Transport', type: 'expense', is_default: true,  icon: '🚌', color: '#3B82F6' },
    { id: 'cat-03', name: 'Kos',       type: 'expense', is_default: true,  icon: '🏠', color: '#8B5CF6' },
    { id: 'cat-04', name: 'Tagihan',   type: 'expense', is_default: true,  icon: '📄', color: '#F59E0B' },
    { id: 'cat-05', name: 'Hiburan',   type: 'expense', is_default: true,  icon: '🎮', color: '#EC4899' },
    { id: 'cat-06', name: 'Belanja',   type: 'expense', is_default: true,  icon: '🛍️', color: '#14B8A6' },
    { id: 'cat-07', name: 'Lainnya',   type: 'expense', is_default: true,  icon: '📦', color: '#6B7280' },
    // --- Pemasukan ---
    { id: 'cat-08', name: 'Gaji',      type: 'income',  is_default: true,  icon: '💵', color: '#22C55E' },
    { id: 'cat-09', name: 'Freelance', type: 'income',  is_default: true,  icon: '💻', color: '#06B6D4' },
    { id: 'cat-10', name: 'Bonus',     type: 'income',  is_default: true,  icon: '🎁', color: '#F97316' },
    { id: 'cat-11', name: 'Lainnya',   type: 'income',  is_default: true,  icon: '📥', color: '#84CC16' },
  ],

  /* ==========================================================
     TRANSAKSI — 15 item bulan Oktober 2026
  ========================================================== */
  transactions: [
    { id: 'tx-01', type: 'income',  amount: 3500000, date: '2026-10-01', category_id: 'cat-08', note: 'Gaji bulan Oktober',        created_at: '2026-10-01T08:00:00' },
    { id: 'tx-02', type: 'expense', amount: 800000,  date: '2026-10-01', category_id: 'cat-03', note: 'Bayar kos bulan Oktober',   created_at: '2026-10-01T09:00:00' },
    { id: 'tx-03', type: 'expense', amount: 25000,   date: '2026-10-02', category_id: 'cat-01', note: 'Makan siang warteg',        created_at: '2026-10-02T12:30:00' },
    { id: 'tx-04', type: 'expense', amount: 15000,   date: '2026-10-02', category_id: 'cat-02', note: 'Naik angkot ke kampus',     created_at: '2026-10-02T07:30:00' },
    { id: 'tx-05', type: 'income',  amount: 500000,  date: '2026-10-05', category_id: 'cat-09', note: 'Freelance desain logo',     created_at: '2026-10-05T10:00:00' },
    { id: 'tx-06', type: 'expense', amount: 150000,  date: '2026-10-07', category_id: 'cat-04', note: 'Bayar listrik',             created_at: '2026-10-07T11:00:00' },
    { id: 'tx-07', type: 'expense', amount: 45000,   date: '2026-10-08', category_id: 'cat-01', note: 'Makan malam ayam geprek',   created_at: '2026-10-08T19:00:00' },
    { id: 'tx-08', type: 'expense', amount: 200000,  date: '2026-10-10', category_id: 'cat-05', note: 'Nonton bioskop',            created_at: '2026-10-10T15:00:00' },
    { id: 'tx-09', type: 'expense', amount: 30000,   date: '2026-10-11', category_id: 'cat-02', note: 'Bensin motor',              created_at: '2026-10-11T08:00:00' },
    { id: 'tx-10', type: 'expense', amount: 350000,  date: '2026-10-13', category_id: 'cat-06', note: 'Beli baju di Shopee',       created_at: '2026-10-13T14:00:00' },
    { id: 'tx-11', type: 'income',  amount: 200000,  date: '2026-10-15', category_id: 'cat-10', note: 'Bonus proyek kantor',       created_at: '2026-10-15T10:00:00' },
    { id: 'tx-12', type: 'expense', amount: 20000,   date: '2026-10-16', category_id: 'cat-01', note: 'Sarapan nasi uduk',         created_at: '2026-10-16T07:00:00' },
    { id: 'tx-13', type: 'expense', amount: 75000,   date: '2026-10-18', category_id: 'cat-04', note: 'Tagihan internet',          created_at: '2026-10-18T09:00:00' },
    { id: 'tx-14', type: 'expense', amount: 60000,   date: '2026-10-19', category_id: 'cat-07', note: 'Obat di apotek',            created_at: '2026-10-19T16:00:00' },
    { id: 'tx-15', type: 'expense', amount: 35000,   date: '2026-10-20', category_id: 'cat-01', note: 'Makan siang bakso',         created_at: '2026-10-20T12:00:00' },
  ],

  /* ==========================================================
     ANGGARAN — 4 item (1 safe, 1 warning, 1 danger, 1 no-budget)
     Kolom 'spent' = total pengeluaran kategori bulan ini
  ========================================================== */
  budgets: [
    { id: 'bud-01', category_id: 'cat-01', amount: 600000, period: 'monthly', spent: 125000 }, // safe  ~21%
    { id: 'bud-02', category_id: 'cat-02', amount: 200000, period: 'monthly', spent: 165000 }, // warning ~83%
    { id: 'bud-03', category_id: 'cat-05', amount: 150000, period: 'monthly', spent: 200000 }, // danger 133%
    // cat-06 (Belanja) sengaja tidak ada budget → no-budget
  ],

  /* ==========================================================
     TAGIHAN BERULANG — 3 item
  ========================================================== */
  recurringBills: [
    {
      id: 'bill-01',
      name: 'Kos',
      amount: 800000,
      due_day: 1,
      frequency: 'monthly',
      next_due: '2026-10-01', // jatuh tempo hari ini (disesuaikan runtime)
      is_paid_this_period: false,
    },
    {
      id: 'bill-02',
      name: 'Spotify',
      amount: 54990,
      due_day: 25,
      frequency: 'monthly',
      next_due: '2026-10-25', // belum jatuh tempo
      is_paid_this_period: false,
    },
    {
      id: 'bill-03',
      name: 'Internet',
      amount: 150000,
      due_day: 10,
      frequency: 'monthly',
      next_due: '2026-11-10', // sudah lunas bulan ini
      is_paid_this_period: true,
    },
  ],

  /* ==========================================================
     TARGET TABUNGAN — 3 item (active 60%, completed, overdue)
  ========================================================== */
  savingsGoals: [
    {
      id: 'goal-01',
      name: 'DP Motor',
      target_amount: 5000000,
      saved_amount:  3000000,
      deadline: '2027-06-01',
      status: 'active',
    },
    {
      id: 'goal-02',
      name: 'Laptop Baru',
      target_amount: 8000000,
      saved_amount:  8000000,
      deadline: '2026-09-01',
      status: 'completed',
    },
    {
      id: 'goal-03',
      name: 'Liburan Bali',
      target_amount: 3000000,
      saved_amount:  1200000,
      deadline: '2026-08-01', // sudah lewat
      status: 'overdue',
    },
  ],

  /* ==========================================================
     DASHBOARD — ringkasan siap pakai
  ========================================================== */
  get dashboard() {
    const income  = this.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = this.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return {
      balance:       income - expense,
      total_income:  income,
      total_expense: expense,
      recent_transactions: [...this.transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
      upcoming_bills: this.recurringBills.filter(b => !b.is_paid_this_period),
      budget_summary: this.budgets.map(b => {
        const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
        return {
          ...b,
          percentage: Math.round(pct),
          status: pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'safe',
        };
      }),
    };
  },
};
