"""
api/index.py — Entry point WSGI untuk Vercel.
Vercel mengharapkan objek `app` (WSGI callable) di file ini.
"""
import sys
import os

# Tambah root project ke sys.path agar import main, config, db, dll bisa ditemukan
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app  # noqa: F401 — Vercel butuh nama 'app' di module ini
