// app.js
require('dotenv').config(); // cukup panggil sekali di sini
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const bukuTanahRoutes = require('./routes/bukuTanahRoutes');
const suratUkurRoutes = require('./routes/suratUkurRoutes');
const warkahRoutes = require('./routes/warkahRoutes');
const daftarArsipRoutes = require('./routes/daftarArsipRoutes');
const lokasiRoutes = require('./routes/lokasiRoutes');

const app = express();

// PORT default jika tidak diset di .env
const PORT = process.env.PORT || 3000;

// View engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Static files
app.use(express.static(path.join(__dirname, 'public')));

// allows direct access via /qrcodes/<filename> (e.g. /qrcodes/buku_tanah_123.png)
app.use('/qrcodes', express.static(path.join(__dirname, 'public', 'qrcodes')));

// Body parser (express built-in)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_development',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 } // 4 jam
}));

// Mount Routes
app.use('/', authRoutes);
app.use('/buku-tanah', bukuTanahRoutes);
app.use('/surat-ukur', suratUkurRoutes);
app.use('/warkah', warkahRoutes);
app.use('/daftar-arsip', daftarArsipRoutes);
app.use('/lokasi', lokasiRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).send('Halaman tidak ditemukan');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
