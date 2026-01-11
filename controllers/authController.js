const bcrypt = require('bcryptjs');
const db = require('../config/db'); // pastikan config/db mengekspor instance sequelize sebagai db.sequelize
const { QueryTypes } = require('sequelize'); // untuk raw query type

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

        // jangan SELECT createdAt/updatedAt (karena kolom tidak ada)
        const karyawan = await db.karyawan.findOne({
            where: { username },
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });

        if (!karyawan) {
            return res.render('login', {
                error: 'Username atau password salah',
                old: { username }
            });
        }

        if (!karyawan.is_active) {
            return res.render('login', {
                error: 'Akun Anda tidak aktif. Hubungi administrator.',
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

        req.session.user = {
            id_karyawan: karyawan.id_karyawan,
            role: karyawan.jabatan // simpan info yang diperlukan untuk otorisasi saja
        };

        return res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        return res.render('login', {
            error: 'Terjadi kesalahan. Coba lagi.',
            old: { username: req.body.username || '' }
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
        nama_karyawan: req.query.nama_karyawan || ''
    };
    res.render('register', { error, old });
};

exports.register = async (req, res) => {
    try {
        const { username, password, confirm_password, nama_karyawan, email, jabatan } = req.body;

        // validasi dasar
        if (!username || !password || !confirm_password || !nama_karyawan) {
            return res.redirect('/register?error=' + encodeURIComponent('Lengkapi semua field yang wajib') +
                `&username=${encodeURIComponent(username || '')}&nama_karyawan=${encodeURIComponent(nama_karyawan || '')}`);
        }

        if (password.length < 6) {
            return res.redirect('/register?error=' + encodeURIComponent('Password minimal 6 karakter') +
                `&username=${encodeURIComponent(username || '')}&nama_karyawan=${encodeURIComponent(nama_karyawan || '')}`);
        }

        if (password !== confirm_password) {
            return res.redirect('/register?error=' + encodeURIComponent('Konfirmasi password tidak cocok') +
                `&username=${encodeURIComponent(username || '')}&nama_karyawan=${encodeURIComponent(nama_karyawan || '')}`);
        }

        // cek existing user tanpa meminta createdAt/updatedAt
        const existing = await db.karyawan.findOne({
            where: { username },
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });

        if (existing) {
            return res.redirect('/register?error=' + encodeURIComponent('Username sudah dipakai') +
                `&username=${encodeURIComponent('')}&nama_karyawan=${encodeURIComponent(nama_karyawan || '')}`);
        }

        // hash password
        const hash = await bcrypt.hash(password, 10);

        // gunakan raw INSERT supaya Sequelize tidak otomatis menambahkan createdAt/updatedAt
        const insertSql = 'INSERT INTO `karyawan` (`nama_karyawan`,`username`,`password`,`email`,`jabatan`,`is_active`) VALUES (?,?,?,?,?,?);';
        const replacements = [
            nama_karyawan,
            username,
            hash,
            email || null,
            jabatan || null,
            true
        ];

        // jalankan insertion
        await db.sequelize.query(insertSql, {
            replacements,
            type: QueryTypes.INSERT
        });

        return res.redirect('/login?success=' + encodeURIComponent('Pendaftaran berhasil. Silakan login.') + '&username=' + encodeURIComponent(username));
    } catch (err) {
        console.error('Register error:', err);
        return res.redirect('/register?error=' + encodeURIComponent('Terjadi kesalahan saat mendaftar. Coba lagi.'));
    }
};
