// Tiny fixed-window in-memory limiter, enough to blunt trivial spam of
// user/session creation and event floods from a single socket or address.
const windows = new Map();
const WINDOW_TTL_MS = 10 * 60 * 1000;

function allow(key, max, windowMs) {
    const now = Date.now();
    const entry = windows.get(key);
    if (!entry || now - entry.start >= windowMs) {
        windows.set(key, { start: now, count: 1 });
        return true;
    }
    entry.count += 1;
    return entry.count <= max;
}

// Drop stale windows so the map cannot grow without bound.
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows) {
        if (now - entry.start >= WINDOW_TTL_MS) windows.delete(key);
    }
}, 60 * 1000).unref();

module.exports = { allow };
