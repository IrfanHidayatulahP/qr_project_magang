const db = require('../config/db');

async function ensureAuthenticated(req, res, next) {
    try {
        if (req.session && req.session.user && req.session.user.id_karyawan) {
            if (db && db.karyawan && typeof db.karyawan.findByPk === 'function') {
                const k = await db.karyawan.findByPk(req.session.user.id_karyawan, {
                    attributes: { exclude: ['createdAt', 'updatedAt'] }
                });

                if (!k || !k.is_active) {
                    req.session.destroy(() => {
                        res.clearCookie('connect.sid');
                        return res.redirect('/login?error=' + encodeURIComponent('Akun tidak aktif atau tidak ditemukan. Silakan login lagi.'));
                    });
                    return;
                }
            }
            return next();
        }

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        return res.redirect('/login?error=' + encodeURIComponent('Silakan login terlebih dahulu'));
    } catch (err) {
        console.error('Auth middleware error:', err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ error: 'Server error' });
        }
        return res.redirect('/login?error=' + encodeURIComponent('Terjadi kesalahan autentikasi'));
    }
}

module.exports = {
    ensureAuthenticated
};
