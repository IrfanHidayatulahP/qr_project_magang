const bcrypt = require('bcryptjs');
const db = require('../config/db'); // pastikan file ini mengekspor model karyawan

exports.showLogin = (req, res) => {
    const error = req.query.error || null;
    const success = req.query.success || null;
    const old = { username: req.query.username || '' };
    res.render('login', { error, success, old });
};


exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.redirect('/login?error=' + encodeURIComponent('Username dan password wajib') + '&username=' + encodeURIComponent(username || ''));
        }


        // Cari user berdasarkan username
        const karyawan = await db.karyawan.findOne({ where: { username } });
        if (!karyawan) {
            return res.redirect('/login?error=' + encodeURIComponent('Username atau password salah') + '&username=' + encodeURIComponent(username || ''));
        }


        const match = await bcrypt.compare(password, karyawan.password);
        if (!match) {
            return res.redirect('/login?error=' + encodeURIComponent('Username atau password salah') + '&username=' + encodeURIComponent(username || ''));
        }


        // set session
        req.session.username = karyawan.username;
        req.session.user = {
            id_karyawan: karyawan.id_karyawan,
            username: karyawan.username,
            nama_lengkap: karyawan.nama_lengkap
        };


        // Semua user akan diarahkan ke satu dashboard saja
        return res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        return res.redirect('/login?error=' + encodeURIComponent('Terjadi kesalahan. Coba lagi.'));
    }
};


exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            res.clearCookie('connect.sid');
            return res.redirect('/login?error=' + encodeURIComponent('Gagal logout. Silakan coba lagi.'));
        }
        res.clearCookie('connect.sid');
        res.redirect('/login?success=' + encodeURIComponent('Anda telah logout.'));
    });
};


/* ---------- REGISTER ---------- */
exports.showRegister = (req, res) => {
    const error = req.query.error || null;
    const old = {
        username: req.query.username || '',
        nama_lengkap: req.query.nama_lengkap || ''
    };
    res.render('auth/register', { error, old });
};


exports.register = async (req, res) => {
    try {
        const { username, password, confirm_password, nama_lengkap } = req.body;


        // basic validation
        if (!username || !password || !confirm_password || !nama_lengkap) {
            return res.redirect('/register?error=' + encodeURIComponent('Lengkapi semua field yang wajib') +
                `&username=${encodeURIComponent(username || '')}&nama_lengkap=${encodeURIComponent(nama_lengkap || '')}`);
        }


        if (password.length < 6) {
            return res.redirect('/register?error=' + encodeURIComponent('Password minimal 6 karakter') +
                `&username=${encodeURIComponent(username || '')}&nama_lengkap=${encodeURIComponent(nama_lengkap || '')}`);
        }
    } catch (err) {
        console.error('Register error:', err);
        return res.redirect('/register?error=' + encodeURIComponent('Terjadi kesalahan. Coba lagi.'));
    }
};