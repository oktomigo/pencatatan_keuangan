"""
main.py — Flask app untuk aplikasi pencatatan keuangan harian.
Flask me-render template HTML per route. Static files di static/.
"""

import logging

from flask import Flask, jsonify, render_template, redirect, url_for, request
from flask_cors import CORS
from pymongo.errors import PyMongoError

from config import Config
from db import get_db, init_indexes
from utils_api import fail, ok

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, origins=Config.CORS_ORIGINS)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    init_indexes()
except PyMongoError:
    logger.warning('MongoDB tidak tersedia; index akan dibuat saat startup berikutnya.')


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


@app.route('/api/transactions', methods=['GET', 'POST'])
def api_transactions():
    if request.method == 'GET':
        return jsonify({'data': [], 'message': 'Phase 3 not implemented yet'})
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'}), 201


@app.route('/api/transactions/<tx_id>', methods=['PUT', 'DELETE'])
def api_transaction(tx_id):
    if request.method == 'DELETE':
        return jsonify({'message': 'Phase 3 not implemented yet'})
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'})


@app.route('/api/categories', methods=['GET', 'POST'])
def api_categories():
    if request.method == 'GET':
        return jsonify({'data': [], 'message': 'Phase 3 not implemented yet'})
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'}), 201


@app.route('/api/categories/<cat_id>', methods=['PUT', 'DELETE'])
def api_category(cat_id):
    if request.method == 'DELETE':
        return jsonify({'message': 'Phase 3 not implemented yet'})
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'})


@app.route('/api/budgets', methods=['GET', 'POST'])
def api_budgets():
    if request.method == 'GET':
        return jsonify({'data': [], 'message': 'Phase 3 not implemented yet'})
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'}), 201


@app.route('/api/budgets/<bud_id>', methods=['PUT', 'DELETE'])
def api_budget(bud_id):
    if request.method == 'DELETE':
        return jsonify({'message': 'Phase 3 not implemented yet'})
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'})


@app.route('/api/recurring-bills', methods=['GET', 'POST'])
def api_recurring_bills():
    if request.method == 'GET':
        return jsonify({'data': [], 'message': 'Phase 3 not implemented yet'})
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'}), 201


@app.route('/api/recurring-bills/<bill_id>', methods=['PUT', 'DELETE'])
def api_recurring_bill(bill_id):
    if request.method == 'DELETE':
        return jsonify({'message': 'Phase 3 not implemented yet'})
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'})


@app.route('/api/recurring-bills/<bill_id>/mark-paid', methods=['POST'])
def api_mark_paid(bill_id):
    return jsonify({'message': 'Phase 3 not implemented yet'})


@app.route('/api/savings-goals', methods=['GET', 'POST'])
def api_savings_goals():
    if request.method == 'GET':
        return jsonify({'data': [], 'message': 'Phase 3 not implemented yet'})
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'}), 201


@app.route('/api/savings-goals/<goal_id>', methods=['PUT', 'DELETE'])
def api_savings_goal(goal_id):
    if request.method == 'DELETE':
        return jsonify({'message': 'Phase 3 not implemented yet'})
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'})


@app.route('/api/savings-goals/<goal_id>/add-funds', methods=['POST'])
def api_add_funds(goal_id):
    return jsonify({'message': 'Phase 3 not implemented yet'})


@app.route('/api/dashboard', methods=['GET'])
def api_dashboard():
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'})


@app.route('/api/reports', methods=['GET'])
def api_reports():
    return jsonify({'data': {}, 'message': 'Phase 3 not implemented yet'})


@app.route('/api/export', methods=['POST'])
def api_export():
    return jsonify({'message': 'Phase 3 not implemented yet'}), 501


if __name__ == '__main__':
    app.run(debug=True, port=5000)
