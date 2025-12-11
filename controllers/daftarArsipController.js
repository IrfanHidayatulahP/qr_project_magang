// controllers/daftarArsipController.js
const db = require('../config/db');
const { Op, QueryTypes } = require('sequelize');
const QRCode = require('qrcode');

// --- 1. DEFINISI MODEL ---
// Safe lookup untuk model utama
const DaftarArsip = db.daftar_arsip_vital || (db.models && (db.models.daftar_arsip_vital || db.models.DaftarArsipVital));

// Safe lookup untuk model referensi (dipakai di dropdown Create/Edit)
const BukuTanah = db.buku_tanah || (db.models && db.models.buku_tanah);
const SuratUkur = db.surat_ukur || (db.models && db.models.surat_ukur);
const Warkah = db.warkah || (db.models && db.models.warkah);

// --- 2. HELPER FUNCTIONS ---
function ensureModelOrRespond(res) {
    if (!DaftarArsip) {
        const msg = "Server Error: Model 'daftar_arsip_vital' tidak ditemukan/dikonfigurasi.";
        console.error(msg);
        if (res) res.status(500).send(msg);
        return false;
    }
    return true;
}

function isValidId(id) {
    const n = Number(id);
    return Number.isInteger(n) && n > 0;
}

// --- 3. CONTROLLER METHODS ---

/**
 * TAMPILKAN LIST (INDEX)
 * Menggunakan findAll standar karena data rekap sudah ada di tabel ini
 */
exports.showIndex = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const q = (req.query.q || '').toString().trim();
        
        const options = {
            order: [['nomor_urut', 'ASC']],
            limit: 500,
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        };

        if (q) {
            options.where = {
                [Op.or]: [
                    { nomor_hak: { [Op.like]: `%${q}%` } },
                    { kode_klasifikasi: { [Op.like]: `%${q}%` } },
                    { nomor_item_arsip_uraian: { [Op.like]: `%${q}%` } },
                    { lokasi_simpan_bt_ruang_rak: { [Op.like]: `%${q}%` } }
                ]
            };
        }

        const records = await DaftarArsip.findAll(options);
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

/**
 * TAMPILKAN FORM CREATE
 * Mengambil data ringkas BT, SU, Warkah untuk dropdown pilihan
 */
exports.showCreateForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        // Ambil data referensi (Limit 100 terakhir agar ringan)
        // Jika ingin semua, hapus limit (tapi hati-hati jika data ribuan)
        const listBT = BukuTanah ? await BukuTanah.findAll({ 
            attributes: ['id_buku_tanah', 'nomor_hak'], 
            order: [['id_buku_tanah', 'DESC']], 
            limit: 100 
        }) : [];

        const listSU = SuratUkur ? await SuratUkur.findAll({ 
            attributes: ['id_surat_ukur', 'nomor_surat_ukur'], 
            order: [['id_surat_ukur', 'DESC']], 
            limit: 100 
        }) : [];

        const listWarkah = Warkah ? await Warkah.findAll({ 
            attributes: ['id_warkah', 'nomor_di_208'], 
            order: [['id_warkah', 'DESC']], 
            limit: 100 
        }) : [];

        return res.render('daftar_arsip/tambah_daftar_arsip', {
            user: req.session?.user || null,
            error: req.query.error || null,
            success: req.query.success || null,
            old: {},
            listBT: listBT.map(i => i.toJSON()),
            listSU: listSU.map(i => i.toJSON()),
            listWarkah: listWarkah.map(i => i.toJSON())
        });
    } catch (err) {
        console.error('daftarArsip.showCreateForm error:', err);
        return res.status(500).send('Server Error loading form');
    }
};

/**
 * PROSES SIMPAN DATA BARU
 */
exports.create = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const data = req.body;

        // Validasi Wajib
        if (!data.nomor_urut) {
            return res.redirect('/daftar-arsip/create?error=' + encodeURIComponent('Nomor Urut wajib diisi'));
        }

        // Bersihkan string kosong jadi null agar database rapi
        Object.keys(data).forEach(key => {
            if (data[key] === '') data[key] = null;
        });

        await DaftarArsip.create(data);

        return res.redirect('/daftar-arsip?success=' + encodeURIComponent('Daftar Arsip berhasil ditambahkan'));
    } catch (err) {
        console.error('daftarArsip.create error:', err);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.redirect('/daftar-arsip/create?error=' + encodeURIComponent('Nomor Urut sudah ada (duplikat)'));
        }
        return res.redirect('/daftar-arsip/create?error=' + encodeURIComponent('Gagal menyimpan data'));
    }
};

/**
 * TAMPILKAN FORM EDIT
 */
exports.showEditForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;
        const id = req.params.id;
        
        if (!isValidId(id)) return res.status(400).send('ID tidak valid');

        const record = await DaftarArsip.findByPk(Number(id));
        if (!record) return res.status(404).send('Data tidak ditemukan');

        // Load referensi lagi untuk dropdown edit
        const listBT = BukuTanah ? await BukuTanah.findAll({ attributes: ['id_buku_tanah', 'nomor_hak'], limit: 100 }) : [];
        const listSU = SuratUkur ? await SuratUkur.findAll({ attributes: ['id_surat_ukur', 'nomor_surat_ukur'], limit: 100 }) : [];
        const listWarkah = Warkah ? await Warkah.findAll({ attributes: ['id_warkah', 'nomor_di_208'], limit: 100 }) : [];

        return res.render('daftar_arsip/edit_daftar_arsip', {
            arsip: record.toJSON(),
            listBT: listBT.map(i => i.toJSON()),
            listSU: listSU.map(i => i.toJSON()),
            listWarkah: listWarkah.map(i => i.toJSON()),
            user: req.session?.user || null,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('daftarArsip.showEditForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/**
 * PROSES UPDATE
 */
exports.update = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;
        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).send('ID tidak valid');

        const data = req.body;
        
        // Bersihkan data
        Object.keys(data).forEach(key => {
            if (data[key] === '') data[key] = null;
        });

        await DaftarArsip.update(data, {
            where: { id_daftar_arsip: Number(id) }
        });

        return res.redirect('/daftar-arsip?success=' + encodeURIComponent('Data berhasil diperbarui'));
    } catch (err) {
        console.error('daftarArsip.update error:', err);
        return res.redirect('/daftar-arsip/edit/' + req.params.id + '?error=' + encodeURIComponent('Gagal update data'));
    }
};

/**
 * PROSES DELETE
 */
exports.delete = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    
    const t = await db.sequelize.transaction();
    
    try {
        const id = req.params.id;
        if (!isValidId(id)) {
            await t.rollback();
            return res.status(400).send('ID tidak valid');
        }

        // 1. Ambil data dulu untuk menyimpan ID dokumen aslinya
        const record = await DaftarArsip.findByPk(Number(id), { transaction: t });
        
        if (!record) {
            await t.rollback();
            return res.redirect('/daftar-arsip?error=' + encodeURIComponent('Data tidak ditemukan'));
        }

        // Simpan ID dokumen asli ke variabel (karena record akan segera dihapus)
        const id_bt = record.id_dokumen_bt;
        const id_su = record.id_dokumen_su;
        const id_w  = record.id_dokumen_warkah;

        // 2. [PENTING] Hapus Data di Daftar Arsip TERLEBIH DAHULU
        // Ini akan melepaskan ikatan Foreign Key
        await DaftarArsip.destroy({ where: { id_daftar_arsip: Number(id) }, transaction: t });

        // 3. Setelah ikatan lepas, baru Hapus Dokumen Asli (Buku Tanah, dll)
        // Cek dulu apakah BukuTanah sudah didefinisikan di bagian atas controller
        if (id_bt && BukuTanah) {
            await BukuTanah.destroy({ where: { id_buku_tanah: id_bt }, transaction: t });
        }
        if (id_su && SuratUkur) {
            await SuratUkur.destroy({ where: { id_surat_ukur: id_su }, transaction: t });
        }
        if (id_w && Warkah) {
            await Warkah.destroy({ where: { id_warkah: id_w }, transaction: t });
        }
        
        // 4. Commit (Simpan Permanen)
        await t.commit();
        
        return res.redirect('/daftar-arsip?success=' + encodeURIComponent('Data arsip BESERTA dokumen aslinya berhasil dihapus permanen.'));

    } catch (err) {
        // Batalkan semua jika ada error
        await t.rollback();
        
        // Tampilkan error detail di terminal agar kita tahu penyebab pastinya
        console.error('DETAIL ERROR DELETE:', err.message); 
        console.error(err);

        return res.redirect('/daftar-arsip?error=' + encodeURIComponent('Gagal menghapus data (Cek terminal server untuk detail error)'));
    }
};

/**
 * TAMPILKAN DETAIL (GABUNGAN 3 TABEL)
 * Ini fitur "One-Stop Info" menggunakan RAW QUERY JOIN
 */
exports.showDetail = async (req, res) => {
    try {
        const id = req.params.id;
        if (!isValidId(id)) return res.redirect('/daftar-arsip?error=ID tidak valid');

        const sql = `
            SELECT 
                dav.*,
                
                -- Detail Buku Tanah
                bt.nomor_hak AS bt_nomor_hak,
                bt.jenis_hak AS bt_jenis_hak,
                bt.tahun_terbit AS bt_tahun,
                bt.media AS bt_media,
                bt.jumlah AS bt_jumlah,
                bt.lokasi_penyimpanan AS bt_lokasi,
                bt.no_boks_definitif AS bt_boks,

                -- Detail Surat Ukur
                su.nomor_surat_ukur AS su_nomor,
                su.nomor_hak AS su_nomor_hak,
                su.tahun_terbit AS su_tahun,
                su.media AS su_media,
                su.jumlah AS su_jumlah,
                su.lokasi_penyimpanan AS su_lokasi,
                su.no_boks_definitif AS su_boks,

                -- Detail Warkah
                w.nomor_di_208 AS w_nomor,
                w.nomor_hak AS w_nomor_hak,
                w.tahun_terbit AS w_tahun,
                w.media AS w_media,
                w.jumlah AS w_jumlah,
                w.lokasi_penyimpanan AS w_lokasi,
                w.no_boks_definitif AS w_boks,
                w.uraian_informasi_arsip AS w_uraian

            FROM daftar_arsip_vital AS dav
            LEFT JOIN buku_tanah AS bt ON dav.id_dokumen_bt = bt.id_buku_tanah
            LEFT JOIN surat_ukur AS su ON dav.id_dokumen_su = su.id_surat_ukur
            LEFT JOIN warkah AS w ON dav.id_dokumen_warkah = w.id_warkah
            WHERE dav.id_daftar_arsip = :id
        `;

        const [record] = await db.sequelize.query(sql, {
            replacements: { id: id },
            type: QueryTypes.SELECT
        });

        if (!record) return res.status(404).send('Data tidak ditemukan');

        return res.render('daftar_arsip/detail_daftar_arsip', {
            data: record,
            user: req.session?.user || null,
            error: null,
            success: null
        });

    } catch (err) {
        console.error('daftarArsip.showDetail error:', err);
        return res.status(500).send('Gagal mengambil detail gabungan');
    }
};

/**
 * DOWNLOAD CSV
 */
exports.download = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;
        
        const q = (req.query.q || '').toString().trim();
        const records = await DaftarArsip.findAll({
            limit: 2000,
            order: [['nomor_urut', 'ASC']]
        });

        const headers = [
            'No Urut', 'Klasifikasi', 'No Hak', 'Uraian', 
            'Media BT', 'Jml BT', 'Lokasi BT', 
            'Media SU', 'Jml SU', 'Lokasi SU', 
            'Media Warkah', 'Jml Warkah', 'Lokasi Warkah'
        ];
        
        const rows = [headers.join(',')];

        records.forEach(r => {
            const escape = (s) => s ? `"${String(s).replace(/"/g, '""')}"` : '';
            const row = [
                r.nomor_urut,
                escape(r.kode_klasifikasi),
                escape(r.nomor_hak),
                escape(r.nomor_item_arsip_uraian),
                escape(r.media_buku_tanah),
                r.jumlah_buku_tanah,
                escape(r.lokasi_simpan_bt_ruang_rak),
                escape(r.media_surat_ukur),
                r.jumlah_surat_ukur,
                escape(r.lokasi_simpan_su_ruang_rak),
                escape(r.media_warkah),
                r.jumlah_warkah,
                escape(r.lokasi_simpan_warkah_ruang_rak)
            ];
            rows.push(row.join(','));
        });

        const csvContent = rows.join('\r\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="daftar_arsip_${Date.now()}.csv"`);
        res.send(csvContent);

    } catch (err) {
        console.error('daftarArsip.download error:', err);
        res.status(500).send('Gagal download');
    }
};

/**
 * QR CODE IMAGE
 */
exports.qrImage = async (req, res) => {
    try {
        const id = req.params.id;
        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const url = `${baseUrl}/daftar-arsip/${id}`;
        const buffer = await QRCode.toBuffer(url, { type: 'png', width: 200, margin: 2 });
        res.type('png').send(buffer);
    } catch(e) { res.status(500).send('QR Error'); }
};

/**
 * DOWNLOAD QR
 */
exports.qrDownload = async (req, res) => {
    try {
        const id = req.params.id;
        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const url = `${baseUrl}/daftar-arsip/${id}`;
        const buffer = await QRCode.toBuffer(url, { type: 'png', width: 300, margin: 2 });
        res.setHeader('Content-Disposition', `attachment; filename="daftar_arsip_${id}.png"`);
        res.type('png').send(buffer);
    } catch(e) { res.status(500).send('QR Error'); }
};