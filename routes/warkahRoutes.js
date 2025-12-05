// routes/warkahRoutes.js
const express = require('express');
const router = express.Router();
const warkahController = require('../controllers/warkahController');

// list
router.get('/', warkahController.showIndex);

// create form
router.get('/create', warkahController.showCreateForm);
// create action
router.post('/create', warkahController.create);

// edit form
router.get('/edit/:id', warkahController.showEditForm);
// update action
router.post('/edit/:id', warkahController.update);

// delete action (POST recommended)
router.post('/delete/:id', warkahController.delete);

// detail view
router.get('/detail/:id', warkahController.showDetail);
// optional shorter route to detail
router.get('/:id', warkahController.showDetail);

module.exports = router;
