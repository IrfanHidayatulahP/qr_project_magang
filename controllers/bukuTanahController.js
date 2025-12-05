const db = require('../config/db');
const { Op } = require('sequelize');

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
        let records = [];

        const baseOptions = {
            order: [['id_buku_tanah', 'DESC']],
            limit: 1000,
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        };

        if (q) {
            if (isValidId(q)) {
                const r = await BukuTanah.findByPk(Number(q), baseOptions);
                records = r ? [r] : [];
            } else {
                records = await BukuTanah.findAll({
                    ...baseOptions,
                    where: {
                        [Op.or]: [
                            { nomor_hak: { [Op.like]: `%${q}%` } },
                            { lokasi_penyimpanan: { [Op.like]: `%${q}%` } },
                            { no_boks_definitif: { [Op.like]: `%${q}%` } }
                        ]
                    }
                });
            }
        } else {
            records = await BukuTanah.findAll(baseOptions);
        }

        const recordsPlain = Array.isArray(records)
            ? records.map(r => (r && typeof r.toJSON === 'function' ? r.toJSON() : r))
            : [];

        return res.render('buku_tanah/list_buku_tanah', {
            records: recordsPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            filter_q: q,
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
exports.create = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        // ambil field sesuai model
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

        // validasi enum singkat
        if (jenis_hak && !ALLOWED_JENIS_HAK.includes(jenis_hak)) {
            await t.rollback();
            return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('jenis_hak tidak valid'));
        }
        if (media && !ALLOWED_MEDIA.includes(media)) {
            await t.rollback();
            return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('media tidak valid'));
        }
        if (tingkat_perkembangan && !ALLOWED_TINGKAT_PERKEMBANGAN.includes(tingkat_perkembangan)) {
            await t.rollback();
            return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('tingkat_perkembangan tidak valid'));
        }
        if (metode_perlindungan && !ALLOWED_METODE_PROTEKSI.includes(metode_perlindungan)) {
            await t.rollback();
            return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('metode_perlindungan tidak valid'));
        }

        // parse jumlah & nomor_folder
        let jumlahVal = null;
        if (typeof jumlah !== 'undefined' && jumlah !== '' && jumlah !== null) {
            const n = Number(String(jumlah).replace(',', '.'));
            if (!Number.isFinite(n) || n < 0) {
                await t.rollback();
                return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('jumlah harus angka >= 0'));
            }
            jumlahVal = Number.isInteger(n) ? n : n;
        }

        let nomorFolderVal = null;
        if (typeof nomor_folder !== 'undefined' && nomor_folder !== '' && nomor_folder !== null) {
            const nf = Number(nomor_folder);
            if (!Number.isInteger(nf) || nf < 0) {
                await t.rollback();
                return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('nomor_folder harus integer >= 0'));
            }
            nomorFolderVal = nf;
        }

        // tahun_terbit: terima dd-mm-yyyy / yyyy-mm-dd / YYYY
        let tahunVal = null;
        if (typeof tahun_terbit !== 'undefined' && tahun_terbit !== '' && tahun_terbit !== null) {
            tahunVal = parseDateIndo(tahun_terbit); // Date object or null
        }

        // raw insert ke kolom snake_case (created_at, updated_at)
        const now = new Date();
        const sql = `INSERT INTO buku_tanah
            (nomor_hak, jenis_hak, tahun_terbit, media, jumlah, tingkat_perkembangan, lokasi_penyimpanan, no_boks_definitif, nomor_folder, metode_perlindungan, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

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
            now,
            now
        ];

        await db.sequelize.query(sql, { replacements, transaction: t });

        await t.commit();
        return res.redirect('/buku-tanah?success=' + encodeURIComponent('Buku Tanah berhasil ditambahkan'));
    } catch (err) {
        await t.rollback();
        console.error('bukuTanah.create error (raw insert):', err);
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

        await item.save({
            transaction: t,
            fields: [
                'nomor_hak', 'jenis_hak', 'tahun_terbit', 'media', 'jumlah',
                'tingkat_perkembangan', 'lokasi_penyimpanan', 'no_boks_definitif',
                'nomor_folder', 'metode_perlindungan'
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
exports.download = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const q = (req.query.q || '').toString().trim();
        const columnsParam = (req.query.columns || '').toString().trim();

        // kolom yang diizinkan / tersedia
        const ALLOWED_COLS = [
            'id_buku_tanah', 'nomor_hak', 'jenis_hak', 'tahun_terbit', 'media',
            'jumlah', 'lokasi_penyimpanan', 'no_boks_definitif', 'nomor_folder', 'metode_perlindungan'
        ];

        const selectedCols = columnsParam
            ? columnsParam.split(',').map(c => c.trim()).filter(c => ALLOWED_COLS.includes(c))
            : ALLOWED_COLS.slice(); // default: semua kolom

        // bangun where sama seperti pada showIndex
        let where = undefined;
        if (q) {
            if (isValidId(q)) {
                where = { id_buku_tanah: Number(q) };
            } else {
                where = {
                    [Op.or]: [
                        { nomor_hak: { [Op.like]: `%${q}%` } },
                        { lokasi_penyimpanan: { [Op.like]: `%${q}%` } },
                        { no_boks_definitif: { [Op.like]: `%${q}%` } }
                    ]
                };
            }
        }

        // ambil data (limit sama seperti showIndex)
        const records = await BukuTanah.findAll({
            where,
            order: [['id_buku_tanah', 'DESC']],
            limit: 1000,
            attributes: selectedCols
        });

        // helper untuk format nilai (khususnya tahun_terbit)
        function formatCell(key, val) {
            if (val == null) return '';
            if (key === 'tahun_terbit') {
                // jika Date object
                if (val instanceof Date && !isNaN(val.getTime())) return String(val.getFullYear());
                const s = String(val).trim();
                if (/^\d{4}$/.test(s)) return s;
                const d = new Date(s);
                return isNaN(d.getTime()) ? s : String(d.getFullYear());
            }
            return String(val);
        }

        // header friendly names
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

        // buat CSV (escape sederhana: ganti " menjadi "")
        const escapeCsv = (s) => {
            const str = s == null ? '' : String(s);
            if (str.indexOf('"') !== -1) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            // jika ada koma, newline atau leading/trailing spasi, bungkus juga
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

        const filename = `buku_tanah_${(new Date()).toISOString().replace(/[:.]/g, '')}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csvContent);
    } catch (err) {
        console.error('bukuTanah.download error:', err);
        return res.status(500).send('Gagal membuat file download');
    }
};
