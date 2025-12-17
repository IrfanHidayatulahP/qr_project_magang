// routes/warkahRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/warkahController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');
const { uploadFor } = require('../middlewares/uploadFile'); // <-- tambah import

const uploader = uploadFor('warkah'); // uploader khusus warkah

router.get('/', ensureAuthenticated, ctrl.showIndex);

router.get('/create', ensureAuthenticated, ctrl.showCreateForm);
// gunakan uploader untuk menerima file pdf (max 10)
router.post('/create', ensureAuthenticated, uploader.array('files', 10), ctrl.create);

router.get('/edit/:id', ensureAuthenticated, ctrl.showEditForm);
router.post('/edit/:id', ensureAuthenticated, uploader.array('files', 10), ctrl.update);

router.post('/delete/:id', ensureAuthenticated, ctrl.delete);

// specific routes BEFORE generic :id
router.get('/download', ensureAuthenticated, ctrl.download);
router.get('/:id/qr.png', ensureAuthenticated, ctrl.qrImage);
router.get('/:id/qr/download', ensureAuthenticated, ctrl.qrDownload);

// generic detail
router.get('/:id', ensureAuthenticated, ctrl.showDetail);

module.exports = router;
