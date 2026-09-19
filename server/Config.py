import os

# All configuration comes from environment variables (see .env.example).
class Config:

    # db variables
    host = os.environ.get('DB_HOST', 'mysql-db')
    port = int(os.environ.get('DB_PORT', '3306'))
    user = os.environ.get('DB_USER', 'ezpoll_app')
    password = os.environ.get('DB_PASSWORD', '')
    db = os.environ.get('DB_NAME', 'EZPoll')
    # shared secret the socket server must send in the X-Internal-Secret header
    internal_secret = os.environ.get('INTERNAL_API_SECRET', '')
    # browser origins allowed by CORS (the API is normally only called by the
    # socket server, so this is defense in depth)
    allowed_origins = [x.strip() for x in os.environ.get(
        'ALLOWED_ORIGINS', 'http://localhost:8080,http://127.0.0.1:8080').split(',') if x.strip()]
