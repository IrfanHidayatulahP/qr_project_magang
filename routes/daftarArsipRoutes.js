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

// ========================================================
// PERBAIKAN DI SINI:
// Tambahkan '/detail' di depan :id agar cocok dengan tombol view
// ========================================================
router.get('/detail/:id', ensureAuthenticated, ctrl.showDetail);

module.exports = router;