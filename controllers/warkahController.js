// controllers/warkahController.js
const db = require('../config/db');
const { Op } = require('sequelize');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// safe model lookup
const Warkah = db.warkah || (db.models && (db.models.warkah || db.models.Warkah));
const Lokasi = db.lokasi || (db.models && (db.models.lokasi || db.models.Lokasi));

if (!Warkah) {
    console.error("Model 'warkah' tidak ditemukan pada export db. Keys in db:", Object.keys(db));
}

function ensureModelOrRespond(res) {
    if (!Warkah) {
        const msg = "Server misconfiguration: model 'warkah' tidak tersedia. Periksa config/db.js";
        console.error(msg);
        if (res && typeof res.status === 'function') {
            res.status(500).send(msg);
            return false;
        }
        throw new Error(msg);
    }
    return true;
}

function isValidId(id) {
    if (id == null) return false;
    const n = Number(id);
    return Number.isInteger(n) && n > 0;
}

// allowed enums (sinkron dengan model warkah.js)
const ALLOWED_MEDIA = ['Kertas', 'Digital', 'Microfilm'];
const ALLOWED_TINGKAT_PERKEMBANGAN = ['Asli', 'Copy', 'Salinan'];
const ALLOWED_METODE_PROTEKSI = ['Vaulting', 'Cloud', 'Physical'];

/**
 * parseDateIndo
 * - Menerima string tanggal dalam format:
 *   dd-mm-yyyy, dd/mm/yyyy, yyyy-mm-dd, yyyy/mm/dd, atau 'YYYY'
 * - Mengembalikan objek Date atau null jika tidak bisa diparse.
 */
function parseDateIndo(input) {
    if (!input && input !== 0) return null;
    const s = String(input).trim();

    // dd-mm-yyyy or dd/mm/yyyy
    let m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (m) {
        const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
        if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) return new Date(y, mo - 1, d);
        return null;
    }

    // yyyy-mm-dd or yyyy/mm/dd
    m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (m) {
        const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
        if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) return new Date(y, mo - 1, d);
        return null;
    }

    // year only YYYY
    if (/^\d{4}$/.test(s)) {
        return new Date(`${s}-01-01`);
    }

    // terakhir: fallback ke Date parse bawaan
    const fallback = new Date(s);
    return isNaN(fallback.getTime()) ? null : fallback;
}

/** showIndex - list semua warkah, optional q untuk pencarian */
exports.showIndex = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const q = (req.query.q || '').toString().trim();
        let records = [];

        const baseOptions = {
            order: [['id_warkah', 'DESC']],
            limit: 1000,
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        };

        if (q) {
            if (isValidId(q)) {
                const r = await Warkah.findByPk(Number(q), baseOptions);
                records = r ? [r] : [];
            } else {
                records = await Warkah.findAll({
                    ...baseOptions,
                    where: {
                        [Op.or]: [
                            { nomor_hak: { [Op.like]: `%${q}%` } },
                            { nomor_di_208: { [Op.like]: `%${q}%` } },
                            { kode_klasifikasi: { [Op.like]: `%${q}%` } },
                            { lokasi_penyimpanan: { [Op.like]: `%${q}%` } },
                            { no_boks_definitif: { [Op.like]: `%${q}%` } }
                        ]
                    }
                });
            }
        } else {
            records = await Warkah.findAll(baseOptions);
        }

        const recordsPlain = Array.isArray(records)
            ? records.map(r => (r && typeof r.toJSON === 'function' ? r.toJSON() : r))
            : [];

        return res.render('warkah/list_warkah', {
            records: recordsPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            filter_q: q,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('warkah.showIndex error:', err);
        return res.status(500).send('Server Error');
    }
};

/** showCreateForm - tampilkan form tambah warkah */
exports.showCreateForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        let locations = [];
        if (Lokasi) {
            try {
                const raw = await Lokasi.findAll({
                    attributes: ['id_lokasi', 'kode_lokasi', 'ruangan', 'no_rak'],
                    order: [['kode_lokasi', 'ASC']],
                    limit: 1000
                });
                locations = raw.map(r => (r && typeof r.toJSON === 'function' ? r.toJSON() : r));
            } catch (e) {
                console.error("Gagal mengambil data lokasi:", e);
            }
        }

        return res.render('warkah/tambah_warkah', {
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null,
            old: {},
            locations
        });
    } catch (err) {
        console.error('warkah.showCreateForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/** create - simpan warkah baru (raw SQL agar pakai created_at/updated_at) */
/** create - simpan warkah baru (raw SQL agar pakai created_at/updated_at) */
exports.create = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;

    const uploaded = Array.isArray(req.uploadedFiles) ? req.uploadedFiles : [];

    async function cleanupUploadedFiles() {
        for (const f of uploaded) {
            try { if (f && f.fullpath) await fs.unlink(f.fullpath).catch(() => { }); } catch (e) { }
        }
    }

    const t = await db.sequelize.transaction();
    try {
        const {
            nomor_di_208,
            nomor_hak,
            tahun_terbit,
            kode_klasifikasi,
            jenis_arsip_vital,
            uraian_informasi_arsip,
            media,
            jumlah,
            jangka_simpan_aktif,
            jangka_simpan_inaktif,
            jangka_simpan_keterangan,
            tingkat_perkembangan,
            lokasi_penyimpanan,
            no_boks_definitif,
            nomor_folder,
            metode_perlindungan,
            keterangan
        } = req.body;

        // validasi enum singkat
        if (media && !ALLOWED_MEDIA.includes(media)) {
            await t.rollback(); await cleanupUploadedFiles();
            return res.redirect('/warkah/create?error=' + encodeURIComponent('media tidak valid'));
        }
        if (tingkat_perkembangan && !ALLOWED_TINGKAT_PERKEMBANGAN.includes(tingkat_perkembangan)) {
            await t.rollback(); await cleanupUploadedFiles();
            return res.redirect('/warkah/create?error=' + encodeURIComponent('tingkat_perkembangan tidak valid'));
        }
        if (metode_perlindungan && !ALLOWED_METODE_PROTEKSI.includes(metode_perlindungan)) {
            await t.rollback(); await cleanupUploadedFiles();
            return res.redirect('/warkah/create?error=' + encodeURIComponent('metode_perlindungan tidak valid'));
        }

        // parse jumlah & nomor_folder
        let jumlahVal = null;
        if (typeof jumlah !== 'undefined' && jumlah !== '' && jumlah !== null) {
            const n = Number(String(jumlah).replace(',', '.'));
            if (!Number.isFinite(n) || n < 0) {
                await t.rollback(); await cleanupUploadedFiles();
                return res.redirect('/warkah/create?error=' + encodeURIComponent('jumlah harus angka >= 0'));
            }
            jumlahVal = Number.isInteger(n) ? n : n;
        }

        let nomorFolderVal = null;
        if (typeof nomor_folder !== 'undefined' && nomor_folder !== '' && nomor_folder !== null) {
            const nf = Number(nomor_folder);
            if (!Number.isInteger(nf) || nf < 0) {
                await t.rollback(); await cleanupUploadedFiles();
                return res.redirect('/warkah/create?error=' + encodeURIComponent('nomor_folder harus integer >= 0'));
            }
            nomorFolderVal = nf;
        }

        // tahun_terbit
        let tahunVal = null;
        if (typeof tahun_terbit !== 'undefined' && tahun_terbit !== '' && tahun_terbit !== null) {
            tahunVal = parseDateIndo(tahun_terbit);
        }

        // files list dari middleware -> relativePath (uploads/warkah/filename.pdf)
        const filesList = uploaded.map(f => f.relativePath);
        const filesJson = filesList.length ? JSON.stringify(filesList) : null;

        // raw insert
        const now = new Date();
        const sql = `INSERT INTO warkah
            (nomor_di_208, nomor_hak, tahun_terbit, kode_klasifikasi, jenis_arsip_vital, uraian_informasi_arsip,
             media, jumlah, jangka_simpan_aktif, jangka_simpan_inaktif, jangka_simpan_keterangan,
             tingkat_perkembangan, lokasi_penyimpanan, no_boks_definitif, nomor_folder, metode_perlindungan,
             keterangan, files, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

        const replacements = [
            nomor_di_208 || null,
            nomor_hak || null,
            tahunVal ? tahunVal : null,
            kode_klasifikasi || null,
            jenis_arsip_vital || null,
            uraian_informasi_arsip || null,
            media || null,
            jumlahVal,
            jangka_simpan_aktif || null,
            jangka_simpan_inaktif || null,
            jangka_simpan_keterangan || null,
            tingkat_perkembangan || null,
            lokasi_penyimpanan || null,
            no_boks_definitif || null,
            nomorFolderVal,
            metode_perlindungan || null,
            keterangan || null,
            filesJson, // <- simpan daftar file
            now,
            now
        ];

        await db.sequelize.query(sql, { replacements, transaction: t });

        await t.commit();
        return res.redirect('/warkah?success=' + encodeURIComponent('Warkah berhasil ditambahkan'));
    } catch (err) {
        await t.rollback();
        console.error('warkah.create error (raw insert):', err);
        // bersihkan file yang ter-upload apabila gagal
        await cleanupUploadedFiles();
        return res.redirect('/warkah/create?error=' + encodeURIComponent('Gagal menyimpan data warkah'));
    }
};

/** showEditForm - tampilkan form edit berdasarkan id_warkah */
exports.showEditForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).send('Parameter id tidak valid');

        const record = await Warkah.findByPk(Number(id), {
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });
        if (!record) return res.status(404).send('Data warkah tidak ditemukan');

        const recordPlain = record && typeof record.toJSON === 'function' ? record.toJSON() : record;

        // optional: kirim locations juga bila view membutuhkan
        let locations = [];
        if (Lokasi) {
            try {
                const raw = await Lokasi.findAll({
                    attributes: ['id_lokasi', 'kode_lokasi', 'ruangan', 'no_rak'],
                    order: [['kode_lokasi', 'ASC']],
                    limit: 1000
                });
                locations = raw.map(r => (r && typeof r.toJSON === 'function' ? r.toJSON() : r));
            } catch (e) {
                console.error("Gagal mengambil data lokasi:", e);
            }
        }

        return res.render('warkah/edit_warkah', {
            warkah: recordPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null,
            locations
        });
    } catch (err) {
        console.error('warkah.showEditForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/** update - update warkah */
exports.update = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!isValidId(id)) {
            await t.rollback();
            return res.status(400).send('ID tidak valid');
        }

        const item = await Warkah.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!item) {
            await t.rollback();
            return res.status(404).send('Data warkah tidak ditemukan');
        }

        // ... (parsing & assignment fields sama seperti sebelumnya) ...

        // handle uploaded files (middleware membuat req.uploadedFiles)
        const uploaded = Array.isArray(req.uploadedFiles) ? req.uploadedFiles : [];
        if (uploaded.length) {
            // hapus old files (jika ada)
            if (item.files) {
                try {
                    const oldArr = JSON.parse(item.files);
                    for (const p of oldArr) {
                        const abs = path.join(process.cwd(), p);
                        if (fsSync.existsSync(abs)) {
                            try { fsSync.unlinkSync(abs); } catch (e) { /* ignore */ }
                        }
                    }
                } catch (e) { /* ignore parse error */ }
            }
            const newFilesRel = uploaded.map(f => f.relativePath);
            item.files = JSON.stringify(newFilesRel);
        }

        await item.save({
            transaction: t,
            fields: [
                'nomor_di_208', 'nomor_hak', 'tahun_terbit', 'kode_klasifikasi', 'jenis_arsip_vital', 'uraian_informasi_arsip',
                'media', 'jumlah', 'jangka_simpan_aktif', 'jangka_simpan_inaktif', 'jangka_simpan_keterangan',
                'tingkat_perkembangan', 'lokasi_penyimpanan', 'no_boks_definitif', 'nomor_folder', 'metode_perlindungan',
                'keterangan', 'files' // <- sertakan files supaya tersimpan
            ],
            silent: true
        });

        await t.commit();
        return res.redirect('/warkah?success=' + encodeURIComponent('Warkah berhasil diupdate'));
    } catch (err) {
        await t.rollback();
        console.error('warkah.update error:', err);
        return res.redirect('/warkah/edit/' + (req.params.id || '') + '?error=' + encodeURIComponent('Gagal mengupdate data'));
    }
};


/** delete - hapus record berdasarkan id_warkah */
exports.delete = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!isValidId(id)) {
            await t.rollback();
            return res.status(400).send('ID tidak valid');
        }

        const record = await Warkah.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!record) {
            await t.rollback();
            return res.redirect('/warkah?error=' + encodeURIComponent('Data tidak ditemukan'));
        }

        await Warkah.destroy({ where: { id_warkah: record.id_warkah }, transaction: t });
        await t.commit();
        return res.redirect('/warkah?success=' + encodeURIComponent('Warkah berhasil dihapus'));
    } catch (err) {
        await t.rollback();
        console.error('warkah.delete error:', err);
        return res.redirect('/warkah?error=' + encodeURIComponent('Gagal menghapus data'));
    }
};

/** showDetail - tampilkan detail berdasarkan id_warkah */
exports.showDetail = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;
        const id = req.params.id;
        if (!isValidId(id)) return res.redirect('/warkah?error=' + encodeURIComponent('ID tidak valid'));

        const record = await Warkah.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!record) return res.status(404).send('Data tidak ditemukan');

        const recordPlain = typeof record.toJSON === 'function' ? record.toJSON() : record;

        return res.render('warkah/detail_warkah', {
            warkah: recordPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('warkah.showDetail error:', err);
        return res.redirect('/warkah?error=' + encodeURIComponent('Terjadi kesalahan saat mengambil data'));
    }
};

/** download - download data warkah sebagai CSV */
exports.download = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const q = (req.query.q || '').toString().trim();
        const columnsParam = (req.query.columns || '').toString().trim();

        const ALLOWED_COLS = [
            'id_warkah', 'nomor_di_208', 'nomor_hak', 'tahun_terbit', 'kode_klasifikasi',
            'jenis_arsip_vital', 'uraian_informasi_arsip', 'media', 'jumlah',
            'jangka_simpan_aktif', 'jangka_simpan_inaktif', 'jangka_simpan_keterangan',
            'tingkat_perkembangan', 'lokasi_penyimpanan', 'no_boks_definitif', 'nomor_folder',
            'metode_perlindungan', 'keterangan'
        ];

        const selectedCols = columnsParam
            ? columnsParam.split(',').map(c => c.trim()).filter(c => ALLOWED_COLS.includes(c))
            : ALLOWED_COLS.slice();

        // bangun where (sama seperti showIndex)
        let where = undefined;
        if (q) {
            if (isValidId(q)) {
                where = { id_warkah: Number(q) };
            } else {
                where = {
                    [Op.or]: [
                        { nomor_hak: { [Op.like]: `%${q}%` } },
                        { nomor_di_208: { [Op.like]: `%${q}%` } },
                        { kode_klasifikasi: { [Op.like]: `%${q}%` } },
                        { lokasi_penyimpanan: { [Op.like]: `%${q}%` } },
                        { no_boks_definitif: { [Op.like]: `%${q}%` } }
                    ]
                };
            }
        }

        const records = await Warkah.findAll({
            where,
            order: [['id_warkah', 'DESC']],
            limit: 1000,
            attributes: selectedCols
        });

        // helper format nilai (khusus tahun_terbit --> tampilkan tahun)
        function formatCell(key, val) {
            if (val == null) return '';
            if (key === 'tahun_terbit') {
                if (val instanceof Date && !isNaN(val.getTime())) return String(val.getFullYear());
                const s = String(val).trim();
                if (/^\d{4}$/.test(s)) return s;
                const d = new Date(s);
                return isNaN(d.getTime()) ? s : String(d.getFullYear());
            }
            // untuk teks panjang, tetap string
            return String(val);
        }

        const headerMap = {
            id_warkah: 'ID',
            nomor_di_208: 'Nomor DI-208',
            nomor_hak: 'Nomor Hak',
            tahun_terbit: 'Tahun',
            kode_klasifikasi: 'Kode Klasifikasi',
            jenis_arsip_vital: 'Jenis Arsip Vital',
            uraian_informasi_arsip: 'Uraian Informasi Arsip',
            media: 'Media',
            jumlah: 'Jumlah',
            jangka_simpan_aktif: 'Jangka Simpan Aktif',
            jangka_simpan_inaktif: 'Jangka Simpan Inaktif',
            jangka_simpan_keterangan: 'Keterangan Jangka Simpan',
            tingkat_perkembangan: 'Tingkat Perkembangan',
            lokasi_penyimpanan: 'Lokasi Penyimpanan',
            no_boks_definitif: 'No Boks Definitif',
            nomor_folder: 'Nomor Folder',
            metode_perlindungan: 'Metode Perlindungan',
            keterangan: 'Keterangan'
        };

        // escape CSV sederhana
        const escapeCsv = (s) => {
            const str = s == null ? '' : String(s);
            if (str.indexOf('"') !== -1) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            if (/[,\n\r]/.test(str) || /^\s|\s$/.test(str)) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = selectedCols.map(c => headerMap[c] || c);
        const rows = [headers.join(',')];

        for (const rec of records) {
            const plain = rec && typeof rec.toJSON === 'function' ? rec.toJSON() : rec;
            const vals = selectedCols.map(col => escapeCsv(formatCell(col, plain[col])));
            rows.push(vals.join(','));
        }

        const csvContent = rows.join('\r\n');
        const filename = `warkah_${(new Date()).toISOString().replace(/[:.]/g, '')}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csvContent);
    } catch (err) {
        console.error('warkah.download error:', err);
        return res.status(500).send('Gagal membuat file download');
    }
};

/**
 * GET /warkah/:id/qr.png
 * Generate PNG QR on-the-fly (mengarah ke halaman detail warkah)
 */
exports.qrImage = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;
        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).send('ID tidak valid');

        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        // detail route untuk warkah pada project Anda menggunakan /warkah/detail/:id
        const detailUrl = `${baseUrl}/warkah/detail/${Number(id)}`;

        const buffer = await QRCode.toBuffer(detailUrl, {
            type: 'png',
            errorCorrectionLevel: 'H',
            margin: 2,
            scale: 6
        });

        res.type('png').send(buffer);
    } catch (err) {
        console.error('warkah.qrImage error:', err);
        return res.status(500).send('Gagal menghasilkan QR');
    }
};

/**
 * GET /warkah/:id/qr/download
 * Download PNG QR sebagai attachment
 */
exports.qrDownload = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;
        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).send('ID tidak valid');

        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const detailUrl = `${baseUrl}/warkah/detail/${Number(id)}`;

        const buffer = await QRCode.toBuffer(detailUrl, {
            type: 'png',
            errorCorrectionLevel: 'H',
            margin: 2,
            scale: 8
        });

        res.setHeader('Content-Disposition', `attachment; filename="warkah_${id}_qr.png"`);
        res.type('png').send(buffer);
    } catch (err) {
        console.error('warkah.qrDownload error:', err);
        return res.status(500).send('Gagal download QR');
    }
};