const db = require('../config/db');
const { Op } = require('sequelize');
const Sequelize = require('sequelize');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun, ImageRun } = require('docx');

// safe lookup model (sesuaikan properti kalau berbeda)
const BukuTanah = db.buku_tanah || (db.models && (db.models.buku_tanah || db.models.Buku_tanah));
const Lokasi = db.lokasi || (db.models && (db.models.lokasi || db.models.Lokasi));

if (!BukuTanah) {
    console.error("Model 'buku_tanah' tidak ditemukan pada export db. Keys in db:", Object.keys(db));
}

function ensureModelOrRespond(res) {
    if (!BukuTanah) {
        const msg = "Server misconfiguration: model 'buku_tanah' tidak tersedia. Periksa config/db.js";
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

// allowed enums (sinkron dengan model)
const ALLOWED_JENIS_HAK = ['HM', 'HGB', 'HP', 'HGU', 'Pengelolaan', 'Lainnya'];
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

/** showIndex - list semua buku_tanah, optional q untuk pencarian */
exports.showIndex = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const q = (req.query.q || '').toString().trim();
        const filterYear = (req.query.year || '').toString().trim();
        let records = [];

        const baseOptions = {
            order: [['id_buku_tanah', 'ASC']],
            limit: 1000,
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        };

        // --- ambil daftar tahun unik dari DB (ascending) ---
        let years = [];
        try {
            // coba menggunakan YEAR() (jika column bertipe DATE/DATETIME)
            const yearRows = await BukuTanah.findAll({
                attributes: [[Sequelize.fn('YEAR', Sequelize.col('tahun_terbit')), 'year']],
                where: { tahun_terbit: { [Op.ne]: null } },
                group: ['year'],
                order: [[Sequelize.literal('year'), 'ASC']],
                raw: true,
                limit: 1000
            });
            years = yearRows.map(r => r.year).filter(y => y !== null && typeof y !== 'undefined').map(Number).filter(y => !Number.isNaN(y));
            years = Array.from(new Set(years)).sort((a, b) => b - a);
        } catch (e) {
            console.error('Gagal fetch years using YEAR():', e);
        }

        // fallback: jika tidak ada hasil (mungkin tahun disimpan sebagai string), ambil distinct nilai yang match 4 digit
        if (!years.length) {
            try {
                const [rows] = await db.sequelize.query(
                    "SELECT DISTINCT tahun_terbit AS year FROM buku_tanah WHERE tahun_terbit REGEXP '^[0-9]{4}$' ORDER BY tahun_terbit ASC;"
                );
                years = rows.map(r => Number(r.year)).filter(y => !Number.isNaN(y));
            } catch (e) {
                console.error('Fallback fetch distinct tahun gagal:', e);
            }
        }

        if (q) {
            // PERBAIKAN: Masukkan semua kemungkinan pencarian ke dalam satu array OR
            const searchConditions = [
                { nomor_hak: { [Op.like]: `%${q}%` } },
                { lokasi_penyimpanan: { [Op.like]: `%${q}%` } },
                { no_boks_definitif: { [Op.like]: `%${q}%` } },
                { jenis_hak: { [Op.like]: `%${q}%` } },
                { media: { [Op.like]: `%${q}%` } }
            ];

            // Jika input berupa angka valid, tambahkan pencarian berdasarkan ID juga
            if (isValidId(q)) {
                searchConditions.push({ id_buku_tanah: Number(q) });
            }

            // bangun where awal berdasarkan q
            let whereQ = { [Op.or]: searchConditions };

            // jika filterYear valid, gabungkan dengan AND
            if (/^\d{4}$/.test(filterYear)) {
                const yearNumber = Number(filterYear);
                const yearCond = Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('tahun_terbit')), yearNumber);
                // gabungkan keduanya
                whereQ = { [Op.and]: [whereQ, yearCond] };
            }

            records = await BukuTanah.findAll({
                ...baseOptions,
                where: whereQ
            });
        } else {
            // tidak ada q -> mungkin ada filterYear saja
            let whereNoQ = undefined;
            if (/^\d{4}$/.test(filterYear)) {
                const yearNumber = Number(filterYear);
                whereNoQ = Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('tahun_terbit')), yearNumber);
            }

            records = await BukuTanah.findAll({
                ...baseOptions,
                where: whereNoQ
            });
        }

        const recordsPlain = Array.isArray(records)
            ? records.map(r => (r && typeof r.toJSON === 'function' ? r.toJSON() : r))
            : [];

        return res.render('buku_tanah/list_buku_tanah', {
            records: recordsPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            filter_q: q,
            filter_year: filterYear,     // <-- kirim pilihan tahun saat ini ke view
            years,                       // <-- kirim daftar tahun ke view
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('bukuTanah.showIndex error:', err);
        return res.status(500).send('Server Error');
    }
};

/** showCreateForm - tampilkan form tambah buku_tanah */
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

        return res.render('buku_tanah/tambah_buku_tanah', {
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null,
            old: {},
            locations // <-- pastikan view mendapat locations
        });
    } catch (err) {
        console.error('bukuTanah.showCreateForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/** create - simpan buku_tanah baru (raw SQL agar pakai created_at/updated_at) */
// controllers/bukuTanahController.js (potongan create yang diperbarui)
exports.create = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const uploaded = Array.isArray(req.uploadedFiles) ? req.uploadedFiles : [];

    // helper cleanup jika terjadi error
    async function cleanupUploadedFiles() {
        for (const f of uploaded) {
            try { if (f && f.fullpath) await fs.unlink(f.fullpath).catch(() => { }); } catch (e) { }
        }
    }

    const t = await db.sequelize.transaction();
    try {
        const {
            nomor_hak, jenis_hak, tahun_terbit, media,
            jumlah, tingkat_perkembangan, lokasi_penyimpanan,
            no_boks_definitif, nomor_folder, metode_perlindungan
        } = req.body;

        // Validasi enum / numeric sama seperti Anda punya (singkat di sini)
        if (jenis_hak && !ALLOWED_JENIS_HAK.includes(jenis_hak)) {
            await t.rollback(); await cleanupUploadedFiles();
            return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('jenis_hak tidak valid'));
        }
        if (media && !ALLOWED_MEDIA.includes(media)) {
            await t.rollback(); await cleanupUploadedFiles();
            return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('media tidak valid'));
        }
        if (tingkat_perkembangan && !ALLOWED_TINGKAT_PERKEMBANGAN.includes(tingkat_perkembangan)) {
            await t.rollback(); await cleanupUploadedFiles();
            return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('tingkat_perkembangan tidak valid'));
        }
        if (metode_perlindungan && !ALLOWED_METODE_PROTEKSI.includes(metode_perlindungan)) {
            await t.rollback(); await cleanupUploadedFiles();
            return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('metode_perlindungan tidak valid'));
        }

        // parse jumlah & nomor_folder & tahun
        let jumlahVal = null;
        if (typeof jumlah !== 'undefined' && jumlah !== '' && jumlah !== null) {
            const n = Number(String(jumlah).replace(',', '.'));
            if (!Number.isFinite(n) || n < 0) {
                await t.rollback(); await cleanupUploadedFiles();
                return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('jumlah harus angka >= 0'));
            }
            jumlahVal = Number.isInteger(n) ? n : n;
        }

        let nomorFolderVal = null;
        if (typeof nomor_folder !== 'undefined' && nomor_folder !== '' && nomor_folder !== null) {
            const nf = Number(nomor_folder);
            if (!Number.isInteger(nf) || nf < 0) {
                await t.rollback(); await cleanupUploadedFiles();
                return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('nomor_folder harus integer >= 0'));
            }
            nomorFolderVal = nf;
        }

        let tahunVal = null;
        if (typeof tahun_terbit !== 'undefined' && tahun_terbit !== '' && tahun_terbit !== null) {
            tahunVal = parseDateIndo(tahun_terbit);
        }

        // files list dari middleware -> relativePath (uploads/buku_tanah/filename.pdf)
        const filesList = uploaded.map(f => f.relativePath);
        const filesJson = filesList.length ? JSON.stringify(filesList) : null;

        // insert awal (qr_path kosong string supaya NOT NULL terpenuhi)
        const now = new Date();
        const sql = `INSERT INTO buku_tanah
      (nomor_hak, jenis_hak, tahun_terbit, media, jumlah, tingkat_perkembangan, lokasi_penyimpanan,
       no_boks_definitif, nomor_folder, metode_perlindungan, qr_path, files, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

        const replacements = [
            nomor_hak || null,
            jenis_hak || null,
            tahunVal ? tahunVal : null,
            media || null,
            jumlahVal,
            tingkat_perkembangan || null,
            lokasi_penyimpanan || null,
            no_boks_definitif || null,
            nomorFolderVal,
            metode_perlindungan || null,
            '', // qr_path placeholder
            filesJson, // simpan list file
            now, now
        ];

        await db.sequelize.query(sql, { replacements, transaction: t });

        // commit dulu
        await t.commit();

        // ambil last insert id
        const [[{ lastId }]] = await db.sequelize.query('SELECT LAST_INSERT_ID() as lastId;');
        const id = lastId;

        // Jika ingin, update files menjadi path lengkap/format lain. Di sini kita simpan relatif (sudah disimpan).
        // Generate QR otomatis (opsional, karena qr_path NOT NULL di model)
        try {
            const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
            const detailUrl = `${baseUrl}/buku-tanah/${Number(id)}`;

            const qrcodeDir = path.join(__dirname, '..', 'public', 'qrcodes');
            await fs.mkdir(qrcodeDir, { recursive: true });

            const filename = `buku_tanah_${id}.png`;
            const filepath = path.join(qrcodeDir, filename);

            const buffer = await QRCode.toBuffer(detailUrl, {
                type: 'png',
                errorCorrectionLevel: 'H',
                margin: 2,
                scale: 8
            });

            await fs.writeFile(filepath, buffer);

            // update qr_path ke 'qrcodes/filename'
            await db.sequelize.query('UPDATE buku_tanah SET qr_path = ? WHERE id_buku_tanah = ?', {
                replacements: [`qrcodes/${filename}`, id]
            });
        } catch (fileErr) {
            console.error('Gagal generate/write QR file:', fileErr);
            // tidak rollback; record tetap ada
        }

        return res.redirect('/buku-tanah?success=' + encodeURIComponent('Buku Tanah berhasil ditambahkan'));
    } catch (err) {
        console.error('bukuTanah.create error:', err);
        try { await t.rollback(); } catch (e) { }
        await cleanupUploadedFiles();
        return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('Gagal menyimpan data buku tanah'));
    }
};

/** showEditForm - tampilkan form edit berdasarkan id_buku_tanah */
exports.showEditForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).send('Parameter id tidak valid');

        const record = await BukuTanah.findByPk(Number(id), {
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });
        if (!record) return res.status(404).send('Data buku tanah tidak ditemukan');

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

        return res.render('buku_tanah/edit_buku_tanah', {
            buku: recordPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null,
            locations
        });
    } catch (err) {
        console.error('bukuTanah.showEditForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/** update - update buku_tanah */
exports.update = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!isValidId(id)) {
            await t.rollback();
            return res.status(400).send('ID tidak valid');
        }

        const item = await BukuTanah.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!item) {
            await t.rollback();
            return res.status(404).send('Data buku tanah tidak ditemukan');
        }

        const {
            nomor_hak,
            jenis_hak,
            tahun_terbit,
            media,
            jumlah,
            tingkat_perkembangan,
            lokasi_penyimpanan,
            no_boks_definitif,
            nomor_folder,
            metode_perlindungan
        } = req.body;

        if (typeof jenis_hak !== 'undefined' && jenis_hak !== '' && !ALLOWED_JENIS_HAK.includes(jenis_hak)) {
            await t.rollback();
            return res.redirect('/buku-tanah/edit/' + id + '?error=' + encodeURIComponent('jenis_hak tidak valid'));
        }

        if (typeof media !== 'undefined' && media !== '' && !ALLOWED_MEDIA.includes(media)) {
            await t.rollback();
            return res.redirect('/buku-tanah/edit/' + id + '?error=' + encodeURIComponent('media tidak valid'));
        }

        if (typeof tingkat_perkembangan !== 'undefined' && tingkat_perkembangan !== '' && !ALLOWED_TINGKAT_PERKEMBANGAN.includes(tingkat_perkembangan)) {
            await t.rollback();
            return res.redirect('/buku-tanah/edit/' + id + '?error=' + encodeURIComponent('tingkat_perkembangan tidak valid'));
        }

        if (typeof metode_perlindungan !== 'undefined' && metode_perlindungan !== '' && !ALLOWED_METODE_PROTEKSI.includes(metode_perlindungan)) {
            await t.rollback();
            return res.redirect('/buku-tanah/edit/' + id + '?error=' + encodeURIComponent('metode_perlindungan tidak valid'));
        }

        // parse jumlah & nomor_folder
        if (typeof jumlah !== 'undefined') {
            if (jumlah === '' || jumlah === null) item.jumlah = null;
            else {
                const n = Number(String(jumlah).replace(',', '.'));
                if (!Number.isFinite(n) || n < 0) {
                    await t.rollback();
                    return res.redirect('/buku-tanah/edit/' + id + '?error=' + encodeURIComponent('jumlah harus angka >= 0'));
                }
                item.jumlah = Number.isInteger(n) ? n : n;
            }
        }

        if (typeof nomor_folder !== 'undefined') {
            if (nomor_folder === '' || nomor_folder === null) item.nomor_folder = null;
            else {
                const nf = Number(nomor_folder);
                if (!Number.isInteger(nf) || nf < 0) {
                    await t.rollback();
                    return res.redirect('/buku-tanah/edit/' + id + '?error=' + encodeURIComponent('nomor_folder harus integer >= 0'));
                }
                item.nomor_folder = nf;
            }
        }

        if (typeof nomor_hak !== 'undefined') item.nomor_hak = nomor_hak || null;
        if (typeof jenis_hak !== 'undefined') item.jenis_hak = jenis_hak || null;

        if (typeof tahun_terbit !== 'undefined') {
            const parsed = parseDateIndo(tahun_terbit);
            item.tahun_terbit = parsed === null ? null : parsed;
        }

        if (typeof media !== 'undefined') item.media = media || null;
        if (typeof tingkat_perkembangan !== 'undefined') item.tingkat_perkembangan = tingkat_perkembangan || null;
        if (typeof lokasi_penyimpanan !== 'undefined') item.lokasi_penyimpanan = lokasi_penyimpanan || null;
        if (typeof no_boks_definitif !== 'undefined') item.no_boks_definitif = no_boks_definitif || null;
        if (typeof metode_perlindungan !== 'undefined') item.metode_perlindungan = metode_perlindungan || null;

        const uploaded = Array.isArray(req.uploadedFiles) ? req.uploadedFiles : [];
        if (uploaded.length) {
            // hapus old files (jika diperlukan)
            if (item.files) {
                try {
                    const oldArr = JSON.parse(item.files);
                    for (const p of oldArr) {
                        const abs = path.join(process.cwd(), p);
                        if (fsSync.existsSync(abs)) fsSync.unlinkSync(abs);
                    }
                } catch (e) { }
            }
            const newFilesRel = uploaded.map(f => f.relativePath);
            item.files = JSON.stringify(newFilesRel);
        }

        await item.save({
            transaction: t,
            fields: [
                'nomor_hak', 'jenis_hak', 'tahun_terbit', 'media', 'jumlah',
                'tingkat_perkembangan', 'lokasi_penyimpanan', 'no_boks_definitif',
                'nomor_folder', 'metode_perlindungan', 'files'
            ],
            silent: true
        });

        await t.commit();
        return res.redirect('/buku-tanah?success=' + encodeURIComponent('Buku Tanah berhasil diupdate'));
    } catch (err) {
        await t.rollback();
        console.error('bukuTanah.update error:', err);
        return res.redirect('/buku-tanah/edit/' + (req.params.id || '') + '?error=' + encodeURIComponent('Gagal mengupdate data'));
    }
};

/** delete - hapus record berdasarkan id_buku_tanah */
exports.delete = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!isValidId(id)) {
            await t.rollback();
            return res.status(400).send('ID tidak valid');
        }

        const record = await BukuTanah.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!record) {
            await t.rollback();
            return res.redirect('/buku-tanah?error=' + encodeURIComponent('Data tidak ditemukan'));
        }

        await BukuTanah.destroy({ where: { id_buku_tanah: record.id_buku_tanah }, transaction: t });
        await t.commit();
        return res.redirect('/buku-tanah?success=' + encodeURIComponent('Buku Tanah berhasil dihapus'));
    } catch (err) {
        await t.rollback();
        console.error('bukuTanah.delete error:', err);
        return res.redirect('/buku-tanah?error=' + encodeURIComponent('Gagal menghapus data'));
    }
};

/** showDetail - tampilkan detail berdasarkan id_buku_tanah */
exports.showDetail = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;
        const id = req.params.id;
        if (!isValidId(id)) return res.redirect('/buku-tanah?error=' + encodeURIComponent('ID tidak valid'));

        const record = await BukuTanah.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!record) return res.status(404).send('Data tidak ditemukan');

        const recordPlain = typeof record.toJSON === 'function' ? record.toJSON() : record;

        return res.render('buku_tanah/detail_buku_tanah', {
            buku: recordPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('bukuTanah.showDetail error:', err);
        return res.redirect('/buku-tanah?error=' + encodeURIComponent('Terjadi kesalahan saat mengambil data'));
    }
};

/** download - download data buku_tanah sebagai CSV
 * Query params:
 *  - q: search query (optional, sama seperti list)
 *  - columns: comma-separated kolom yang ingin diikutsertakan (optional, default: semua kolom)
 */
// tambah di bagian atas file (jika belum ada)
exports.download = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const q = (req.query.q || '').toString().trim();
        const columnsParam = (req.query.columns || '').toString().trim();
        const format = (req.query.format || 'csv').toString().toLowerCase(); // 'csv' atau 'docx'
        const yearParam = (req.query.year || '').toString().trim();
        const year = /^\d{4}$/.test(yearParam) ? Number(yearParam) : null;

        const ALLOWED_COLS = [
            'id_buku_tanah', 'nomor_hak', 'jenis_hak', 'tahun_terbit', 'media',
            'jumlah', 'lokasi_penyimpanan', 'no_boks_definitif', 'nomor_folder', 'metode_perlindungan'
        ];

        const selectedCols = columnsParam
            ? columnsParam.split(',').map(c => c.trim()).filter(c => ALLOWED_COLS.includes(c))
            : ALLOWED_COLS.slice(); // default semua

        // pastikan kita selalu punya id_buku_tanah (untuk QR), tapi jangan duplikasi di selectedCols
        const attributes = Array.from(new Set(['id_buku_tanah', ...selectedCols]));

        // bangun where
        let where = undefined;
        if (q) {
            if (isValidId(q)) {
                where = { id_buku_tanah: Number(q) };
            } else {
                where = {
                    [Op.or]: [
                        { nomor_hak: { [Op.like]: `%${q}%` } },
                        { lokasi_penyimpanan: { [Op.like]: `%${q}%` } },
                        { no_boks_definitif: { [Op.like]: `%${q}%` } },
                        { jenis_hak: { [Op.like]: `%${q}%` } },
                        { media: { [Op.like]: `%${q}%` } }
                    ]
                };
            }
        }

        if (year) {
            const yearCond = Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('tahun_terbit')), year);
            if (!where) {
                where = yearCond;
            } else {
                // gabungkan existing where dan yearCond dengan AND
                where = { [Op.and]: [where, yearCond] };
            }
        }

        const records = await BukuTanah.findAll({
            where,
            order: [['id_buku_tanah', 'ASC']],
            limit: 1000,
            attributes // gunakan attributes yang sudah memastikan id tersedia
        });

        // helper format tanggal/tahun
        function formatCell(key, val) {
            if (val == null) return '';
            if (key === 'tahun_terbit') {
                if (val instanceof Date && !isNaN(val.getTime())) return String(val.getFullYear());
                const s = String(val).trim();
                if (/^\d{4}$/.test(s)) return s;
                const d = new Date(s);
                return isNaN(d.getTime()) ? s : String(d.getFullYear());
            }
            return String(val);
        }

        const headerMap = {
            id_buku_tanah: 'ID',
            nomor_hak: 'Nomor Hak',
            jenis_hak: 'Jenis Hak',
            tahun_terbit: 'Tahun',
            media: 'Media',
            jumlah: 'Jumlah',
            lokasi_penyimpanan: 'Lokasi Penyimpanan',
            no_boks_definitif: 'No Boks Definitif',
            nomor_folder: 'Nomor Folder',
            metode_perlindungan: 'Metode Perlindungan'
        };

        // ---------- CSV path ----------
        if (format === 'csv') {
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

            // gunakan selectedCols (tanpa memaksa id) untuk CSV supaya sesuai pilihan user
            const csvCols = selectedCols.length ? selectedCols : ALLOWED_COLS.slice();
            const headers = csvCols.map(c => headerMap[c] || c);
            const rows = [headers.join(',')];

            for (const rec of records) {
                const plain = rec && typeof rec.toJSON === 'function' ? rec.toJSON() : rec;
                const vals = csvCols.map(col => escapeCsv(formatCell(col, plain[col])));
                rows.push(vals.join(','));
            }

            const csvContent = rows.join('\r\n');
            const filename = `buku_tanah_${(new Date()).toISOString().replace(/[:.]/g, '')}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(csvContent);
        }

        // ---------- DOCX path ----------
        if (format === 'docx') {
            // buat document
            const doc = new Document({
                sections: []
            });

            // Header cells: gunakan selectedCols (tampilkan apa yang user pilih)
            const docCols = selectedCols.length ? selectedCols.slice() : ALLOWED_COLS.slice();
            const headerCells = docCols.map(c => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: headerMap[c] || c, bold: true })] })],
                margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }));
            // tambahkan kolom QR di akhir
            headerCells.push(new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'QR', bold: true })] })],
                margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }));

            const rows = [new TableRow({ children: headerCells })];

            // prepare baseUrl untuk link QR
            const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;

            // iterate records dan tambahkan baris (dengan QR image)
            for (const rec of records) {
                const plain = rec && typeof rec.toJSON === 'function' ? rec.toJSON() : rec;

                const rowCells = docCols.map(col => {
                    const txt = formatCell(col, plain[col]);
                    return new TableCell({
                        children: [new Paragraph(String(txt || ''))]
                    });
                });

                // ambil id yang pasti ada (kita sudah memastikan attributes menyertakan id_buku_tanah)
                const recId = plain.id_buku_tanah;
                if (!recId) {
                    // safety fallback: kalau tidak ada id, masukkan teks error
                    rowCells.push(new TableCell({ children: [new Paragraph('No ID')] }));
                } else {
                    try {
                        const detailUrl = `${baseUrl}/buku-tanah/${Number(recId)}`;
                        const qrBuf = await QRCode.toBuffer(detailUrl, {
                            type: 'png',
                            errorCorrectionLevel: 'H',
                            margin: 1,
                            scale: 6
                        });

                        // gunakan ImageRun (bukan Media.addImage)
                        const imageRun = new ImageRun({
                            data: qrBuf,
                            transformation: { width: 80, height: 80 }
                        });
                        const imgPara = new Paragraph({ children: [imageRun] });

                        rowCells.push(new TableCell({ children: [imgPara] }));
                    } catch (qrErr) {
                        console.error('Gagal generate QR untuk id', recId, qrErr);
                        rowCells.push(new TableCell({ children: [new Paragraph('QR error')] }));
                    }
                }

                rows.push(new TableRow({ children: rowCells }));
            }

            const table = new Table({
                rows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            });

            doc.addSection({ children: [table] });

            const buffer = await Packer.toBuffer(doc);

            const filename = `buku_tanah_${(new Date()).toISOString().replace(/[:.]/g, '')}.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(buffer);
        }

        // jika format tidak dikenali
        return res.status(400).send('Format tidak didukung. Gunakan format=csv atau format=docx');
    } catch (err) {
        console.error('bukuTanah.download (export) error:', err);
        return res.status(500).send('Gagal membuat file download');
    }
};

exports.qrImage = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;
        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).send('ID tidak valid');

        // cek record, ambil qr_path
        const record = await BukuTanah.findByPk(Number(id), { attributes: ['qr_path'] });

        if (record && record.qr_path) {
            const abs = path.join(__dirname, '..', 'public', record.qr_path);
            if (fsSync.existsSync(abs)) {
                return res.sendFile(abs);
            }
        }

        // fallback: generate on-the-fly (tidak disimpan)
        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const detailUrl = `${baseUrl}/buku-tanah/${Number(id)}`;

        const buffer = await QRCode.toBuffer(detailUrl, {
            type: 'png',
            errorCorrectionLevel: 'H',
            margin: 2,
            scale: 6
        });

        res.type('png').send(buffer);
    } catch (err) {
        console.error('bukuTanah.qrImage error:', err);
        return res.status(500).send('Gagal menghasilkan QR');
    }
};

exports.qrDownload = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;
        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).send('ID tidak valid');

        const record = await BukuTanah.findByPk(Number(id), { attributes: ['qr_path'] });

        if (record && record.qr_path) {
            const abs = path.join(__dirname, '..', 'public', record.qr_path);
            if (fsSync.existsSync(abs)) {
                res.setHeader('Content-Disposition', `attachment; filename="buku_tanah_${id}_qr.png"`);
                return res.sendFile(abs);
            }
        }

        // fallback generate & send
        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const detailUrl = `${baseUrl}/buku-tanah/${Number(id)}`;

        const buffer = await QRCode.toBuffer(detailUrl, {
            type: 'png',
            errorCorrectionLevel: 'H',
            margin: 2,
            scale: 8
        });

        res.setHeader('Content-Disposition', `attachment; filename="buku_tanah_${id}_qr.png"`);
        res.type('png').send(buffer);
    } catch (err) {
        console.error('bukuTanah.qrDownload error:', err);
        return res.status(500).send('Gagal download QR');
    }
};
