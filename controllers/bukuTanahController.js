// controllers/bukuTanahController.js
const db = require('../config/db');
const { Op } = require('sequelize');

// safe lookup model (sesuaikan properti kalau berbeda)
const BukuTanah = db.buku_tanah || (db.models && (db.models.buku_tanah || db.models.Buku_tanah));
const Dokumen = db.dokumen || (db.models && (db.models.dokumen || db.models.Dokumen));

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

/** showIndex - list semua buku_tanah, optional q untuk search by id/no_reg/no_peta */
exports.showIndex = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const q = (req.query.q || '').toString().trim();
        let records = [];

        if (q) {
            if (isValidId(q)) {
                const r = await BukuTanah.findByPk(Number(q));
                records = r ? [r] : [];
            } else {
                records = await BukuTanah.findAll({
                    where: {
                        [Op.or]: [
                            { no_reg: { [Op.like]: `%${q}%` } },
                            { no_peta: { [Op.like]: `%${q}%` } },
                            { keterangan: { [Op.like]: `%${q}%` } }
                        ]
                    },
                    order: [['id_buku_tanah', 'DESC']],
                    limit: 1000
                });
            }
        } else {
            records = await BukuTanah.findAll({
                order: [['id_buku_tanah', 'DESC']],
                limit: 1000
            });
        }

        const recordsPlain = Array.isArray(records)
            ? records.map(r => (r && typeof r.toJSON === 'function' ? r.toJSON() : r))
            : [];

        return res.render('buku_tanah/list_buku_tanah', {
            records: recordsPlain,
            user: req.session?.user || null,
            nama_lengkap: req.session?.user?.nama_lengkap || '',
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

        // ambil daftar dokumen jika tersedia
        let dokumenOptions = [];
        if (Dokumen) {
            const all = await Dokumen.findAll({ order: [['id_dokumen', 'ASC']], limit: 1000 });
            dokumenOptions = all.map(d => (d && typeof d.toJSON === 'function' ? d.toJSON() : d));
        }

        return res.render('buku_tanah/tambah_buku_tanah', {
            dokumenOptions,
            user: req.session?.user || null,
            nama_lengkap: req.session?.user?.nama_lengkap || '',
            error: req.query.error || null,
            success: req.query.success || null,
            old: {}
        });
    } catch (err) {
        console.error('bukuTanah.showCreateForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/** create - simpan buku_tanah baru */
exports.create = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const { id_dokumen, no_reg, jumlah_lembar, no_peta, keterangan } = req.body;

        if (!id_dokumen || String(id_dokumen).trim() === '') {
            await t.rollback();
            return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('Pilih dokumen'));
        }

        const jumlah = jumlah_lembar ? Number(jumlah_lembar) : null;
        if (jumlah !== null && (!Number.isFinite(jumlah) || jumlah < 0)) {
            await t.rollback();
            return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('jumlah_lembar harus angka >= 0'));
        }

        // optional: cek dokumen ada
        if (Dokumen) {
            const doc = await Dokumen.findByPk(Number(id_dokumen));
            if (!doc) {
                await t.rollback();
                return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('Dokumen tidak ditemukan'));
            }
        }

        const payload = {
            id_dokumen: Number(id_dokumen),
            no_reg: no_reg || null,
            jumlah_lembar: jumlah,
            no_peta: no_peta || null,
            keterangan: keterangan || null
        };

        await BukuTanah.create(payload, { transaction: t });
        await t.commit();
        return res.redirect('/buku-tanah?success=' + encodeURIComponent('Buku Tanah berhasil ditambahkan'));
    } catch (err) {
        await t.rollback();
        console.error('bukuTanah.create error:', err);
        return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('Gagal menyimpan data buku tanah'));
    }
};

/** showEditForm - tampilkan form edit berdasarkan id_buku_tanah */
exports.showEditForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).send('Parameter id tidak valid');

        const record = await BukuTanah.findByPk(Number(id));
        if (!record) return res.status(404).send('Data buku tanah tidak ditemukan');

        const recordPlain = record && typeof record.toJSON === 'function' ? record.toJSON() : record;

        let dokumenOptions = [];
        if (Dokumen) {
            const all = await Dokumen.findAll({ order: [['id_dokumen', 'ASC']], limit: 1000 });
            dokumenOptions = all.map(d => (d && typeof d.toJSON === 'function' ? d.toJSON() : d));
        }

        return res.render('buku_tanah/edit_buku_tanah', {
            buku: recordPlain,
            dokumenOptions,
            user: req.session?.user || null,
            nama_lengkap: req.session?.user?.nama_lengkap || '',
            error: req.query.error || null,
            success: req.query.success || null
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

        const item = await BukuTanah.findByPk(Number(id));
        if (!item) {
            await t.rollback();
            return res.status(404).send('Data buku tanah tidak ditemukan');
        }

        const { id_dokumen, no_reg, jumlah_lembar, no_peta, keterangan } = req.body;

        if (typeof id_dokumen !== 'undefined' && String(id_dokumen).trim() === '') {
            await t.rollback();
            return res.redirect('/buku-tanah/edit/' + id + '?error=' + encodeURIComponent('Pilih dokumen'));
        }

        const jumlah = typeof jumlah_lembar !== 'undefined'
            ? (jumlah_lembar === '' ? null : Number(jumlah_lembar))
            : item.jumlah_lembar;

        if (jumlah !== null && (!Number.isFinite(jumlah) || jumlah < 0)) {
            await t.rollback();
            return res.redirect('/buku-tanah/edit/' + id + '?error=' + encodeURIComponent('jumlah_lembar harus angka >= 0'));
        }

        if (typeof id_dokumen !== 'undefined') item.id_dokumen = Number(id_dokumen);
        if (typeof no_reg !== 'undefined') item.no_reg = no_reg || null;
        item.jumlah_lembar = jumlah;
        if (typeof no_peta !== 'undefined') item.no_peta = no_peta || null;
        if (typeof keterangan !== 'undefined') item.keterangan = keterangan || null;

        await item.save({ transaction: t });
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

        const record = await BukuTanah.findByPk(Number(id));
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

        const record = await BukuTanah.findByPk(Number(id));
        if (!record) return res.status(404).send('Data tidak ditemukan');

        const recordPlain = typeof record.toJSON === 'function' ? record.toJSON() : record;

        return res.render('buku_tanah/detail_buku_tanah', {
            buku: recordPlain,
            user: req.session?.user || null,
            nama_lengkap: req.session?.user?.nama_lengkap || '',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('bukuTanah.showDetail error:', err);
        return res.redirect('/buku-tanah?error=' + encodeURIComponent('Terjadi kesalahan saat mengambil data'));
    }
};
