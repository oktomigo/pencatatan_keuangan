from functools import lru_cache

from pymongo import ASCENDING, DESCENDING, MongoClient

from config import Config


@lru_cache(maxsize=1)
def get_client():
    """Return the process-wide MongoDB client."""
    return MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=2000)


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