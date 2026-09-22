"""
main.py — Flask app untuk aplikasi pencatatan keuangan harian.
Flask me-render template HTML per route. Static files di static/.
"""

import logging
import time
import uuid
import calendar
from io import BytesIO
from datetime import datetime, timezone, timedelta
from datetime import date as date_type

from flask import Flask, g, jsonify, render_template, redirect, url_for, request, send_file
from flask_cors import CORS
from bson import ObjectId
from pymongo.errors import PyMongoError

from config import Config
from db import get_db, init_indexes
from middleware.device import register_device_middleware, is_valid_device_id
from utils_api import fail, ok

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, origins=Config.CORS_ORIGINS)
register_device_middleware(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
_rate_limit = {}

try:
    init_indexes()
except PyMongoError:
    logger.warning('MongoDB tidak tersedia; index akan dibuat saat startup berikutnya.')


@app.before_request
def rate_limit_api():
    if not request.path.startswith('/api/') or request.path in {'/api/health', '/api/init'}:
        return None
    now = time.monotonic()
    key = request.headers.get('X-Device-ID') or request.remote_addr or 'anonymous'
    window_start, count = _rate_limit.get(key, (now, 0))
    if now - window_start >= 60:
        window_start, count = now, 0
    count += 1
    _rate_limit[key] = (window_start, count)
    if len(_rate_limit) > 1000:
        for rate_key, (started, _) in list(_rate_limit.items()):
            if now - started >= 60:
                _rate_limit.pop(rate_key, None)
    if count > 120:
        return fail('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi nanti.', status=429)
    return None


@app.errorhandler(404)
def handle_not_found(error):
    if request.path.startswith('/api/'):
        return fail('NOT_FOUND', 'Data tidak ditemukan.', status=404)
    return error


@app.errorhandler(500)
def handle_server_error(error):
    logger.exception('Unhandled server error on %s', request.path)
    if request.path.startswith('/api/'):
        return fail('STORAGE_ERROR', 'Gagal memuat data. Coba refresh halaman.', status=500)
    return error


# ============================================================
# HALAMAN — satu route per halaman, render template masing-masing
# ============================================================

@app.route('/')
def index():
    """Redirect root ke dashboard."""
    return redirect(url_for('dashboard'))


@app.route('/onboarding')
def onboarding():
    return render_template('onboarding.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


@app.route('/transactions')
def transactions():
    return render_template('transactions.html')


@app.route('/categories')
def categories():
    return render_template('categories.html')


@app.route('/budgets')
def budgets():
    return render_template('budgets.html')


@app.route('/reports')
def reports():
    return render_template('reports.html')


@app.route('/recurring-bills')
def recurring_bills():
    return render_template('recurring_bills.html')


@app.route('/savings')
def savings():
    return render_template('savings.html')


@app.route('/export')
def export():
    return render_template('export.html')


@app.route('/settings')
def settings():
    return render_template('settings.html')


# ============================================================
# API ROUTES — placeholder, diimplementasi di Fase 3
# ============================================================

@app.route('/api/health')
def api_health():
    """Health check."""
    try:
        get_db().command('ping')
    except PyMongoError:
        return fail(
            'STORAGE_ERROR',
            'Gagal memuat data. Coba refresh halaman.',
            status=500,
        )
    return ok({'db': 'ok'})


DEFAULT_CATEGORIES = [
    ('Gaji', 'income', 'wallet', '#22C55E'),
    ('Freelance', 'income', 'laptop', '#06B6D4'),
    ('Bonus', 'income', 'gift', '#F97316'),
    ('Makan', 'expense', 'utensils', '#0D9488'),
    ('Transport', 'expense', 'bus', '#3B82F6'),
    ('Kos', 'expense', 'house', '#8B5CF6'),
    ('Tagihan', 'expense', 'file-text', '#F59E0B'),
    ('Hiburan', 'expense', 'gamepad-2', '#EC4899'),
    ('Belanja', 'expense', 'shopping-bag', '#14B8A6'),
    ('Kesehatan', 'expense', 'heart-pulse', '#EF4444'),
    ('Lainnya', 'expense', 'package', '#6B7280'),
]


def serialize_category(category):
    return {
        'id': str(category['_id']),
        'name': category['name'],
        'type': category['type'],
        'is_default': category.get('is_default', False),
        'icon': category.get('icon', 'tag'),
        'color': category.get('color', '#0D9488'),
    }


def serialize_transaction(database, transaction):
    category = database.categories.find_one({'device_id': transaction['device_id'], 'id': transaction['category_id']})
    if not category:
        try:
            category = database.categories.find_one({'device_id': transaction['device_id'], '_id': ObjectId(transaction['category_id'])})
        except Exception:
            category = None
    return {
        'id': str(transaction['_id']),
        'type': transaction['type'],
        'amount': transaction['amount'],
        'date': transaction['date'],
        'category_id': transaction['category_id'],
        'category_name': category['name'] if category else 'Lainnya',
        'category_icon': category.get('icon', 'tag') if category else 'tag',
        'category_color': category.get('color', '#0D9488') if category else '#0D9488',
        'note': transaction.get('note', ''),
        'created_at': transaction.get('created_at'),
        'updated_at': transaction.get('updated_at'),
    }


def validate_transaction(database, device_id, body):
    errors = {}
    if body.get('type') not in {'income', 'expense'}:
        errors['type'] = 'Jenis wajib dipilih'
    amount = body.get('amount')
    if amount is None or amount == '':
        errors['amount'] = 'Nominal wajib diisi'
    elif not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0 or amount > Config.MAX_AMOUNT:
        errors['amount'] = 'Nominal harus berupa angka lebih dari 0 dan tidak melebihi 999.999.999.999'
    transaction_date = body.get('date')
    if not transaction_date:
        errors['date'] = 'Tanggal wajib diisi'
    else:
        try:
            date_type.fromisoformat(transaction_date)
        except (TypeError, ValueError):
            errors['date'] = 'Tanggal tidak valid'
    category_id = body.get('category_id')
    if not category_id:
        errors['category_id'] = 'Kategori wajib dipilih'
    elif body.get('type') in {'income', 'expense'}:
        category = None
        try:
            category = database.categories.find_one({'_id': ObjectId(category_id), 'device_id': device_id})
        except Exception:
            category = None
        if not category or category['type'] != body['type']:
            errors['category_id'] = 'Kategori tidak valid'
    note = body.get('note', '')
    if not isinstance(note, str) or len(note) > 255:
        errors['note'] = 'Catatan maksimal 255 karakter'
    return errors


def find_category(database, device_id, category_id):
    if not category_id or not ObjectId.is_valid(str(category_id)):
        return None
    return database.categories.find_one({'_id': ObjectId(category_id), 'device_id': device_id})


def active_period_bounds(period='monthly'):
    now = datetime.now().date()
    if period == 'weekly':
        start = now - timedelta(days=now.weekday())
        end = start + timedelta(days=6)
        label = now.strftime('%Y-W%V')
    else:
        start = now.replace(day=1)
        next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        end = next_month - timedelta(days=1)
        label = now.strftime('%Y-%m')
    return start.isoformat(), end.isoformat(), label


def serialize_budget(database, budget):
    start, end, period_label = active_period_bounds(budget['period'])
    spent = sum(item['amount'] for item in database.transactions.find({'device_id': budget['device_id'], 'category_id': budget['category_id'], 'type': 'expense', 'date': {'$gte': start, '$lte': end}}))
    percentage = round((spent / budget['amount']) * 100, 1)
    status = 'danger' if percentage >= 100 else 'warning' if percentage >= 80 else 'safe'
    category = find_category(database, budget['device_id'], budget['category_id'])
    return {'id': str(budget['_id']), 'category_id': budget['category_id'], 'category_name': category['name'] if category else 'Lainnya', 'icon': category.get('icon') if category else 'tag', 'color': category.get('color') if category else '#0D9488', 'amount': budget['amount'], 'spent': spent, 'remaining': budget['amount'] - spent, 'period': budget['period'], 'percentage': percentage, 'status': status, 'notify': None, 'notified_period': period_label}


def serialize_bill(bill):
    return {key: (str(bill[key]) if key == '_id' else bill.get(key)) for key in ('_id', 'name', 'amount', 'due_day', 'frequency', 'next_due', 'is_active', 'category_id', 'last_paid_at') } | {'id': str(bill['_id']), 'days_left': (date_type.fromisoformat(bill['next_due']) - datetime.now().date()).days, 'is_due_today': bill['next_due'] == datetime.now().date().isoformat()}


def calc_next_due(current_date, frequency, due_day):
    if frequency == 'weekly':
        days_ahead = (due_day - current_date.weekday()) % 7 or 7
        return current_date + timedelta(days=days_ahead)
    if frequency == 'yearly':
        year = current_date.year + 1
        month = current_date.month
        day = min(due_day, calendar.monthrange(year, month)[1])
        return date_type(year, month, day)
    month = current_date.month + 1
    year = current_date.year + (month == 13)
    month = 1 if month == 13 else month
    day = min(due_day, calendar.monthrange(year, month)[1])
    return date_type(year, month, day)


def serialize_goal(goal):
    percentage = round(goal.get('saved_amount', 0) / goal['target_amount'] * 100, 1)
    return {'id': str(goal['_id']), 'name': goal['name'], 'target_amount': goal['target_amount'], 'saved_amount': goal.get('saved_amount', 0), 'deadline': goal['deadline'], 'status': 'completed' if percentage >= 100 else 'overdue' if goal['deadline'] < datetime.now().date().isoformat() else 'active', 'percentage': min(percentage, 100)}


@app.route('/api/init', methods=['POST'])
def api_init():
    body = request.get_json(silent=True) or {}
    requested_id = body.get('device_id')
    device_id = requested_id or str(uuid.uuid4())
    if not is_valid_device_id(device_id):
        return fail('VALIDATION_ERROR', 'Perangkat belum dikenali.', status=400)

    now = datetime.now(timezone.utc).isoformat()
    database = get_db()
    existing = database.devices.find_one({'device_id': device_id})
    database.devices.update_one(
        {'device_id': device_id},
        {'$set': {'last_seen_at': now}, '$setOnInsert': {'device_id': device_id, 'created_at': now, 'seeded': False}},
        upsert=True,
    )
    if not existing or not existing.get('seeded'):
        for name, category_type, icon, color in DEFAULT_CATEGORIES:
            database.categories.update_one(
                {'device_id': device_id, 'type': category_type, 'name_lower': name.lower()},
                {'$setOnInsert': {'name': name, 'name_lower': name.lower(), 'type': category_type, 'device_id': device_id, 'is_default': True, 'icon': icon, 'color': color, 'created_at': now}},
                upsert=True,
            )
        database.devices.update_one({'device_id': device_id}, {'$set': {'seeded': True}})

    categories = [serialize_category(item) for item in database.categories.find({'device_id': device_id}).sort([('is_default', -1), ('name', 1)])]
    return ok({'device_id': device_id, 'is_new': existing is None, 'categories': categories})


@app.route('/api/transactions', methods=['GET', 'POST'])
def api_transactions():
    database = get_db()
    device_id = g.device_id
    if request.method == 'GET':
        query = {'device_id': device_id}
        transaction_type = request.args.get('type')
        category_id = request.args.get('category_id')
        start = request.args.get('start')
        end = request.args.get('end')
        if transaction_type in {'income', 'expense'}:
            query['type'] = transaction_type
        if category_id:
            query['category_id'] = category_id
        if request.args.get('month') and request.args.get('year'):
            year = int(request.args['year'])
            month = int(request.args['month'])
            query['date'] = {'$gte': f'{year:04d}-{month:02d}-01', '$lt': f'{year + (month == 12):04d}-{1 if month == 12 else month + 1:02d}-01'}
        elif start or end:
            if start and end and start > end:
                return fail('VALIDATION_ERROR', 'Tanggal mulai tidak boleh setelah tanggal akhir')
            query['date'] = {}
            if start:
                query['date']['$gte'] = start
            if end:
                query['date']['$lte'] = end
        if request.args.get('q'):
            query['note'] = {'$regex': request.args['q'], '$options': 'i'}
        limit = min(max(int(request.args.get('limit', 50)), 1), 100)
        skip = max(int(request.args.get('skip', 0)), 0)
        records = list(database.transactions.find(query).sort([('date', -1), ('created_at', -1)]).skip(skip).limit(limit))
        items = [serialize_transaction(database, item) for item in records]
        total = database.transactions.count_documents(query)
        income = sum(item['amount'] for item in database.transactions.find({**query, 'type': 'income'}))
        expense = sum(item['amount'] for item in database.transactions.find({**query, 'type': 'expense'}))
        return ok(items, meta={'total': total, 'limit': limit, 'skip': skip, 'total_income': income, 'total_expense': expense, 'balance': income - expense})

    body = request.get_json(silent=True) or {}
    errors = validate_transaction(database, device_id, body)
    if errors:
        return fail('VALIDATION_ERROR', 'Data transaksi tidak valid.', fields=errors)
    now = datetime.now(timezone.utc).isoformat()
    transaction = {'device_id': device_id, 'type': body['type'], 'amount': body['amount'], 'date': body['date'], 'category_id': body['category_id'], 'note': body.get('note', '').strip(), 'created_at': now, 'updated_at': now}
    result = database.transactions.insert_one(transaction)
    transaction['_id'] = result.inserted_id
    return ok(serialize_transaction(database, transaction), status=201)


@app.route('/api/transactions/<tx_id>', methods=['PUT', 'DELETE'])
def api_transaction(tx_id):
    if not ObjectId.is_valid(tx_id):
        return fail('NOT_FOUND', 'Data tidak ditemukan.', status=404)
    database = get_db()
    query = {'_id': ObjectId(tx_id), 'device_id': g.device_id}
    existing = database.transactions.find_one(query)
    if not existing:
        return fail('NOT_FOUND', 'Data tidak ditemukan.', status=404)
    if request.method == 'DELETE':
        database.transactions.delete_one(query)
        return ok({'id': tx_id})
    body = request.get_json(silent=True) or {}
    errors = validate_transaction(database, g.device_id, body)
    if errors:
        return fail('VALIDATION_ERROR', 'Data transaksi tidak valid.', fields=errors)
    now = datetime.now(timezone.utc).isoformat()
    database.transactions.update_one(query, {'$set': {'type': body['type'], 'amount': body['amount'], 'date': body['date'], 'category_id': body['category_id'], 'note': body.get('note', '').strip(), 'updated_at': now}})
    return ok(serialize_transaction(database, database.transactions.find_one(query)))


@app.route('/api/categories', methods=['GET', 'POST'])
def api_categories():
    database = get_db()
    device_id = g.device_id
    if request.method == 'GET':
        category_type = request.args.get('type')
        query = {'device_id': device_id}
        if category_type in {'income', 'expense'}:
            query['type'] = category_type
        categories = [serialize_category(item) for item in database.categories.find(query).sort([('is_default', -1), ('name', 1)])]
        return ok(categories)

    body = request.get_json(silent=True) or {}
    name = str(body.get('name', '')).strip()
    category_type = body.get('type')
    if not name:
        return fail('VALIDATION_ERROR', 'Nama kategori wajib diisi', fields={'name': 'Nama kategori wajib diisi'})
    if len(name) > 50:
        return fail('VALIDATION_ERROR', 'Nama kategori maksimal 50 karakter', fields={'name': 'Nama kategori maksimal 50 karakter'})
    if category_type not in {'income', 'expense'}:
        return fail('VALIDATION_ERROR', 'Jenis kategori tidak valid', fields={'type': 'Jenis kategori tidak valid'})
    if database.categories.find_one({'device_id': device_id, 'type': category_type, 'name_lower': name.lower()}):
        return fail('CONFLICT', 'Nama kategori sudah digunakan', status=409)
    custom_count = database.categories.count_documents({'device_id': device_id, 'type': category_type, 'is_default': False})
    if custom_count >= 50:
        return fail('VALIDATION_ERROR', 'Maksimal 50 kategori per tipe')
    document = {'device_id': device_id, 'name': name, 'name_lower': name.lower(), 'type': category_type, 'is_default': False, 'icon': body.get('icon', 'tag'), 'color': body.get('color', '#0D9488'), 'created_at': datetime.now(timezone.utc).isoformat()}
    result = database.categories.insert_one(document)
    document['_id'] = result.inserted_id
    return ok(serialize_category(document), status=201)


@app.route('/api/categories/<cat_id>', methods=['PUT', 'DELETE'])
def api_category(cat_id):
    database = get_db()
    device_id = g.device_id
    if not ObjectId.is_valid(cat_id):
        return fail('NOT_FOUND', 'Data tidak ditemukan.', status=404)
    category_id = ObjectId(cat_id)
    category = database.categories.find_one({'_id': category_id, 'device_id': device_id})
    if not category:
        return fail('NOT_FOUND', 'Data tidak ditemukan.', status=404)
    if category.get('is_default'):
        return fail('VALIDATION_ERROR', 'Kategori default tidak dapat diubah')

    if request.method == 'PUT':
        body = request.get_json(silent=True) or {}
        update = {}
        if 'name' in body:
            name = str(body.get('name', '')).strip()
            if not name:
                return fail('VALIDATION_ERROR', 'Nama kategori wajib diisi', fields={'name': 'Nama kategori wajib diisi'})
            if len(name) > 50:
                return fail('VALIDATION_ERROR', 'Nama kategori maksimal 50 karakter', fields={'name': 'Nama kategori maksimal 50 karakter'})
            duplicate = database.categories.find_one({'device_id': device_id, 'type': category['type'], 'name_lower': name.lower(), '_id': {'$ne': category_id}})
            if duplicate:
                return fail('CONFLICT', 'Nama kategori sudah digunakan', status=409)
            update.update({'name': name, 'name_lower': name.lower()})
        for field in ('icon', 'color'):
            if field in body:
                update[field] = body[field]
        if update:
            database.categories.update_one({'_id': category_id, 'device_id': device_id}, {'$set': update})
        updated = database.categories.find_one({'_id': category_id})
        return ok(serialize_category(updated))

    transaction_count = database.transactions.count_documents({'device_id': device_id, 'category_id': cat_id})
    reassign_to = request.args.get('reassign_to')
    if transaction_count and not reassign_to:
        targets = [serialize_category(item) for item in database.categories.find({'device_id': device_id, 'type': category['type'], '_id': {'$ne': category_id}}).sort('name', 1)]
        return fail('CONFLICT', 'Kategori masih memiliki transaksi', data={'transaction_count': transaction_count, 'available_targets': targets}, status=409)
    if reassign_to:
        if not ObjectId.is_valid(reassign_to) or reassign_to == cat_id:
            return fail('VALIDATION_ERROR', 'Kategori tujuan tidak valid')
        target = database.categories.find_one({'_id': ObjectId(reassign_to), 'device_id': device_id, 'type': category['type']})
        if not target:
            return fail('VALIDATION_ERROR', 'Kategori tujuan tidak valid')
        database.transactions.update_many({'device_id': device_id, 'category_id': cat_id}, {'$set': {'category_id': reassign_to}})
    database.categories.delete_one({'_id': category_id, 'device_id': device_id})
    database.budgets.delete_many({'device_id': device_id, 'category_id': cat_id})
    return ok({'id': cat_id})


@app.route('/api/budgets', methods=['GET', 'POST'])
def api_budgets():
    database = get_db()
    device_id = g.device_id
    period = request.args.get('period', 'monthly')
    if period not in {'monthly', 'weekly'}:
        period = 'monthly'
    if request.method == 'POST':
        body = request.get_json(silent=True) or {}
        category = find_category(database, device_id, body.get('category_id'))
        amount = body.get('amount')
        errors = {}
        if not category or category['type'] != 'expense': errors['category_id'] = 'Kategori tidak valid'
        if not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0 or amount > Config.MAX_AMOUNT: errors['amount'] = 'Nominal anggaran tidak valid'
        if errors: return fail('VALIDATION_ERROR', 'Data anggaran tidak valid.', fields=errors)
        period = body.get('period', 'monthly')
        if period not in {'monthly', 'weekly'}: return fail('VALIDATION_ERROR', 'Periode anggaran tidak valid')
        if database.budgets.find_one({'device_id': device_id, 'category_id': body['category_id'], 'period': period}): return fail('CONFLICT', 'Anggaran kategori ini sudah ada', status=409)
        result = database.budgets.insert_one({'device_id': device_id, 'category_id': body['category_id'], 'amount': amount, 'period': period, 'created_at': datetime.now(timezone.utc).isoformat(), 'updated_at': datetime.now(timezone.utc).isoformat(), 'notified_80': False, 'notified_100': False, 'notified_period': ''})
        budget = database.budgets.find_one({'_id': result.inserted_id})
        return ok(serialize_budget(database, budget), status=201)
    return ok([serialize_budget(database, budget) for budget in database.budgets.find({'device_id': device_id, 'period': period})])


@app.route('/api/budgets/<bud_id>', methods=['PUT', 'DELETE'])
def api_budget(bud_id):
    if not ObjectId.is_valid(bud_id): return fail('NOT_FOUND', 'Data tidak ditemukan.', status=404)
    database = get_db(); query = {'_id': ObjectId(bud_id), 'device_id': g.device_id}; budget = database.budgets.find_one(query)
    if not budget: return fail('NOT_FOUND', 'Data tidak ditemukan.', status=404)
    if request.method == 'DELETE': database.budgets.delete_one(query); return ok({'id': bud_id})
    body = request.get_json(silent=True) or {}; amount = body.get('amount', budget['amount']); period = body.get('period', budget['period'])
    if not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0 or amount > Config.MAX_AMOUNT: return fail('VALIDATION_ERROR', 'Nominal anggaran tidak valid')
    if period not in {'monthly', 'weekly'}: return fail('VALIDATION_ERROR', 'Periode anggaran tidak valid')
    duplicate = database.budgets.find_one({'device_id': g.device_id, 'category_id': budget['category_id'], 'period': period, '_id': {'$ne': budget['_id']}})
    if duplicate: return fail('CONFLICT', 'Anggaran kategori ini sudah ada', status=409)
    database.budgets.update_one(query, {'$set': {'amount': amount, 'period': period, 'updated_at': datetime.now(timezone.utc).isoformat()}})
    return ok(serialize_budget(database, database.budgets.find_one(query)))


@app.route('/api/recurring-bills', methods=['GET', 'POST'])
def api_recurring_bills():
    database = get_db(); device_id = g.device_id
    if request.method == 'POST':
        body = request.get_json(silent=True) or {}; name = str(body.get('name', '')).strip(); amount = body.get('amount'); frequency = body.get('frequency', 'monthly'); due_day = body.get('due_day')
        if not name: return fail('VALIDATION_ERROR', 'Nama tagihan wajib diisi')
        if not isinstance(amount, int) or amount <= 0 or amount > Config.MAX_AMOUNT: return fail('VALIDATION_ERROR', 'Nominal harus berupa angka lebih dari 0 dan tidak melebihi 999.999.999.999')
        if frequency not in {'monthly', 'weekly', 'yearly'}: return fail('VALIDATION_ERROR', 'Frekuensi tidak valid')
        if not isinstance(due_day, int) or due_day < 0 or due_day > 31: return fail('VALIDATION_ERROR', 'Tanggal jatuh tempo tidak valid')
        next_due = datetime.now().date().isoformat(); document = {'device_id': device_id, 'name': name, 'amount': amount, 'due_day': due_day, 'frequency': frequency, 'next_due': next_due, 'is_active': True, 'category_id': body.get('category_id'), 'last_paid_at': None, 'created_at': datetime.now(timezone.utc).isoformat()}; result = database.recurring_bills.insert_one(document); document['_id'] = result.inserted_id; return ok(serialize_bill(document), status=201)
    return ok([serialize_bill(item) for item in database.recurring_bills.find({'device_id': device_id, 'is_active': True}).sort('next_due', 1)])


@app.route('/api/recurring-bills/<bill_id>', methods=['PUT', 'DELETE'])
def api_recurring_bill(bill_id):
    database = get_db(); query = {'_id': ObjectId(bill_id), 'device_id': g.device_id} if ObjectId.is_valid(bill_id) else None
    bill = database.recurring_bills.find_one(query) if query else None
    if not bill: return fail('NOT_FOUND', 'Data tidak ditemukan.', status=404)
    if request.method == 'DELETE': database.recurring_bills.delete_one(query); return ok({'id': bill_id})
    body = request.get_json(silent=True) or {}; database.recurring_bills.update_one(query, {'$set': {key: body[key] for key in ('name','amount','due_day','frequency','category_id') if key in body}}); return ok(serialize_bill(database.recurring_bills.find_one(query)))


@app.route('/api/recurring-bills/<bill_id>/pay', methods=['POST'])
@app.route('/api/recurring-bills/<bill_id>/mark-paid', methods=['POST'])
def api_mark_paid(bill_id):
    database = get_db(); bill = database.recurring_bills.find_one({'_id': ObjectId(bill_id), 'device_id': g.device_id}) if ObjectId.is_valid(bill_id) else None
    if not bill: return fail('NOT_FOUND', 'Data tidak ditemukan.', status=404)
    if (bill.get('last_paid_at') or '').startswith(datetime.now().date().isoformat()): return fail('CONFLICT', 'Tagihan ini sudah ditandai lunas untuk periode ini', status=409)
    category = find_category(database, g.device_id, bill.get('category_id')) or database.categories.find_one({'device_id': g.device_id, 'name_lower': 'tagihan'})
    today = datetime.now().date(); transaction = {'device_id': g.device_id, 'type': 'expense', 'amount': bill['amount'], 'date': today.isoformat(), 'category_id': str(category['_id']), 'note': bill['name'], 'created_at': datetime.now(timezone.utc).isoformat(), 'updated_at': datetime.now(timezone.utc).isoformat()}; result = database.transactions.insert_one(transaction); transaction['_id'] = result.inserted_id; database.recurring_bills.update_one({'_id': bill['_id']}, {'$set': {'last_paid_at': datetime.now(timezone.utc).isoformat(), 'next_due': calc_next_due(today, bill['frequency'], bill['due_day']).isoformat()}}); return ok({'bill': serialize_bill(database.recurring_bills.find_one({'_id': bill['_id']})), 'transaction': serialize_transaction(database, transaction)})


@app.route('/api/savings-goals', methods=['GET', 'POST'])
def api_savings_goals():
    database = get_db(); device_id = g.device_id
    if request.method == 'POST':
        body = request.get_json(silent=True) or {}; name = str(body.get('name', '')).strip(); target = body.get('target_amount'); deadline = body.get('deadline')
        if not name or not isinstance(target, int) or target <= 0 or target > Config.MAX_AMOUNT or not deadline: return fail('VALIDATION_ERROR', 'Data target tabungan tidak valid')
        document = {'device_id': device_id, 'name': name, 'target_amount': target, 'saved_amount': 0, 'deadline': deadline, 'status': 'active', 'created_at': datetime.now(timezone.utc).isoformat()}; result = database.savings_goals.insert_one(document); document['_id'] = result.inserted_id; return ok(serialize_goal(document), status=201)
    return ok([serialize_goal(item) for item in database.savings_goals.find({'device_id': device_id})])


@app.route('/api/savings-goals/<goal_id>', methods=['PUT', 'DELETE'])
def api_savings_goal(goal_id):
    database = get_db(); query = {'_id': ObjectId(goal_id), 'device_id': g.device_id} if ObjectId.is_valid(goal_id) else None; goal = database.savings_goals.find_one(query) if query else None
    if not goal: return fail('NOT_FOUND', 'Data tidak ditemukan.', status=404)
    if request.method == 'DELETE': database.savings_goals.delete_one(query); database.savings_entries.delete_many({'goal_id': goal_id}); return ok({'id': goal_id})
    body = request.get_json(silent=True) or {}; database.savings_goals.update_one(query, {'$set': {key: body[key] for key in ('name','target_amount','deadline') if key in body}}); return ok(serialize_goal(database.savings_goals.find_one(query)))


@app.route('/api/savings-goals/<goal_id>/add-funds', methods=['POST'])
def api_add_funds(goal_id):
    database = get_db(); goal = database.savings_goals.find_one({'_id': ObjectId(goal_id), 'device_id': g.device_id}) if ObjectId.is_valid(goal_id) else None; body = request.get_json(silent=True) or {}; amount = body.get('amount')
    if not goal: return fail('NOT_FOUND', 'Data tidak ditemukan.', status=404)
    if not isinstance(amount, int) or amount <= 0: return fail('VALIDATION_ERROR', 'Nominal harus berupa angka lebih dari 0 dan tidak melebihi 999.999.999.999')
    database.savings_entries.insert_one({'device_id': g.device_id, 'goal_id': goal_id, 'amount': amount, 'date': datetime.now().date().isoformat(), 'note': body.get('note', '')}); database.savings_goals.update_one({'_id': goal['_id']}, {'$inc': {'saved_amount': amount}}); return ok(serialize_goal(database.savings_goals.find_one({'_id': goal['_id']})))


@app.route('/api/dashboard', methods=['GET'])
def api_dashboard():
    database = get_db(); device_id = g.device_id
    now = datetime.now().date(); start = now.replace(day=1).isoformat(); next_month = (now.replace(day=28) + timedelta(days=4)).replace(day=1).isoformat()
    month_query = {'device_id': device_id, 'date': {'$gte': start, '$lt': next_month}}
    income = sum(item['amount'] for item in database.transactions.find({**month_query, 'type': 'income'})); expense = sum(item['amount'] for item in database.transactions.find({**month_query, 'type': 'expense'}))
    recent = [serialize_transaction(database, item) for item in database.transactions.find({'device_id': device_id}).sort([('date', -1), ('created_at', -1)]).limit(5)]
    budgets = [serialize_budget(database, item) for item in database.budgets.find({'device_id': device_id})]
    return ok({'period': {'month': now.month, 'year': now.year, 'label': now.strftime('%B %Y')}, 'summary': {'balance': income - expense, 'total_income': income, 'total_expense': expense}, 'recent_transactions': recent, 'upcoming_bills': [], 'budgets': budgets, 'savings_summary': {'active_goals': 0, 'total_saved': 0, 'total_target': 0}})


@app.route('/api/reports', methods=['GET'])
def api_reports():
    database = get_db(); device_id = g.device_id; period = request.args.get('period', 'month'); now = datetime.now().date()
    if period == 'custom': start, end = request.args.get('start'), request.args.get('end')
    elif period == 'year': start, end = f'{now.year}-01-01', f'{now.year}-12-31'
    else:
        month = int(request.args.get('month', now.month)); year = int(request.args.get('year', now.year)); start = f'{year:04d}-{month:02d}-01'; next_month = (date_type(year, month, 1).replace(day=28) + timedelta(days=4)).replace(day=1); end = (next_month - timedelta(days=1)).isoformat()
    if not start or not end: return fail('VALIDATION_ERROR', 'Tanggal mulai dan akhir wajib diisi')
    if start > end: return fail('VALIDATION_ERROR', 'Tanggal mulai tidak boleh setelah tanggal akhir')
    records = list(database.transactions.find({'device_id': device_id, 'date': {'$gte': start, '$lte': end}}).sort('date', 1))
    total_income = sum(item['amount'] for item in records if item['type'] == 'income'); total_expense = sum(item['amount'] for item in records if item['type'] == 'expense')
    groups = {}
    for item in records:
        key = item['category_id']; groups.setdefault(key, {'income': 0, 'expense': 0, 'count': 0}); groups[key][item['type']] += item['amount']; groups[key]['count'] += 1
    by_category = []
    for category_id, values in groups.items():
        category = find_category(database, device_id, category_id); total = values['expense'] or values['income']; base = total_expense if values['expense'] else total_income
        by_category.append({'category_id': category_id, 'name': category['name'] if category else 'Lainnya', 'icon': category.get('icon') if category else 'tag', 'color': category.get('color') if category else '#0D9488', 'type': 'expense' if values['expense'] else 'income', 'total': total, 'percentage': round(total / base * 100, 1) if base else 0, 'transaction_count': values['count']})
    daily = {}; cursor = date_type.fromisoformat(start); end_date = date_type.fromisoformat(end)
    while cursor <= end_date: daily[cursor.isoformat()] = {'date': cursor.isoformat(), 'income': 0, 'expense': 0}; cursor += timedelta(days=1)
    for item in records: daily[item['date']][item['type']] += item['amount']
    return ok({'period': {'type': period, 'start': start, 'end': end}, 'summary': {'total_income': total_income, 'total_expense': total_expense, 'balance': total_income - total_expense, 'transaction_count': len(records)}, 'by_category': by_category, 'daily_trend': list(daily.values()), 'top_expense_categories': sorted([item for item in by_category if item['type'] == 'expense'], key=lambda item: item['total'], reverse=True)[:5], 'is_empty': not records})


@app.route('/api/export', methods=['POST'])
def api_export():
    body = request.get_json(silent=True) or {}; period = body.get('period', {}); start = period.get('start'); end = period.get('end')
    if not start or not end or start > end: return fail('VALIDATION_ERROR', 'Tanggal mulai tidak boleh setelah tanggal akhir')
    records = list(get_db().transactions.find({'device_id': g.device_id, 'date': {'$gte': start, '$lte': end}}).sort('date', 1))
    if not records: return fail('VALIDATION_ERROR', 'Tidak ada data transaksi pada periode ini')
    try:
        export_format = body.get('format', 'excel')
        if export_format == 'pdf':
            from fpdf import FPDF
            pdf = FPDF(); pdf.add_page(); pdf.set_font('Helvetica', 'B', 16); pdf.cell(0, 10, 'Laporan Keuangan'); pdf.ln(12); pdf.set_font('Helvetica', size=10); pdf.cell(0, 8, f'Periode: {start} - {end}'); pdf.ln(10)
            for item in records:
                category_name = serialize_transaction(get_db(), item)['category_name']
                line = f"{item['date']} | {item['type']} | {category_name} | Rp {item['amount']:,} | {item.get('note', '')}"
                pdf.cell(0, 7, line.encode('latin-1', 'replace').decode('latin-1')); pdf.ln(7)
            output = BytesIO(pdf.output()); output.seek(0)
            return send_file(output, as_attachment=True, download_name=f'keuangan_{start.replace("-", "")}_{end.replace("-", "")}.pdf', mimetype='application/pdf')
        from openpyxl import Workbook
        workbook = Workbook(); sheet = workbook.active; sheet.title = 'Transaksi'; sheet.append(['Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Catatan'])
        for item in records: sheet.append([item['date'], item['type'], serialize_transaction(get_db(), item)['category_name'], item['amount'], item.get('note', '')])
        output = BytesIO(); workbook.save(output); output.seek(0); extension = 'xlsx'; mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return send_file(output, as_attachment=True, download_name=f'keuangan_{start.replace("-", "")}_{end.replace("-", "")}.{extension}', mimetype=mimetype)
    except Exception:
        logger.exception('Export failed')
        return fail('STORAGE_ERROR', 'Ekspor gagal, silakan coba lagi', status=500)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
