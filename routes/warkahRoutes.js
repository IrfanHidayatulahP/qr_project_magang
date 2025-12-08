// routes/warkahRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/warkahController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

router.get('/', ensureAuthenticated, ctrl.showIndex);

router.get('/create', ensureAuthenticated, ctrl.showCreateForm);
router.post('/create', ensureAuthenticated, ctrl.create);

router.get('/edit/:id', ensureAuthenticated, ctrl.showEditForm);
router.post('/edit/:id', ensureAuthenticated, ctrl.update);

router.post('/delete/:id', ensureAuthenticated, ctrl.delete);

// --- specific routes BEFORE generic :id ---
router.get('/download', ensureAuthenticated, ctrl.download);

// <-- tambahkan QR endpoints di sini (sebelum generic :id) -->
router.get('/:id/qr.png', ensureAuthenticated, ctrl.qrImage);
router.get('/:id/qr/download', ensureAuthenticated, ctrl.qrDownload);

// generic detail route (tetap di akhir)
router.get('/:id', ensureAuthenticated, ctrl.showDetail);

module.exports = router;
