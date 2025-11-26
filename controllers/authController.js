// controllers/authController.js
const bcrypt = require('bcryptjs');
const db = require('../config/db'); // pastikan mengekspor model karyawan

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
            return res.render('login', {
                error: 'Username dan password wajib',
                old: { username: username || '' }
            });
        }

        const karyawan = await db.karyawan.findOne({ where: { username } });
        if (!karyawan) {
            return res.render('login', {
                error: 'Username atau password salah',
                old: { username }
            });
        }

        const match = await bcrypt.compare(password, karyawan.password);
        if (!match) {
            return res.render('login', {
                error: 'Username atau password salah',
                old: { username }
            });
        }

        // simpan session
        req.session.user = {
            id_karyawan: karyawan.id_karyawan,
            username: karyawan.username,
            nama_lengkap: karyawan.nama_lengkap
        };

        // setelah login sukses → REDIRECT
        return res.redirect('/dashboard');

    } catch (err) {
        console.error('Login error:', err);
        return res.render('login', {
            error: 'Terjadi kesalahan. Coba lagi.',
            old: { username }
        });
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
    res.render('register', { error, old });
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

        if (password !== confirm_password) {
            return res.redirect('/register?error=' + encodeURIComponent('Konfirmasi password tidak cocok') +
                `&username=${encodeURIComponent(username || '')}&nama_lengkap=${encodeURIComponent(nama_lengkap || '')}`);
        }

        // cek apakah username sudah ada
        const existing = await db.karyawan.findOne({ where: { username } });
        if (existing) {
            return res.redirect('/register?error=' + encodeURIComponent('Username sudah dipakai') +
                `&username=${encodeURIComponent('')}&nama_lengkap=${encodeURIComponent(nama_lengkap || '')}`);
        }

        // hash password
        const hash = await bcrypt.hash(password, 10);

        // buat record baru
        await db.karyawan.create({
            nama_lengkap,
            username,
            password: hash
        });

        // sukses -> kembali ke login dengan pesan sukses
        return res.redirect('/login?success=' + encodeURIComponent('Pendaftaran berhasil. Silakan login.') + '&username=' + encodeURIComponent(username));
    } catch (err) {
        console.error('Register error:', err);
        return res.redirect('/register?error=' + encodeURIComponent('Terjadi kesalahan saat mendaftar. Coba lagi.'));
    }
};
