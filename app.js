// app.js
require('dotenv').config(); // cukup panggil sekali di sini
const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const bukuTanahRoutes = require('./routes/bukuTanahRoutes');
const suratUkurRoutes = require('./routes/suratUkurRoutes');
const warkahRoutes = require('./routes/warkahRoutes');
const daftarArsipRoutes = require('./routes/daftarArsipRoutes');
const lokasiRoutes = require('./routes/lokasiRoutes');

const app = express();

// PORT default jika tidak diset di .env
const PORT = process.env.PORT || 3000;

app.use(cookieParser(process.env.SESSION_SECRET));
app.use(helmet());

// View engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Dengan potongan di bawah ini (minimal perubahan)
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

// simpan io di "app" supaya controller bisa akses via req.app.get('io')
app.set('io', io);

io.on('connection', async (socket) => {
  console.log('Socket connected:', socket.id);

  // Kirim angka awal ke socket yang baru connect
  try {
    const counts = await daftarArsipRoutes.getCounts();
    socket.emit('daftarArsip:counts', counts);
  } catch (e) {
    console.error('Failed to send initial counts to socket', e);
  }

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// allows direct access via /uploads/<model>/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// allows direct access via /qrcodes/<filename> (e.g. /qrcodes/buku_tanah_123.png)
app.use('/qrcodes', express.static(path.join(__dirname, 'public', 'qrcodes')));

// Body parser (express built-in)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'session_id', // Ganti nama default connect.sid agar tidak mudah ditebak
  cookie: {
    httpOnly: true,    // Mencegah akses JavaScript ke cookie (Proteksi XSS)
    secure: process.env.NODE_ENV === 'production', // Hanya kirim lewat HTTPS di produksi
    sameSite: 'strict', // Proteksi CSRF yang sangat kuat
    signed: true,       // Memastikan cookie ditandatangani secara kriptografis
    maxAge: 24 * 60 * 60 * 1000 // 1 hari
  }
}));

// Mount Routes
app.use('/', authRoutes);
app.use('/buku-tanah', bukuTanahRoutes);
app.use('/surat-ukur', suratUkurRoutes);
app.use('/warkah', warkahRoutes);
app.use('/daftar-arsip', daftarArsipRoutes);
app.use('/lokasi', lokasiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack); // Tetap log detail di server untuk debugging

  const status = err.status || 500;

  // Jangan kirim objek 'err' mentah ke client
  res.status(status).json({
    success: false,
    message: status === 500
      ? 'Terjadi kesalahan internal pada sistem'
      : err.message
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
