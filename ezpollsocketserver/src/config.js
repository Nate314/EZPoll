// All runtime configuration comes from environment variables.
const csv = value => (value || '').split(',').map(x => x.trim()).filter(Boolean);

module.exports = {
    port: parseInt(process.env.PORT || '3000', 10),
    apiUrl: process.env.API_URL || 'http://python-api:5000/api',
    // Shared secret sent to the Python API on every call (X-Internal-Secret).
    internalSecret: process.env.INTERNAL_API_SECRET || '',
    // Browser origins allowed to connect (CORS and websocket Origin check).
    allowedOrigins: csv(process.env.ALLOWED_ORIGINS || 'http://localhost:8080,http://127.0.0.1:8080')
};
