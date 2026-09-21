const config = require('./config');

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isGuid = value => typeof value === 'string' && GUID_PATTERN.test(value);

// Calls the Python API and always resolves to a JSON value; API errors come
// back as { error: <message> } so callers (and clients) get a consistent shape.
async function call(method, path, body) {
    const headers = { 'X-Internal-Secret': config.internalSecret };
    const options = { method, headers, signal: AbortSignal.timeout(10000) };
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(`${config.apiUrl}${path}`, options);
        const data = await response.json();
        return response.ok ? data : { error: (data && data.message) || `HTTP ${response.status}` };
    } catch (e) {
        console.error('API call failed:', method, path, e.message);
        return { error: 'Upstream error' };
    }
}

// Path segments are only ever built from validated GUIDs or fixed keywords.
const segment = value => (value === 'new' || value === 'all' || isGuid(value)) ? value : null;

function guarded(value, fn) {
    const seg = segment(value);
    return seg ? fn(seg) : Promise.resolve({ error: 'Invalid identifier' });
}

module.exports = {
    isGuid,
    getUser: guid => guarded(guid, s => call('GET', `/user/${s}`)),
    getQuestion: guid => guarded(guid, s => call('GET', `/question/${s}`)),
    getSession: guid => guarded(guid, s => call('GET', `/session/${s}`)),
    postSessionAction: (guid, body) => guarded(guid, s => call('POST', `/session/${s}`, body)),
    getResultStats: guid => guarded(guid, s => call('GET', `/result/${s}`)),
    postResult: (guid, body) => guarded(guid, s => call('POST', `/result/${s}`, body)),
    deleteResult: (guid, userGuid) => guarded(guid, s => call('DELETE', `/result/${s}`, { user_guid: userGuid }))
};
