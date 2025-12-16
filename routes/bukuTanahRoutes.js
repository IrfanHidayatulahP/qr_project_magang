// routes/bukuTanahRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bukuTanahController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');
const { uploadFor } = require('../middlewares/uploadFile'); // <- path sesuai projek

const uploader = uploadFor('buku_tanah');

// LIST
router.get('/', ensureAuthenticated, ctrl.showIndex);
router.get('/create', ensureAuthenticated, ctrl.showCreateForm);

// NOTE: tambahkan uploader.fields di route create
router.post('/create',
    ensureAuthenticated,
    uploader.array('files', 10), // menerima hingga 10 PDF
    ctrl.create
);

// edit
router.get('/edit/:id', ensureAuthenticated, ctrl.showEditForm);

// update: beri juga uploader untuk menangani file replacement
router.post('/edit/:id',
    ensureAuthenticated,
    uploader.array('files', 10),
    ctrl.update
);

// delete, download, qr routes tetap sama...
router.post('/delete/:id', ensureAuthenticated, ctrl.delete);
router.get('/download', ensureAuthenticated, ctrl.download);
router.get('/:id/qr.png', ensureAuthenticated, ctrl.qrImage);
router.get('/:id/qr/download', ensureAuthenticated, ctrl.qrDownload);
router.get('/:id', ensureAuthenticated, ctrl.showDetail);

module.exports = router;
