// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

router.get('/login', auth.showLogin);
router.post('/login', auth.login);
router.get('/logout', auth.logout);

router.get('/register', auth.showRegister);
router.post('/register', auth.register);

router.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

module.exports = router;
