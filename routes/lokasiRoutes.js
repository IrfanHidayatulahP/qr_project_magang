const express = require('express');
const router = express.Router();
const lokasiController = require('../controllers/lokasiController');

// LIST / INDEX
router.get('/', lokasiController.showIndex);

// CREATE
router.get('/create', lokasiController.showCreateForm);
router.post('/create', lokasiController.create);

// DETAIL (OPTIONAL, jika kamu punya halaman detail lokasi)
router.get('/:id', lokasiController.showDetail);

// EDIT
router.get('/edit/:id', lokasiController.showEditForm);
router.post('/edit/:id', lokasiController.update);

// DELETE
router.post('/delete/:id', lokasiController.delete);

module.exports = router;
