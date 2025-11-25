const db = require('../config/db');

function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next(); // user sudah login
    }

    // Jika request dari AJAX / fetch API
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Default redirect ke halaman login
    return res.redirect('/login?error=' + encodeURIComponent('Silakan login terlebih dahulu'));
}

module.exports = {
    ensureAuthenticated
};

