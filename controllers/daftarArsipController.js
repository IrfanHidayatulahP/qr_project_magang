// controllers/daftarArsipController.js
const db = require('../config/db');
const { Op } = require('sequelize');

// Safe lookup model
const DaftarArsip = db.daftar_arsip_vital || (db.models && (db.models.daftar_arsip_vital || db.models.DaftarArsipVital));

function ensureModelOrRespond(res) {
    if (!DaftarArsip) {
        console.error("Model 'daftar_arsip_vital' tidak ditemukan.");
        if (res) res.status(500).send("Server Error: Model Daftar Arsip tidak config.");
        return false;
    }
    return true;
}

exports.showIndex = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const q = (req.query.q || '').toString().trim();
        
        // Opsi query dasar
        const options = {
            order: [['nomor_urut', 'ASC']], // Urutkan berdasarkan nomor urut
            limit: 500, // Batasi agar tidak terlalu berat
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        };

        // Logic Pencarian
        if (q) {
            options.where = {
                [Op.or]: [
                    { nomor_hak: { [Op.like]: `%${q}%` } },
                    { kode_klasifikasi: { [Op.like]: `%${q}%` } },
                    { nomor_item_arsip_uraian: { [Op.like]: `%${q}%` } },
                    // Bisa tambah pencarian lokasi jika perlu
                    { lokasi_simpan_bt_ruang_rak: { [Op.like]: `%${q}%` } }
                ]
            };
        }

        // Ambil data (Tanpa Include/Join karena kita anggap data sudah ada di tabel ini)
        const records = await DaftarArsip.findAll(options);

        // Convert ke plain object agar aman di EJS
        const recordsPlain = records.map(r => (r.toJSON ? r.toJSON() : r));

        return res.render('daftar_arsip/list_daftar_arsip', {
            records: recordsPlain,
            user: req.session?.user || null,
            filter_q: q,
            error: req.query.error || null,
            success: req.query.success || null
        });

    } catch (err) {
        console.error('daftarArsip.showIndex error:', err);
        return res.status(500).send('Server Error saat mengambil data daftar arsip');
    }
};

// ... (Function create, edit, delete, dll akan menyusul sesuai kebutuhan)