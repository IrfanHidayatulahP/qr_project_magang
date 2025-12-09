const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/daftarArsipController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// Route Index
router.get('/', ensureAuthenticated, ctrl.showIndex);

// Nanti tambahkan route lain disini (create, edit, delete, detail)

module.exports = router;