// routes/suratUkurRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/suratUkurController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');
const { uploadFor } = require('../middlewares/uploadFile'); // tambahkan import

const uploader = uploadFor('surat_ukur'); // buat uploader khusus surat_ukur

// listing: GET /surat-ukur
router.get('/', ensureAuthenticated, ctrl.showIndex);

// create
router.get('/create', ensureAuthenticated, ctrl.showCreateForm);
// tambah middleware uploader.array di route create
router.post('/create',
    ensureAuthenticated,
    uploader.array('files', 10), // menerima hingga 10 PDF
    ctrl.create
);

// edit
router.get('/edit/:id', ensureAuthenticated, ctrl.showEditForm);
// tambahkan uploader di update juga
router.post('/edit/:id',
    ensureAuthenticated,
    uploader.array('files', 10),
    ctrl.update
);

// delete
router.post('/delete/:id', ensureAuthenticated, ctrl.delete);

// download CSV
router.get('/download', ensureAuthenticated, ctrl.download);

// --- QR routes: letakkan sebelum generic :id ---
router.get('/:id/qr.png', ensureAuthenticated, ctrl.qrImage);
router.get('/:id/qr/download', ensureAuthenticated, ctrl.qrDownload);

// detail (generic)
router.get('/:id', ensureAuthenticated, ctrl.showDetail);

module.exports = router;
