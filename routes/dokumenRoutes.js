// routes/dokumenRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dokumenController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// listing
router.get('/', ensureAuthenticated, (req, res, next) => {
    console.log('GET /dokumen dipanggil, session.user =', req.session?.user?.username || null);
    return ctrl.showIndex(req, res, next);
});

// create form & action
router.get('/create', ensureAuthenticated, ctrl.showCreateForm);
router.post('/create', ensureAuthenticated, ctrl.create);

// edit form & update action
router.get('/edit/:id', ensureAuthenticated, ctrl.showEditForm);
router.post('/edit/:id', ensureAuthenticated, ctrl.update);

// delete
router.post('/delete/:id', ensureAuthenticated, ctrl.delete);

// detail
router.get('/:id', ensureAuthenticated, ctrl.showDetail);

module.exports = router;
