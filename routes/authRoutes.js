const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
// 1. IMPORT DASHBOARD CONTROLLER (PENTING)
const dashboardController = require('../controllers/dashboardController'); 
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// --- LOGIN / REGISTER ROUTES (TETAP) ---
router.get('/login', auth.showLogin);
router.post('/login', auth.login);
router.get('/logout', auth.logout);

router.get('/register', auth.showRegister);
router.post('/register', auth.register);

// --- DASHBOARD ROUTE (GANTI BAGIAN INI) ---
// Hapus logika inline yang lama, ganti dengan pemanggilan controller
router.get('/dashboard', ensureAuthenticated, dashboardController.showDashboard);

module.exports = router;