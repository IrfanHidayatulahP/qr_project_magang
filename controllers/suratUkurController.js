// controllers/suratUkurController.js
const db = require('../config/db');
const { Op } = require('sequelize');

// safe lookup model
const SuratUkur = db.surat_ukur || (db.models && (db.models.surat_ukur || db.models.Surat_ukur || db.models.SuratUkur));
const Lokasi = db.lokasi || (db.models && (db.models.lokasi || db.models.Lokasi));

if (!SuratUkur) {
    console.error("Model 'surat_ukur' tidak ditemukan pada export db. Keys in db:", Object.keys(db));
}

function ensureModelOrRespond(res) {
    if (!SuratUkur) {
        const msg = "Server misconfiguration: model 'surat_ukur' tidak tersedia. Periksa config/db.js";
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

// enums sinkron dengan model surat_ukur.js
const ALLOWED_JENIS_HAK = ['HM', 'HGB', 'HP', 'HGU', 'Pengelolaan', 'Lainnya'];
const ALLOWED_MEDIA = ['Kertas', 'Digital', 'Microfilm'];
const ALLOWED_TINGKAT_PERKEMBANGAN = ['Asli', 'Copy', 'Salinan'];
const ALLOWED_METODE_PROTEKSI = ['Vaulting', 'Cloud', 'Physical'];

/** parseDateIndo */
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

    const fallback = new Date(s);
    return isNaN(fallback.getTime()) ? null : fallback;
}

/** showIndex */
exports.showIndex = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const q = (req.query.q || '').toString().trim();
        let records = [];

        // exclude timestamps agar aman saat read
        const baseOptions = {
            order: [['id_surat_ukur', 'DESC']],
            limit: 1000,
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        };

        if (q) {
            if (isValidId(q)) {
                const r = await SuratUkur.findByPk(Number(q), baseOptions);
                records = r ? [r] : [];
            } else {
                records = await SuratUkur.findAll({
                    ...baseOptions,
                    where: {
                        [Op.or]: [
                            { nomor_hak: { [Op.like]: `%${q}%` } },
                            { lokasi_penyimpanan: { [Op.like]: `%${q}%` } },
                            { no_boks_definitif: { [Op.like]: `%${q}%` } },
                            { nomor_surat_ukur: { [Op.like]: `%${q}%` } }
                        ]
                    }
                });
            }
        } else {
            records = await SuratUkur.findAll(baseOptions);
        }

        const recordsPlain = Array.isArray(records)
            ? records.map(r => (r && typeof r.toJSON === 'function' ? r.toJSON() : r))
            : [];

        return res.render('surat_ukur/list_surat_ukur', {
            records: recordsPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            filter_q: q,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('suratUkur.showIndex error:', err);
        return res.status(500).send('Server Error');
    }
};

/** showCreateForm */
exports.showCreateForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        let locations = [];
        if (Lokasi) {
            try {
                const raw = await Lokasi.findAll({
                    attributes: ['id_lokasi', 'kode_lokasi', 'ruangan', 'no_rak'],
                    order: [['kode_lokasi', 'ASC']],
                    limit: 2000
                });
                locations = raw.map(r => (r && typeof r.toJSON === 'function' ? r.toJSON() : r));
            } catch (e) {
                console.error("Gagal mengambil data lokasi:", e);
            }
        }

        return res.render('surat_ukur/tambah_surat_ukur', {
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null,
            old: {},
            locations
        });
    } catch (err) {
        console.error('suratUkur.showCreateForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/** showEditForm */
exports.showEditForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).send('Parameter id tidak valid');

        const record = await SuratUkur.findByPk(Number(id), {
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });
        if (!record) return res.status(404).send('Data surat ukur tidak ditemukan');

        const recordPlain = record && typeof record.toJSON === 'function' ? record.toJSON() : record;

        let locations = [];
        if (Lokasi) {
            try {
                const raw = await Lokasi.findAll({
                    attributes: ['id_lokasi', 'kode_lokasi', 'ruangan', 'no_rak'],
                    order: [['kode_lokasi', 'ASC']],
                    limit: 2000
                });
                locations = raw.map(r => (r && typeof r.toJSON === 'function' ? r.toJSON() : r));
            } catch (e) {
                console.error("Gagal mengambil data lokasi:", e);
            }
        }

        return res.render('surat_ukur/edit_surat_ukur', {
            surat: recordPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null,
            locations
        });
    } catch (err) {
        console.error('suratUkur.showEditForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/** * create - MENGGUNAKAN RAW SQL (PERBAIKAN)
 * Agar konsisten dengan bukuTanahController dan menghindari error 'Unknown column createdAt'
 */
exports.create = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const {
            nomor_hak,
            jenis_hak,
            nomor_surat_ukur,
            tahun_terbit,
            media,
            jumlah,
            tingkat_perkembangan,
            lokasi_penyimpanan,
            no_boks_definitif,
            nomor_folder,
            metode_perlindungan
        } = req.body;

        // --- Validasi Manual ---
        if (jenis_hak && !ALLOWED_JENIS_HAK.includes(jenis_hak)) {
            await t.rollback();
            return res.redirect('/surat-ukur/create?error=' + encodeURIComponent('jenis_hak tidak valid'));
        }
        if (media && !ALLOWED_MEDIA.includes(media)) {
            await t.rollback();
            return res.redirect('/surat-ukur/create?error=' + encodeURIComponent('media tidak valid'));
        }
        if (tingkat_perkembangan && !ALLOWED_TINGKAT_PERKEMBANGAN.includes(tingkat_perkembangan)) {
            await t.rollback();
            return res.redirect('/surat-ukur/create?error=' + encodeURIComponent('tingkat_perkembangan tidak valid'));
        }
        if (metode_perlindungan && !ALLOWED_METODE_PROTEKSI.includes(metode_perlindungan)) {
            await t.rollback();
            return res.redirect('/surat-ukur/create?error=' + encodeURIComponent('metode_perlindungan tidak valid'));
        }

        let nomorSuratUkurVal = null;
        if (typeof nomor_surat_ukur !== 'undefined' && nomor_surat_ukur !== '' && nomor_surat_ukur !== null) {
            const s = String(nomor_surat_ukur).trim();
            if (s.length > 255) {
                await t.rollback();
                return res.redirect('/surat-ukur/create?error=' + encodeURIComponent('nomor_surat_ukur terlalu panjang'));
            }
            nomorSuratUkurVal = s;
        }

        let jumlahVal = null;
        if (typeof jumlah !== 'undefined' && jumlah !== '' && jumlah !== null) {
            const n = Number(String(jumlah).replace(',', '.'));
            if (!Number.isFinite(n) || n < 0) {
                await t.rollback();
                return res.redirect('/surat-ukur/create?error=' + encodeURIComponent('jumlah harus angka >= 0'));
            }
            jumlahVal = Number.isInteger(n) ? n : n;
        }

        let nomorFolderVal = null;
        if (typeof nomor_folder !== 'undefined' && nomor_folder !== '' && nomor_folder !== null) {
            const nf = Number(nomor_folder);
            if (!Number.isInteger(nf) || nf < 0) {
                await t.rollback();
                return res.redirect('/surat-ukur/create?error=' + encodeURIComponent('nomor_folder harus integer >= 0'));
            }
            nomorFolderVal = nf;
        }

        let tahunVal = null;
        if (typeof tahun_terbit !== 'undefined' && tahun_terbit !== '' && tahun_terbit !== null) {
            tahunVal = parseDateIndo(tahun_terbit);
        }

        // --- RAW SQL INSERT ---
        // Kita gunakan created_at dan updated_at (snake_case) agar sesuai dengan database
        const now = new Date();
        const sql = `INSERT INTO surat_ukur 
            (nomor_hak, jenis_hak, nomor_surat_ukur, tahun_terbit, media, jumlah, tingkat_perkembangan, lokasi_penyimpanan, no_boks_definitif, nomor_folder, metode_perlindungan, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

        const replacements = [
            nomor_hak || null,
            jenis_hak || null,
            nomorSuratUkurVal,
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
        return res.redirect('/surat-ukur?success=' + encodeURIComponent('Surat Ukur berhasil ditambahkan'));

    } catch (err) {
        await t.rollback();
        console.error('suratUkur.create error:', err);
        // Tangkap duplicate error dari MySQL (code 1062 = Duplicate entry)
        if (err && err.parent && err.parent.errno === 1062) {
            return res.redirect('/surat-ukur/create?error=' + encodeURIComponent('Nomor Hak sudah ada (duplikat)'));
        }
        return res.redirect('/surat-ukur/create?error=' + encodeURIComponent('Gagal menyimpan data surat ukur'));
    }
};

/** update */
exports.update = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!isValidId(id)) {
            await t.rollback();
            return res.status(400).send('ID tidak valid');
        }

        const item = await SuratUkur.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!item) {
            await t.rollback();
            return res.status(404).send('Data surat ukur tidak ditemukan');
        }

        const {
            nomor_hak, jenis_hak, nomor_surat_ukur, tahun_terbit, media, jumlah,
            tingkat_perkembangan, lokasi_penyimpanan, no_boks_definitif, nomor_folder, metode_perlindungan
        } = req.body;

        if (typeof jenis_hak !== 'undefined' && jenis_hak !== '' && !ALLOWED_JENIS_HAK.includes(jenis_hak)) {
            await t.rollback();
            return res.redirect('/surat-ukur/edit/' + id + '?error=' + encodeURIComponent('jenis_hak tidak valid'));
        }
        if (typeof media !== 'undefined' && media !== '' && !ALLOWED_MEDIA.includes(media)) {
            await t.rollback();
            return res.redirect('/surat-ukur/edit/' + id + '?error=' + encodeURIComponent('media tidak valid'));
        }
        if (typeof tingkat_perkembangan !== 'undefined' && tingkat_perkembangan !== '' && !ALLOWED_TINGKAT_PERKEMBANGAN.includes(tingkat_perkembangan)) {
            await t.rollback();
            return res.redirect('/surat-ukur/edit/' + id + '?error=' + encodeURIComponent('tingkat_perkembangan tidak valid'));
        }
        if (typeof metode_perlindungan !== 'undefined' && metode_perlindungan !== '' && !ALLOWED_METODE_PROTEKSI.includes(metode_perlindungan)) {
            await t.rollback();
            return res.redirect('/surat-ukur/edit/' + id + '?error=' + encodeURIComponent('metode_perlindungan tidak valid'));
        }

        if (typeof nomor_surat_ukur !== 'undefined') {
            if (nomor_surat_ukur === '' || nomor_surat_ukur === null) item.nomor_surat_ukur = null;
            else {
                const s = String(nomor_surat_ukur).trim();
                if (s.length > 255) {
                    await t.rollback();
                    return res.redirect('/surat-ukur/edit/' + id + '?error=' + encodeURIComponent('nomor_surat_ukur terlalu panjang'));
                }
                item.nomor_surat_ukur = s;
            }
        }

        if (typeof jumlah !== 'undefined') {
            if (jumlah === '' || jumlah === null) item.jumlah = null;
            else {
                const n = Number(String(jumlah).replace(',', '.'));
                if (!Number.isFinite(n) || n < 0) {
                    await t.rollback();
                    return res.redirect('/surat-ukur/edit/' + id + '?error=' + encodeURIComponent('jumlah harus angka >= 0'));
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
                    return res.redirect('/surat-ukur/edit/' + id + '?error=' + encodeURIComponent('nomor_folder harus integer >= 0'));
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
                'nomor_hak', 'jenis_hak', 'nomor_surat_ukur', 'tahun_terbit', 'media', 'jumlah',
                'tingkat_perkembangan', 'lokasi_penyimpanan', 'no_boks_definitif',
                'nomor_folder', 'metode_perlindungan'
            ],
            silent: true // penting: jangan update timestamps 'updatedAt' otomatis agar tidak error
        });

        await t.commit();
        return res.redirect('/surat-ukur?success=' + encodeURIComponent('Surat Ukur berhasil diupdate'));
    } catch (err) {
        await t.rollback();
        console.error('suratUkur.update error:', err);
        if (err && err.name === 'SequelizeUniqueConstraintError') {
            return res.redirect('/surat-ukur/edit/' + (req.params.id || '') + '?error=' + encodeURIComponent('nomor_hak sudah ada (duplikat)'));
        }
        return res.redirect('/surat-ukur/edit/' + (req.params.id || '') + '?error=' + encodeURIComponent('Gagal mengupdate data'));
    }
};

/** delete */
exports.delete = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!isValidId(id)) {
            await t.rollback();
            return res.status(400).send('ID tidak valid');
        }

        const record = await SuratUkur.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!record) {
            await t.rollback();
            return res.redirect('/surat-ukur?error=' + encodeURIComponent('Data tidak ditemukan'));
        }

        await SuratUkur.destroy({ where: { id_surat_ukur: record.id_surat_ukur }, transaction: t });
        await t.commit();
        return res.redirect('/surat-ukur?success=' + encodeURIComponent('Surat Ukur berhasil dihapus'));
    } catch (err) {
        await t.rollback();
        console.error('suratUkur.delete error:', err);
        return res.redirect('/surat-ukur?error=' + encodeURIComponent('Gagal menghapus data'));
    }
};

/** showDetail */
exports.showDetail = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;
        const id = req.params.id;
        if (!isValidId(id)) return res.redirect('/surat-ukur?error=' + encodeURIComponent('ID tidak valid'));

        const record = await SuratUkur.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!record) return res.status(404).send('Data tidak ditemukan');

        const recordPlain = typeof record.toJSON === 'function' ? record.toJSON() : record;

        return res.render('surat_ukur/detail_surat_ukur', {
            surat: recordPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('suratUkur.showDetail error:', err);
        return res.redirect('/surat-ukur?error=' + encodeURIComponent('Terjadi kesalahan saat mengambil data'));
    }
};