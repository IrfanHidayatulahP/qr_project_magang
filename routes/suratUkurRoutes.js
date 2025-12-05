// routes/suratUkurRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/suratUkurController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// listing: GET /surat-ukur
router.get('/', ensureAuthenticated, ctrl.showIndex);

// create
router.get('/create', ensureAuthenticated, ctrl.showCreateForm);
router.post('/create', ensureAuthenticated, ctrl.create);

// edit
router.get('/edit/:id', ensureAuthenticated, ctrl.showEditForm);
router.post('/edit/:id', ensureAuthenticated, ctrl.update);

// delete
router.post('/delete/:id', ensureAuthenticated, ctrl.delete);

// --- specific routes BEFORE generic :id ---
router.get('/download', ensureAuthenticated, ctrl.download);

// detail (generic)
router.get('/:id', ensureAuthenticated, ctrl.showDetail);

module.exports = router;
