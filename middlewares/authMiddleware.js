const db = require('../config/db');

function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.username) {
        return next();
    }
    // jika request datang dari fetch/ajax, bisa kirim 401; tapi default redirect ke login
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/login?error=' + encodeURIComponent('Silakan login terlebih dahulu'));
}

/**
 * Middleware memastikan user memiliki role Admin.
 * Pakai ini pada route yang harus diakses Admin saja.
 */
function ensureAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'Admin') {
        return next();
    }
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    return res.redirect('/login?error=' + encodeURIComponent('Anda tidak memiliki hak akses'));
}

/**
 * Middleware memastikan user memiliki salah satu role yang diberikan.
 * Contoh: ensureRole(['Admin','Staff'])
 */
function ensureRole(roles = []) {
    return (req, res, next) => {
        if (req.session && req.session.user && roles.includes(req.session.user.role)) {
            return next();
        }
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        return res.redirect('/login?error=' + encodeURIComponent('Anda tidak memiliki hak akses'));
    };
}

module.exports = {
    ensureAuthenticated,
    ensureAdmin,
    ensureRole
};
