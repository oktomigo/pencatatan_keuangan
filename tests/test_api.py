import mongomock

import main


def client_with_db(monkeypatch):
    database = mongomock.MongoClient().pencatatan_keuangan
    main.get_db = lambda: database
    return main.app.test_client(), database


def test_init_is_idempotent(monkeypatch):
    client, database = client_with_db(monkeypatch)
    first = client.post('/api/init').get_json()['data']
    second = client.post('/api/init', json={'device_id': first['device_id']}).get_json()['data']
    assert len(first['categories']) == 11
    assert len(second['categories']) == 11
    assert database.categories.count_documents({'device_id': first['device_id']}) == 11


def test_transaction_round_trip_and_isolation(monkeypatch):
    client, _ = client_with_db(monkeypatch)
    first = client.post('/api/init').get_json()['data']
    device = first['device_id']
    category = next(item for item in first['categories'] if item['type'] == 'expense')
    headers = {'X-Device-ID': device}
    payload = {'type': 'expense', 'amount': 25000, 'date': '2026-09-20', 'category_id': category['id'], 'note': 'Makan'}
    created = client.post('/api/transactions', headers=headers, json=payload)
    assert created.status_code == 201
    assert created.get_json()['data']['amount'] == 25000
    invalid = client.post('/api/transactions', headers=headers, json={**payload, 'amount': 0})
    assert invalid.status_code == 400
    other = client.post('/api/init').get_json()['data']['device_id']
    assert client.get('/api/transactions', headers={'X-Device-ID': other}).get_json()['meta']['total'] == 0


def test_budget_threshold_and_export(monkeypatch):
    client, _ = client_with_db(monkeypatch)
    initialized = client.post('/api/init').get_json()['data']
    headers = {'X-Device-ID': initialized['device_id']}
    category = next(item for item in initialized['categories'] if item['type'] == 'expense')
    assert client.post('/api/budgets', headers=headers, json={'category_id': category['id'], 'amount': 100000, 'period': 'monthly'}).status_code == 201
    client.post('/api/transactions', headers=headers, json={'type': 'expense', 'amount': 80000, 'date': '2026-09-20', 'category_id': category['id']})
    assert client.get('/api/budgets', headers=headers).get_json()['data'][0]['status'] == 'warning'
    exported = client.post('/api/export', headers=headers, json={'format': 'excel', 'period': {'start': '2026-01-01', 'end': '2026-12-31'}})
    assert exported.status_code == 200
    assert exported.mimetype.endswith('spreadsheetml.sheet')
