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
                const r = await BukuTanah.findByPk(Number(q), {
                    attributes: { exclude: ['createdAt', 'updatedAt'] }
                });
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
                    limit: 1000,
                    attributes: { exclude: ['createdAt', 'updatedAt'] }
                });
            }
        } else {
            records = await BukuTanah.findAll({
                order: [['id_buku_tanah', 'DESC']],
                limit: 1000,
                attributes: { exclude: ['createdAt', 'updatedAt'] }
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
            const all = await Dokumen.findAll({
                order: [['id_dokumen', 'ASC']],
                limit: 1000,
                attributes: { exclude: ['createdAt', 'updatedAt'] }
            });
            dokumenOptions = all.map(d => (d && typeof d.toJSON === 'function' ? d.toJSON() : d));
        }

        return res.render('buku_tanah/tambah_buku_tanah', {
            dokumenOptions,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
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
        // ambil field yang sesuai model
        const {
            id_dokumen,
            no_reg,
            no_peta,
            jenis_hak,
            luas_tanah,
            nama_pemilik_asal,
            tahun_terbit,
            keterangan,
            status_buku
        } = req.body;

        if (!id_dokumen || String(id_dokumen).trim() === '') {
            await t.rollback();
            return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('Pilih dokumen'));
        }

        // parse luas_tanah menjadi number (decimal)
        let luas = null;
        if (typeof luas_tanah !== 'undefined' && luas_tanah !== '' && luas_tanah !== null) {
            const parsed = Number(String(luas_tanah).replace(',', '.'));
            if (!Number.isFinite(parsed) || parsed < 0) {
                await t.rollback();
                return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('luas_tanah harus angka >= 0'));
            }
            luas = parsed;
        }

        // optional: cek dokumen ada
        if (Dokumen) {
            const doc = await Dokumen.findByPk(Number(id_dokumen), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
            if (!doc) {
                await t.rollback();
                return res.redirect('/buku-tanah/create?error=' + encodeURIComponent('Dokumen tidak ditemukan'));
            }
        }

        // tahun_terbit: terima tahun (YYYY) atau tanggal; simpan sebagai Date (atau null)
        let tahunVal = null;
        if (typeof tahun_terbit !== 'undefined' && tahun_terbit !== '' && tahun_terbit !== null) {
            // jika hanya angka 4 digit, buat Date 'YYYY-01-01'
            const y = String(tahun_terbit).trim();
            if (/^\d{4}$/.test(y)) {
                tahunVal = new Date(`${y}-01-01`);
            } else {
                const d = new Date(y);
                if (!isNaN(d.getTime())) tahunVal = d;
                else tahunVal = null;
            }
        }

        const payload = {
            id_dokumen: Number(id_dokumen),
            no_reg: no_reg || null,
            no_peta: no_peta || null,
            jenis_hak: jenis_hak || null,
            luas_tanah: luas,
            nama_pemilik_asal: nama_pemilik_asal || null,
            tahun_terbit: tahunVal,
            keterangan: keterangan || null,
            status_buku: status_buku || 'Aktif'
        };

        // create — batasi fields & gunakan silent agar Sequelize tidak menambahkan timestamps saat INSERT
        await BukuTanah.create(payload, {
            transaction: t,
            fields: [
                'id_dokumen',
                'no_reg',
                'no_peta',
                'jenis_hak',
                'luas_tanah',
                'nama_pemilik_asal',
                'tahun_terbit',
                'keterangan',
                'status_buku'
            ],
            silent: true
        });

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

        const record = await BukuTanah.findByPk(Number(id), {
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });
        if (!record) return res.status(404).send('Data buku tanah tidak ditemukan');

        const recordPlain = record && typeof record.toJSON === 'function' ? record.toJSON() : record;

        let dokumenOptions = [];
        if (Dokumen) {
            const all = await Dokumen.findAll({ order: [['id_dokumen', 'ASC']], limit: 1000, attributes: { exclude: ['createdAt', 'updatedAt'] } });
            dokumenOptions = all.map(d => (d && typeof d.toJSON === 'function' ? d.toJSON() : d));
        }

        return res.render('buku_tanah/edit_buku_tanah', {
            buku: recordPlain,
            dokumenOptions,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
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

        const item = await BukuTanah.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!item) {
            await t.rollback();
            return res.status(404).send('Data buku tanah tidak ditemukan');
        }

        const {
            id_dokumen,
            no_reg,
            no_peta,
            jenis_hak,
            luas_tanah,
            nama_pemilik_asal,
            tahun_terbit,
            keterangan,
            status_buku
        } = req.body;

        if (typeof id_dokumen !== 'undefined' && String(id_dokumen).trim() === '') {
            await t.rollback();
            return res.redirect('/buku-tanah/edit/' + id + '?error=' + encodeURIComponent('Pilih dokumen'));
        }

        // parse luas_tanah jika diinput
        if (typeof luas_tanah !== 'undefined') {
            if (luas_tanah === '' || luas_tanah === null) {
                item.luas_tanah = null;
            } else {
                const parsed = Number(String(luas_tanah).replace(',', '.'));
                if (!Number.isFinite(parsed) || parsed < 0) {
                    await t.rollback();
                    return res.redirect('/buku-tanah/edit/' + id + '?error=' + encodeURIComponent('luas_tanah harus angka >= 0'));
                }
                item.luas_tanah = parsed;
            }
        }

        if (typeof id_dokumen !== 'undefined') item.id_dokumen = id_dokumen === '' ? item.id_dokumen : Number(id_dokumen);
        if (typeof no_reg !== 'undefined') item.no_reg = no_reg || null;
        if (typeof no_peta !== 'undefined') item.no_peta = no_peta || null;
        if (typeof jenis_hak !== 'undefined') item.jenis_hak = jenis_hak || null;
        if (typeof nama_pemilik_asal !== 'undefined') item.nama_pemilik_asal = nama_pemilik_asal || null;
        if (typeof tahun_terbit !== 'undefined') {
            const y = String(tahun_terbit).trim();
            if (y === '') {
                item.tahun_terbit = null;
            } else if (/^\d{4}$/.test(y)) {
                item.tahun_terbit = new Date(`${y}-01-01`);
            } else {
                const d = new Date(y);
                item.tahun_terbit = isNaN(d.getTime()) ? item.tahun_terbit : d;
            }
        }
        if (typeof keterangan !== 'undefined') item.keterangan = keterangan || null;
        if (typeof status_buku !== 'undefined') item.status_buku = status_buku || item.status_buku;

        // simpan dengan fields explicit & silent agar tidak menambahkan createdAt/updatedAt jika kolom tidak tersedia
        await item.save({
            transaction: t,
            fields: [
                'id_dokumen',
                'no_reg',
                'no_peta',
                'jenis_hak',
                'luas_tanah',
                'nama_pemilik_asal',
                'tahun_terbit',
                'keterangan',
                'status_buku'
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
