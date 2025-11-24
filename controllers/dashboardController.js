// controllers/dashboardController.js
const db = require('../config/db'); // pastikan db.karyawan tersedia
const { Op } = require('sequelize');

exports.adminDashboard = async (req, res) => {
    try {
        // ambil user dari session (sudah diset saat login)
        const user = req.session.user || null;

        // statistik sederhana
        const totalKaryawan = await db.karyawan.count();

        // ambil 5 karyawan terbaru berdasarkan id_karyawan (karena timestamps=false)
        const latestKaryawan = await db.karyawan.findAll({
            order: [['id_karyawan', 'DESC']],
            limit: 5,
            attributes: ['id_karyawan', 'nama_lengkap', 'username', 'role']
        });

        const stats = {
            totalKaryawan,
            newRegistrationsThisWeek: '-' // karena timestamps:false; aktifkan timestamps untuk data ini
        };

        res.render('admin/dashboard_admin', { user, stats, logs, latestKaryawan });
    } catch (err) {
        console.error('adminDashboard error:', err);
        return res.status(500).render('admin/dashboard_admin', {
            user: req.session.user || null,
            stats: null,
            logs: [],
            latestKaryawan: [],
            error: 'Terjadi kesalahan saat memuat dashboard'
        });
    }
};

exports.staffDashboard = async (req, res) => {
    try {
        const user = req.session.user || null;

        // contoh data tugas/notifikasi sederhana
        // ganti dengan query ke table tugas jika ada
        const stats = {
            activeTasks: 4,
            notifications: 'Tidak ada notifikasi baru',
            upcomingEvents: 'Rapat Tim — Jumat 10:00'
        };

        // opsional: ambil beberapa rekan kerja
        const colleagues = await db.karyawan.findAll({
            where: { role: { [Op.in]: ['Staff', 'Admin'] } },
            limit: 6,
            attributes: ['id_karyawan', 'nama_lengkap', 'username', 'role']
        });

        res.render('staff/dashboard_staff', { user, stats, colleagues });
    } catch (err) {
        console.error('staffDashboard error:', err);
        return res.status(500).render('staff/dashboard_staff', {
            user: req.session.user || null,
            stats: null,
            colleagues: [],
            error: 'Terjadi kesalahan saat memuat dashboard'
        });
    }
};

/**
 * General dashboard fallback (bila Anda ingin route /dashboard)
 * Akan meredirect ke dashboard sesuai role jika tersedia.
 */
exports.dashboard = (req, res) => {
    const user = req.session.user || null;
    if (!user) {
        return res.redirect('/login?error=' + encodeURIComponent('Silakan login terlebih dahulu'));
    }

    if (user.role === 'Admin') {
        return exports.adminDashboard(req, res);
    } else if (user.role === 'Staff') {
        return exports.staffDashboard(req, res);
    } else {
        // fallback render generic dashboard view
        return res.render('dashboard', { user, stats: null });
    }
};
