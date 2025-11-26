// routes/bukuTanahRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bukuTanahController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// listing: GET /buku-tanah  -> handled by app.use prefix
router.get('/', ensureAuthenticated, (req, res, next) => {
    console.log('GET /buku-tanah dipanggil, session.user =', req.session?.user?.username || null);
    return ctrl.showIndex(req, res, next);
});

// create form: GET /buku-tanah/create
router.get('/create', ensureAuthenticated, ctrl.showCreateForm);
// create action: POST /buku-tanah/create
router.post('/create', ensureAuthenticated, ctrl.create);

// edit form: GET /buku-tanah/edit/:id
router.get('/edit/:id', ensureAuthenticated, ctrl.showEditForm);
// update action: POST /buku-tanah/edit/:id
router.post('/edit/:id', ensureAuthenticated, ctrl.update);

// delete action (POST): POST /buku-tanah/delete/:id
router.post('/delete/:id', ensureAuthenticated, ctrl.delete);

// detail: GET /buku-tanah/:id
router.get('/:id', ensureAuthenticated, ctrl.showDetail);

module.exports = router;
