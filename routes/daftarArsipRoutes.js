const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/daftarArsipController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// Listing (Halaman Utama)
router.get('/', ensureAuthenticated, ctrl.showIndex);

// Create (Tambah)
router.get('/create', ensureAuthenticated, ctrl.showCreateForm);
router.post('/create', ensureAuthenticated, ctrl.create);

// Edit
router.get('/edit/:id', ensureAuthenticated, ctrl.showEditForm);
router.post('/edit/:id', ensureAuthenticated, ctrl.update);

// Delete
router.post('/delete/:id', ensureAuthenticated, ctrl.delete);

// Download CSV
router.get('/download', ensureAuthenticated, ctrl.download);

// QR Code
router.get('/:id/qr.png', ensureAuthenticated, ctrl.qrImage);
router.get('/:id/qr/download', ensureAuthenticated, ctrl.qrDownload);

// Detail
router.get('/detail/:id', ensureAuthenticated, ctrl.showDetail);

// tambahkan di bawah route definitions (di daftarArsipRoutes.js)
router.getCounts = async function () {
    const DaftarArsip = require('../config/db').daftar_arsip_vital || (require('../config/db').models && require('../config/db').models.daftar_arsip_vital);
    if (!DaftarArsip) return { total: 0, bulanIni: 0, panter: 0 };

    const { Op } = require('sequelize');
    const total = await DaftarArsip.count();

    // sederhana: coba gunakan createdAt bila ada
    let bulanIni = 0;
    try {
        const raw = DaftarArsip.rawAttributes || DaftarArsip.tableAttributes || {};
        const dateCol = raw.createdAt ? 'createdAt' : (raw.tanggal_input ? 'tanggal_input' : null);
        if (dateCol) {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const where = {};
            where[dateCol] = { [Op.gte]: start, [Op.lt]: end };
            bulanIni = await DaftarArsip.count({ where });
        }
    } catch (e) { bulanIni = 0; }

    // panter default 0 (kamu bisa kustom sesuai kolom status di DB)
    let panter = 0;

    return { total, bulanIni, panter };
};

module.exports = router;


module.exports = router;