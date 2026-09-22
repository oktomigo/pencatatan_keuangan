import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    MONGO_URI   = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
    MONGO_DB    = os.getenv('MONGO_DB', 'pencatatan_keuangan')
    FLASK_ENV   = os.getenv('FLASK_ENV', 'production')   # default production
    SECRET_KEY  = os.getenv('SECRET_KEY', 'change-me-in-environment')
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    MAX_AMOUNT  = int(os.getenv('MAX_AMOUNT') or '999999999999')
    DEBUG       = os.getenv('FLASK_DEBUG', '0') == '1'   # debug OFF by default
