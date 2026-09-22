"""
db.py — MongoDB client & index initialization.

Di environment serverless (Vercel), setiap invocation bisa berjalan di
process yang berbeda. Kita tetap pakai module-level singleton karena Vercel
menggunakan "Fluid compute" yang me-reuse warm instances — connection reuse
tetap terjadi selama instance masih warm.

maxPoolSize=10 (bukan 50) karena serverless bisa spawn banyak instance
serentak; pool kecil per-instance mencegah MongoDB Atlas kehabisan connection.
"""

from pymongo import ASCENDING, DESCENDING, MongoClient

from config import Config

_client: MongoClient | None = None


def get_client() -> MongoClient:
    """Return module-level MongoDB client, buat baru jika belum ada."""
    global _client
    if _client is None:
        _client = MongoClient(
            Config.MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
            maxPoolSize=10,        # kecil agar aman di serverless multi-instance
            minPoolSize=0,         # boleh tutup semua connection saat idle
            maxIdleTimeMS=45000,   # tutup connection idle > 45 detik
        )
    return _client


def get_db():
    """Return the configured MongoDB database."""
    return get_client()[Config.MONGO_DB]


def init_indexes():
    """Create all application indexes; MongoDB makes this operation idempotent."""
    database = get_db()
    database.devices.create_index('device_id', unique=True, name='uq_devices_device_id')

    database.categories.create_index(
        [('device_id', ASCENDING), ('type', ASCENDING)],
        name='idx_categories_device_type',
    )
    database.categories.create_index(
        [
            ('device_id', ASCENDING),
            ('type', ASCENDING),
            ('name_lower', ASCENDING),
        ],
        unique=True,
        name='uq_categories_device_type_name',
    )

    database.transactions.create_index(
        [('device_id', ASCENDING), ('date', DESCENDING)],
        name='idx_transactions_device_date',
    )
    database.transactions.create_index(
        [('device_id', ASCENDING), ('category_id', ASCENDING)],
        name='idx_transactions_device_category',
    )

    database.budgets.create_index(
        [
            ('device_id', ASCENDING),
            ('category_id', ASCENDING),
            ('period', ASCENDING),
        ],
        unique=True,
        name='uq_budgets_device_category_period',
    )
    database.recurring_bills.create_index(
        [('device_id', ASCENDING), ('next_due', ASCENDING)],
        name='idx_recurring_bills_device_next_due',
    )
    database.savings_goals.create_index(
        [('device_id', ASCENDING), ('status', ASCENDING)],
        name='idx_savings_goals_device_status',
    )
