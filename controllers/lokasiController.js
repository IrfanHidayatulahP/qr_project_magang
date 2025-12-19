// controllers/lokasiController.js
const db = require('../config/db');
const { Op } = require('sequelize');

function safeModelLookup() {
    // safe lookup model (sesuaikan properti kalau berbeda di export db)
    return db.lokasi || (db.models && (db.models.lokasi || db.models.Lokasi));
}

const Lokasi = safeModelLookup();

if (!Lokasi) {
    console.error("Model 'lokasi' tidak ditemukan pada export db. Keys in db:", Object.keys(db));
}

function ensureModelOrRespond(res) {
    if (!Lokasi) {
        const msg = "Server misconfiguration: model 'lokasi' tidak tersedia. Periksa config/db.js";
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

/** showIndex - list semua lokasi, optional q untuk pencarian */
exports.showIndex = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const q = (req.query.q || '').toString().trim();
        let records = [];

        const baseOptions = {
            order: [['id_lokasi', 'DESC']],
            limit: 1000,
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        };

        if (q) {
            // LOGIKA PENCARIAN FLEKSIBEL LOKASI
            const searchConditions = [
                { kode_lokasi: { [Op.like]: `%${q}%` } },
                { ruangan: { [Op.like]: `%${q}%` } },
                { no_rak: { [Op.like]: `%${q}%` } },
                { notes: { [Op.like]: `%${q}%` } } // Tambahkan pencarian di catatan
            ];

            // Jika input berupa angka, masukkan juga pencarian by ID
            if (isValidId(q)) {
                searchConditions.push({ id_lokasi: Number(q) });
            }

            records = await Lokasi.findAll({
                ...baseOptions,
                where: {
                    [Op.or]: searchConditions
                }
            });
        } else {
            records = await Lokasi.findAll(baseOptions);
        }

        const recordsPlain = Array.isArray(records)
            ? records.map(r => (r && typeof r.toJSON === 'function' ? r.toJSON() : r))
            : [];

        return res.render('lokasi/list_lokasi', {
            records: recordsPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            filter_q: q,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('lokasi.showIndex error:', err);
        return res.status(500).send('Server Error');
    }
};

/** showCreateForm - tampilkan form tambah lokasi */
exports.showCreateForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        return res.render('lokasi/tambah_lokasi', {
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null,
            old: {}
        });
    } catch (err) {
        console.error('lokasi.showCreateForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/** create - simpan lokasi baru */
exports.create = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const {
            ruangan,
            no_rak,
            label_baris,
            no_pos,
            kode_lokasi,
            notes,
            kapasitas,
            terpakai
        } = req.body;

        // validasi sederhana
        if (kode_lokasi && String(kode_lokasi).trim() === '') {
            await t.rollback();
            return res.redirect('/lokasi/create?error=' + encodeURIComponent('kode_lokasi tidak boleh kosong'));
        }

        // cek unique kode_lokasi
        if (kode_lokasi) {
            const exists = await Lokasi.findOne({ where: { kode_lokasi: String(kode_lokasi).trim() } });
            if (exists) {
                await t.rollback();
                return res.redirect('/lokasi/create?error=' + encodeURIComponent('kode_lokasi sudah ada'));
            }
        }

        // parse kapasitas & terpakai (harus integer >= 0)
        let kapasitasVal = null;
        if (typeof kapasitas !== 'undefined' && kapasitas !== '' && kapasitas !== null) {
            const k = Number(String(kapasitas).replace(',', '.'));
            if (!Number.isFinite(k) || k < 0 || !Number.isInteger(k)) {
                await t.rollback();
                return res.redirect('/lokasi/create?error=' + encodeURIComponent('kapasitas harus integer >= 0'));
            }
            kapasitasVal = Number(k);
        } else {
            kapasitasVal = 0;
        }

        let terpakaiVal = null;
        if (typeof terpakai !== 'undefined' && terpakai !== '' && terpakai !== null) {
            const tp = Number(String(terpakai).replace(',', '.'));
            if (!Number.isFinite(tp) || tp < 0 || !Number.isInteger(tp)) {
                await t.rollback();
                return res.redirect('/lokasi/create?error=' + encodeURIComponent('terpakai harus integer >= 0'));
            }
            terpakaiVal = Number(tp);
        } else {
            terpakaiVal = 0;
        }

        if (terpakaiVal > kapasitasVal) {
            await t.rollback();
            return res.redirect('/lokasi/create?error=' + encodeURIComponent('terpakai tidak boleh lebih besar dari kapasitas'));
        }

        const newRec = await Lokasi.create({
            ruangan: ruangan || null,
            no_rak: no_rak || null,
            label_baris: label_baris || null,
            no_pos: no_pos || null,
            kode_lokasi: kode_lokasi ? String(kode_lokasi).trim() : null,
            notes: notes || null,
            kapasitas: kapasitasVal,
            terpakai: terpakaiVal
        }, { transaction: t });

        await t.commit();
        return res.redirect('/lokasi?success=' + encodeURIComponent('Lokasi berhasil ditambahkan'));
    } catch (err) {
        try { await t.rollback(); } catch (e) { /* ignore */ }
        console.error('lokasi.create error:', err);
        return res.redirect('/lokasi/create?error=' + encodeURIComponent('Gagal menyimpan data lokasi'));
    }
};

/** showEditForm - tampilkan form edit berdasarkan id_lokasi */
exports.showEditForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).send('Parameter id tidak valid');

        const record = await Lokasi.findByPk(Number(id), {
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });
        if (!record) return res.status(404).send('Data lokasi tidak ditemukan');

        const recordPlain = record && typeof record.toJSON === 'function' ? record.toJSON() : record;

        return res.render('lokasi/edit_lokasi', {
            lokasi: recordPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('lokasi.showEditForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/** update - update lokasi */
exports.update = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!isValidId(id)) {
            await t.rollback();
            return res.status(400).send('ID tidak valid');
        }

        const item = await Lokasi.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!item) {
            await t.rollback();
            return res.status(404).send('Data lokasi tidak ditemukan');
        }

        const {
            ruangan,
            no_rak,
            label_baris,
            no_pos,
            kode_lokasi,
            notes,
            kapasitas,
            terpakai
        } = req.body;

        // jika kode_lokasi diubah, cek unik (kecuali record sendiri)
        if (typeof kode_lokasi !== 'undefined' && kode_lokasi !== null && String(kode_lokasi).trim() !== '') {
            const existing = await Lokasi.findOne({
                where: {
                    kode_lokasi: String(kode_lokasi).trim(),
                    id_lokasi: { [Op.ne]: item.id_lokasi }
                }
            });
            if (existing) {
                await t.rollback();
                return res.redirect('/lokasi/edit/' + id + '?error=' + encodeURIComponent('kode_lokasi sudah dipakai oleh lokasi lain'));
            }
            item.kode_lokasi = String(kode_lokasi).trim();
        } else if (typeof kode_lokasi !== 'undefined') {
            item.kode_lokasi = null;
        }

        // parse kapasitas & terpakai
        if (typeof kapasitas !== 'undefined') {
            if (kapasitas === '' || kapasitas === null) item.kapasitas = 0;
            else {
                const k = Number(String(kapasitas).replace(',', '.'));
                if (!Number.isFinite(k) || k < 0 || !Number.isInteger(k)) {
                    await t.rollback();
                    return res.redirect('/lokasi/edit/' + id + '?error=' + encodeURIComponent('kapasitas harus integer >= 0'));
                }
                item.kapasitas = Number(k);
            }
        }

        if (typeof terpakai !== 'undefined') {
            if (terpakai === '' || terpakai === null) item.terpakai = 0;
            else {
                const tp = Number(String(terpakai).replace(',', '.'));
                if (!Number.isFinite(tp) || tp < 0 || !Number.isInteger(tp)) {
                    await t.rollback();
                    return res.redirect('/lokasi/edit/' + id + '?error=' + encodeURIComponent('terpakai harus integer >= 0'));
                }
                item.terpakai = Number(tp);
            }
        }

        // cek konsistensi terpakai <= kapasitas
        if (typeof item.kapasitas !== 'undefined' && typeof item.terpakai !== 'undefined' && item.terpakai > item.kapasitas) {
            await t.rollback();
            return res.redirect('/lokasi/edit/' + id + '?error=' + encodeURIComponent('terpakai tidak boleh lebih besar dari kapasitas'));
        }

        if (typeof ruangan !== 'undefined') item.ruangan = ruangan || null;
        if (typeof no_rak !== 'undefined') item.no_rak = no_rak || null;
        if (typeof label_baris !== 'undefined') item.label_baris = label_baris || null;
        if (typeof no_pos !== 'undefined') item.no_pos = no_pos || null;
        if (typeof notes !== 'undefined') item.notes = notes || null;

        await item.save({
            transaction: t,
            fields: ['ruangan', 'no_rak', 'label_baris', 'no_pos', 'kode_lokasi', 'notes', 'kapasitas', 'terpakai'],
            silent: true
        });

        await t.commit();
        return res.redirect('/lokasi?success=' + encodeURIComponent('Lokasi berhasil diupdate'));
    } catch (err) {
        try { await t.rollback(); } catch (e) { /* ignore */ }
        console.error('lokasi.update error:', err);
        return res.redirect('/lokasi/edit/' + (req.params.id || '') + '?error=' + encodeURIComponent('Gagal mengupdate data'));
    }
};

/** delete - hapus record berdasarkan id_lokasi */
exports.delete = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!isValidId(id)) {
            await t.rollback();
            return res.status(400).send('ID tidak valid');
        }

        const record = await Lokasi.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!record) {
            await t.rollback();
            return res.redirect('/lokasi?error=' + encodeURIComponent('Data tidak ditemukan'));
        }

        await Lokasi.destroy({ where: { id_lokasi: record.id_lokasi }, transaction: t });
        await t.commit();
        return res.redirect('/lokasi?success=' + encodeURIComponent('Lokasi berhasil dihapus'));
    } catch (err) {
        try { await t.rollback(); } catch (e) { /* ignore */ }
        console.error('lokasi.delete error:', err);
        return res.redirect('/lokasi?error=' + encodeURIComponent('Gagal menghapus data'));
    }
};

/** showDetail - tampilkan detail berdasarkan id_lokasi */
exports.showDetail = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;
        const id = req.params.id;
        if (!isValidId(id)) return res.redirect('/lokasi?error=' + encodeURIComponent('ID tidak valid'));

        const record = await Lokasi.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!record) return res.status(404).send('Data tidak ditemukan');

        const recordPlain = typeof record.toJSON === 'function' ? record.toJSON() : record;

        return res.render('lokasi/detail_lokasi', {
            lokasi: recordPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('lokasi.showDetail error:', err);
        return res.redirect('/lokasi?error=' + encodeURIComponent('Terjadi kesalahan saat mengambil data'));
    }
};