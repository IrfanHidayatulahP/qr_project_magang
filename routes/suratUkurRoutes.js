// routes/suratUkurRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/suratUkurController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// listing: GET /surat-ukur  -> handled by app.use prefix
router.get('/', ensureAuthenticated, (req, res, next) => {
    console.log('GET /surat-ukur dipanggil, session.user =', req.session?.user?.username || null);
    return ctrl.showIndex(req, res, next);
});

// create form: GET /surat-ukur/create
router.get('/create', ensureAuthenticated, ctrl.showCreateForm);
// create action: POST /surat-ukur/create
router.post('/create', ensureAuthenticated, ctrl.create);

// edit form: GET /surat-ukur/edit/:id
router.get('/edit/:id', ensureAuthenticated, ctrl.showEditForm);
// update action: POST /surat-ukur/edit/:id
router.post('/edit/:id', ensureAuthenticated, ctrl.update);

// delete action (POST): POST /surat-ukur/delete/:id
router.post('/delete/:id', ensureAuthenticated, ctrl.delete);

// detail: GET /surat-ukur/:id
router.get('/:id', ensureAuthenticated, ctrl.showDetail);

module.exports = router;
