const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');
const db = require('../config/db'); // pastikan eksport model karyawan

// login / register routes
router.get('/login', auth.showLogin);
router.post('/login', auth.login);
router.get('/logout', auth.logout);

router.get('/register', auth.showRegister);
router.post('/register', auth.register);

// dashboard route (ambil stats minimal lalu render)
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    let activeUsers = 0;
    let stats = { activeUsers: 0, newRegistrationsThisWeek: 0, lastBackup: null };
    let logs = [];

    try {
        if (db && db.karyawan && typeof db.karyawan.count === 'function') {
            try {
                activeUsers = await db.karyawan.count({ where: { is_active: true } });
            } catch (innerErr) {
                console.error('Gagal hitung karyawan (inner):', innerErr);
                activeUsers = 0;
            }
        } else {
            activeUsers = 0;
        }

        stats = {
            activeUsers,
            newRegistrationsThisWeek: 0,
            lastBackup: null
        };
        logs = [];

        return res.render('dashboard', {
            user: req.session?.user || null,
            stats,
            logs
        });
    } catch (err) {
        console.error('Error render dashboard (outer):', err);
        stats = { activeUsers: 0, newRegistrationsThisWeek: 0, lastBackup: null };
        logs = [];
        return res.render('dashboard', {
            user: req.session?.user || null,
            stats,
            logs
        });
    }
});

module.exports = router;
